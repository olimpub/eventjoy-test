import { boot } from 'quasar/wrappers';
import vue3GoogleLogin from 'vue3-google-login';

export default boot(({ app }) => {
  app.use(vue3GoogleLogin, {
    clientId: '642226178014-m2l06c2hj0uc4ak96j1inskh2nfkgjeb.apps.googleusercontent.com'
  });
});
