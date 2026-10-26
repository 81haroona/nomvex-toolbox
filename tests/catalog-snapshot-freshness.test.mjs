import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const catalogPaths = [
  'catalog/candidates.json',
  'catalog/open-source-index.json',
  'catalog/open-source-quarantine.json'
];

test('catalog sync invalidates snapshot on catalog-data-only main advance', () => {
  const workflow = readFileSync(new URL('../.github/workflows/catalog-sync.yml', import.meta.url), 'utf8');
  const guard = workflow.match(/if ! git diff --quiet "\\$scan_base" "\\$latest_main" -- \\\n([\\s\\S]*?); then/);
  assert.ok(guard, 'missing mandatory fail-closed scan base guard');
  for (const path of catalogPaths) {
    assert.ok(guard[1].includes(path), `data-only changes must invalidate scan: ${path}`);
  }
  const checkpoint = workflow.indexOf('pending="$(gh api', workflow.indexOf('snapshot_commit="$(git rev-parse HEAD)"'));
  const finalFetch = workflow.indexOf('git fetch --no-tags origin main', checkpoint);
  const finalMatch = workflow.indexOf('if [[ "$final_main" != "$latest_main" ]]', finalFetch);
  const branch = workflow.indexOf('git checkout -b "$branch" "$latest_main"');
  assert.ok(checkpoint > 0 && finalFetch > checkpoint && finalMatch > finalFetch && branch > finalMatch,
    'main must be revalidated after late PR gate and before any review branch creation');
  assert.ok(workflow.slice(finalMatch, branch).includes('exit 1'), 'main movement must fail closed');

  const temp = mkdtempSync(join(tmpdir(), 'nomvex-catalog-freshness-'));
  const git = (...args) => {
    const output = spawnSync('git', args, { cwd: temp, encoding: 'utf8' });
    if (output.error) throw output.error;
    return output;
  };
  try {
    assert.equal(git('init', '-q').status, 0);
    assert.equal(git('config', 'user.name', 'NOMVEX Fixture').status, 0);
    assert.equal(git('config', 'user.email', 'fixture@example.invalid').status, 0);
    mkdirSync(join(temp, 'catalog'));
    for (const path of catalogPaths) writeFileSync(join(temp, path), '{"version":1}\n');
    assert.equal(git('add', '.').status, 0);
    assert.equal(git('commit', '-q', '-m', 'fixture baseline').status, 0);
    const scanBase = git('rev-parse', 'HEAD').stdout.trim();
    writeFileSync(join(temp, 'catalog/open-source-index.json'), '{"version":2}\n');
    assert.equal(git('add', '.').status, 0);
    assert.equal(git('commit', '-q', '-m', 'merged catalog update during scan').status, 0);
    const latestMain = git('rev-parse', 'HEAD').stdout.trim();
    assert.notEqual(scanBase, latestMain);
    assert.equal(git('diff', '--quiet', scanBase, latestMain, '--', ...catalogPaths).status, 1,
      'a data-only main update must fail the guarded comparison');
    assert.equal(git('branch', '--list', 'automation/*').stdout.trim(), '',
      'the fixture must not create a catalog review branch');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
