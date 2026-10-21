import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGitHubRepos, isRecognizedOpenSourceLicense, inferCategory, buildIndexedEntry, graphqlNodeToMetadata, selectCatalogCandidates } from '../scripts/open-source-lib.mjs';

test('extractGitHubRepos canonicalizes repository links and deduplicates deep URLs', () => {
  const repos = extractGitHubRepos([
    'https://github.com/microsoft/autogen',
    'https://github.com/microsoft/autogen/blob/main/README.md',
    'https://github.com/browser-use/browser-use/issues/1',
    'https://example.com/not-github'
  ].join('\n'));
  assert.deepEqual(repos, ['browser-use/browser-use','microsoft/autogen']);
});

test('license allowlist fails closed', () => {
  assert.equal(isRecognizedOpenSourceLicense('MIT'), true);
  assert.equal(isRecognizedOpenSourceLicense('Apache-2.0'), true);
  assert.equal(isRecognizedOpenSourceLicense('NOASSERTION'), false);
  assert.equal(isRecognizedOpenSourceLicense(null), false);
});

test('categories are inferred from metadata without executing upstream code', () => {
  assert.equal(inferCategory({ name:'browser-use', description:'AI browser automation', topics:['agent'] }, ['agents']), 'browser-agent');
  assert.equal(inferCategory({ name:'qdrant', description:'vector database', topics:[] }, []), 'vector-database');
  assert.equal(inferCategory({ name:'promptfoo', description:'LLM evaluation and red teaming', topics:[] }, []), 'evaluation');
});

test('indexed entries remain reference-only until separately tested', () => {
  const entry = buildIndexedEntry({
    name:'demo', full_name:'owner/demo', description:'Agent framework', html_url:'https://github.com/owner/demo',
    default_branch:'main', license:{spdx_id:'MIT'}, language:'TypeScript', topics:['agents'],
    stargazers_count:10, forks_count:2, pushed_at:'2026-10-20T00:00:00Z', archived:false, fork:false, private:false, visibility:'PUBLIC'
  }, [{id:'feed',defaultCategory:'agents'}], '2026-10-21T00:00:00Z');
  assert.equal(entry.status, 'indexed');
  assert.equal(entry.integration.tested, false);
  assert.equal(entry.integration.installRecipe, null);
  assert.deepEqual(entry.evidence.sourceFeeds, ['feed']);
});


test('GraphQL repository metadata is normalized without changing evidence state', () => {
  const meta = graphqlNodeToMetadata({
    name: 'demo',
    nameWithOwner: 'owner/demo',
    description: 'Agent framework',
    url: 'https://github.com/owner/demo',
    isPrivate: false,
    visibility: 'PUBLIC',
    isArchived: false,
    isFork: false,
    pushedAt: '2026-10-20T00:00:00Z',
    stargazerCount: 12,
    forkCount: 3,
    defaultBranchRef: { name: 'main' },
    licenseInfo: { spdxId: 'Apache-2.0' },
    primaryLanguage: { name: 'Python' },
    repositoryTopics: { nodes: [{ topic: { name: 'agents' } }, { topic: { name: 'mcp' } }] }
  });
  assert.equal(meta.full_name, 'owner/demo');
  assert.equal(meta.license.spdx_id, 'Apache-2.0');
  assert.equal(meta.language, 'Python');
  assert.deepEqual(meta.topics, ['agents', 'mcp']);
  assert.equal(meta.archived, false);
  assert.equal(meta.fork, false);
  assert.equal(meta.visibility, 'PUBLIC');
});

test('complete candidate set is selected unless an explicit positive limit is supplied', () => {
  const values = Array.from({ length: 1701 }, (_, index) => ({ repo: `example/tool-${index}` }));
  assert.equal(selectCatalogCandidates(values, undefined).length, 1701);
  assert.equal(selectCatalogCandidates(values, '100').length, 100);
  assert.throws(() => selectCatalogCandidates(values, '0'));
  assert.throws(() => selectCatalogCandidates(values, 'not-a-number'));
});

test('index builder fails closed on private, archived, forked and ambiguous-license projects', () => {
  const safe = {
    name: 'demo', full_name: 'owner/demo', description: 'Testing',
    html_url: 'https://github.com/owner/demo', visibility: 'PUBLIC',
    private: false, archived: false, fork: false,
    license: { spdx_id: 'MIT' }, topics: []
  };
  const feeds = [{ id: 'reviewed', defaultCategory: 'developer-tool' }];
  const observed = '2026-10-21T00:00:00Z';
  for (const altered of [
    { visibility: 'INTERNAL' },
    { visibility: null },
    { private: true },
    { archived: true },
    { fork: true },
    { license: { spdx_id: 'NOASSERTION' } },
    { license: { spdx_id: 'LicenseRef-custom' } },
    { license: null }
  ]) {
    assert.throws(() => buildIndexedEntry({ ...safe, ...altered }, feeds, observed));
  }
  assert.equal(buildIndexedEntry(safe, feeds, observed).github.visibility, 'PUBLIC');
  assert.equal(buildIndexedEntry(safe, feeds, observed).github.fork, false);
});
