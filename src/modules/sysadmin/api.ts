import axios from 'axios';
import { api } from 'src/boot/axios';
import {
  isTruthyFlag,
  nullableNumericId,
  pickDataset,
  readAxiosErrorMessage,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';
import type {
  AuditDictionary,
  AuditField,
  AuditTable,
  PagedResult,
  SysadminDashboard,
  SysadminDataChangeLog,
  SysadminDataChangeLogQuery,
  SysadminErrorLog,
  SysadminErrorLogQuery,
  SysadminTicketComment,
  SysadminTicketDetail,
  SysadminTicketRow,
  SysadminAppVersion,
  SysadminAppVersionItem,
  SysadminAppVersionSave,
  KabalaAssetSlot,
  SysadminKabala,
  SysadminKabalaAsset,
  SysadminKabalaSave,
  SysadminUser,
  SysadminUserEdit,
  TicketMasterData,
  TicketMasterFlow,
  TicketMasterStatus,
} from './types';
import { TICKET_STATUS_OPTIONS, isClosedTicketStatus, USER_STATUS_OPTIONS } from './types';
import { decodeDisplayText } from 'src/utils/appVersions';
import { compressOpQuestionImage, opMediaKindOfFile, validateOpMediaFile } from 'src/modules/olimpub/opMedia';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = decodeDisplayText(String(value)).trim();
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

function readCount(...values: unknown[]): number {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function parsePaged<T>(raw: unknown, mapRow: (row: unknown) => T | null): PagedResult<T> {
  const data = unwrapApiPayload(raw);
  const list = data.Data ?? data.data ?? data.Items ?? data.items;
  const rows = (Array.isArray(list) ? list : [])
    .map(mapRow)
    .filter((row): row is T => row != null);
  return {
    rows,
    totalCount: readCount(data.TotalCount, data.totalCount, rows.length),
  };
}

export function userStatusLabel(statusId: number | null | undefined): string {
  return USER_STATUS_OPTIONS.find((item) => item.value === statusId)?.label || `Státusz ${statusId ?? '?'}`;
}

export function ticketStatusLabel(statusId: number | null | undefined, fallback = ''): string {
  return TICKET_STATUS_OPTIONS.find((item) => item.value === statusId)?.label || fallback || `Státusz ${statusId ?? '?'}`;
}

export function formatAdminDate(value: string | null | undefined): string {
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

export function formatSysadminUserName(
  user: Pick<SysadminUser, 'id' | 'firstName' | 'lastName' | 'emailAddress'>
): string {
  const name = `${user.lastName} ${user.firstName}`.trim();
  return name || user.emailAddress || `#${user.id}`;
}

function parseUser(row: unknown): SysadminUser | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const id = nullableNumericId(rec.Id ?? rec.ID ?? rec.id ?? rec.UserID ?? rec.UserId);
  if (id == null) return null;
  return {
    id,
    emailAddress: readString(rec.EmailAddress, rec.emailAddress, rec.Email, rec.email),
    firstName: readString(rec.FirstName, rec.firstName),
    lastName: readString(rec.LastName, rec.lastName),
    statusId: nullableNumericId(rec.StatusID ?? rec.StatusId ?? rec.statusId) ?? 0,
    isSysadmin: isTruthyFlag(rec.IsSysadmin ?? rec.isSysadmin ?? rec.SysAdminFlg),
    createdAt: readDate(rec.createdAt, rec.CreatedAt, rec.CreateDate),
    updatedAt: readDate(rec.updatedAt, rec.UpdatedAt, rec.ModifiedAt),
  };
}

function parseTicketRow(row: unknown): SysadminTicketRow | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const ticketId = nullableNumericId(rec.TicketID ?? rec.TicketId ?? rec.ticketId ?? rec.Id ?? rec.ID ?? rec.id);
  if (ticketId == null) return null;
  const statusId = nullableNumericId(rec.StatusID ?? rec.StatusId ?? rec.statusId ?? rec.TicketStatusID ?? rec.TicketStatusId);
  const first = readString(rec.ReporterFirstName, rec.reporterFirstName);
  const last = readString(rec.ReporterLastName, rec.reporterLastName);
  const statusName = readString(rec.StatusName, rec.statusName) || ticketStatusLabel(statusId);
  const closedFlag = rec.IsClosedState ?? rec.isClosedState;
  return {
    ticketId,
    reporterUserId: nullableNumericId(rec.ReporterUserID ?? rec.ReporterUserId ?? rec.reporterUserId),
    reporterName: `${last} ${first}`.trim(),
    reporterEmail: readString(rec.ReporterEmail, rec.reporterEmail),
    title: readString(rec.Subject, rec.subject, rec.Title, rec.title) || 'Névtelen jegy',
    description: readString(rec.Description, rec.description, rec.Body, rec.body),
    category: readString(rec.Category, rec.category, rec.TypeName, rec.typeName) || 'Jegy',
    statusId,
    statusName,
    isClosedState: closedFlag == null ? isClosedTicketStatus(statusId) : isTruthyFlag(closedFlag),
    targetVersion: readString(rec.TargetVersion, rec.targetVersion, rec.ReleaseVersion, rec.releaseVersion),
    createdAt: readDate(rec.createdAt, rec.CreatedAt),
    updatedAt: readDate(rec.updatedAt, rec.UpdatedAt),
  };
}

function parseTicketComment(row: unknown): SysadminTicketComment | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const body = readString(rec.CommentText, rec.commentText, rec.Body, rec.body);
  if (!body) return null;
  const first = readString(rec.AuthorFirstName, rec.authorFirstName);
  const last = readString(rec.AuthorLastName, rec.authorLastName);
  return {
    commentId: nullableNumericId(rec.CommentID ?? rec.CommentId ?? rec.commentId ?? rec.Id) ?? 0,
    userId: nullableNumericId(rec.UserID ?? rec.UserId ?? rec.userId),
    authorName: `${last} ${first}`.trim() || 'Felhasználó',
    authorIsSysadmin: isTruthyFlag(rec.AuthorIsSysadmin ?? rec.authorIsSysadmin),
    isSystemMessage: isTruthyFlag(rec.IsSystemMessage ?? rec.isSystemMessage),
    body,
    createdAt: readDate(rec.createdAt, rec.CreatedAt),
  };
}

