import { isActiveFlag, isTruthyFlag, nullableNumericId } from './apiPayload';

/** RS 17 — tblEventFlow */
export interface EventFlow {
  id: number;
  Name: string;
  Code?: string | null;
  ActiveFlg?: boolean | number;
}

/** RS 18 — tblEventFlowStatus (egy megengedett From → To átmenet) */
export interface EventFlowStatus {
  id: number;
  EventFlowID: number;
  FromStatusID: number | null;
  ToStatusID: number;
  CanUndoFlg: boolean;
  CanCloseFlg: boolean;
  ApprovalID: number | null;
  ActiveFlg?: boolean | number;
}

/** RS 19 — tblEventFlowStatusRole (ki kattinthatja az átmenetet) */
export interface EventFlowStatusRole {
  id: number;
  EventFlowStatusID: number;
  RoleID: number;
  ActiveFlg?: boolean | number;
}

export interface EventStatusTransition {
  id: number;
  eventFlowId: number;
  fromStatusId: number | null;
  toStatusId: number;
  toStatusName: string;
  toStatusColor: string;
  canUndo: boolean;
  /** A lépés CanUndoFlg — előrelépéskor PrevEventStatusID töltődik */
  canRecordPrev: boolean;
  canClose: boolean;
  approvalId: number | null;
  requiresApproval: boolean;
}

