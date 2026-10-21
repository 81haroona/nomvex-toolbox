# NOMVEX identity

The mark in [nomvex-mark.svg](nomvex-mark.svg) comes from the existing NOMVEX platform identity component. It preserves the component geometry, gradient, and light-header palette; it is not a newly generated logo.

Provenance reviewed on 2026-10-21: existing `NomvexLogo.tsx` component, Git blob `f5930d93aa1b650bdae81d42d3db840a0a21106d`. The original application implementation is not bundled with this toolkit.

The public repository README uses the same asset. HTML reports embed the exact SVG bytes through `src/branding.ts`, so report branding works offline without an adjacent image file or external image service. Regression tests verify byte equality and the report content policy.

The NOMVEX name and mark identify this project. Apache-2.0 covers the software; it does not grant trademark rights (see section 6 of [LICENSE](../../LICENSE)).