function parseErrorLog(row: unknown): SysadminErrorLog | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const errorId = nullableNumericId(rec.ErrorID ?? rec.ErrorId ?? rec.errorId ?? rec.Id ?? rec.ID ?? rec.id);
  if (errorId == null) return null;
  const context = rec.ContextPayload_JSON ?? rec.ContextPayload ?? rec.contextPayload;
  const first = readString(rec.FirstName, rec.firstName, rec.UserFirstName, rec.userFirstName);
  const last = readString(rec.LastName, rec.lastName, rec.UserLastName, rec.userLastName);
  return {
    errorId,
    userId: nullableNumericId(rec.UserID ?? rec.UserId ?? rec.userId),
    userName:
      readString(rec.UserName, rec.userName, rec.FullName, rec.fullName) || `${last} ${first}`.trim(),
    source: readString(rec.Source, rec.source) || '—',
    severity: readString(rec.Severity, rec.severity) || 'Error',
    urlOrAction: readString(rec.UrlOrAction, rec.urlOrAction, rec.Url, rec.url),
    errorMessage: readString(rec.ErrorMessage, rec.errorMessage, rec.Message, rec.message),
    stackTrace: readString(rec.StackTrace, rec.stackTrace),
    contextPayload: typeof context === 'string' ? context : context != null ? JSON.stringify(context) : '',
    createdAt: readDate(rec.CreatedAt, rec.createdAt),
  };
}

export function errorLogSourceKind(source: string): 'frontend' | 'backend' | 'other' {
  const value = source.trim().toLowerCase();
  if (!value || value === '—') return 'other';
  if (value.includes('front')) return 'frontend';
  if (value.includes('back') || value === 'api') return 'backend';
  return 'other';
}

export function sortErrorLogsNewestFirst(rows: SysadminErrorLog[]): SysadminErrorLog[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || '') || 0;
    const bTime = Date.parse(b.createdAt || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.errorId - a.errorId;
  });
}

