import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { startFixture, makeDemoConfig } from '../examples/fixture.mjs';
import { runChecks } from '../dist/run.js';

const options = process.env.NOMVEX_BROWSER_EXECUTABLE ? { executablePath: process.env.NOMVEX_BROWSER_EXECUTABLE } : {};
const checkConfig = (baseUrl, checks, more = {}) => ({ version: 1, baseUrl, language: 'en', timeoutMs: 2500, concurrency: 2, ...more, checks });
const expectNotPassed = (report, id) => {
  const result = report.results.find((entry) => entry.id === id);
  assert.ok(result, `Missing result for ${id}`);
  assert.ok(result.status === 'failed' || result.status === 'error', `${id} unexpectedly reported ${result.status}: ${JSON.stringify(result)}`);
  return result;
};
const download = (id, trigger, format, extra = {}) => ({ id, kind: 'download', startPath: '/exports', trigger, format, ...extra });

test('healthy auth, locale and four export formats pass real browser checks', { timeout: 60000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const report = await runChecks(makeDemoConfig(fixture.baseUrl), options);
  assert.equal(report.summary.total, 6);
  assert.equal(report.summary.passed, 6, JSON.stringify(report.results, null, 2));
  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.error, 0);
  assert.equal(report.summary.skipped, 0);
  assert.equal(report.results.length, 6);
});

test('delayed navigation and return URL query parameters are checked correctly', { timeout: 30000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const report = await runChecks(checkConfig(fixture.baseUrl, [
    { id: 'delayed', kind: 'redirect', startPath: '/delayed', steps: [{ action: 'click', selector: '#continue-button' }], expectedPath: '/members' },
    { id: 'query-return', kind: 'redirect', startPath: '/protected?returnTo=%2Fmembers%3Ftab%3Dexports', steps: [{ action: 'click', selector: '#login-button' }], expectedPath: '/members?tab=exports' },
  ]), options);
  assert.equal(report.summary.passed, 2, JSON.stringify(report.results, null, 2));
});

test('broken redirects, lost language, invalid and oversized exports cannot be green', { timeout: 60000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const checks = [
    { id: 'wrong-return', kind: 'redirect', startPath: '/broken/protected', steps: [{ action: 'click', selector: '#login-button' }], expectedPath: '/members' },
    { id: 'lost-locale', kind: 'locale', startPath: '/broken/locale', steps: [{ action: 'select', selector: '#language', value: 'en' }], expectedLang: 'en', reload: true },
    { id: 'lost-follow-locale', kind: 'locale', startPath: '/broken/follow-locale', steps: [{ action: 'select', selector: '#language', value: 'en' }], expectedLang: 'en', reload: true, followPath: '/locale/reset' },
    download('fake-pdf', '#fake-pdf', 'pdf'),
    download('truncated-pdf', '#truncated-pdf', 'pdf'),
    download('empty-text', '#empty-text', 'text'),
    download('missing-json-keys', '#bad-keys', 'json', { requiredKeys: ['title', 'items'] }),
    download('malformed-json', '#bad-json', 'json'),
    download('wrong-csv-header', '#bad-header', 'csv', { csvHeaders: ['name', 'note', 'count'] }),
    download('malformed-csv', '#bad-csv', 'csv', { csvHeaders: ['name', 'note', 'count'] }),
    download('invalid-utf8', '#invalid-utf8', 'text'),
    download('too-large', '#large-text', 'text'),
  ];
  const report = await runChecks(checkConfig(fixture.baseUrl, checks, { timeoutMs: 6000 }), options);
  assert.equal(report.summary.total, checks.length);
  assert.equal(report.summary.passed, 0, JSON.stringify(report.results, null, 2));
  const expectedCodes = {
    'wrong-return': 'REDIRECT_MISMATCH',
    'lost-locale': 'LOCALE_MISMATCH',
    'lost-follow-locale': 'LOCALE_MISMATCH',
    'fake-pdf': 'PDF_INVALID',
    'truncated-pdf': 'PDF_INVALID',
    'empty-text': 'DOWNLOAD_TOO_SMALL',
    'missing-json-keys': 'JSON_KEYS_MISSING',
    'malformed-json': 'JSON_INVALID',
    'wrong-csv-header': 'CSV_HEADERS_MISMATCH',
    'malformed-csv': 'CSV_INVALID',
    'invalid-utf8': 'TEXT_INVALID',
    'too-large': 'DOWNLOAD_TOO_LARGE',
  };
  for (const check of checks) {
    const result = expectNotPassed(report, check.id);
    assert.equal(result.status, 'failed', JSON.stringify(result));
    assert.equal(result.code, expectedCodes[check.id], JSON.stringify(result));
  }
});

