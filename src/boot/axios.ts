import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import axios, { AxiosError, AxiosInstance } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Várt hiba: a globális toast és a 401-es kijelentkeztetés kimarad. */
    skipErrorNotify?: boolean;
    /** Nyilvános hívás: ne menjen vele a bent lévő szervezői token. */
    skipAuth?: boolean;
  }
}
import { readApiReturnDescription } from 'src/utils/apiPayload';
import { decodeDisplayText } from 'src/utils/appVersions';
import { isAxiosNetworkError, markNetworkFailure, markNetworkOk } from 'src/utils/networkStatus';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Lokálisan a .env.local VITE_API_URL értékét, buildben a publikus API-t használjuk.
// Másik eszközről (a gép IP-je) a localhost a telefon lenne, és a Functions CORS csak
// a localhost:9000 origint engedi. Ilyenkor ugyanarra a hostra, a /api útvonalra megyünk,
// a Vite dev szerver pedig továbbítja a helyi Functions hostra.
function isLoopbackHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

function resolveApiBaseUrl(): string {
  const configured = String(import.meta.env.VITE_API_URL || 'https://testapi.eventjoy.hu/api');
  if (typeof window === 'undefined') return configured;
  const pageHost = window.location.hostname;
  if (isLoopbackHost(pageHost)) return configured;
  try {
    const apiUrl = new URL(configured);
    if (!isLoopbackHost(apiUrl.hostname)) return configured;
    const path = apiUrl.pathname.replace(/\/$/, '') || '/api';
    return `${window.location.origin}${path}`;
  } catch {
    return configured;
  }
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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
  if (config.skipAuth) {
    clearAuthorizationHeader(config.headers);
    return config;
  }
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

function notifyApiError(message: string) {
  Notify.create({
    message,
    color: 'dark',
    textColor: 'red-4',
    position: 'top',
    timeout: 2800,
    classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
    style: 'background: rgba(10, 11, 12, 0.92);',
  });
}

function apiErrorMessage(data: unknown): string {
  let payload = data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith('<')) return '';
    try {
      payload = JSON.parse(trimmed);
    } catch {
      return decodeDisplayText(trimmed);
    }
  }
  return decodeDisplayText(readApiReturnDescription(payload));
}

api.interceptors.response.use(
  (response) => {
    markNetworkOk();
    return response;
  },
  (error: AxiosError) => {
    const url = error.config?.url || '';
    const status = error.response?.status;
    if (error.config?.skipErrorNotify) {
      if (isAxiosNetworkError(error)) markNetworkFailure();
      return Promise.reject(error);
    }
    if (String(url).includes('/logs/error') || isAzureBlobUrl(url)) return Promise.reject(error);
    if (isAxiosNetworkError(error)) {
      markNetworkFailure();
      notifyApiError('Nem sikerült kapcsolódni a szerverhez (Hálózati hiba).');
      return Promise.reject(error);
    }
    const description = apiErrorMessage(error.response?.data);
    if (description) notifyApiError(description);
    else if (error.response && status !== 401) {
      notifyApiError('Ismeretlen hiba történt a művelet során.');
    }
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
