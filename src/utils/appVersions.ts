import { api } from 'src/boot/axios';
import {
  isTruthyFlag,
  nullableNumericId,
  pickFilledDataset,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

export interface AppVersionItem {
  itemId: number;
  description: string;
  externalReference: string;
}

export interface AppVersion {
  versionId: number;
  versionNumber: string;
  releaseDate: string | null;
  summary: string;
  items: AppVersionItem[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  aacute: 'á',
  Aacute: 'Á',
  eacute: 'é',
  Eacute: 'É',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  uacute: 'ú',
  Uacute: 'Ú',
  ouml: 'ö',
  Ouml: 'Ö',
  uuml: 'ü',
  Uuml: 'Ü',
};

function looksLikeUtf8Mojibake(text: string): boolean {
  return /Ã[\u0080-\u00BF]|Å.|Ä[\u0080-\u00BF]/.test(text);
}

function repairUtf8Mojibake(text: string): string {
  if (!looksLikeUtf8Mojibake(text)) return text;
  try {
    const bytes = Uint8Array.from(Array.from(text, (ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded || text;
  } catch {
    return text;
  }
}

function decodeHtmlEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return HTML_NAMED_ENTITIES[body] ?? match;
  });
}

export function decodeDisplayText(value: string): string {
  return decodeHtmlEntities(repairUtf8Mojibake(value));
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = decodeDisplayText(String(value)).trim();
    if (text) return text;
  }
  return '';
}

function decodeJsonBytes(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const bad = (utf8.match(/\uFFFD/g) || []).length;
  if (bad === 0) return utf8;
  try {
    const win = new TextDecoder('windows-1250').decode(bytes);
    if (!win.includes('\uFFFD')) return win;
  } catch {
    /* ignore */
  }
  return utf8;
}

function parseApiBody(raw: unknown): unknown {
  if (raw instanceof ArrayBuffer) {
    return JSON.parse(decodeJsonBytes(new Uint8Array(raw)));
  }
  if (ArrayBuffer.isView(raw)) {
    return JSON.parse(decodeJsonBytes(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  }
  return raw;
}

function versionRowsFromPayload(data: Record<string, unknown>): unknown[] {
  const rows = pickFilledDataset(
    data,
    'Data',
    'data',
    'Versions',
    'versions',
    'AppVersions',
    'appVersions'
  );
  if (rows.length) return rows;
  for (const key of ['Data', 'data', 'Versions', 'versions']) {
    const val = data[key];
    if (typeof val !== 'string') continue;
    const trimmed = val.trim();
    if (!trimmed.startsWith('[')) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return [];
}

function readDate(...values: unknown[]): string | null {
  for (const value of values) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function isActive(row: Record<string, unknown>): boolean {
  const flag = row.ActiveFlg ?? row.activeFlg;
  if (flag === undefined || flag === null || flag === '') return true;
  return isTruthyFlag(flag);
}

function parseItem(row: unknown): AppVersionItem | null {
  const rec = asRecord(row);
  if (!rec || !isActive(rec)) return null;
  const description = readString(rec.Description, rec.description);
  const externalReference = readString(
    rec.ExternalReference,
    rec.externalReference,
    rec.ExternalUrl,
    rec.externalUrl
  );
  if (!description && !externalReference) return null;
  return {
    itemId: nullableNumericId(rec.ItemID ?? rec.ItemId ?? rec.itemId ?? rec.Id ?? rec.id) ?? 0,
    description,
    externalReference,
  };
}

function parseVersion(row: unknown): AppVersion | null {
  const rec = asRecord(row);
  if (!rec || !isActive(rec)) return null;
  const versionId = nullableNumericId(rec.VersionID ?? rec.VersionId ?? rec.versionId ?? rec.Id ?? rec.id);
  if (versionId == null) return null;
  const nestedRaw = rec.Items ?? rec.items ?? rec.VersionItems ?? rec.versionItems;
  const items = (Array.isArray(nestedRaw) ? nestedRaw : [])
    .map(parseItem)
    .filter((item): item is AppVersionItem => item != null);
  return {
    versionId,
    versionNumber: readString(rec.VersionNumber, rec.versionNumber, rec.Version, rec.version),
    releaseDate: readDate(rec.ReleaseDate, rec.releaseDate, rec.ReleasedAt, rec.releasedAt),
    summary: readString(rec.Summary, rec.summary, rec.ReleaseNotes, rec.releaseNotes),
    items,
  };
}

export function formatVersionLabel(versionNumber: string): string {
  const value = versionNumber.trim();
  if (!value) return '—';
  return /^v/i.test(value) ? value : `v${value}`;
}

export function formatReleaseDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sortAppVersionsNewestFirst(rows: AppVersion[]): AppVersion[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.releaseDate || '') || 0;
    const bTime = Date.parse(b.releaseDate || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.versionId - a.versionId;
  });
}

export function latestVersionLabel(rows: AppVersion[]): string {
  const newest = sortAppVersionsNewestFirst(rows)[0];
  return newest ? formatVersionLabel(newest.versionNumber) : '';
}

export async function fetchAppVersions(): Promise<AppVersion[]> {
  const response = await api.get('/app/versions', { responseType: 'arraybuffer' });
  const body = parseApiBody(response.data);
  throwIfApiFailed(body, 'A kiadások nem tölthetők.');
  const data = unwrapApiPayload(body);
  const rows = versionRowsFromPayload(data);
  const parsed = rows.map(parseVersion).filter((row): row is AppVersion => row != null);
  return sortAppVersionsNewestFirst(parsed);
}
