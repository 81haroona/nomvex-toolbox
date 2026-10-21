# NOMVEX Toolbox — Web Checks

[Français](README.md) · [Configuration](docs/CONFIGURATION.md) · [Catalog](catalog/README.md) · [Contributing](CONTRIBUTING.md)

**Check redirects, language persistence, and downloads, then receive a readable report and a CI-friendly result.**

Web Checks is the first original NOMVEX Toolbox utility. It uses declarative JSON configuration and Playwright to run explicit journeys. Its demo runs a small local site with correct behavior and deliberately introduced faults. No NOMVEX account or paid API key is required for that demo.

![Actual local demo report with six passing checks](docs/examples/report-preview.png)

[French HTML report](docs/examples/healthy-report.fr.html) · [English HTML report](docs/examples/healthy-report.en.html) · [Verification evidence](docs/ACCEPTANCE.md)

## Start from this local project

Open a terminal in the directory containing `package.json`. Use a Node version compatible with that file's `engines` field.

```bash
npm ci
npx playwright install chromium
npm run build
npm test
npm run demo
```

Installing packages and the browser requires network access. Chromium may also require system libraries on your machine; consult Playwright's installation instructions if launch fails. The local test requires no AI model service.

To observe the faults prepared in the demo site:

```bash
npm run demo:broken
```

That scenario should show failed checks and return exit code **1**. Expected failures in the demo do not indicate a fault in your actual sites. The demo command starts and stops the local fixture and prints the report path in the terminal.

Validate the catalog structure with:

```bash
npm run catalog -- --query pdf --lang en
npm run catalog:check
```

These commands run the local code. They do not assume that a package has been published to npm.

## Check your test environment

Adapt [examples/config.json](examples/config.json) to a target you are authorized to test. Selectors and expected behavior are application-specific; they are not discovered automatically.

```bash
npm run check -- --config examples/config.json --out reports --lang en
```

The output directory contains `report.json` and `report.html`. Open the HTML file in your browser. Reports default to French; `--lang en` selects English. Existing reports are not overwritten: choose a new `--out` directory for each run, or omit that option to create a dated subdirectory automatically.

| Check | Assertion | Important limit |
| --- | --- | --- |
| `redirect` | Path reached after configured actions | Checking a path does not validate a complete authentication policy |
| `locale` | Declared language and optionally text after a reload or navigation | It does not check every translation or translation quality |
| `download` | Receipt and selected properties of PDF, JSON, CSV, or text files | Structural validation does not prove business correctness or visual fidelity |

JSON steps can click, fill, and select fields, so they can affect the target application. Use test accounts and data. Reference environment variables for secrets as described in [the configuration guide](docs/CONFIGURATION.md).

### Interpret the outcome

| Status | Meaning |
| --- | --- |
| `passed` | Configured assertions succeeded in this run |
| `failed` | Observed behavior differed from an assertion |
| `error` | A configuration, execution, or dependency error prevented a check |
| `skipped` | A check was not executed; it is not a success |

Exit codes: **0** when every check passes; **1** for behavioral failures; **2** for an error or incomplete run, including a skipped check. Mixed failures and errors return **2**.

## Catalog and evidence

The [24 catalog entries](catalog/README.md) are based on primary-source reviews. Every initial entry is `source-reviewed` with `evidence.test: null`; inclusion does not mean that every tool has been installed, tested, or integrated into NOMVEX.

`package.json` and `package-lock.json` identify Web Checks' actual dependencies. A successful Web Checks run does not qualify every possible use of those dependencies.

- The local fixture demonstrates the checker against its configured scenarios.
- Actual NOMVEX sites require their own configuration and execution evidence.
- An upstream project's platform support is not proof that this project was tested on that platform. Windows and macOS remain unverified without version-specific reports.
- Reports may contain URLs or test context. Review them before sharing.
- No star count, adoption level, or defect-free operation is promised.

## Contribute and reuse

Reproducible fixes, accessibility improvements, and useful translations are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [code of conduct](CODE_OF_CONDUCT.md).

Original code is provided under [Apache-2.0](LICENSE), with attribution in [NOTICE](NOTICE). Dependencies and linked tools retain their own licenses. See the [catalog rules](docs/CATALOG.md) and [license notes](docs/LICENSES.md).

If the tool helps you, a star is appreciated. Use and features do not require a star, subscription, or NOMVEX account.
