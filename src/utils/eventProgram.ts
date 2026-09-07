import { isActiveFlag, nullableNumericId } from 'src/utils/apiPayload';

export interface EventProgram {
  id: number;
  EventID: number;
  ProgramDateTime: string;
  ProgramName: string;
  ActiveFlg: boolean;
}

export interface EventProgramDraft {
  key: string;
  id: number | null;
  date: string;
  time: string;
  name: string;
}

export interface EventProgramDisplayItem {
  id: number;
  time: string;
  name: string;
}

export interface EventProgramDayGroup {
  dateKey: string;
  label: string;
  items: EventProgramDisplayItem[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function splitProgramDateTime(value: unknown): { date: string; time: string } {
  if (value == null || value === '') return { date: '', time: '' };
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { date: raw, time: '' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

export function localDateKeyFromIso(value: unknown): string {
  return splitProgramDateTime(value).date;
}

export function formatProgramTime(value: unknown): string {
  return splitProgramDateTime(value).time;
}

export function formatProgramDayLabel(dateKey: string): string {
  if (!dateKey) return '';
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString('hu-HU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function eventLocalDateRange(event: Record<string, unknown> | null | undefined): {
  startDate: string;
  endDate: string;
  isMultiDay: boolean;
} {
  const start = splitProgramDateTime(event?.StartAtUtc ?? event?.startAtUtc);
  const end = splitProgramDateTime(event?.EndAtUtc ?? event?.endAtUtc);
  const startDate = start.date;
  const endDate = end.date || start.date;
  return {
    startDate,
    endDate,
    isMultiDay: !!startDate && !!endDate && startDate !== endDate,
  };
}

export function sortProgramsByDateTime<T extends { ProgramDateTime: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.ProgramDateTime).getTime();
    const tb = new Date(b.ProgramDateTime).getTime();
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    if (na !== nb) return na - nb;
    return (Number((a as { id?: number }).id) || 0) - (Number((b as { id?: number }).id) || 0);
  });
}

export function groupProgramsForDisplay(
  programs: EventProgram[],
  isMultiDay: boolean
): { kind: 'flat'; items: EventProgramDisplayItem[] } | { kind: 'days'; days: EventProgramDayGroup[] } {
  const sorted = sortProgramsByDateTime(programs);
  const items = sorted.map((row) => ({
    id: row.id,
    time: formatProgramTime(row.ProgramDateTime),
    name: row.ProgramName,
  }));
  if (!isMultiDay) return { kind: 'flat', items };

  const byDay = new Map<string, EventProgramDisplayItem[]>();
  for (const row of sorted) {
    const dateKey = localDateKeyFromIso(row.ProgramDateTime);
    const list = byDay.get(dateKey) || [];
    list.push({
      id: row.id,
      time: formatProgramTime(row.ProgramDateTime),
      name: row.ProgramName,
    });
    byDay.set(dateKey, list);
  }
  const days: EventProgramDayGroup[] = [...byDay.entries()].map(([dateKey, dayItems]) => ({
    dateKey,
    label: formatProgramDayLabel(dateKey),
    items: dayItems,
  }));
  return { kind: 'days', days };
}

export function draftsFromPrograms(
  programs: EventProgram[],
  fallbackDate: string
): EventProgramDraft[] {
  const sorted = sortProgramsByDateTime(programs);
  if (!sorted.length) {
    return [emptyProgramDraft(fallbackDate)];
  }
  return sorted.map((row) => {
    const parts = splitProgramDateTime(row.ProgramDateTime);
    return {
      key: `p-${row.id}`,
      id: row.id,
      date: parts.date || fallbackDate,
      time: parts.time || '10:00',
      name: row.ProgramName,
    };
  });
}

export function emptyProgramDraft(fallbackDate: string): EventProgramDraft {
  return {
    key: crypto.randomUUID(),
    id: null,
    date: fallbackDate,
    time: '10:00',
    name: '',
  };
}

export function normalizeEventPrograms(rows: unknown[]): EventProgram[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const out: EventProgram[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const id = nullableNumericId(rec.id ?? rec.ID ?? rec.Id);
    const eventId = nullableNumericId(rec.EventID ?? rec.eventID ?? rec.EventId);
    const name = String(rec.ProgramName ?? rec.programName ?? '').trim();
    const when = String(rec.ProgramDateTime ?? rec.programDateTime ?? '').trim();
    if (id == null || eventId == null || !name || !when) continue;
    if (!isActiveFlag(rec.ActiveFlg ?? rec.activeFlg)) continue;
    out.push({
      id,
      EventID: eventId,
      ProgramDateTime: when,
      ProgramName: name,
      ActiveFlg: true,
    });
  }
  return sortProgramsByDateTime(out);
}
