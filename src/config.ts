import { z } from 'zod';
import type { Config } from './types.js';

const MAX_BYTES = 10 * 1024 * 1024;
const shortText = z.string().min(1).max(500);
const selector = z.string().min(1).max(1000);
const path = z.string().min(1).max(2048);
const action = z.union([
  z.strictObject({ action: z.literal('click'), selector }),
  z.strictObject({
    action: z.literal('fill'), selector,
    value: z.string().max(8192).optional(),
    env: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/).optional(),
  }).refine(v => (v.value !== undefined) !== (v.env !== undefined)),
  z.strictObject({ action: z.literal('select'), selector, value: z.string().max(500) }),
]);
const common = {
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/),
  startPath: path,
  steps: z.array(action).max(20).optional(),
  enabled: z.boolean().optional(),
};
const check = z.union([
  z.strictObject({ ...common, kind: z.literal('redirect'), expectedPath: path }),
  z.strictObject({
    ...common, kind: z.literal('locale'),
    expectedLang: z.string().regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/).max(64),
    text: z.strictObject({ selector, includes: shortText }).optional(),
    reload: z.boolean().default(true), followPath: path.optional(),
  }),
  z.strictObject({
    ...common, kind: z.literal('download'), trigger: selector,
    format: z.enum(['pdf', 'json', 'csv', 'text']),
    minBytes: z.number().int().min(1).max(MAX_BYTES).optional(),
    expectedText: shortText.optional(),
    requiredKeys: z.array(shortText).min(1).max(100).optional(),
    csvHeaders: z.array(shortText).min(1).max(100).optional(),
  }).refine(v =>
    (v.format !== 'pdf' || v.expectedText === undefined) &&
    (v.format === 'json' || v.requiredKeys === undefined) &&
    (v.format === 'csv' || v.csvHeaders === undefined)),
]);

export const configSchema = z.strictObject({
  version: z.literal(1), baseUrl: z.string().min(1).max(2048),
  allowedOrigins: z.array(z.string().min(1).max(2048)).max(20).optional(),
  timeoutMs: z.number().int().min(500).max(60000).default(15000),
  concurrency: z.number().int().min(1).max(4).default(2),
  language: z.enum(['fr', 'en']).default('fr'),
  checks: z.array(check).min(1).max(50),
});

export class ConfigError extends Error {
  readonly code = 'INVALID_CONFIG';
  constructor(readonly fields: string[] = []) {
    super('Invalid configuration. Check the schema and approved origins.');
    this.name = 'ConfigError';
  }
}

function parseHttpUrl(raw: string): URL {
  if (/[\s\\\u0000-\u001f\u007f]/u.test(raw)) throw new ConfigError(['url']);
  let url: URL;
  try { url = new URL(raw); } catch { throw new ConfigError(['url']); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ConfigError(['url']);
  }
  return url;
}

function parseOrigin(raw: string): string {
  const url = parseHttpUrl(raw);
  if (url.pathname !== '/' || url.search || url.hash) throw new ConfigError(['baseUrl', 'allowedOrigins']);
  return url.origin;
}

/** Resolves only HTTP(S) URLs on the configured exact origins. Never adds origins implicitly. */
export function resolveTargetUrl(raw: string, config: Config): string {
  if ((!raw.startsWith('/') && !/^https?:\/\//i.test(raw)) || raw.startsWith('//')) {
    throw new ConfigError(['checks.path']);
  }
  const baseOrigin = parseOrigin(config.baseUrl);
  const url = parseHttpUrl(raw.startsWith('/') ? `${baseOrigin}${raw}` : raw);
  const allowed = new Set([baseOrigin, ...(config.allowedOrigins ?? []).map(parseOrigin)]);
  if (!allowed.has(url.origin)) throw new ConfigError(['checks.path']);
  return url.href;
}

/** Reports deliberately retain only the origin; paths, credentials, queries and fragments can contain secrets. */
export function safeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '[redacted]';
  } catch { return '[redacted]'; }
}

export function validateConfig(input: unknown): Config {
  const result = configSchema.safeParse(input);
  if (!result.success) {
    // Do not expose Zod messages/received values; configuration may include secrets.
    const fields = [...new Set(result.error.issues.map(issue => issue.path
      .map(part => typeof part === 'number' ? String(part) : /^[A-Za-z][A-Za-z0-9]*$/.test(String(part)) ? String(part) : 'field')
      .join('.') || 'configuration'))];
    throw new ConfigError(fields.slice(0, 8));
  }
  const config: Config = result.data;
  config.baseUrl = parseOrigin(config.baseUrl);
  config.allowedOrigins = [...new Set((config.allowedOrigins ?? []).map(parseOrigin))];
  const ids = new Set<string>();
  for (const item of config.checks) {
    if (ids.has(item.id)) throw new ConfigError(['checks.id']);
    ids.add(item.id);
    resolveTargetUrl(item.startPath, config);
    if (item.kind === 'redirect') resolveTargetUrl(item.expectedPath, config);
    if (item.kind === 'locale' && item.followPath) resolveTargetUrl(item.followPath, config);
  }
  return config;
}
