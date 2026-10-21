import { readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  extractGitHubRepos,
  isRecognizedOpenSourceLicense,
  buildIndexedEntry,
  normalizeRepo,
  graphqlNodeToMetadata
} from './open-source-lib.mjs';

const sources = JSON.parse(await readFile(new URL('../catalog/sources.json', import.meta.url), 'utf8'));
const seeds = JSON.parse(await readFile(new URL('../catalog/seeds.json', import.meta.url), 'utf8'));
const token = process.env.GITHUB_TOKEN || '';
if (!token) throw new Error('GITHUB_TOKEN is required for the batched GitHub GraphQL metadata scan.');
const maxRepos = Number.parseInt(process.env.NOMVEX_CATALOG_MAX_REPOS || '1500', 10);
const observedAt = new Date().toISOString();
const userAgent = 'nomvex-toolbox-open-source-indexer';

async function rawReadme(repository, requestedRef) {
  const normalized = normalizeRepo(repository);
  if (!normalized) throw new Error(`Invalid source repository: ${repository}`);
  const [owner, name] = normalized.split('/');
  const refs = [...new Set([requestedRef, 'main', 'master'].filter(Boolean))];
  const failures = [];
  for (const ref of refs) {
    const url = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/README.md`;
    const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
    if (response.ok) return response.text();
    failures.push(`${ref}:${response.status}`);
  }
  throw new Error(`Unable to read README for ${normalized} (${failures.join(', ')}).`);
}

async function graphql(query) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': userAgent
    },
    body: JSON.stringify({ query })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`GitHub GraphQL HTTP ${response.status}: ${body.slice(0, 400)}`);
  let payload;
  try { payload = JSON.parse(body); }
  catch { throw new Error('GitHub GraphQL returned invalid JSON.'); }
  if (payload.errors?.length && !payload.data) {
    throw new Error(`GitHub GraphQL error: ${payload.errors.map(item => item.message).join('; ').slice(0, 500)}`);
  }
  return payload;
}

const provenance = new Map();
function add(repo, feed) {
  const normalized = normalizeRepo(repo);
  if (!normalized) return;
  const key = normalized.toLowerCase();
  if (!provenance.has(key)) provenance.set(key, { repo: normalized, feeds: [] });
  if (feed && !provenance.get(key).feeds.some(item => item.id === feed.id)) provenance.get(key).feeds.push(feed);
}

for (const source of sources.sources) {
  const markdown = await rawReadme(source.repository, source.ref);
  for (const repo of extractGitHubRepos(markdown)) add(repo, source);
}
for (const repo of seeds.repositories) add(repo, { id: 'nomvex-core-seeds', defaultCategory: 'developer-tool' });

const candidates = [...provenance.values()].sort((a,b)=>a.repo.localeCompare(b.repo)).slice(0, maxRepos);
await writeFile(new URL('../catalog/candidates.json', import.meta.url), JSON.stringify({
  schemaVersion: 1,
  generatedAt: observedAt,
  count: candidates.length,
  candidates: candidates.map(item => ({
    repo: item.repo,
    feeds: [...new Set(item.feeds.map(feed => feed.id))].sort()
  }))
}, null, 2) + '\n');

const indexed = [];
const quarantine = [];
const BATCH_SIZE = 40;

function repositorySelection(alias, owner, name) {
  return `${alias}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
    name
    nameWithOwner
    description
    url
    isPrivate
    isArchived
    isFork
    pushedAt
    stargazerCount
    forkCount
    defaultBranchRef { name }
    licenseInfo { spdxId }
    primaryLanguage { name }
    repositoryTopics(first: 20) { nodes { topic { name } } }
  }`;
}

for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
  const batch = candidates.slice(start, start + BATCH_SIZE);
  const selections = batch.map((item, index) => {
    const [owner, name] = item.repo.split('/');
    return repositorySelection(`r${index}`, owner, name);
  }).join('\n');
  const payload = await graphql(`query NomvexRegistryBatch {\n${selections}\nrateLimit { cost remaining resetAt }\n}`);
  if (payload.errors?.length) {
    process.stderr.write(`GraphQL batch warning at ${start}: ${payload.errors.map(item => item.message).join('; ').slice(0, 500)}\n`);
  }
  for (let index = 0; index < batch.length; index++) {
    const item = batch[index];
    const node = payload.data?.[`r${index}`] ?? null;
    const sourceFeeds = [...new Set(item.feeds.map(feed => feed.id))].sort();
    if (!node) {
      quarantine.push({
        fullName: item.repo,
        source: `https://github.com/${item.repo}`,
        reason: 'metadata-not-found',
        license: null,
        sourceFeeds,
        observedAt
      });
      continue;
    }
    try {
      const meta = graphqlNodeToMetadata(node);
      const spdx = meta.license?.spdx_id ?? null;
      let reason = null;
      if (meta.private) reason = 'private';
      else if (meta.archived) reason = 'archived';
      else if (meta.fork) reason = 'fork';
      else if (!isRecognizedOpenSourceLicense(spdx)) reason = spdx ? `license-not-allowlisted:${spdx}` : 'license-missing';
      if (reason) {
        quarantine.push({
          fullName: meta.full_name || item.repo,
          source: meta.html_url || `https://github.com/${item.repo}`,
          reason,
          license: spdx,
          sourceFeeds,
          observedAt
        });
      } else indexed.push(buildIndexedEntry(meta, item.feeds, observedAt));
    } catch (error) {
      quarantine.push({
        fullName: item.repo,
        source: `https://github.com/${item.repo}`,
        reason: 'metadata-normalization-failed',
        detail: error instanceof Error ? error.message.slice(0, 240) : 'unknown error',
        license: null,
        sourceFeeds,
        observedAt
      });
    }
  }
  const rate = payload.data?.rateLimit;
  if (rate) process.stderr.write(`GraphQL batch ${start}-${start + batch.length - 1}: cost=${rate.cost}, remaining=${rate.remaining}, reset=${rate.resetAt}\n`);
}

indexed.sort((a,b)=>a.fullName.localeCompare(b.fullName));
quarantine.sort((a,b)=>a.fullName.localeCompare(b.fullName));
await mkdir(new URL('../catalog/', import.meta.url), { recursive: true });
await writeFile(new URL('../catalog/open-source-index.json', import.meta.url), JSON.stringify({
  schemaVersion: 1,
  generatedAt: observedAt,
  candidateCount: candidates.length,
  indexedCount: indexed.length,
  policy: 'Only public, non-archived, non-fork GitHub repositories with allowlisted open-source SPDX metadata are included.',
  tools: indexed
}, null, 2) + '\n');
await writeFile(new URL('../catalog/open-source-quarantine.json', import.meta.url), JSON.stringify({
  schemaVersion: 1,
  generatedAt: observedAt,
  quarantinedCount: quarantine.length,
  items: quarantine
}, null, 2) + '\n');
process.stdout.write(`Open-source sync complete: ${indexed.length} indexed; ${quarantine.length} quarantined; ${candidates.length} candidates.\n`);
