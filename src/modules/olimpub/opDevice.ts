import axios from 'axios';
import { api } from 'src/boot/axios';
import {
  nullableNumericId,
  readApiReturnValue,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';
import { eventStatusAllowsQuickJoin } from 'src/utils/eventFlow';
import { fetchEventJoinPreview } from 'src/utils/eventJoin';

const DEVICE_ID_KEY = 'op_device_id';
const SESSION_KEY = 'op_device_session';
const SKIP_RESUME_KEY = 'op_skip_resume';

export interface OpCurrentEvent {
  eventId: number;
  eventUid: string;
  title: string;
  statusName: string;
  statusId: number | null;
  joinOpen: boolean;
}

export interface OpDeviceSession {
  eventId: number;
  eventUserId: number;
  nickname: string;
  eventTitle: string;
  statusName?: string;
  statusId?: number | null;
}

export interface OpDeviceJoinResult {
  token: string;
  eventId: number;
  eventUserId: number;
  nickname: string;
}

function row(raw: unknown): Record<string, unknown> {
  const data = unwrapApiPayload(raw);
  const result1 = data.Result1;
  const first = Array.isArray(result1) ? result1[0] : result1;
  if (first && typeof first === 'object') return first as Record<string, unknown>;
  return data;
}

function text(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = String(record[key] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function flag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true';
}

export function getOrCreateOpDeviceId(): string {
  const existing = String(localStorage.getItem(DEVICE_ID_KEY) || '').trim();
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function readOpDeviceSession(): OpDeviceSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || '') as Partial<OpDeviceSession>;
    const eventId = nullableNumericId(parsed.eventId);
    const eventUserId = nullableNumericId(parsed.eventUserId);
    const nickname = String(parsed.nickname || '').trim();
    if (eventId == null || eventUserId == null || !nickname) return null;
    return {
      eventId,
      eventUserId,
      nickname,
      eventTitle: String(parsed.eventTitle || '').trim(),
      statusName: String(parsed.statusName || '').trim() || undefined,
      statusId: nullableNumericId(parsed.statusId),
    };
  } catch {
    return null;
  }
}

export function writeOpDeviceSession(session: OpDeviceSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearOpDeviceSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** Kilépés a váróteremből: a join oldal ne dobja vissza azonnal. */
export function markOpSkipResume(eventId: string | number) {
  try {
    sessionStorage.setItem(SKIP_RESUME_KEY, String(eventId));
  } catch {
    /* privát mód */
  }
}

export function consumeOpSkipResume(eventId: string | number): boolean {
  try {
    const marked = sessionStorage.getItem(SKIP_RESUME_KEY);
    if (!marked || marked !== String(eventId)) return false;
    sessionStorage.removeItem(SKIP_RESUME_KEY);
    return true;
  } catch {
    return false;
  }
}

function jwtTokenKind(token: string): string {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return '';
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const extra = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const payload = JSON.parse(atob(padded + extra)) as Record<string, unknown>;
    return String(payload.TokenKind ?? payload.tokenKind ?? '').trim();
  } catch {
    return '';
  }
}

/** Boot kihagyása: a device token nem hívhatja a /user/data és /event/data párost. */
export function deviceUserFromSession(): Record<string, unknown> | null {
  const token = localStorage.getItem('token') || '';
  const session = readOpDeviceSession();
  if (!token || !session) return null;
  const kind = jwtTokenKind(token);
  if (kind && kind !== 'OpDevice') return null;
  return {
    TokenKind: 'OpDevice',
    Nickname: session.nickname,
    EventID: session.eventId,
    EventUserID: session.eventUserId,
  };
}

