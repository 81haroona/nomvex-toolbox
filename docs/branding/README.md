# NOMVEX identity / Identité NOMVEX

The mark in [nomvex-mark.svg](nomvex-mark.svg) comes from the existing NOMVEX platform identity component. It preserves that component's geometry and gradient, with the existing light-header palette resolved into standalone SVG attributes. It is not a newly generated logo.

Provenance reviewed on 2026-10-21: existing `NomvexLogo.tsx` component, Git blob `f5930d93aa1b650bdae81d42d3db840a0a21106d`. The original application implementation is not bundled with this toolkit.

The French and English READMEs use the same asset. HTML reports embed its exact bytes as a static data URI from `src/branding.ts`; they need no network connection or adjacent image file. The existing HTML escaping and restrictive content policy remain in place. A regression assertion checks that the embedded bytes match this SVG.

Le symbole provient de l’identité existante de la plateforme NOMVEX. Sa géométrie, son dégradé et la palette de l’en-tête clair sont conservés. Les rapports incluent l’image directement pour fonctionner hors ligne. Le nom et le symbole identifient le projet ; la licence logicielle Apache-2.0 ne confère pas de droits sur les marques, conformément à sa section 6.

The NOMVEX name and mark identify this project. The software's Apache-2.0 license does not grant trademark rights; see section 6 of [LICENSE](../../LICENSE).
