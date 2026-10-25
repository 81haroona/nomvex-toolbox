import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CATALOG_BRANCH_PREFIX = 'automation/open-source-catalog-';

// Pure, reference-only admission gate. GitHub CLI --paginate --slurp returns
// one array per API page. Invalid/incomplete responses must fail closed.
export function pendingCatalogReviewNumbers(pages, expectedRepository) {
  if (typeof expectedRepository !== 'string' ||
      !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(expectedRepository)) {
    throw new Error('Invalid repository identity');
  }
  if (!Array.isArray(pages)) throw new Error('Missing paginated pull request response');

  const pending = new Set();
  for (const page of pages) {
    if (!Array.isArray(page)) throw new Error('Malformed pull request page');
    for (const pr of page) {
      if (!pr || typeof pr !== 'object' || Array.isArray(pr) ||
          typeof pr.state !== 'string' || !pr.head ||
          typeof pr.head !== 'object' || typeof pr.head.ref !== 'string') {
        throw new Error('Malformed pull request record');
      }
      if (pr.state !== 'open' || !pr.head.ref.startsWith(CATALOG_BRANCH_PREFIX)) continue;
      // A deleted/unknown head repo cannot be dismissed as an unrelated fork.
      if (!pr.head.repo || typeof pr.head.repo.full_name !== 'string') {
        throw new Error('Unverifiable catalog review repository');
      }
      if (pr.head.repo.full_name !== expectedRepository) continue;
      if (!Number.isSafeInteger(pr.number) || pr.number < 1) {
        throw new Error('Invalid catalog PR number');
      }
      pending.add(pr.number);
    }
  }
  return [...pending].sort((a, b) => a - b);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const pages = JSON.parse(readFileSync(0, 'utf8'));
    const pending = pendingCatalogReviewNumbers(pages, process.argv[2]);
    process.stdout.write(pending.join('\n') + (pending.length ? '\n' : ''));
  } catch (error) {
    console.error(`Catalog review gate failed closed: ${error.message}`);
    process.exitCode = 1;
  }
}
