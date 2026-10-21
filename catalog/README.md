# Catalogue des outils / Tools catalog

[Français](../README.md) · [English](../README.en.md) · [Règles / Rules](../docs/CATALOG.md)

**24 sources consultées le 21 octobre 2026.** Toutes les fiches initiales sont `source-reviewed` avec `evidence.test: null`. Ce tableau ne revendique aucune installation, intégration ou utilisation réelle dans NOMVEX.

**24 sources reviewed on 21 October 2026.** Every initial entry is `source-reviewed` with `evidence.test: null`. This table does not claim installation, integration, or actual NOMVEX use.

Les licences résument le code indiqué par la source amont. Les modèles, données, dépendances et options de compilation peuvent avoir des conditions distinctes. Les champs inconnus restent `null` dans [tools.json](tools.json). / License labels summarize upstream code terms; models, data, dependencies, and build options may differ. Unknown fields stay `null`.

| Outil / Tool | Fonction (FR) | Purpose (EN) | Licence du code / Code license | État / Status |
| --- | --- | --- | --- | --- |
| [Playwright](https://github.com/microsoft/playwright) | Automatisation et tests de navigateur avec une API commune. | Browser automation and testing through a common API. | Apache-2.0 | source-reviewed |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | Création et modification de documents PDF en JavaScript. | Create and modify PDF documents in JavaScript. | MIT | source-reviewed |
| [csv-parse](https://github.com/adaltas/node-csv) | Analyse de fichiers CSV dans le projet Node CSV. | CSV parsing from the Node CSV project. | MIT | source-reviewed |
| [Zod](https://github.com/colinhacks/zod) | Validation de schémas avec inférence de types TypeScript. | Schema validation with TypeScript type inference. | MIT | source-reviewed |
| [TypeScript](https://github.com/microsoft/TypeScript) | Vérification statique des types et compilation vers JavaScript. | Static type checking and compilation to JavaScript. | Apache-2.0 | source-reviewed |
| [Vitest](https://github.com/vitest-dev/vitest) | Cadre de tests pour des projets JavaScript et TypeScript. | Test framework for JavaScript and TypeScript projects. | MIT | source-reviewed |
| [ESLint](https://github.com/eslint/eslint) | Analyse statique du code JavaScript et règles configurables. | Static JavaScript analysis with configurable rules. | MIT | source-reviewed |
| [Prettier](https://github.com/prettier/prettier) | Mise en forme automatique du code et de fichiers pris en charge. | Automatic formatting for code and supported file types. | MIT | source-reviewed |
| [axe-core](https://github.com/dequelabs/axe-core) | Moteur de contrôles automatisés d’accessibilité web. | Automated web accessibility checking engine. | MPL-2.0 | source-reviewed |
| [Lighthouse](https://github.com/GoogleChrome/lighthouse) | Audits automatisés de qualité de pages web. | Automated quality audits for web pages. | Apache-2.0 | source-reviewed |
| [Fastify](https://github.com/fastify/fastify) | Cadre web pour des services Node.js. | Web framework for Node.js services. | MIT | source-reviewed |
| [Ajv](https://github.com/ajv-validator/ajv) | Validation de données suivant JSON Schema et JSON Type Definition. | Data validation using JSON Schema and JSON Type Definition. | MIT | source-reviewed |
| [Pino](https://github.com/pinojs/pino) | Journalisation structurée pour des applications Node.js. | Structured logging for Node.js applications. | MIT | source-reviewed |
| [OpenTelemetry JavaScript](https://github.com/open-telemetry/opentelemetry-js) | API et SDK de télémétrie pour JavaScript. | Telemetry APIs and SDKs for JavaScript. | Apache-2.0 | source-reviewed |
| [prom-client](https://github.com/prometheus/client_js) | Client JavaScript pour exposer des métriques au format Prometheus. | JavaScript client for exposing Prometheus metrics. | Apache-2.0 | source-reviewed |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Accès à SQLite depuis Node.js. | SQLite access from Node.js. | MIT | source-reviewed |
| [sharp](https://github.com/lovell/sharp) | Redimensionnement et traitement d’images pour Node.js. | Image resizing and processing for Node.js. | Apache-2.0 | source-reviewed |
| [markdown-it](https://github.com/markdown-it/markdown-it) | Analyse et rendu de Markdown en JavaScript. | Markdown parsing and rendering in JavaScript. | MIT | source-reviewed |
| [pypdf](https://github.com/py-pdf/pypdf) | Lecture, extraction et transformation de documents PDF en Python. | Read, extract, and transform PDF documents in Python. | BSD-3-Clause | source-reviewed |
| [Docling](https://github.com/docling-project/docling) | Extraction de documents, tableaux et mise en forme vers des représentations structurées. | Extract documents, tables, and layout into structured representations. | MIT | source-reviewed |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Transcription audio avec Whisper et CTranslate2. | Audio transcription using Whisper and CTranslate2. | MIT | source-reviewed |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Implémentation de l’inférence Whisper en C et C++. | Whisper inference implementation in C and C++. | MIT | source-reviewed |
| [FFmpeg](https://ffmpeg.org) | Traitement, conversion et extraction de flux audio et vidéo. | Process, convert, and extract audio and video streams. | LGPL-2.1-or-later | source-reviewed |
| [n8n](https://github.com/n8n-io/n8n) | Orchestration de workflows avec code source disponible et restrictions d’usage. | Workflow orchestration with source available and usage restrictions. | Sustainable Use License | source-reviewed |

## Utiliser le registre / Use the registry

`npm run catalog:check` vérifie la structure des fiches locales. Cette commande ne teste pas les outils externes et ne remplace pas une revue de licence. Les champs `nomvexUses` sont des usages envisagés.

`npm run catalog:check` validates local entry structure. It does not execute the external tools or replace license review. `nomvexUses` records candidate use cases.

## Précautions de lecture / Reading notes

- **n8n** est source-available avec restrictions d’usage ; il ne fait pas partie des licences open source OSI. / n8n is source-available with use restrictions, not OSI open source.
- **FFmpeg** : la licence effective dépend des composants de la compilation. / The effective license depends on build components.
- **Docling, faster-whisper, whisper.cpp** : aucun modèle particulier n’est approuvé par cette fiche. / No particular model is approved by these entries.
- **sharp** : lire aussi les licences des composants natifs. / Review native component licenses too.
- **axe-core** : les contrôles automatisés ne constituent pas une évaluation exhaustive d’accessibilité. / Automated checks are not a complete accessibility assessment.

Pour proposer une fiche, consultez [CONTRIBUTING.md](../CONTRIBUTING.md). / To propose an entry, read [CONTRIBUTING.md](../CONTRIBUTING.md).
