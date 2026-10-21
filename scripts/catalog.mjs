import { loadCatalog } from './validate-catalog.mjs';

const args = process.argv.slice(2);
const filters = { category: '', status: '', query: '', lang: 'fr' };
let json = false;
try {
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--json') { json = true; continue; }
    if (flag === '--help') {
      process.stdout.write('npm run catalog -- [--query word] [--category name] [--status source-reviewed] [--lang fr|en] [--json]\n');
      process.exit(0);
    }
    const key = flag?.slice(2);
    const value = args[++i];
    if (!flag?.startsWith('--') || !Object.hasOwn(filters, key) || !value || value.startsWith('--')) throw new Error('Invalid arguments. Use --help.');
    filters[key] = value;
  }
  if (!['fr', 'en'].includes(filters.lang)) throw new Error('Language must be fr or en.');
  const catalog = await loadCatalog();
  const matches = catalog.tools.filter(tool =>
    (!filters.category || tool.category === filters.category) &&
    (!filters.status || tool.status === filters.status) &&
    (!filters.query || `${tool.name} ${tool.description.fr} ${tool.description.en} ${tool.nomvexUses.join(' ')}`.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase())));
  if (json) process.stdout.write(`${JSON.stringify(matches, null, 2)}\n`);
  else {
    process.stdout.write(`${matches.length} / ${catalog.tools.length} tools\n\n`);
    for (const tool of matches) process.stdout.write(`${tool.name} [${tool.category}] · ${tool.status}\n${tool.description[filters.lang]}\n${tool.source}\nLicense: ${tool.license.code ?? 'unverified'}\n\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Catalog unavailable'}\n`);
  process.exitCode = 2;
}
