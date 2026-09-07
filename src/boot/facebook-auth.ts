import { boot } from 'quasar/wrappers';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default boot(() => {
  window.fbAsyncInit = function () {
    if (!window.FB?.init) return;
    window.FB.init({
      appId: '2944722095883838',
      cookie: true,
      xfbml: true,
      version: 'v18.0',
    });
    try {
      window.FB.AppEvents?.logPageView?.();
    } catch {
      /* SDK optional */
    }
  };

  if (document.getElementById('facebook-jssdk')) return;

  const js = document.createElement('script') as HTMLScriptElement;
  js.id = 'facebook-jssdk';
  js.async = true;
  js.defer = true;
  js.src = 'https://connect.facebook.net/hu_HU/sdk.js';
  js.onerror = () => {
    /* Tracking protection / adblock — az app ettől még elindul. */
  };
  document.head.appendChild(js);
});
