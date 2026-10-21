import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const htmlEscape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function page(title, body, script = '') {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)} · NOMVEX</title><style>
  :root{font-family:system-ui,sans-serif;color:#172e2a;background:#f1f6f3}*{box-sizing:border-box}body{margin:0}header{background:#fff;border-bottom:1px solid #dbe5df;padding:22px max(24px,calc((100vw - 920px)/2));display:flex;justify-content:space-between;gap:24px}header a{color:#126548;text-decoration:none;font-weight:750;letter-spacing:.06em}header span{color:#65766d;font-size:.85rem}main{max-width:920px;margin:52px auto;padding:0 24px}article{background:white;border:1px solid #dbe5df;border-radius:18px;padding:32px;box-shadow:0 12px 40px #17382908}h1{font-size:clamp(1.7rem,4vw,2.4rem);margin:10px 0 16px;letter-spacing:-.04em}p{line-height:1.65;color:#4c6057}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.12em;font-weight:750;color:#167452}nav,.grid{display:flex;flex-wrap:wrap;gap:12px}a{color:#08724d}.button,button{display:inline-block;border:0;border-radius:9px;background:#126548;color:#fff;padding:12px 17px;text-decoration:none;font:inherit;font-weight:650;cursor:pointer}.secondary{background:#edf5ef;color:#174c37}label{display:block;font-weight:600;margin:18px 0 7px}input,select{font:inherit;border:1px solid #bdcfc3;border-radius:8px;padding:11px;width:min(100%,390px);background:#fff;color:#193b2e}small{display:block;margin-top:18px;color:#718176}.badge{display:inline-block;border-radius:50px;background:#e6f4ea;color:#21603d;padding:6px 11px;font-size:.8rem}.list{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin:24px 0}.list a{padding:16px;border:1px solid #d9e5dd;border-radius:10px;text-decoration:none;background:#f8fbf9}.warning{background:#fff7e8;color:#785a19}footer{max-width:920px;margin:24px auto;padding:0 24px;color:#65766d;font-size:.85rem}</style></head><body><header><a href="/">NOMVEX TOOLBOX</a><span>Démo locale · Local demo</span></header><main><article>${body}</article></main><footer>Données fictives uniquement. This demo contains intentionally broken examples.</footer>${script ? `<script>${script}</script>` : ''}</body></html>`;
}

function localePage(mode) {
  const script = `const mode=${JSON.stringify(mode)};const field=document.querySelector('#language');const greeting=document.querySelector('[data-testid="greeting"]');function apply(lang){document.documentElement.lang=lang;field.value=lang;greeting.textContent=lang==='en'?'Hello, your language is English.':'Bonjour, votre langue est le français.';document.querySelector('[data-testid=locale-heading]').textContent=lang==='en'?'Your language, everywhere.':'Votre langue, partout.';document.querySelector('[data-testid=locale-description]').textContent=lang==='en'?'Your choice is checked after reload and navigation.':'Le choix est vérifié après actualisation et navigation.';document.querySelector('#next-page').textContent=lang==='en'?'Next page':'Page suivante';}apply(mode==='reset'?'fr':localStorage.getItem('nomvex-language')||'fr');field.addEventListener('change',()=>{if(mode!=='volatile')localStorage.setItem('nomvex-language',field.value);apply(field.value);});`;
  return page('Langues / Languages', `<span class="eyebrow">Préférences / Preferences</span><h1 data-testid="locale-heading">Votre langue, partout.</h1><p data-testid="greeting">Bonjour, votre langue est le français.</p><label for="language">Langue / Language</label><select id="language"><option value="fr">Français</option><option value="en">English</option></select><p data-testid="locale-description">Le choix est vérifié après actualisation et navigation.</p><a id="next-page" class="button secondary" href="/locale/next">Page suivante / Next page</a>${mode === 'volatile' || mode === 'reset' ? '<small class="badge warning">Exemple volontairement défectueux / Deliberately broken example</small>' : ''}`, script);
}

