import { readFile } from 'node:fs/promises';
import { loadCatalog } from './validate-catalog.mjs';

const args = process.argv.slice(2);
const filters = { category: '', status: '', query: '', license: '', source: '' };
let json = false;
try {
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--json') { json = true; continue; }
    if (flag === '--help') {
      process.stdout.write('npm run catalog -- [--query word] [--category name] [--status indexed|source-reviewed] [--license SPDX] [--source feed] [--json]\n');
      process.exit(0);
    }
    const key = flag?.slice(2);
    const value = args[++i];
    if (!flag?.startsWith('--') || !Object.hasOwn(filters, key) || !value || value.startsWith('--')) throw new Error('Invalid arguments. Use --help.');
    filters[key] = value;
  }
  const manual = await loadCatalog();
  const generated = JSON.parse(await readFile(new URL('../catalog/open-source-index.json', import.meta.url), 'utf8'));
  const tools = [
    ...manual.tools.map(tool => ({ ...tool, registry: 'manual' })),
    ...generated.tools.map(tool => ({ ...tool, registry: 'open-source-index' })),
  ];
  const q = filters.query.toLocaleLowerCase();
  const matches = tools.filter(tool => {
    const sourceFeeds = tool.evidence?.sourceFeeds ?? [];
    const haystack = `${tool.name} ${tool.description} ${tool.fullName ?? ''} ${(tool.nomvexUses ?? []).join(' ')} ${sourceFeeds.join(' ')}`.toLocaleLowerCase();
    return (!filters.category || tool.category === filters.category) &&
      (!filters.status || tool.status === filters.status) &&
      (!filters.license || tool.license?.code === filters.license) &&
      (!filters.source || sourceFeeds.includes(filters.source)) &&
      (!q || haystack.includes(q));
  });
  if (json) process.stdout.write(`${JSON.stringify(matches, null, 2)}\n`);
  else {
    process.stdout.write(`${matches.length} / ${tools.length} tools (manual ${manual.tools.length}, indexed ${generated.tools.length})\n\n`);
    for (const tool of matches) {
      process.stdout.write(`${tool.name} [${tool.category}] · ${tool.status}\n${tool.description}\n${tool.source}\nLicense: ${tool.license?.code ?? 'unverified'}\n\n`);
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Catalog unavailable'}\n`);
  process.exitCode = 2;
}
