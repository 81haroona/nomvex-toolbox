export type CheckStatus = 'passed' | 'failed' | 'error' | 'skipped';
export type Language = 'fr' | 'en';
export type Action =
  | { action: 'click'; selector: string }
  | { action: 'fill'; selector: string; value?: string; env?: string }
  | { action: 'select'; selector: string; value: string };

interface BaseCheck {
  id: string;
  startPath: string;
  steps?: Action[];
  enabled?: boolean;
}
export interface RedirectCheck extends BaseCheck {
  kind: 'redirect';
  expectedPath: string;
}
export interface LocaleCheck extends BaseCheck {
  kind: 'locale';
  expectedLang: string;
  text?: { selector: string; includes: string };
  reload?: boolean;
  followPath?: string;
}
export interface DownloadCheck extends BaseCheck {
  kind: 'download';
  trigger: string;
  format: 'pdf' | 'json' | 'csv' | 'text';
  minBytes?: number;
  expectedText?: string;
  requiredKeys?: string[];
  csvHeaders?: string[];
}
export type Check = RedirectCheck | LocaleCheck | DownloadCheck;
export interface Config {
  version: 1;
  baseUrl: string;
  allowedOrigins?: string[];
  timeoutMs?: number;
  concurrency?: number;
  language?: Language;
  checks: Check[];
}
export interface CheckResult {
  id: string;
  kind: Check['kind'];
  status: CheckStatus;
  code: string;
  message: string;
  durationMs: number;
  evidence?: Record<string, string | number | boolean>;
}
export interface RunReport {
  schemaVersion: 1;
  toolVersion: string;
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  language: Language;
  environment: { node: string; platform: string; browser: string };
  summary: Record<CheckStatus, number> & { total: number };
  results: CheckResult[];
}
