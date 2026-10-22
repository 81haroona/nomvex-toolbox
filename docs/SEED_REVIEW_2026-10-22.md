# NOMVEX Toolbox — Verified core seed review (2026-10-22)

This is an evidence record for **discovery-only** core seeds. It is not a
security audit, installation, compatibility test, or claim that any external
project is part of the running NOMVEX Agent Factory.

All eight additions were individually checked against current GitHub
repository metadata on 2026-10-22: **public**, **not archived**, **not a
fork**, and with an explicit allowed SPDX identifier.

| Canonical GitHub repository | SPDX from GitHub metadata | NOMVEX catalog relevance |
| --- | --- | --- |
| [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | Apache-2.0 | Agent framework |
| [mark3labs/mcp-go](https://github.com/mark3labs/mcp-go) | MIT | MCP implementation |
| [microsoft/promptflow](https://github.com/microsoft/promptflow) | MIT | Prompt workflow and evaluation |
| [mcp-use/mcp-use](https://github.com/mcp-use/mcp-use) | MIT | MCP agent integration |
| [astral-sh/uv](https://github.com/astral-sh/uv) | Apache-2.0 | Python development tool |
| [dagger/dagger](https://github.com/dagger/dagger) | Apache-2.0 | Reproducible development pipelines |
| [tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract) | Apache-2.0 | OCR/document workflow |
| [a2aproject/a2a-python](https://github.com/a2aproject/a2a-python) | Apache-2.0 | Agent interoperability |

Explicitly **not admitted as verified core seeds** in this review:
`mastra-ai/mastra` and `modelcontextprotocol/inspector` reported
`NOASSERTION`; `langchain-ai/langchain-mcp-adapters` reported
`archived=true`; `yoheinakajima/babyagi` did not provide an allowlisted
SPDX identifier in the returned metadata. These are not inferred to be
open source because the source repository is public.

The seed list is fed to the existing GitHub GraphQL sync. Every candidate
must still pass the scanner's independent, current, fail-closed SPDX and
visibility checks. A seed can be quarantined if its upstream status changes.
The index remains reference-only: upstream code is never cloned, vendored,
installed, or executed. A seed URL may already appear in a curated feed,
so **do not add seed counts to indexed counts**.

Required review: six CI matrix jobs on Ubuntu, Windows, and macOS under Node
22/24; preserve protected `main` and the data-only catalog PR workflow.
Do not upgrade unrelated dependencies or send promotional messages.
