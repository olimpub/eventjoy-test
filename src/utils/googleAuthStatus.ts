import { readonly, ref } from 'vue';

const blockedRef = ref(false);

export const googleAuthBlocked = readonly(blockedRef);

export function markGoogleAuthBlocked() {
  blockedRef.value = true;
}

export function isGoogle3pLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /Google 3P Authorization/i.test(msg) || /accounts\.google\.com|gsi\/client/i.test(msg);
}

export function isGoogleAuthAvailable(): boolean {
  if (blockedRef.value) return false;
  if (typeof window === 'undefined') return false;
  const google = (window as unknown as { google?: { accounts?: { oauth2?: unknown } } }).google;
  return Boolean(google?.accounts?.oauth2);
}

export function googleAuthBlockedMessage() {
  return 'A Google belépés nem töltődött be (Adblocker, VPN vagy gyenge hálózat). Kapcsold ki a blokkolót, vagy lépj be e-mailes kóddal.';
}
