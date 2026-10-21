# Security

Use **Security → Report a vulnerability** if the published repository actually offers it. Otherwise request a private channel from a maintainer without disclosing exploitable details, secrets, or personal data in a public issue. No unverified security email or guaranteed response deadline is advertised.

Privately include version/commit, environment, impact, prerequisites, and a minimal reproduction. Browser steps can change application state; use authorized targets and test data. An origin allowlist is not a system or network sandbox. Keep credentials out of committed configs and shared reports; use environment references and review output before sharing.

External PRs require disposable test environments without production secrets or production-network access. Do not run them on the NOMVEX VPS or an owner production runner. Review dependency updates and verification evidence. A passing run is not a security certification.
