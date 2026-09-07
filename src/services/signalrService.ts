import * as signalR from '@microsoft/signalr';
import { ref, readonly } from 'vue';
import { api } from 'src/boot/axios';
import { nullableNumericId } from 'src/utils/apiPayload';
import { applyLiveChange, SIGNALR_LIVE_ACTIONS } from 'src/utils/eventChange';
import type { SignalRLiveRole } from 'src/utils/eventRoleNav';
import { isSignalRDebug, logSignalR, recordSignalRInbound } from 'src/utils/signalrDebug';

const LIVE_EVENT_ROUTE_NAMES = new Set([
  'event_manage',
  'event_contribute',
  'event_participants',
  'event_ticket_scan',
  'profitability-organizer',
  'profitability-gamemaster',
  'profitability-participants',
  'profitability-game',
  'profitability-results',
  'profitability-event-detail',
]);

export function isEventLiveRoute(name: unknown): boolean {
  return LIVE_EVENT_ROUTE_NAMES.has(String(name || ''));
}

export interface EventLiveJoin {
  eventId: number;
  eventUserId: number | null;
  roleName: SignalRLiveRole;
}

export function eventLiveGroupNames(join: EventLiveJoin): string[] {
  const names = [`event_${join.eventId}_${join.roleName}`, `event_${join.eventId}_gamer`];
  if (join.eventUserId != null) {
    names.push(`event_${join.eventId}_user_${join.eventUserId}`);
  }
  return names;
}

function joinKey(join: EventLiveJoin): string {
  return `${join.eventId}:${join.roleName}:${join.eventUserId ?? ''}`;
}

function isJoinRejected(data: unknown): boolean {
  if (data == null) return false;
  if (typeof data === 'string') return /invalid/i.test(data);
  if (typeof data !== 'object') return false;
  const rec = data as Record<string, unknown>;
  const msg = String(
    rec.Message ?? rec.message ?? rec.Error ?? rec.error ?? rec.ReturnDescription ?? ''
  );
  if (/invalid/i.test(msg)) return true;
  if (rec.ok === false || rec.Success === false || rec.success === false) return true;
  return false;
}

function apiRootUrl(): string {
  return String(api.defaults.baseURL || '').replace(/\/+$/, '');
}

function accessToken(): string {
  return localStorage.getItem('token') || '';
}

const joinedEventIdRef = ref<number | null>(null);
const connectionIdRef = ref<string | null>(null);
const joinedGroupsRef = ref<string[]>([]);
const hubStateRef = ref<string>(signalR.HubConnectionState.Disconnected);

export const eventLiveJoinedId = readonly(joinedEventIdRef);
export const eventLiveConnectionId = readonly(connectionIdRef);
export const eventLiveJoinedGroups = readonly(joinedGroupsRef);
/** HubConnection.state — nem ugyanaz, mint „a szerver csoportban tart”. */
export const eventLiveHubState = readonly(hubStateRef);

function coalesceHubPayload(action: string, args: unknown[]): unknown {
  if (args.length === 0) return { Action: action };
  if (args.length === 1) return args[0];
  const merged: Record<string, unknown> = { Action: action };
  for (const arg of args) {
    if (typeof arg === 'string') {
      try {
        const parsed = JSON.parse(arg);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(merged, parsed as Record<string, unknown>);
          continue;
        }
      } catch {
        /* not json */
      }
    }
    if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      Object.assign(merged, arg as Record<string, unknown>);
      continue;
    }
    if (typeof arg === 'number' && Number.isFinite(arg) && merged.EventID == null) {
      merged.EventID = arg;
    }
  }
  return merged;
}

const EXTRA_HUB_METHODS = [
  'Receive',
  'ReceiveChange',
  'EventChange',
  'Notify',
  'Send',
  'Broadcast',
  'Change',
  'LiveChange',
  'ReceiveNotification',
  'ReceiveEventChange',
];

const KNOWN_HUB_METHODS = new Set([...SIGNALR_LIVE_ACTIONS, ...EXTRA_HUB_METHODS]);

/** Ping; a szerver-timeoutnak ennek a kétszeresének kell lennie. */
const KEEP_ALIVE_MS = 15_000;
const SERVER_TIMEOUT_MS = 60_000;
const STALE_CHECK_MS = 20_000;
const REJOIN_WHILE_CONNECTED_MS = 60_000;
const CONNECT_WAIT_MS = 15_000;

