import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGitHubRepos, isRecognizedOpenSourceLicense, inferCategory, buildIndexedEntry } from '../scripts/open-source-lib.mjs';

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
    stargazers_count:10, forks_count:2, pushed_at:'2026-10-20T00:00:00Z', archived:false
  }, [{id:'feed',defaultCategory:'agents'}], '2026-10-21T00:00:00Z');
  assert.equal(entry.status, 'indexed');
  assert.equal(entry.integration.tested, false);
  assert.equal(entry.integration.installRecipe, null);
  assert.deepEqual(entry.evidence.sourceFeeds, ['feed']);
});
