import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { createServer, request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, errors, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { resolveTargetUrl, safeUrl, validateConfig } from './config.js';
import { MAX_DOWNLOAD_BYTES, validateDownloadedFile } from './downloads.js';
import { diagnosticMessage } from './report.js';
import type { Check, CheckResult, CheckStatus, Config, LocaleCheck, RunReport } from './types.js';

class CheckFault extends Error {
  constructor(readonly code: string, readonly status: 'failed' | 'error', message: string) {
    super(message);
    this.name = 'CheckFault';
  }
}

interface OriginProxy { server: string; close(): Promise<void> }

/** A per-check forward proxy also checks server-side redirect destinations. */
async function originProxy(
  origins: Set<string>, timeoutMs: number, fail: (fault: CheckFault) => void,
): Promise<OriginProxy> {
  let closed = false;
  const sockets = new Set<Socket>();
  const upstreamRequests = new Set<ReturnType<typeof httpRequest>>();
  const track = (socket: Socket): void => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setTimeout(timeoutMs, () => socket.destroy());
  };
  const networkError = (): void => {
    if (!closed) fail(new CheckFault('NETWORK_ERROR', 'error', 'A network operation failed.'));
  };
  const valid = (url: URL, protocol: string): boolean => (
    url.protocol === protocol && !url.username && !url.password && origins.has(url.origin)
  );
  const headersFor = (headers: IncomingHttpHeaders, target: URL): IncomingHttpHeaders => {
    const result: IncomingHttpHeaders = { ...headers, host: target.host };
    delete result['proxy-authorization'];
    delete result['proxy-connection'];
    delete result['proxy-authenticate'];
    return result;
  };
  const server = createServer((incoming, outgoing) => {
    let target: URL;
    try {
      target = new URL(incoming.url ?? '');
      if (!valid(target, 'http:')) throw new Error();
    } catch {
      // Browser-owned proxy probes are denied too, but are not page failures.
      // The context's request events classify requests attributable to the check.
      outgoing.writeHead(403); outgoing.end(); return;
    }
    if (upstreamRequests.size >= 32) {
      fail(new CheckFault('RESOURCE_LIMIT', 'error', 'The check exceeded its connection limit.'));
      outgoing.writeHead(503); outgoing.end(); return;
    }
    const upstream = httpRequest(target, {
      method: incoming.method, headers: headersFor(incoming.headers, target), agent: false,
    }, response => {
      const attachment = /attachment/i.test(String(response.headers['content-disposition'] ?? ''));
      const declared = Number(response.headers['content-length']);
      if (attachment && Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
        fail(new CheckFault('DOWNLOAD_TOO_LARGE', 'failed', 'The download exceeds the permitted size.'));
        response.destroy(); outgoing.destroy(); return;
      }
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      let received = 0;
      response.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (attachment && received > MAX_DOWNLOAD_BYTES) {
          fail(new CheckFault('DOWNLOAD_TOO_LARGE', 'failed', 'The download exceeds the permitted size.'));
          response.destroy(); outgoing.destroy();
        }
      });
      response.on('error', () => {
        if (!outgoing.destroyed) networkError();
        outgoing.destroy();
      });
      response.pipe(outgoing);
    });
    upstreamRequests.add(upstream);
    upstream.once('close', () => upstreamRequests.delete(upstream));
    upstream.on('socket', track);
    upstream.setTimeout(timeoutMs, () => upstream.destroy());
    upstream.on('error', () => {
      if (!incoming.destroyed && !outgoing.destroyed) networkError();
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.on('error', () => upstream.destroy());
    outgoing.on('close', () => { if (!outgoing.writableEnded) upstream.destroy(); });
    incoming.pipe(upstream);
  });
  server.on('connection', socket => {
    if (sockets.size >= 64) {
      if (!closed) fail(new CheckFault('RESOURCE_LIMIT', 'error', 'The check exceeded its connection limit.'));
      socket.destroy(); return;
    }
    track(socket);
  });
  server.on('clientError', (_error, socket) => socket.destroy());
  server.on('connect', (incoming, client, head) => {
    let target: URL;
    try {
      target = new URL(`https://${incoming.url ?? ''}`);
      if (!valid(target, 'https:') || target.pathname !== '/' || target.search || target.hash) throw new Error();
    } catch {
      client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    const upstream = connect(Number(target.port || 443), target.hostname.replace(/^\[|\]$/g, ''));
    track(upstream);
    upstream.once('connect', () => {
      if (closed || client.destroyed) { upstream.destroy(); return; }
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      client.pipe(upstream); upstream.pipe(client);
    });
    upstream.on('error', () => { if (!client.destroyed) networkError(); client.destroy(); });
    client.on('error', () => upstream.destroy());
    client.once('close', () => upstream.destroy());
    upstream.once('close', () => client.destroy());
  });
  // WebSocket is intentionally unsupported in this initial HTTP(S) checker.
  server.on('upgrade', (_request, socket) => {
    if (!closed) fail(new CheckFault('NETWORK_ERROR', 'error', 'WebSocket transport is not supported by this checker.'));
    socket.destroy();
  });
  server.on('error', networkError);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new CheckFault('CONTEXT_UNAVAILABLE', 'error', 'The isolated network guard could not start.');
  return {
    server: `http://127.0.0.1:${address.port}`,
    close: async () => {
      if (closed) return;
      closed = true;
      for (const request of upstreamRequests) request.destroy();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}

function timeLeft(deadline: number, reserve = 0): number {
  return Math.max(1, deadline - Date.now() - reserve);
}

async function localeAssertion(page: Page, check: LocaleCheck, deadline: number): Promise<void> {
  try {
    await page.waitForFunction(expected => document.documentElement.lang.toLowerCase() === expected,
      check.expectedLang.toLowerCase(), { timeout: timeLeft(deadline, 100) });
  } catch (error) {
    if (error instanceof errors.TimeoutError) throw new CheckFault('LOCALE_MISMATCH', 'failed', 'The document language does not match the expected language.');
    throw error;
  }
  if (check.text) {
    const locator = page.locator(check.text.selector);
    while (Date.now() < deadline - 100) {
      try {
        const text = await locator.innerText({ timeout: Math.min(250, timeLeft(deadline, 100)) });
        if (text.includes(check.text.includes)) return;
      } catch (error) {
        if (!(error instanceof errors.TimeoutError)) throw new CheckFault('LOCALE_TEXT_MISMATCH', 'failed', 'The localized text could not be matched.');
      }
      await delay(Math.min(50, timeLeft(deadline, 100)));
    }
    throw new CheckFault('LOCALE_TEXT_MISMATCH', 'failed', 'The localized text does not contain the required text.');
  }
}

function initialResult(check: Check, status: CheckStatus, code: string, message: string): CheckResult {
  return { id: check.id, kind: check.kind, status, code, message, durationMs: 0 };
}

async function checkOne(
  browser: Browser, browserCdp: CDPSession, check: Check, config: Config,
  downloadsDirectory: string, runDirectory: string,
): Promise<CheckResult> {
  const started = Date.now();
  const timeoutMs = config.timeoutMs ?? 15_000;
  const deadline = started + timeoutMs;
  const origins = new Set([new URL(config.baseUrl).origin, ...(config.allowedOrigins ?? []).map(value => new URL(value).origin)]);
  let context: BrowserContext | undefined;
  let proxy: OriginProxy | undefined;
  let pageSession: CDPSession | undefined;
  let checkDirectory: string | undefined;
  let stopped = false;
  const parserController = new AbortController();
  let parsing: Promise<Awaited<ReturnType<typeof validateDownloadedFile>>> | undefined;
  let stage = 'setup';
  let fatal: CheckFault | undefined;
  let rejectFault!: (fault: CheckFault) => void;
  const faultPromise = new Promise<never>((_resolve, reject) => { rejectFault = reject; });
  void faultPromise.catch(() => {});
  const fail = (fault: CheckFault): void => {
    if (stopped || fatal) return;
    fatal = fault;
    rejectFault(fault);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new CheckFault('CHECK_TIMEOUT', 'error', 'The check exceeded its time limit.')), timeoutMs);
  });
  const frameIds = new Set<string>();
  const downloadGuids = new Set<string>();
  let browserContextId: string | undefined;
  const workerCreated = (event: { targetInfo: { type: string; browserContextId?: string } }): void => {
    const target = event.targetInfo;
    if (browserContextId && target.browserContextId === browserContextId
      && ['worker', 'shared_worker', 'service_worker'].includes(target.type)) {
      fail(new CheckFault('WORKER_UNSUPPORTED', 'error', 'Web worker workflows are not supported by this checker.'));
    }
  };
  const willDownload = (event: { frameId: string; guid: string }): void => {
    if (frameIds.has(event.frameId)) downloadGuids.add(event.guid);
  };
  const progress = (event: { guid: string; receivedBytes: number; totalBytes: number }): void => {
    if (!downloadGuids.has(event.guid)) return;
    if (event.receivedBytes > MAX_DOWNLOAD_BYTES || event.totalBytes > MAX_DOWNLOAD_BYTES) {
      fail(new CheckFault('DOWNLOAD_TOO_LARGE', 'failed', 'The download exceeds the permitted size.'));
      void browserCdp.send('Browser.cancelDownload', { guid: event.guid, browserContextId }).catch(() => {});
    }
  };
  browserCdp.on('Browser.downloadWillBegin', willDownload);
  browserCdp.on('Browser.downloadProgress', progress);
  browserCdp.on('Target.targetCreated', workerCreated);
  let result: CheckResult;
  const perform = async (): Promise<CheckResult> => {
    proxy = await originProxy(origins, timeoutMs, fail);
    if (stopped) { await proxy.close(); throw new CheckFault('CHECK_TIMEOUT', 'error', 'The check exceeded its time limit.'); }
    context = await browser.newContext({
      acceptDownloads: check.kind === 'download', serviceWorkers: 'block',
      locale: config.language === 'en' ? 'en-US' : 'fr-FR',
      proxy: { server: proxy.server, bypass: '<-loopback>' },
    });
    if (stopped) { await context.close(); throw new CheckFault('CHECK_TIMEOUT', 'error', 'The check exceeded its time limit.'); }
    context.setDefaultTimeout(timeoutMs);
    context.setDefaultNavigationTimeout(timeoutMs);
    context.on('request', request => {
      let permitted = false;
      try {
        const url = new URL(request.url());
        permitted = ['http:', 'https:'].includes(url.protocol) && origins.has(url.origin) && !url.username && !url.password;
      } catch { /* handled below */ }
      if (!permitted) fail(new CheckFault('ORIGIN_BLOCKED', 'error', 'A request to an unapproved origin was blocked.'));
    });
    const page = await context.newPage();
    let expectingDownload = false;
    let downloadCount = 0;
    page.on('download', download => {
      downloadCount++;
      if (!expectingDownload || downloadCount > 1) {
        fail(new CheckFault('DOWNLOAD_FAILED', 'error', 'An unexpected download was canceled.'));
        void download.cancel().catch(() => {});
      }
    });
    page.on('dialog', dialog => { void dialog.dismiss().catch(() => {}); });
    page.on('crash', () => fail(new CheckFault('BROWSER_UNAVAILABLE', 'error', 'The browser page stopped unexpectedly.')));
    // Worker WebSockets are not fully covered by Playwright's page socket
    // routing. Browser-level discovery below also covers shared workers.
    page.on('worker', () => fail(new CheckFault('WORKER_UNSUPPORTED', 'error', 'Web worker workflows are not supported by this checker.')));
    page.on('requestfailed', request => {
      // Chromium aborts navigation requests when turning them into downloads.
      if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
      fail(new CheckFault('NETWORK_ERROR', 'error', 'A network operation failed.'));
    });
    page.on('response', response => {
      const request = response.request();
      try {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame() && response.status() >= 400) {
          fail(new CheckFault('HTTP_ERROR', 'error', 'The page returned an unsuccessful HTTP status.'));
        }
      } catch { /* A detached frame is handled by the active browser operation. */ }
    });
    // Prevent a new window from escaping this check's lifecycle and assertions.
    context.on('page', popup => {
      if (popup !== page) {
        fail(new CheckFault('ACTION_ERROR', 'error', 'A new-window workflow is not supported by this checker.'));
        void popup.close().catch(() => {});
      }
    });
    await context.routeWebSocket('**/*', async socket => {
      fail(new CheckFault('NETWORK_ERROR', 'error', 'WebSocket transport is not supported by this checker.'));
      await socket.close({ code: 1008, reason: 'Unsupported transport' }).catch(() => {});
    });
    // Exact origin filtering for the first request complements the proxy's
    // filtering of every HTTP destination, including redirect chains.
    await context.route('**/*', async route => {
      const raw = route.request().url();
      let permitted = false;
      try {
        const url = new URL(raw);
        permitted = ['http:', 'https:'].includes(url.protocol) && origins.has(url.origin) && !url.username && !url.password;
      } catch { /* handled below */ }
      if (!permitted) {
        fail(new CheckFault('ORIGIN_BLOCKED', 'error', 'A request to an unapproved origin was blocked.'));
        await route.abort('blockedbyclient').catch(() => {});
      } else {
        await route.continue().catch(() => {});
      }
    });
    // Attribute browser-level worker events to this isolated context before
    // navigating. A worker in another concurrent check cannot fail this check.
    try {
      pageSession = await context.newCDPSession(page);
      const info = await pageSession.send('Target.getTargetInfo');
      browserContextId = info.targetInfo.browserContextId;
      if (!browserContextId) throw new Error();
    } catch {
      throw new CheckFault('CONTEXT_UNAVAILABLE', 'error', 'The browser could not enable the isolated worker guard.');
    }
    // Downloads are guarded before completion; saveAs/path alone cannot do this.
    if (check.kind === 'download') {
      try {
        await pageSession.send('Page.enable');
        const tree = await pageSession.send('Page.getFrameTree');
        const addFrames = (node: { frame: { id: string }; childFrames?: unknown[] }): void => {
          frameIds.add(node.frame.id);
          for (const child of node.childFrames ?? []) addFrames(child as typeof node);
        };
        addFrames(tree.frameTree);
        pageSession.on('Page.frameAttached', event => frameIds.add(event.frameId));
        await browserCdp.send('Browser.setDownloadBehavior', {
          behavior: 'allowAndName', browserContextId, downloadPath: downloadsDirectory, eventsEnabled: true,
        });
      } catch {
        throw new CheckFault('DOWNLOAD_LIMIT_UNAVAILABLE', 'error', 'The browser could not enable the download size guard.');
      }
    }
    const navigate = async (path: string): Promise<void> => {
      const response = await page.goto(resolveTargetUrl(path, config), { waitUntil: 'domcontentloaded', timeout: timeLeft(deadline) });
      if (response && response.status() >= 400) throw new CheckFault('HTTP_ERROR', 'error', 'The page returned an unsuccessful HTTP status.');
    };
    stage = 'navigation';
    await navigate(check.startPath);
    stage = 'actions';
    for (const action of check.steps ?? []) {
      try {
        const locator = page.locator(action.selector);
        if (action.action === 'click') await locator.click({ timeout: timeLeft(deadline) });
        else if (action.action === 'select') await locator.selectOption(action.value, { timeout: timeLeft(deadline) });
        else {
          const value = action.env === undefined ? action.value : process.env[action.env];
          if (value === undefined || (action.env !== undefined && value.length === 0)) {
            throw new CheckFault('MISSING_ENV', 'error', 'A required environment variable is missing or empty.');
          }
          await locator.fill(value, { timeout: timeLeft(deadline) });
        }
      } catch (error) {
        if (error instanceof CheckFault) throw error;
        throw new CheckFault('ACTION_ERROR', 'error', 'A configured browser action could not complete.');
      }
    }
    stage = 'assertion';
    if (check.kind === 'redirect') {
      const expected = resolveTargetUrl(check.expectedPath, config);
      try {
        await page.waitForURL(url => url.href === expected, { timeout: timeLeft(deadline, 100), waitUntil: 'domcontentloaded' });
      } catch (error) {
        if (error instanceof errors.TimeoutError) throw new CheckFault('REDIRECT_MISMATCH', 'failed', 'The final URL does not exactly match the configured destination.');
        throw error;
      }
      if (page.url() !== expected) throw new CheckFault('REDIRECT_MISMATCH', 'failed', 'The final URL does not exactly match the configured destination.');
      return { ...initialResult(check, 'passed', 'CHECK_PASSED', 'The redirect matched the configured destination.'), evidence: { exactUrlMatched: true } };
    }
    if (check.kind === 'locale') {
      await localeAssertion(page, check, deadline);
      let assertions = 1;
      if (check.reload) {
        stage = 'reload';
        const response = await page.reload({ waitUntil: 'domcontentloaded', timeout: timeLeft(deadline) });
        if (response && response.status() >= 400) throw new CheckFault('HTTP_ERROR', 'error', 'The page returned an unsuccessful HTTP status.');
        await localeAssertion(page, check, deadline); assertions++;
      }
      if (check.followPath) {
        stage = 'follow'; await navigate(check.followPath);
        await localeAssertion(page, check, deadline); assertions++;
      }
      return { ...initialResult(check, 'passed', 'CHECK_PASSED', 'The locale passed every configured stage.'), evidence: { stagesChecked: assertions, textChecked: check.text !== undefined } };
    }
    stage = 'download';
    checkDirectory = await mkdtemp(join(runDirectory, 'check-'));
    expectingDownload = true;
    const downloading = page.waitForEvent('download', { timeout: timeLeft(deadline, 100) });
    // Register a rejection handler before the click can fail.
    void downloading.catch(() => {});
    try {
      await page.locator(check.trigger).click({ timeout: timeLeft(deadline) });
    } catch {
      throw new CheckFault('ACTION_ERROR', 'error', 'The configured download trigger could not be activated.');
    }
    let download;
    try { download = await downloading; }
    catch { throw new CheckFault('DOWNLOAD_NOT_STARTED', 'failed', 'The configured action did not start a download.'); }
    const payload = join(checkDirectory, 'payload');
    try { await download.saveAs(payload); }
    catch { throw new CheckFault('DOWNLOAD_FAILED', 'error', 'The download did not complete.'); }
    if (fatal) throw fatal;
    parsing = validateDownloadedFile(payload, check, MAX_DOWNLOAD_BYTES, { signal: parserController.signal, timeoutMs: timeLeft(deadline) });
    const checked = await parsing;
    return { ...initialResult(check, checked.status, checked.code, checked.message), evidence: checked.evidence };
  };
  try {
    result = await Promise.race([perform(), timeout, faultPromise]);
    if (fatal) throw fatal;
  } catch (error) {
    const fault = fatal ?? (error instanceof CheckFault ? error : new CheckFault(
      stage === 'setup' ? 'CONTEXT_UNAVAILABLE' : error instanceof errors.TimeoutError ? 'CHECK_TIMEOUT' : 'INTERNAL_ERROR',
      'error', 'The check could not complete. No success was recorded.',
    ));
    result = initialResult(check, fault.status, fault.code, fault.message);
    result.evidence = { stage };
  } finally {
    stopped = true;
    parserController.abort();
    if (timer) clearTimeout(timer);
    browserCdp.off('Browser.downloadWillBegin', willDownload);
    browserCdp.off('Browser.downloadProgress', progress);
    browserCdp.off('Target.targetCreated', workerCreated);
    let cleanupFailed = false;
    for (const cleanup of [
      () => parsing,
      () => context?.close(), () => proxy?.close(),
      () => checkDirectory ? rm(checkDirectory, { recursive: true, force: true }) : undefined,
    ]) {
      try { await cleanup(); } catch { cleanupFailed = true; }
    }
    if (cleanupFailed) {
      result = initialResult(check, 'error', 'CLEANUP_FAILED', 'The temporary check environment could not be completely removed.');
    }
  }
  result!.durationMs = Math.max(0, Date.now() - started);
  return result!;
}

