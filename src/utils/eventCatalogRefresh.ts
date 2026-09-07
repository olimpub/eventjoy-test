import { isEventLiveRoute } from 'src/services/signalrService';

const CATALOG_REFRESH_ROUTES = new Set(['home', 'my_events', 'event_details']);

const MIN_INTERVAL_MS = 8000;

let lastAt = 0;
let inFlight: Promise<void> | null = null;

export function isEventCatalogRefreshRoute(name: unknown): boolean {
  return CATALOG_REFRESH_ROUTES.has(String(name || ''));
}

/** Boot /event/data után, hogy a főoldal ne kérje le rögtön újra. */
export function markEventCatalogFresh(): void {
  lastAt = Date.now();
}

export async function refreshEventCatalog(options?: { force?: boolean }): Promise<void> {
  const { useAuthStore } = await import('src/stores/auth');
  if (!useAuthStore().isAuthenticated) return;

  const now = Date.now();
  if (!options?.force && lastAt > 0 && now - lastAt < MIN_INTERVAL_MS) return;
  if (inFlight) return inFlight;

  lastAt = now;
  inFlight = (async () => {
    try {
      const { useEventStore } = await import('src/stores/event');
      await useEventStore().refreshEventData();
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function installEventCatalogRefresh(getRouteName: () => unknown): () => void {
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    if (isEventLiveRoute(getRouteName())) return;
    void refreshEventCatalog();
  };

  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('resume', onVisible);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('resume', onVisible);
  };
}
