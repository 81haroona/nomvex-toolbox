import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const demo = fileURLToPath(new URL('./demo.mjs', import.meta.url));
const child = spawn(process.execPath, [demo, '--broken'], { stdio: 'inherit' });
const code = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (value, signal) => signal ? reject(new Error(`demo terminated by ${signal}`)) : resolve(value ?? 2));
});
if (code !== 1) {
  console.error(`Expected deliberately broken demo to exit 1, received ${code}.`);
  process.exitCode = 1;
}
