import * as XLSX from 'xlsx';
import { downloadBinaryFile } from 'src/utils/inviteImport';
import {
  nullableNumericId,
  pickDataset,
  readApiReturnDescription,
  unwrapApiPayload,
} from 'src/utils/apiPayload';
import { normalizeOpTypeCode, opDefaultTimeSec, type OpQuestionTypeCode } from './constants';

export interface OpImportQuestion {
  Topic: string;
  Type: OpQuestionTypeCode;
  Prompt: string;
  Options: string[];
  Cats: string[];
  Matches: string[];
  CorrectRaw: string;
  IsCorrect: boolean[];
  TimeSec: number | null;
  MediaKey: string | null;
  MediaUrl: string | null;
  SortIndex: number | null;
}

function foldHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function cell(row: string[], index: number | undefined): string {
  if (index == null || index < 0) return '';
  return String(row[index] ?? '').trim();
}

function splitList(value: string): string[] {
  return value
    .split(/[|;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function letterIndex(raw: string): number | null {
  const text = raw.trim();
  if (/^[a-h]$/i.test(text)) return text.toLowerCase().charCodeAt(0) - 97;
  const n = nullableNumericId(text);
  if (n == null) return null;
  return n > 0 ? n - 1 : n;
}

function collectIndexed(row: string[], headers: string[], prefixes: string | string[]): string[] {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  const out: string[] = [];
  let last = 0;
  for (let i = 1; i <= 8; i += 1) {
    let value = '';
    for (const prefix of list) {
      const idx = headers.findIndex((h) => h === `${prefix}${i}`);
      const text = cell(row, idx >= 0 ? idx : undefined);
      if (text) {
        value = text;
        break;
      }
    }
    out.push(value);
    if (value) last = i;
  }
  return last ? out.slice(0, last) : [];
}

function parseBoolCell(raw: string): boolean | null {
  const folded = foldHeader(raw);
  if (!folded) return null;
  if (['x', 'igen', 'true', '1', 'yes', 'i', 'y', 'ok', 'helyes'].includes(folded)) return true;
  if (['nem', 'false', '0', 'no', 'n', 'nincs'].includes(folded)) return false;
  return null;
}

function collectBoolFlags(row: string[], headers: string[], prefixes: string[]): Array<boolean | null> {
  const flags: Array<boolean | null> = [];
  for (let i = 1; i <= 8; i += 1) {
    let found: boolean | null = null;
    for (const prefix of prefixes) {
      const idx = headers.findIndex((h) => h === `${prefix}${i}`);
      if (idx < 0) continue;
      const parsed = parseBoolCell(cell(row, idx));
      if (parsed != null) {
        found = parsed;
        break;
      }
    }
    flags.push(found);
  }
  return flags;
}

function flagsFromCorrectRaw(type: OpQuestionTypeCode, raw: string): boolean[] {
  const flags = Array.from({ length: 8 }, () => false);
  if (type === 'single') {
    const index = letterIndex(raw);
    if (index != null && index >= 0 && index < 8) flags[index] = true;
  }
  if (type === 'multi') {
    for (const part of splitList(raw)) {
      const index = letterIndex(part);
      if (index != null && index >= 0 && index < 8) flags[index] = true;
    }
  }
  return flags;
}

function parsePairs(raw: string): Array<{ left: string; right: string }> {
  return raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [left, right] = part.split(/[=:]/).map((item) => item.trim());
      return { left: left || '', right: right || '' };
    });
}

function orderedOptions(q: OpImportQuestion): string[] {
  if (q.Type !== 'order' || !q.CorrectRaw) return q.Options;
  const indexes = splitList(q.CorrectRaw)
    .map((part) => letterIndex(part))
    .filter((index): index is number => index != null && index >= 0 && index < q.Options.length);
  if (indexes.length !== q.Options.length) return q.Options;
  return indexes.map((index) => q.Options[index]);
}

function categoryMatches(q: OpImportQuestion): string[] {
  const pairs = parsePairs(q.CorrectRaw);
  if (pairs.length) {
    return q.Options.map((item) => {
      const hit = pairs.find((pair) => pair.left.toLowerCase() === item.toLowerCase());
      return hit?.right || '';
    });
  }
  if (q.Matches.length === q.Options.length) return q.Matches;
  return q.Matches.length ? q.Matches : q.Cats;
}

function toPayloadRow(q: OpImportQuestion): Record<string, unknown> {
  const row: Record<string, unknown> = {
    TypeCode: q.Type,
    Type: q.Type,
    Topic: q.Topic,
    Prompt: q.Prompt,
    TimeSec: q.TimeSec,
  };
  if (q.SortIndex != null) row.SortIndex = q.SortIndex;
  if (q.MediaUrl) {
    if (/^https?:\/\//i.test(q.MediaUrl)) row.MediaUrl = q.MediaUrl;
    else row.ImageKey = q.MediaUrl;
  }
  if (q.MediaKey && !row.ImageKey) row.ImageKey = q.MediaKey;

  if (q.Type === 'freetext') {
    row.Answer1 = q.CorrectRaw || q.Options[0] || '';
    return row;
  }

  const answers = orderedOptions(q);
  answers.forEach((opt, i) => {
    row[`Answer${i + 1}`] = opt;
  });
  const matches = q.Type === 'category' ? categoryMatches(q) : q.Matches;
  matches.forEach((opt, i) => {
    if (opt) row[`Match${i + 1}`] = opt;
  });
  if (q.Type === 'single' || q.Type === 'multi') {
    answers.forEach((_, i) => {
      row[`IsCorrect${i + 1}`] = Boolean(q.IsCorrect[i]);
    });
  }
  return row;
}

function findHeaderRow(grid: string[][]): number {
  const max = Math.min(grid.length, 8);
  for (let r = 0; r < max; r += 1) {
    const headers = (grid[r] || []).map((h) => foldHeader(String(h || '')));
    const hasTopic = headers.some((h) => h === 'temakor' || h === 'topic' || h.startsWith('temakor'));
    const hasPrompt = headers.some((h) => h === 'kerdes' || h === 'prompt' || h === 'question');
    const hasType = headers.some((h) => h === 'tipus' || h === 'type' || h === 'tipuskod');
    if (hasTopic && (hasPrompt || hasType)) return r;
  }
  return 0;
}

export function parseOpQuestionGrid(grid: string[][]): OpImportQuestion[] {
  if (!grid.length) return [];
  const headerRow = findHeaderRow(grid);
  const headers = (grid[headerRow] || []).map((h) => foldHeader(String(h || '')));
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const topicIdx = idx(['temakor', 'topic', 'temakors']);
  const typeIdx = idx(['tipus', 'type', 'tipuskod']);
  const promptIdx = idx(['kerdes', 'prompt', 'question']);
  const optionsIdx = idx(['opciok', 'options', 'valaszok']);
  const correctIdx = idx(['helyes', 'correct', 'megoldas']);
  const timeIdx = idx(['idomp', 'timesec', 'ido', 'time']);
  const mediaIdx = idx(['mediakey', 'mediaurl', 'media']);
  const sortIdx = idx(['sorszam', 'sortindex', 'order', 'ordernumber', 'orderno']);

  const list: OpImportQuestion[] = [];
  for (let r = headerRow + 1; r < grid.length; r += 1) {
    const row = grid[r] || [];
    const topic = cell(row, topicIdx);
    const prompt = cell(row, promptIdx);
    const typeRaw = cell(row, typeIdx);
    const type = normalizeOpTypeCode(typeRaw);
    if (!topic && !prompt) continue;
    if (!prompt && !typeRaw) continue;
    if (!topic || !prompt || !type) {
      const missing: string[] = [];
      if (!topic) missing.push('témakör');
      if (!type) {
        missing.push(typeRaw ? `felismerhető típus („${typeRaw}” nem jó)` : 'típus');
      }
      if (!prompt) missing.push('kérdés');
      throw new Error(`A(z) ${r + 1}. sor hiányos: ${missing.join(', ')} kell.`);
    }
    const answers = collectIndexed(row, headers, ['answer', 'valasz', 'opcio']);
    const matches = collectIndexed(row, headers, ['match', 'par', 'paros']);
    const cats = collectIndexed(row, headers, ['cat', 'kategoria', 'category']).filter(
      (name, i, all) => name && all.indexOf(name) === i
    );
    const options = answers.length ? answers : splitList(cell(row, optionsIdx));
    const excelFlags = collectBoolFlags(row, headers, ['iscorrect', 'helyes', 'correct']);
    const hasExcelFlags = excelFlags.some((flag) => flag != null);
    let correctRaw = cell(row, correctIdx);
    if (type === 'freetext' && !correctRaw) correctRaw = options[0] || '';
    if (type === 'single' || type === 'multi') {
      if (!correctRaw && !hasExcelFlags) {
        throw new Error(`A(z) ${r + 1}. sorban hiányzik a helyes válasz.`);
      }
    } else if (!correctRaw) {
      const hasContent =
        (type === 'freetext' && (correctRaw || options[0])) ||
        (type === 'order' && options.length >= 2) ||
        (type === 'match' && options.length && matches.length) ||
        (type === 'category' && options.length && (matches.length || cats.length));
      if (!hasContent) {
        throw new Error(`A(z) ${r + 1}. sorban hiányzik a helyes válasz.`);
      }
    }
    const fromCorrect =
      type === 'category'
        ? parsePairs(correctRaw).map((pair) => pair.right).filter(Boolean)
        : [];
    const uniqueCats = (cats.length ? cats : matches.length ? matches : fromCorrect).filter(
      (name, i, all) => all.indexOf(name) === i
    );
    if (type === 'category' && !uniqueCats.length) {
      throw new Error(`A(z) ${r + 1}. sorban hiányzik a kategória (Match1…).`);
    }
    const timeRaw = cell(row, timeIdx);
    const media = cell(row, mediaIdx);
    const derivedFlags = flagsFromCorrectRaw(type, correctRaw);
    const isCorrect = derivedFlags.map((flag, i) => excelFlags[i] ?? flag);
    list.push({
      Topic: topic,
      Type: type,
      Prompt: prompt,
      Options: type === 'freetext' ? [] : options,
      Cats: uniqueCats,
      Matches: matches,
      CorrectRaw: correctRaw,
      IsCorrect: isCorrect,
      TimeSec: timeRaw ? nullableNumericId(timeRaw) : opDefaultTimeSec(type),
      MediaKey: media || null,
      MediaUrl: media || null,
      SortIndex: nullableNumericId(cell(row, sortIdx)),
    });
  }
  return list;
}

function sheetGrid(workbook: XLSX.WorkBook, name: string): string[][] {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
  return grid.map((row) => row.map((value) => String(value ?? '').trim()));
}

function sheetHasQuestions(grid: string[][]): boolean {
  if (grid.length < 2) return false;
  try {
    return parseOpQuestionGrid(grid).length > 0;
  } catch {
    return true;
  }
}

function pickQuestionSheetName(workbook: XLSX.WorkBook): string | null {
  const names = workbook.SheetNames.filter((name) => {
    const folded = foldHeader(name);
    return folded !== 'tipusok' && folded !== 'types' && folded !== 'legend';
  });
  if (!names.length) return workbook.SheetNames[0] || null;
  const preferred = names.find((name) => {
    const folded = foldHeader(name);
    return folded === 'kerdesek' || folded === 'questions';
  });
  if (preferred && sheetHasQuestions(sheetGrid(workbook, preferred))) return preferred;
  const samples = names.find((name) => {
    const folded = foldHeader(name);
    return folded === 'mintak' || folded === 'samples';
  });
  if (samples && sheetHasQuestions(sheetGrid(workbook, samples))) return samples;
  return preferred || names[0] || null;
}

export async function parseOpQuestionFile(file: File): Promise<OpImportQuestion[]> {
  const buffer = await file.arrayBuffer();
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: false });
    const sheetName = pickQuestionSheetName(workbook);
    if (!sheetName) return [];
    return parseOpQuestionGrid(sheetGrid(workbook, sheetName));
  } catch (error) {
    if (error instanceof Error && /hiányos|hiányzik|ismert típus/i.test(error.message)) throw error;
    throw new Error('A fájl nem olvasható. Valós .xlsx kell.');
  }
}

