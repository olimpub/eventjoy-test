import { api } from 'src/boot/axios';
import {
  isTruthyFlag,
  nullableNumericId,
  pickDataset,
  readAxiosHttpStatus,
  readCreatedEntityId,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

export interface SupportTicketType {
  ticketTypeId: number;
  name: string;
  code: string;
}

export interface SupportTicketStatus {
  ticketStatusId: number;
  name: string;
  isClosedState: boolean;
}

export interface SupportTicketMetadata {
  types: SupportTicketType[];
  statuses: SupportTicketStatus[];
}

export interface SupportTicketSummary {
  ticketId: number;
  title: string;
  description: string;
  typeId: number | null;
  typeName: string;
  statusId: number | null;
  statusName: string;
  isClosedState: boolean;
  canWithdraw: boolean;
  targetVersion: string;
  updatedAt: string | null;
  createdAt: string | null;
}

export type SupportCommentAuthorKind = 'self' | 'sysadmin' | 'ai' | 'other';

export interface SupportTicketComment {
  commentId: number;
  body: string;
  createdAt: string | null;
  userId: number | null;
  authorName: string;
  authorKind: SupportCommentAuthorKind;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  comments: SupportTicketComment[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const rec = asRecord(item);
      if (rec) return rec;
    }
    return null;
  }
  return asRecord(value);
}

function looksLikeTicketRow(rec: Record<string, unknown>): boolean {
  return !!(
    rec.ticketId ??
    rec.TicketId ??
    rec.TicketID ??
    rec.Title ??
    rec.title ??
    rec.ticketTitle ??
    rec.TicketTitle ??
    rec.TicketTypeID ??
    rec.ticketTypeId ??
    rec.TicketStatusID ??
    rec.ticketStatusId ??
    rec.Description ??
    rec.description ??
    rec.statusName ??
    rec.StatusName
  );
}

function ticketIdFrom(rec: Record<string, unknown>): number | null {
  return nullableNumericId(
    rec.ticketId ??
      rec.TicketId ??
      rec.TicketID ??
      rec.ticketID ??
      rec.id ??
      rec.Id ??
      rec.ID
  );
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function readDate(...values: unknown[]): string | null {
  for (const value of values) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function readFlag(...values: unknown[]): boolean {
  return values.some((value) => value != null && isTruthyFlag(value));
}

function unwrapList(raw: unknown, names: string[], resultKeys: string[] = []): unknown[] {
  if (Array.isArray(raw)) return raw;
  const data = unwrapApiPayload(raw);
  const fromKeys = pickDataset(data, ...names);
  if (fromKeys.length) return fromKeys;
  for (const key of resultKeys) {
    const val = data[key];
    if (Array.isArray(val) && val.length) return val;
  }
  return fromKeys;
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Hiba',
  'feature request': 'Fejlesztési igény',
  feature: 'Fejlesztési igény',
  question: 'Kérdés',
  kérdés: 'Kérdés',
  hiba: 'Hiba',
};

export function displayTicketTypeName(name: string, code = ''): string {
  const raw = (name || code).trim();
  if (!raw) return 'Jegy';
  return TYPE_LABELS[raw.toLowerCase()] || raw;
}

export function formatTicketDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ticketStatusTone(statusName: string, isClosedState: boolean): string {
  const key = statusName.toLowerCase();
  if (key.includes('függő') || key.includes('pending')) return 'pending';
  if (key.includes('folyamat') || key.includes('progress') || key.includes('vizsgál')) return 'progress';
  if (key.includes('ütemez') || key.includes('schedul')) return 'scheduled';
  if (key.includes('kiad') || key.includes('release') || key.includes('kész') || key.includes('done')) {
    return 'released';
  }
  if (key.includes('elutas') || key.includes('reject')) return 'rejected';
  if (key.includes('visszavon') || key.includes('withdraw')) return 'withdrawn';
  return isClosedState ? 'closed' : 'open';
}

export function currentUserId(user: unknown): number | null {
  const rec = asRecord(user);
  if (!rec) return null;
  return nullableNumericId(rec.id ?? rec.UserID ?? rec.userID ?? rec.UserId ?? rec.ID);
}

function parseTicketType(row: unknown): SupportTicketType | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const ticketTypeId = nullableNumericId(
    rec.ticketTypeId ?? rec.TicketTypeId ?? rec.TicketTypeID ?? rec.id ?? rec.Id ?? rec.ID
  );
  if (ticketTypeId == null) return null;
  const code = readString(rec.code, rec.Code, rec.TypeCode, rec.typeCode);
  const name = displayTicketTypeName(
    readString(rec.name, rec.Name, rec.typeName, rec.TypeName, rec.SName, rec.Title),
    code
  );
  return { ticketTypeId, name, code };
}

function parseTicketStatus(row: unknown): SupportTicketStatus | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const ticketStatusId = nullableNumericId(
    rec.ticketStatusId ?? rec.TicketStatusId ?? rec.TicketStatusID ?? rec.id ?? rec.Id ?? rec.ID
  );
  if (ticketStatusId == null) return null;
  return {
    ticketStatusId,
    name: readString(rec.name, rec.Name, rec.statusName, rec.StatusName, rec.SName) || 'Státusz',
    isClosedState: readFlag(rec.isClosedState, rec.IsClosedState, rec.ClosedFlg, rec.IsClosed),
  };
}