export function errorLogMatchesFilters(
  row: SysadminErrorLog,
  filters: Pick<SysadminErrorLogQuery, 'search' | 'source' | 'userId' | 'from' | 'to'>
): boolean {
  const created = Date.parse(row.createdAt || '') || 0;
  const from = filters.from ? Date.parse(filters.from) : NaN;
  const to = filters.to ? Date.parse(filters.to) : NaN;
  if (Number.isFinite(from) && created && created < from) return false;
  if (Number.isFinite(to) && created && created > to) return false;
  if (filters.source) {
    const kind = errorLogSourceKind(row.source);
    if (filters.source === 'Frontend' && kind !== 'frontend') return false;
    if (filters.source === 'Backend' && kind !== 'backend') return false;
  }
  const needle = filters.search.trim().toLowerCase();
  if (needle && !row.errorMessage.toLowerCase().includes(needle)) return false;
  if (filters.userId != null && row.userId !== filters.userId) return false;
  return true;
}

function parseDataChange(row: unknown): SysadminDataChangeLog | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const id = nullableNumericId(rec.LogID ?? rec.LogId ?? rec.logId ?? rec.Id ?? rec.ID ?? rec.id);
  if (id == null) return null;
  const oldData = rec.OldData_JSON ?? rec.OldData ?? rec.oldDataJson ?? rec.oldData;
  const newData = rec.NewData_JSON ?? rec.NewData ?? rec.newDataJson ?? rec.newData;
  const first = readString(rec.FirstName, rec.firstName, rec.UserFirstName, rec.userFirstName);
  const last = readString(rec.LastName, rec.lastName, rec.UserLastName, rec.userLastName);
  return {
    id,
    tableName: readString(rec.TableName, rec.tableName),
    recordId: nullableNumericId(rec.RecordID ?? rec.RecordId ?? rec.recordId),
    userId: nullableNumericId(rec.UserID ?? rec.UserId ?? rec.userId),
    userName:
      readString(rec.UserName, rec.userName, rec.FullName, rec.fullName) || `${last} ${first}`.trim(),
    actionType: readString(rec.ActionType, rec.actionType, rec.Action, rec.action) || 'UPDATE',
    oldDataJson: typeof oldData === 'string' ? oldData : oldData != null ? JSON.stringify(oldData) : '',
    newDataJson: typeof newData === 'string' ? newData : newData != null ? JSON.stringify(newData) : '',
    createdAt: readDate(rec.CreatedAt, rec.createdAt),
  };
}

export function sortDataChangeLogsNewestFirst(rows: SysadminDataChangeLog[]): SysadminDataChangeLog[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || '') || 0;
    const bTime = Date.parse(b.createdAt || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.id - a.id;
  });
}

function parseDashboard(raw: unknown): SysadminDashboard {
  const data = unwrapApiPayload(raw);
  const rec = asRecord(data.Data) ?? data;
  return {
    errorLogCount: readCount(rec.ErrorLogCount, rec.errorLogCount),
    dataChangeLogCount: readCount(rec.DataChangeLogCount, rec.dataChangeLogCount),
    openTicketsCount: readCount(rec.OpenTicketsCount, rec.openTicketsCount),
    inProgressTicketsCount: readCount(rec.InProgressTicketsCount, rec.inProgressTicketsCount),
    newEventsCount: readCount(rec.NewEventsCount, rec.newEventsCount),
    totalActiveEventsCount: readCount(rec.TotalActiveEventsCount, rec.totalActiveEventsCount),
    newUsersCount: readCount(rec.NewUsersCount, rec.newUsersCount),
    totalUsersCount: readCount(rec.TotalUsersCount, rec.totalUsersCount),
    emailsSentSuccessfully: readCount(rec.EmailsSentSuccessfully, rec.emailsSentSuccessfully),
    emailsFailed: readCount(rec.EmailsFailed, rec.emailsFailed),
  };
}

function assertOk(raw: unknown, fallback: string) {
  if (raw == null || raw === '') return;
  if (typeof raw === 'string' && !raw.trim()) return;
  throwIfApiFailed(raw, fallback);
}

