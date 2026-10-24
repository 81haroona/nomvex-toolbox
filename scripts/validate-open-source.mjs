import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { OPEN_SOURCE_SPDX, assertDistinctReferenceIds, assertCandidateIdentityLedger } from './open-source-lib.mjs';

const url = z.string().url().refine(value => value.startsWith('https://'));
const entry = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  description: z.string().min(1),
  category: z.string().min(1),
  source: url,
  license: z.strictObject({ code: z.string().min(1), source: url }),
  github: z.strictObject({
    language: z.string().nullable(),
    topics: z.array(z.string()),
    stars: z.number().int().nonnegative().nullable(),
    forks: z.number().int().nonnegative().nullable(),
    pushedAt: z.string().nullable(),
    archived: z.literal(false),
    fork: z.literal(false),
    visibility: z.literal('PUBLIC')
  }),
  status: z.literal('indexed'),
  observedAt: z.string().min(1),
  evidence: z.strictObject({
    sourceFeeds: z.array(z.string()).min(1),
    candidateFullName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).optional(),
    githubApi: url,
    licenseFromGitHubMetadata: z.literal(true),
    executedTest: z.literal(false)
  }),
  integration: z.strictObject({
    mode: z.literal('reference'),
    tested: z.literal(false),
    installRecipe: z.null()
  })
}).superRefine((value, ctx) => {
  if (!OPEN_SOURCE_SPDX.has(value.license.code)) ctx.addIssue({ code: 'custom', message: `Non-allowlisted SPDX: ${value.license.code}` });
  const expectedSource = `https://github.com/${value.fullName}`.toLowerCase();
  if (value.source.toLowerCase() !== expectedSource) ctx.addIssue({ code: 'custom', message: 'Canonical source URL mismatch.' });
  if (value.license.source.toLowerCase() !== `https://api.github.com/repos/${value.fullName}/license`.toLowerCase()) ctx.addIssue({ code: 'custom', message: 'License evidence URL mismatch.' });
  if (value.evidence.githubApi.toLowerCase() !== `https://api.github.com/repos/${value.fullName}`.toLowerCase()) ctx.addIssue({ code: 'custom', message: 'GitHub metadata evidence URL mismatch.' });
});
const indexSchema = z.strictObject({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  generatedAt: z.string().min(1),
  candidateCount: z.number().int().nonnegative(),
  indexedCount: z.number().int().nonnegative(),
  policy: z.string().min(1),
  tools: z.array(entry)
});
const quarantineSchema = z.strictObject({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  generatedAt: z.string().min(1),
  quarantinedCount: z.number().int().nonnegative(),
  items: z.array(z.object({
    fullName:z.string().min(1), source:url, reason:z.string().min(1), license:z.string().nullable(),
    sourceFeeds:z.array(z.string()).min(1), observedAt:z.string().min(1)
  }).passthrough())
});

const index = indexSchema.parse(JSON.parse(await readFile(new URL('../catalog/open-source-index.json', import.meta.url), 'utf8')));
const quarantine = quarantineSchema.parse(JSON.parse(await readFile(new URL('../catalog/open-source-quarantine.json', import.meta.url), 'utf8')));
if (index.indexedCount !== index.tools.length) throw new Error('indexedCount does not match tools length.');
if (quarantine.quarantinedCount !== quarantine.items.length) throw new Error('quarantinedCount does not match items length.');
if (index.candidateCount !== index.indexedCount + quarantine.quarantinedCount) throw new Error('Candidate accounting mismatch: indexed + quarantined must equal candidates.');
if (index.generatedAt !== quarantine.generatedAt) throw new Error('Catalog evidence timestamps do not match.');
assertDistinctReferenceIds(index.tools);
if (index.schemaVersion !== quarantine.schemaVersion) throw new Error('Index and quarantine schema versions differ.');
if (index.schemaVersion === 2) {
  const candidates = z.strictObject({
    schemaVersion: z.literal(2), generatedAt: z.string().min(1),
    count: z.number().int().nonnegative(),
    candidates: z.array(z.strictObject({ repo: z.string().min(1), feeds: z.array(z.string()).min(1) }))
  }).parse(JSON.parse(await readFile(new URL('../catalog/candidates.json', import.meta.url), 'utf8')));
  if (candidates.generatedAt !== index.generatedAt || candidates.count !== candidates.candidates.length || candidates.count !== index.candidateCount) {
    throw new Error('Candidate snapshot count or timestamp mismatch.');
  }
  assertCandidateIdentityLedger(candidates.candidates, index.tools, quarantine.items);
}
const names = index.tools.map(item => item.fullName.toLowerCase());
if (new Set(names).size !== names.length) throw new Error('Duplicate repository in open-source index.');
process.stdout.write(`Open-source index valid: ${index.tools.length} indexed; ${quarantine.items.length} quarantined.\n`);
