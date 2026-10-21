import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHtml, localizeReport, exitCode } from '../dist/report.js';

const report = () => ({ schemaVersion: 1, toolVersion: '0.1.0', language: 'fr', startedAt: '2026-10-21T12:00:00Z', finishedAt: '2026-10-21T12:00:01Z', baseUrl: 'https://example.test', environment: { node: '24', platform: 'linux', browser: 'test' }, summary: { total: 1, passed: 1, failed: 0, error: 0, skipped: 0 }, results: [{ id: 'login', kind: 'redirect', status: 'passed', code: 'CHECK_PASSED', message: 'Passed', durationMs: 100 }] });

test('HTML report escapes content and loads no scripts, fonts or external services', () => {
  const input = report();
  input.results[0].id = '<img src=x onerror=alert(1)>';
  input.results[0].evidence = { '<script>': '<script>alert(2)</script>' };
  const html = renderHtml(input);
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(!/<(?:link|script|iframe)[\s>]/.test(html));
});

test('French and English messages are generated from safe diagnostic codes', () => {
  const input = report(); input.results[0].message = 'raw secret should be ignored';
  const english = localizeReport(input, 'en');
  assert.ok(!JSON.stringify(english).includes('raw secret'));
  assert.ok(renderHtml(english).includes('<html lang="en">'));
  assert.ok(renderHtml(input).includes('<html lang="fr">'));
});

test('failure, runtime errors and skipped checks have distinct nonzero exit codes', () => {
  const input = report(); assert.equal(exitCode(input), 0);
  input.results[0].status = 'failed'; input.summary.passed = 0; input.summary.failed = 1;
  assert.equal(exitCode(input), 1);
  input.results[0].status = 'error'; assert.equal(exitCode(input), 2);
  input.results[0].status = 'skipped'; assert.equal(exitCode(input), 2);
  input.results = []; assert.equal(exitCode(input), 2);
});

test('JavaScript API consumers cannot get green for unknown or inconsistent report states', () => {
  const input = report();
  input.results[0].status = 'unknown';
  assert.equal(exitCode(input), 2);
  assert.ok(!renderHtml(input).includes('Tous les contrôles ont réussi'));
  input.results[0].status = 'passed';
  input.summary.total = 100;
  assert.equal(exitCode(input), 2);
});