export function toOpImportPayload(eventId: number, rows: OpImportQuestion[]) {
  return {
    EventID: eventId,
    Questions: rows.map(toPayloadRow),
  };
}

export interface OpImportErrorRow {
  RowID: string;
  Prompt: string;
  ResultMsg: string;
}

export function readOpImportHttpError(error: unknown): {
  message: string;
  rows: OpImportErrorRow[];
} | null {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  if (!response || (response.status !== 400 && response.status !== 403)) return null;
  const data = unwrapApiPayload(response.data);
  const rawRows = pickDataset(data, 'Rows', 'rows');
  const rows: OpImportErrorRow[] = [];
  for (const item of rawRows) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const resultMsg = String(
      row.ResultMsg ?? row.resultMsg ?? row.ReturnMsg ?? row.Message ?? row.Error ?? ''
    ).trim();
    if (!resultMsg) continue;
    rows.push({
      RowID: String(row.Index ?? row.RowID ?? row.rowID ?? row.Sor ?? ''),
      Prompt: String(row.Prompt ?? row.Kérdés ?? row.Question ?? '').trim(),
      ResultMsg: resultMsg,
    });
  }
  return {
    message:
      readApiReturnDescription(data) ||
      readApiReturnDescription(response.data) ||
      'A kérdések importja sikertelen.',
    rows,
  };
}

