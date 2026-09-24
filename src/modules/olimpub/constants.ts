import { useMasterDataStore } from 'src/stores/masterData';
import { eventTypeHasOpFlag, eventTypeIdOf as typeIdOf } from './opData';

export { eventTypeHasOpFlag };

/** Csak fallback, amíg a típus nincs a masterben. A döntés: EventTypes.OPFlg. */
export const OP_EVENT_TYPE_ID = 43;

export const OP_DURATION_MINUTES = [60, 90, 120, 150, 180, 210, 240] as const;

export function eventTypeIdOf(event: Record<string, unknown> | null | undefined): number | null {
  return typeIdOf(event);
}

export function isOlimpubEventType(eventTypeId: number | string | null | undefined): boolean {
  if (eventTypeId == null || eventTypeId === '') return false;
  const n = Number(eventTypeId);
  if (!Number.isFinite(n)) return false;
  const type = useMasterDataStore().getEventTypeById(n);
  if (type) return eventTypeHasOpFlag(type as Record<string, unknown>);
  return n === OP_EVENT_TYPE_ID;
}

export function isOlimpubRouteName(name: unknown): boolean {
  return String(name || '').startsWith('olimpub-');
}

export const OP_QUESTION_TYPES = [
  { code: 'single', label: 'Egyválasztós', timeSec: 20 },
  { code: 'multi', label: 'Többválasztós', timeSec: 25 },
  { code: 'order', label: 'Sorrendezés', timeSec: 30 },
  { code: 'match', label: 'Párosítás', timeSec: 30 },
  { code: 'category', label: 'Kategorizálás', timeSec: 30 },
  { code: 'freetext', label: 'Szabad szöveg', timeSec: 40 },
] as const;

export type OpQuestionTypeCode = (typeof OP_QUESTION_TYPES)[number]['code'];

const TYPE_ALIASES: Record<string, OpQuestionTypeCode> = {
  single: 'single',
  egyvalasztos: 'single',
  egyválasztós: 'single',
  'egy valasztos': 'single',
  feleletvalasztos: 'single',
  multi: 'multi',
  tobbvalasztos: 'multi',
  többválasztós: 'multi',
  'tobb valasztos': 'multi',
  order: 'order',
  sorrendezes: 'order',
  sorrendezés: 'order',
  sorrendezo: 'order',
  match: 'match',
  parositas: 'match',
  párosítás: 'match',
  parosito: 'match',
  pairing: 'match',
  category: 'category',
  kategorizalas: 'category',
  kategorizálás: 'category',
  kategorizalos: 'category',
  kategorizálós: 'category',
  kategoria: 'category',
  freetext: 'freetext',
  szabad: 'freetext',
  'szabad szoveg': 'freetext',
  'szabad szöveg': 'freetext',
  szabadszoveg: 'freetext',
  'free text': 'freetext',
  text: 'freetext',
};

function foldTypeKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const TYPE_FOLD: Record<string, OpQuestionTypeCode> = {};
for (const [alias, code] of Object.entries(TYPE_ALIASES)) {
  TYPE_FOLD[foldTypeKey(alias)] = code;
}
for (const row of OP_QUESTION_TYPES) {
  TYPE_FOLD[foldTypeKey(row.code)] = row.code;
  TYPE_FOLD[foldTypeKey(row.label)] = row.code;
}

export function normalizeOpTypeCode(raw: string): OpQuestionTypeCode | null {
  const folded = foldTypeKey(raw);
  if (!folded) return null;
  if (TYPE_FOLD[folded]) return TYPE_FOLD[folded];
  const keys = Object.keys(TYPE_FOLD).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length < 6) continue;
    if (folded.includes(key)) return TYPE_FOLD[key];
  }
  return null;
}

export function opTypeLabel(code: string): string {
  return OP_QUESTION_TYPES.find((row) => row.code === code)?.label || code || 'Kérdés';
}

export function opTypeIcon(code: string): string {
  const key = String(code || '').toLowerCase();
  if (key === 'single') return 'sym_r_radio_button_checked';
  if (key === 'multi') return 'sym_r_checklist';
  if (key === 'order') return 'sym_r_format_list_numbered';
  if (key === 'match') return 'sym_r_join_inner';
  if (key === 'category') return 'sym_r_account_tree';
  if (key === 'freetext') return 'sym_r_text_fields';
  return 'sym_r_help';
}

export function opDefaultTimeSec(code: string): number {
  return OP_QUESTION_TYPES.find((row) => row.code === code)?.timeSec ?? 20;
}

export function opRoundStatusLabel(code: string): string {
  const key = String(code || '').toLowerCase();
  if (key === 'active') return 'Folyamatban';
  if (key === 'closed') return 'Lezárva';
  if (key === 'published') return 'Közzétéve';
  return 'Előkészítés';
}

export function opQuestionStatusLabel(code: string): string {
  const key = String(code || '').toLowerCase();
  if (key === 'active') return 'Élő';
  if (key === 'stopped') return 'Leállítva';
  return 'Vár';
}
