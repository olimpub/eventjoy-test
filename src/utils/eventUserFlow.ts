import { isActiveFlag, isTruthyFlag, nullableNumericId } from './apiPayload';

/** tblEventUserStatus — master EventUserStatuses */
export interface EventUserStatus {
  id: number;
  StatusName: string;
  ColorCode?: string;
  NeedUserApprovalFlg: boolean;
  NeedOrganizerApprovalFlg: boolean;
  ActiveFlg?: boolean | number;
}

/** tblEventUserFlowTemplate — master RS20 JSON: EventUserFlowTemplates */
export interface EventUserFlowTemplate {
  id: number;
  Code: string;
  Name: string;
  Description?: string | null;
  ActiveFlg?: boolean | number;
}

/** tblEventUserFlowTemplateStep — master RS21 JSON: EventUserFlowTemplateSteps */
export interface EventUserFlowTemplateStep {
  id: number;
  TemplateID: number;
  StepID: number | null;
  FromEventUserStatusID: number | null;
  ToEventUserStatusID: number;
  CanUndoFlg: boolean;
  ActiveFlg?: boolean | number;
}

export interface EventUserStatusTransition {
  id: number;
  templateId: number;
  fromStatusId: number | null;
  toStatusId: number;
  toStatusName: string;
  toStatusColor: string;
  canUndo: boolean;
  /** A lépés CanUndoFlg — előrelépéskor PrevEventUserStatusID töltődik */
  canRecordPrev: boolean;
}

export const EVENT_USER_FLOW_TEMPLATE_CODE = {
  INVITE_ONLY: 'INVITE_ONLY',
  FREE_AUTO: 'FREE_AUTO',
  FREE_APPROVAL: 'FREE_APPROVAL',
  PAID_AUTO: 'PAID_AUTO',
} as const;

export type EventUserFlowTemplateCode =
  (typeof EVENT_USER_FLOW_TEMPLATE_CODE)[keyof typeof EVENT_USER_FLOW_TEMPLATE_CODE];

export interface EventUserFlowCatalogEntry {
  code: EventUserFlowTemplateCode;
  label: string;
  statuses: string[];
}

export const EVENT_USER_FLOW_CATALOG: Record<EventUserFlowTemplateCode, EventUserFlowCatalogEntry> = {
  INVITE_ONLY: {
    code: EVENT_USER_FLOW_TEMPLATE_CODE.INVITE_ONLY,
    label: 'Meghívott',
    statuses: ['Meghívott', 'Megerősítve', 'Belépett', 'Részt vett'],
  },
  FREE_AUTO: {
    code: EVENT_USER_FLOW_TEMPLATE_CODE.FREE_AUTO,
    label: 'Díjmentes',
    statuses: ['Regisztrált', 'Belépett', 'Részt vett'],
  },
  FREE_APPROVAL: {
    code: EVENT_USER_FLOW_TEMPLATE_CODE.FREE_APPROVAL,
    label: 'Díjmentes jóváhagyással',
    statuses: ['Jelentkezett', 'Jóváhagyva', 'Belépett', 'Részt vett'],
  },
  PAID_AUTO: {
    code: EVENT_USER_FLOW_TEMPLATE_CODE.PAID_AUTO,
    label: 'Jegyvásárló',
    statuses: ['Jegyvásárló', 'Belépett', 'Részt vett'],
  },
};

export const EVENT_USER_FLOW_CATALOG_ORDER: EventUserFlowTemplateCode[] = [
  EVENT_USER_FLOW_TEMPLATE_CODE.INVITE_ONLY,
  EVENT_USER_FLOW_TEMPLATE_CODE.FREE_AUTO,
  EVENT_USER_FLOW_TEMPLATE_CODE.FREE_APPROVAL,
  EVENT_USER_FLOW_TEMPLATE_CODE.PAID_AUTO,
];

export function isEventUserFlowTemplateCode(value: string | null | undefined): value is EventUserFlowTemplateCode {
  const code = String(value || '').trim().toUpperCase();
  return (EVENT_USER_FLOW_CATALOG_ORDER as string[]).includes(code);
}

export function eventUserFlowCatalogEntry(
  code: string | null | undefined
): EventUserFlowCatalogEntry | null {
  const key = String(code || '').trim().toUpperCase();
  if (!isEventUserFlowTemplateCode(key)) return null;
  return EVENT_USER_FLOW_CATALOG[key];
}

export function eventUserFlowDisplayName(
  code: string | null | undefined,
  fallback = ''
): string {
  return eventUserFlowCatalogEntry(code)?.label || fallback;
}

