import * as XLSX from 'xlsx';
import { api } from 'src/boot/axios';
import {
  pickGroupingText,
  type EventGroupingAttr,
  type EventGroupingKey,
} from 'src/modules/profitability/ptaData';
import {
  isActiveFlag,
  nullableNumericId,
  pickDataset,
  readApiReturnDescription,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

export const INVITE_TEMPLATE_HEADERS = [
  'Vezetéknév',
  'Keresztnév',
  'Email-cím',
  'Telefonszám',
  'Szerepkör',
  'Jegy',
] as const;

export type InviteGroupingJsonField =
  | 'OrganizationName'
  | 'TeamName'
  | 'RegionName'
  | 'CompanyName';

export interface InviteGroupingColumn {
  key: EventGroupingKey;
  header: string;
  jsonField: InviteGroupingJsonField;
  aliases: string[];
  example: string;
}

/** PTA extra oszlopok — sorrend = Organization / Team / Region / Company */
export const INVITE_GROUPING_COLUMNS: InviteGroupingColumn[] = [
  {
    key: 'organization',
    header: 'Szervezet',
    jsonField: 'OrganizationName',
    aliases: ['szervezet', 'organization', 'organizationname', 'org'],
    example: 'EventJoy',
  },
  {
    key: 'team',
    header: 'Csapat',
    jsonField: 'TeamName',
    aliases: ['csapat', 'team', 'teamname'],
    example: 'Alfa',
  },
  {
    key: 'region',
    header: 'Régió',
    jsonField: 'RegionName',
    aliases: ['regio', 'region', 'regionname'],
    example: 'Nyugat',
  },
  {
    key: 'company',
    header: 'Cég',
    jsonField: 'CompanyName',
    aliases: ['ceg', 'company', 'companyname'],
    example: 'Acme Kft.',
  },
];

export interface InviteImportRow {
  Vezetéknév: string;
  Keresztnév: string;
  'Email-cím': string;
  Telefonszám: string;
  Szerepkör: string;
  Jegy: string;
  OrganizationName?: string;
  TeamName?: string;
  RegionName?: string;
  CompanyName?: string;
}

export interface InviteImportPayload {
  EventID: number;
  Invitations: InviteImportRow[];
}

/** POST /event/invite/import — HTTP 400 body */
export interface InviteImportErrorRow {
  RowID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  ResultMsg: string;
}

export interface InviteImportHttpError {
  status: number;
  message: string;
  rows: InviteImportErrorRow[];
}

function pickRowField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val == null || val === '') continue;
    const s = String(val).trim();
    if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') continue;
    return s;
  }
  return '';
}

export function readInviteImportHttpError(error: unknown): InviteImportHttpError | null {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  if (!response || response.status !== 400) return null;

  const data = unwrapApiPayload(response.data);
  const rawRows = pickDataset(data, 'Rows', 'rows') as unknown[];
  const rows: InviteImportErrorRow[] = [];
  for (const item of rawRows) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const resultMsg = pickRowField(
      row,
      'ReturnMsg',
      'returnMsg',
      'ResultMsg',
      'resultMsg',
      'Message',
      'Error',
      'Hiba'
    );
    if (!resultMsg) continue;
    rows.push({
      RowID: pickRowField(row, 'RowID', 'rowID', 'RowId', 'rowId', 'Sor'),
      FirstName: pickRowField(row, 'FirstName', 'firstName', 'Vezetéknév'),
      LastName: pickRowField(row, 'LastName', 'lastName', 'Keresztnév'),
      Email: pickRowField(row, 'Email', 'email', 'EmailAddress', 'Email-cím'),
      ResultMsg: resultMsg,
    });
  }

  return {
    status: 400,
    message:
      readApiReturnDescription(data) ||
      readApiReturnDescription(response.data) ||
      'A meghívók feltöltése sikertelen.',
    rows,
  };
}

export interface InviteTemplateHints {
  roles: string[];
  tickets: string[];
  grouping?: EventGroupingAttr[];
  groupingValues?: Partial<Record<EventGroupingKey, string[]>>;
}

export function inviteTemplateHeaders(grouping: EventGroupingAttr[] = []): string[] {
  const extra = grouping
    .map((attr) => INVITE_GROUPING_COLUMNS.find((col) => col.key === attr.key)?.header)
    .filter((header): header is string => !!header);
  return [...INVITE_TEMPLATE_HEADERS, ...extra];
}

