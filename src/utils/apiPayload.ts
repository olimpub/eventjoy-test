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