export function allowedEventUserFlowCodes(args: {
  publicFlg: boolean;
  isFree: boolean;
}): EventUserFlowTemplateCode[] {
  if (!args.publicFlg) return [EVENT_USER_FLOW_TEMPLATE_CODE.INVITE_ONLY];
  if (args.isFree) {
    return [EVENT_USER_FLOW_TEMPLATE_CODE.FREE_AUTO, EVENT_USER_FLOW_TEMPLATE_CODE.FREE_APPROVAL];
  }
  return [EVENT_USER_FLOW_TEMPLATE_CODE.PAID_AUTO];
}

export function catalogCodeOfTemplate(
  row: { Code?: string; Name?: string } | null | undefined
): EventUserFlowTemplateCode | null {
  if (!row) return null;
  if (isEventUserFlowTemplateCode(row.Code)) {
    return String(row.Code).trim().toUpperCase() as EventUserFlowTemplateCode;
  }
  const code = String(row.Code || '').trim().toLowerCase();
  const name = String(row.Name || '').trim().toLowerCase();
  const hay = `${code} ${name}`;
  if (hay.includes('invite') || hay.includes('meghív')) return EVENT_USER_FLOW_TEMPLATE_CODE.INVITE_ONLY;
  if (hay.includes('approval') || hay.includes('jóváhagy') || hay.includes('jovahagy')) {
    return EVENT_USER_FLOW_TEMPLATE_CODE.FREE_APPROVAL;
  }
  if (hay.includes('paid') || hay.includes('jegyvásárl') || hay.includes('jegyvasarl')) {
    return EVENT_USER_FLOW_TEMPLATE_CODE.PAID_AUTO;
  }
  if (hay.includes('free') || hay.includes('díjmentes') || hay.includes('dijmentes')) {
    return EVENT_USER_FLOW_TEMPLATE_CODE.FREE_AUTO;
  }
  return null;
}