const EXAMPLE_EMAIL = 'pelda@eventjoy.hu';

function foldHu(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function headerKey(value: string): string {
  return foldHu(value).replace(/[^a-z0-9]+/g, '');
}

function isEmptyRow(cells: string[]): boolean {
  return cells.every((cell) => !String(cell || '').trim());
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of values) {
    const name = raw.trim();
    if (!name) continue;
    const key = foldHu(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b, 'hu'));
}

export function listInviteRoleNames(
  eventId: string | number,
  eventRoles: unknown[],
  getRoleName: (roleId: number) => string
): string[] {
  const target = String(eventId);
  const names: string[] = [];

  for (const raw of eventRoles || []) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (!isActiveFlag(row.ActiveFlg ?? row.activeFlg)) continue;
    const rowEventId = row.EventID ?? row.eventID ?? row.EventId;
    if (rowEventId != null && String(rowEventId) !== target) continue;
    const masterRoleId = nullableNumericId(row.RoleID ?? row.RoleId ?? row.roleID);
    const name =
      String(row.RoleName ?? row.roleName ?? row.Name ?? '').trim() ||
      (masterRoleId != null ? getRoleName(masterRoleId) : '');
    if (name) names.push(name);
  }

  return uniqueNames(names);
}

export function listInviteTicketNames(eventId: string | number, tickets: unknown[]): string[] {
  const target = String(eventId);
  const names: string[] = [];

  for (const raw of tickets || []) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (!isActiveFlag(row.ActiveFlg ?? row.activeFlg)) continue;
    const rowEventId = row.EventID ?? row.eventID ?? row.EventId;
    if (rowEventId != null && String(rowEventId) !== target) continue;
    const name = String(row.TicketName ?? row.ticketName ?? row.Name ?? row.name ?? '').trim();
    if (name) names.push(name);
  }

  return uniqueNames(names);
}

export function listInviteGroupingNames(
  eventId: string | number,
  grouping: EventGroupingAttr[],
  sources: unknown[]
): Partial<Record<EventGroupingKey, string[]>> {
  const target = String(eventId);
  const buckets: Partial<Record<EventGroupingKey, string[]>> = {};
  for (const attr of grouping) buckets[attr.key] = [];

  for (const raw of sources || []) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const rowEventId = row.EventID ?? row.eventID ?? row.EventId;
    if (rowEventId != null && String(rowEventId) !== target) continue;
    for (const attr of grouping) {
      const text = pickGroupingText(row, attr.key);
      if (text && text !== '—') buckets[attr.key]?.push(text);
    }
  }

  const out: Partial<Record<EventGroupingKey, string[]>> = {};
  for (const attr of grouping) {
    out[attr.key] = uniqueNames(buckets[attr.key] || []);
  }
  return out;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (!isEmptyRow(row)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }

  row.push(cell);
  if (!isEmptyRow(row)) rows.push(row);
  return rows;
}

function detectDelimiter(headerLine: string): string {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (tab > 0 && tab >= semi && tab >= comma) return '\t';
  if (semi >= comma) return ';';
  return ',';
}

function columnIndex(header: string[], ...aliases: string[]): number {
  const wanted = new Set(aliases.map(headerKey));
  return header.findIndex((cell) => wanted.has(headerKey(cell)));
}

function cellAt(cells: string[], index: number): string {
  if (index < 0) return '';
  return String(cells[index] ?? '').trim();
}

function looksLikeHeader(row: string[]): boolean {
  const key = headerKey(row.join(' '));
  return key.includes('vezeteknev') || key.includes('emailcim') || key.includes('szerepkor');
}

export function missingInviteGroupingHeaders(
  grid: string[][],
  grouping: EventGroupingAttr[] = []
): string[] {
  if (!grouping.length) return [];
  if (!grid.length || !looksLikeHeader(grid[0])) {
    return grouping.map((attr) => attr.label);
  }
  const header = grid[0].map((cell) => String(cell || '').trim());
  const missing: string[] = [];
  for (const attr of grouping) {
    const col = INVITE_GROUPING_COLUMNS.find((item) => item.key === attr.key);
    if (!col) continue;
    if (columnIndex(header, col.header, ...col.aliases) < 0) missing.push(attr.label);
  }
  return missing;
}

