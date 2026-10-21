import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixture, makeDemoConfig } from '../examples/fixture.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--broken') || args.length > 1) {
  process.stderr.write('Usage: node scripts/demo.mjs [--broken]\n');
  process.exitCode = 2;
} else {
  const fixture = await startFixture();
  const temporary = await mkdtemp(join(tmpdir(), 'nomvex-demo-'));
  try {
    const config = args.includes('--broken')
      ? { ...JSON.parse(await readFile(new URL('../examples/configs/broken.json', import.meta.url), 'utf8')), baseUrl: fixture.baseUrl }
      : makeDemoConfig(fixture.baseUrl);
    const configFile = join(temporary, 'config.json');
    await writeFile(configFile, JSON.stringify(config), { mode: 0o600 });
    if (args.includes('--broken')) process.stdout.write('Démo volontairement cassée : des échecs sont attendus (code 1).\n');
    const child = spawn(process.execPath, [fileURLToPath(new URL('../dist/cli.js', import.meta.url)), '--config', configFile], { stdio: 'inherit' });
    process.exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve(signal ? 2 : code ?? 2));
    });
  } finally {
    await fixture.close();
    await rm(temporary, { recursive: true, force: true });
  }
}
