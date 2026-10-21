# Web Checks configuration

Configuration is strict declarative JSON, schema version 1. Unknown fields, duplicate IDs, invalid bounds, and incompatible assertions are rejected with `INVALID_CONFIG` and exit code 2. Configuration does not execute arbitrary JavaScript, shell commands, or modules.

## Getting started

```sh
npm ci
npx playwright install chromium
npm run build
npm run demo
```

The healthy demo starts a loopback-only fixture, runs six checks, writes reports, and shuts the fixture down. `npm run demo:broken` deliberately detects prepared faults and exits 1. That expected exit code is evidence that the checker detects the fixture defects, not an installation failure.

To keep the fixture open:

```sh
npm run fixture
npm run check -- --config examples/config.json --out reports/manual-01 --lang en
```

Existing report files are never overwritten. Choose a new output directory or omit `--out` for an automatically unique directory.

## Minimal configuration

```json
{
  "version": 1,
  "baseUrl": "https://staging.example.test",
  "timeoutMs": 15000,
  "concurrency": 2,
  "language": "en",
  "checks": [
    {
      "id": "login-return",
      "kind": "redirect",
      "startPath": "/login?returnTo=%2Fmembers",
      "steps": [
        { "action": "fill", "selector": "#email", "env": "NOMVEX_TEST_EMAIL" },
        { "action": "fill", "selector": "#password", "env": "NOMVEX_TEST_PASSWORD" },
        { "action": "click", "selector": "button[type=submit]" }
      ],
      "expectedPath": "/members"
    }
  ]
}
```

Paths and selectors are examples, not verified NOMVEX routes. Use dedicated test accounts and selectors observed in an authorized staging environment.

## Common fields

| Field | Meaning |
| --- | --- |
| `version` | Must be `1` |
| `baseUrl` | HTTP(S) origin only; no path, credentials, query, or fragment |
| `allowedOrigins` | Up to 20 exact extra HTTP(S) origins; no wildcards |
| `timeoutMs` | 500–60000 ms per check; default 15000. Browser startup has a separate 30000 ms budget |
| `concurrency` | 1–4 isolated sessions; default 2 |
| `language` | `en` or `fr` report/browser locale setting. This is product output, not repository documentation language |
| `checks` | 1–50 checks |
| `id` | Unique 1–80 character ASCII identifier; do not include secrets |
| `startPath` | Root-relative path or approved absolute HTTP(S) URL |
| `steps` | 0–20 declarative interactions |
| `enabled` | `false` marks the run incomplete; skipped is never success |

Every check receives a fresh browser context. Repeat authentication steps inside each check that needs an authenticated state.

## Actions

Supported actions are `click`, `fill`, and `select`. A fill action accepts exactly one literal `value` or environment-variable reference `env`. Missing/empty environment variables return `MISSING_ENV`. No `.env` file is loaded automatically.

## Redirect checks

A redirect check requires `expectedPath`. The final URL must exactly match the resolved expected URL, including query and fragment. HTTP error pages are not success.

## Language persistence checks

Locale checks validate the page's `<html lang>` value and optional text. They can repeat after reload and after a configured follow-up navigation. This verifies only configured assertions; it does not prove translation completeness, translation quality, date formatting, or RTL layout.

## Download checks

Supported formats are PDF, JSON, CSV, and UTF-8 text.

| Format | Validation |
| --- | --- |
| PDF | Header/trailer, pdf-lib parsing, at least one page; no visual rendering or malware analysis |
| JSON | Valid UTF-8/JSON and optional required top-level own keys |
| CSV | Valid UTF-8, consistent CSV parsing, optional exact ordered headers |
| Text | Valid nonempty UTF-8 and optional exact substring |

The accepted size ceiling is 10 MiB. File parsing runs in a separate worker with a bounded deadline and JavaScript heap limits. These controls are not a complete operating-system sandbox; use an isolated machine for hostile targets/files.

## Result states and CLI codes

- `passed`: configured assertions succeeded.
- `failed`: observed behavior differs from an assertion.
- `error`: configuration, network, browser, timeout, or other execution problem prevented a conclusion.
- `skipped`: explicitly disabled; never treated as success.

Exit codes are 0 for all passed, 1 for behavioral failure only, and 2 for error/incomplete runs. Errors/skips take precedence in mixed runs.

Reports intentionally exclude form secrets and downloaded content. Review target origins and check IDs before sharing reports.

## Library use

```js
import { runChecks, validateConfig, exitCode } from './dist/index.js';

const report = await runChecks(validateConfig(configuration));
process.exitCode = exitCode(report);
```

The package is available as repository/release artifacts unless a registry publication is explicitly documented. See [ACCEPTANCE.md](ACCEPTANCE.md) for environments that actually ran.

## Current limits

Chromium is the implemented browser. WebSocket, dedicated/shared/service-worker journeys, new-window workflows, MFA, and CAPTCHA require specialized support and are not silently counted as success. Exact-origin filtering is a test guard, not a system network sandbox.