function attachment(response, filename, type, content) {
  response.writeHead(200, { 'content-type': type, 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(content);
}

function hasSession(request) {
  return String(request.headers.cookie || '').split(';').some((part) => part.trim() === 'nomvex_fixture_session=demo');
}

function safeReturnPath(value) {
  return value === '/members?tab=exports' ? value : '/members';
}

/** Starts a synthetic demo. Binding to a non-loopback address is rejected. */
export async function startFixture({ port = 0, host = '127.0.0.1' } = {}) {
  if (host !== '127.0.0.1') throw new TypeError('The fixture must bind to 127.0.0.1 only.');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError('Port must be an integer from 0 to 65535.');
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  document.addPage([420, 240]).drawText('NOMVEX fixture: export verified', { x: 32, y: 175, size: 16, font });
  const pdf = Buffer.from(await document.save());
  const sockets = new Set();
  const timers = new Set();
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const send = (body, status = 200) => { response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); response.end(body); };
    const redirect = (location, cookie = false) => { response.writeHead(303, { location, 'cache-control': 'no-store', ...(cookie ? { 'set-cookie': 'nomvex_fixture_session=demo; HttpOnly; SameSite=Lax; Path=/' } : {}) }); response.end(); };
    if (request.method === 'POST' && url.pathname === '/session') {
      let bytes = 0;
      request.on('data', (chunk) => { bytes += chunk.length; if (bytes > 4096) { response.writeHead(413); response.end('Demo form too large.'); request.destroy(); } });
      request.on('end', () => { if (!response.writableEnded) redirect(url.searchParams.get('broken') === '1' ? '/dashboard' : safeReturnPath(url.searchParams.get('returnTo')), true); });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { allow: 'GET, HEAD, POST' }); response.end(); return; }
    if (url.pathname === '/') return send(page('Bienvenue', '<span class="eyebrow">Vérifier avant de publier</span><h1>Des parcours web qui tiennent leurs promesses.</h1><p>Un petit site local pour vérifier la connexion, les préférences de langue et les téléchargements. A small local site for reproducible browser checks.</p><nav><a class="button" href="/protected">Connexion / Sign in</a><a class="button secondary" href="/locale">Langues / Languages</a><a class="button secondary" href="/exports">Exports</a></nav><small>Les comptes et les documents sont fictifs. No real account or credentials are needed.</small>'));
    if (url.pathname === '/protected' || url.pathname === '/broken/protected') {
      const broken = url.pathname.startsWith('/broken/');
      const next = safeReturnPath(url.searchParams.get('returnTo'));
      if (hasSession(request)) return redirect(broken ? '/dashboard' : next);
      return redirect(`/login?returnTo=${encodeURIComponent(next)}${broken ? '&broken=1' : ''}`);
    }
    if (url.pathname === '/login') {
      const next = safeReturnPath(url.searchParams.get('returnTo'));
      const broken = url.searchParams.get('broken') === '1';
      return send(page('Connexion / Sign in', `<span class="eyebrow">Compte de démonstration</span><h1>Bienvenue dans votre espace.</h1><p>Cette connexion crée uniquement un cookie local de démonstration. Utilisez une valeur fictive.</p><form method="post" action="/session?returnTo=${encodeURIComponent(next)}${broken ? '&amp;broken=1' : ''}"><label for="email">Nom fictif / Demo name</label><input id="email" name="demo" autocomplete="off" placeholder="demo@example.invalid"><p><button id="login-button" type="submit">Ouvrir la démo / Enter demo</button></p></form><small>No password is required. Do not enter real credentials.</small>`));
    }
    if (url.pathname === '/members') {
      if (!hasSession(request)) return redirect('/login?returnTo=%2Fmembers');
      return send(page('Espace membre', '<span class="badge">Connexion vérifiée / Signed in</span><h1>Votre espace membre.</h1><p data-testid="member-greeting">Bienvenue dans la démonstration NOMVEX.</p><a class="button" href="/exports">Voir les exports / View exports</a>'));
    }
    if (url.pathname === '/dashboard') return send(page('Mauvaise destination', '<span class="badge warning">Erreur volontaire / Deliberate failure</span><h1>Mauvaise destination.</h1><p>The sign-in flow returned to a generic dashboard instead of the requested member page.</p>'));
    if (url.pathname === '/delayed') return send(page('Navigation différée', '<h1>Navigation différée.</h1><p>This fixture exercises a short asynchronous navigation.</p><button id="continue-button">Continuer / Continue</button>', "document.querySelector('#continue-button').addEventListener('click',()=>setTimeout(()=>location.assign('/delayed-destination'),250));"));
    if (url.pathname === '/delayed-destination') { const timer = setTimeout(() => { timers.delete(timer); if (!response.destroyed) redirect('/members', true); }, 100); timers.add(timer); return; }
    if (url.pathname === '/locale' || url.pathname === '/locale/next' || url.pathname === '/broken/follow-locale') return send(localePage('persistent'));
    if (url.pathname === '/broken/locale') return send(localePage('volatile'));
    if (url.pathname === '/locale/reset') return send(localePage('reset'));
    if (url.pathname === '/shared-worker-locale' || url.pathname === '/shared-wsworker.js') {
      const target = url.searchParams.get('target') || 'ws://example.invalid/';
      let parsed;
      try { parsed = new URL(target); } catch { return send(page('Invalid shared worker target', '<h1>Invalid demo target.</h1>'), 400); }
      if (!['ws:', 'wss:'].includes(parsed.protocol)) return send(page('Invalid shared worker target', '<h1>Only WebSocket targets are accepted.</h1>'), 400);
      if (url.pathname === '/shared-wsworker.js') {
        response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
        response.end(`self.onconnect=event=>{const port=event.ports[0];let finished=false;const finish=()=>{if(!finished){finished=true;port.postMessage('done');}};try{const socket=new WebSocket(${JSON.stringify(parsed.href)});socket.onerror=finish;socket.onopen=()=>{socket.close();finish();};}catch{finish();}};`);
        return;
      }
      const workerPath = `/shared-wsworker.js?target=${encodeURIComponent(parsed.href)}`;
      return send(page('Shared worker boundary', '<h1>Shared worker boundary.</h1><p data-testid="worker-status">Shared worker result pending.</p>', `const worker=new SharedWorker(${JSON.stringify(workerPath)});worker.port.onmessage=()=>{document.documentElement.lang='en';document.querySelector('[data-testid="worker-status"]').textContent='Shared worker error caught; page appears successful.';};worker.port.start();`));
    }
    if (url.pathname === '/worker-locale' || url.pathname === '/wsworker.js') {
      const target = url.searchParams.get('target') || 'ws://example.invalid/';
      let parsed;
      try { parsed = new URL(target); } catch { return send(page('Invalid worker target', '<h1>Invalid demo target.</h1>'), 400); }
      if (!['ws:', 'wss:'].includes(parsed.protocol)) return send(page('Invalid worker target', '<h1>Only WebSocket targets are accepted.</h1>'), 400);
      if (url.pathname === '/wsworker.js') {
        response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
        response.end(`let finished=false;const finish=()=>{if(!finished){finished=true;postMessage('done');}};try{const socket=new WebSocket(${JSON.stringify(parsed.href)});socket.onerror=finish;socket.onopen=()=>{socket.close();finish();};}catch{finish();}`);
        return;
      }
      const workerPath = `/wsworker.js?target=${encodeURIComponent(parsed.href)}`;
      return send(page('Dedicated worker boundary', '<h1>Dedicated worker boundary.</h1><p data-testid="worker-status">Worker result pending.</p>', `const worker=new Worker(${JSON.stringify(workerPath)});worker.onmessage=()=>{document.documentElement.lang='en';document.querySelector('[data-testid="worker-status"]').textContent='Worker error caught; page appears successful.';};`));
    }
    if (url.pathname === '/exports') return send(page('Exports', '<span class="eyebrow">Documents de démonstration</span><h1>Des fichiers à vérifier.</h1><p>Les premiers exports sont valides. Les exemples signalés servent à vérifier la détection des erreurs.</p><div class="list"><a id="good-pdf" href="/download/good.pdf">PDF valide / Valid PDF</a><a id="good-json" href="/download/good.json">JSON valide / Valid JSON</a><a id="good-csv" href="/download/good.csv">CSV avec guillemets / Quoted CSV</a><a id="good-text" href="/download/good.txt">Texte / Text</a></div><h2>Échecs volontaires / Deliberate failures</h2><div class="list"><a id="fake-pdf" href="/download/fake.pdf">HTML déguisé en PDF</a><a id="truncated-pdf" href="/download/truncated.pdf">PDF tronqué</a><a id="empty-text" href="/download/empty.txt">Fichier vide</a><a id="bad-keys" href="/download/bad-keys.json">JSON incomplet</a><a id="bad-header" href="/download/bad-header.csv">Colonnes CSV incorrectes</a><a id="large-text" href="/download/large.txt">Fichier trop volumineux</a><a id="bad-json" href="/download/bad.json">JSON invalide</a><a id="bad-csv" href="/download/bad.csv">CSV invalide</a><a id="invalid-utf8" href="/download/invalid-utf8.txt">Encodage invalide</a></div>'));
    if (url.pathname === '/slow') { const timer = setTimeout(() => { timers.delete(timer); if (!response.destroyed) send(page('Slow response', '<h1>Delayed response.</h1>')); }, 10000); timers.add(timer); return; }
    if (url.pathname === '/download/good.pdf') return attachment(response, 'report.pdf', 'application/pdf', pdf);
    if (url.pathname === '/download/fake.pdf') return attachment(response, 'report.pdf', 'application/pdf', '<html><body>Sign in to download your report.</body></html>');
    if (url.pathname === '/download/truncated.pdf') return attachment(response, 'report.pdf', 'application/pdf', pdf.subarray(0, 96));
    if (url.pathname === '/download/good.json') return attachment(response, 'report.json', 'application/json', JSON.stringify({ title: 'NOMVEX demo', items: [{ name: 'Bienvenue', count: 2 }], status: 'verified' }));
    if (url.pathname === '/download/bad-keys.json') return attachment(response, 'report.json', 'application/json', JSON.stringify({ unrelated: 'No required keys here' }));
    if (url.pathname === '/download/bad.json') return attachment(response, 'report.json', 'application/json', '{"title":');
    if (url.pathname === '/download/good.csv') return attachment(response, 'report.csv', 'text/csv; charset=utf-8', 'name,note,count\r\n"NOMVEX, demo","A ""quoted"" value",2\r\n"Équipe","Two\nlines",3\r\n');
    if (url.pathname === '/download/bad-header.csv') return attachment(response, 'report.csv', 'text/csv; charset=utf-8', 'unexpected,count\r\nExample,2\r\n');
    if (url.pathname === '/download/bad.csv') return attachment(response, 'report.csv', 'text/csv; charset=utf-8', 'name,note,count\r\n"Unclosed,quote,2\r\n');
    if (url.pathname === '/download/good.txt') return attachment(response, 'report.txt', 'text/plain; charset=utf-8', 'NOMVEX export verified.\nBonjour / Hello.\n');
    if (url.pathname === '/download/invalid-utf8.txt') return attachment(response, 'report.txt', 'text/plain; charset=utf-8', Buffer.from([0xc3, 0x28, 0xff, 0x00]));
    if (url.pathname === '/download/empty.txt') return attachment(response, 'report.txt', 'text/plain; charset=utf-8', '');
    if (url.pathname === '/download/large.txt') return attachment(response, 'report.txt', 'text/plain; charset=utf-8', Buffer.alloc(10 * 1024 * 1024 + 1, 65));
    if (url.pathname === '/external' || url.pathname === '/external-redirect') {
      const target = url.searchParams.get('target') || 'http://example.invalid/';
      let parsed;
      try { parsed = new URL(target); } catch { return send(page('Invalid target', '<h1>Invalid demo target.</h1>'), 400); }
      if (!['http:', 'https:'].includes(parsed.protocol)) return send(page('Invalid target', '<h1>Only HTTP targets are accepted.</h1>'), 400);
      if (url.pathname === '/external-redirect') { response.writeHead(302, { location: parsed.href, 'cache-control': 'no-store' }); response.end(); return; }
      return send(page('Origin boundary', `<h1>Origin boundary check.</h1><p>This link is intended to be blocked unless its origin is explicitly allowed.</p><a class="button" id="external-button" href="${htmlEscape(parsed.href)}">Continue</a>`));
    }
    return send(page('Introuvable', '<h1>Page introuvable / Not found.</h1>'), 404);
  });
  server.on('connection', (socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(); }); });
  const address = server.address();
  let closed = false;
  return {
    baseUrl: `http://${host}:${address.port}`,
    close: async () => {
      if (closed) return;
      closed = true;
      for (const timer of timers) clearTimeout(timer);
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

export function makeDemoConfig(baseUrl = 'http://127.0.0.1:4317') {
  return { version: 1, baseUrl, timeoutMs: 10000, concurrency: 2, language: 'fr', checks: [
    { id: 'auth-return', kind: 'redirect', startPath: '/protected', steps: [{ action: 'fill', selector: '#email', value: 'demo@example.invalid' }, { action: 'click', selector: '#login-button' }], expectedPath: '/members' },
    { id: 'locale-persistence', kind: 'locale', startPath: '/locale', steps: [{ action: 'select', selector: '#language', value: 'en' }], expectedLang: 'en', text: { selector: '[data-testid="greeting"]', includes: 'Hello' }, reload: true, followPath: '/locale/next' },
    { id: 'pdf-export', kind: 'download', startPath: '/exports', trigger: '#good-pdf', format: 'pdf', minBytes: 100 },
    { id: 'json-export', kind: 'download', startPath: '/exports', trigger: '#good-json', format: 'json', requiredKeys: ['title', 'items', 'status'] },
    { id: 'csv-export', kind: 'download', startPath: '/exports', trigger: '#good-csv', format: 'csv', csvHeaders: ['name', 'note', 'count'] },
    { id: 'text-export', kind: 'download', startPath: '/exports', trigger: '#good-text', format: 'text', expectedText: 'NOMVEX export verified' },
  ] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1]))) {
    process.stderr.write('Usage: node examples/fixture.mjs [--port 4317]\n');
    process.exitCode = 2;
  } else {
    const fixture = await startFixture({ port: args.length ? Number(args[1]) : 4317 });
    process.stdout.write(`NOMVEX local demo: ${fixture.baseUrl}\nSynthetic data only. Press Ctrl+C to stop.\n`);
    process.once('SIGINT', async () => { await fixture.close(); process.exitCode = 0; });
    process.once('SIGTERM', async () => { await fixture.close(); process.exitCode = 0; });
  }
}
