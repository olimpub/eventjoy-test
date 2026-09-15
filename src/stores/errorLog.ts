import { defineStore } from 'pinia';
import { version as vueVersion } from 'vue';
import { api } from 'src/boot/axios';
import { throwIfApiFailed } from 'src/utils/apiPayload';

export type ErrorLogSeverity = 'Warning' | 'Error' | 'Fatal';

export interface FrontendErrorLog {
  source: 'Frontend';
  severity: ErrorLogSeverity;
  urlOrAction: string;
  errorMessage: string;
  stackTrace: string | null;
  contextPayload: unknown;
  clientInfo: {
    userAgent: string;
    language: string;
    screenResolution: string;
    vueVersion?: string;
  };
}

const STORAGE_KEY = 'ej-error-log-queue';
const MAX_QUEUE = 40;
const REDACT_KEYS = /password|passwd|token|authorization|secret|otp|validationcode/i;
const MAX_CONTEXT_CHARS = 8000;

function currentLocation(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function readMessage(err: unknown): string {
  if (err == null) return 'Ismeretlen hiba';
  if (typeof err === 'string' && err.trim()) return err.trim();
  if (err instanceof Error && err.message) return err.message;
  const rec = err as { message?: unknown; Message?: unknown; reason?: unknown };
  const fromRec = String(rec.message ?? rec.Message ?? rec.reason ?? '').trim();
  if (fromRec) return fromRec;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function readStack(err: unknown): string | null {
  if (err instanceof Error && err.stack) return err.stack;
  const stack = (err as { stack?: unknown } | null)?.stack;
  return typeof stack === 'string' && stack.trim() ? stack : null;
}

function clientInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { userAgent: 'ssr', language: '', screenResolution: '', vueVersion };
  }
  return {
    userAgent: navigator.userAgent || '',
    language: navigator.language || '',
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    vueVersion,
  };
}

function redactSensitive(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (typeof value === 'string') {
    const trimmed = value.length > MAX_CONTEXT_CHARS ? `${value.slice(0, MAX_CONTEXT_CHARS)}…` : value;
    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return redactSensitive(JSON.parse(trimmed), depth + 1);
      }
    } catch {
      /* keep string */
    }
    return trimmed;
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactSensitive(item, depth + 1));
  if (typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEYS.test(key) ? '[redacted]' : redactSensitive(nested, depth + 1);
  }
  return out;
}

export function createErrorLogPayload(
  err: unknown,
  action: string,
  extras?: {
    severity?: ErrorLogSeverity;
    contextPayload?: unknown;
    urlOrAction?: string;
  }
): FrontendErrorLog {
  const location = currentLocation();
  return {
    source: 'Frontend',
    severity: extras?.severity || 'Error',
    urlOrAction: extras?.urlOrAction || (location ? `${action} @ ${location}` : action),
    errorMessage: readMessage(err),
    stackTrace: readStack(err),
    contextPayload: extras?.contextPayload === undefined ? null : redactSensitive(extras.contextPayload),
    clientInfo: clientInfo(),
  };
}

function loadQueue(): FrontendErrorLog[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FrontendErrorLog[]) : [];
  } catch {
    return [];
  }
}

function persistQueue(queue: FrontendErrorLog[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* quota / private mode */
  }
}

export const useErrorLogStore = defineStore('errorLog', {
  state: () => ({
    errorQueue: loadQueue(),
    flushing: false,
  }),
  actions: {
    pushError(errorLog: FrontendErrorLog) {
      const last = this.errorQueue[this.errorQueue.length - 1];
      if (
        last &&
        last.errorMessage === errorLog.errorMessage &&
        last.urlOrAction === errorLog.urlOrAction
      ) {
        void this.processQueue();
        return;
      }
      this.errorQueue.push(errorLog);
      if (this.errorQueue.length > MAX_QUEUE) {
        this.errorQueue.splice(0, this.errorQueue.length - MAX_QUEUE);
      }
      persistQueue(this.errorQueue);
      void this.processQueue();
    },

    async processQueue() {
      if (this.flushing || !this.errorQueue.length) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      this.flushing = true;
      try {
        while (this.errorQueue.length) {
          const item = this.errorQueue[0];
          try {
            const response = await api.post('/logs/error', item);
            throwIfApiFailed(response.data, 'A hibalog nem küldhető.');
            this.errorQueue.shift();
            persistQueue(this.errorQueue);
          } catch {
            break;
          }
        }
      } finally {
        this.flushing = false;
      }
    },
  },
});
