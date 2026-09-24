import { isTruthyFlag, nullableNumericId } from 'src/utils/apiPayload';
import { normalizeOpTypeCode } from './constants';

export function eventTypeHasOpFlag(eventType: Record<string, unknown> | null | undefined): boolean {
  if (!eventType) return false;
  return isTruthyFlag(eventType.OPFlg ?? eventType.OpFlg ?? eventType.opFlg);
}

export function eventTypeIdOf(event: Record<string, unknown> | null | undefined): number | null {
  if (!event) return null;
  const raw = event.EventTypeID ?? event.eventTypeId ?? event.EventTypeId;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface OpCatalogItem {
  id: number;
  Name: string;
  ImageUrl: string | null;
  ActiveFlg: boolean;
}

export interface OpEventSettings {
  EventID: number;
  DeskCountHint: number | null;
  MaxTeamSize: number;
  PlannedDurationMin: number;
  ShadowAwardFlg: boolean;
  TopicIds: number[];
  ExtraGameIds: string[];
  KabalaIds: number[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseIdList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => nullableNumericId(typeof item === 'object' && item ? (item as Record<string, unknown>).id ?? (item as Record<string, unknown>).ID ?? item : item))
      .filter((id): id is number => id != null);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      return parseIdList(JSON.parse(text));
    } catch {
      return text
        .split(/[,\s]+/)
        .map((part) => nullableNumericId(part))
        .filter((id): id is number => id != null);
    }
  }
  return [];
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      return parseStringList(JSON.parse(text));
    } catch {
      return text.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    }
  }
  return [];
}

export function normalizeOpCatalog(rows: unknown[]): OpCatalogItem[] {
  const list: OpCatalogItem[] = [];
  const seen = new Set<number>();
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.Id ?? row.KabalaID ?? row.TopicID);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      Name: String(row.Name ?? row.name ?? row.TopicName ?? row.KabalaName ?? '').trim() || `Elem ${id}`,
      ImageUrl: row.ImageUrl != null && row.ImageUrl !== '' ? String(row.ImageUrl) : null,
      ActiveFlg: row.ActiveFlg == null && row.activeFlg == null ? true : isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    });
  }
  return list.filter((row) => row.ActiveFlg);
}

export interface OpRound {
  id: number;
  EventID: number;
  TopicID: number | null;
  TopicName: string;
  Mode: string;
  StatusCode: string;
  SortIndex: number;
}

export interface OpEventQuestion {
  id: number;
  EventID: number;
  RoundID: number;
  QuestionID: number | null;
  SortIndex: number;
  StatusCode: string;
  StartedAtUtc: string | null;
  StoppedAtUtc: string | null;
  TimeSec: number;
  Prompt: string;
  TypeCode: string;
  OptionsJson: string | null;
  CorrectJson: string | null;
  TopicName: string;
  Answers: string[];
  Matches: string[];
  Categories: string[];
  IsCorrect: boolean[];
  MediaUrl: string | null;
  ImageKey: string | null;
  ImageUrl: string | null;
  AudioKey: string | null;
  AudioUrl: string | null;
}

export interface OpQuestionPreviewModel {
  type: string;
  prompt: string;
  timeSec: number;
  sortIndex?: number;
  answers: string[];
  matches: string[];
  categories?: string[];
  isCorrect: boolean[];
  synonyms: string[];
  mediaUrl?: string | null;
}

export function previewModelFromQuestion(row: OpEventQuestion): OpQuestionPreviewModel {
  const answers = (row.Answers || []).map((item) => String(item ?? ''));
  const synonyms =
    String(row.TypeCode || '') === 'freetext'
      ? extractOpFreetextSynonyms(row as unknown as Record<string, unknown>)
      : [];
  return {
    type: row.TypeCode,
    prompt: row.Prompt,
    timeSec: row.TimeSec,
    sortIndex: row.SortIndex,
    answers: row.TypeCode === 'freetext' ? [] : answers,
    matches: row.Matches || [],
    categories: row.Categories || [],
    isCorrect: row.IsCorrect || [],
    synonyms,
    mediaUrl: opQuestionImageUrl(row),
  };
}

