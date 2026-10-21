import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extractGitHubRepos, isRecognizedOpenSourceLicense, buildIndexedEntry, normalizeRepo } from './open-source-lib.mjs';

const ROOT = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('../catalog/sources.json', import.meta.url), 'utf8'));
const seeds = JSON.parse(await readFile(new URL('../catalog/seeds.json', import.meta.url), 'utf8'));
const token = process.env.GITHUB_TOKEN || '';
const maxRepos = Number.parseInt(process.env.NOMVEX_CATALOG_MAX_REPOS || '1500', 10);
const observedAt = new Date().toISOString();
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'nomvex-toolbox-open-source-indexer',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};

async function github(path, accept = 'application/vnd.github+json') {
  const response = await fetch(`https://api.github.com${path}`, { headers: { ...headers, Accept: accept } });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`GitHub ${response.status} for ${path}: ${body}`);
  }
  return accept.includes('raw') ? response.text() : response.json();
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
  const markdown = await github(`/repos/${source.repository}/readme`, 'application/vnd.github.raw+json');
  for (const repo of extractGitHubRepos(markdown)) add(repo, source);
}
for (const repo of seeds.repositories) add(repo, { id: 'nomvex-core-seeds', defaultCategory: 'developer-tool' });

const candidates = [...provenance.values()].sort((a,b)=>a.repo.localeCompare(b.repo)).slice(0, maxRepos);
const indexed = [];
const quarantine = [];
let cursor = 0;
const workers = Array.from({ length: 6 }, async () => {
  while (cursor < candidates.length) {
    const item = candidates[cursor++];
    try {
      const meta = await github(`/repos/${item.repo}`);
      const spdx = meta?.license?.spdx_id ?? null;
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
          sourceFeeds: [...new Set(item.feeds.map(feed => feed.id))].sort(),
          observedAt
        });
      } else indexed.push(buildIndexedEntry(meta, item.feeds, observedAt));
    } catch (error) {
      quarantine.push({
        fullName: item.repo,
        source: `https://github.com/${item.repo}`,
        reason: 'metadata-fetch-failed',
        detail: error instanceof Error ? error.message.slice(0, 240) : 'unknown error',
        license: null,
        sourceFeeds: [...new Set(item.feeds.map(feed => feed.id))].sort(),
        observedAt
      });
    }
  }
});
await Promise.all(workers);

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
