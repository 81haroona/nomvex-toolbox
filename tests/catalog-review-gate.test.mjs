import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pendingCatalogReviewNumbers } from '../scripts/catalog-review-gate.mjs';

const repo = '81haroona/nomvex-toolbox';
const review = (number, ref = 'automation/open-source-catalog-39877955135-1', fullName = repo, state = 'open') => ({
  number, state, head: { ref, repo: { full_name: fullName } }
});

test('catalog review gate detects all open same-repository generated PRs across pages', () => {
  const pages = [
    [review(48), review(35), review(48), review(10, 'feature/unrelated')],
    [review(50), review(51, 'automation/open-source-catalog-abc', 'someone/fork'), review(31, undefined, repo, 'closed')],
    []
  ];
  assert.deepEqual(pendingCatalogReviewNumbers(pages, repo), [35, 48, 50]);
});

test('catalog review gate permits only an explicitly empty pending set', () => {
  assert.deepEqual(pendingCatalogReviewNumbers([[], [review(9, 'feature/unrelated')]], repo), []);
  assert.deepEqual(pendingCatalogReviewNumbers([[]], repo), []);
});

test('catalog review gate fails closed on malformed, absent, or untrusted page records', () => {
  for (const pages of [undefined, {}, [], [[null]], [{}], [[{state:'open'}]], [[{ ...review(3), head: { ref:'automation/open-source-catalog-3', repo:null }}]], [[{...review(3), number:0}]], [null]]) {
    assert.throws(() => pendingCatalogReviewNumbers(pages, repo));
  }
  assert.throws(() => pendingCatalogReviewNumbers([[]], 'invalid-repo'));
});

test('catalog review gate CLI prints sorted PRs and returns an error for invalid API JSON', () => {
  const script = fileURLToPath(new URL('../scripts/catalog-review-gate.mjs', import.meta.url));
  const good = spawnSync(process.execPath, [script, repo], { input: JSON.stringify([[review(50),review(35)]]), encoding:'utf8' });
  assert.equal(good.status, 0);
  assert.equal(good.stdout, '35\n50\n');
  const blocked = spawnSync(process.execPath, [script, repo], { input: '{not json', encoding:'utf8' });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /failed closed/);
  const zeroPages = spawnSync(process.execPath, [script, repo], { input: '[]', encoding:'utf8' });
  assert.notEqual(zeroPages.status, 0);
  assert.match(zeroPages.stderr, /Missing paginated pull request response/);
});
