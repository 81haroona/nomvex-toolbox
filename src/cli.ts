#!/usr/bin/env node
import { readFile, mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateConfig, ConfigError } from './config.js';
import { runChecks } from './run.js';
import { exitCode, renderHtml, localizeReport } from './report.js';
import type { Language } from './types.js';

const HELP = `NOMVEX Web Checks 0.1.0

Usage: nomvex-check --config <config.json> [--out <new-directory>] [--lang fr|en]

  --config  Configuration JSON / JSON configuration (required)
  --out     Nouveau dossier de rapport / New report directory
  --lang    Langue du rapport / Report language: fr (default), en
  --help    Afficher l’aide / Show help
  --version Afficher la version / Show version

Exit codes: 0 = all passed; 1 = behavior failed; 2 = invalid, error or incomplete.
Existing report files are never overwritten. No telemetry is sent.
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') { process.stdout.write(HELP); return; }
  if (args.length === 1 && args[0] === '--version') { process.stdout.write('0.1.0\n'); return; }
  let configPath: string | undefined;
  let outputPath: string | undefined;
  let language: Language = 'fr';
  let languageProvided = false;
  const seen = new Set<string>();
  try {
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];
      if (!flag || !value || value.startsWith('--') || seen.has(flag)) throw new ConfigError(['arguments']);
      seen.add(flag);
      if (flag === '--config') configPath = value;
      else if (flag === '--out') outputPath = value;
      else if (flag === '--lang' && (value === 'fr' || value === 'en')) { language = value; languageProvided = true; }
      else throw new ConfigError(['arguments']);
    }
    if (!configPath) throw new ConfigError(['config']);
    const configFile = resolve(configPath);
    if ((await stat(configFile)).size > 1024 * 1024) throw new ConfigError(['config.size']);
    let input: unknown;
    try { input = JSON.parse(await readFile(configFile, 'utf8')); }
    catch { throw new ConfigError(['config.json']); }
    const config = validateConfig(input);
    language = languageProvided ? language : config.language ?? 'fr';
    config.language = language;
    const output = resolve(outputPath ?? join('reports', `run-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`));
    await mkdir(output, { recursive: true });
    // Reserve both names before running. Exclusive creation prevents accidental data loss.
    const created: string[] = [];
    try {
      for (const name of ['report.json', 'report.html']) {
        const destination = join(output, name);
        await writeFile(destination, '', { flag: 'wx', mode: 0o600 });
        created.push(destination);
      }
      const report = localizeReport(await runChecks(config, process.env.NOMVEX_BROWSER_EXECUTABLE ? { executablePath: process.env.NOMVEX_BROWSER_EXECUTABLE } : {}), language);
      await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
      await writeFile(join(output, 'report.html'), renderHtml(report));
      process.stdout.write(`${language === 'fr' ? 'Rapport' : 'Report'}: ${join(output, 'report.html')}\n`);
      process.stdout.write(language === 'fr'
        ? `${report.summary.passed}/${report.summary.total} réussis ; ${report.summary.failed} échecs ; ${report.summary.error} erreurs ; ${report.summary.skipped} ignorés\n`
        : `${report.summary.passed}/${report.summary.total} passed; ${report.summary.failed} failed; ${report.summary.error} errors; ${report.summary.skipped} skipped\n`);
      process.exitCode = exitCode(report);
    } catch (error) {
      await Promise.allSettled(created.map(file => unlink(file)));
      throw error;
    }
  } catch (error) {
    const invalid = error instanceof ConfigError;
    const exists = error instanceof Error && 'code' in error && error.code === 'EEXIST';
    const message = exists
      ? language === 'fr' ? 'Les rapports existent déjà. Choisissez un nouveau dossier --out.' : 'Reports already exist. Choose a new --out directory.'
      : invalid
        ? language === 'fr' ? 'Configuration invalide. Consultez docs/CONFIGURATION.md et --help.' : 'Invalid configuration. See docs/CONFIGURATION.md and --help.'
        : language === 'fr' ? 'Impossible de lire la configuration ou d’écrire les rapports. Vérifiez les chemins et les permissions.' : 'Could not read configuration or write reports. Check paths and permissions.';
    process.stderr.write(`${invalid ? 'INVALID_CONFIG' : exists ? 'OUTPUT_EXISTS' : 'IO_ERROR'}: ${message}\n`);
    process.exitCode = 2;
  }
}

await main();
