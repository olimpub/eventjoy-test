/**
 * EventJoy API válaszok normalizálása.
 * Auth endpointok: Result2; user/master/event data lehet közvetlen vagy Result2 alatt.
 */

export function unwrapApiPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  raw: unknown
): T {
  if (!raw || typeof raw !== 'object') {
    return {} as T;
  }

  const data = raw as Record<string, unknown>;
  const nested = data.Result2 ?? data.result2 ?? data.Data ?? data.data;

  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    // Merge: a Result2-ben érkező új datasetek (pl. Organizations) ne vesszenek el,
    // ha a többi mező a top-levelen maradt.
    return { ...data, ...(nested as Record<string, unknown>) } as T;
  }

  return data as T;
}

/** Tömb mező keresése több lehetséges kulcs alatt (pl. RS11 / UserOrganizations). */
export function pickDataset(source: unknown, ...keys: string[]): unknown[] {
  if (!source || typeof source !== 'object') return [];

  const bag = source as Record<string, unknown>;

  for (const key of keys) {
    const val = bag[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return [val];
  }

  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  for (const [key, val] of Object.entries(bag)) {
    if (!wanted.has(key.toLowerCase())) continue;
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return [val];
  }

  return [];
}

export function hasDatasetKey(source: unknown, ...keys: string[]): boolean {
  if (!source || typeof source !== 'object') return false;
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  return Object.keys(source as Record<string, unknown>).some((k) => wanted.has(k.toLowerCase()));
}

export function warnIfDatasetMissing(
  label: string,
  rows: unknown[],
  payload: Record<string, unknown>
) {
  if (rows.length > 0) return;
  console.warn(
    `[${label}] üres — API kulcsok:`,
    Object.keys(payload).filter((k) => !['Result1', 'Result2', 'result2'].includes(k))
  );
}

export function isActiveFlag(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return value === true || value === 1 || value === '1';
}

export function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  return false;
}

/** DB id mező: üres / 0 / null → null */
export function nullableNumericId(value: unknown): number | null {
  if (value === undefined || value === null || value === '' || value === 'null') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return null;
  return num;
}

export function readApiReturnValue(raw: unknown): number {
  const data = unwrapApiPayload(raw);
  if (data.ReturnValue != null && data.ReturnValue !== '') {
    const n = Number(data.ReturnValue);
    if (Number.isFinite(n)) return n;
  }
  const result1 = data.Result1;
  const row = Array.isArray(result1) ? result1[0] : result1;
  if (row && typeof row === 'object') {
    const n = Number((row as Record<string, unknown>).ReturnValue);
    if (Number.isFinite(n)) return n;
  }
  return 1;
}

export function readApiReturnDescription(raw: unknown): string {
  const data = unwrapApiPayload(raw);
  const top = String(data.ReturnDescription ?? '').trim();
  if (top) return top;
  const result1 = data.Result1;
  const row = Array.isArray(result1) ? result1[0] : result1;
  if (row && typeof row === 'object') {
    return String((row as Record<string, unknown>).ReturnDescription ?? '').trim();
  }
  return '';
}

export function throwIfApiFailed(raw: unknown, fallback = 'A művelet sikertelen.') {
  const rv = readApiReturnValue(raw);
  if (Number.isFinite(rv) && rv < 0) {
    throw new Error(readApiReturnDescription(raw) || fallback);
  }
}

export function readCreatedEntityId(raw: unknown, ...keys: string[]): number | null {
  const wanted = keys.length ? keys : ['EventID', 'eventID', 'id'];
  const data = unwrapApiPayload(raw);
  for (const key of wanted) {
    const n = nullableNumericId(data[key]);
    if (n != null) return n;
  }
  const nested = data.Event;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    for (const key of wanted) {
      const n = nullableNumericId((nested as Record<string, unknown>)[key]);
      if (n != null) return n;
    }
  }
  const result1 = data.Result1;
  const row = Array.isArray(result1) ? result1[0] : result1;
  if (row && typeof row === 'object') {
    for (const key of wanted) {
      const n = nullableNumericId((row as Record<string, unknown>)[key]);
      if (n != null) return n;
    }
  }
  const rv = readApiReturnValue(raw);
  return rv > 1 ? rv : null;
}

export function readAxiosErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && !('response' in error)) {
    return error.message;
  }
  const response = (error as { response?: { data?: unknown } } | null)?.response;
  if (response?.data) {
    const desc = readApiReturnDescription(response.data);
    if (desc) return desc;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