export async function fetchSysadminDashboard(days: number | null): Promise<SysadminDashboard> {
  const response = await api.get('/sysadmin/dashboard', {
    params: { days: days == null ? '' : days },
  });
  assertOk(response.data, 'A dashboard nem tölthető.');
  return parseDashboard(response.data);
}

export async function fetchSysadminUsers(input: {
  search: string;
  skip: number;
  take: number;
}): Promise<PagedResult<SysadminUser>> {
  const response = await api.get('/sysadmin/users', {
    params: { search: input.search || undefined, skip: input.skip, take: input.take },
  });
  throwIfApiFailed(response.data, 'A felhasználók nem tölthetők.');
  return parsePaged(response.data, parseUser);
}

export async function updateSysadminUser(userId: number, input: SysadminUserEdit): Promise<void> {
  const response = await api.put(`/sysadmin/users/${userId}`, {
    FirstName: input.firstName,
    LastName: input.lastName,
    StatusID: input.statusId,
    IsSysadmin: input.isSysadmin,
  });
  assertOk(response.data, 'A felhasználó mentése sikertelen.');
}

export async function forceLogoutSysadminUser(userId: number): Promise<void> {
  const response = await api.delete(`/sysadmin/users/${userId}/tokens`);
  assertOk(response.data, 'A kijelentkeztetés sikertelen.');
}

export async function fetchSysadminTickets(input: {
  statusId: number;
  skip: number;
  take: number;
}): Promise<PagedResult<SysadminTicketRow>> {
  const response = await api.get('/sysadmin/tickets', {
    params: { statusId: input.statusId, skip: input.skip, take: input.take },
  });
  throwIfApiFailed(response.data, 'A jegyek nem tölthetők.');
  const result = parsePaged(response.data, parseTicketRow);
  return { ...result, rows: sortTicketsNewestFirst(result.rows) };
}

export function sortTicketsNewestFirst(rows: SysadminTicketRow[]): SysadminTicketRow[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0;
    const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.ticketId - a.ticketId;
  });
}

function parseMasterStatus(row: unknown): TicketMasterStatus | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const ticketStatusId = nullableNumericId(
    rec.TicketStatusID ?? rec.TicketStatusId ?? rec.ticketStatusId ?? rec.StatusID ?? rec.StatusId ?? rec.id
  );
  if (ticketStatusId == null) return null;
  return {
    ticketStatusId,
    statusName: readString(rec.StatusName, rec.statusName, rec.Name, rec.name) || ticketStatusLabel(ticketStatusId),
    isClosedState: isTruthyFlag(rec.IsClosedState ?? rec.isClosedState),
  };
}

function parseMasterFlow(row: unknown): TicketMasterFlow | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const fromStatusId = nullableNumericId(rec.FromStatusID ?? rec.FromStatusId ?? rec.fromStatusId);
  const toStatusId = nullableNumericId(rec.ToStatusID ?? rec.ToStatusId ?? rec.toStatusId);
  if (fromStatusId == null || toStatusId == null) return null;
  return { fromStatusId, toStatusId };
}

export async function fetchSysadminTicketMasterdata(): Promise<TicketMasterData> {
  const response = await api.get('/sysadmin/tickets/masterdata');
  throwIfApiFailed(response.data, 'A jegy státuszok nem tölthetők.');
  const payload = unwrapApiPayload(response.data);
  const statuses = pickDataset(payload, 'Statuses', 'statuses', 'TicketStatuses')
    .map(parseMasterStatus)
    .filter((row): row is TicketMasterStatus => row != null);
  const flows = pickDataset(payload, 'Flows', 'flows', 'TicketStatusFlows')
    .map(parseMasterFlow)
    .filter((row): row is TicketMasterFlow => row != null);
  return { statuses, flows };
}

export async function updateSysadminTicketStatus(
  ticketId: number,
  input: { statusId: number; targetVersion?: string }
): Promise<void> {
  const payload: Record<string, unknown> = { StatusID: input.statusId };
  if (input.targetVersion != null) payload.TargetVersion = input.targetVersion;
  const response = await api.put(`/sysadmin/tickets/${ticketId}/status`, payload);
  assertOk(response.data, 'A státuszváltás sikertelen.');
}

