import type { Router } from 'vue-router';
import { isProfitabilityEventType, eventTypeIdOf } from 'src/modules/profitability/constants';
import { findPtaPlayerForEventUser } from 'src/modules/profitability/ptaData';
import { useEventStore, isGameMasterRole, type EnterableEventRole } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { eventStatusReachedCheckIn, getEventFlowIdForType } from 'src/utils/eventFlow';
import { nullableNumericId } from 'src/utils/apiPayload';

export type EventDatasheetKind = 'organizer' | 'gamemaster' | 'contributor' | 'player';

function foldLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isPtaDatasheetEvent(eventId?: string | number | null): boolean {
  if (eventId == null || eventId === '') return false;
  if (isProfitabilityEventType(resolveEventTypeId(eventId))) return true;
  return !!useEventStore().getPtaSettingsForEvent(eventId);
}

export function eventDatasheetKind(
  role: EnterableEventRole | null | undefined,
  eventId?: string | number | null
): EventDatasheetKind {
  if (role?.isOrganizer) return 'organizer';
  if (
    role &&
    isGameMasterRole(role.masterRoleId, role.name, role.roleTypeName)
  ) {
    return 'gamemaster';
  }
  const hay = foldLabel(`${role?.roleTypeName || ''} ${role?.name || ''}`);
  if (hay.includes('jatekos')) return 'player';
  if (
    (hay.includes('reszvev') || hay.includes('participant')) &&
    isPtaDatasheetEvent(eventId)
  ) {
    return 'player';
  }
  return 'contributor';
}

function resolveEventTypeId(eventId: string | number, explicit?: number | null): number | null {
  if (explicit != null) return Number(explicit);
  const eventStore = useEventStore();
  const target = String(eventId);
  const ev =
    eventStore.events?.find((e: any) => String(e.id) === target) ||
    eventStore.myEvents?.find((e: any) => String(e.id) === target) ||
    eventStore.discoveryEvents?.find((e: any) => String(e.id) === target) ||
    null;
  return eventTypeIdOf(ev as Record<string, unknown> | null);
}

function resolveEventRecord(eventId: string | number): Record<string, unknown> | null {
  const eventStore = useEventStore();
  const target = String(eventId);
  return (
    eventStore.events?.find((e: any) => String(e.id) === target) ||
    eventStore.myEvents?.find((e: any) => String(e.id) === target) ||
    eventStore.discoveryEvents?.find((e: any) => String(e.id) === target) ||
    null
  );
}

export function eventRoleQuery(role: EnterableEventRole | null): Record<string, string> {
  const query: Record<string, string> = {};
  if (role?.eventRoleId != null) query.eventRoleId = String(role.eventRoleId);
  if (role?.eventUserId != null) query.eventUserId = String(role.eventUserId);
  return query;
}

export function eventOrganizerManagePath(
  eventId: string | number,
  eventTypeId?: number | null
): string {
  const typeId = resolveEventTypeId(eventId, eventTypeId);
  if (isProfitabilityEventType(typeId)) {
    return `/profitability/event/${eventId}/manage`;
  }
  const eventStore = useEventStore();
  if (eventStore.getPtaSettingsForEvent(eventId)) {
    return `/profitability/event/${eventId}/manage`;
  }
  return `/event/${eventId}/manage`;
}

export function eventGameMasterPath(eventId: string | number): string {
  return `/profitability/event/${eventId}/contribute`;
}

function eventStatusContext(eventId: string | number) {
  const eventStore = useEventStore();
  eventStore.reapplyLocalEventStatuses();
  const ev = resolveEventRecord(eventId);
  const statusId = ev
    ? Number(ev.EventStatusID ?? ev.eventStatusID ?? ev.StatusID ?? ev.StatusId ?? NaN)
    : NaN;
  const statusNameHint = ev
    ? String(
        ev.EventStatusName ??
          ev.StatusName ??
          ev.EventStatus ??
          ev.Status ??
          ev.statusName ??
          ''
      )
    : '';
  const master = useMasterDataStore();
  const typeId = ev ? eventTypeIdOf(ev) : null;
  const eventType =
    typeId != null
      ? (master.eventTypes || []).find(
          (row: { id?: number; ID?: number }) => Number(row.id ?? row.ID) === Number(typeId)
        )
      : null;
  return {
    eventStore,
    master,
    ev,
    statusId: Number.isFinite(statusId) ? statusId : null,
    statusNameHint,
    eventFlowId: getEventFlowIdForType(eventType),
  };
}

