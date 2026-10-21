# Implementation scope — 2026-10-21

The approved delivery is NOMVEX Toolbox: an original Web Checks CLI/library,
a runnable local fixture demonstrating correct and deliberately broken redirect,
language-persistence and download behavior, an evidence-based tools catalog,
French/English documentation and reports, contribution/license/security policies,
and isolated CI. Public repository publication is an intended delivery step when
the user's GitHub session and repository permissions permit it.

Acceptance: clean installation and build; three working check types; intended
faults detected for the right reasons; invalid configuration, unavailable target,
blocked origin, missing environment variable, skipped and timed-out checks are
never reported as successful; PDF/JSON/CSV/text validation has explicit limits;
no production credentials, paid API keys, or NOMVEX account required for demo;
no telemetry; reproducible evidence, exact versions, and bounded resource use.

Catalog metadata distinguishes source review, runnable verification and actual
integration. No unexecuted tool is labeled tested. Runtime input is declarative
JSON, never arbitrary shell or JavaScript. Public PR checks never use an owner
production runner. Account settings, private repositories, live branch apps and
external communications are outside the mutation scope of this delivery.

External developer adoption, star growth and testing actual NOMVEX account
journeys are not fabricated. Any access-dependent acceptance item remains
explicitly unverified until its own evidence exists.
