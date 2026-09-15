import { nullableNumericId } from 'src/utils/apiPayload';

/** Hiányzó PublicFlg = publikus (régi cache / régi BE ne vegyen el típust). */
export function isPublicEventType(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return true;
  const flag = row.PublicFlg ?? row.publicFlg;
  if (flag === undefined || flag === null || flag === '') return true;
  return flag === true || flag === 1 || flag === '1';
}

export function normalizeOwnedEventTypeIds(rows: unknown[]): number[] {
  const ids = new Set<number>();
  for (const row of rows || []) {
    if (typeof row === 'number' && Number.isFinite(row) && row > 0) {
      ids.add(row);
      continue;
    }
    if (typeof row === 'string') {
      const num = Number(row.trim());
      if (Number.isFinite(num) && num > 0) ids.add(num);
      continue;
    }
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const id = nullableNumericId(
      rec.EventTypeID ?? rec.eventTypeID ?? rec.EventTypeId ?? rec.id ?? rec.ID
    );
    if (id != null && id > 0) ids.add(id);
  }
  return [...ids];
}

export function userCanCreateEventType(
  type: Record<string, unknown> | null | undefined,
  ownedIds: number[]
): boolean {
  if (!type) return false;
  if (isPublicEventType(type)) return true;
  const id = nullableNumericId(type.id ?? type.EventTypeID ?? type.eventTypeID ?? type.EventTypeId);
  return id != null && ownedIds.includes(id);
}