function eventReachedCheckIn(eventId: string | number): boolean {
  const ctx = eventStatusContext(eventId);
  return eventStatusReachedCheckIn(ctx.master.eventStatuses, ctx.master.eventFlowStatuses, ctx.statusId, {
    eventFlowId: ctx.eventFlowId,
    statusNameHint: ctx.statusNameHint,
  });
}

function isEventUserCheckedInName(name: string): boolean {
  const hay = foldLabel(name);
  if (!hay || hay === 'ismeretlen') return false;
  return (
    hay.includes('belep') ||
    hay.includes('bejelentkez') ||
    hay.includes('checkin') ||
    hay.includes('check-in')
  );
}

function roleCheckedIn(
  eventId: string | number,
  role: EnterableEventRole | null | undefined
): boolean {
  const eventStore = useEventStore();
  const master = useMasterDataStore();
  const eventUserId = role?.eventUserId;
  const eu =
    (eventUserId != null
      ? eventStore.eventUsers.find((row) => Number(row.id) === Number(eventUserId)) ||
        eventStore.eventParticipants.find((row) => Number(row.id) === Number(eventUserId))
      : null) || eventStore.getDisplayEventUserForEvent(eventId);
  if (!eu) return false;
  const statusId = nullableNumericId(eu.EventUserStatusID);
  const name = statusId != null ? master.getEventUserStatusName(statusId) : '';
  if (isEventUserCheckedInName(name)) return true;
  const userId = nullableNumericId(eu.UserID ?? eu.userID ?? eu.UserId);
  return !!findPtaPlayerForEventUser(eventStore.ptaEventPlayers, eventId, eu.id, userId);
}

export function gameMasterEnterBlocked(
  eventId: string | number,
  role: EnterableEventRole | null | undefined
): string | null {
  if (eventDatasheetKind(role, eventId) !== 'gamemaster') return null;
  if (eventReachedCheckIn(eventId)) return null;
  const eventStore = useEventStore();
  if (
    eventStore.getPtaDesksForEvent(eventId).length > 0 ||
    eventStore.getPtaRoundsForEvent(eventId).length > 0
  ) {
    return null;
  }
  return 'A játékmesteri adatlap a bejelentkezés státusztól érhető el.';
}

export function playerEnterBlocked(
  eventId: string | number,
  role: EnterableEventRole | null | undefined
): string | null {
  if (eventDatasheetKind(role, eventId) !== 'player') return null;
  if (!eventReachedCheckIn(eventId)) {
    return 'A játékos adatlap a bejelentkezés státusztól érhető el.';
  }
  if (!roleCheckedIn(eventId, role)) {
    return 'A belépés a jegyed leolvasása után érhető el.';
  }
  return null;
}

export function eventRoleEnterBlocked(
  eventId: string | number,
  role: EnterableEventRole | null | undefined
): string | null {
  return gameMasterEnterBlocked(eventId, role) || playerEnterBlocked(eventId, role);
}

export function eventRolePath(
  eventId: string | number,
  role: EnterableEventRole | null,
  eventTypeId?: number | null
): string {
  switch (eventDatasheetKind(role, eventId)) {
    case 'organizer':
      return eventOrganizerManagePath(eventId, eventTypeId);
    case 'gamemaster':
      return eventGameMasterPath(eventId);
    case 'player':
      return `/profitability/event/${eventId}`;
    default:
      return `/event/${eventId}/contribute`;
  }
}

export function navigateToEventRole(
  router: Router,
  eventId: string | number,
  role: EnterableEventRole | null
) {
  if (eventRoleEnterBlocked(eventId, role)) return Promise.resolve();
  return router.replace({
    path: eventRolePath(eventId, role),
    query: eventRoleQuery(role),
  });
}

export function isSameEventRole(
  a: EnterableEventRole | null | undefined,
  b: EnterableEventRole | null | undefined
): boolean {
  if (!a || !b) return false;
  if (a.eventUserId != null && b.eventUserId != null && Number(a.eventUserId) === Number(b.eventUserId)) {
    return true;
  }
  if (a.eventRoleId != null && b.eventRoleId != null && Number(a.eventRoleId) === Number(b.eventRoleId)) {
    return true;
  }
  return false;
}
