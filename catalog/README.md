# NOMVEX open-source registry

NOMVEX Toolbox separates **manual source review** from **machine indexing**.

- `tools.json`: manually source-reviewed tools.
- `open-source-index.json`: public GitHub repositories admitted by the automated open-source policy.
- `open-source-quarantine.json`: candidates that were not admitted because their license metadata was missing/ambiguous, they were archived/forks, or metadata could not be fetched.
- `sources.json`: curated upstream lists used only for discovering repository URLs.
- `seeds.json`: important upstream repositories that NOMVEX wants to track even if a source list later removes them.

The sync does **not** clone or execute discovered projects. It does not copy upstream source code into NOMVEX. GitHub metadata is evidence for indexing, not proof that a tool is safe, compatible, production-ready, or already integrated.

## Refresh

```bash
npm run catalog:sync
npm run catalog:check
npm run catalog -- --query agent
```

An authenticated `GITHUB_TOKEN` is strongly recommended for large refreshes because GitHub API rate limits apply.

A production refresh scans **all** unique candidate links discovered in the curated feeds plus the core seeds. The `NOMVEX_CATALOG_MAX_REPOS` setting limits candidates only when explicitly provided for debugging; it is not set by the main sync workflow. `NOMVEX_CATALOG_USE_SNAPSHOT=1` is a diagnostic mode and does not replace the production feed crawl.

The data-only sync PR includes `candidates.json`, `open-source-index.json`, and `open-source-quarantine.json`. Every candidate is counted in exactly one output. If multiple source links redirect to the same canonical repository, one reference is retained, its feed provenance is merged, and the extra alias is counted in quarantine as `canonical-alias-merged`. An alias quarantine is not a finding that the canonical project has a bad license.

Only GitHub GraphQL metadata with `visibility: PUBLIC`, `isArchived: false`, `isFork: false`, and an explicitly allowlisted open-source SPDX identifier is eligible for indexing. The catalog never clones, vendors, installs, or runs discovered upstream repositories. Indexing is **not** integration, execution, or a security audit.

## Evidence states

| State | Meaning |
| --- | --- |
| `indexed` | Public repository with recognized open-source SPDX metadata; reference only |
| `source-reviewed` | NOMVEX manually reviewed primary sources for the recorded claims |
| tested/integrated | Not granted by the bulk index; requires separate reproducible evidence |

## License rule

The bulk index fails closed. Missing or `NOASSERTION` license metadata is quarantined. Custom/source-available licenses are not silently treated as open source. Dependencies, model weights, datasets, hosted services, and trademarks can have terms different from the repository code license.
