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

test('automated data-only PR triggers actual protected merge-SHA CI', async () => {
  const workflow = await readFile(new URL('../.github/workflows/catalog-sync.yml', import.meta.url), 'utf8');
  assert.match(workflow, /actions: write/);
  assert.match(workflow, /gh pr create --base main --head "\$branch"/);
  assert.match(workflow, /pr_number=.*gh pr view/);
  assert.match(workflow, /pr_head=.*gh pr view/);
  assert.match(workflow, /merge_sha=.*gh api/);
  assert.match(workflow, /merge_sha.*pr_head/);
  assert.match(workflow, /gh api -X POST "repos\/\$GITHUB_REPOSITORY\/git\/refs"/);
  assert.match(workflow, /gh workflow run ci\.yml -R "\$GITHUB_REPOSITORY" --ref "\$check_branch"/);
  assert.doesNotMatch(workflow, /gh pr merge|--admin|--force origin|GIT_SSL_NO_VERIFY|NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
