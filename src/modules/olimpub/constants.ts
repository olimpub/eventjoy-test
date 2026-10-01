import { useMasterDataStore } from 'src/stores/masterData';
import { eventTypeHasOpFlag, eventTypeIdOf as typeIdOf } from './opData';

export { eventTypeHasOpFlag };

/** Csak fallback, amíg a típus nincs a masterben. A döntés: EventTypes.OPFlg. */
export const OP_EVENT_TYPE_ID = 43;

export const OP_DURATION_MINUTES = [60, 90, 120, 150, 180, 210, 240] as const;

export const OP_PUBLIC_SITE = 'www.eventjoy.hu';

export const OP_REACT_GLYPHS = {
  heart: '❤️',
  laugh: '😂',
  fire: '🔥',
  sad: '😢',
  poop: '💩',
} as const;

export type OpReactId = keyof typeof OP_REACT_GLYPHS;

export function opReactGlyph(id: string): string {
  return OP_REACT_GLYPHS[id as OpReactId] || '';
}

export function opJoinAbsoluteUrl(): string {
  if (typeof window === 'undefined') return '/olimpub/join';
  const base = String(process.env.VUE_ROUTER_BASE || '/').replace(/\/+$/, '');
  return `${window.location.origin}${base}/olimpub/join`;
}

export const OP_EXTRA_GAMES = [
  { id: 'EG1', title: 'Párbaj', total: 5 },
  { id: 'EG2', title: 'Mozaik', total: 6 },
  { id: 'EG3', title: 'Karaoke', total: null },
  { id: 'EG4', title: 'Fordított', total: 5 },
  { id: 'EG5', title: 'Generációk', total: 5 },
  { id: 'EG6', title: 'Műsorvezető', total: 5 },
  { id: 'EG7', title: 'Filmguru', total: 5 },
  { id: 'EG8', title: 'Ki beszél?', total: 5 },
] as const;

function foldExtraKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function matchOpExtraGame(
  ...values: Array<string | null | undefined>
): (typeof OP_EXTRA_GAMES)[number] | null {
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text) continue;
    const folded = foldExtraKey(text);
    const numbered = text.toUpperCase().match(/\bEG\s*([1-8])\b/) || folded.match(/eg([1-8])/);
    if (numbered) {
      const id = `EG${numbered[1]}` as (typeof OP_EXTRA_GAMES)[number]['id'];
      const byId = OP_EXTRA_GAMES.find((row) => row.id === id);
      if (byId) return byId;
    }
    const hit = OP_EXTRA_GAMES.find((row) => {
      const title = foldExtraKey(row.title);
      const idFold = foldExtraKey(row.id);
      if (folded === idFold || folded === title) return true;
      return title.length >= 5 && folded.includes(title);
    });
    if (hit) return hit;
  }
  return null;
}

const EXTRA_TOPIC_ALIASES: Record<string, (typeof OP_EXTRA_GAMES)[number]['id']> = {
  vissza: 'EG4',
  reverse: 'EG4',
};

/** Játékkód a mezőből. A TopicName nem írja felül. */
export function explicitOpExtraGameId(value?: string | null): string | null {
  return matchOpExtraGame(value)?.id || null;
}

/** TopicName → játék, ha nincs ExtraGameId. Vissza/Reverse = Fordított. */
export function topicOpExtraGameId(topicName?: string | null): string | null {
  const folded = foldExtraKey(String(topicName || ''));
  if (!folded) return null;
  if (EXTRA_TOPIC_ALIASES[folded]) return EXTRA_TOPIC_ALIASES[folded];
  return matchOpExtraGame(topicName)?.id || null;
}

export function resolveOpExtraGameId(
  extraGameId?: string | null,
  topicName?: string | null
): string | null {
  return explicitOpExtraGameId(extraGameId) || topicOpExtraGameId(topicName);
}

export function extraRowMatchesGame(
  row: { ExtraGameId?: string | null; TopicName?: string | null },
  extraGameId: string
): boolean {
  return (explicitOpExtraGameId(row.ExtraGameId) || row.ExtraGameId) === extraGameId;
}

export function eventTypeIdOf(event: Record<string, unknown> | null | undefined): number | null {
  return typeIdOf(event);
}

export function isOlimpubEventType(eventTypeId: number | string | null | undefined): boolean {
  if (eventTypeId == null || eventTypeId === '') return false;
  const n = Number(eventTypeId);
  if (!Number.isFinite(n)) return false;
  if (n === OP_EVENT_TYPE_ID) return true;
  const type = useMasterDataStore().getEventTypeById(n);
  if (!type) return false;
  if (eventTypeHasOpFlag(type as Record<string, unknown>)) return true;
  const name = String(
    (type as { TypeName?: string; Name?: string }).TypeName ??
      (type as { Name?: string }).Name ??
      ''
  ).toLowerCase();
  return name.includes('olimpub') || name.includes('olimpu');
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
