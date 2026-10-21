# Verification evidence

## Published baseline: v0.1.1

The v0.1.1 source was verified from a clean Linux copy on Node v24.19.0 with Playwright 1.64.1 / Chrome for Testing 156.0.8078.4. The stored evidence records **47 passed, 0 failed, 0 skipped**, a healthy demo with **6/6 checks passed**, and a deliberately broken demo with **7 expected behavioral failures**.

GitHub-hosted v0.1.1 CI also passed on Node 22 and Node 24 on Ubuntu. See the repository Actions history and the stored logs in `docs/evidence/`.

## v0.1.2 release-candidate verification

This candidate changes public GitHub documentation to English-first and expands the hosted matrix to Ubuntu, Windows, and macOS on Node 22 and Node 24. **The matrix configuration itself is not proof of support.** The release may claim an operating system only after the corresponding hosted job completes successfully. Platform-specific tests that cannot run on an OS must be reported as skipped, not counted as passed.

The workflow also runs the healthy demo and a cross-platform verifier that requires the deliberately broken demo to exit exactly 1.

## What the tests establish

- Healthy login-return, language-persistence, and four export formats pass in Chromium fixtures.
- Deliberate wrong redirects, lost locale, malformed/truncated files, invalid UTF-8, empty/BOM-only text, and oversized downloads are not green.
- Missing environment values, unavailable targets, timeout, disabled checks, unsupported workers, and unapproved origins cannot be counted as success.
- Report output escapes untrusted strings and embeds the NOMVEX mark without external image requests.
- Download parsing runs in a terminable worker with bounded deadlines and JavaScript heap limits.

These tests do not constitute an external security certification or prove production NOMVEX integration.

## Security and behavior corrections already covered by regressions

1. Browser-owned connectivity probes no longer incorrectly fail healthy checks.
2. Unknown/inconsistent JavaScript report states fail closed.
3. BOM-only text is rejected as empty.
4. Unsupported dedicated/shared worker workflows return an explicit error instead of allowing a misleading success.
5. File parsing runs off the browser event loop with a deadline.
6. Browser startup has a separate budget from per-check execution.

## Explicit boundaries

- No live NOMVEX production site or private application is proven by fixture tests.
- Chromium is the implemented browser.
- WebSocket, service-worker, new-window, MFA, and CAPTCHA journeys remain unsupported unless separately implemented and tested.
- PDF validation checks parseable structure/pages, not visual fidelity, malware, business correctness, or text extraction.
- The 24 catalog entries are source-reviewed candidates, not 24 deployed NOMVEX integrations.
- npm registry publication, external adoption, star growth, and future maintenance are not implied.

## Reproduce

Follow [CONFIGURATION.md](CONFIGURATION.md) and [RELEASE.md](RELEASE.md). Do not replace a failed test with a skip merely to make a release green.