export function listInviteGroupingCellErrors(
  rows: InviteImportRow[],
  grouping: EventGroupingAttr[] = []
): InviteImportErrorRow[] {
  if (!grouping.length) return [];
  const errors: InviteImportErrorRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const missing = grouping
      .filter((attr) => {
        const col = INVITE_GROUPING_COLUMNS.find((item) => item.key === attr.key);
        if (!col) return false;
        return !String(row[col.jsonField] || '').trim();
      })
      .map((attr) => attr.label);
    if (!missing.length) continue;
    errors.push({
      RowID: String(i + 2),
      FirstName: row.Vezetéknév,
      LastName: row.Keresztnév,
      Email: row['Email-cím'],
      ResultMsg: `Hiányzó ${missing.join(', ')}`,
    });
  }
  return errors;
}

function mapGridToInvites(grid: string[][]): InviteImportRow[] {
  if (!grid.length) return [];

  const header = grid[0].map((cell) => String(cell || '').trim());
  const named = {
    last: columnIndex(header, 'vezeteknev'),
    first: columnIndex(header, 'keresztnev'),
    email: columnIndex(header, 'emailcim', 'email-cim', 'email', 'e-mail', 'mail'),
    phone: columnIndex(header, 'telefonszam', 'telefon', 'telszam'),
    role: columnIndex(header, 'szerepkor'),
    ticket: columnIndex(header, 'jegy'),
  };
  const hasNames = Object.values(named).every((idx) => idx >= 0);
  const cols = hasNames
    ? named
    : { last: 0, first: 1, email: 2, phone: 3, role: 4, ticket: 5 };
  const groupingIdx = INVITE_GROUPING_COLUMNS.map((col) => ({
    jsonField: col.jsonField,
    idx: columnIndex(header, col.header, ...col.aliases),
  }));
  const start = looksLikeHeader(grid[0]) ? 1 : 0;
  const rows: InviteImportRow[] = [];

  for (let i = start; i < grid.length; i++) {
    const cells = grid[i] || [];
    if (isEmptyRow(cells)) continue;
    const row: InviteImportRow = {
      Vezetéknév: cellAt(cells, cols.last),
      Keresztnév: cellAt(cells, cols.first),
      'Email-cím': cellAt(cells, cols.email),
      Telefonszám: cellAt(cells, cols.phone),
      Szerepkör: cellAt(cells, cols.role),
      Jegy: cellAt(cells, cols.ticket),
    };
    for (const col of groupingIdx) {
      if (col.idx < 0) continue;
      row[col.jsonField] = cellAt(cells, col.idx);
    }
    rows.push(row);
  }

  return rows;
}

function cellText(cell: Element): string {
  const data = cell.getElementsByTagName('Data')[0];
  return (data?.textContent || cell.textContent || '').trim();
}

function parseSpreadsheetMl(xml: string): string[][] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) throw new Error('A táblázat XML-je hibás.');

  const worksheets = Array.from(doc.getElementsByTagName('Worksheet'));
  for (const sheet of worksheets) {
    const name = foldHu(sheet.getAttribute('ss:Name') || sheet.getAttribute('Name') || '');
    if (
      name.includes('szerepkor') ||
      name.includes('jegy') ||
      name.includes('szervezet') ||
      name.includes('csapat') ||
      name.includes('regio') ||
      name.includes('ceg')
    ) continue;
    const rows = Array.from(sheet.getElementsByTagName('Row'));
    const grid: string[][] = [];
    for (const row of rows) {
      const cells = Array.from(row.getElementsByTagName('Cell'));
      const line: string[] = [];
      let col = 0;
      for (const cell of cells) {
        const indexRaw = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
        const index = indexRaw ? Number(indexRaw) : NaN;
        if (Number.isFinite(index) && index > 0) {
          while (col < index - 1) {
            line.push('');
            col += 1;
          }
        }
        line.push(cellText(cell));
        col += 1;
      }
      if (!isEmptyRow(line)) grid.push(line);
    }
    if (grid.length) return grid;
  }
  return [];
}