export function findTemplateForCatalogCode(
  templates: EventUserFlowTemplate[],
  code: EventUserFlowTemplateCode
): EventUserFlowTemplate | null {
  const exact = findEventUserFlowTemplateByCode(templates, code);
  if (exact) return exact;
  return (templates || []).find((row) => catalogCodeOfTemplate(row) === code) || null;
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

export const PENDING_USER_APPROVAL_LABEL = 'Megerősítésre vár';
export const PENDING_USER_APPROVAL_COLOR = '#fbbf24';

export function eventUserStatusNeedsUserApproval(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  const rec = row as Record<string, unknown>;
  return isTruthyFlag(
    rec.NeedUserApprovalFlg ?? rec.needUserApprovalFlg ?? rec.NeedUserApprovalFLG
  );
}

export function eventUserStatusNeedsOrganizerApproval(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  const rec = row as Record<string, unknown>;
  return isTruthyFlag(
    rec.NeedOrganizerApprovalFlg ??
      rec.needOrganizerApprovalFlg ??
      rec.NeedOrganizerApprovalFLG
  );
}

export function statusIdNeedsUserApproval(
  eventUserStatuses: unknown[],
  statusId: number | null | undefined
): boolean {
  return eventUserStatusNeedsUserApproval(findEventUserStatus(eventUserStatuses, statusId));
}

export function statusIdNeedsOrganizerApproval(
  eventUserStatuses: unknown[],
  statusId: number | null | undefined
): boolean {
  return eventUserStatusNeedsOrganizerApproval(findEventUserStatus(eventUserStatuses, statusId));
}

export function normalizeEventUserStatuses(rows: unknown[]): EventUserStatus[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(rowActive)
    .map((row) => ({
      ...row,
      id: rowId(row) as number,
      StatusName: eventUserStatusName(row),
      ColorCode: eventUserStatusColor(row) || undefined,
      NeedUserApprovalFlg: eventUserStatusNeedsUserApproval(row),
      NeedOrganizerApprovalFlg: eventUserStatusNeedsOrganizerApproval(row),
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter((row) => row.id !== undefined && Number.isFinite(row.id));
}

export function eventUserStatusName(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  const rec = row as Record<string, unknown>;
  return String(
    rec.StatusName ?? rec.Name ?? rec.statusName ?? rec.SName ?? rec.EventUserStatusName ?? ''
  ).trim();
}

export function findEventUserStatus(
  eventUserStatuses: unknown[],
  statusId: number | null | undefined
): Record<string, unknown> | null {
  if (statusId == null) return null;
  const num = Number(statusId);
  if (!Number.isFinite(num)) return null;
  const hit = (eventUserStatuses || []).find((row) => {
    if (!row || typeof row !== 'object') return false;
    const rec = row as Record<string, unknown>;
    return Number(rec.id ?? rec.ID ?? rec.Id) === num;
  });
  return hit && typeof hit === 'object' ? (hit as Record<string, unknown>) : null;
}

export function getEventUserStatusNameById(
  eventUserStatuses: unknown[],
  statusId: number | null | undefined,
  fallback = 'Státusz'
): string {
  const name = eventUserStatusName(findEventUserStatus(eventUserStatuses, statusId));
  return name || fallback;
}

export function eventUserStatusColor(row: unknown): string {
  if (!row || typeof row !== 'object') return '';
  const rec = row as Record<string, unknown>;
  return String(rec.ColorCode ?? rec.ColorHex ?? rec.colorCode ?? rec.colorHex ?? '').trim();
}

export function getEventUserStatusColorById(
  eventUserStatuses: unknown[],
  statusId: number | null | undefined
): string {
  return eventUserStatusColor(findEventUserStatus(eventUserStatuses, statusId));
}

function normalizeStatusKey(value: string): string {
  return value.trim().toLowerCase();
}

export function findEventUserStatusByName(
  eventUserStatuses: unknown[],
  name: string
): Record<string, unknown> | null {
  const wanted = normalizeStatusKey(name);
  if (!wanted) return null;
  const rows = (eventUserStatuses || []).filter((row) => row && typeof row === 'object') as Record<string, unknown>[];
  const exact = rows.find((row) => normalizeStatusKey(eventUserStatusName(row)) === wanted);
  if (exact) return exact;
  return (
    rows.find((row) => {
      const label = normalizeStatusKey(eventUserStatusName(row));
      return label.includes(wanted) || wanted.includes(label);
    }) || null
  );
}

export function catalogFlowStatuses(
  code: string | null | undefined,
  eventUserStatuses: unknown[]
): EventUserFlowStatusStop[] {
  const entry = eventUserFlowCatalogEntry(code);
  if (!entry) return [];
  return entry.statuses.map((statusName, index) => {
    const row = findEventUserStatusByName(eventUserStatuses, statusName);
    return {
      id: index + 1,
      name: statusName,
      color: eventUserStatusColor(row) || '#94a3b8',
    };
  });
}

export function defaultEventUserFlowTemplateCode(
  publicFlg: boolean,
  isFree: boolean
): EventUserFlowTemplateCode {
  if (!publicFlg) return EVENT_USER_FLOW_TEMPLATE_CODE.INVITE_ONLY;
  return isFree
    ? EVENT_USER_FLOW_TEMPLATE_CODE.FREE_AUTO
    : EVENT_USER_FLOW_TEMPLATE_CODE.PAID_AUTO;
}

export function findEventUserFlowTemplateByCode(
  templates: EventUserFlowTemplate[],
  code: string | null | undefined
): EventUserFlowTemplate | null {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return null;
  return (
    (templates || []).find((row) => String(row.Code || '').trim().toUpperCase() === wanted) ||
    null
  );
}

export function findEventUserFlowTemplateIdByCode(
  templates: EventUserFlowTemplate[],
  code: string | null | undefined
): number | null {
  return findEventUserFlowTemplateByCode(templates, code)?.id ?? null;
}

export function normalizeEventUserFlowTemplates(rows: unknown[]): EventUserFlowTemplate[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(rowActive)
    .map((row) => ({
      ...row,
      id: rowId(row) as number,
      Code: String(row.Code ?? row.code ?? '').trim(),
      Name: String(row.Name ?? row.name ?? row.TemplateName ?? '').trim(),
      Description: (row.Description ?? row.description ?? null) as string | null,
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter((row) => row.id !== undefined && row.Code.length > 0);
}

export function normalizeEventUserFlowTemplateSteps(rows: unknown[]): EventUserFlowTemplateStep[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(rowActive)
    .map((row) => ({
      ...row,
      id: rowId(row) as number,
      TemplateID: Number(row.TemplateID ?? row.templateID ?? row.TemplateId),
      StepID: nullableNumericId(row.StepID ?? row.stepID ?? row.StepId),
      FromEventUserStatusID: nullableNumericId(
        row.FromEventUserStatusID ?? row.fromEventUserStatusID ?? row.FromEventUserStatusId
      ),
      ToEventUserStatusID: Number(
        row.ToEventUserStatusID ?? row.toEventUserStatusID ?? row.ToEventUserStatusId
      ),
      CanUndoFlg: isTruthyFlag(
        row.CanUndoFlg ?? row.canUndoFlg ?? row.CanUndoFLG ?? row.UndoFlg ?? row.CanUndo
      ),
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter(
      (row) =>
        row.id !== undefined &&
        Number.isFinite(row.TemplateID) &&
        Number.isFinite(row.ToEventUserStatusID)
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

function toTransition(
  row: EventUserFlowTemplateStep,
  eventUserStatuses: unknown[],
  overrides: Partial<EventUserStatusTransition> = {}
): EventUserStatusTransition {
  const toStatusId = overrides.toStatusId ?? row.ToEventUserStatusID;
  return {
    id: row.id,
    templateId: row.TemplateID,
    fromStatusId: overrides.fromStatusId ?? row.FromEventUserStatusID,
    toStatusId,
    toStatusName: getEventUserStatusNameById(eventUserStatuses, toStatusId, 'Státusz'),
    toStatusColor: getEventUserStatusColorById(eventUserStatuses, toStatusId),
    canUndo: overrides.canUndo ?? false,
    canRecordPrev: overrides.canRecordPrev ?? row.CanUndoFlg,
    ...overrides,
  };
}

/**
 * Előrelépő átmenetek: FromEventUserStatusID == aktuális (NULL = start).
 * Szervezői adatlapon minden lépés kattintható — nincs szerepkör-szűrő.
 */
export function listAllowedEventUserStatusTransitions(args: {
  templateId: number | null | undefined;
  currentStatusId: number | null | undefined;
  steps: EventUserFlowTemplateStep[];
  eventUserStatuses: unknown[];
}): EventUserStatusTransition[] {
  const templateId = nullableNumericId(args.templateId);
  if (templateId == null) return [];

  return (args.steps || [])
    .filter(
      (row) =>
        Number(row.TemplateID) === templateId &&
        fromStatusMatches(row.FromEventUserStatusID, args.currentStatusId)
    )
    .map((row) => toTransition(row, args.eventUserStatuses, { canUndo: false }));
}

/**
 * Visszavonás: csak a tárolt PrevEventUserStatusID alapján.
 * Az mező csak akkor van kitöltve, ha az ide vezető lépés CanUndoFlg=true volt.
 */
export function listUndoEventUserStatusTransitions(args: {
  prevStatusId: number | null | undefined;
  currentStatusId: number | null | undefined;
  eventUserStatuses: unknown[];
}): EventUserStatusTransition[] {
  const prev = nullableNumericId(args.prevStatusId);
  const current = nullableNumericId(args.currentStatusId);
  if (prev == null || current == null || prev === current) return [];

  return [
    {
      id: 0,
      templateId: 0,
      fromStatusId: current,
      toStatusId: prev,
      toStatusName: getEventUserStatusNameById(args.eventUserStatuses, prev, 'Státusz'),
      toStatusColor: getEventUserStatusColorById(args.eventUserStatuses, prev),
      canUndo: true,
      canRecordPrev: false,
    },
  ];
}

export interface EventUserFlowStatusStop {
  id: number;
  name: string;
  color: string;
}

/** A sablon státuszai a folyamat sorrendjében (start → …). */
export function listEventUserFlowStatuses(args: {
  templateId: number | null | undefined;
  steps: EventUserFlowTemplateStep[];
  eventUserStatuses: unknown[];
}): EventUserFlowStatusStop[] {
  const templateId = Number(args.templateId);
  if (!Number.isFinite(templateId) || templateId <= 0) return [];

  const steps = (args.steps || [])
    .filter((row) => Number(row.TemplateID) === templateId)
    .sort((a, b) => Number(a.StepID ?? a.id) - Number(b.StepID ?? b.id));

  const byFrom = new Map<string, EventUserFlowTemplateStep[]>();
  for (const step of steps) {
    const key = step.FromEventUserStatusID == null ? 'start' : String(step.FromEventUserStatusID);
    const list = byFrom.get(key) || [];
    list.push(step);
    byFrom.set(key, list);
  }

  const seen = new Set<number>();
  const out: EventUserFlowStatusStop[] = [];
  const queue: Array<number | null> = [null];
  const queued = new Set<string>(['start']);

  while (queue.length) {
    const from = queue.shift() as number | null;
    const key = from == null ? 'start' : String(from);
    for (const step of byFrom.get(key) || []) {
      const to = Number(step.ToEventUserStatusID);
      if (!Number.isFinite(to) || seen.has(to)) continue;
      seen.add(to);
      out.push({
        id: to,
        name: getEventUserStatusNameById(args.eventUserStatuses, to, 'Státusz'),
        color: getEventUserStatusColorById(args.eventUserStatuses, to) || '#94a3b8',
      });
      const nextKey = String(to);
      if (!queued.has(nextKey)) {
        queued.add(nextKey);
        queue.push(to);
      }
    }
  }

  if (out.length) return out;

  for (const step of steps) {
    const to = Number(step.ToEventUserStatusID);
    if (!Number.isFinite(to) || seen.has(to)) continue;
    seen.add(to);
    out.push({
      id: to,
      name: getEventUserStatusNameById(args.eventUserStatuses, to, 'Státusz'),
      color: getEventUserStatusColorById(args.eventUserStatuses, to) || '#94a3b8',
    });
  }
  return out;
}
