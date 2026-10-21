/**
 * Permission-gated, read-only bridge from the NOMVEX open-source index to a
 * server-side factory planner. This NEVER returns executable tools or commands.
 * The caller must supply an identity and permissions verified on the server.
 */
import { createHash } from 'node:crypto';
import { OPEN_SOURCE_SPDX, normalizeRepo } from './open-source-lib.mjs';

export class CatalogAccessDenied extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'CatalogAccessDenied';
  }
}

const canonical = (repo) => `https://github.com/${repo}`.toLowerCase();
const githubEvidence = (repo) => `https://api.github.com/repos/${repo}`.toLowerCase();
const licenseEvidence = (repo) => `${githubEvidence(repo)}/license`;

export function eligibleReference(entry) {
  const name = normalizeRepo(entry?.fullName);
  if (!name || !entry || entry.status !== 'indexed' ||
      entry.github?.visibility !== 'PUBLIC' || entry.github?.archived !== false ||
      entry.github?.fork !== false || entry.integration?.mode !== 'reference' ||
      entry.integration?.tested !== false || entry.integration?.installRecipe !== null ||
      entry.evidence?.executedTest !== false || entry.evidence?.licenseFromGitHubMetadata !== true ||
      !OPEN_SOURCE_SPDX.has(entry.license?.code)) return false;
  return typeof entry.source === 'string' && entry.source.toLowerCase() === canonical(name) &&
    entry.evidence?.githubApi?.toLowerCase() === githubEvidence(name) &&
    entry.license?.source?.toLowerCase() === licenseEvidence(name);
}

/** Discover references only; never grants execution, installation, spending or publishing. */
export function selectFactoryReferences(index, request, trustedContext) {
  if (!trustedContext || trustedContext.authenticated !== true ||
      !['owner','delegated-agent'].includes(trustedContext.role) ||
      !Array.isArray(trustedContext.permissions) ||
      !trustedContext.permissions.includes('catalog:discover')) {
    throw new CatalogAccessDenied('server_verified_catalog_permission_required');
  }
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).some(key => !['action','branch','query','category','limit'].includes(key)) ||
      request.action !== 'discover' ||
      typeof request.branch !== 'string' ||
      !/^[a-z][a-z0-9-]{1,30}$/.test(request.branch) ||
      typeof request.query !== 'string' || request.query.length > 120 ||
      (request.category !== undefined && (typeof request.category !== 'string' || request.category.length > 60)) ||
      (request.limit !== undefined && (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 20))) {
    throw new CatalogAccessDenied('invalid_read_only_catalog_request');
  }
  if (!trustedContext.permissions.some(permission =>
      permission === 'catalog:category:*' ||
      (typeof permission === 'string' && permission.startsWith('catalog:category:')))) {
    throw new CatalogAccessDenied('catalog_category_permission_required');
  }
  const branches = trustedContext.branches;
  if (!Array.isArray(branches) ||
      !branches.some(b => b === request.branch || b === '*')) {
    throw new CatalogAccessDenied('branch_out_of_scope');
  }
  if (!index || index.schemaVersion !== 1 || !Array.isArray(index.tools) ||
      !Number.isInteger(index.indexedCount) || index.indexedCount !== index.tools.length ||
      typeof index.generatedAt !== 'string') {
    throw new CatalogAccessDenied('catalog_integrity_unverified');
  }
  const allowed = new Set(trustedContext.permissions);
  const q = request.query.trim().toLocaleLowerCase('en');
  const hits = [];
  for (const tool of index.tools) {
    if (!eligibleReference(tool)) continue;
    if (request.category && tool.category !== request.category) continue;
    if (!allowed.has('catalog:category:*') && !allowed.has(`catalog:category:${tool.category}`)) continue;
    const haystack = [tool.name,tool.fullName,tool.description,tool.category,...(tool.github.topics ?? [])]
      .filter(x => typeof x === 'string').join(' ').toLocaleLowerCase('en');
    if (q && !haystack.includes(q)) continue;
    hits.push({
      name: tool.name, fullName: tool.fullName, category: tool.category,
      source: tool.source, license: tool.license.code,
      permissionDecision: 'reference-only', executable: false,
      installed: false, tested: false, published: false,
      evidence: {
        githubApi: tool.evidence.githubApi,
        metadataObservedAt: tool.observedAt,
        metadataSha256: createHash('sha256').update(JSON.stringify([
          tool.fullName,tool.license.code,tool.evidence.githubApi,tool.observedAt
        ])).digest('hex')
      }
    });
  }
  hits.sort((a,b)=>a.fullName.localeCompare(b.fullName));
  return Object.freeze({
    status: 'reference-only',
    operation: 'discover',
    allowedBranch: request.branch,
    matched: hits.length,
    references: hits.slice(0, request.limit ?? 10),
    integrationExecuted: false, upstreamCodeExecuted: false
  });
}
