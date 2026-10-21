import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { TextDecoder } from 'node:util';
import { parentPort, workerData } from 'node:worker_threads';
import { parse } from 'csv-parse/sync';
import { PDFDocument } from 'pdf-lib';
import { MAX_DOWNLOAD_BYTES, type DownloadValidation, type ValidationSpec } from './downloads.js';

/** Validate bytes, never filenames or a server-supplied MIME type alone. */
async function validateDownloadedFile(
  filePath: string,
  check: ValidationSpec,
  maxBytes: number = MAX_DOWNLOAD_BYTES,
): Promise<DownloadValidation> {
  const ceiling = Math.min(MAX_DOWNLOAD_BYTES, Math.max(1, Math.floor(maxBytes)));
  const evidence: DownloadValidation['evidence'] = { format: check.format };
  const result = (
    status: DownloadValidation['status'], code: string, message: string,
  ): DownloadValidation => ({ status, code, message, evidence });
  let bytes: Buffer;
  try {
    // O_NOFOLLOW protects this exported helper as well as our private temp files.
    const file = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const info = await file.stat();
      if (!info.isFile()) return result('error', 'FILE_READ_ERROR', 'The download is not a regular file.');
      evidence.bytes = info.size;
      if (info.size > ceiling) return result('failed', 'DOWNLOAD_TOO_LARGE', 'The download exceeds the permitted size.');
      if (info.size < Math.max(1, check.minBytes ?? 1)) {
        return result('failed', 'DOWNLOAD_TOO_SMALL', 'The download is empty or smaller than required.');
      }
      // Read at most the limit plus one byte, even if a file changes after stat.
      const buffer = Buffer.alloc(ceiling + 1);
      let count = 0;
      while (count < buffer.length) {
        const read = await file.read(buffer, count, buffer.length - count, count);
        if (read.bytesRead === 0) break;
        count += read.bytesRead;
      }
      evidence.bytes = count;
      if (count > ceiling) return result('failed', 'DOWNLOAD_TOO_LARGE', 'The download exceeds the permitted size.');
      if (count < Math.max(1, check.minBytes ?? 1)) {
        return result('failed', 'DOWNLOAD_TOO_SMALL', 'The download is empty or smaller than required.');
      }
      bytes = buffer.subarray(0, count);
    } finally {
      await file.close();
    }
  } catch {
    return result('error', 'FILE_READ_ERROR', 'The downloaded file could not be read safely.');
  }

  if (check.format === 'pdf') {
    const header = bytes.subarray(0, 8).toString('latin1');
    const ending = bytes.subarray(Math.max(0, bytes.length - 1024)).toString('latin1');
    if (!/^%PDF-\d\.\d/.test(header) || !/%%EOF\s*$/.test(ending)) {
      return result('failed', 'PDF_INVALID', 'The download is not a complete PDF.');
    }
    try {
      const document = await PDFDocument.load(bytes, {
        ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true,
      });
      const pages = document.getPageCount();
      if (pages < 1) return result('failed', 'PDF_INVALID', 'The PDF has no readable pages.');
      evidence.pages = pages;
      return result('passed', 'CHECK_PASSED', 'The downloaded PDF passed the configured checks.');
    } catch {
      return result('failed', 'PDF_INVALID', 'The PDF could not be parsed or requires a password.');
    }
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) return result('failed', 'TEXT_INVALID', 'The download contains binary data.');
  } catch {
    return result('failed', 'TEXT_INVALID', 'The download is not valid UTF-8 text.');
  }
  // A UTF-8 BOM contributes bytes but is removed by decoding. It is not content.
  if (text.length === 0) return result('failed', 'DOWNLOAD_TOO_SMALL', 'The downloaded text is empty after decoding.');
  if (check.expectedText !== undefined && !text.includes(check.expectedText)) {
    return result('failed', 'TEXT_MISMATCH', 'The downloaded text does not contain the required text.');
  }
  evidence.expectedTextChecked = check.expectedText !== undefined;

  if (check.format === 'json') {
    let value: unknown;
    try {
      value = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch {
      return result('failed', 'JSON_INVALID', 'The download is not valid JSON.');
    }
    const keys = check.requiredKeys ?? [];
    if (keys.length > 0 && (
      value === null || typeof value !== 'object' || Array.isArray(value)
      || !keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
    )) {
      return result('failed', 'JSON_KEYS_MISSING', 'The JSON does not contain all required top-level keys.');
    }
    evidence.requiredKeysChecked = keys.length;
    return result('passed', 'CHECK_PASSED', 'The downloaded JSON passed the configured checks.');
  }

  if (check.format === 'csv') {
    try {
      // HTML error pages can otherwise parse as a technically valid one-column CSV.
      if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text)) {
        return result('failed', 'CSV_INVALID', 'The download is an HTML page instead of CSV.');
      }
      const records = parse(text, {
        bom: true, skip_empty_lines: true, relax_column_count: false,
        max_record_size: ceiling, cast: false,
      }) as string[][];
      if (records.length === 0 || records[0]!.length === 0 || records[0]!.every(cell => cell.trim() === '')) {
        return result('failed', 'CSV_INVALID', 'The CSV has no usable header row.');
      }
      const headers = records[0]!;
      if (check.csvHeaders && (
        headers.length !== check.csvHeaders.length
        || !headers.every((header, index) => header === check.csvHeaders![index])
      )) {
        return result('failed', 'CSV_HEADERS_MISMATCH', 'The CSV headers do not exactly match the configured order.');
      }
      evidence.columns = headers.length;
      evidence.dataRows = records.length - 1;
      return result('passed', 'CHECK_PASSED', 'The downloaded CSV passed the configured checks.');
    } catch {
      return result('failed', 'CSV_INVALID', 'The download is not a consistently structured CSV.');
    }
  }

  return result('passed', 'CHECK_PASSED', 'The downloaded text passed the configured checks.');
}

// Only controlled outcomes cross the worker boundary. Third-party parser logs
// are discarded by the parent so malformed file content cannot enter reports.
if (parentPort) {
  const { filePath, check, maxBytes } = workerData as { filePath: string; check: ValidationSpec; maxBytes: number };
  const port = parentPort;
  void validateDownloadedFile(filePath, check, maxBytes).then(
    result => { port.postMessage(result); port.close(); },
    () => {
      port.postMessage({ status: 'error', code: 'PARSER_ERROR', message: 'The isolated file parser could not complete.', evidence: { format: check.format } });
      port.close();
    },
  );
}
