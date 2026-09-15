export interface PagedResult<T> {
  rows: T[];
  totalCount: number;
}

export interface SysadminDashboard {
  errorLogCount: number;
  dataChangeLogCount: number;
  openTicketsCount: number;
  inProgressTicketsCount: number;
  newEventsCount: number;
  totalActiveEventsCount: number;
  newUsersCount: number;
  totalUsersCount: number;
  emailsSentSuccessfully: number;
  emailsFailed: number;
}

export type DashboardPeriod = 1 | 7 | 30 | null;

export interface SysadminUser {
  id: number;
  emailAddress: string;
  firstName: string;
  lastName: string;
  statusId: number;
  isSysadmin: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SysadminUserEdit {
  firstName: string;
  lastName: string;
  statusId: number;
  isSysadmin: boolean;
}

export interface SysadminTicketRow {
  ticketId: number;
  reporterUserId: number | null;
  reporterName: string;
  reporterEmail: string;
  title: string;
  description: string;
  category: string;
  statusId: number | null;
  statusName: string;
  isClosedState: boolean;
  targetVersion: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SysadminTicketComment {
  commentId: number;
  userId: number | null;
  authorName: string;
  authorIsSysadmin: boolean;
  isSystemMessage: boolean;
  body: string;
  createdAt: string | null;
}

export interface TicketMasterStatus {
  ticketStatusId: number;
  statusName: string;
  isClosedState: boolean;
}

export interface TicketMasterFlow {
  fromStatusId: number;
  toStatusId: number;
}

export interface TicketMasterData {
  statuses: TicketMasterStatus[];
  flows: TicketMasterFlow[];
}

export type ErrorLogDatePreset = '1h' | '1d' | '1w' | '1m' | 'custom';
export type ErrorLogSourceFilter = '' | 'Frontend' | 'Backend';

export interface SysadminErrorLog {
  errorId: number;
  userId: number | null;
  userName: string;
  source: string;
  severity: string;
  urlOrAction: string;
  errorMessage: string;
  stackTrace: string;
  contextPayload: string;
  createdAt: string | null;
}

export interface SysadminErrorLogQuery {
  search: string;
  source: ErrorLogSourceFilter;
  userId: number | null;
  from: string | null;
  to: string | null;
  skip: number;
  take: number;
}

export interface SysadminDataChangeLog {
  id: number;
  tableName: string;
  recordId: number | null;
  userId: number | null;
  userName: string;
  actionType: string;
  oldDataJson: string;
  newDataJson: string;
  createdAt: string | null;
}

export interface SysadminDataChangeLogQuery {
  tableName: string;
  userId: number | null;
  from: string | null;
  to: string | null;
  skip: number;
  take: number;
}

export interface AuditTable {
  tableName: string;
  displayName: string;
}

export interface AuditField {
  tableName: string;
  columnName: string;
  displayName: string;
}

export interface AuditDictionary {
  tables: AuditTable[];
  fields: AuditField[];
}

export interface FieldDiff {
  columnName: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface SysadminAppVersionItem {
  itemId: number;
  versionId: number | null;
  ticketId: number | null;
  internalReference: string;
  externalReference: string;
  description: string;
  activeFlg: boolean;
}

export interface SysadminAppVersion {
  versionId: number;
  versionNumber: string;
  releaseDate: string | null;
  summary: string;
  activeFlg: boolean;
  items: SysadminAppVersionItem[];
}

export interface SysadminAppVersionSave {
  versionId: number;
  versionNumber: string;
  releaseDate: string | null;
  summary: string;
  activeFlg: boolean;
  items: SysadminAppVersionItem[];
}

export const USER_STATUS_OPTIONS = [
  { value: 1, label: 'Függőben' },
  { value: 2, label: 'Aktív' },
  { value: 3, label: 'Tiltott' },
] as const;

export const TICKET_STATUS_OPTIONS = [
  { value: 1, label: 'Függőben', isClosed: false },
  { value: 2, label: 'Folyamatban', isClosed: false },
  { value: 3, label: 'Ütemezve', isClosed: false },
  { value: 4, label: 'Kiadva', isClosed: true },
  { value: 5, label: 'Elutasítva', isClosed: true },
  { value: 6, label: 'Visszavont', isClosed: true },
] as const;

export const TICKET_STATUS_FLOW: Record<number, number[]> = {
  1: [2, 3, 5, 6],
  2: [3, 4, 6],
  3: [2, 4, 6],
  4: [],
  5: [],
  6: [],
};

export function nextTicketStatusIds(fromStatusId: number | null | undefined): number[] {
  if (fromStatusId == null) return [];
  return TICKET_STATUS_FLOW[fromStatusId] ?? [];
}

export function isClosedTicketStatus(statusId: number | null | undefined): boolean {
  return TICKET_STATUS_OPTIONS.some((item) => item.value === statusId && item.isClosed);
}

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 1, label: 'Ma' },
  { value: 7, label: 'Elmúlt 1 hét' },
  { value: 30, label: 'Elmúlt 1 hónap' },
  { value: null, label: 'Összes' },
];
