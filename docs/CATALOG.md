# Catalog rules

The catalog is a source-review registry, not a claim that every listed tool is installed, tested, or maintained by NOMVEX. The initial entries use `source-reviewed` with `evidence.test: null`.

## Evidence levels

- `source-reviewed`: primary project sources were reviewed for the recorded function and licensing claims.
- A future executed-test state must include a pinned version or commit, environment, reproducible commands, authorized/public data, expected and observed results, a dated report, and explicit limitations.
- `used-in-nomvex` must never be asserted without evidence from the specific NOMVEX environment and journey.

Unknown values remain `null`. They never imply free, safe, compatible, offline, or unrestricted. Platform fields record upstream statements unless separate execution evidence exists.

## Entry fields

`catalog/tools.json` records a stable ID, upstream name/category/source, descriptions, licensing notes, known cost/service information, runtime expectations, evidence sources, candidate NOMVEX uses, and review date.

Code, model, data, binary, and hosted-service licenses may differ. A source-available license must not be described as OSI open source.

## Adding an entry

Use a primary project source, verify the canonical project/link and licensing statement, write an original description, record unresolved questions explicitly, then run:

```sh
npm run catalog:check
```

That command validates local schema and evidence declarations. It does not perform a network audit, legal opinion, vulnerability assessment, or execution test of every listed tool.


## Generated open-source registry

The generated registry is intentionally stricter than a generic awesome list. It discovers GitHub repositories from the configured source feeds and core seeds, then admits only public, non-archived, non-fork repositories whose GitHub metadata exposes an allowlisted open-source SPDX identifier.

An `indexed` entry means **discovered and license-metadata checked**. It does not mean installed, executed, secure, production-ready, compatible with NOMVEX, or cleared for every dependency/model/data license. Those claims require separate evidence.

Missing or ambiguous license metadata, custom/source-available licenses, archived repositories, forks, and metadata failures go to `open-source-quarantine.json`. The sync never executes or vendors upstream project code.

The scheduled sync opens a data-only pull request. It never auto-merges an upstream tool into production.
