import { boot } from 'quasar/wrappers';
import axios, { AxiosInstance } from 'axios';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Lokálisan a .env.local VITE_API_URL értékét, buildben a publikus API-t használjuk.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://testapi.eventjoy.hu/api',
});

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
