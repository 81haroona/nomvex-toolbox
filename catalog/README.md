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

## Evidence states

| State | Meaning |
| --- | --- |
| `indexed` | Public repository with recognized open-source SPDX metadata; reference only |
| `source-reviewed` | NOMVEX manually reviewed primary sources for the recorded claims |
| tested/integrated | Not granted by the bulk index; requires separate reproducible evidence |

## License rule

The bulk index fails closed. Missing or `NOASSERTION` license metadata is quarantined. Custom/source-available licenses are not silently treated as open source. Dependencies, model weights, datasets, hosted services, and trademarks can have terms different from the repository code license.
