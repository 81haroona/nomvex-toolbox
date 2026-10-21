# NOMVEX Toolbox — Curated Registry Source Review

Reviewed: 2026-10-22 (GitHub repository metadata and README descriptions; no upstream checkout, install or execution).

## Three added discovery feeds

| Source | Observed feed license | Review |
| --- | --- | --- |
| [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) | MIT | Public, active, non-fork; linked MCP server repositories |
| [alvinreal/awesome-opensource-ai](https://github.com/alvinreal/awesome-opensource-ai) | CC0-1.0 | Public, active, non-fork; focused models, agents, inference, RAG, and developer systems |
| [Agenta-AI/awesome-ai-agent-platforms](https://github.com/Agenta-AI/awesome-ai-agent-platforms) | CC0-1.0 | Public, active, non-fork; curated agent platforms, browser and coding agents |

Feed inclusion is only a **discovery input**. Third-party license claims in list READMEs are not proof of upstream repository licensing. The normal GraphQL metadata filter re-checks every candidate and quarantines missing, ambiguous, non-allowlisted, archived, private, or forked entries.

## Eleven added core seeds

Individually checked against GitHub repository metadata: public, non-archived, non-fork, with allowlisted SPDX code-license metadata at review time.

| Repository | GitHub SPDX |
| --- | --- |
| openai/openai-agents-python | MIT |
| openai/openai-agents-js | MIT |
| huggingface/transformers | Apache-2.0 |
| huggingface/diffusers | Apache-2.0 |
| infiniflow/ragflow | Apache-2.0 |
| modelcontextprotocol/python-sdk | MIT |
| google-gemini/gemini-cli | Apache-2.0 |
| langchain-ai/deepagents | MIT |
| microsoft/BitNet | MIT |
| openai/codex | Apache-2.0 |
| plandex-ai/plandex | MIT |

Two previously seeded projects were **removed** after GitHub returned `NOASSERTION`: `open-webui/open-webui` and `langgenius/dify`. Their status is not inferred to be open source. They may still be discovered through upstream source lists but must remain quarantined unless GitHub provides an explicitly allowlisted SPDX license later.

## Limitations and controls

- Repository-level SPDX is evidence for indexing, not a legal opinion about every dependency, model weight, dataset, enterprise component, or hosted service.
- Metadata may change. Every sync must independently verify current repository state.
- No entries are represented as installed, secure, production-tested, or integrated.
- No code from these sources is cloned, executed or vendored into NOMVEX.
- The automated catalog refresh PR must pass canonical deduplication, count equality, SPDX filters and all six protected CI checks before merge.
- Public GitHub documentation remains English-first and retains NOMVEX branding.