export function readOpMediaText(...values: unknown[]): string | null {
  for (const value of values) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

export function opQuestionImageUrl(row: Pick<OpEventQuestion, 'ImageUrl' | 'MediaUrl'>): string | null {
  const image = readOpMediaText(row.ImageUrl);
  if (image && /^https?:\/\//i.test(image)) return image;
  const legacy = readOpMediaText(row.MediaUrl);
  if (legacy && /^https?:\/\//i.test(legacy)) return legacy;
  return image || null;
}

export function isOpQuestionEditable(statusCode: string): boolean {
  return String(statusCode || '').trim().toLowerCase() === 'pending';
}

export function toOpQuestionSavePayload(
  row: OpEventQuestion,
  next: {
    type?: string;
    prompt: string;
    timeSec: number;
    answers: string[];
    matches: string[];
    isCorrect: boolean[];
    synonyms: string[];
    itemCats: string[];
    imageKey?: string | null;
    audioKey?: string | null;
  }
): Record<string, unknown> {
  const type = next.type || row.TypeCode || 'single';
  const body: Record<string, unknown> = {
    EventID: row.EventID,
    EventQuestionID: row.id,
    QuestionID: row.QuestionID,
    TypeCode: type,
    Type: type,
    Prompt: next.prompt.trim(),
    TimeSec: next.timeSec,
    SortIndex: row.SortIndex,
  };
  if (next.imageKey !== undefined && next.imageKey !== row.ImageKey) body.ImageKey = next.imageKey;
  if (next.audioKey !== undefined && next.audioKey !== row.AudioKey) body.AudioKey = next.audioKey;
  if (type === 'freetext') {
    body.Answer1 = next.synonyms.map((item) => item.trim()).filter(Boolean).join('|');
    return body;
  }
  let slot = 0;
  next.answers.forEach((raw, i) => {
    const text = String(raw || '').trim();
    if (!text) return;
    slot += 1;
    body[`Answer${slot}`] = text;
    if (type === 'single' || type === 'multi') {
      body[`IsCorrect${slot}`] = Boolean(next.isCorrect[i]);
    }
    if (type === 'match') {
      const right = String(next.matches[i] || '').trim();
      if (right) body[`Match${slot}`] = right;
    }
    if (type === 'category') {
      const cat = String(next.itemCats[i] || '').trim();
      if (cat) body[`Match${slot}`] = cat;
    }
  });
  return body;
}

export interface OpTeam {
  id: number;
  EventID: number;
  KabalaID: number | null;
  Name: string;
  MemberCount: number;
}

export interface OpLiveState {
  DisplayState: string;
  ActiveRoundID: number | null;
  ActiveEventQuestionID: number | null;
}

export interface OpRepoQuestion {
  id: number;
  TopicID: number | null;
  TopicName: string;
  TypeCode: string;
  Prompt: string;
  TimeSec: number;
  MediaUrl: string | null;
  UsedFlg: boolean;
  SortIndex: number | null;
}

function parseJsonText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function pickRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, val] of Object.entries(row)) {
    if (wanted.has(key.toLowerCase()) && val != null && val !== '') return val;
  }
  return undefined;
}

function foldRowKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function readIndexedStrings(row: Record<string, unknown>, prefix: string): string[] {
  const found = new Map<number, string>();
  const prefixFold = foldRowKey(prefix);
  for (const [key, val] of Object.entries(row)) {
    const folded = foldRowKey(key);
    if (!folded.startsWith(prefixFold)) continue;
    const rest = folded.slice(prefixFold.length);
    if (!/^[0-9]+$/.test(rest)) continue;
    const index = Number(rest);
    if (index < 1 || index > 8) continue;
    const text = val == null || val === '' ? '' : String(val).trim();
    if (text && !found.has(index)) found.set(index, text);
  }
  for (let i = 1; i <= 8; i += 1) {
    if (found.has(i)) continue;
    const raw = pickRowValue(row, `${prefix}${i}`, `${prefix.toLowerCase()}${i}`);
    const text = raw == null ? '' : String(raw).trim();
    if (text) found.set(i, text);
  }
  if (!found.size) return [];
  const last = Math.max(...found.keys());
  const out: string[] = [];
  for (let i = 1; i <= last; i += 1) out.push(found.get(i) || '');
  return out;
}