/** Soha nem adja fel: 0, 2, 5, 10, 15, aztán 30 mp-enként. */
const infiniteReconnect: signalR.IRetryPolicy = {
  nextRetryDelayInMilliseconds(retryContext) {
    const steps = [0, 2000, 5000, 10000, 15000, 30000];
    return steps[Math.min(retryContext.previousRetryCount, steps.length - 1)];
  },
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createDebugHubProtocol(onInvocation: (target: string, args: unknown[]) => void): signalR.IHubProtocol {
  const inner = new signalR.JsonHubProtocol();
  return {
    name: inner.name,
    version: inner.version,
    transferFormat: inner.transferFormat,
    parseMessages(input, logger) {
      const messages = inner.parseMessages(input, logger);
      for (const msg of messages) {
        if (msg.type === signalR.MessageType.Invocation) {
          onInvocation(msg.target, msg.arguments || []);
        }
      }
      return messages;
    },
    writeMessage(message) {
      return inner.writeMessage(message);
    },
  };
}

class EventLiveService {
  private connection: signalR.HubConnection | null = null;
  private joinedEventId: number | null = null;
  /** Amíg az élő oldalon vagyunk, ezt tartjuk — onclose sem törli. */
  private desiredJoin: EventLiveJoin | null = null;
  private listenersBound = false;
  private connectInFlight: Promise<void> | null = null;
  private stopRequested = false;
  private lastJoinAt = 0;

  get eventId(): number | null {
    return this.joinedEventId;
  }

  private setJoined(join: EventLiveJoin | null) {
    this.joinedEventId = join?.eventId ?? null;
    joinedEventIdRef.value = join?.eventId ?? null;
    joinedGroupsRef.value = join ? eventLiveGroupNames(join) : [];
    connectionIdRef.value = join != null ? this.connection?.connectionId || null : null;
    if (join) this.lastJoinAt = Date.now();
    this.refreshHubState();
  }

  private refreshHubState() {
    hubStateRef.value = this.connection?.state || signalR.HubConnectionState.Disconnected;
  }

  public async connectToEvent(join: EventLiveJoin, options?: { forceJoin?: boolean }): Promise<void> {
    const id = nullableNumericId(join.eventId);
    if (id == null) return;
    const next: EventLiveJoin = { ...join, eventId: id };
    this.stopRequested = false;
    this.desiredJoin = next;

    if (this.connectInFlight) await this.connectInFlight;

    this.connectInFlight = this.connectToEventInner(next, options?.forceJoin === true);
    try {
      await this.connectInFlight;
    } finally {
      this.connectInFlight = null;
    }
  }

  private async connectToEventInner(join: EventLiveJoin, forceJoin: boolean): Promise<void> {
    await this.ensureConnection();
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR kapcsolat nem jött létre.');
    }
    const alreadyJoined =
      this.joinedEventId === join.eventId &&
      this.desiredJoin != null &&
      joinKey(this.desiredJoin) === joinKey(join);
    if (!forceJoin && alreadyJoined) return;
    await this.joinGroups(join);
  }

  public async startConnection() {
    await this.ensureConnection();
  }

  public stopConnection() {
    this.stopRequested = true;
    this.desiredJoin = null;
    this.setJoined(null);
    const connection = this.connection;
    this.connection = null;
    this.listenersBound = false;
    if (!connection || connection.state === signalR.HubConnectionState.Disconnected) return;
    connection.stop().catch(() => undefined);
  }

  /** Előtér / online: reconnect + csoport-join, akkor is ha a socket „élőnek” látszik. */
  public async resumeFromForeground(): Promise<void> {
    if (this.stopRequested || !this.desiredJoin) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      await this.connectToEvent(this.desiredJoin, { forceJoin: true });
    } catch (err) {
      console.error('SignalR előtér-csatlakozás sikertelen:', err);
    }
  }

  /** Watchdog: szakadt socket, hiányzó join, vagy 60 mp-es csendes rejoin. */
  public async resumeIfNeeded(): Promise<void> {
    if (this.stopRequested || !this.desiredJoin) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const state = this.connection?.state;
    const staleJoin =
      this.joinedEventId == null || this.joinedEventId !== this.desiredJoin.eventId;
    const staleSocket = !state || state === signalR.HubConnectionState.Disconnected;
    const dueRejoin =
      state === signalR.HubConnectionState.Connected &&
      !staleJoin &&
      this.lastJoinAt > 0 &&
      Date.now() - this.lastJoinAt >= REJOIN_WHILE_CONNECTED_MS;
    if (!staleSocket && !staleJoin && !dueRejoin) {
      this.refreshHubState();
      return;
    }
    try {
      await this.connectToEvent(this.desiredJoin, {
        forceJoin: staleJoin || dueRejoin || staleSocket,
      });
    } catch (err) {
      console.error('SignalR watchdog csatlakozás sikertelen:', err);
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(apiRootUrl(), {
          accessTokenFactory: () => accessToken(),
        })
        .withHubProtocol(
          createDebugHubProtocol((target, args) => {
            logSignalR('wire', { target, args });
            if (KNOWN_HUB_METHODS.has(target)) return;
            recordSignalRInbound({
              method: target,
              action: target,
              eventId: this.joinedEventId,
              toStatusId: null,
              applied: false,
              note: 'unknown hub method — applying by payload Action',
            });
            applyLiveChange(target, coalesceHubPayload(target, args), this.joinedEventId, {
              eventId: this.desiredJoin?.eventId ?? this.joinedEventId,
              eventUserId: this.desiredJoin?.eventUserId ?? null,
              roleName: this.desiredJoin?.roleName ?? null,
            });
          })
        )
        .withKeepAliveInterval(KEEP_ALIVE_MS)
        .withServerTimeout(SERVER_TIMEOUT_MS)
        .withAutomaticReconnect(infiniteReconnect)
        .configureLogging(isSignalRDebug() ? signalR.LogLevel.Trace : signalR.LogLevel.Warning)
        .build();
      this.bindListeners(this.connection);
    }

    await this.waitUntilNotBusy();

    if (this.connection.state === signalR.HubConnectionState.Connected) return;

    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      await this.connection.start();
      logSignalR('connected', {
        connectionId: this.connection.connectionId,
        url: apiRootUrl(),
      });
      this.refreshHubState();
    }

    await this.waitUntilNotBusy();
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR kapcsolat nem jött létre.');
    }
  }

  private async waitUntilNotBusy(): Promise<void> {
    if (!this.connection) return;
    const deadline = Date.now() + CONNECT_WAIT_MS;
    while (
      this.connection.state === signalR.HubConnectionState.Connecting ||
      this.connection.state === signalR.HubConnectionState.Reconnecting
    ) {
      if (Date.now() > deadline) break;
      await delay(200);
    }
  }

  private bindListeners(connection: signalR.HubConnection) {
    if (this.listenersBound) return;
    this.listenersBound = true;

    const methods = [...SIGNALR_LIVE_ACTIONS, ...EXTRA_HUB_METHODS];
    for (const action of methods) {
      connection.on(action, (...args: unknown[]) => {
        logSignalR(`hub ${action}`, args);
        applyLiveChange(action, coalesceHubPayload(action, args), this.joinedEventId, {
          eventId: this.desiredJoin?.eventId ?? this.joinedEventId,
          eventUserId: this.desiredJoin?.eventUserId ?? null,
          roleName: this.desiredJoin?.roleName ?? null,
        });
      });
    }

    connection.onreconnected(() => {
      if (this.connection !== connection) return;
      this.refreshHubState();
      logSignalR('reconnected', { connectionId: connection.connectionId });
      const join = this.desiredJoin;
      if (!join || this.stopRequested) return;
      this.setJoined(null);
      void this.joinGroups(join).catch((err) => {
        console.error('SignalR csoport újracsatlakozás sikertelen:', err);
      });
    });
    connection.onclose((err) => {
      if (this.connection !== connection) return;
      this.refreshHubState();
      logSignalR('closed', err?.message || 'ok');
      this.setJoined(null);
      if (this.stopRequested || !this.desiredJoin) return;
      window.setTimeout(() => {
        void this.resumeIfNeeded();
      }, 1000);
    });
  }

  private async joinGroups(join: EventLiveJoin): Promise<void> {
    const connectionId = this.connection?.connectionId;
    if (!connectionId) throw new Error('Nincs SignalR connectionId.');
    const groupNames = eventLiveGroupNames(join);
    if (join.eventUserId == null || groupNames.length < 3) {
      throw new Error('SignalR join: hiányzik a szerepkör, a gamer vagy a privát csoport (eventUserId).');
    }
    const body = { connectionId, groupNames };
    logSignalR('join POST', body);
    const response = await api.post('/signalr/join', body, {
      headers: { 'Content-Type': 'application/json' },
    });
    logSignalR('join response', {
      status: response.status,
      data: response.data ?? null,
    });
    if (isJoinRejected(response.data)) {
      throw new Error('SignalR joinGroup elutasítva (invalid payload).');
    }
    this.setJoined(join);
  }
}

export const signalRService = new EventLiveService();

export async function connectToEventLive(join: EventLiveJoin): Promise<void> {
  await signalRService.connectToEvent(join);
}

export function disconnectEventLive(): void {
  signalRService.stopConnection();
}

function installEventLiveResume() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const onForeground = () => {
    if (document.visibilityState === 'hidden') return;
    void signalRService.resumeFromForeground();
  };
  document.addEventListener('visibilitychange', onForeground);
  document.addEventListener('resume', onForeground);
  window.addEventListener('pageshow', onForeground);
  window.addEventListener('focus', onForeground);
  window.addEventListener('online', onForeground);
  window.setInterval(() => {
    void signalRService.resumeIfNeeded();
  }, STALE_CHECK_MS);
}

installEventLiveResume();
