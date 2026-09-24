import { boot } from 'quasar/wrappers';
import vue3GoogleLogin from 'vue3-google-login';
import { isGoogle3pLoadError, markGoogleAuthBlocked } from 'src/utils/googleAuthStatus';

export default boot(({ app }) => {
  try {
    app.use(vue3GoogleLogin, {
      clientId: '642226178014-m2l06c2hj0uc4ak96j1inskh2nfkgjeb.apps.googleusercontent.com',
    });
  } catch (err) {
    console.warn('Google belépés nem indult:', err);
    markGoogleAuthBlocked();
  }

  if (typeof window === 'undefined') return;
  window.addEventListener(
    'error',
    (event) => {
      const src = (event.target as HTMLScriptElement | null)?.src || '';
      if (/accounts\.google\.com|gsi\/client/i.test(src) || isGoogle3pLoadError(event.message)) {
        markGoogleAuthBlocked();
      }
    },
    true
  );
});