function rowId(row: Record<string, unknown>): number | undefined {
  const raw = row.id ?? row.ID ?? row.Id;
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function rowActive(row: Record<string, unknown>): boolean {
  return isActiveFlag(row.ActiveFlg ?? row.activeFlg);
}

export function eventStatusName(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  const rec = row as Record<string, unknown>;
  return String(
    rec.StatusName ?? rec.Name ?? rec.EventStatusName ?? rec.statusName ?? rec.EventStatus ?? ''
  ).trim();
}

export function findEventStatus(
  eventStatuses: unknown[],
  statusId: number | null | undefined
): Record<string, unknown> | null {
  if (statusId == null) return null;
  const num = Number(statusId);
  if (!Number.isFinite(num)) return null;
  const hit = (eventStatuses || []).find((row) => {
    if (!row || typeof row !== 'object') return false;
    const rec = row as Record<string, unknown>;
    const rowStatusId = Number(
      rec.id ?? rec.ID ?? rec.Id ?? rec.EventStatusID ?? rec.eventStatusID ?? rec.EventStatusId
    );
    return Number.isFinite(rowStatusId) && rowStatusId === num;
  });
  return hit && typeof hit === 'object' ? (hit as Record<string, unknown>) : null;
}

export function getEventStatusNameById(
  eventStatuses: unknown[],
  statusId: number | null | undefined,
  fallback = 'Státusz'
): string {
  const name = eventStatusName(findEventStatus(eventStatuses, statusId));
  return name || fallback;
}

export function eventStatusColor(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  const rec = row as Record<string, unknown>;
  return String(rec.ColorHex ?? rec.ColorCode ?? rec.colorHex ?? rec.colorCode ?? '').trim();
}

export function getEventStatusColorById(
  eventStatuses: unknown[],
  statusId: number | null | undefined
): string {
  return eventStatusColor(findEventStatus(eventStatuses, statusId));
}

function eventStatusRowId(row: Record<string, unknown>): number | undefined {
  return rowId(row) ?? nullableNumericId(row.EventStatusID ?? row.eventStatusID ?? row.EventStatusId);
}

/** Első találat a megadott (ékezet nélküli) névtöredékek közül. */
export function findEventStatusIdByNameHints(
  eventStatuses: unknown[],
  hints: string[]
): number | null {
  for (const hint of hints) {
    const needle = foldStatusLabel(hint);
    if (!needle) continue;
    const hit = (eventStatuses || []).find((row) => {
      if (!row || typeof row !== 'object') return false;
      const hay = foldStatusLabel(eventStatusName(row));
      return hay === needle || hay.includes(needle);
    });
    if (!hit || typeof hit !== 'object') continue;
    const id = eventStatusRowId(hit as Record<string, unknown>);
    if (id != null) return id;
  }
  return null;
}

function foldStatusLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isCheckInStatusName(name: string): boolean {
  return foldStatusLabel(name).includes('bejelentkez');
}

export type EventPlayPhase = 'before' | 'checkin' | 'draw' | 'game' | 'ceremony' | 'ended';

/** EventStatus név → játékos-adatlap fázis. */
export function eventPlayPhase(
  statusName: string | null | undefined,
  options?: { closedFlg?: boolean }
): EventPlayPhase {
  if (options?.closedFlg) return 'ended';
  const hay = foldStatusLabel(String(statusName || ''));
  if (!hay) return 'before';
  if (hay.includes('vege') || hay.includes('befejez')) return 'ended';
  if (hay.includes('eredmenyhirdet') || hay.includes('ceremon') || hay.includes('dijatado')) {
    return 'ceremony';
  }
  if (hay.includes('lezar')) return 'ended';
  if (hay.includes('sorsol')) return 'draw';
  if (hay.includes('bejelentkez')) return 'checkin';
  if (hay.includes('jatek')) return 'game';
  return 'before';
}

/** Bejelentkezés, sorsolás, játék és a későbbi fázisok. */
function isCheckInOrLaterStatusName(name: string): boolean {
  const hay = foldStatusLabel(name);
  if (!hay) return false;
  return /(bejelentkez|sorsol|jatek|draw|play\b|folyamat|elo\b|live|lezar|befejez|eredmeny|ceremon)/.test(
    hay
  );
}

function flowStepsForEvent(
  eventFlowStatuses: EventFlowStatus[] | undefined,
  eventFlowId?: number | null
): EventFlowStatus[] {
  const steps = eventFlowStatuses || [];
  const flowId = nullableNumericId(eventFlowId);
  if (flowId == null) return steps;
  const scoped = steps.filter((step) => Number(step.EventFlowID) === flowId);
  return scoped.length ? scoped : steps;
}

/** EventStatus sorrend az adott folyamatban (0 = folyamat eleje). */
function eventStatusDistanceMap(
  eventFlowStatuses: EventFlowStatus[] | undefined,
  eventFlowId?: number | null
): Map<number, number> {
  const steps = flowStepsForEvent(eventFlowStatuses, eventFlowId);
  const dist = new Map<number, number>();
  const toIds = new Set(
    steps.map((step) => Number(step.ToStatusID)).filter((id) => Number.isFinite(id))
  );

  const enqueue = (statusId: number, distance: number) => {
    if (!Number.isFinite(statusId)) return;
    const prev = dist.get(statusId);
    if (prev != null && prev <= distance) return;
    dist.set(statusId, distance);
  };

  for (const step of steps) {
    if (step.FromStatusID != null) continue;
    enqueue(Number(step.ToStatusID), 0);
  }
  for (const step of steps) {
    const from = nullableNumericId(step.FromStatusID);
    if (from == null || toIds.has(from)) continue;
    enqueue(from, 0);
  }

  let grew = true;
  while (grew) {
    grew = false;
    for (const step of steps) {
      const from = nullableNumericId(step.FromStatusID);
      if (from == null || !dist.has(from)) continue;
      const to = Number(step.ToStatusID);
      const next = (dist.get(from) ?? 0) + 1;
      const prev = dist.get(to);
      if (!Number.isFinite(to) || (prev != null && prev <= next)) continue;
      dist.set(to, next);
      grew = true;
    }
  }
  return dist;
}

export type EventStatusCheckInOptions = {
  eventFlowId?: number | null;
  statusNameHint?: string | null;
};

/** Bejelentkezés vagy bármely későbbi EventStatus — játékmesteri adatlap kapu. */
export function eventStatusReachedCheckIn(
  eventStatuses: unknown[],
  eventFlowStatuses: EventFlowStatus[] | undefined,
  currentStatusId: number | null | undefined,
  options?: EventStatusCheckInOptions
): boolean {
  const currentName =
    getEventStatusNameById(eventStatuses, currentStatusId, '') || String(options?.statusNameHint || '');
  if (isCheckInOrLaterStatusName(currentName)) return true;

  const currentId = nullableNumericId(currentStatusId);
  const dist = eventStatusDistanceMap(eventFlowStatuses, options?.eventFlowId);
  const checkInDistances = (eventStatuses || [])
    .filter((row) => row && typeof row === 'object' && isCheckInStatusName(eventStatusName(row)))
    .map((row) => {
      const id = eventStatusRowId(row as Record<string, unknown>);
      return id != null ? dist.get(id) : undefined;
    })
    .filter((value): value is number => value != null);
  const currentDist = currentId != null ? dist.get(currentId) : undefined;
  if (checkInDistances.length && currentDist != null) {
    return currentDist >= Math.min(...checkInDistances);
  }

  if (currentId == null) return false;
  const checkInIds = (eventStatuses || [])
    .filter((row) => row && typeof row === 'object' && isCheckInStatusName(eventStatusName(row)))
    .map((row) => eventStatusRowId(row as Record<string, unknown>))
    .filter((id): id is number => id != null);
  if (!checkInIds.length) return false;

  const steps = flowStepsForEvent(eventFlowStatuses, options?.eventFlowId);
  const reachable = new Set<number>(checkInIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const step of steps) {
      if (step.FromStatusID == null || !reachable.has(Number(step.FromStatusID))) continue;
      const to = Number(step.ToStatusID);
      if (!Number.isFinite(to) || reachable.has(to)) continue;
      reachable.add(to);
      grew = true;
    }
  }
  return reachable.has(currentId);
}