export async function fetchOpCurrent(): Promise<OpCurrentEvent | null> {
  try {
    const response = await api.get('/op/current', { skipErrorNotify: true, skipAuth: true });
    throwIfApiFailed(response.data, 'Az aktuális játék nem olvasható.');
    const data = row(response.data);
    const eventId = nullableNumericId(data.EventID ?? data.eventId);
    if (eventId == null) return null;
    const eventUid = text(data, 'EventUID', 'eventUid');
    const statusId = nullableNumericId(data.EventStatusID ?? data.eventStatusID ?? data.StatusID);
    let statusName = text(
      data,
      'EventStatusName',
      'eventStatusName',
      'StatusName',
      'statusName',
      'EventStatusCode',
    );
    if (!statusName && statusId != null) {
      try {
        const { useMasterDataStore } = await import('src/stores/masterData');
        statusName = useMasterDataStore().getEventStatusNameById(statusId, '');
      } catch {
        /* nincs master */
      }
    }
    let joinOpen =
      flag(data.JoinOpen ?? data.joinOpen) || eventStatusAllowsQuickJoin(statusName);
    if (eventUid && (!statusName || !joinOpen)) {
      try {
        const preview = await fetchEventJoinPreview(eventUid);
        if (!statusName) statusName = preview.EventStatusName;
        joinOpen =
          joinOpen || preview.CheckInOpen === true || eventStatusAllowsQuickJoin(statusName);
      } catch {
        /* a current mezői maradnak */
      }
    }
    return {
      eventId,
      eventUid,
      title: text(data, 'Title', 'title') || 'Olimpub',
      statusName,
      statusId,
      joinOpen,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** GET /op/current státuszát ráírja a katalógus-stubra, hogy a játékos adatlap ne Tervezést mutasson. */
export async function applyFetchedOpCurrent(current: OpCurrentEvent) {
  const { useEventStore } = await import('src/stores/event');
  const applied = useEventStore().applyOpLiveStatus({
    eventId: current.eventId,
    title: current.title,
    statusId: current.statusId,
    statusName: current.statusName,
  });
  const session = readOpDeviceSession();
  if (!session || session.eventId !== current.eventId) return;
  writeOpDeviceSession({
    ...session,
    eventTitle: current.title || session.eventTitle,
    statusName: applied.statusName || session.statusName,
    statusId: applied.statusId ?? session.statusId ?? null,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  const direct = asRecord(value);
  if (direct) return direct;
  if (Array.isArray(value)) return asRecord(value[0]);
  return null;
}

/** Auth-szerű válasz: a token a Result2-ben van, a Result1 csak a státuszszöveg. */
function authResultBag(raw: unknown): Record<string, unknown> {
  const data = unwrapApiPayload(raw);
  const extra = firstRecord(data.Result2 ?? data.result2) || firstRecord(data.Result1 ?? data.result1);
  return extra ? { ...data, ...extra } : data;
}

function pickIgnoreCase(record: Record<string, unknown>, ...names: string[]): unknown {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(key.toLowerCase())) return value;
  }
  return undefined;
}

function looksLikeJwt(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function pickJwt(record: Record<string, unknown>): string {
  const named = text(
    record,
    'JwtToken',
    'jwtToken',
    'JWTToken',
    'Token',
    'token',
    'AccessToken',
    'accessToken',
    'Jwt',
    'jwt',
  );
  if (named) return named;
  for (const value of Object.values(record)) {
    if (typeof value === 'string' && looksLikeJwt(value.trim())) return value.trim();
  }
  return '';
}

function parseDeviceJoin(raw: unknown, fallbackName = ''): OpDeviceJoinResult {
  throwIfApiFailed(raw, 'A belépés nem sikerült.');
  const data = authResultBag(raw);
  const token = pickJwt(data);
  const eventId = nullableNumericId(
    pickIgnoreCase(data, 'EventID', 'EventId', 'eventId', 'eventID'),
  );
  const eventUserId = nullableNumericId(
    pickIgnoreCase(data, 'EventUserID', 'EventUserId', 'eventUserId', 'eventUserID'),
  );
  const savedName = text(data, 'Nickname', 'nickname') || fallbackName;
  if (!token || eventId == null || eventUserId == null) {
    throw new Error('A belépés nem adott tokent. Próbáld újra.');
  }
  return { token, eventId, eventUserId, nickname: savedName };
}

function deviceJoinBody(nickname?: string | null, eventUid?: string | null): Record<string, string> {
  const body: Record<string, string> = {
    DeviceId: getOrCreateOpDeviceId(),
    DeviceName: 'EventJoy WebApp',
  };
  const name = String(nickname || '').trim();
  if (name) body.Nickname = name;
  const uid = String(eventUid || '').trim();
  if (uid) body.EventUID = uid;
  return body;
}

export async function joinOpDevice(
  nickname: string,
  eventUid?: string | null,
): Promise<OpDeviceJoinResult> {
  const trimmed = nickname.trim();
  const response = await api.post('/auth/device-join', deviceJoinBody(trimmed, eventUid), {
    skipErrorNotify: true,
    skipAuth: true,
  });
  return parseDeviceJoin(response.data, trimmed);
}

/** DeviceId már bent van az élő eseményen → JWT, becenév nélkül. Nincs ilyen → null. */
export async function resumeOpDevice(eventUid?: string | null): Promise<OpDeviceJoinResult | null> {
  try {
    const response = await api.post('/auth/device-join', deviceJoinBody(null, eventUid), {
      skipErrorNotify: true,
      skipAuth: true,
    });
    const rv = readApiReturnValue(response.data);
    if (Number.isFinite(rv) && rv < 0) return null;
    return parseDeviceJoin(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.status < 500) return null;
    throw error;
  }
}