export async function fetchSysadminTicket(ticketId: number): Promise<SysadminTicketDetail> {
  const response = await api.get(`/sysadmin/tickets/${ticketId}`);
  assertOk(response.data, 'A jegy nem tölthető.');
  const payload = unwrapApiPayload(response.data);
  const ticketRaw = payload.Ticket ?? payload.ticket ?? payload.Data ?? payload;
  const ticket = parseTicketRow(ticketRaw);
  if (!ticket) throw new Error('A jegy adatai hiányosak.');
  const commentsRaw = payload.Comments ?? payload.comments ?? asRecord(ticketRaw)?.Comments ?? [];
  const comments = (Array.isArray(commentsRaw) ? commentsRaw : [])
    .map(parseTicketComment)
    .filter((row): row is SysadminTicketComment => row != null);
  return { ...ticket, comments };
}

export async function postSysadminTicketComment(ticketId: number, commentText: string): Promise<void> {
  const response = await api.post(`/sysadmin/tickets/${ticketId}/comments`, {
    CommentText: commentText,
  });
  assertOk(response.data, 'A hozzászólás nem menthető.');
}

export async function fetchSysadminErrorLogs(
  input: SysadminErrorLogQuery
): Promise<PagedResult<SysadminErrorLog>> {
  const response = await api.get('/sysadmin/logs/error', {
    params: {
      search: input.search || undefined,
      source: input.source || undefined,
      userId: input.userId ?? undefined,
      from: input.from || undefined,
      to: input.to || undefined,
      skip: input.skip,
      take: input.take,
    },
  });
  throwIfApiFailed(response.data, 'Az error logok nem tölthetők.');
  const result = parsePaged(response.data, parseErrorLog);
  return { ...result, rows: sortErrorLogsNewestFirst(result.rows) };
}

export async function fetchSysadminDataChangeLogs(
  input: SysadminDataChangeLogQuery
): Promise<PagedResult<SysadminDataChangeLog>> {
  const response = await api.get('/sysadmin/logs/data-change', {
    params: {
      tableName: input.tableName || undefined,
      userId: input.userId ?? undefined,
      from: input.from || undefined,
      to: input.to || undefined,
      skip: input.skip,
      take: input.take,
    },
  });
  throwIfApiFailed(response.data, 'Az adatmódosítási logok nem tölthetők.');
  const result = parsePaged(response.data, parseDataChange);
  return { ...result, rows: sortDataChangeLogsNewestFirst(result.rows) };
}

function parseDictionary(raw: unknown): AuditDictionary {
  const data = unwrapApiPayload(raw);
  const rec = asRecord(data.Data) ?? data;
  const tablesRaw = rec.Tables ?? rec.tables ?? [];
  const fieldsRaw = rec.Fields ?? rec.fields ?? [];
  const tables: AuditTable[] = (Array.isArray(tablesRaw) ? tablesRaw : [])
    .map((row) => {
      const item = asRecord(row);
      if (!item) return null;
      const tableName = readString(item.TableName, item.tableName);
      if (!tableName) return null;
      return {
        tableName,
        displayName: readString(item.DisplayName, item.displayName) || tableName,
      };
    })
    .filter((row): row is AuditTable => row != null);
  const fields: AuditField[] = (Array.isArray(fieldsRaw) ? fieldsRaw : [])
    .map((row) => {
      const item = asRecord(row);
      if (!item) return null;
      const tableName = readString(item.TableName, item.tableName);
      const columnName = readString(item.ColumnName, item.columnName, item.FieldName, item.fieldName);
      if (!tableName || !columnName) return null;
      return {
        tableName,
        columnName,
        displayName: readString(item.DisplayName, item.displayName) || columnName,
      };
    })
    .filter((row): row is AuditField => row != null);
  return { tables, fields };
}

let dictionaryCache: AuditDictionary | null = null;

export async function fetchAuditDictionary(force = false): Promise<AuditDictionary> {
  if (dictionaryCache && !force) return dictionaryCache;
  const response = await api.get('/sysadmin/dictionaries');
  throwIfApiFailed(response.data, 'A szótár nem tölthető.');
  dictionaryCache = parseDictionary(response.data);
  return dictionaryCache;
}

