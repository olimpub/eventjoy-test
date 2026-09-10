import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useEventStore, type EnterableEventRole } from 'src/stores/event';
import { nullableNumericId } from 'src/utils/apiPayload';
import {
  eventDatasheetKind,
  signalRRoleFromDatasheetKind,
  type EventDatasheetKind,
  type SignalRLiveRole,
} from 'src/utils/eventRoleNav';
import { connectToEventLive, type EventLiveJoin } from 'src/services/signalrService';

function routeNameToKind(name: unknown): EventDatasheetKind | null {
  switch (String(name || '')) {
    case 'event_manage':
    case 'event_participants':
    case 'event_ticket_scan':
    case 'profitability-organizer':
    case 'profitability-participants':
    case 'profitability-game':
    case 'profitability-results':
    case 'profitability-vetites':
    case 'profitability-display':
      return 'organizer';
    case 'event_contribute':
    case 'profitability-gamemaster':
      return 'gamemaster';
    case 'profitability-event-detail':
      return 'player';
    default:
      return null;
  }
}

export function resolveEventLiveJoin(
  eventId: number | string,
  role?: EnterableEventRole | null,
  route?: Pick<RouteLocationNormalizedLoaded, 'name' | 'query'>
): EventLiveJoin | null {
  const id = nullableNumericId(eventId);
  if (id == null) return null;

  const store = useEventStore();
  const roles = store.getEnterableRolesForEvent(id);
  const qUser = route ? nullableNumericId(route.query.eventUserId) : null;

  let picked = role || null;
  if (!picked && qUser != null) {
    picked = roles.find((row) => Number(row.eventUserId) === qUser) || null;
  }
  if (!picked && route) {
    const kind = routeNameToKind(route.name);
    if (kind) {
      picked = roles.find((row) => eventDatasheetKind(row, id) === kind) || null;
    }
  }
  if (!picked && String(route?.name || '') === 'event_details') {
    picked =
      roles.find((row) => eventDatasheetKind(row, id) === 'player') ||
      roles.find((row) => !row.isOrganizer) ||
      null;
  }
  if (!picked) picked = roles[0] || null;

  const eventUserId =
    nullableNumericId(picked?.eventUserId) ?? store.getMyEventUserStatus(id)?.eventUserId ?? null;

  let roleName: SignalRLiveRole = 'participant';
  if (picked) {
    roleName = signalRRoleFromDatasheetKind(eventDatasheetKind(picked, id));
  } else if (route) {
    const kind = routeNameToKind(route.name);
    if (kind) roleName = signalRRoleFromDatasheetKind(kind);
  }

  return { eventId: id, eventUserId, roleName };
}

/**
 * Esemény adatlap Belépés: státusz nem változik.
 * SignalR: role csoport + event_{id}_gamer + privát event_{id}_user_{eventUserId}.
 */
export async function enterEventSession(
  eventId: number | string,
  role?: EnterableEventRole | null
): Promise<void> {
  const join = resolveEventLiveJoin(eventId, role);
  if (!join) throw new Error('Hiányzó esemény.');
  await connectToEventLive(join);
}
