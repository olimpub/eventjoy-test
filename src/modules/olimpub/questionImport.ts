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
  /** Üres vagy kviz: forduló kérdésbank. EG2, EG4–EG8: extra játék. */
  Game: string | null;
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

function normalizeOpGame(raw: string, rowNumber: number): string | null {
  const folded = foldHeader(raw);
  if (!folded || ['kviz', 'quiz', 'kor', 'round', 'fordulo'].includes(folded)) return null;
  const numbered = folded.match(/^eg([1-8])$/);
  if (numbered) return `EG${numbered[1]}`;
  const aliases: Record<string, string> = {
    parbaj: 'EG1',
    mozaik: 'EG2',
    mosaic: 'EG2',
    karaoke: 'EG3',
    reverse: 'EG4',
    generalciok: 'EG5',
    generaciok: 'EG5',
    musorvezeto: 'EG6',
    filmguru: 'EG7',
    kibeszel: 'EG8',
  };
  const game = aliases[folded];
  if (game) return game;
  throw new Error(`A(z) ${rowNumber}. sor játéka ismeretlen: „${raw}”. Üres, kviz, EG1, EG2, vagy EG4–EG8.`);
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
  if (q.Game) row.ExtraGameId = q.Game;
  if (q.TimeSec == null) delete row.TimeSec;
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
  const gameIdx = idx(['jatek', 'game', 'extragame', 'extragameid']);

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
    const game = normalizeOpGame(cell(row, gameIdx), r + 1);
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
      TimeSec: timeRaw ? nullableNumericId(timeRaw) : game === 'EG2' ? null : opDefaultTimeSec(type),
      MediaKey: media || null,
      MediaUrl: media || null,
      SortIndex: nullableNumericId(cell(row, sortIdx)),
      Game: game,
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

function pickQuestionSheetName(workbook: XLSX.WorkBook): string | null {
  const names = workbook.SheetNames.filter((name) => {
    const folded = foldHeader(name);
    return folded !== 'tipusok' && folded !== 'types' && folded !== 'legend' && folded !== 'mintak' && folded !== 'samples';
  });
  if (!names.length) return workbook.SheetNames[0] || null;
  const preferred = names.find((name) => {
    const folded = foldHeader(name);
    return folded === 'kerdesek' || folded === 'questions';
  });
  if (preferred) return preferred;
  return names[0] || null;
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
  'Játék',
  'Típus',
  'Sorszám',
  'Kérdés',
  'Válasz1',
  'Válasz2',
  'Válasz3',
  'Válasz4',
  'Válasz5',
  'Válasz6',
  'Válasz7',
  'Válasz8',
  'Pár1',
  'Pár2',
  'Pár3',
  'Pár4',
  'Kategória1',
  'Kategória2',
  'Kategória3',
  'Kategória4',
  'Helyes',
  'IdőMp',
];

function blankSlots(count: number, values?: string[]): string[] {
  return Array.from({ length: count }, (_, index) => values?.[index] || '');
}

function sampleRow(input: {
  topic: string;
  game?: string;
  type: string;
  sort?: number | '';
  prompt: string;
  answers?: string[];
  pairs?: string[];
  cats?: string[];
  correct: string;
  time?: number | '';
  note: string;
}): Array<string | number> {
  return [
    input.topic,
    input.game || 'kviz',
    input.type,
    input.sort ?? '',
    input.prompt,
    ...blankSlots(8, input.answers),
    ...blankSlots(4, input.pairs),
    ...blankSlots(4, input.cats),
    input.correct,
    input.time ?? '',
    input.note,
  ];
}

function applyTemplateCols(ws: XLSX.WorkSheet) {
  ws['!cols'] = [
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 46 },
    ...Array.from({ length: 8 }, () => ({ wch: 22 })),
    ...Array.from({ length: 4 }, () => ({ wch: 24 })),
    ...Array.from({ length: 4 }, () => ({ wch: 14 })),
    { wch: 56 },
    { wch: 8 },
  ];
}