export function adminErrorMessage(error: unknown, fallback: string): string {
  return readAxiosErrorMessage(error, fallback);
}

function parseVersionItem(row: unknown, fallbackVersionId: number | null = null): SysadminAppVersionItem | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const description = readString(rec.Description, rec.description);
  const itemId = nullableNumericId(rec.ItemID ?? rec.ItemId ?? rec.itemId ?? rec.Id ?? rec.ID ?? rec.id) ?? 0;
  const versionId =
    nullableNumericId(rec.VersionID ?? rec.VersionId ?? rec.versionId) ?? fallbackVersionId;
  if (itemId <= 0 && !description && !readString(rec.InternalReference, rec.internalReference)) {
    const ticketId = nullableNumericId(rec.TicketID ?? rec.TicketId ?? rec.ticketId);
    const external = readString(rec.ExternalReference, rec.externalReference);
    if (ticketId == null && !external) return null;
  }
  const ticketRaw = rec.TicketID ?? rec.TicketId ?? rec.ticketId;
  const ticketId = ticketRaw === '' || ticketRaw == null ? null : nullableNumericId(ticketRaw);
  return {
    itemId,
    versionId,
    ticketId: ticketId != null && ticketId > 0 ? ticketId : null,
    internalReference: decodeDisplayText(readString(rec.InternalReference, rec.internalReference)),
    externalReference: decodeDisplayText(
      readString(rec.ExternalReference, rec.externalReference, rec.ExternalUrl, rec.externalUrl)
    ),
    description: decodeDisplayText(description),
    activeFlg: rec.ActiveFlg == null && rec.activeFlg == null ? true : isTruthyFlag(rec.ActiveFlg ?? rec.activeFlg),
  };
}

function parseVersion(row: unknown, extraItems: SysadminAppVersionItem[] = []): SysadminAppVersion | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const versionId = nullableNumericId(rec.VersionID ?? rec.VersionId ?? rec.versionId ?? rec.Id ?? rec.ID ?? rec.id);
  if (versionId == null) return null;
  const nestedRaw = rec.Items ?? rec.items ?? rec.VersionItems ?? rec.versionItems;
  const nested = (Array.isArray(nestedRaw) ? nestedRaw : [])
    .map((item) => parseVersionItem(item, versionId))
    .filter((item): item is SysadminAppVersionItem => item != null);
  const attached = extraItems.filter((item) => item.versionId === versionId);
  const items = nested.length ? nested : attached;
  return {
    versionId,
    versionNumber: readString(rec.VersionNumber, rec.versionNumber, rec.Version, rec.version),
    releaseDate: readDate(rec.ReleaseDate, rec.releaseDate, rec.ReleasedAt, rec.releasedAt),
    summary: decodeDisplayText(readString(rec.Summary, rec.summary, rec.ReleaseNotes, rec.releaseNotes)),
    activeFlg: rec.ActiveFlg == null && rec.activeFlg == null ? true : isTruthyFlag(rec.ActiveFlg ?? rec.activeFlg),
    items,
  };
}

export function sortAppVersionsNewestFirst(rows: SysadminAppVersion[]): SysadminAppVersion[] {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.releaseDate || '') || 0;
    const bTime = Date.parse(b.releaseDate || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.versionId - a.versionId;
  });
}

