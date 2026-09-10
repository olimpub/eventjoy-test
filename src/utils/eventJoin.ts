import { api } from 'src/boot/axios';
import {
  isTruthyFlag,
  nullableNumericId,
  readApiReturnDescription,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pickEventUid(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const row = event as Record<string, unknown>;
  const raw = String(row.EventUID ?? row.EventUid ?? row.eventUid ?? '').trim();
  if (!raw) return null;
  const unwrapped = raw.replace(/^\{|\}$/g, '');
  if (GUID_RE.test(unwrapped)) return unwrapped.toLowerCase();
  return unwrapped || null;
}

export function eventJoinPath(eventUid: string): string {
  return `/join/${encodeURIComponent(eventUid)}`;
}

export function eventJoinAbsoluteUrl(eventUid: string): string {
  const path = eventJoinPath(eventUid);
  if (typeof window === 'undefined') return path;
  const base = String(process.env.VUE_ROUTER_BASE || '/').replace(/\/+$/, '');
  return `${window.location.origin}${base}${path}`;
}

export function safeLoginNextPath(raw: unknown): string | null {
  const next = String(raw || '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next === '/login' || next.startsWith('/login?')) return null;
  return next;
}

export function userNeedsDisplayName(user: unknown): boolean {
  if (!user || typeof user !== 'object') return true;
  const row = user as Record<string, unknown>;
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  return !first || !last;
}

export interface EventJoinPreview {
  EventUID: string;
  EventID: number | null;
  Title: string;
  CheckInOpen: boolean | null;
  EventStatusName: string;
}

export interface EventJoinResult {
  EventID: number | null;
  EventUserID: number | null;
  message: string;
}

export async function fetchEventJoinPreview(eventUid: string): Promise<EventJoinPreview> {
  const response = await api.get(`/event/join/${encodeURIComponent(eventUid)}`);
  const data = unwrapApiPayload(response.data);
  const uid = String(data.EventUID ?? data.EventUid ?? data.eventUid ?? eventUid).trim();
  return {
    EventUID: uid || eventUid,
    EventID: nullableNumericId(data.EventID ?? data.eventID ?? data.EventId),
    Title: String(data.Title ?? data.EventName ?? data.Name ?? '').trim() || 'Esemény',
    CheckInOpen:
      data.CheckInOpen == null && data.checkInOpen == null
        ? null
        : isTruthyFlag(data.CheckInOpen ?? data.checkInOpen),
    EventStatusName: String(data.EventStatusName ?? data.eventStatusName ?? '').trim(),
  };
}

export async function saveUserDisplayName(firstName: string, lastName: string): Promise<void> {
  const FirstName = firstName.trim();
  const LastName = lastName.trim();
  const response = await api.post('/user/save', { FirstName, LastName });
  throwIfApiFailed(response.data, 'A név mentése sikertelen.');
  const { useAuthStore } = await import('src/stores/auth');
  const authStore = useAuthStore();
  if (authStore.user && typeof authStore.user === 'object') {
    authStore.user = { ...authStore.user, FirstName, LastName };
  } else {
    authStore.user = { FirstName, LastName };
  }
}

export async function joinEventByUid(eventUid: string): Promise<EventJoinResult> {
  const response = await api.post('/event/join', { EventUID: eventUid });
  throwIfApiFailed(response.data, 'A helyszíni belépés sikertelen.');
  const data = unwrapApiPayload(response.data);
  return {
    EventID: nullableNumericId(data.EventID ?? data.eventID ?? data.EventId),
    EventUserID: nullableNumericId(data.EventUserID ?? data.eventUserID ?? data.EventUserId),
    message: readApiReturnDescription(response.data) || 'Belépés kész.',
  };
}
