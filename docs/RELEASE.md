# Release procedure

## Build and verify the exact source

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run typecheck
npm run catalog:check
npm test
npm run demo
npm run verify:broken-demo
npm pack
```

`verify:broken-demo` succeeds only when the deliberately broken demo itself exits **1** for the intended behavioral failures. Browser/environment failure is not accepted as evidence that defect detection works.

Record the exact Node/browser versions, named test counts, skipped tests, exit codes, and environment-specific limitations. GitHub-hosted CI must be checked separately; committing a workflow file is not evidence that it ran.

`npm pack` for version 0.1.2 produces `nomvex-web-checks-0.1.2.tgz`. It does not publish to the npm registry.

## Public release contents

- Original code and synthetic fixtures.
- Apache-2.0 project license and attribution without replacing dependency licenses.
- English public repository documentation.
- English and French report-output examples only where they demonstrate the tool's localization capability.
- Verification evidence that distinguishes source review, local tests, hosted CI, and live integration.

Before release, exclude environment files, private application code, browser profiles, tokens, production reports, customer data, and downloaded test documents.

## CI isolation

Public pull requests use GitHub-hosted runners with read-only repository permissions, pinned action commits, and `persist-credentials: false`. Public PR code must not run on an OVH/production self-hosted runner or with production secrets/network access.

## Honest release wording

State exactly which environments and checks passed. Do not infer Windows/macOS support from Linux, do not describe source-reviewed catalog entries as installed tools, and do not promise star growth or adoption.

## Future NOMVEX integration

For each authorized NOMVEX branch, observe the actual staging UI, use a dedicated test account, configure real paths/selectors, execute a healthy journey and at least one deliberate negative case, and retain the evidence. Only then label that branch integration verified.
