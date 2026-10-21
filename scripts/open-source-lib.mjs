export const OPEN_SOURCE_SPDX = new Set([
  'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','MPL-2.0','EPL-2.0',
  'GPL-2.0','GPL-2.0-only','GPL-2.0-or-later','GPL-3.0','GPL-3.0-only','GPL-3.0-or-later',
  'AGPL-3.0','AGPL-3.0-only','AGPL-3.0-or-later','LGPL-2.1','LGPL-2.1-only',
  'LGPL-2.1-or-later','LGPL-3.0','LGPL-3.0-only','LGPL-3.0-or-later','Unlicense','CC0-1.0'
]);

export function normalizeRepo(value) {
  const match = String(value || '').trim().match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\.git$/i, '')}`;
}

export function extractGitHubRepos(markdown) {
  const found = new Set();
  const regex = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g;
  for (const match of String(markdown || '').matchAll(regex)) {
    const repo = normalizeRepo(`${match[1]}/${match[2]}`);
    if (repo) found.add(repo);
  }
  return [...found].sort((a,b)=>a.localeCompare(b));
}

export function isRecognizedOpenSourceLicense(spdx) {
  return typeof spdx === 'string' && OPEN_SOURCE_SPDX.has(spdx);
}

export function inferCategory(metadata, sourceCategories = []) {
  const topics = Array.isArray(metadata?.topics) ? metadata.topics : [];
  const haystack = [metadata?.name, metadata?.description, metadata?.language, ...topics, ...sourceCategories]
    .filter(Boolean).join(' ').toLowerCase();
  const rules = [
    ['mcp', /\bmcp\b|model context protocol/],
    ['coding-agent', /coding agent|code agent|software engineer|pair programming|developer agent|code assistant/],
    ['browser-agent', /browser|web automation|computer use|selenium|playwright|puppeteer|crawl/],
    ['agent-framework', /multi-agent|agent framework|agentic|\bagents?\b|orchestrat/],
    ['evaluation', /eval|evaluation|benchmark|red team|guardrail|prompt test|llm test/],
    ['observability', /observability|tracing|telemetry|monitoring|langfuse|phoenix/],
    ['rag-retrieval', /\brag\b|retrieval|knowledge graph|graphrag|embedding/],
    ['vector-database', /vector database|vector store|qdrant|milvus|weaviate|pgvector|chroma/],
    ['model-serving', /inference|model serving|openai compatible|llm server|ollama|vllm|llama\.cpp|local ai/],
    ['workflow-automation', /workflow|automation|scheduler|orchestration platform|temporal|prefect|dagster/],
    ['documents', /document|pdf|markdown|ocr|docling/],
    ['speech-audio', /speech|audio|whisper|tts|voice|transcri/],
    ['media', /image|video|ffmpeg|comfyui|media/],
    ['data', /database|data pipeline|etl|sql/]
  ];
  for (const [category, pattern] of rules) if (pattern.test(haystack)) return category;
  return sourceCategories[0] || 'developer-tool';
}

export function uniqueSorted(values) {
  return [...new Set((values || []).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

export function buildIndexedEntry(metadata, sourceFeeds, observedAt) {
  const fullName = normalizeRepo(metadata?.full_name);
  if (!fullName) throw new TypeError('GitHub metadata missing full_name.');
  const spdx = metadata?.license?.spdx_id ?? null;
  if (metadata?.visibility !== 'PUBLIC' || metadata?.private || metadata?.archived || metadata?.fork || !isRecognizedOpenSourceLicense(spdx)) {
    throw new TypeError('Only public, non-archived, non-fork repositories with allowlisted SPDX licenses may be indexed.');
  }
  const feedCategories = sourceFeeds.map(item => item.defaultCategory).filter(Boolean);
  return {
    id: fullName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    name: metadata.name,
    fullName,
    description: metadata.description || `${fullName} open-source repository.`,
    category: inferCategory(metadata, feedCategories),
    source: metadata.html_url,
    license: { code: spdx, source: `https://api.github.com/repos/${fullName}/license` },
    github: {
      language: metadata.language ?? null,
      topics: uniqueSorted(metadata.topics),
      stars: Number.isInteger(metadata.stargazers_count) ? metadata.stargazers_count : null,
      forks: Number.isInteger(metadata.forks_count) ? metadata.forks_count : null,
      pushedAt: metadata.pushed_at ?? null,
      archived: Boolean(metadata.archived),
      fork: Boolean(metadata.fork),
      visibility: metadata.visibility
    },
    status: 'indexed',
    observedAt,
    evidence: {
      sourceFeeds: uniqueSorted(sourceFeeds.map(item => item.id)),
      githubApi: `https://api.github.com/repos/${fullName}`,
      licenseFromGitHubMetadata: true,
      executedTest: false
    },
    integration: {
      mode: 'reference',
      tested: false,
      installRecipe: null
    }
  };
}


export function graphqlNodeToMetadata(node) {
  if (!node?.nameWithOwner || !node?.name || !node?.url) throw new TypeError('Incomplete GitHub GraphQL repository metadata.');
  return {
    name: node.name,
    full_name: node.nameWithOwner,
    description: node.description ?? null,
    html_url: node.url,
    default_branch: node.defaultBranchRef?.name ?? null,
    license: { spdx_id: node.licenseInfo?.spdxId ?? null },
    language: node.primaryLanguage?.name ?? null,
    topics: (node.repositoryTopics?.nodes ?? []).map(item => item?.topic?.name).filter(Boolean),
    stargazers_count: Number.isInteger(node.stargazerCount) ? node.stargazerCount : null,
    forks_count: Number.isInteger(node.forkCount) ? node.forkCount : null,
    pushed_at: node.pushedAt ?? null,
    archived: Boolean(node.isArchived),
    fork: Boolean(node.isFork),
    private: Boolean(node.isPrivate),
    visibility: node.visibility ?? null
  };
}