function readIndexedFlags(row: Record<string, unknown>, prefix: string): boolean[] {
  const out: boolean[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const raw = pickRowValue(row, `${prefix}${i}`);
    if (raw == null || raw === '') {
      out.push(false);
      continue;
    }
    if (raw === true || raw === 1 || raw === '1') {
      out.push(true);
      continue;
    }
    const text = String(raw).trim().toLowerCase();
    out.push(text === 'true' || text === 'x' || text === 'igen' || text === 'yes');
  }
  return out;
}

function unwrapNestedList(value: unknown): unknown {
  let current = value;
  while (Array.isArray(current) && current.length === 1 && Array.isArray(current[0])) {
    current = current[0];
  }
  return current;
}

interface OpListItem {
  id: number | null;
  listType: string;
  value: string;
  sortIndex: number;
}

function isRightListType(type: string): boolean {
  const folded = type.replace(/[^a-z]/g, '');
  return (
    folded === 'matches' ||
    folded === 'match' ||
    folded === 'cats' ||
    folded === 'cat' ||
    folded === 'categories' ||
    folded === 'category' ||
    folded === 'right' ||
    folded === 'jobb'
  );
}

function optionItemText(rec: Record<string, unknown>): string {
  return String(
    rec.TextValue ??
      rec.textValue ??
      rec.Value ??
      rec.value ??
      rec.Text ??
      rec.text ??
      rec.Answer ??
      rec.answer ??
      rec.Left ??
      rec.left ??
      rec.Item ??
      rec.item ??
      ''
  ).trim();
}

function readListItems(value: unknown): OpListItem[] {
  const parsed = unwrapNestedList(parseJsonText(value));
  if (!Array.isArray(parsed)) return [];
  const items: OpListItem[] = [];
  parsed.forEach((item, index) => {
    if (item == null || item === '') return;
    if (typeof item === 'string' || typeof item === 'number') {
      const text = String(item).trim();
      if (text) items.push({ id: null, listType: 'options', value: text, sortIndex: index + 1 });
      return;
    }
    const rec = asRecord(item);
    if (!rec) return;
    const text = optionItemText(rec);
    if (!text) return;
    items.push({
      id: nullableNumericId(rec.id ?? rec.ID ?? rec.OptionID ?? rec.optionId),
      listType: String(rec.ListType ?? rec.listType ?? 'options')
        .trim()
        .toLowerCase(),
      value: text,
      sortIndex: nullableNumericId(rec.SortIndex ?? rec.sortIndex ?? rec.OrderNo) ?? index + 1,
    });
  });
  return items.sort((a, b) => a.sortIndex - b.sortIndex || (a.id ?? 0) - (b.id ?? 0));
}

function partsFromListItems(items: OpListItem[]): { answers: string[]; matches: string[] } {
  return {
    answers: items.filter((item) => !isRightListType(item.listType)).map((item) => item.value),
    matches: items.filter((item) => isRightListType(item.listType)).map((item) => item.value),
  };
}

function asOptionList(value: unknown): string[] {
  return readListItems(value).map((item) => item.value);
}

export function parseOpOptionParts(value: unknown): { answers: string[]; matches: string[] } {
  const fromList = readListItems(value);
  if (fromList.length) return partsFromListItems(fromList);
  const parsed = unwrapNestedList(parseJsonText(value));
  const rec = asRecord(parsed);
  if (!rec) {
    if (typeof parsed === 'string' && parsed.trim()) {
      return { answers: parsed.split('|').map((part) => part.trim()).filter(Boolean), matches: [] };
    }
    return { answers: [], matches: [] };
  }
  const left = rec.Left ?? rec.Items ?? rec.left ?? rec.items ?? rec.Options ?? rec.options ?? rec.Answers ?? rec.answers;
  const right = rec.Right ?? rec.Cats ?? rec.right ?? rec.cats ?? rec.Matches ?? rec.matches ?? rec.Categories ?? rec.categories;
  if (left != null || right != null) {
    const answers = asOptionList(left);
    const matches = asOptionList(right);
    if (answers.length || matches.length) return { answers, matches };
  }
  return { answers: [], matches: [] };
}