export function parseSupportTicketMetadata(raw: unknown): SupportTicketMetadata {
  const data = unwrapApiPayload(raw);
  const types = unwrapList(
    data,
    ['TicketTypes', 'ticketTypes', 'Types', 'types', 'tblTicketType'],
    ['Result2', 'result2']
  )
    .map(parseTicketType)
    .filter((row): row is SupportTicketType => row != null);
  const statuses = unwrapList(
    data,
    ['TicketStatuses', 'ticketStatuses', 'Statuses', 'statuses', 'tblTicketStatus'],
    ['Result3', 'result3']
  )
    .map(parseTicketStatus)
    .filter((row): row is SupportTicketStatus => row != null);
  return { types, statuses };
}

function resolveStatusClosed(
  rec: Record<string, unknown>,
  statusName: string,
  metadata?: SupportTicketMetadata | null
): boolean {
  if (rec.isClosedState != null || rec.IsClosedState != null || rec.ClosedFlg != null || rec.IsClosed != null) {
    return readFlag(rec.isClosedState, rec.IsClosedState, rec.ClosedFlg, rec.IsClosed);
  }
  const statusId = nullableNumericId(
    rec.ticketStatusId ?? rec.TicketStatusId ?? rec.TicketStatusID ?? rec.StatusID
  );
  const fromMeta = metadata?.statuses.find(
    (item) =>
      item.ticketStatusId === statusId ||
      item.name.toLowerCase() === statusName.toLowerCase()
  );
  if (fromMeta) return fromMeta.isClosedState;
  const key = statusName.toLowerCase();
  return (
    key.includes('kiad') ||
    key.includes('elutas') ||
    key.includes('visszavon') ||
    key.includes('lezárt') ||
    key.includes('closed') ||
    key.includes('released') ||
    key.includes('reject') ||
    key.includes('withdraw')
  );
}

export function parseSupportTicketSummary(
  row: unknown,
  metadata?: SupportTicketMetadata | null
): SupportTicketSummary | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const ticketId = ticketIdFrom(rec);
  if (ticketId == null) return null;
  const typeId = nullableNumericId(rec.ticketTypeId ?? rec.TicketTypeId ?? rec.TicketTypeID);
  const statusId = nullableNumericId(
    rec.ticketStatusId ?? rec.TicketStatusId ?? rec.TicketStatusID ?? rec.StatusID
  );
  const typeFromMeta = metadata?.types.find((item) => item.ticketTypeId === typeId);
  const statusFromMeta = metadata?.statuses.find((item) => item.ticketStatusId === statusId);
  const typeName = displayTicketTypeName(
    readString(rec.typeName, rec.TypeName, rec.ticketTypeName, rec.TicketTypeName, typeFromMeta?.name),
    typeFromMeta?.code || ''
  );
  const statusName =
    readString(rec.statusName, rec.StatusName, rec.SName, statusFromMeta?.name) || 'Függőben';
  const isClosedState = resolveStatusClosed(rec, statusName, metadata);
  const canWithdrawRaw = rec.canWithdraw ?? rec.CanWithdraw ?? rec.CanUndo;
  return {
    ticketId,
    title: readString(rec.title, rec.Title, rec.ticketTitle, rec.TicketTitle, rec.subject, rec.Subject) || 'Névtelen jegy',
    description: readString(
      rec.description,
      rec.Description,
      rec.body,
      rec.Body,
      rec.ticketBody,
      rec.TicketBody,
      typeof rec.details === 'string' ? rec.details : null,
      typeof rec.Details === 'string' ? rec.Details : null,
      rec.ticketText,
      rec.TicketText
    ),
    typeId,
    typeName,
    statusId,
    statusName,
    isClosedState,
    canWithdraw: canWithdrawRaw == null ? !isClosedState : isTruthyFlag(canWithdrawRaw),
    targetVersion: readString(rec.targetVersion, rec.TargetVersion, rec.releaseVersion, rec.ReleaseVersion),
    updatedAt: readDate(
      rec.updatedAt,
      rec.UpdatedAt,
      rec.modifiedAt,
      rec.ModifiedAt,
      rec.lastChangeAt,
      rec.LastChangeAt,
      rec.changeDate,
      rec.ChangeDate
    ),
    createdAt: readDate(rec.createdAt, rec.CreatedAt, rec.createDate, rec.CreateDate),
  };
}

