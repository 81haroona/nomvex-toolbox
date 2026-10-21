import type { Language, RunReport } from './types.js';
import { NOMVEX_MARK_DATA_URI } from './branding.js';

const messages: Record<string, [string, string]> = {
  CHECK_PASSED: ['Les assertions configurées sont satisfaites.', 'The configured assertions passed.'],
  CHECK_DISABLED: ['Contrôle désactivé : couverture incomplète.', 'Check disabled: coverage is incomplete.'],
  MISSING_ENV: ['Une variable d’environnement requise est absente.', 'A required environment variable is missing.'],
  BROWSER_UNAVAILABLE: ['Chromium ne peut pas démarrer. Vérifiez son installation.', 'Chromium could not start. Check its installation.'],
  CONTEXT_UNAVAILABLE: ['Impossible de créer une session isolée.', 'An isolated browser session could not be created.'],
  CHECK_TIMEOUT: ['Le délai maximal du contrôle a été dépassé.', 'The check exceeded its time limit.'],
  ORIGIN_BLOCKED: ['Une requête vers une origine non autorisée a été bloquée.', 'A request to an unapproved origin was blocked.'],
  NETWORK_ERROR: ['La cible est inaccessible ou la connexion a échoué.', 'The target is unavailable or the connection failed.'],
  HTTP_ERROR: ['La cible a renvoyé une erreur HTTP.', 'The target returned an HTTP error.'],
  ACTION_ERROR: ['Une interaction configurée a échoué.', 'A configured interaction failed.'],
  REDIRECT_MISMATCH: ['La destination après interaction ne correspond pas à celle attendue.', 'The destination after the interaction differs from the expected URL.'],
  LOCALE_MISMATCH: ['La langue déclarée ne correspond pas à celle attendue.', 'The declared language differs from the expected language.'],
  LOCALE_TEXT_MISMATCH: ['Le texte attendu est absent de la zone contrôlée.', 'The expected text is missing from the checked element.'],
  DOWNLOAD_NOT_STARTED: ['Le téléchargement attendu n’a pas démarré.', 'The expected download did not start.'],
  DOWNLOAD_FAILED: ['Le téléchargement n’a pas abouti.', 'The download did not complete.'],
  DOWNLOAD_TOO_LARGE: ['Le fichier dépasse la limite de 10 Mio.', 'The file exceeds the 10 MiB limit.'],
  DOWNLOAD_TOO_SMALL: ['Le fichier est vide ou trop petit.', 'The file is empty or too small.'],
  PDF_INVALID: ['Le PDF n’est pas lisible ou ne contient aucune page.', 'The PDF could not be parsed or contains no pages.'],
  JSON_INVALID: ['Le fichier ne contient pas de JSON valide.', 'The file does not contain valid JSON.'],
  JSON_KEYS_MISSING: ['Des clés JSON attendues sont absentes.', 'Expected JSON keys are missing.'],
  CSV_INVALID: ['Le CSV ne respecte pas la syntaxe attendue.', 'The CSV does not meet the expected syntax.'],
  CSV_HEADERS_MISMATCH: ['Les en-têtes CSV ne correspondent pas.', 'The CSV headers do not match.'],
  TEXT_INVALID: ['Le contenu texte n’est pas du UTF-8 valide.', 'The text is not valid UTF-8.'],
  TEXT_MISMATCH: ['Le fichier ne contient pas le texte attendu.', 'The file does not contain the expected text.'],
  FILE_READ_ERROR: ['Le fichier temporaire n’a pas pu être lu.', 'The temporary file could not be read.'],
  INTERNAL_ERROR: ['Le contrôle a rencontré une erreur interne.', 'The check encountered an internal error.'],
  RESOURCE_LIMIT: ['Le contrôle a atteint une limite de ressources.', 'The check reached a resource limit.'],
  CLEANUP_FAILED: ['Le nettoyage des ressources a échoué.', 'Resource cleanup failed.'],
  DOWNLOAD_LIMIT_UNAVAILABLE: ['La limite de téléchargement n’a pas pu être activée.', 'The download size limit could not be enabled.'],
  PARSER_ERROR: ['Le processus d’analyse du fichier n’a pas pu aboutir.', 'The file parser could not complete.'],
  WORKER_UNSUPPORTED: ['Ce parcours utilise un Web Worker non pris en charge par cette version.', 'This journey uses a Web Worker that this version does not support.'],
};
const labels = {
  fr: {
    title: 'Rapport de vérification', subtitle: 'Redirections · Langues · Exports',
    passed: 'Réussis', failed: 'Échecs', error: 'Erreurs', skipped: 'Ignorés',
    allGood: 'Tous les contrôles ont réussi', incomplete: 'Vérification incomplète',
    failedTitle: 'Des comportements doivent être corrigés',
    target: 'Origine contrôlée', started: 'Début', duration: 'Durée',
    check: 'Contrôle', result: 'Résultat', evidence: 'Preuves techniques',
    redirect: 'Redirection', locale: 'Langue', download: 'Export',
    limits: 'Ce rapport porte uniquement sur les assertions configurées. Il ne prouve ni la sécurité générale du site, ni la qualité visuelle des PDF, ni la traduction de toutes les pages.',
    local: 'Rapport local · Aucun service analytique · Données sensibles exclues par défaut',
    unknown: 'Consultez le code de diagnostic.',
  },
  en: {
    title: 'Verification report', subtitle: 'Redirects · Languages · Exports',
    passed: 'Passed', failed: 'Failed', error: 'Errors', skipped: 'Skipped',
    allGood: 'All checks passed', incomplete: 'Verification is incomplete',
    failedTitle: 'Some behavior needs to be fixed',
    target: 'Checked origin', started: 'Started', duration: 'Duration',
    check: 'Check', result: 'Result', evidence: 'Technical evidence',
    redirect: 'Redirect', locale: 'Language', download: 'Export',
    limits: 'This report covers only the configured assertions. It does not establish overall site security, visual PDF quality, or complete translation of every page.',
    local: 'Local report · No analytics service · Sensitive values excluded by default',
    unknown: 'See the diagnostic code.',
  },
};