function uniqueOptionTexts(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function splitPipeTexts(list: string[]): string[] {
  return uniqueOptionTexts(
    list.flatMap((item) =>
      String(item || '')
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

export function extractOpFreetextSynonyms(row: Record<string, unknown>): string[] {
  const correct = unwrapNestedList(parseJsonText(row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct));
  const fromCorrect: string[] = [];
  const rec = asRecord(correct);
  if (rec) {
    fromCorrect.push(
      ...asOptionList(rec.Synonyms ?? rec.synonyms ?? rec.Answers ?? rec.answers ?? rec.Values ?? rec.values)
    );
    const single = optionItemText(rec);
    if (single) fromCorrect.push(single);
  }
  if (Array.isArray(correct)) {
    fromCorrect.push(...readListItems(correct).map((item) => item.value));
    correct.forEach((item) => {
      if (typeof item === 'string' || typeof item === 'number') fromCorrect.push(String(item).trim());
    });
  } else if (typeof correct === 'string' && correct.trim()) {
    fromCorrect.push(correct);
  }

  const fromAnswers = splitPipeTexts([
    ...readIndexedStrings(row, 'Answer'),
    ...asOptionList(row.Answers ?? row.answers),
  ]);
  const fromOptions = readListItems(row.Options ?? row.options ?? row.OptionsJson ?? row.optionsJson).map(
    (item) => item.value
  );
  const correctTexts = splitPipeTexts(fromCorrect);
  if (correctTexts.length) return correctTexts;
  if (fromOptions.length) return uniqueOptionTexts(fromOptions);
  return fromAnswers;
}

export function extractOpQuestionOptions(row: Record<string, unknown>): {
  answers: string[];
  matches: string[];
  optionItems: OpListItem[];
} {
  const fromAnswer = readIndexedStrings(row, 'Answer');
  const fromMatch = readIndexedStrings(row, 'Match');
  const optionItems = readListItems(row.Options ?? row.options ?? row.OptionsJson ?? row.optionsJson);
  const matchItems = readListItems(row.Matches ?? row.matches);
  const fromJson = optionItems.length
    ? partsFromListItems(optionItems)
    : parseOpOptionParts(row.OptionsJson ?? row.optionsJson ?? row.AnswerJson ?? row.answerJson);
  return {
    answers: fromAnswer.length ? fromAnswer : fromJson.answers,
    matches: fromMatch.length ? fromMatch : matchItems.length ? matchItems.map((item) => item.value) : fromJson.matches,
    optionItems: optionItems.length ? optionItems : fromJson.answers.map((value, i) => ({
      id: null,
      listType: 'options',
      value,
      sortIndex: i + 1,
    })),
  };
}

function readCorrectFlags(row: Record<string, unknown>, optionItems: OpListItem[]): boolean[] {
  const answers = optionItems.filter((item) => !isRightListType(item.listType));
  const indexed = readIndexedFlags(row, 'IsCorrect');
  if (indexed.some(Boolean)) return indexed.slice(0, Math.max(answers.length, indexed.lastIndexOf(true) + 1));

  const rawFlags = row.IsCorrect ?? row.isCorrect ?? row.Helyes ?? row.helyes;
  if (Array.isArray(rawFlags) && rawFlags.every((item) => typeof item === 'boolean' || item === 0 || item === 1 || item === '0' || item === '1')) {
    return rawFlags.map((item) => isTruthyFlag(item));
  }

  const correct = unwrapNestedList(parseJsonText(row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct));
  if (Array.isArray(correct)) {
    const optionIds = new Set<number>();
    const indexes = new Set<number>();
    correct.forEach((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        optionIds.add(item);
        indexes.add(item);
        return;
      }
      const rec = asRecord(item);
      if (!rec) return;
      const optionId = nullableNumericId(rec.OptionID ?? rec.optionId ?? rec.id ?? rec.ID);
      const index = nullableNumericId(rec.Index ?? rec.index);
      if (optionId != null) optionIds.add(optionId);
      if (index != null) indexes.add(index);
    });
    if (answers.some((item) => item.id != null && optionIds.has(item.id))) {
      return answers.map((item) => item.id != null && optionIds.has(item.id));
    }
    if (indexes.size) {
      return answers.map((_, i) => indexes.has(i) || indexes.has(i + 1));
    }
  }

  const rec = asRecord(correct);
  if (rec?.Index != null) {
    const index = nullableNumericId(rec.Index);
    return answers.map((_, i) => i === index || (index != null && index > 0 && i === index - 1));
  }
  if (Array.isArray(rec?.Indexes)) {
    const set = new Set(
      (rec.Indexes as unknown[])
        .map((item) => nullableNumericId(item))
        .filter((id): id is number => id != null)
    );
    return answers.map((_, i) => set.has(i) || set.has(i + 1));
  }

  return answers.map(() => false);
}

export function opCategoryNames(
  type: string,
  matches: string[],
  optionsJson?: string | null,
  correctJson?: string | null
): string[] {
  if (normalizeOpTypeCode(type) !== 'category') return [];
  const fromMatch = [...new Set((matches || []).map((item) => String(item || '').trim()).filter(Boolean))];
  if (fromMatch.length) return fromMatch;
  const fromOptions = parseOpOptionParts(optionsJson).matches.filter(Boolean);
  if (fromOptions.length) return [...new Set(fromOptions)];
  const parsed = parseJsonText(correctJson);
  const rec = asRecord(parsed);
  const buckets = rec?.Buckets ?? rec?.buckets;
  if (buckets && typeof buckets === 'object' && !Array.isArray(buckets)) {
    return Object.keys(buckets as Record<string, unknown>).map((key) => key.trim()).filter(Boolean);
  }
  return [];
}

export function parseOpOptions(value: unknown): string[] {
  return asOptionList(value);
}

export function formatOpQuestionCorrect(row: {
  TypeCode: string;
  Answers: string[];
  Matches: string[];
  IsCorrect: boolean[];
  CorrectJson: string | null;
  OptionsJson: string | null;
}): string {
  const type = String(row.TypeCode || '').toLowerCase();
  if (type === 'single' || type === 'multi') {
    const picked = row.Answers.filter((_, i) => row.IsCorrect[i]).filter(Boolean);
    if (picked.length) return picked.join(', ');
  }
  if (type === 'order' && row.Answers.some(Boolean)) {
    return row.Answers.filter(Boolean).join(' → ');
  }
  if (type === 'match') {
    const pairs = row.Answers.map((left, i) => {
      const right = row.Matches[i];
      return left && right ? `${left} — ${right}` : '';
    }).filter(Boolean);
    if (pairs.length) return pairs.join(', ');
  }
  if (type === 'category') {
    const pairs = row.Answers.map((item, i) => {
      const cat = row.Matches[i];
      return item && cat ? `${item} → ${cat}` : '';
    }).filter(Boolean);
    if (pairs.length) return pairs.join(', ');
  }
  if (type === 'freetext') {
    const fromAnswer = String(row.Answers[0] || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    if (fromAnswer.length) return fromAnswer.join(', ');
  }
  return formatOpCorrect(row.TypeCode, row.CorrectJson, row.OptionsJson);
}

export function formatOpCorrect(typeCode: string, correctJson: string | null, optionsJson: string | null): string {
  if (!correctJson) return '—';
  const parsed = parseJsonText(correctJson);
  const options = parseOpOptions(optionsJson);
  const type = String(typeCode || '').toLowerCase();

  const optionAt = (index: number) => {
    if (index >= 0 && index < options.length) return options[index];
    return `${index + 1}.`;
  };

  if (typeof parsed === 'string') {
    return parsed.split('|').map((part) => part.trim()).filter(Boolean).join(', ') || parsed;
  }
  if (!parsed || typeof parsed !== 'object') return String(correctJson);

  const rec = parsed as Record<string, unknown>;
  if (type === 'freetext' || rec.Synonyms != null) {
    const list = Array.isArray(rec.Synonyms) ? rec.Synonyms : parseStringList(rec.Synonyms);
    return list.join(', ') || '—';
  }
  if (type === 'single' || rec.Index != null) {
    const index = nullableNumericId(rec.Index);
    if (index == null) return '—';
    return optionAt(index >= options.length && index > 0 ? index - 1 : index);
  }
  if (Array.isArray(rec.Indexes) || Array.isArray(rec.IndexList)) {
    const indexes = (rec.Indexes || rec.IndexList) as unknown[];
    return indexes
      .map((item) => nullableNumericId(item))
      .filter((id): id is number => id != null)
      .map((id) => optionAt(id >= options.length && id > 0 ? id - 1 : id))
      .join(', ');
  }
  if (Array.isArray(rec.Order)) {
    return (rec.Order as unknown[])
      .map((item) => nullableNumericId(item))
      .filter((id): id is number => id != null)
      .map((id, i) => `${i + 1}. ${optionAt(id >= options.length && id > 0 ? id - 1 : id)}`)
      .join(' → ');
  }
  if (Array.isArray(rec.Pairs)) {
    return (rec.Pairs as unknown[])
      .map((pair) => {
        if (Array.isArray(pair)) return pair.map((item) => String(item ?? '')).join(' — ');
        const row = asRecord(pair);
        if (!row) return '';
        return `${row.Left ?? row.A ?? ''} — ${row.Right ?? row.B ?? ''}`;
      })
      .filter(Boolean)
      .join(', ');
  }
  if (rec.Map && typeof rec.Map === 'object') {
    return Object.entries(rec.Map as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${String(val ?? '')}`)
      .join(', ');
  }
  return String(correctJson);
}

function normalizeStatus(value: unknown): string {
  return String(value ?? 'pending').trim().toLowerCase() || 'pending';
}

export function normalizeOpRounds(rows: unknown[], eventId?: number | string | null): OpRound[] {
  const list: OpRound[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.RoundID);
    const EventID = nullableNumericId(row.EventID ?? row.eventID) ?? nullableNumericId(eventId);
    if (id == null || EventID == null) continue;
    list.push({
      id,
      EventID,
      TopicID: nullableNumericId(row.TopicID ?? row.topicID),
      TopicName: String(row.TopicName ?? row.topicName ?? row.Topic ?? row.Name ?? '').trim(),
      Mode: String(row.Mode ?? row.mode ?? 'mixed').trim() || 'mixed',
      StatusCode: normalizeStatus(row.StatusCode ?? row.statusCode ?? row.Status),
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex) ?? list.length + 1,
    });
  }
  return list.sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
}

export function normalizeOpEventQuestions(
  rows: unknown[],
  eventId?: number | string | null
): OpEventQuestion[] {
  const list: OpEventQuestion[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.EventQuestionID);
    const EventID = nullableNumericId(row.EventID ?? row.eventID) ?? nullableNumericId(eventId);
    const RoundID = nullableNumericId(row.RoundID ?? row.roundID);
    if (id == null || EventID == null || RoundID == null) continue;
    const options = row.OptionsJson ?? row.optionsJson ?? row.Options ?? row.options;
    const correct = row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct;
    const fromJson = extractOpQuestionOptions(row);
    const typeRaw = String(row.TypeCode ?? row.typeCode ?? row.Type ?? 'single').trim() || 'single';
    const TypeCode = normalizeOpTypeCode(typeRaw) || typeRaw;
    const OptionsJson =
      options == null || options === '' ? null : typeof options === 'string' ? options : JSON.stringify(options);
    const CorrectJson =
      correct == null || correct === '' ? null : typeof correct === 'string' ? correct : JSON.stringify(correct);
    list.push({
      id,
      EventID,
      RoundID,
      QuestionID: nullableNumericId(row.QuestionID ?? row.questionID),
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex) ?? list.length + 1,
      StatusCode: normalizeStatus(row.StatusCode ?? row.statusCode ?? row.Status),
      StartedAtUtc: row.StartedAtUtc != null ? String(row.StartedAtUtc) : null,
      StoppedAtUtc: row.StoppedAtUtc != null ? String(row.StoppedAtUtc) : null,
      TimeSec: nullableNumericId(row.TimeSec ?? row.timeSec) ?? 20,
      Prompt: String(row.Prompt ?? row.prompt ?? row.Question ?? '').trim(),
      TypeCode,
      OptionsJson,
      CorrectJson,
      TopicName: String(row.TopicName ?? row.topicName ?? row.Topic ?? '').trim(),
      Answers:
        TypeCode === 'freetext'
          ? (() => {
              const synonyms = extractOpFreetextSynonyms(row);
              return synonyms.length ? [synonyms.join('|')] : fromJson.answers;
            })()
          : fromJson.answers,
      Matches: fromJson.matches,
      Categories: opCategoryNames(TypeCode, fromJson.matches, OptionsJson, CorrectJson),
      IsCorrect: readCorrectFlags(row, fromJson.optionItems),
      ImageKey: readOpMediaText(row.ImageKey, row.imageKey),
      ImageUrl: readOpMediaText(row.ImageUrl, row.imageUrl),
      AudioKey: readOpMediaText(row.AudioKey, row.audioKey),
      AudioUrl: readOpMediaText(row.AudioUrl, row.audioUrl),
      MediaUrl: readOpMediaText(row.ImageUrl, row.imageUrl, row.MediaUrl, row.mediaUrl),
    });
  }
  return list.sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
}

export function normalizeOpTeams(rows: unknown[], eventId?: number | string | null): OpTeam[] {
  const list: OpTeam[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.TeamID);
    const EventID = nullableNumericId(row.EventID ?? row.eventID) ?? nullableNumericId(eventId);
    if (id == null || EventID == null) continue;
    list.push({
      id,
      EventID,
      KabalaID: nullableNumericId(row.KabalaID ?? row.kabalaID),
      Name: String(row.Name ?? row.name ?? row.KabalaName ?? `Csapat ${id}`).trim(),
      MemberCount: nullableNumericId(row.MemberCount ?? row.memberCount) ?? 0,
    });
  }
  return list;
}

export function normalizeOpLive(rows: unknown[]): OpLiveState {
  const row = asRecord(rows?.[0]) || asRecord(rows);
  if (!row) {
    return { DisplayState: 'idle', ActiveRoundID: null, ActiveEventQuestionID: null };
  }
  return {
    DisplayState: String(row.DisplayState ?? row.displayState ?? row.State ?? 'idle').trim() || 'idle',
    ActiveRoundID: nullableNumericId(row.ActiveRoundID ?? row.activeRoundID ?? row.RoundID),
    ActiveEventQuestionID: nullableNumericId(
      row.ActiveEventQuestionID ?? row.activeEventQuestionID ?? row.EventQuestionID
    ),
  };
}

export function normalizeOpRepoQuestions(rows: unknown[]): OpRepoQuestion[] {
  const list: OpRepoQuestion[] = [];
  const seen = new Set<number>();
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.QuestionID ?? row.QuestionId) ?? -(list.length + 1);
    if (seen.has(id)) continue;
    const prompt = String(row.Prompt ?? row.prompt ?? row.Question ?? row.Kérdés ?? '').trim();
    if (!prompt && id < 0) continue;
    seen.add(id);
    list.push({
      id,
      TopicID: nullableNumericId(row.TopicID ?? row.topicID),
      TopicName: String(row.TopicName ?? row.topicName ?? row.Topic ?? '').trim(),
      TypeCode: String(row.TypeCode ?? row.typeCode ?? row.Type ?? 'single').trim() || 'single',
      Prompt: prompt,
      TimeSec: nullableNumericId(row.TimeSec ?? row.timeSec) ?? 20,
      MediaUrl:
        row.MediaUrl != null && row.MediaUrl !== ''
          ? String(row.MediaUrl)
          : row.MediaKey != null && row.MediaKey !== ''
            ? String(row.MediaKey)
            : null,
      UsedFlg: isTruthyFlag(row.UsedFlg ?? row.usedFlg ?? row.InEventFlg),
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex ?? row.OrderNo),
    });
  }
  return list;
}

export function normalizeOpSettings(
  rows: unknown[],
  eventId?: number | string | null
): OpEventSettings[] {
  const list: OpEventSettings[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const EventID =
      nullableNumericId(row.EventID ?? row.eventID ?? row.EventId) ?? nullableNumericId(eventId);
    if (EventID == null) continue;
    list.push({
      EventID,
      DeskCountHint: nullableNumericId(row.DeskCountHint ?? row.deskCountHint),
      MaxTeamSize: nullableNumericId(row.MaxTeamSize ?? row.maxTeamSize) ?? 8,
      PlannedDurationMin: nullableNumericId(row.PlannedDurationMin ?? row.plannedDurationMin) ?? 90,
      ShadowAwardFlg:
        row.ShadowAwardFlg == null && row.shadowAwardFlg == null
          ? true
          : isTruthyFlag(row.ShadowAwardFlg ?? row.shadowAwardFlg),
      TopicIds: parseIdList(row.TopicIds ?? row.TopicIdsJson ?? row.topicIds),
      ExtraGameIds: parseStringList(row.ExtraGameIds ?? row.ExtraGameIdsJson ?? row.extraGameIds),
      KabalaIds: parseIdList(row.KabalaIds ?? row.KabalaIdsJson ?? row.kabalaIds),
    });
  }
  return list;
}
