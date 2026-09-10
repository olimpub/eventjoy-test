import { api } from 'src/boot/axios';
import {
  nullableNumericId,
  pickDataset,
  readAxiosHttpStatus,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';
import { changeEvent } from 'src/utils/eventChange';
import type { EventGroupingKey } from 'src/modules/profitability/ptaData';
import type { ResultsScope } from 'src/modules/profitability/standings';

const TOKEN_KEY = (eventId: string | number) => `ptaDisplayToken:${eventId}`;
const PIN_CACHE_KEY = (eventId: string | number) => `ptaDisplayPin:${eventId}`;
const COMMAND_KEY = (eventId: string | number) => `ptaDisplayCommand:${eventId}`;

export type PtaDisplayWallState = 'idle' | 'leaderboard' | 'seating' | 'ceremony' | 'roundstand';

const WALL_STATES: readonly PtaDisplayWallState[] = [
  'idle',
  'leaderboard',
  'seating',
  'ceremony',
  'roundstand',
];

export function isPtaDisplayWallState(value: string): value is PtaDisplayWallState {
  return (WALL_STATES as readonly string[]).includes(value);
}

export function isPtaLiveRoundDisplay(state: PtaDisplayWallState): boolean {
  return state === 'seating' || state === 'roundstand';
}

export interface PtaDisplayTokenResult {
  eventId: number;
  pin: string;
  token: string;
  expiresAtUtc: string;
  url: string;
}

export interface PtaDisplaySessionResult {
  eventId: number;
  token: string;
  expiresAtUtc: string;
}

export interface PtaDisplayRemoteState {
  state: PtaDisplayWallState;
  scope: ResultsScope;
  roundId: number | null;
  groupKey: EventGroupingKey | null;
  place: number | null;
  paused: boolean;
}

export interface PtaDisplayPinCache {
  pin: string;
  path: string;
  expiresAtUtc: string;
}

function parseScope(raw: unknown): ResultsScope | null {
  return raw === 'round' || raw === 'total' ? raw : null;
}

function parseGroupKey(raw: unknown): EventGroupingKey | null {
  const value = raw == null ? '' : String(raw);
  if (!value || value === 'player') return null;
  if (value === 'team' || value === 'organization' || value === 'region' || value === 'company') {
    return value;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** GET /pta/display néha Result1 alá teszi a named dataseteket. */
export function flattenDisplayPayload(raw: unknown): Record<string, unknown> {
  const data = unwrapApiPayload(raw);
  const nested = asRecord(data.Result1) || asRecord(data.result1);
  return nested ? { ...data, ...nested } : data;
}

/** CreateDisplayToken — közös OP/PTA függvény, Module különbözteti. */
export function ptaDisplayTokenRequestBody(eventId: number): Record<string, unknown> {
  return { EventID: eventId, Module: 'pta' };
}

export function ptaDisplaySessionRequestBody(eventId: number, pin: string): Record<string, unknown> {
  return { EventID: eventId, Module: 'pta', Pin: pin };
}

function firstResultRow(raw: unknown): Record<string, unknown> {
  const data = unwrapApiPayload(raw);
  const row = asRecord(pickDataset(data, 'Result1', 'result1', 'Result2', 'result2')[0]);
  return row ? { ...data, ...row } : data;
}

function readPin(raw: Record<string, unknown>): string {
  const value = raw.Pin ?? raw.PIN ?? raw.pin ?? raw.DisplayPin ?? raw.displayPin;
  const pin = String(value ?? '').replace(/\D/g, '');
  if (pin.length === 4) return pin;
  if (pin.length > 0 && pin.length < 4) return pin.padStart(4, '0');
  return pin;
}

export function displayWallAbsoluteUrl(eventId: string | number, pin: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/profitability/event/${eventId}/display?pin=${encodeURIComponent(pin)}`;
}

export function readStoredDisplayToken(eventId: string | number): string {
  if (typeof sessionStorage === 'undefined') return '';
  return sessionStorage.getItem(TOKEN_KEY(eventId)) || '';
}

export function storeDisplayToken(eventId: string | number, token: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY(eventId), token);
}

export function clearDisplayToken(eventId: string | number) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY(eventId));
}

export function hasDisplaySession(eventId: string | number): boolean {
  return !!readStoredDisplayToken(eventId);
}

const COMMAND_CHANNEL =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ptaDisplayCommand') : null;

function asDisplayCommand(parsed: PtaDisplayRemoteState | null | undefined): PtaDisplayRemoteState | null {
  if (!parsed || !isPtaDisplayWallState(String(parsed.state || ''))) return null;
  return {
    state: parsed.state,
    scope: parsed.scope || 'total',
    roundId: parsed.roundId ?? null,
    groupKey: parsed.groupKey ?? null,
    place: parsed.place ?? null,
    paused: !!parsed.paused,
  };
}

export function storeDisplayCommand(eventId: string | number, command: PtaDisplayRemoteState) {
  const raw = JSON.stringify(command);
  try {
    sessionStorage.setItem(COMMAND_KEY(eventId), raw);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(COMMAND_KEY(eventId), raw);
  } catch {
    /* ignore */
  }
  try {
    COMMAND_CHANNEL?.postMessage({ eventId: Number(eventId), command });
  } catch {
    /* ignore */
  }
}

export function readStoredDisplayCommand(eventId: string | number): PtaDisplayRemoteState | null {
  let raw = '';
  try {
    raw = localStorage.getItem(COMMAND_KEY(eventId)) || '';
  } catch {
    raw = '';
  }
  if (!raw) {
    try {
      raw = sessionStorage.getItem(COMMAND_KEY(eventId)) || '';
    } catch {
      raw = '';
    }
  }
  if (!raw) return null;
  try {
    return asDisplayCommand(JSON.parse(raw) as PtaDisplayRemoteState);
  } catch {
    return null;
  }
}

export function onStoredDisplayCommand(
  listener: (eventId: number, command: PtaDisplayRemoteState) => void
): () => void {
  const onStorage = (event: StorageEvent) => {
    const key = String(event.key || '');
    if (!key.startsWith('ptaDisplayCommand:') || !event.newValue) return;
    const id = nullableNumericId(key.slice('ptaDisplayCommand:'.length));
    if (id == null) return;
    try {
      const command = asDisplayCommand(JSON.parse(event.newValue) as PtaDisplayRemoteState);
      if (command) listener(id, command);
    } catch {
      /* ignore */
    }
  };
  const onMessage = (event: MessageEvent) => {
    const id = nullableNumericId(event.data?.eventId);
    const command = asDisplayCommand(event.data?.command as PtaDisplayRemoteState);
    if (id == null || !command) return;
    listener(id, command);
  };
  window.addEventListener('storage', onStorage);
  COMMAND_CHANNEL?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('storage', onStorage);
    COMMAND_CHANNEL?.removeEventListener('message', onMessage);
  };
}

export function readCachedDisplayPin(eventId: string | number): PtaDisplayPinCache | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(PIN_CACHE_KEY(eventId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PtaDisplayPinCache;
    if (!parsed?.pin) return null;
    if (parsed.expiresAtUtc && Date.parse(parsed.expiresAtUtc) <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeCachedDisplayPin(eventId: string | number, cache: PtaDisplayPinCache) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PIN_CACHE_KEY(eventId), JSON.stringify(cache));
}

export function displayAuthHeaders(eventId: string | number): Record<string, string> {
  const token = readStoredDisplayToken(eventId);
  return token ? { 'X-Pta-Display-Token': token } : {};
}

function readTokenPayload(raw: unknown, fallbackEventId: number): PtaDisplayTokenResult {
  const data = firstResultRow(raw);
  const eventId = nullableNumericId(data.EventID ?? data.eventID ?? data.EventId) ?? fallbackEventId;
  const pin = readPin(data);
  const token = String(data.Token ?? data.token ?? data.DisplayToken ?? '').trim();
  const expiresAtUtc = String(
    data.ExpiresAtUtc ?? data.expiresAtUtc ?? data.ExpiresAt ?? data.expiresAt ?? ''
  );
  const url = String(data.Url ?? data.url ?? `/profitability/event/${eventId}/display`);
  if (!pin || pin.length !== 4) {
    throw new Error('A PIN nem érkezett meg.');
  }
  return { eventId, pin, token, expiresAtUtc, url };
}

export async function requestPtaDisplayToken(eventId: number): Promise<PtaDisplayTokenResult> {
  const body = ptaDisplayTokenRequestBody(eventId);
  const response = await api.post('/pta/display-token', body);
  console.info('[pta display-token]', { url: '/pta/display-token', body, status: response.status, data: response.data });
  throwIfApiFailed(response.data, 'A kivetítés nem indult el.');
  const result = readTokenPayload(response.data, eventId);
  storeCachedDisplayPin(eventId, {
    pin: result.pin,
    path: result.url,
    expiresAtUtc: result.expiresAtUtc,
  });
  return result;
}

export async function openPtaDisplaySession(args: {
  eventId: number;
  pin: string;
}): Promise<PtaDisplaySessionResult> {
  const body = ptaDisplaySessionRequestBody(args.eventId, args.pin);
  const response = await api.post('/pta/display-session', body);
  console.info('[pta display-session]', { url: '/pta/display-session', body, status: response.status, data: response.data });
  throwIfApiFailed(response.data, 'Érvénytelen vagy lejárt PIN.');
  const data = firstResultRow(response.data);
  const eventId = nullableNumericId(data.EventID ?? data.eventID ?? data.EventId) ?? args.eventId;
  const token = String(data.Token ?? data.token ?? data.DisplayToken ?? '').trim();
  if (!token) throw new Error('Érvénytelen vagy lejárt PIN.');
  storeDisplayToken(eventId, token);
  return {
    eventId,
    token,
    expiresAtUtc: String(data.ExpiresAtUtc ?? data.expiresAtUtc ?? ''),
  };
}

function parsePlace(raw: unknown): number | null {
  const n = nullableNumericId(raw);
  if (n == null || n < 1 || n > 8) return null;
  return n;
}

function parsePaused(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  const value = String(raw ?? '').toLowerCase();
  return value === 'true' || value === '1' || value === 'paused';
}

function parseWallState(source: Record<string, unknown>): PtaDisplayWallState | null {
  const view = String(source.View ?? source.view ?? source.Mode ?? source.mode ?? '').toLowerCase();
  const state = String(source.State ?? source.state ?? '').toLowerCase();
  if (state === 'ceremony' || view === 'ceremony' || state === 'podium' || view === 'podium') {
    return 'ceremony';
  }
  if (state === 'roundstand' || view === 'roundstand' || state === 'progress' || view === 'progress') {
    return 'roundstand';
  }
  if (state === 'seating' || view === 'seating') return 'seating';
  if (state === 'idle' || view === 'idle') return 'idle';
  if (state === 'leaderboard' || state === 'groups' || view === 'leaderboard' || view === 'groups') {
    return 'leaderboard';
  }
  return null;
}

export function parsePtaDisplayState(raw: unknown): PtaDisplayRemoteState | null {
  const data = flattenDisplayPayload(raw);
  const nested =
    asRecord(data.PtaDisplayState) ||
    asRecord(pickDataset(data, 'PtaDisplayState', 'ptaDisplayState', 'DisplayState')[0]);
  const source = nested || (parseWallState(data) ? data : null);
  if (!source) return null;
  const state = parseWallState(source) || parseWallState(data);
  if (!state) return null;
  const scope = parseScope(source.Scope ?? source.scope ?? data.Scope ?? data.scope) || 'total';
  const roundId = nullableNumericId(
    source.RoundId ?? source.roundId ?? source.EventRoundID ?? data.RoundId ?? data.roundId
  );
  const groupKey =
    state === 'seating' || state === 'roundstand' || state === 'idle'
      ? null
      : parseGroupKey(source.GroupKey ?? source.groupKey ?? data.GroupKey ?? data.groupKey);
  const place =
    state === 'ceremony'
      ? parsePlace(source.Place ?? source.place ?? data.Place ?? data.place)
      : null;
  const paused =
    state === 'ceremony'
      ? parsePaused(source.Paused ?? source.paused ?? data.Paused ?? data.paused)
      : false;
  return {
    state,
    scope,
    roundId,
    groupKey,
    place,
    paused,
  };
}

export async function fetchPtaDisplay(
  eventId: number | string,
  options?: { useDisplayToken?: boolean }
): Promise<Record<string, unknown>> {
  const headers = options?.useDisplayToken === false ? {} : displayAuthHeaders(eventId);
  const response = await api.get(`/pta/display/${eventId}`, { headers });
  throwIfApiFailed(response.data, 'A kivetítés adatai nem tölthetők.');
  return flattenDisplayPayload(response.data);
}

export async function showPtaDisplay(args: {
  eventId: number;
  state: PtaDisplayWallState;
  scope: ResultsScope;
  roundId: number | null;
  groupKey: EventGroupingKey | null;
  place?: number | null;
  paused?: boolean;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    State: args.state,
    View: args.state,
    Scope: args.scope,
    RoundId: args.roundId,
    EventRoundID: args.roundId,
    GroupKey: isPtaLiveRoundDisplay(args.state) || args.state === 'idle' ? null : args.groupKey,
    Place: args.state === 'ceremony' ? args.place ?? null : null,
    Paused: args.state === 'ceremony' ? !!args.paused : false,
  };
  storeDisplayCommand(args.eventId, {
    state: args.state,
    scope: args.scope,
    roundId: args.roundId,
    groupKey: isPtaLiveRoundDisplay(args.state) || args.state === 'idle' ? null : args.groupKey,
    place: args.state === 'ceremony' ? args.place ?? null : null,
    paused: args.state === 'ceremony' ? !!args.paused : false,
  });
  emitPtaShowDisplayPing(
    {
      EventID: args.eventId,
      ...payload,
    },
    args.eventId
  );
  try {
    await changeEvent({
      EventID: args.eventId,
      Action: 'Pta.ShowDisplay',
      Payload: payload,
    });
  } catch (error) {
    if (args.state !== 'seating' && args.state !== 'ceremony' && args.state !== 'roundstand') throw error;
    const status = readAxiosHttpStatus(error);
    if (status != null && status !== 400) throw error;
    const fallbackState = args.state === 'roundstand' ? 'seating' : 'leaderboard';
    await changeEvent({
      EventID: args.eventId,
      Action: 'Pta.ShowDisplay',
      Payload: { ...payload, State: fallbackState, View: args.state },
    });
  }
}

const showDisplayListeners = new Set<(payload: PtaDisplayRemoteState & { eventId: number }) => void>();

export function onPtaShowDisplayPing(
  listener: (payload: PtaDisplayRemoteState & { eventId: number }) => void
): () => void {
  showDisplayListeners.add(listener);
  return () => {
    showDisplayListeners.delete(listener);
  };
}

export function emitPtaShowDisplayPing(raw: Record<string, unknown>, eventId: number | null) {
  const parsed = parsePtaDisplayState(raw) || parsePtaDisplayState({ PtaDisplayState: raw });
  const id = nullableNumericId(raw.EventID ?? raw.eventID) ?? eventId;
  if (!parsed || id == null) return;
  const payload = { eventId: id, ...parsed };
  showDisplayListeners.forEach((listener) => listener(payload));
}

const deskDirtyListeners = new Set<(eventId: number) => void>();

export function onPtaDeskDisplayDirty(listener: (eventId: number) => void): () => void {
  deskDirtyListeners.add(listener);
  return () => {
    deskDirtyListeners.delete(listener);
  };
}

export function emitPtaDeskDisplayDirty(eventId: number | null) {
  if (eventId == null) return;
  deskDirtyListeners.forEach((listener) => listener(eventId));
}

/** PatchDesk/SetDeskResults a display csoportra nem megy — a Fal csak ShowDisplay pingre GET-el. */
export async function pingPtaLiveRoundDisplay(
  eventId: number,
  roundId: number | null
): Promise<void> {
  if (roundId == null) return;
  try {
    const data = await fetchPtaDisplay(eventId, { useDisplayToken: false });
    const remote = parsePtaDisplayState(data);
    if (!remote || !isPtaLiveRoundDisplay(remote.state)) return;
    if (remote.roundId != null && remote.roundId !== roundId) return;
    await showPtaDisplay({
      eventId,
      state: remote.state,
      scope: 'round',
      roundId: remote.roundId ?? roundId,
      groupKey: null,
    });
  } catch {
    /* a Fal a következő ShowDisplayig / GET-ig elmaradhat */
  }
}
