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
