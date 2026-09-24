import { boot } from 'quasar/wrappers';
import { createErrorLogPayload, useErrorLogStore } from 'src/stores/errorLog';
import { isAxiosNetworkError } from 'src/utils/networkStatus';
import { isGoogle3pLoadError, markGoogleAuthBlocked } from 'src/utils/googleAuthStatus';

function isNoisyClientError(err: unknown): boolean {
  if (isAxiosNetworkError(err)) return true;
  if (isGoogle3pLoadError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /ResizeObserver loop/i.test(msg);
}

function safePush(build: () => void) {
  try {
    build();
  } catch {
    /* a logger soha ne dőljön be */
  }
}

export default boot(({ app }) => {
  const store = useErrorLogStore();

  app.config.errorHandler = (err, instance, info) => {
    if (isNoisyClientError(err)) return;
    console.error(err);
    safePush(() => {
      const component =
        (instance as { type?: { name?: string }; $options?: { name?: string } } | null)?.type
          ?.name ||
        (instance as { $options?: { name?: string } } | null)?.$options?.name ||
        null;
      store.pushError(
        createErrorLogPayload(err, `Vue Error: ${info}`, {
          severity: 'Error',
          contextPayload: { vueInfo: info, component },
        })
      );
    });
  };

  window.addEventListener('error', (event) => {
    const src = (event.target as HTMLScriptElement | null)?.src || '';
    if (/accounts\.google\.com|gsi\/client/i.test(src) || isGoogle3pLoadError(event.message)) {
      markGoogleAuthBlocked();
      return;
    }
    if (isNoisyClientError(event.error || event.message)) return;
    safePush(() => {
      store.pushError(
        createErrorLogPayload(event.error || event.message, 'Window Error', {
          severity: 'Fatal',
          contextPayload: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        })
      );
    });
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isGoogle3pLoadError(event.reason)) {
      markGoogleAuthBlocked();
      event.preventDefault();
      return;
    }
    if (isNoisyClientError(event.reason)) {
      event.preventDefault();
      return;
    }
    safePush(() => {
      store.pushError(
        createErrorLogPayload(event.reason, 'Unhandled Promise Rejection', {
          severity: 'Error',
        })
      );
    });
  });

  window.addEventListener('online', () => {
    void store.processQueue();
  });

  void store.processQueue();
});
