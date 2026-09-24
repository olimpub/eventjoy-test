import axios from 'axios';
import type { OpMediaItem } from './opMedia';
import { hashOpFile } from './opMedia';

const CACHE_NAME = 'op-media-v1';

function cacheUrl(eventId: number | string, mediaKey: string) {
  return `https://op-media.local/${eventId}/${encodeURIComponent(mediaKey)}`;
}

function metaKey(eventId: number | string, mediaKey: string) {
  return `op-media:${eventId}:${mediaKey}`;
}

async function openCache() {
  return caches.open(CACHE_NAME);
}

export async function getLocalMedia(
  eventId: number | string,
  mediaKey: string,
  expectedHash?: string | null
): Promise<Blob | null> {
  if (!mediaKey) return null;
  try {
    const cache = await openCache();
    const hit = await cache.match(cacheUrl(eventId, mediaKey));
    if (!hit) return null;
    const blob = await hit.blob();
    if (expectedHash) {
      const stored = localStorage.getItem(metaKey(eventId, mediaKey));
      if (stored && stored !== expectedHash) return null;
      if (!stored) {
        const digest = await hashOpFile(blob);
        if (digest !== expectedHash) return null;
        localStorage.setItem(metaKey(eventId, mediaKey), digest);
      }
    }
    return blob;
  } catch {
    return null;
  }
}

export async function putLocalMedia(
  eventId: number | string,
  item: Pick<OpMediaItem, 'MediaKey' | 'ContentHash' | 'Mime'>,
  blob: Blob
): Promise<void> {
  const cache = await openCache();
  await cache.put(
    cacheUrl(eventId, item.MediaKey),
    new Response(blob, {
      headers: { 'Content-Type': item.Mime || blob.type || 'application/octet-stream' },
    })
  );
  if (item.ContentHash) localStorage.setItem(metaKey(eventId, item.MediaKey), item.ContentHash);
}

export async function hasLocalMedia(
  eventId: number | string,
  mediaKey: string,
  expectedHash?: string | null
): Promise<boolean> {
  const blob = await getLocalMedia(eventId, mediaKey, expectedHash);
  return blob != null;
}

export async function resolvePlayableUrl(
  eventId: number | string,
  mediaKey: string | null | undefined,
  remoteUrl: string | null | undefined,
  expectedHash?: string | null
): Promise<string | null> {
  if (mediaKey) {
    const local = await getLocalMedia(eventId, mediaKey, expectedHash);
    if (local) return URL.createObjectURL(local);
  }
  if (remoteUrl) {
    try {
      const response = await axios.get(remoteUrl, { responseType: 'blob' });
      const blob = response.data as Blob;
      if (mediaKey) {
        await putLocalMedia(eventId, { MediaKey: mediaKey, ContentHash: expectedHash || '', Mime: blob.type }, blob);
      }
      return URL.createObjectURL(blob);
    } catch {
      return remoteUrl;
    }
  }
  return null;
}

export async function downloadOpMediaPack(
  eventId: number | string,
  items: OpMediaItem[],
  onProgress?: (done: number, total: number) => void
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  const total = items.length;
  onProgress?.(0, total);
  for (const item of items) {
    try {
      const have = await hasLocalMedia(eventId, item.MediaKey, item.ContentHash);
      if (!have) {
        const response = await axios.get(item.BlobUrl, { responseType: 'blob' });
        await putLocalMedia(eventId, item, response.data as Blob);
      }
      ok += 1;
    } catch {
      failed += 1;
    }
    onProgress?.(ok + failed, total);
  }
  return { ok, failed };
}
