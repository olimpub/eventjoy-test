import { computed, readonly, ref } from 'vue';

const offlineRef = ref(typeof navigator !== 'undefined' && navigator.onLine === false);
const reconnectingRef = ref(false);

export const networkOffline = readonly(offlineRef);
export const networkReconnecting = readonly(reconnectingRef);
export const networkBannerVisible = computed(() => offlineRef.value || reconnectingRef.value);

export function isAxiosNetworkError(error: unknown): boolean {
  const err = error as {
    message?: string;
    code?: string;
    response?: unknown;
    name?: string;
  } | null;
  if (!err || err.response != null) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ERR_CANCELED' ||
    /network error/i.test(msg) ||
    /failed to fetch/i.test(msg) ||
    /load failed/i.test(msg) ||
    /networkerror/i.test(msg)
  );
}

export function markNetworkFailure() {
  offlineRef.value = true;
  reconnectingRef.value = false;
}

export function markNetworkOk() {
  offlineRef.value = false;
}

export function setNetworkReconnecting(on: boolean) {
  reconnectingRef.value = on;
  if (on) offlineRef.value = false;
}

function bindWindowNetwork() {
  if (typeof window === 'undefined') return;
  window.addEventListener('offline', () => {
    markNetworkFailure();
  });
  window.addEventListener('online', () => {
    setNetworkReconnecting(true);
    markNetworkOk();
  });
}

bindWindowNetwork();