test('a disabled check is skipped and never reported as passed', { timeout: 20000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const report = await runChecks(checkConfig(fixture.baseUrl, [
    { id: 'disabled', kind: 'redirect', startPath: '/does-not-exist', expectedPath: '/members', enabled: false },
  ]), options);
  assert.equal(report.summary.skipped, 1);
  assert.equal(report.summary.passed, 0);
});

test('an unavailable local target is reported without success', { timeout: 20000 }, async () => {
  const fixture = await startFixture();
  const baseUrl = fixture.baseUrl;
  await fixture.close();
  const report = await runChecks(checkConfig(baseUrl, [{ id: 'unavailable', kind: 'redirect', startPath: '/', expectedPath: '/members' }], { timeoutMs: 1000 }), options);
  const result = expectNotPassed(report, 'unavailable');
  assert.equal(result.status, 'error');
  assert.equal(result.evidence?.stage, 'navigation', JSON.stringify(result));
  assert.notEqual(result.code, 'ORIGIN_BLOCKED');
  assert.equal(report.summary.passed, 0);
});

test('missing environment input fails explicitly and cannot be green', { timeout: 20000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const key = `NOMVEX_MISSING_FIXTURE_VALUE_${process.pid}`;
  assert.equal(process.env[key], undefined);
  const report = await runChecks(checkConfig(fixture.baseUrl, [{ id: 'missing-input', kind: 'redirect', startPath: '/protected', steps: [{ action: 'fill', selector: '#email', env: key }, { action: 'click', selector: '#login-button' }], expectedPath: '/members' }]), options);
  const result = expectNotPassed(report, 'missing-input');
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'MISSING_ENV');
});

test('a slow page respects the configured timeout and produces an error', { timeout: 15000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const report = await runChecks(checkConfig(fixture.baseUrl, [{ id: 'timed-out', kind: 'redirect', startPath: '/slow', expectedPath: '/slow' }], { timeoutMs: 500 }), options);
  const result = expectNotPassed(report, 'timed-out');
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'CHECK_TIMEOUT', JSON.stringify(result));
  assert.ok(result.durationMs < 8000, `Timeout did not bound the check: ${result.durationMs}ms`);
});

test('unapproved navigation origin is blocked before the destination receives a request', { timeout: 20000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  let hits = 0;
  const sink = http.createServer((_request, response) => { hits++; response.end('This destination must not be reached.'); });
  sink.listen(0, '127.0.0.1');
  await once(sink, 'listening');
  t.after(() => new Promise((resolve) => { sink.closeAllConnections(); sink.close(resolve); }));
  const target = `http://127.0.0.1:${sink.address().port}`;
  const report = await runChecks(checkConfig(fixture.baseUrl, [{ id: 'blocked-origin', kind: 'redirect', startPath: `/external?target=${encodeURIComponent(target)}`, steps: [{ action: 'click', selector: '#external-button' }], expectedPath: '/' }]), options);
  assert.equal(expectNotPassed(report, 'blocked-origin').code, 'ORIGIN_BLOCKED');
  assert.equal(hits, 0, 'Unapproved destination was contacted.');
});

test('an HTTP redirect cannot contact an unapproved second origin', { timeout: 20000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  let hits = 0;
  const sink = http.createServer((_request, response) => { hits++; response.end('A redirected request must not arrive here.'); });
  sink.listen(0, '127.0.0.1');
  await once(sink, 'listening');
  t.after(() => new Promise((resolve) => { sink.closeAllConnections(); sink.close(resolve); }));
  const target = `http://127.0.0.1:${sink.address().port}/destination`;
  const report = await runChecks(checkConfig(fixture.baseUrl, [{ id: 'blocked-server-redirect', kind: 'redirect', startPath: `/external-redirect?target=${encodeURIComponent(target)}`, expectedPath: '/destination' }]), options);
  assert.equal(expectNotPassed(report, 'blocked-server-redirect').code, 'ORIGIN_BLOCKED');
  assert.equal(hits, 0, 'An HTTP redirect contacted an unapproved origin.');
});

test('an explicitly approved second origin may complete a redirect round-trip', { timeout: 20000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  let hits = 0;
  const sink = http.createServer((_request, response) => { hits++; response.writeHead(302, { location: `${fixture.baseUrl}/locale` }); response.end(); });
  sink.listen(0, '127.0.0.1');
  await once(sink, 'listening');
  t.after(() => new Promise((resolve) => { sink.closeAllConnections(); sink.close(resolve); }));
  const target = `http://127.0.0.1:${sink.address().port}`;
  const report = await runChecks(checkConfig(fixture.baseUrl, [{ id: 'allowed-round-trip', kind: 'redirect', startPath: `/external-redirect?target=${encodeURIComponent(target)}`, expectedPath: '/locale' }], { allowedOrigins: [target] }), options);
  assert.equal(report.summary.passed, 1, JSON.stringify(report.results, null, 2));
  assert.ok(hits >= 1, 'Approved origin was never visited.');
});

