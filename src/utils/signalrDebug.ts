import { ref, readonly } from 'vue';

export function isSignalRDebug(): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ej_debug_signalr') === '1') {
      return true;
    }
    if (typeof location !== 'undefined') {
      return new URLSearchParams(location.search).get('debugSignalr') === '1';
    }
  } catch {
    /* ignore */
  }
  return false;
}

export interface SignalRInboundTrace {
  at: string;
  method: string;
  action: string;
  eventId: number | null;
  toStatusId: number | null;
  applied: boolean;
  note: string;
}

const lastInboundRef = ref<SignalRInboundTrace | null>(null);
export const eventLiveLastInbound = readonly(lastInboundRef);

export function logSignalR(kind: string, detail?: unknown) {
  if (detail === undefined) {
    console.info(`[EJ SignalR] ${kind}`);
    return;
  }
  console.info(`[EJ SignalR] ${kind}`, detail);
}

export function recordSignalRInbound(trace: Omit<SignalRInboundTrace, 'at'> & { at?: string }) {
  const row: SignalRInboundTrace = {
    ...trace,
    at: trace.at || new Date().toLocaleTimeString('hu-HU'),
  };
  lastInboundRef.value = row;
  logSignalR('inbound', row);
}
