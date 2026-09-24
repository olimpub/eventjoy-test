import { boot } from 'quasar/wrappers';
import { setNetworkReconnecting, markNetworkOk } from 'src/utils/networkStatus';

export default boot(() => {
  if (typeof window === 'undefined') return;

  const recover = () => {
    setNetworkReconnecting(true);
    markNetworkOk();
    void (async () => {
      try {
        const { refreshEventCatalog } = await import('src/utils/eventCatalogRefresh');
        await refreshEventCatalog({ force: true });
      } catch {
        /* a banner marad, ha a GET még mindig elhasal */
      }
      try {
        const { signalRService } = await import('src/services/signalrService');
        await signalRService.resumeFromForeground();
      } catch {
        /* watchdog újrapróbálja */
      } finally {
        window.setTimeout(() => setNetworkReconnecting(false), 800);
      }
    })();
  };

  window.addEventListener('online', recover);
});