test('a dedicated worker cannot hide a blocked WebSocket attempt behind a successful locale change', { timeout: 20000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  let hits = 0;
  const sink = http.createServer((_request, response) => { hits++; response.end('Unapproved worker target.'); });
  sink.on('upgrade', (_request, socket) => { hits++; socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); });
  sink.listen(0, '127.0.0.1');
  await once(sink, 'listening');
  t.after(() => new Promise((resolve) => { sink.closeAllConnections(); sink.close(resolve); }));
  const target = `ws://127.0.0.1:${sink.address().port}/worker-socket`;
  const report = await runChecks(checkConfig(fixture.baseUrl, [{
    id: 'unsupported-worker', kind: 'locale',
    startPath: `/worker-locale?target=${encodeURIComponent(target)}`,
    expectedLang: 'en',
  }]), options);
  const result = expectNotPassed(report, 'unsupported-worker');
  assert.equal(result.status, 'error', JSON.stringify(result));
  assert.equal(result.code, 'WORKER_UNSUPPORTED', JSON.stringify(result));
  assert.equal(hits, 0, 'A dedicated worker contacted an unapproved WebSocket origin.');
});

// The independent page and blocked SharedWorker run concurrently in isolated contexts.
// Permit slow macOS runner scheduling without dropping either security assertion.
test('a shared worker cannot hide a blocked WebSocket attempt behind a successful locale change', { timeout: 35000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  let hits = 0;
  const sink = http.createServer((_request, response) => { hits++; response.end('Unapproved shared worker target.'); });
  sink.on('upgrade', (_request, socket) => { hits++; socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); });
  sink.listen(0, '127.0.0.1');
  await once(sink, 'listening');
  t.after(() => new Promise((resolve) => { sink.closeAllConnections(); sink.close(resolve); }));
  const target = `ws://127.0.0.1:${sink.address().port}/shared-worker-socket`;
  const report = await runChecks(checkConfig(fixture.baseUrl, [{
    id: 'unsupported-shared-worker', kind: 'locale',
    startPath: `/shared-worker-locale?target=${encodeURIComponent(target)}`,
    expectedLang: 'en',
  }, {
    id: 'concurrent-ordinary-page', kind: 'locale', startPath: '/locale', expectedLang: 'fr',
  }], { timeoutMs: 8000 }), options);
  const result = expectNotPassed(report, 'unsupported-shared-worker');
  assert.equal(result.status, 'error', JSON.stringify(result));
  assert.equal(result.code, 'WORKER_UNSUPPORTED', JSON.stringify(result));
  assert.equal(hits, 0, 'A shared worker contacted an unapproved WebSocket origin.');
  const ordinary = report.results.find((entry) => entry.id === 'concurrent-ordinary-page');
  assert.equal(ordinary?.status, 'passed', `Shared worker rejection contaminated another context: ${JSON.stringify(report.results)}`);
  assert.equal(report.summary.passed, 1);
  assert.equal(report.summary.error, 1);
});

test('environment and literal form secrets never appear in reports', { timeout: 45000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const key = `NOMVEX_FIXTURE_SECRET_${process.pid}`;
  const secret = 'synthetic-secret-nomvex-do-not-log-29';
  const original = process.env[key];
  process.env[key] = secret;
  t.after(() => { if (original === undefined) delete process.env[key]; else process.env[key] = original; });
  const report = await runChecks(checkConfig(fixture.baseUrl, [
    { id: 'env-secret', kind: 'redirect', startPath: '/protected', steps: [{ action: 'fill', selector: '#email', env: key }, { action: 'click', selector: '#login-button' }], expectedPath: `/wrong?token=${secret}` },
    { id: 'literal-secret', kind: 'redirect', startPath: '/protected', steps: [{ action: 'fill', selector: '#email', value: 'synthetic-literal-private-value-67' }, { action: 'click', selector: '#login-button' }], expectedPath: '/wrong' },
  ], { timeoutMs: 8000 }), options);
  assert.equal(report.summary.passed, 0);
  assert.equal(expectNotPassed(report, 'env-secret').code, 'REDIRECT_MISMATCH');
  assert.equal(expectNotPassed(report, 'literal-secret').code, 'REDIRECT_MISMATCH');
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes(secret), 'Environment secret leaked into report.');
  assert.ok(!serialized.includes('synthetic-literal-private-value-67'), 'Literal form value leaked into report.');
});
