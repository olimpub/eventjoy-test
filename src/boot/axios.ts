import { boot } from 'quasar/wrappers';
import axios, { AxiosError, AxiosInstance } from 'axios';

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
function isAzureBlobUrl(url: unknown): boolean {
  return /blob\.core\.windows\.net/i.test(String(url || ''));
}

function clearAuthorizationHeader(headers: unknown) {
  if (!headers || typeof headers !== 'object') return;
  const rec = headers as { delete?: (name: string) => void; Authorization?: unknown; authorization?: unknown };
  if (typeof rec.delete === 'function') {
    rec.delete('Authorization');
    rec.delete('authorization');
    return;
  }
  delete rec.Authorization;
  delete rec.authorization;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const target = `${config.baseURL || ''}${config.url || ''}`;
  console.log('--- AXIOS INTERCEPTOR --- Token in LocalStorage:', token ? 'VAN TOKEN (hossza: ' + token.length + ')' : 'NINCS TOKEN');
  if (isAzureBlobUrl(config.url) || isAzureBlobUrl(target)) {
    clearAuthorizationHeader(config.headers);
    return config;
  }
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

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || '';
    const status = error.response?.status;
    if (String(url).includes('/logs/error') || isAzureBlobUrl(url)) return Promise.reject(error);
    if (status === 401) {
      if (!String(url).includes('/auth/')) {
        void import('src/stores/auth').then(({ useAuthStore }) => {
          useAuthStore().handleUnauthorized();
        });
      }
      return Promise.reject(error);
    }
    if (status != null && status !== 400 && status !== 403 && status < 500) {
      return Promise.reject(error);
    }

    void import('src/stores/errorLog')
      .then(({ useErrorLogStore, createErrorLogPayload }) => {
        const severity = status != null && status < 500 ? 'Warning' : 'Error';
        const errorLog = createErrorLogPayload(error, 'API Error', {
          severity,
          contextPayload: {
            requestUrl: url,
            requestMethod: error.config?.method,
            requestData: error.config?.data,
            responseStatus: status ?? null,
            responseData: error.response?.data,
          },
        });
        useErrorLogStore().pushError(errorLog);
      })
      .catch(() => {
        /* ignore logger bootstrap errors */
      });

    return Promise.reject(error);
  }
);

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
