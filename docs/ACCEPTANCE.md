# Verification evidence / Preuves de vérification

## Verified local release candidate — 2026-10-21

The frozen v0.1.1 source was copied into a **clean directory without `node_modules`, `dist` or local reports**. Its locked dependencies were installed from a previously populated public npm cache. The commands below then ran against that clean copy. The source hashes in [verification.json](evidence/verification.json) identify the actual tested files; they were compared with the delivery source before recording success.

Environment: **Linux, Node v24.19.0, Playwright 1.64.1, Chrome for Testing 156.0.8078.4**. The Playwright CDN returned an HTML unavailable page in the execution environment, so the exact matching browser archive was obtained from Google's official Chrome for Testing storage endpoint. Its archive MD5 matched the vendor response. This was an environment-specific download substitution, not a change to the browser version or test assertions.

| Acceptance check | Observed result | Evidence |
|---|---|---|
| Clean locked installation | Exit 0, `npm ci --ignore-scripts --offline` with populated cache | [Install log](evidence/clean-install-log.txt) |
| Strict TypeScript checks | Exit 0 | [Typecheck log](evidence/typecheck-log.txt) |
| Build and complete named test suite | **47 passed, 0 failed, 0 skipped, 0 cancelled** | [Full test log](evidence/test-log.txt) |
| Healthy documented demo command | Exit 0, **6/6 checks passed** | [Demo log](evidence/demo-log.txt) |
| Deliberately broken documented demo | Exit **1**, **7 expected behavioral failures**, no runtime errors | [Broken-demo log](evidence/demo-broken-log.txt) |
| Catalog schema and evidence statuses | **24 entries valid** | [Catalog log](evidence/catalog-log.txt) |
| FR desktop, EN mobile and print-media rendering | Six cards, embedded logo loaded offline, no horizontal overflow or HTTP(S) requests | [Layout record](evidence/report-layout.json), [preview](examples/report-preview.png) |

The dependency advisory query `npm audit --audit-level=high --json` returned **zero reported vulnerabilities** on 2026-10-21 for this lockfile. Advisory data changes over time; this is not proof that the software has no security defects.

## What the tests establish

- The healthy login return, language persistence and four export formats actually pass in Chromium.
- Deliberate wrong redirects, lost locale, fake/truncated PDFs, bad JSON/CSV, invalid UTF-8, empty/BOM-only text and oversized files produce the expected diagnostic outcomes.
- Missing environment values, unavailable targets, timeouts and disabled checks cannot be counted as success.
- Unapproved page navigation and HTTP redirect destinations receive **zero requests** in controlled sink tests; an explicitly approved second origin can complete its journey.
- Unsupported dedicated and shared worker workflows return `WORKER_UNSUPPORTED`. A normal concurrent check remains unaffected by the rejected shared worker.
- File parsing has tested deadline, prior abort, in-flight abort and subsequent recovery paths. Symlink rejection was tested on Linux.
- Literal form values and environment secrets are excluded from the generated report in the tested paths.
- The CLI writes reports in paths containing spaces, preserves existing reports/configuration and returns the documented exit codes.
- HTML rendering escapes untrusted strings, uses a restrictive content policy and cannot display a green verdict for an inconsistent/unknown result state.
- The NOMVEX mark embedded in each HTML report matches the standalone brand asset. The configured content policy permits data images without allowing external image services.

Several named tests contain multiple assertions or browser cases. **47 is the named test count**, not a count of real users, tools deployed or supported sites.

## Council review and corrections

Implementation, fixture/behavior testing and documentation/license review were separated into parallel work. A separate read-only review then examined the assembled code. Concrete issues found and corrected included:

1. Chromium's own proxy connectivity probe incorrectly failed healthy checks. Its traffic remains blocked; page-attributable blocked requests determine check errors.
2. JavaScript callers could construct an unknown/inconsistent report and receive a green verdict. Exit status and summary consistency now fail closed.
3. BOM-only text appeared nonempty in bytes but empty after decoding. It now fails with `DOWNLOAD_TOO_SMALL`.
4. A dedicated/shared worker could catch an unsupported WebSocket failure and satisfy a page assertion. Such worker workflows now return an explicit unsupported error, with regressions covering both and context isolation.
5. Heavy parsing could occupy the browser event loop. Parsing now runs in a terminable worker with a deadline and JavaScript heap limits.
6. Browser startup incorrectly shared the per-check timeout. A controlled two-second startup delay reproduced `BROWSER_UNAVAILABLE` with a 1500 ms check budget before the fix and passed after it. Startup now has a separate 30000 ms limit. A slow-page control still returns `CHECK_TIMEOUT` at its original 500 ms budget; the CLI includes a tracked cold-start regression.

The review found no remaining reproducible critical/high-severity issue in its reviewed paths. It is not an external certification, penetration test of a production platform, or proof of an operating-system sandbox.

## GitHub CI

[The supplied workflow](../.github/workflows/ci.yml) targets GitHub-hosted Ubuntu with Node **22 and 24**. It uses read-only repository permissions and immutable Action references. Consult the workflow run associated with the relevant commit in the repository's **Actions** tab; this local evidence file does not manufacture a hosted-CI result.

The [first hosted run](https://github.com/81haroona/nomvex-toolbox/actions/runs/39571416576) passed Node 24 but exposed one healthy CLI-path failure on Node 22. Its log did not contain the JSON diagnostic, so that historical error cannot be attributed conclusively to startup. The follow-up adds report diagnostics to failed CLI assertions and corrects the independently reproduced startup-budget defect above. Release notes link the actual final hosted result.

## Explicit boundaries

- No live NOMVEX production site or private application was tested or modified by this fixture verification.
- Windows and macOS have not been verified for this release. Node 22 must be assessed from its actual CI run, not inferred from the Node 24 local result.
- Chromium only. Dedicated/shared workers, WebSockets, service workers, new-window journeys and interactive MFA/CAPTCHA are outside the implemented workflow support.
- PDF parsing checks structure/pages, not visual rendering, malware, business correctness or text extraction.
- Download cancellation may have bytes in flight above the acceptance limit. Worker heap limits do not cap all native/ArrayBuffer memory. Use an isolated environment for untrusted targets.
- The 24 catalog entries are **source-reviewed**. They are not 24 tools installed in a NOMVEX deployment.
- No npm registry publication, external adoption, star count growth or future maintenance guarantee is implied.

## Reproduce

Follow [CONFIGURATION.md](CONFIGURATION.md) and [RELEASE.md](RELEASE.md). Use a current writable npm cache and install the browser matching the lockfile. `NOMVEX_BROWSER_EXECUTABLE` was used only to select the exact separately downloaded browser in this execution environment. Do not replace a failed test with a skip or treat a browser startup error as a successful negative test.
