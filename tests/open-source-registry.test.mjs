import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGitHubRepos, isRecognizedOpenSourceLicense, inferCategory, buildIndexedEntry, graphqlNodeToMetadata, selectCatalogCandidates, buildQuarantineRecord, resolveCanonicalAliasCollision, assertDistinctReferenceIds } from '../scripts/open-source-lib.mjs';

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


test('quarantine keeps original alias identity for denied canonical redirects', () => {
  const metadata = { full_name: 'getsentry/toolkit', license: { spdx_id: 'NOASSERTION' } };
  const alias = buildQuarantineRecord('getsentry/old-toolkit', metadata, 'license-not-allowlisted:NOASSERTION', ['feed-b', 'feed-a', 'feed-a'], '2026-10-23T00:00:00Z');
  const direct = buildQuarantineRecord('getsentry/toolkit', metadata, 'canonical-alias-merged', ['feed-c'], '2026-10-23T00:00:00Z');
  assert.equal(alias.fullName, 'getsentry/old-toolkit');
  assert.equal(alias.canonicalFullName, 'getsentry/toolkit');
  assert.equal(alias.source, 'https://github.com/getsentry/old-toolkit');
  assert.deepEqual(alias.sourceFeeds, ['feed-a', 'feed-b']);
  assert.equal(direct.fullName, 'getsentry/toolkit');
  assert.equal('canonicalFullName' in direct, false);
  assert.notEqual(alias.fullName.toLowerCase(), direct.fullName.toLowerCase());
});

test('quarantine preserves candidate case without inventing another alias', () => {
  const row = buildQuarantineRecord('Owner/Repo', { full_name: 'owner/repo', license: { spdx_id: 'MIT' } }, 'fork', ['feed'], '2026-10-23T00:00:00Z');
  assert.equal(row.fullName, 'Owner/Repo');
  assert.equal('canonicalFullName' in row, false);
});

test('quarantine identity and reason fail closed on invalid data', () => {
  const meta = { full_name: 'owner/repo', license: { spdx_id: 'MIT' } };
  assert.throws(() => buildQuarantineRecord('invalid', meta, 'fork', ['feed'], 'now'));
  assert.throws(() => buildQuarantineRecord('owner/repo', { full_name: 'invalid' }, 'fork', ['feed'], 'now'));
  assert.throws(() => buildQuarantineRecord('owner/repo', meta, '', ['feed'], 'now'));
});

test('canonical candidate displaces an earlier redirected alias without losing its evidence', () => {
  const oldAlias = { repo: 'ahujasid/blender-mcp', sourceFeeds: ['source-old'] };
  const canonical = { repo: 'ahujasid/mcp-for-blender', sourceFeeds: ['source-direct'] };
  const result = resolveCanonicalAliasCollision(oldAlias, canonical, 'ahujasid/mcp-for-blender');
  assert.deepEqual(result, {
    quarantinedRepo: 'ahujasid/blender-mcp',
    quarantinedFeeds: ['source-old'],
    promoteIncoming: true
  });
  assert.deepEqual(oldAlias.sourceFeeds, ['source-old']);
});

test('a later alias is quarantined when the canonical candidate was already primary', () => {
  const canonical = { repo: 'example/actual', sourceFeeds: ['source-direct'] };
  const alias = { repo: 'example/old', sourceFeeds: ['source-alias'] };
  assert.deepEqual(resolveCanonicalAliasCollision(canonical, alias, 'example/actual'), {
    quarantinedRepo: 'example/old',
    quarantinedFeeds: ['source-alias'],
    promoteIncoming: false
  });
});

test('a second redirect cannot displace a previous redirect until the canonical candidate arrives', () => {
  assert.deepEqual(resolveCanonicalAliasCollision(
    { repo: 'example/old-a', sourceFeeds: ['feed-a'] },
    { repo: 'example/old-b', sourceFeeds: ['feed-b'] },
    'example/actual'
  ), { quarantinedRepo: 'example/old-b', quarantinedFeeds: ['feed-b'], promoteIncoming: false });
});

test('canonical collision rejects invalid or duplicate source identities', () => {
  const first = { repo: 'example/repo', sourceFeeds: ['feed'] };
  assert.throws(() => resolveCanonicalAliasCollision(first, first, 'example/repo'));
  assert.throws(() => resolveCanonicalAliasCollision(first, { repo: '../invalid' }, 'example/repo'));
});


test('different repositories with a colliding generated catalog ID are rejected', () => {
  const build = fullName => buildIndexedEntry({
    full_name: fullName, name: fullName.split('/')[1],
    html_url: `https://github.com/${fullName}`, visibility: 'PUBLIC',
    private: false, archived: false, fork: false, license: { spdx_id: 'MIT' }, topics: []
  }, [{ id: 'test-feed', defaultCategory: 'developer-tool' }], '2026-10-23T00:00:00Z');
  const a = build('owner-one/repo');
  const b = build('owner/one-repo');
  assert.notEqual(a.fullName, b.fullName);
  assert.equal(a.id, b.id);
  assert.throws(() => assertDistinctReferenceIds([a, b]), /Duplicate registry reference ID/);
  assert.throws(() => assertDistinctReferenceIds([{ id: 'ABC' }, { id: 'abc' }]), /Duplicate registry reference ID/);
  assert.throws(() => assertDistinctReferenceIds([{ id: '' }]), /non-empty/);
  assert.doesNotThrow(() => assertDistinctReferenceIds([a]));
});
