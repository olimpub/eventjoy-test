const LIVE_HOST = 'app.eventjoy.hu';

function isLiveApi(url: string): boolean {
  return /^https:\/\/api\.eventjoy\.hu\b/i.test(url);
}

/** Éles app és éles API. A teszt felület és a helyi futtatás kívül marad. */
export function isLiveSurface(): boolean {
  if (typeof window !== 'undefined' && window.location.hostname === LIVE_HOST) return true;
  return isLiveApi(String(import.meta.env.VITE_API_URL || ''));
}

export function allowTestTools(): boolean {
  return !isLiveSurface();
}
