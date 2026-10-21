# Règles du catalogue / Catalog rules

## Français

Le catalogue est un registre de sources et de décisions d’évaluation. Il complète le code exécutable de Web Checks. Une fiche ne déclenche pas une installation et ne promet pas la maintenance de l’outil externe.

La version initiale comporte **24 fiches**, toutes `source-reviewed`, avec `evidence.test: null`. Les pages originales citées ont été consultées le **21 octobre 2026** pour la fonction et la licence déclarées. Les pages sont des sources vivantes : la fiche ne prétend pas épingler une version de chaque projet. Avant intégration, épinglez la version concernée et relisez sa licence.

### Structure

`catalog/tools.json` contient `schemaVersion`, `reviewedAt` et `tools`. Chaque fiche contient :

| Champ | Sens |
| --- | --- |
| `id`, `name`, `category`, `source` | Identifiant stable, nom amont, catégorie et source canonique |
| `description.fr`, `description.en` | Description originale courte dans les deux langues |
| `license.code`, `license.models`, `license.notes` | Licence du code déclarée, information sur les modèles et limites de la revue |
| `cost.software`, `cost.services` | Conditions connues du code et information sur les services externes |
| `runtime.platforms`, `runtime.hardware`, `runtime.network` | Exigences ou possibilités explicitement relevées, sans promesse de performance |
| `status`, `reviewedAt` | Niveau de preuve et date de consultation |
| `evidence.sourceUrls`, `evidence.test` | Sources primaires et, lorsqu’elle existe, preuve d’exécution |
| `nomvexUses`, `notes.fr`, `notes.en` | Usages envisagés et limites pratiques |

**`null` signifie que la fiche ne dispose pas d’une conclusion vérifiée pour ce champ.** Il ne signifie ni « gratuit », ni « compatible », ni « sans modèle », ni « aucune connexion réseau ». Les plateformes renseignées sont celles annoncées par la source ; elles n’ont pas été testées par cette seule revue. Les coûts d’infrastructure et le temps de maintenance ne sont pas calculés ici.

`license.code` peut contenir un identifiant SPDX ou le nom exact d’une licence non standard. Cela ne transforme pas une licence source-available en licence open source. `nomvexUses` désigne des usages possibles, pas des intégrations déployées.

### Passage à une preuve plus forte

La première version du registre conserve uniquement `source-reviewed`. Avant d’ajouter un futur statut de test, faire évoluer explicitement son schéma et son validateur, puis conserver :

1. Version ou commit de l’outil et de l’adaptateur.
2. Système, environnement, paramètres et jeu de données public ou autorisé.
3. Commandes reproductibles, résultat attendu et résultat observé.
4. Rapport daté et limites des vérifications.

Une exécution de Web Checks ne doit pas qualifier globalement Playwright, pdf-lib ou d’autres bibliothèques pour tous leurs usages. Un éventuel statut « utilisé dans NOMVEX » exige en plus une preuve propre à l’environnement et au parcours concernés.

### Ajouter une fiche

Utilisez une source du projet lui-même, vérifiez le nom et le lien canonique, rédigez vos propres descriptions, puis ajoutez uniquement les informations établies. Conservez les exceptions de licence dans `notes`. Exécutez `npm run catalog:check`. Cette commande vérifie la structure locale ; elle ne constitue pas un audit de licence, un contrôle réseau de tous les liens ou un test des outils listés.

## English

This is a source-review registry, not a claim that every listed tool is installed or maintained here. The initial 24 entries are all `source-reviewed` with `evidence.test: null`. The stated review date concerns the upstream sources, not a run of those tools.

Unknown fields remain `null`; this never means free, safe, compatible, or offline. Listed platforms are upstream statements, not local test results. Candidate NOMVEX uses are design suggestions, not deployed integrations. Code, model, data, dependency, and binary licenses may differ.

To add tested states later, extend the schema and validator explicitly and attach pinned versions, environment, reproducible commands, data provenance, a dated report, and clear limits. A test of one integration does not certify the entire dependency. `npm run catalog:check` checks local data structure; it does not perform a network, license, or security audit.
