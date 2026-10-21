import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { validateDownloadedFile } from '../dist/downloads.js';

function spec(format, extra = {}) {
  return { id: 'direct-download', kind: 'download', startPath: '/', trigger: '#download', format, ...extra };
}

async function tempDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nomvex-download-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function makePdf() {
  const document = await PDFDocument.create();
  document.addPage([200, 100]);
  return Buffer.from(await document.save());
}

test('direct PDF helper validates actual bytes despite a non-PDF filename', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const path = join(directory, 'download.bin');
  await writeFile(path, await makePdf());
  const result = await validateDownloadedFile(path, spec('pdf'));
  assert.equal(result.status, 'passed', JSON.stringify(result));
  assert.equal(result.evidence.pages, 1);
  assert.ok(result.evidence.bytes > 100);
});

test('missing files and directories return controlled errors without exposing paths', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const missing = join(directory, 'private-filename-never-expose.json');
  const result = await validateDownloadedFile(missing, spec('json'));
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'FILE_READ_ERROR');
  assert.ok(!JSON.stringify(result).includes('private-filename-never-expose'));
  const nonFile = await validateDownloadedFile(directory, spec('text'));
  assert.equal(nonFile.status, 'error');
  assert.equal(nonFile.code, 'FILE_READ_ERROR');
});

test('direct helper refuses symbolic links on Linux', { timeout: 15000, skip: process.platform !== 'linux' ? 'Linux O_NOFOLLOW behavior is tested on Linux.' : false }, async (t) => {
  const directory = await tempDirectory(t);
  const original = join(directory, 'original.txt');
  const link = join(directory, 'link.txt');
  await writeFile(original, 'synthetic secret file contents');
  await symlink(original, link);
  const result = await validateDownloadedFile(link, spec('text'));
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'FILE_READ_ERROR');
  assert.ok(!JSON.stringify(result).includes('synthetic secret'));
});

test('PDF validation rejects missing EOF and truncated objects even with an EOF marker', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const bytes = await makePdf();
  const eof = bytes.lastIndexOf(Buffer.from('%%EOF'));
  assert.ok(eof > 0);
  const missingEof = join(directory, 'missing-eof.pdf');
  const truncated = join(directory, 'truncated.pdf');
  await writeFile(missingEof, bytes.subarray(0, eof));
  await writeFile(truncated, Buffer.concat([bytes.subarray(0, 50), Buffer.from('\nprivate-content-marker\n%%EOF\n')]));
  for (const path of [missingEof, truncated]) {
    const result = await validateDownloadedFile(path, spec('pdf'));
    assert.equal(result.status, 'failed', JSON.stringify(result));
    assert.equal(result.code, 'PDF_INVALID');
    assert.ok(!JSON.stringify(result).includes('private-content-marker'));
  }
});

test('JSON required keys must be own properties, including prototype-like key names', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const ordinary = join(directory, 'ordinary.json');
  const explicit = join(directory, 'explicit.json');
  await writeFile(ordinary, '{"name":"Alpha"}');
  await writeFile(explicit, '{"constructor":"provided","toString":"provided","__proto__":{"nomvexPolluted":true}}');
  const missingOwn = await validateDownloadedFile(ordinary, spec('json', { requiredKeys: ['constructor', 'toString'] }));
  assert.equal(missingOwn.status, 'failed');
  assert.equal(missingOwn.code, 'JSON_KEYS_MISSING');
  const suppliedOwn = await validateDownloadedFile(explicit, spec('json', { requiredKeys: ['constructor', 'toString', '__proto__'] }));
  assert.equal(suppliedOwn.status, 'passed', JSON.stringify(suppliedOwn));
  assert.equal(suppliedOwn.evidence.requiredKeysChecked, 3);
  assert.equal({}.nomvexPolluted, undefined);
});

test('expectedText is enforced together with structural checks for JSON and CSV', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  for (const [format, content, extra] of [
    ['json', '{"name":"Alpha","count":1}', { requiredKeys: ['name', 'count'] }],
    ['csv', 'name,count\nAlpha,1\n', { csvHeaders: ['name', 'count'] }],
  ]) {
    const path = join(directory, `report.${format}`);
    await writeFile(path, content);
    const passing = await validateDownloadedFile(path, spec(format, { ...extra, expectedText: 'Alpha' }));
    assert.equal(passing.status, 'passed', JSON.stringify(passing));
    assert.equal(passing.evidence.expectedTextChecked, true);
    const absent = await validateDownloadedFile(path, spec(format, { ...extra, expectedText: 'Omega' }));
    assert.equal(absent.status, 'failed');
    assert.equal(absent.code, 'TEXT_MISMATCH');
  }
});

test('caller size ceiling and minBytes boundaries apply before content validation', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const path = join(directory, 'eight.txt');
  await writeFile(path, '12345678');
  const exact = await validateDownloadedFile(path, spec('text', { minBytes: 8 }), 8);
  assert.equal(exact.status, 'passed', JSON.stringify(exact));
  assert.equal(exact.evidence.bytes, 8);
  const oversized = await validateDownloadedFile(path, spec('text'), 7);
  assert.equal(oversized.status, 'failed');
  assert.equal(oversized.code, 'DOWNLOAD_TOO_LARGE');
  const undersized = await validateDownloadedFile(path, spec('text', { minBytes: 9 }), 16);
  assert.equal(undersized.status, 'failed');
  assert.equal(undersized.code, 'DOWNLOAD_TOO_SMALL');
});

test('text validation rejects invalid UTF-8 and binary NUL content', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const invalidUtf8 = join(directory, 'invalid-utf8.txt');
  const binary = join(directory, 'binary.txt');
  await writeFile(invalidUtf8, Buffer.from([0xc3, 0x28]));
  await writeFile(binary, Buffer.from([65, 0, 66]));
  for (const path of [invalidUtf8, binary]) {
    const result = await validateDownloadedFile(path, spec('text'));
    assert.equal(result.status, 'failed');
    assert.equal(result.code, 'TEXT_INVALID');
  }
});

test('a UTF-8 BOM by itself does not count as usable text content', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const path = join(directory, 'bom-only.txt');
  await writeFile(path, Buffer.from([0xef, 0xbb, 0xbf]));
  const result = await validateDownloadedFile(path, spec('text'));
  assert.equal(result.status, 'failed', JSON.stringify(result));
  assert.equal(result.code, 'DOWNLOAD_TOO_SMALL');
});

test('parser deadline and abort return bounded errors and later parsing still succeeds', { timeout: 15000 }, async (t) => {
  const directory = await tempDirectory(t);
  const path = join(directory, 'valid.json');
  await writeFile(path, '{"name":"Alpha"}');
  const expired = await validateDownloadedFile(path, spec('json'), undefined, { timeoutMs: 1 });
  assert.equal(expired.status, 'error');
  assert.equal(expired.code, 'CHECK_TIMEOUT');
  const alreadyAborted = await validateDownloadedFile(path, spec('json'), undefined, { signal: AbortSignal.abort() });
  assert.equal(alreadyAborted.status, 'error');
  assert.equal(alreadyAborted.code, 'CHECK_TIMEOUT');
  const controller = new AbortController();
  const inFlight = validateDownloadedFile(path, spec('json'), undefined, { signal: controller.signal });
  controller.abort();
  const canceled = await inFlight;
  assert.equal(canceled.status, 'error');
  assert.equal(canceled.code, 'CHECK_TIMEOUT');
  const recovery = await validateDownloadedFile(path, spec('json', { requiredKeys: ['name'] }));
  assert.equal(recovery.status, 'passed', JSON.stringify(recovery));
});
