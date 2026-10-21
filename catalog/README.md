# Tools catalog

**24 upstream projects were source-reviewed on 2026-10-21.** Every initial entry is `source-reviewed` with no executed-test claim unless `evidence.test` says otherwise.

[Catalog rules](../docs/CATALOG.md) · [Main README](../README.md)

| Tool | Category | What it does | Code license/status | Evidence state |
| --- | --- | --- | --- | --- |
| [Playwright](https://github.com/microsoft/playwright) | quality | Browser automation and testing through a common API. | Apache-2.0 | source-reviewed |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | documents | Create and modify PDF documents in JavaScript. | MIT | source-reviewed |
| [csv-parse](https://github.com/adaltas/node-csv) | data | CSV parsing from the Node CSV project. | MIT | source-reviewed |
| [Zod](https://github.com/colinhacks/zod) | validation | Schema validation with TypeScript type inference. | MIT | source-reviewed |
| [TypeScript](https://github.com/microsoft/TypeScript) | development | Static type checking and compilation to JavaScript. | Apache-2.0 | source-reviewed |
| [Vitest](https://github.com/vitest-dev/vitest) | quality | Test framework for JavaScript and TypeScript projects. | MIT | source-reviewed |
| [ESLint](https://github.com/eslint/eslint) | development | Static JavaScript analysis with configurable rules. | MIT | source-reviewed |
| [Prettier](https://github.com/prettier/prettier) | development | Automatic formatting for code and supported file types. | MIT | source-reviewed |
| [axe-core](https://github.com/dequelabs/axe-core) | accessibility | Automated web accessibility checking engine. | MPL-2.0 | source-reviewed |
| [Lighthouse](https://github.com/GoogleChrome/lighthouse) | quality | Automated quality audits for web pages. | Apache-2.0 | source-reviewed |
| [Fastify](https://github.com/fastify/fastify) | backend | Web framework for Node.js services. | MIT | source-reviewed |
| [Ajv](https://github.com/ajv-validator/ajv) | validation | Data validation using JSON Schema and JSON Type Definition. | MIT | source-reviewed |
| [Pino](https://github.com/pinojs/pino) | observability | Structured logging for Node.js applications. | MIT | source-reviewed |
| [OpenTelemetry JavaScript](https://github.com/open-telemetry/opentelemetry-js) | observability | Telemetry APIs and SDKs for JavaScript. | Apache-2.0 | source-reviewed |
| [prom-client](https://github.com/prometheus/client_js) | observability | JavaScript client for exposing Prometheus metrics. | Apache-2.0 | source-reviewed |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | data | SQLite access from Node.js. | MIT | source-reviewed |
| [sharp](https://github.com/lovell/sharp) | media | Image resizing and processing for Node.js. | Apache-2.0 | source-reviewed |
| [markdown-it](https://github.com/markdown-it/markdown-it) | documents | Markdown parsing and rendering in JavaScript. | MIT | source-reviewed |
| [pypdf](https://github.com/py-pdf/pypdf) | documents | Read, extract, and transform PDF documents in Python. | BSD-3-Clause | source-reviewed |
| [Docling](https://github.com/docling-project/docling) | documents | Extract documents, tables, and layout into structured representations. | MIT | source-reviewed |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | speech | Audio transcription using Whisper and CTranslate2. | MIT | source-reviewed |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | speech | Whisper inference implementation in C and C++. | MIT | source-reviewed |
| [FFmpeg](https://ffmpeg.org) | media | Process, convert, and extract audio and video streams. | LGPL-2.1-or-later | source-reviewed |
| [n8n](https://github.com/n8n-io/n8n) | automation | Workflow orchestration with source available and usage restrictions. | Sustainable Use License | source-reviewed |

## Use the registry

`npm run catalog:check` validates the local record structure and evidence declarations. It does not execute the external projects or replace license/security review.

Important distinctions:

- n8n is source-available with use restrictions; do not describe it as OSI open source.
- FFmpeg's effective license depends on the components enabled in a build.
- Model licenses for Docling, faster-whisper, whisper.cpp, or other model-backed tools must be evaluated separately from code licenses.
- `nomvexUses` contains candidate use cases, not proof of deployed integration.

To propose an entry, read [CONTRIBUTING.md](../CONTRIBUTING.md).