function detectAuthorKind(
  rec: Record<string, unknown>,
  userId: number | null,
  authorName: string,
  selfUserId: number | null
): SupportCommentAuthorKind {
  const kind = readString(rec.authorKind, rec.AuthorKind, rec.kind, rec.Kind).toLowerCase();
  if (kind === 'ai' || kind === 'system' || kind === 'bot') return 'ai';
  if (kind === 'sysadmin' || kind === 'admin' || kind === 'support') return 'sysadmin';
  if (kind === 'self' || kind === 'user') {
    return selfUserId != null && userId === selfUserId ? 'self' : 'other';
  }
  if (readFlag(rec.isAi, rec.IsAi, rec.aiFlg, rec.AiFlg, rec.systemFlg, rec.SystemFlg, rec.isSystem, rec.IsSystem)) {
    return 'ai';
  }
  if (readFlag(rec.isSysAdmin, rec.IsSysAdmin, rec.sysAdminFlg, rec.SysAdminFlg, rec.isAdmin, rec.IsAdmin)) {
    return 'sysadmin';
  }
  const nameKey = authorName.toLowerCase();
  if (nameKey === 'ai' || nameKey.includes('eventjoy ai') || nameKey.startsWith('ai ')) return 'ai';
  if (selfUserId != null && userId != null && userId === selfUserId) return 'self';
  return 'other';
}

export function parseSupportTicketComment(
  row: unknown,
  selfUserId: number | null,
  index = 0
): SupportTicketComment | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const body = readString(
    rec.body,
    rec.Body,
    rec.comment,
    rec.Comment,
    rec.commentBody,
    rec.CommentBody,
    rec.commentText,
    rec.CommentText,
    rec.message,
    rec.Message,
    rec.text,
    rec.Text
  );
  if (!body) return null;
  const userId = nullableNumericId(rec.userId ?? rec.UserId ?? rec.UserID ?? rec.createdBy ?? rec.CreatedBy);
  const authorName =
    readString(
      rec.authorName,
      rec.AuthorName,
      rec.userName,
      rec.UserName,
      rec.displayName,
      rec.DisplayName,
      rec.fullName,
      rec.FullName
    ) || 'Felhasználó';
  return {
    commentId:
      nullableNumericId(
        rec.ticketCommentId ?? rec.TicketCommentId ?? rec.TicketCommentID ?? rec.id ?? rec.Id ?? rec.ID
      ) ?? index + 1,
    body,
    createdAt: readDate(rec.createdAt, rec.CreatedAt, rec.createDate, rec.CreateDate),
    userId,
    authorName,
    authorKind: detectAuthorKind(rec, userId, authorName, selfUserId),
  };
}

function parseTicketIdLoose(rec: Record<string, unknown>, expectedTicketId?: number): number | null {
  return ticketIdFrom(rec) ?? (looksLikeTicketRow(rec) ? expectedTicketId ?? null : null);
}

export function parseSupportTicketDetail(
  raw: unknown,
  selfUserId: number | null,
  metadata?: SupportTicketMetadata | null,
  expectedTicketId?: number
): SupportTicketDetail | null {
  const data = unwrapApiPayload(raw);
  const candidates: unknown[] = [
    data.details,
    data.Details,
    data.Ticket,
    data.ticket,
    data.Tickets,
    data.tickets,
    data.Result2,
    data.result2,
    data,
  ];
  let summary: SupportTicketSummary | null = null;
  let ticketSource: Record<string, unknown> | null = null;
  for (const candidate of candidates) {
    const rows = Array.isArray(candidate)
      ? candidate.map(firstRecord).filter((row): row is Record<string, unknown> => row != null)
      : firstRecord(candidate)
        ? [firstRecord(candidate)!]
        : [];
    for (const rec of rows) {
      const parsed = parseSupportTicketSummary(rec, metadata);
      if (parsed && (expectedTicketId == null || parsed.ticketId === expectedTicketId)) {
        summary = parsed;
        ticketSource = rec;
        break;
      }
      const looseId = parseTicketIdLoose(rec, expectedTicketId);
      if (looseId != null && looksLikeTicketRow(rec) && (expectedTicketId == null || looseId === expectedTicketId)) {
        const withId = parseSupportTicketSummary({ ...rec, TicketID: looseId }, metadata);
        if (withId) {
          summary = withId;
          ticketSource = rec;
          break;
        }
      }
    }
    if (summary) break;
  }
  if (!summary && expectedTicketId != null) {
    const list = unwrapList(raw, ['Tickets', 'tickets', 'Ticket', 'ticket'], ['Result2', 'result2']);
    for (const row of list) {
      const item = parseSupportTicketSummary(row, metadata);
      if (item && item.ticketId === expectedTicketId) {
        summary = item;
        ticketSource = firstRecord(row);
        break;
      }
    }
    if (!summary && list.length === 1) {
      summary = parseSupportTicketSummary(list[0], metadata);
      ticketSource = firstRecord(list[0]);
    }
  }
  if (!summary && expectedTicketId != null) {
    const detailsRow = firstRecord(data.details ?? data.Details);
    if (detailsRow) {
      summary = parseSupportTicketSummary({ ...detailsRow, TicketID: expectedTicketId }, metadata);
      ticketSource = detailsRow;
    }
  }
  if (!summary) return null;
  const commentNames = [
    'Comments',
    'comments',
    'TicketComments',
    'ticketComments',
    'tblTicketComment',
  ];
  const comments = [
    ...unwrapList(data, commentNames, ['Result3', 'result3', 'Result4', 'result4']),
    ...unwrapList(ticketSource, commentNames, []),
  ]
    .map((row, index) => parseSupportTicketComment(row, selfUserId, index))
    .filter((row): row is SupportTicketComment => row != null);
  const unique = new Map<string, SupportTicketComment>();
  for (const comment of comments) {
    unique.set(`${comment.commentId}:${comment.body}:${comment.createdAt || ''}`, comment);
  }
  return { ...summary, comments: [...unique.values()] };
}

