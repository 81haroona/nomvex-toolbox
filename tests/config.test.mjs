import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, resolveTargetUrl, safeUrl, ConfigError } from '../dist/config.js';

const valid = () => ({ version: 1, baseUrl: 'https://example.test', checks: [{ id: 'login', kind: 'redirect', startPath: '/login', expectedPath: '/members' }] });

test('defaults are bounded and base origins normalized', () => {
  const input = valid(); input.baseUrl += '/';
  const config = validateConfig(input);
  assert.equal(config.baseUrl, 'https://example.test');
  assert.equal(config.concurrency, 2);
  assert.equal(config.timeoutMs, 15000);
  assert.equal(config.language, 'fr');
  assert.equal(input.baseUrl, 'https://example.test/');
});

test('URL resolver preserves query/fragment and allows explicitly approved origin', () => {
  const config = { ...valid(), allowedOrigins: ['https://id.example.test'] };
  assert.equal(resolveTargetUrl('/members?tab=exports#download', config), 'https://example.test/members?tab=exports#download');
  assert.equal(resolveTargetUrl('https://id.example.test/login', config), 'https://id.example.test/login');
});

test('dangerous, ambiguous and unapproved target URLs are rejected', () => {
  for (const input of ['//elsewhere.test/x', '/\\elsewhere.test/x', 'javascript:alert(1)', 'file:///etc/passwd', 'http://example.test/', 'https://example.test.evil/', 'https://user:secret@example.test/', '/ok\r\nheader', 'relative']) {
    assert.throws(() => resolveTargetUrl(input, valid()), ConfigError, input);
  }
});

test('secrets in base URL and extra origin paths are rejected', () => {
  for (const baseUrl of ['https://a:b@example.test', 'https://example.test/path', 'https://example.test?token=secret', 'file:///tmp']) {
    assert.throws(() => validateConfig({ ...valid(), baseUrl }), ConfigError);
  }
  assert.throws(() => validateConfig({ ...valid(), allowedOrigins: ['https://elsewhere.test/path'] }), ConfigError);
});

test('unknown fields, duplicate IDs and invalid bounds cannot silently pass', () => {
  const base = valid();
  for (const patch of [{ timoutMs: 1500 }, { timeoutMs: 0 }, { concurrency: 8 }, { checks: [] }, { checks: [base.checks[0], base.checks[0]] }, { checks: Array.from({ length: 51 }, (_, i) => ({ ...base.checks[0], id: `c${i}` })) }]) {
    assert.throws(() => validateConfig({ ...base, ...patch }), ConfigError);
  }
});

test('fill takes exactly one literal or environment variable', () => {
  const config = valid();
  for (const extra of [{}, { value: 'secret', env: 'TOKEN' }, { env: 'bad-name' }]) {
    config.checks[0].steps = [{ action: 'fill', selector: '#password', ...extra }];
    assert.throws(() => validateConfig(config), ConfigError);
  }
  config.checks[0].steps = [{ action: 'fill', selector: '#password', env: 'NOMVEX_TEST_PASSWORD' }];
  assert.equal(validateConfig(config).checks[0].steps[0].env, 'NOMVEX_TEST_PASSWORD');
});

test('format-specific assertions reject unsupported PDF text extraction', () => {
  const config = valid();
  for (const extra of [{ format: 'pdf', expectedText: 'Hello' }, { format: 'text', requiredKeys: ['x'] }, { format: 'json', csvHeaders: ['x'] }, { format: 'csv', minBytes: 10 * 1024 * 1024 + 1 }]) {
    config.checks = [{ id: 'file', kind: 'download', startPath: '/', trigger: '#download', ...extra }];
    assert.throws(() => validateConfig(config), ConfigError);
  }
});

test('validation diagnostics and report URL redaction exclude supplied secrets', () => {
  assert.equal(safeUrl('https://user:password@example.test/private-secret?token=secret#value'), 'https://example.test');
  assert.equal(safeUrl('file:///private-secret'), '[redacted]');
  try { validateConfig({ ...valid(), timeoutMs: 'synthetic-secret' }); assert.fail('Should reject'); }
  catch (error) { assert.ok(!JSON.stringify(error).includes('synthetic-secret')); }
});