export function formatReleaseDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatVersionLabel(versionNumber: string): string {
  const value = versionNumber.trim();
  if (!value) return '—';
  return /^v/i.test(value) ? value : `v${value}`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function versionSelectOptions(rows: SysadminAppVersion[]): { label: string; value: string }[] {
  const seen = new Set<string>();
  const options: { label: string; value: string }[] = [];
  for (const row of sortAppVersionsNewestFirst(rows)) {
    const value = row.versionNumber.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    const inactive = row.activeFlg ? '' : ' · inaktív';
    options.push({
      label: `${formatVersionLabel(value)}${inactive}`,
      value,
    });
  }
  return options;
}

function flattenDatasetRows(rows: unknown[], nestedKeys: string[]): unknown[] {
  if (rows.length !== 1) return rows;
  const rec = asRecord(rows[0]);
  if (!rec) return rows;
  for (const key of nestedKeys) {
    const nested = rec[key];
    if (Array.isArray(nested)) return nested;
  }
  return rows;
}

function parseVersionsPayload(raw: unknown): SysadminAppVersion[] {
  const data = unwrapApiPayload(raw);
  const versionsRaw = flattenDatasetRows(
    pickFilledDataset(
      data,
      'Data',
      'data',
      'Versions',
      'versions',
      'AppVersions',
      'appVersions'
    ),
    ['Data', 'data', 'Versions', 'versions', 'AppVersions', 'appVersions']
  );
  const looseItems = flattenDatasetRows(
    pickFilledDataset(
      data,
      'Items',
      'items',
      'VersionItems',
      'versionItems',
      'AppVersionItems',
      'appVersionItems'
    ),
    ['Items', 'items', 'VersionItems', 'versionItems']
  )
    .map((row) => parseVersionItem(row))
    .filter((row): row is SysadminAppVersionItem => row != null);
  const versions = versionsRaw
    .map((row) => parseVersion(row, looseItems))
    .filter((row): row is SysadminAppVersion => row != null);
  return sortAppVersionsNewestFirst(versions);
}

export async function fetchSysadminVersions(): Promise<SysadminAppVersion[]> {
  const response = await api.get('/sysadmin/versions');
  throwIfApiFailed(response.data, 'A verziók nem tölthetők.');
  return parseVersionsPayload(response.data);
}

function itemSavePayload(item: SysadminAppVersionItem): Record<string, unknown> {
  return {
    ItemID: item.itemId > 0 ? item.itemId : 0,
    TicketID: item.ticketId != null && item.ticketId > 0 ? item.ticketId : null,
    InternalReference: item.internalReference.trim() || null,
    ExternalReference: item.externalReference.trim() || null,
    Description: item.description.trim(),
    ActiveFlg: item.activeFlg,
  };
}

export async function saveSysadminVersion(input: SysadminAppVersionSave): Promise<void> {
  const payload = {
    VersionID: input.versionId > 0 ? input.versionId : 0,
    VersionNumber: input.versionNumber.trim(),
    ReleaseDate: input.releaseDate,
    Summary: input.summary.trim() || null,
    ActiveFlg: input.activeFlg,
    Items: input.items.map(itemSavePayload),
  };
  const response = await api.post('/sysadmin/versions', payload);
  assertOk(response.data, 'A verzió mentése sikertelen.');
}

function parseKabalaAsset(row: unknown): SysadminKabalaAsset | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const slot = readString(rec.Slot, rec.slot).toLowerCase();
  if (slot !== 'profile' && slot !== 'full') return null;
  if (rec.ActiveFlg != null || rec.activeFlg != null) {
    if (!isTruthyFlag(rec.ActiveFlg ?? rec.activeFlg)) return null;
  }
  const blob = readString(rec.BlobUrl, rec.blobUrl);
  const kind = readString(rec.Kind, rec.kind).toLowerCase() === 'animation' ? 'animation' : 'image';
  return {
    slot,
    kind,
    blobUrl: blob || null,
    mime: readString(rec.Mime, rec.mime) || null,
    sizeInBytes: nullableNumericId(rec.SizeInBytes ?? rec.sizeInBytes),
  };
}

function kabalaAssetList(row: Record<string, unknown>, loose: unknown[]): SysadminKabalaAsset[] {
  const nested = Array.isArray(row.Assets) ? row.Assets : Array.isArray(row.assets) ? row.assets : [];
  const bySlot = new Map<KabalaAssetSlot, SysadminKabalaAsset>();
  for (const raw of [...nested, ...loose]) {
    const asset = parseKabalaAsset(raw);
    if (!asset || bySlot.has(asset.slot)) continue;
    bySlot.set(asset.slot, asset);
  }
  return [...bySlot.values()];
}

function parseKabala(row: unknown, assetsByKabala: Map<number, unknown[]>): SysadminKabala | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const id = nullableNumericId(rec.id ?? rec.ID ?? rec.Id ?? rec.KabalaID ?? rec.KabalaId);
  if (id == null) return null;
  return {
    id,
    name: readString(rec.Name, rec.name) || `Kabala ${id}`,
    activeFlg: rec.ActiveFlg == null && rec.activeFlg == null ? true : isTruthyFlag(rec.ActiveFlg ?? rec.activeFlg),
    teamCount: readCount(rec.TeamCount, rec.teamCount),
    assets: kabalaAssetList(rec, assetsByKabala.get(id) ?? []),
  };
}