export function parseSupportTicketList(
  raw: unknown,
  metadata?: SupportTicketMetadata | null
): SupportTicketSummary[] {
  return unwrapList(raw, ['Tickets', 'tickets', 'Ticket', 'ticket'], ['Result2', 'result2'])
    .map((row) => parseSupportTicketSummary(row, metadata))
    .filter((row): row is SupportTicketSummary => row != null)
    .sort((a, b) => {
      const aAt = a.updatedAt || a.createdAt || '';
      const bAt = b.updatedAt || b.createdAt || '';
      return bAt.localeCompare(aAt);
    });
}

export async function fetchSupportTicketMetadata(): Promise<SupportTicketMetadata> {
  const response = await api.get('/tickets/metadata');
  throwIfApiFailed(response.data, 'A jegy típusok nem tölthetők.');
  return parseSupportTicketMetadata(response.data);
}

export async function fetchSupportTickets(
  metadata?: SupportTicketMetadata | null
): Promise<SupportTicketSummary[]> {
  const response = await api.get('/tickets');
  throwIfApiFailed(response.data, 'A jegyeid nem tölthetők.');
  return parseSupportTicketList(response.data, metadata);
}

export async function fetchSupportTicket(
  ticketId: number,
  selfUserId: number | null,
  metadata?: SupportTicketMetadata | null
): Promise<SupportTicketDetail> {
  try {
    const response = await api.get(`/tickets/${ticketId}`);
    throwIfApiFailed(response.data, 'A jegy nem tölthető.');
    const detail = parseSupportTicketDetail(response.data, selfUserId, metadata, ticketId);
    if (detail) return detail;
    console.warn('[support ticket] parse failed', Object.keys(unwrapApiPayload(response.data)));
  } catch (error) {
    const status = readAxiosHttpStatus(error);
    if (status != null && status !== 404 && status !== 405) throw error;
    if (status == null && error instanceof Error && !error.message.includes('hiányosak')) {
      throw error;
    }
  }
  const fromList = (await fetchSupportTickets(metadata)).find((row) => row.ticketId === ticketId);
  if (fromList) return { ...fromList, comments: [] };
  throw new Error('A jegy adatai hiányosak.');
}

export async function createSupportTicket(input: {
  ticketTypeId: number;
  title: string;
  description: string;
}): Promise<number | null> {
  const response = await api.post('/tickets', {
    ticketTypeId: input.ticketTypeId,
    TicketTypeId: input.ticketTypeId,
    TicketTypeID: input.ticketTypeId,
    title: input.title,
    Title: input.title,
    description: input.description,
    Description: input.description,
    body: input.description,
    Body: input.description,
  });
  throwIfApiFailed(response.data, 'A jegy rögzítése sikertelen.');
  return readCreatedEntityId(response.data, 'TicketID', 'ticketId', 'TicketId', 'id');
}

export async function postSupportTicketComment(ticketId: number, body: string): Promise<void> {
  const response = await api.post(`/tickets/${ticketId}/comments`, {
    body,
    Body: body,
    comment: body,
    Comment: body,
    commentBody: body,
    CommentBody: body,
    commentText: body,
    CommentText: body,
    message: body,
    Message: body,
    text: body,
    Text: body,
  });
  throwIfApiFailed(response.data, 'A hozzászólás nem menthető.');
}

export async function withdrawSupportTicket(ticketId: number): Promise<void> {
  const response = await api.post(`/tickets/${ticketId}/withdraw`, {});
  throwIfApiFailed(response.data, 'A visszavonás sikertelen.');
}