export function downloadOpQuestionTemplate() {
  const wb = XLSX.utils.book_new();
  const work = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  applyTemplateCols(work);
  XLSX.utils.book_append_sheet(wb, work, 'Kérdések');

  const samples = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS, 'Megjegyzés'],
    sampleRow({
      topic: '90-es évek',
      type: 'single',
      sort: 1,
      prompt: 'Ki énekelte a Take On Me-t?',
      answers: ['A-ha', 'Queen', 'ABBA', 'The Beatles'],
      correct: '1',
      time: 20,
      note: 'Helyes: 1 = első válasz (A-ha).',
    }),
    sampleRow({
      topic: '90-es évek',
      type: 'multi',
      sort: 2,
      prompt: 'Kik voltak a Nirvana tagjai?',
      answers: ['Kurt Cobain', 'Krist Novoselic', 'Dave Grohl', 'Axl Rose'],
      correct: '1|2|3',
      time: 25,
      note: 'Több helyes index | jellel. A 4. (Axl) nem.',
    }),
    sampleRow({
      topic: 'Albumok',
      type: 'order',
      sort: 3,
      prompt: 'Rakd időrendbe a lemezeket, a legrégebbi elöl.',
      answers: ['Nevermind (1991)', 'In Utero (1993)', 'Bleach (1989)', 'Unplugged in New York (1994)'],
      correct: '3|1|2|4',
      time: 30,
      note: 'Helyes: a válaszok sorrendje 1-től.',
    }),
    sampleRow({
      topic: 'Párosítás',
      type: 'match',
      prompt: 'Párosítsd az előadót a dallal.',
      answers: ['Queen', 'A-ha', 'Nirvana', 'ABBA'],
      pairs: ['Bohemian Rhapsody', 'Take On Me', 'Smells Like Teen Spirit', 'Dancing Queen'],
      correct: 'Queen=Bohemian Rhapsody|A-ha=Take On Me|Nirvana=Smells Like Teen Spirit|ABBA=Dancing Queen',
      time: 30,
      note: 'Legfeljebb 4 pár. Válasz = bal oldal, Pár = jobb oldal.',
    }),
    sampleRow({
      topic: 'Műfajok',
      type: 'category',
      prompt: 'Sorold be a dalokat stílus szerint.',
      answers: ['Take On Me', 'Smells Like Teen Spirit', 'Dancing Queen', 'Lithium', 'Vogue', 'Heart-Shaped Box'],
      cats: ['pop', 'grunge', 'disco'],
      correct:
        'Take On Me=pop|Smells Like Teen Spirit=grunge|Dancing Queen=disco|Lithium=grunge|Vogue=disco|Heart-Shaped Box=grunge',
      time: 30,
      note: '6 válasz, 3 kategória. A kategória neve a Kategória oszlopban van, nem a párban.',
    }),
    sampleRow({
      topic: '90-es évek',
      type: 'freetext',
      prompt: 'Melyik városban alakult a Nirvana?',
      answers: ['Aberdeen|Aberdeen WA'],
      correct: '',
      time: 40,
      note: 'Szinonimák a Válasz1-ben, | jellel.',
    }),
    sampleRow({
      topic: 'Párbaj',
      game: 'EG1',
      type: 'single',
      sort: 1,
      prompt: 'Melyik együttes adta ki a Nevermindot?',
      answers: ['Nirvana', 'Pearl Jam', 'Oasis', 'Blur'],
      correct: '1',
      time: 10,
      note: 'Párbaj. Játék = EG1, egyválasztós. A készletből az első 5 sorszám indul.',
    }),
    sampleRow({
      topic: 'Párbaj',
      game: 'EG1',
      type: 'single',
      sort: 2,
      prompt: 'Melyik városban alakult a Beatles?',
      answers: ['Liverpool', 'London', 'Manchester', 'Dublin'],
      correct: '1',
      time: 10,
      note: 'Párbaj, 2. kérdés.',
    }),
    sampleRow({
      topic: 'Párbaj',
      game: 'EG1',
      type: 'single',
      sort: 3,
      prompt: 'Ki énekelte a Billie Jean-t?',
      answers: ['Michael Jackson', 'Prince', 'Madonna', 'George Michael'],
      correct: '1',
      time: 10,
      note: 'Párbaj, 3. kérdés.',
    }),
    sampleRow({
      topic: 'Párbaj',
      game: 'EG1',
      type: 'single',
      sort: 4,
      prompt: 'Ki volt a Queen frontembere?',
      answers: ['Freddie Mercury', 'Robert Plant', 'Mick Jagger', 'Axl Rose'],
      correct: '1',
      time: 10,
      note: 'Párbaj, 4. kérdés. A helyes a személy, nem az együttes.',
    }),
    sampleRow({
      topic: 'Párbaj',
      game: 'EG1',
      type: 'single',
      sort: 5,
      prompt: 'Melyik évben jelent meg a Thriller?',
      answers: ['1982', '1979', '1987', '1991'],
      correct: '1',
      time: 10,
      note: 'Párbaj, 5. kérdés.',
    }),
    sampleRow({
      topic: 'Zenék',
      game: 'EG2',
      type: 'freetext',
      sort: 1,
      prompt: 'Melyik szám szól?',
      answers: ['Take On Me|A-ha'],
      correct: '',
      note: 'Mozaik. Az idő üres, nem számít. A hangot a kérdésre töltöd, nem az Excelbe.',
    }),
    sampleRow({
      topic: 'Fordított',
      game: 'EG4',
      type: 'freetext',
      sort: 1,
      prompt: 'Melyik számnak ez a szövege: Take on me…',
      answers: ['Take On Me|Take on me'],
      correct: '',
      time: 20,
      note: 'Reverse. Szabad szöveg, a cím vagy az előadó.',
    }),
    sampleRow({
      topic: 'Generációk',
      game: 'EG5',
      type: 'single',
      sort: 1,
      prompt: 'Melyik együttes a 80-as évekből való?',
      answers: ['A-ha', 'Nirvana', 'ABBA', 'Queen'],
      correct: '1',
      time: 12,
      note: 'Generációk. Rövid egyválasztós.',
    }),
    sampleRow({
      topic: 'Műsorvezető',
      game: 'EG6',
      type: 'freetext',
      sort: 1,
      prompt: 'Ki van a képen?',
      answers: ['Kurt Cobain|Cobain'],
      correct: '',
      time: 20,
      note: 'A képet a kérdésre töltöd, nem az Excelbe.',
    }),
    sampleRow({
      topic: 'Filmek',
      game: 'EG7',
      type: 'single',
      sort: 1,
      prompt: 'Melyik filmben szerepelt ez a dal?',
      answers: ['Trainspotting', 'Ponyvaregény', 'Mátrix', 'Titanic'],
      correct: '1',
      time: 12,
      note: 'Filmguru. Egyválasztós.',
    }),
    sampleRow({
      topic: 'Hangok',
      game: 'EG8',
      type: 'freetext',
      sort: 1,
      prompt: 'Ki beszél?',
      answers: ['David Attenborough|Attenborough'],
      correct: '',
      time: 20,
      note: 'Ki beszél? Szabad szöveg. A hangot a kérdésre töltöd.',
    }),
  ]);
  applyTemplateCols(samples);
  samples['!cols'] = [...(samples['!cols'] || []), { wch: 62 }];
  XLSX.utils.book_append_sheet(wb, samples, 'Minták');

  const legend = XLSX.utils.aoa_to_sheet([
    ['Oszlop / kód', 'Jelentés', 'Helyes mező'],
    ['kviz vagy üres', 'Forduló kérdésbankja', ''],
    ['single', 'Egyválasztós', '1 = első válasz'],
    ['multi', 'Többválasztós', '1|2|3'],
    ['order', 'Sorrendezés', '3|1|2|4'],
    ['match', 'Párosítás, legfeljebb 4 pár', 'bal=jobb|bal2=jobb2'],
    ['category', 'Kategorizálás. Válasz = darab, Kategória = csoport', 'dal=pop|dal2=grunge'],
    ['freetext', 'Szabad szöveg', 'Szinonimák a Válasz1-ben: a|b'],
    ['Sorszám', '1–8 a fordulóban, üres = csak a kérdésbank', ''],
    ['IdőMp', 'Üresen a típus alapideje. Mozaiknál hagyd üresen.', ''],
    ['EG1 Párbaj', 'Saját egyválasztós sorok, Játék = EG1. Induláskor ebből jön az 5 kérdés.', '1 = első válasz'],
    ['EG2 Mozaik', 'Szabad szöveg. Az idő üres. A hang a kérdésen.', 'Válasz1: cím|előadó'],
    ['EG3 Karaoke', 'Nincs kérdés sor. A pont a játékmester pluszpontja.', ''],
    ['EG4 Reverse', 'Szabad szöveg, cím vagy előadó.', ''],
    ['EG5 Generációk', 'Rövid egyválasztós.', ''],
    ['EG6 Műsorvezető', 'Szabad szöveg. A kép a kérdésen.', ''],
    ['EG7 Filmguru', 'Egyválasztós.', ''],
    ['EG8 Ki beszél?', 'Szabad szöveg. A hang a kérdésen.', ''],
  ]);
  legend['!cols'] = [{ wch: 22 }, { wch: 62 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, legend, 'Típusok');

  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  downloadBinaryFile(
    'olimpub-kerdesek.xlsx',
    bytes,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
