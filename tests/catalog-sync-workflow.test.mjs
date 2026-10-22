import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('scheduled catalog refresh creates isolated non-force data-review branches', async () => {
  const content = await readFile(new URL('../.github/workflows/catalog-sync.yml', import.meta.url), 'utf8');
  assert.match(content, /branch="automation\/open-source-catalog-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}"/);
  assert.match(content, /git checkout -b "\$branch"/);
  assert.match(content, /git push origin "HEAD:refs\/heads\/\$branch"/);
  assert.doesNotMatch(content, /git push[^\n]*(?:--force| -f\b)/);
  assert.doesNotMatch(content, /pull_request_target:/);
  assert.doesNotMatch(content, /^  issue_comment:/m);
  assert.match(content, /npm run catalog:check/);
  assert.match(content, /node --test tests\/open-source-registry\.test\.mjs/);
  assert.match(content, /gh pr create --base main --head "\$branch"/);
});

test('only catalog JSON snapshots are committed by the sync', async () => {
  const content = await readFile(new URL('../.github/workflows/catalog-sync.yml', import.meta.url), 'utf8');
  const line = content.split('\n').find(row => row.trimStart().startsWith('git add '));
  assert.equal(line?.trim(), 'git add catalog/candidates.json catalog/open-source-index.json catalog/open-source-quarantine.json');
});
