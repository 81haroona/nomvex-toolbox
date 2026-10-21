# Contributing

Submit a focused change that solves a specific problem: a reproducible defect, a more reliable check, FR/EN documentation, accessibility, or a properly sourced catalog entry.

Include expected and observed behavior, a minimal example without secrets or customer data, and the commands and environment used to verify the change. Run `npm run build`, `npm test`, and `npm run catalog:check` after installing dependencies and Chromium. For behavior changes, run both demo variants and confirm that the prepared faults are detected. Report anything not verified.

Original-code contributions use Apache-2.0. Preserve upstream licenses and attribution for external material. Read the [DCO 1.1](https://developercertificate.org/) and use `git commit -s` only if you can make its certification. **The DCO is a right-to-contribute statement, not a copyright assignment.** Commit identity is public. Maintainers retain merge and release decisions; contributing does not grant administrative access.

Catalog claims must follow [the catalog rules](docs/CATALOG.md). Source review is not an executed test. Unknown values stay `null`. Follow [SECURITY.md](SECURITY.md) for vulnerability reports and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) in discussions. Stars and subscriptions are not contribution or support requirements.
