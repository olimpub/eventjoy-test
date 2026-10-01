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
import { isOlimpubEventType } from 'src/modules/olimpub/constants';
import { readOpDeviceSession } from 'src/modules/olimpub/opDevice';

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
    case 'olimpub-organizer':
    case 'olimpub-participants':
    case 'olimpub-quiz':
    case 'olimpub-results':
    case 'olimpub-display':
    case 'olimpub-scan':
    case 'olimpub-materials':
      return 'organizer';
    case 'event_contribute':
    case 'profitability-gamemaster':
    case 'olimpub-quizmaster':
      return 'gamemaster';
    case 'profitability-event-detail':
    case 'olimpub-player':
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

  const device = readOpDeviceSession();
  const eventUserId =
    nullableNumericId(picked?.eventUserId) ??
    store.getMyEventUserStatus(id)?.eventUserId ??
    (device && device.eventId === id ? device.eventUserId : null);

  const ev =
    store.events?.find((row: { id?: number | string }) => String(row.id) === String(id)) ||
    store.myEvents?.find((row: { id?: number | string }) => String(row.id) === String(id));
  const op =
    String(route?.name || '').startsWith('olimpub-') ||
    isOlimpubEventType(ev?.EventTypeID ?? ev?.eventTypeId) ||
    Boolean(store.getOpSettingsForEvent(id));

  const routeKind = route ? routeNameToKind(route.name) : null;
  const pickedKind = picked ? eventDatasheetKind(picked, id) : routeKind;
  let roleName: SignalRLiveRole = op ? 'gamer' : 'participant';
  let includeGamemaster = false;

  if (op) {
    if (routeKind === 'gamemaster') {
      if (pickedKind === 'organizer') {
        roleName = 'organizer';
        includeGamemaster = true;
      } else {
        roleName = 'gamemaster';
      }
    } else if (routeKind === 'player') {
      roleName = 'gamer';
    } else if (routeKind === 'organizer' || pickedKind === 'organizer') {
      roleName = 'organizer';
    } else if (pickedKind) {
      roleName = signalRRoleFromDatasheetKind(pickedKind, true);
    }
  } else if (pickedKind) {
    roleName = signalRRoleFromDatasheetKind(pickedKind);
  } else if (routeKind) {
    roleName = signalRRoleFromDatasheetKind(routeKind);
  }

  return {
    eventId: id,
    eventUserId,
    roleName,
    opChannels: op,
    includeGamemaster,
  };
}

/**
 * Esemény adatlap Belépés: státusz nem változik.
 * Olimpub: organizer / gamemaster / gamer. PTA: role + gamer + user_*.
 */
export async function enterEventSession(
  eventId: number | string,
  role?: EnterableEventRole | null
): Promise<void> {
  const join = resolveEventLiveJoin(eventId, role);
  if (!join) throw new Error('Hiányzó esemény.');
  await connectToEventLive(join);
}