const TEMPLATE_HEADERS = [
  'Témakör',
  'Típus',
  'Sorszám',
  'Kérdés',
  'Answer1',
  'Answer2',
  'Answer3',
  'Answer4',
  'Answer5',
  'Answer6',
  'Answer7',
  'Answer8',
  'Match1',
  'Match2',
  'Match3',
  'Match4',
  'Helyes',
  'IdőMp',
  'MediaUrl',
];

function applyTemplateCols(ws: XLSX.WorkSheet) {
  ws['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 16 },
    { wch: 40 },
  ];
}

export function downloadOpQuestionTemplate() {
  const wb = XLSX.utils.book_new();
  const work = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  applyTemplateCols(work);
  XLSX.utils.book_append_sheet(wb, work, 'Kérdések');

  const samples = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS, 'Megjegyzés'],
    [
      '90-es évek',
      'single',
      1,
      'Ki énekelte a Take On Me-t?',
      'A-ha',
      'Queen',
      'ABBA',
      'The Beatles',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '1',
      20,
      '',
      'Helyes: 1 = első opció (A-ha).',
    ],
    [
      '90-es évek',
      'multi',
      2,
      'Kik voltak a Nirvana tagjai?',
      'Kurt Cobain',
      'Krist Novoselic',
      'Dave Grohl',
      'Axl Rose',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '1|2|3',
      25,
      '',
      'Több helyes index | jellel. 4. (Axl) nem.',
    ],
    [
      'Albumok',
      'order',
      3,
      'Rakd időrendbe a lemezeket (legrégebbi elöl).',
      'Nevermind (1991)',
      'In Utero (1993)',
      'Bleach (1989)',
      'Unplugged in New York (1994)',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '3|1|2|4',
      30,
      '',
      'Helyes: az opciók sorrendje 1-től.',
    ],
    [
      'Párosítás',
      'match',
      '',
      'Párosítsd az előadót a dallal.',
      'Queen',
      'A-ha',
      'Nirvana',
      'ABBA',
      '',
      '',
      '',
      '',
      'Bohemian Rhapsody',
      'Take On Me',
      'Smells Like Teen Spirit',
      'Dancing Queen',
      'Queen=Bohemian Rhapsody|A-ha=Take On Me|Nirvana=Smells Like Teen Spirit|ABBA=Dancing Queen',
      30,
      '',
      'Answer = bal oldal, Match = jobb. Helyes: bal=jobb|…',
    ],
    [
      'Műfajok',
      'category',
      '',
      'Sorold be a dalokat stílus szerint.',
      'Take On Me',
      'Smells Like Teen Spirit',
      'Dancing Queen',
      'Lithium',
      '',
      '',
      '',
      '',
      'pop',
      'grunge',
      '',
      '',
      'Take On Me=pop|Smells Like Teen Spirit=grunge|Dancing Queen=pop|Lithium=grunge',
      30,
      '',
      'Answer = darabok. Match = kategóriák (pop, grunge). Helyes: darab=kategória|…',
    ],
    [
      '90-es évek',
      'freetext',
      '',
      'Melyik városban alakult a Nirvana?',
      'Aberdeen|Aberdeen WA',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      40,
      '',
      'Szinonimák az Answer1-ben, | jellel.',
    ],
  ]);
  applyTemplateCols(samples);
  XLSX.utils.book_append_sheet(wb, samples, 'Minták');

  const legend = XLSX.utils.aoa_to_sheet([
    ['Típus (ezt írd a Típus oszlopba)', 'Jelentés', 'Helyes mező', 'Sorszám'],
    ['single', 'Egyválasztós', '1 = első opció', '1–8 = forduló sorrendje. Üres = csak a kérdésbank.'],
    ['multi', 'Többválasztós', '1|3'],
    ['order', 'Sorrendezés', '3|1|2'],
    ['match', 'Párosítás', 'bal=jobb|bal2=jobb2'],
    ['category', 'Kategorizálás', 'Match1… = kategóriák; Helyes: dal=pop|dal2=grunge'],
    ['freetext', 'Szabad szöveg', 'Answer1: szinonima1|szinonima2'],
  ]);
  legend['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 36 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, legend, 'Típusok');

  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  downloadBinaryFile(
    'olimpub-kerdesek.xlsx',
    bytes,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
