import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const nullableText = z.string().min(1).nullable();
const url = z.string().refine(value => {
  try { const parsed = new URL(value); return parsed.protocol === 'https:' && !parsed.username && !parsed.password; }
  catch { return false; }
});
const tool = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1), description: z.string().min(1), category: z.string().min(1), source: url,
  license: z.strictObject({ code: nullableText, models: nullableText, notes: z.string() }),
  cost: z.strictObject({ software: nullableText, services: nullableText }),
  runtime: z.strictObject({ platforms: z.array(z.string().min(1)).nullable(), hardware: nullableText, network: nullableText }),
  status: z.literal('source-reviewed'),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evidence: z.strictObject({ sourceUrls: z.array(url).min(1), test: z.null() }),
  nomvexUses: z.array(z.string().min(1)).min(1), notes: z.string().min(1),
});
export const catalogSchema = z.strictObject({
  schemaVersion: z.literal(2), reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), tools: z.array(tool).min(1),
}).refine(value => new Set(value.tools.map(item => item.id)).size === value.tools.length);

export async function loadCatalog() {
  return catalogSchema.parse(JSON.parse(await readFile(new URL('../catalog/tools.json', import.meta.url), 'utf8')));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const catalog = await loadCatalog();
    process.stdout.write(`Catalog valid: ${catalog.tools.length} entries; unique IDs; English descriptions; declared evidence and licenses.\n`);
  } catch (error) {
    process.stderr.write(`Catalog invalid: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 1;
  }
}
