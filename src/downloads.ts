import { Worker } from 'node:worker_threads';
import type { CheckStatus, DownloadCheck } from './types.js';

export const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MAX_PARSE_MS = 5000;

export interface DownloadValidation {
  status: Extract<CheckStatus, 'passed' | 'failed' | 'error'>;
  code: string;
  message: string;
  evidence: Record<string, string | number | boolean>;
}

export type ValidationSpec = Pick<DownloadCheck, 'format' | 'minBytes' | 'expectedText' | 'requiredKeys' | 'csvHeaders'>;

/** Parsing runs off the browser event loop and can be terminated at the deadline. */
export async function validateDownloadedFile(
  filePath: string,
  check: DownloadCheck,
  maxBytes: number = MAX_DOWNLOAD_BYTES,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<DownloadValidation> {
  const errorResult = (code: string, message: string): DownloadValidation => ({
    status: 'error', code, message, evidence: { format: check.format },
  });
  const timedOut = (): DownloadValidation => errorResult('CHECK_TIMEOUT', 'The file parser exceeded the check time limit.');
  if (options.signal?.aborted) return timedOut();
  const timeoutMs = Math.min(MAX_PARSE_MS, Math.max(1, options.timeoutMs ?? MAX_PARSE_MS));
  const spec: ValidationSpec = {
    format: check.format, minBytes: check.minBytes, expectedText: check.expectedText,
    requiredKeys: check.requiredKeys, csvHeaders: check.csvHeaders,
  };
  let worker: Worker;
  try {
    worker = new Worker(new URL('./download-worker.js', import.meta.url), {
      workerData: { filePath, check: spec, maxBytes },
      // These bound the JS heap, not all native or ArrayBuffer allocations.
      resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
      env: {}, execArgv: [], stdout: true, stderr: true, name: 'nomvex-file-validator',
    });
    worker.stdout.resume();
    worker.stderr.resume();
  } catch {
    return errorResult('PARSER_ERROR', 'The isolated file parser could not start.');
  }
  return new Promise<DownloadValidation>(resolve => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: DownloadValidation): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', aborted);
      // Wait for termination so the file cannot still be open during cleanup.
      void worker.terminate().then(() => resolve(result), () => resolve(errorResult('PARSER_ERROR', 'The isolated file parser could not stop.')));
    };
    const aborted = (): void => finish(timedOut());
    worker.once('message', (result: DownloadValidation) => finish(result));
    worker.once('error', (error: Error & { code?: string }) => finish(errorResult(
      error.code === 'ERR_WORKER_OUT_OF_MEMORY' ? 'RESOURCE_LIMIT' : 'PARSER_ERROR',
      'The isolated file parser could not complete within its resource limits.',
    )));
    worker.once('exit', () => {
      if (!settled) finish(errorResult('PARSER_ERROR', 'The isolated file parser stopped before returning a result.'));
    });
    timer = setTimeout(aborted, timeoutMs);
    options.signal?.addEventListener('abort', aborted, { once: true });
    if (options.signal?.aborted) aborted();
  });
}
