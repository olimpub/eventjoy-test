import { onMounted, onUnmounted, type Ref } from 'vue';
import * as signalR from '@microsoft/signalr';
import {
  eventLiveHubState,
  eventLiveJoinedId,
  onEventLiveJoined,
} from 'src/services/signalrService';
import { useOlimpubStore } from 'src/stores/olimpub';

const CHECK_MS = 10_000;
/** Ennyi csend után egy GET, hátha a socket élőnek látszik, de már nem visz semmit. */
const QUIET_MS = 30_000;
/** Szakadt hub mellett se kérdezzünk sűrűbben. */
const STALE_MIN_GAP_MS = 10_000;
/** 401 / 403 után: ritkán, hátha közben jóváhagyták vagy újra belépett. */
const BLOCKED_GAP_MS = 60_000;

/**
 * Hub az elsődleges forrás. A GET csak: minden csoport-join után (első, reconnect, ébredés),
 * és tartaléknak, ha a hub nincs bent az eseményben, vagy QUIET_MS óta nem jött semmi.
 */
export function useOpLiveResync(
  eventId: Readonly<Ref<number | null>>,
  reload: () => unknown,
  opts?: { blocked?: () => boolean }
) {
  const store = useOlimpubStore();
  let timer: number | null = null;
  let stopJoined: () => void = () => {};
  let lastReloadAt = 0;

  function run() {
    lastReloadAt = Date.now();
    try {
      void Promise.resolve(reload()).catch(() => undefined);
    } catch {
      /* a következő join / ellenőrzés újra próbálja */
    }
  }

  function check() {
    const id = eventId.value;
    if (!id) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const now = Date.now();
    if (opts?.blocked?.()) {
      if (now - lastReloadAt >= BLOCKED_GAP_MS) run();
      return;
    }
    const lastSync = Math.max(store.getGame(id).loadedAt || 0, store.pingAt || 0, lastReloadAt);
    const stale =
      eventLiveHubState.value !== signalR.HubConnectionState.Connected || eventLiveJoinedId.value !== id;
    if (stale && now - lastReloadAt >= STALE_MIN_GAP_MS) {
      run();
      return;
    }
    if (now - lastSync >= QUIET_MS) run();
  }

  onMounted(() => {
    stopJoined = onEventLiveJoined((join) => {
      if (eventId.value && join.eventId === eventId.value) run();
    });
    timer = window.setInterval(check, CHECK_MS);
  });

  onUnmounted(() => {
    stopJoined();
    if (timer != null) window.clearInterval(timer);
  });
}