function groupKabalaAssets(rows: unknown[]): Map<number, unknown[]> {
  const grouped = new Map<number, unknown[]>();
  for (const raw of rows) {
    const rec = asRecord(raw);
    if (!rec) continue;
    const kabalaId = nullableNumericId(rec.KabalaID ?? rec.KabalaId ?? rec.kabalaId);
    if (kabalaId == null) continue;
    const list = grouped.get(kabalaId) ?? [];
    list.push(raw);
    grouped.set(kabalaId, list);
  }
  return grouped;
}

export async function fetchSysadminKabalas(): Promise<SysadminKabala[]> {
  const response = await api.get('/sysadmin/olimpub/kabalas');
  throwIfApiFailed(response.data, 'A kabalák nem tölthetők.');
  const unwrapped = unwrapApiPayload(response.data);
  const rows = Array.isArray(unwrapped)
    ? unwrapped
    : pickDataset(unwrapped, 'Data', 'data', 'OpKabalas', 'opKabalas', 'Kabalas', 'kabalas');
  const loose = Array.isArray(unwrapped)
    ? []
    : pickDataset(unwrapped, 'OpKabalaAssets', 'opKabalaAssets', 'KabalaAssets', 'kabalaAssets');
  const assetsByKabala = groupKabalaAssets(loose);
  return rows
    .map((row) => parseKabala(row, assetsByKabala))
    .filter((row): row is SysadminKabala => row != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'hu'));
}

function assetSavePayload(asset: SysadminKabalaAsset): Record<string, unknown> {
  return {
    Slot: asset.slot,
    Kind: asset.kind === 'animation' ? 'animation' : 'image',
    BlobUrl: asset.blobUrl,
    Mime: asset.mime,
    SizeInBytes: asset.sizeInBytes,
  };
}

export async function saveSysadminKabala(input: SysadminKabalaSave): Promise<void> {
  const response = await api.post('/sysadmin/olimpub/kabalas', {
    id: input.id > 0 ? input.id : 0,
    Name: input.name.trim(),
    ActiveFlg: input.activeFlg,
    Assets: input.assets.map(assetSavePayload),
  });
  assertOk(response.data, 'A kabala mentése sikertelen.');
}

export async function uploadSysadminKabalaImage(
  file: File,
  slot: KabalaAssetSlot
): Promise<Pick<SysadminKabalaAsset, 'blobUrl' | 'mime' | 'sizeInBytes'>> {
  if (opMediaKindOfFile(file) !== 'image') {
    throw new Error('Csak JPEG, PNG vagy WebP kép tölthető fel.');
  }
  const stored = await compressOpQuestionImage(file);
  const invalid = validateOpMediaFile(stored, 'image');
  if (invalid) throw new Error(invalid);
  const response = await api.get('/sysadmin/olimpub/kabalas/upload-url', {
    params: {
      slot,
      fileName: stored.name,
      contentType: stored.type || 'image/webp',
      sizeInBytes: stored.size,
    },
  });
  throwIfApiFailed(response.data, 'A feltöltési URL nem kérhető.');
  const data = unwrapApiPayload(response.data);
  const nested = asRecord(Array.isArray(data.Data) ? data.Data[0] : data.Data) ?? data;
  const sasUrl = readString(nested.SasUrl, nested.sasUrl, nested.SASUrl, data.SasUrl);
  const blobUrl = readString(nested.BlobUrl, nested.blobUrl, data.BlobUrl);
  if (!sasUrl || !blobUrl) throw new Error('A feltöltési URL hiányos.');
  await axios.put(sasUrl, stored, {
    headers: {
      'Content-Type': stored.type || 'image/webp',
      'x-ms-blob-type': 'BlockBlob',
    },
  });
  return {
    blobUrl,
    mime: stored.type || 'image/webp',
    sizeInBytes: stored.size,
  };
}
