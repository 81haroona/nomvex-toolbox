import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Preserve strict exit-code verification. On unexpected operational errors,
// print only sanitized test identifiers/codes, never navigation URLs or inputs.
const demo = fileURLToPath(new URL('./demo.mjs', import.meta.url));
const child = spawn(process.execPath, [demo, '--broken'], {
  stdio: ['inherit', 'pipe', 'inherit']
});
let output = '';
child.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  if (output.length < 16000) output += chunk.toString('utf8');
});
const code = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (value, signal) => signal ? reject(new Error(`demo terminated by ${signal}`)) : resolve(value ?? 2));
});
if (code !== 1) {
  const match = output.match(/(?:Report|Rapport): ([^\r\n]+[/\\]report\.html)/);
  if (match) {
    try {
      const report = JSON.parse(await readFile(join(dirname(match[1]), 'report.json'), 'utf8'));
      if (Array.isArray(report.results)) {
        const diagnostic = report.results.map(item => ({
          id: item.id, status: item.status, code: item.code,
          stage: item.evidence?.stage ?? null
        }));
        console.error('NOMVEX_BROKEN_DEMO_DIAGNOSTICS', JSON.stringify(diagnostic));
      }
    } catch {
      console.error('NOMVEX_BROKEN_DEMO_DIAGNOSTICS_UNAVAILABLE');
    }
  }
  console.error(`Expected deliberately broken demo to exit 1, received ${code}.`);
  process.exitCode = 1;
}