export function diagnosticMessage(code: string, language: Language): string {
  return messages[code]?.[language === 'fr' ? 0 : 1] ?? labels[language].unknown;
}

export function exitCode(report: RunReport): 0 | 1 | 2 {
  if (!Array.isArray(report.results) || !report.results.length) return 2;
  const statuses = ['passed', 'failed', 'error', 'skipped'];
  if (report.results.some(r => !r || !statuses.includes(r.status))) return 2;
  if (report.summary?.total !== report.results.length || statuses.some(status =>
    report.summary[status as keyof typeof report.summary] !== report.results.filter(r => r.status === status).length)) return 2;
  if (report.results.some(r => r.status === 'error' || r.status === 'skipped')) return 2;
  return report.results.some(r => r.status === 'failed') ? 1 : 0;
}

export function localizeReport(report: RunReport, language: Language): RunReport {
  return { ...report, language, results: report.results.map(result => ({
    ...result, message: diagnosticMessage(result.code, language),
  })) };
}

const escape = (value: unknown): string => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

export function renderHtml(report: RunReport): string {
  const lang = report.language === 'en' ? 'en' : 'fr';
  const t = labels[lang];
  const code = exitCode(report);
  const title = code === 0 ? t.allGood : code === 1 ? t.failedTitle : t.incomplete;
  const counts = (['passed', 'failed', 'error', 'skipped'] as const).map(status =>
    `<div class="metric ${status}"><span>${t[status]}</span><strong>${escape(report.summary[status])}</strong></div>`).join('');
  const rows = report.results.map(result => {
    const status = ['passed', 'failed', 'error', 'skipped'].includes(result.status) ? result.status : 'error';
    const evidence = Object.entries(result.evidence ?? {}).map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('');
    return `<article class="check"><div class="check-top"><div><p class="kind">${escape(t[result.kind] ?? result.kind)}</p><h2>${escape(result.id)}</h2></div><span class="badge ${status}">${t[status]}</span></div><p>${escape(diagnosticMessage(result.code, lang))}</p><div class="check-meta"><code>${escape(result.code)}</code><span>${escape(result.durationMs)} ms</span></div>${evidence ? `<details><summary>${t.evidence}</summary><dl>${evidence}</dl></details>` : ''}</article>`;
  }).join('');
  const elapsed = Math.max(0, Date.parse(report.finishedAt) - Date.parse(report.startedAt));
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>NOMVEX — ${t.title}</title><style>
:root{color-scheme:light;--ink:#102a35;--muted:#526670;--line:#dce5e7;--teal:#076f65;--bg:#f3f7f7}*{box-sizing:border-box}body{margin:0;background:var(--bg);font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink)}header{background:#092e37;color:#fff;padding:36px max(24px,calc((100vw - 1080px)/2));border-bottom:5px solid #45d2b0}.brand{display:flex;align-items:center;gap:16px;font-weight:800;letter-spacing:.2em;font-size:19px}.brand-mark{display:block;width:64px;height:64px;flex:0 0 64px;object-fit:contain}.brand-copy{min-width:0;overflow-wrap:anywhere}.brand small{font-size:11px;letter-spacing:.14em;color:#99e5d5;margin-left:18px}h1{font-size:clamp(28px,4vw,44px);line-height:1.15;margin:24px 0 8px;letter-spacing:-.025em}header p{margin:0;color:#c7d8dc}main{max-width:1128px;margin:auto;padding:28px 24px 48px}.verdict{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 24px;background:#fff;border:1px solid var(--line);border-radius:14px}.verdict h2{font-size:20px;margin:0}.verdict p{margin:5px 0 0;color:var(--muted);overflow-wrap:anywhere}.dot{width:14px;height:14px;border-radius:50%;background:${code === 0 ? '#087a59' : code === 1 ? '#ba3f36' : '#a46900'};flex-shrink:0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:22px 0}.metric{padding:18px 22px;background:#fff;border:1px solid var(--line);border-radius:12px}.metric span{display:block;font-size:13px;font-weight:650}.metric strong{display:block;font-size:36px;line-height:1.25;margin-top:4px}.passed{color:#066743}.failed{color:#a12c2c}.error{color:#855600}.skipped{color:#53606d}.meta{display:flex;flex-wrap:wrap;gap:10px 25px;font-size:13px;color:var(--muted);margin:12px 0 26px}.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.check{background:white;border:1px solid var(--line);border-radius:12px;padding:22px;min-width:0}.check-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.kind{text-transform:uppercase;font-size:11px;letter-spacing:.12em;color:var(--muted);font-weight:700;margin:0 0 5px}.check h2{font-size:18px;margin:0;overflow-wrap:anywhere}.check>p{font-size:14px;color:var(--muted);margin:15px 0}.badge{font-size:11px;font-weight:750;border:1px solid currentColor;border-radius:99px;padding:3px 10px;white-space:nowrap}.check-meta{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;font-size:11px;color:var(--muted)}code{font-family:ui-monospace,monospace;overflow-wrap:anywhere}details{margin-top:15px;border-top:1px solid var(--line);padding-top:12px;font-size:12px}summary{cursor:pointer;color:var(--teal);font-weight:650}summary:focus-visible{outline:3px solid #69c9b3;outline-offset:4px}dl{margin:12px 0 0}dl div{display:flex;justify-content:space-between;gap:16px;padding:4px 0}dt,dd{margin:0;overflow-wrap:anywhere}.limits{border-left:3px solid #9db9be;padding-left:15px;color:var(--muted);font-size:13px;margin-top:28px}footer{color:var(--muted);font-size:11px;margin-top:24px}@media(max-width:650px){.brand{gap:12px}.brand-mark{width:56px;height:56px;flex-basis:56px}.metrics{grid-template-columns:repeat(2,1fr)}.checks{grid-template-columns:1fr}.brand small{display:block;margin:5px 0 0}.verdict{padding:18px}main{padding:20px 16px}header{padding:28px 20px}}@media print{body{background:#fff}.check{break-inside:avoid}header{background:#fff;color:var(--ink)}header p,.brand small{color:var(--muted)}details{display:block}.checks{grid-template-columns:1fr}}
</style></head><body><header><div class="brand"><img class="brand-mark" src="${NOMVEX_MARK_DATA_URI}" width="64" height="64" alt=""><span class="brand-copy">NOMVEX <small>WEB CHECKS / ${escape(report.toolVersion)}</small></span></div><h1>${t.title}</h1><p>${t.subtitle}</p></header><main><section class="verdict"><div><h2>${title}</h2><p>${t.target} : ${escape(report.baseUrl)}</p></div><span class="dot" aria-hidden="true"></span></section><section class="metrics" aria-label="${t.result}">${counts}</section><div class="meta"><span>${t.started} : ${escape(report.startedAt)}</span><span>${t.duration} : ${Number.isFinite(elapsed) ? elapsed : 0} ms</span><span>Node ${escape(report.environment.node)} · ${escape(report.environment.platform)} · Chromium ${escape(report.environment.browser)}</span></div><section class="checks" aria-label="${t.check}">${rows}</section><p class="limits">${t.limits}</p><footer>${t.local}</footer></main></body></html>`;
}
