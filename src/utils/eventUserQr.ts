/** EventUser.EventUserUID — a „Jegyem bemutatása” QR tartalma */

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32_RE = /^[0-9a-f]{32}$/i;

function formatGuid32(hex: string): string {
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * QR / UID normalizálás: nyers GUID, {GUID}, 32 hex, opcionális URL / eventjoy:eu: előtag.
 */
export function normalizeEventUserUid(raw: unknown): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      s =
        url.searchParams.get('uid') ||
        url.searchParams.get('eventUserUid') ||
        url.searchParams.get('EventUserUID') ||
        url.pathname.split('/').filter(Boolean).pop() ||
        s;
    } catch {
      /* nyers szöveg marad */
    }
  }

  s = s
    .replace(/^\{|\}$/g, '')
    .replace(/^(eventjoy|ej):eu:/i, '')
    .trim();

  if (GUID_RE.test(s)) return s.toLowerCase();
  const compact = s.replace(/-/g, '');
  if (HEX32_RE.test(compact)) return formatGuid32(compact);
  return null;
}

export function eventUserUidsMatch(a: unknown, b: unknown): boolean {
  const left = normalizeEventUserUid(a);
  const right = normalizeEventUserUid(b);
  return left != null && left === right;
}
