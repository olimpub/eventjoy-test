import { api } from 'src/boot/axios';
import { nullableNumericId, throwIfApiFailed, unwrapApiPayload } from 'src/utils/apiPayload';

const DEVICE_ID_KEY = 'device_uuid';

export interface PlayerDevicePass {
  passToken: string;
  expiresAtUtc: string;
}

export interface PlayerDeviceJoinResult {
  token: string;
  eventId: number;
  eventUserId: number;
  checkedIn: boolean;
}

export function getOrCreateDeviceId(): string {
  const existing = String(localStorage.getItem(DEVICE_ID_KEY) || '').trim();
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function playerPassAbsoluteUrl(passToken: string): string {
  const path = `/join/pass/${encodeURIComponent(passToken)}`;
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).href;
}

function text(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = String(row[key] ?? '').trim();
    if (value) return value;
  }
  return '';
}

/** Szervező vagy játékmester: egy játékos belépője. Ugyanaz a kód jön vissza, amíg él. */
export async function requestPlayerDevicePass(args: {
  eventId: number;
  eventUserId: number;
  rotate?: boolean;
}): Promise<PlayerDevicePass> {
  const response = await api.post(
    '/auth/player-pass',
    {
      EventID: args.eventId,
      EventUserID: args.eventUserId,
      Rotate: args.rotate === true,
    },
    { skipErrorNotify: true }
  );
  throwIfApiFailed(response.data, 'A belépő kód nem készült el.');
  const data = unwrapApiPayload(response.data);
  const passToken = text(data, 'PassToken', 'passToken', 'Token', 'token');
  if (!passToken) throw new Error('A szerver nem adott belépő kódot.');
  return {
    passToken,
    expiresAtUtc: text(data, 'ExpiresAtUtc', 'expiresAtUtc'),
  };
}

/** A játékos telefonja: a kód + az eszköz sessiont kap, e-mail és OTP nélkül. */
export async function joinWithPlayerDevicePass(passToken: string): Promise<PlayerDeviceJoinResult> {
  const response = await api.post(
    '/auth/player-device-join',
    {
      PassToken: passToken,
      DeviceId: getOrCreateDeviceId(),
      DeviceName: 'EventJoy WebApp',
    },
    { skipAuth: true, skipErrorNotify: true }
  );
  throwIfApiFailed(response.data, 'A belépő kód nem érvényes.');
  const data = unwrapApiPayload(response.data);
  const token = text(data, 'Token', 'token', 'AccessToken', 'accessToken');
  const eventId = nullableNumericId(data.EventID ?? data.eventID);
  const eventUserId = nullableNumericId(data.EventUserID ?? data.eventUserID);
  if (!token || eventId == null || eventUserId == null) {
    throw new Error('A belépésből hiányzik a session.');
  }
  const checked = data.CheckedIn ?? data.checkedIn;
  return {
    token,
    eventId,
    eventUserId,
    checkedIn: checked === true || checked === 1 || String(checked).toLowerCase() === 'true',
  };
}
