# Release procedure / Procédure de livraison

## Build and verify the exact source

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run typecheck
npm run catalog:check
npm test
npm run demo
npm run demo:broken
npm pack
```

The broken demo must exit **1** and show the intended behavioral failures. A general browser/environment error with exit **2** does not satisfy that acceptance condition.

Record the tested Node and Chromium versions, named test counts, skipped tests, command exit codes and any environment-specific changes. Keep the evidence in `docs/evidence/`. The GitHub-hosted workflow must be checked separately; a committed workflow file is not proof it has run.

`npm pack` builds and produces `nomvex-web-checks-0.1.0.tgz`, including compiled JavaScript, type declarations, the parser worker, source, examples, catalog and documentation. It does not publish to the npm registry. A recipient can install the tarball in a Node project with `npm install ./nomvex-web-checks-0.1.0.tgz`; install its matching Playwright Chromium before running checks. For reproducible source development and `npm ci`, clone or download the complete Git repository, which contains `package-lock.json`.

## Public release contents

- Original code and synthetic fixtures only.
- Apache-2.0 text and project attribution, without replacing dependency licenses.
- French default README, English README, configuration reference and actual verification evidence.
- HTML/JSON examples generated from the synthetic local demo. They do not demonstrate live platform integration.
- Source archive automatically associated with the GitHub release tag. An optional compiled npm tarball is a separate convenience artifact.

Before publishing, review the staged file list. Exclude environment files, downloaded test documents, private application code, browser profiles, tokens, node_modules and arbitrary local run reports. The committed `docs/examples` reports contain only synthetic data.

## CI isolation

Use GitHub-hosted runners for public pull requests with `contents: read`, pinned action commits and `persist-credentials: false`. This repository must not send public pull request jobs to an OVH or other production self-hosted runner. There are no deployment or production secrets in the supplied workflow.

Dependabot suggests dependency and GitHub Action updates. Accept an update only after inspecting it and passing the checks. A clean dependency advisory scan is time-specific evidence, not a guarantee of the absence of vulnerabilities.

## Honest release wording

State which checks and environments actually passed. Separate source review of the 24 catalog entries from installation, benchmarking, production adoption or integration. Do not promise stars, a future contributor count or support for an operating system that has not been tested.

## Future NOMVEX integration

For each branch, observe its actual staging UI, configure real paths/selectors, use a dedicated test account and exercise one deliberate failure. Keep the configuration free of secrets. Only then label that branch integration as verified. Web Worker, Shared Worker, new-window, CAPTCHA and MFA workflows need additional implementation before claiming support.
