import { boot } from 'quasar/wrappers';
import axios, { AxiosInstance } from 'axios';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Beállíthatjuk az Azure Functions alap URL-t
const api = axios.create({ baseURL: process.env.API_URL || 'https://testapi.eventjoy.hu/' });

// AXIOS INTERCEPTOR: Automatikusan hozzáfűzi a JWT Token-t minden kéréshez!
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('--- AXIOS INTERCEPTOR --- Token in LocalStorage:', token ? 'VAN TOKEN (hossza: ' + token.length + ')' : 'NINCS TOKEN');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header beállítva.');
  } else {
    console.log('Figyelem: Token nélkül megy el a kérés!');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