function ssRow(cells: string[]): string {
  return `    <Row>\n${cells
    .map((cell) => `      <Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
    .join('\n')}\n    </Row>`;
}

function exampleRow(hints: InviteTemplateHints): string[] {
  const grouping = hints.grouping || [];
  const extra = grouping.map((attr) => {
    const existing = hints.groupingValues?.[attr.key]?.[0];
    if (existing) return existing;
    const col = INVITE_GROUPING_COLUMNS.find((item) => item.key === attr.key);
    return col?.example || attr.label;
  });
  return [
    'Kovács',
    'Anna',
    EXAMPLE_EMAIL,
    '+36301234567',
    hints.roles[0] || 'Résztvevő',
    hints.tickets[0] || 'Normál',
    ...extra,
  ];
}

export function buildInviteTemplateXlsx(hints: InviteTemplateHints, eventTitle = ''): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Meghívottak sheet
  const mainData = [
    inviteTemplateHeaders(hints.grouping),
    exampleRow(hints)
  ];
  const wsMain = XLSX.utils.aoa_to_sheet(mainData);
  XLSX.utils.book_append_sheet(wb, wsMain, 'Meghívottak');

  // Szerepkörök sheet
  const roleRows = (hints.roles.length ? hints.roles : ['(nincs szerepkör)']).map(r => [r]);
  roleRows.unshift(['Szerepkör']);
  if (eventTitle) roleRows.push([`Esemény: ${eventTitle}`]);
  const wsRoles = XLSX.utils.aoa_to_sheet(roleRows);
  XLSX.utils.book_append_sheet(wb, wsRoles, 'Szerepkörök');

  // Jegyek sheet
  const ticketRows = (hints.tickets.length ? hints.tickets : ['(nincs jegy)']).map(t => [t]);
  ticketRows.unshift(['Jegy']);
  const wsTickets = XLSX.utils.aoa_to_sheet(ticketRows);
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Jegyek');

  for (const attr of hints.grouping || []) {
    const names = hints.groupingValues?.[attr.key] || [];
    const rows = (names.length ? names : ['(nincs érték)']).map((name) => [name]);
    rows.unshift([attr.label]);
    if (eventTitle) rows.push([`Esemény: ${eventTitle}`]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, attr.label);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export function buildInviteTemplateCsv(hints: InviteTemplateHints): string {
  const lines = [inviteTemplateHeaders(hints.grouping).join(';'), exampleRow(hints).join(';')];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function downloadTextFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents as any], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function looksLikeOle(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

export async function parseInviteFile(
  file: File,
  grouping: EventGroupingAttr[] = []
): Promise<InviteImportRow[]> {
  const buffer = await file.arrayBuffer();
  let strGrid: string[][] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    strGrid = grid.map((row) => row.map((cell) => String(cell ?? '').trim()));
  } catch {
    throw new Error('A fájl nem olvasható. Győződj meg róla, hogy valós .xlsx fájl.');
  }

  const missing = missingInviteGroupingHeaders(strGrid, grouping);
  if (missing.length) {
    throw new Error(
      `A sablonból hiányzik: ${missing.join(', ')}. Töltsd le az aktuális sablont.`
    );
  }

  return mapGridToInvites(strGrid);
}

export function toInviteImportPayload(
  eventId: number,
  rows: InviteImportRow[],
  grouping: EventGroupingAttr[] = []
): InviteImportPayload {
  const enabled = new Set(grouping.map((attr) => attr.key));
  return {
    EventID: eventId,
    Invitations: rows.map((row) => {
      const invitation: InviteImportRow = {
        Vezetéknév: row.Vezetéknév,
        Keresztnév: row.Keresztnév,
        'Email-cím': row['Email-cím'],
        Telefonszám: row.Telefonszám,
        Szerepkör: row.Szerepkör,
        Jegy: row.Jegy,
      };
      for (const col of INVITE_GROUPING_COLUMNS) {
        if (!enabled.has(col.key)) continue;
        invitation[col.jsonField] = String(row[col.jsonField] || '').trim();
      }
      return invitation;
    }),
  };
}

export async function importEventInvites(payload: InviteImportPayload): Promise<string> {
  const response = await api.post('/event/invite/import', payload);
  throwIfApiFailed(response.data, 'A meghívók feltöltése sikertelen.');
  return readApiReturnDescription(response.data) || `${payload.Invitations.length} meghívó elküldve.`;
}

export function downloadBinaryFile(filename: string, contents: Uint8Array, mime: string) {
  const blob = new Blob([contents as any], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
