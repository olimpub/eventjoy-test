import { boot } from 'quasar/wrappers';
import { createErrorLogPayload, useErrorLogStore } from 'src/stores/errorLog';

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
    if (!event.error && event.message === 'ResizeObserver loop limit exceeded') return;
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
  });

  window.addEventListener('unhandledrejection', (event) => {
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
