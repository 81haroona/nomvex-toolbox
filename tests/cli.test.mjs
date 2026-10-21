import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { startFixture } from '../examples/fixture.mjs';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const invoke = (args, cwd) => new Promise(resolve => {
  execFile(process.execPath, [cli, ...args], { cwd, timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }));
});
const config = checks => ({ version: 1, baseUrl: 'http://127.0.0.1:1', timeoutMs: 1500, checks });
const redirect = { id: 'return', kind: 'redirect', startPath: '/', expectedPath: '/' };
async function workspace(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nomvex cli space '));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('CLI help, version and invalid flags return clear exit codes', async t => {
  const cwd = await workspace(t);
  assert.equal((await invoke(['--help'], cwd)).code, 0);
  assert.equal((await invoke(['--version'], cwd)).stdout.trim(), '0.1.0');
  assert.equal((await invoke(['--made-up', 'value'], cwd)).code, 2);
  assert.equal((await invoke([], cwd)).code, 2);
});

test('invalid JSON/config and missing file fail without leaking values', async t => {
  const cwd = await workspace(t);
  const file = join(cwd, 'config.json');
  await writeFile(file, '{"secret":"synthetic-config-secret"');
  const invalid = await invoke(['--config', file], cwd);
  assert.equal(invalid.code, 2);
  assert.ok(!invalid.stderr.includes('synthetic-config-secret'));
  assert.equal((await invoke(['--config', join(cwd, 'missing.json')], cwd)).code, 2);
});

test('disabled check writes bilingual reports but exits incomplete', async t => {
  const cwd = await workspace(t);
  const file = join(cwd, 'config with spaces.json');
  await writeFile(file, JSON.stringify(config([{ ...redirect, enabled: false }])));
  const result = await invoke(['--config', file, '--out', 'reports with spaces', '--lang', 'en'], cwd);
  assert.equal(result.code, 2, result.stderr);
  const report = JSON.parse(await readFile(join(cwd, 'reports with spaces', 'report.json'), 'utf8'));
  assert.equal(report.summary.skipped, 1);
  assert.equal(report.language, 'en');
  assert.ok((await readFile(join(cwd, 'reports with spaces', 'report.html'), 'utf8')).includes('<html lang="en">'));
});

test('pre-existing reports and configuration are never overwritten', async t => {
  const cwd = await workspace(t);
  const file = join(cwd, 'report.json');
  const content = JSON.stringify(config([{ ...redirect, enabled: false }]));
  await writeFile(file, content);
  const result = await invoke(['--config', file, '--out', cwd], cwd);
  assert.equal(result.code, 2);
  assert.ok(result.stderr.includes('OUTPUT_EXISTS'));
  assert.equal(await readFile(file, 'utf8'), content);
  assert.deepEqual((await readdir(cwd)).sort(), ['report.json']);
});

test('missing environment input exits error and records its diagnostic', async t => {
  const cwd = await workspace(t);
  const file = join(cwd, 'config.json');
  await writeFile(file, JSON.stringify(config([{ ...redirect, steps: [{ action: 'fill', selector: '#input', env: `NOMVEX_ABSENT_CLI_${process.pid}` }] }])));
  const result = await invoke(['--config', file, '--out', 'reports'], cwd);
  assert.equal(result.code, 2);
  const report = JSON.parse(await readFile(join(cwd, 'reports', 'report.json'), 'utf8'));
  assert.equal(report.results[0].code, 'MISSING_ENV');
});

test('real CLI user path produces passing and failing browser reports', { timeout: 60000 }, async t => {
  const cwd = await workspace(t);
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const file = join(cwd, 'config.json');
  await writeFile(file, JSON.stringify({ ...config([redirect]), baseUrl: fixture.baseUrl }));
  const good = await invoke(['--config', file, '--out', 'good'], cwd);
  assert.equal(good.code, 0, `${good.stdout}\n${good.stderr}`);
  await writeFile(file, JSON.stringify({ ...config([{ ...redirect, expectedPath: '/wrong' }]), baseUrl: fixture.baseUrl }));
  const broken = await invoke(['--config', file, '--out', 'broken'], cwd);
  assert.equal(broken.code, 1, `${broken.stdout}\n${broken.stderr}`);
  assert.equal(JSON.parse(await readFile(join(cwd, 'broken/report.json'), 'utf8')).summary.failed, 1);
});