export function getEventFlowIdForType(eventType: unknown): number | null {
  if (!eventType || typeof eventType !== 'object') return null;
  const rec = eventType as Record<string, unknown>;
  return nullableNumericId(rec.EventFlowID ?? rec.eventFlowID ?? rec.EventFlowId);
}

export function normalizeEventFlows(rows: unknown[]): EventFlow[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(rowActive)
    .map((row) => ({
      ...row,
      id: rowId(row) as number,
      Name: String(row.Name ?? row.name ?? row.FlowName ?? ''),
      Code: (row.Code ?? row.code ?? null) as string | null,
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter((row) => row.id !== undefined);
}

export function normalizeEventFlowStatuses(rows: unknown[]): EventFlowStatus[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(rowActive)
    .map((row) => ({
      ...row,
      id: rowId(row) as number,
      EventFlowID: Number(row.EventFlowID ?? row.eventFlowID ?? row.EventFlowId),
      FromStatusID: nullableNumericId(row.FromStatusID ?? row.fromStatusID ?? row.FromStatusId),
      ToStatusID: Number(row.ToStatusID ?? row.toStatusID ?? row.ToStatusId),
      CanUndoFlg: isTruthyFlag(
        row.CanUndoFlg ?? row.canUndoFlg ?? row.CanUndoFLG ?? row.UndoFlg ?? row.CanUndo
      ),
      CanCloseFlg: isTruthyFlag(
        row.CanCloseFlg ?? row.canCloseFlg ?? row.CanCloseFLG ?? row.CloseFlg ?? row.CanClose
      ),
      ApprovalID: nullableNumericId(row.ApprovalID ?? row.approvalID ?? row.ApprovalId),
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter(
      (row) =>
        row.id !== undefined &&
        Number.isFinite(row.EventFlowID) &&
        Number.isFinite(row.ToStatusID)
    );
}

export function normalizeEventFlowStatusRoles(rows: unknown[]): EventFlowStatusRole[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(rowActive)
    .map((row) => ({
      ...row,
      id: rowId(row) as number,
      EventFlowStatusID: Number(
        row.EventFlowStatusID ?? row.eventFlowStatusID ?? row.EventFlowStatusId
      ),
      RoleID: Number(row.RoleID ?? row.roleID ?? row.RoleId),
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter(
      (row) =>
        row.id !== undefined &&
        Number.isFinite(row.EventFlowStatusID) &&
        Number.isFinite(row.RoleID)
    );
}

function fromStatusMatches(
  fromStatusId: number | null,
  currentStatusId: number | null | undefined
): boolean {
  const current = currentStatusId == null ? null : nullableNumericId(currentStatusId);
  if (fromStatusId == null && current == null) return true;
  if (fromStatusId == null || current == null) return false;
  return Number(fromStatusId) === Number(current);
}

function roleAllowedIds(
  flowStatusRoles: EventFlowStatusRole[],
  ...roleIds: Array<number | null | undefined>
): Set<number> {
  const wanted = new Set(
    roleIds.map((id) => nullableNumericId(id)).filter((id): id is number => id != null)
  );
  return new Set(
    (flowStatusRoles || [])
      .filter((row) => wanted.has(Number(row.RoleID)))
      .map((row) => Number(row.EventFlowStatusID))
  );
}

function toTransition(
  row: EventFlowStatus,
  eventStatuses: unknown[],
  overrides: Partial<EventStatusTransition> = {}
): EventStatusTransition {
  const toStatusId = overrides.toStatusId ?? row.ToStatusID;
  return {
    id: row.id,
    eventFlowId: row.EventFlowID,
    fromStatusId: row.FromStatusID,
    toStatusId,
    toStatusName: getEventStatusNameById(eventStatuses, toStatusId, 'Státusz'),
    toStatusColor: getEventStatusColorById(eventStatuses, toStatusId),
    canUndo: overrides.canUndo ?? false,
    canRecordPrev: overrides.canRecordPrev ?? row.CanUndoFlg,
    canClose: overrides.canClose ?? row.CanCloseFlg,
    approvalId: row.ApprovalID,
    requiresApproval: row.ApprovalID != null,
    ...overrides,
  };
}

function isRowAllowed(
  rowId: number,
  allowedIds: Set<number>,
  skipRoleFilter: boolean,
  organizerBypass = false
): boolean {
  return skipRoleFilter || organizerBypass || allowedIds.has(rowId);
}

/**
 * Előrelépő átmenetek: FromStatusID == aktuális státusz.
 * CanUndoFlg itt csak annyit jelent, hogy a lépés után PrevEventStatusID töltődik — nem undo gomb.
 */
export function listAllowedEventStatusTransitions(args: {
  eventFlowId: number | null | undefined;
  currentStatusId: number | null | undefined;
  masterRoleId: number | null | undefined;
  roleTypeId?: number | null;
  flowStatuses: EventFlowStatus[];
  flowStatusRoles: EventFlowStatusRole[];
  eventStatuses: unknown[];
}): EventStatusTransition[] {
  const flowId = nullableNumericId(args.eventFlowId);
  const roleId = nullableNumericId(args.masterRoleId);
  if (flowId == null || roleId == null) return [];

  const allowedIds = roleAllowedIds(args.flowStatusRoles, roleId, args.roleTypeId);
  const skipRoleFilter = (args.flowStatusRoles || []).length === 0;
  const rows = args.flowStatuses || [];

  return rows
    .filter(
      (row) =>
        Number(row.EventFlowID) === flowId &&
        fromStatusMatches(row.FromStatusID, args.currentStatusId) &&
        isRowAllowed(Number(row.id), allowedIds, skipRoleFilter)
    )
    .map((row) =>
      toTransition(row, args.eventStatuses, {
        canUndo: false,
        requiresApproval: row.ApprovalID != null,
      })
    );
}

/**
 * Visszavonás: csak a tárolt PrevEventStatusID alapján.
 * Az mező csak akkor van kitöltve, ha az ide vezető lépés CanUndoFlg=true volt.
 */
export function listUndoEventStatusTransitions(args: {
  prevStatusId: number | null | undefined;
  currentStatusId: number | null | undefined;
  eventStatuses: unknown[];
}): EventStatusTransition[] {
  const prev = nullableNumericId(args.prevStatusId);
  const current = nullableNumericId(args.currentStatusId);
  if (prev == null || current == null || prev === current) return [];

  return [
    {
      id: 0,
      eventFlowId: 0,
      fromStatusId: current,
      toStatusId: prev,
      toStatusName: getEventStatusNameById(args.eventStatuses, prev, 'Státusz'),
      toStatusColor: getEventStatusColorById(args.eventStatuses, prev),
      canUndo: true,
      canRecordPrev: false,
      canClose: false,
      approvalId: null,
      requiresApproval: false,
    },
  ];
}
