# Implementation scope — 2026-10-21

The approved delivery is NOMVEX Toolbox: the original Web Checks CLI/library, reproducible healthy and deliberately broken browser fixtures, an evidence-based tools catalog, English public repository documentation, localized report output, contribution/license/security policies, and isolated CI.

The owner-requested NOMVEX platform mark is used in the public README and embedded offline HTML reports.

Acceptance requires clean installation/build, working redirect/locale/download checks, intended fixture defects detected for the correct reasons, explicit failure states for invalid configuration/unavailable targets/blocked origins/missing environment values/skips/timeouts, bounded file validation, no production credentials or paid API keys for the demo, no telemetry, reproducible evidence, and explicit platform limits.

Catalog metadata distinguishes source review from runnable verification and actual NOMVEX integration. Runtime input is declarative JSON, not arbitrary JavaScript or shell. Public PR checks use GitHub-hosted runners rather than production infrastructure.

External adoption, star growth, and live NOMVEX branch journeys are never inferred from repository tests.