export async function runChecks(
  input: Config, options: { executablePath?: string } = {},
): Promise<RunReport> {
  const config = validateConfig(input);
  const startedAt = new Date().toISOString();
  const results: Array<CheckResult | undefined> = config.checks.map(check => {
    if (check.enabled === false) return initialResult(check, 'skipped', 'CHECK_DISABLED', 'This check is disabled.');
    if ((check.steps ?? []).some(action => action.action === 'fill' && action.env !== undefined && !process.env[action.env])) {
      return initialResult(check, 'error', 'MISSING_ENV', 'A required environment variable is missing or empty.');
    }
    return undefined;
  });
  let browser: Browser | undefined;
  let runDirectory: string | undefined;
  let browserVersion = 'unavailable';
  let cleanupFailed = false;
  try {
    if (results.some(value => value === undefined)) {
      runDirectory = await mkdtemp(join(tmpdir(), 'nomvex-toolbox-'));
      const downloadsDirectory = join(runDirectory, 'downloads');
      await mkdir(downloadsDirectory, { mode: 0o700 });
      browser = await chromium.launch({
        headless: true, downloadsPath: downloadsDirectory,
        // Browser startup has its own budget; timeoutMs starts in checkOne.
        timeout: 30_000,
        ...(options.executablePath ? { executablePath: options.executablePath } : {}),
        args: ['--disable-quic', '--disable-background-networking', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'],
      });
      browserVersion = browser.version();
      const browserCdp = await browser.newBrowserCDPSession();
      await browserCdp.send('Target.setDiscoverTargets', {
        discover: true,
        filter: [{ type: 'worker' }, { type: 'shared_worker' }, { type: 'service_worker' }, { exclude: true }],
      });
      let next = 0;
      const worker = async (): Promise<void> => {
        while (next < config.checks.length) {
          const index = next++;
          if (results[index] !== undefined) continue;
          try {
            results[index] = await checkOne(browser!, browserCdp, config.checks[index]!, config, downloadsDirectory, runDirectory!);
          } catch {
            // A worker never escapes and leaves other workers mutating a returned report.
            results[index] = initialResult(config.checks[index]!, 'error', 'INTERNAL_ERROR', 'The check could not complete. No success was recorded.');
          }
        }
      };
      const concurrency = Math.min(4, Math.max(1, config.concurrency ?? 1), config.checks.length);
      await Promise.all(Array.from({ length: concurrency }, worker));
    }
  } catch {
    for (let index = 0; index < config.checks.length; index++) {
      if (results[index] === undefined) results[index] = initialResult(config.checks[index]!, 'error', 'BROWSER_UNAVAILABLE', 'The browser environment could not start or stopped unexpectedly.');
    }
  } finally {
    try { await browser?.close(); } catch { cleanupFailed = true; }
    if (runDirectory) {
      try { await rm(runDirectory, { recursive: true, force: true }); } catch { cleanupFailed = true; }
    }
  }
  const finished = results as CheckResult[];
  if (cleanupFailed) {
    for (const result of finished) {
      result.evidence = { ...result.evidence, cleanupFailed: true };
      if (result.status === 'passed') {
        result.status = 'error'; result.code = 'CLEANUP_FAILED';
        result.message = 'The temporary browser environment could not be completely removed.';
      }
    }
  }
  const summary: RunReport['summary'] = { passed: 0, failed: 0, error: 0, skipped: 0, total: finished.length };
  for (const result of finished) {
    summary[result.status]++;
    result.message = diagnosticMessage(result.code, config.language ?? 'fr');
  }
  return {
    schemaVersion: 1, toolVersion: '0.1.2', startedAt, finishedAt: new Date().toISOString(),
    baseUrl: safeUrl(config.baseUrl), language: config.language ?? 'fr',
    environment: { node: process.version, platform: process.platform, browser: browserVersion },
    summary, results: finished,
  };
}
