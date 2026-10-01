import axios from 'axios';
import { api } from 'src/boot/axios';
import {
  nullableNumericId,
  pickDataset,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

export type OpMediaKind = 'image' | 'audio';
export type OpMediaSlot = 'image' | 'audio';

export const OP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const OP_AUDIO_MAX_BYTES = 20 * 1024 * 1024;
export const OP_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const OP_AUDIO_ACCEPT = 'audio/mpeg,.mp3';

export interface OpMediaItem {
  MediaKey: string;
  Kind: OpMediaKind;
  FileName: string;
  Mime: string;
  SizeInBytes: number;
  ContentHash: string;
  BlobUrl: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

export async function hashOpFile(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function opMediaKindOfFile(file: File): OpMediaKind | null {
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  if (type === 'audio/mpeg' || name.endsWith('.mp3')) return 'audio';
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') return 'image';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp')) {
    return 'image';
  }
  return null;
}

export function validateOpMediaFile(file: File, kind: OpMediaKind): string {
  const guessed = opMediaKindOfFile(file);
  if (guessed !== kind) {
    return kind === 'audio' ? 'Csak MP3 tölthető fel hangnak.' : 'Csak JPEG, PNG vagy WebP kép tölthető fel.';
  }
  if (kind === 'image' && file.size > OP_IMAGE_MAX_BYTES) return 'A kép túl nagy (max 5 MB).';
  if (kind === 'audio' && file.size > OP_AUDIO_MAX_BYTES) return 'A hang túl nagy (max 20 MB).';
  return '';
}

const OP_IMAGE_MAX_EDGE = 1600;
const OP_IMAGE_WEBP_QUALITY = 0.8;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('A kép nem alakítható át.'))),
      type,
      quality
    );
  });
}

/** Kérdéskép WebP-re, hosszabbik oldal max 1600. Kisebb képet nem nagyít. */
export async function compressOpQuestionImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = longest > OP_IMAGE_MAX_EDGE ? OP_IMAGE_MAX_EDGE / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('A kép nem alakítható át.');
    ctx.drawImage(bitmap, 0, 0, width, height);
    let blob = await canvasToBlob(canvas, 'image/webp', OP_IMAGE_WEBP_QUALITY);
    let type = 'image/webp';
    if (blob.type && blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', OP_IMAGE_WEBP_QUALITY);
      type = 'image/jpeg';
    }
    const base = file.name.replace(/\.[^.]+$/, '') || 'kerdeskep';
    const ext = type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${base}.${ext}`, { type });
  } finally {
    bitmap.close();
  }
}

function parseMediaItem(row: unknown): OpMediaItem | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const MediaKey = readString(rec.MediaKey, rec.mediaKey);
  if (!MediaKey) return null;
  const kindRaw = readString(rec.Kind, rec.kind, rec.Slot, rec.slot).toLowerCase();
  const Kind: OpMediaKind = kindRaw === 'audio' ? 'audio' : 'image';
  return {
    MediaKey,
    Kind,
    FileName: readString(rec.FileName, rec.fileName) || MediaKey,
    Mime: readString(rec.Mime, rec.mime, rec.ContentType, rec.contentType),
    SizeInBytes: nullableNumericId(rec.SizeInBytes ?? rec.sizeInBytes) ?? 0,
    ContentHash: readString(rec.ContentHash, rec.contentHash, rec.Hash, rec.hash),
    BlobUrl: readString(rec.BlobUrl, rec.blobUrl, rec.ImageUrl, rec.imageUrl, rec.AudioUrl, rec.audioUrl, rec.DownloadUrl, rec.downloadUrl),
  };
}

export async function fetchOpMediaUploadUrl(
  eventId: number,
  file: File,
  kind: OpMediaKind
): Promise<{ mediaKey: string; sasUrl: string; blobUrl: string }> {
  const response = await api.get('/op/media/upload-url', {
    params: {
      eventId,
      fileName: file.name,
      kind,
      contentType: file.type || undefined,
      sizeInBytes: file.size || undefined,
    },
  });
  throwIfApiFailed(response.data, 'A feltöltési URL nem kérhető.');
  const data = unwrapApiPayload(response.data);
  const nested = asRecord(data.Data) ?? data;
  const mediaKey = readString(nested.MediaKey, nested.mediaKey, data.MediaKey);
  const sasUrl = readString(nested.SasUrl, nested.sasUrl, nested.SASUrl, data.SasUrl);
  const blobUrl = readString(nested.BlobUrl, nested.blobUrl, data.BlobUrl);
  if (!mediaKey || !sasUrl || !blobUrl) throw new Error('A feltöltési URL hiányos.');
  return { mediaKey, sasUrl, blobUrl };
}

export async function registerOpMedia(body: {
  EventID: number;
  MediaKey: string;
  Kind: OpMediaKind;
  BlobUrl: string;
  ContentHash: string;
  Mime: string;
  SizeInBytes: number;
  FileName: string;
  QuestionID?: number | null;
  Slot?: OpMediaSlot;
}): Promise<OpMediaItem> {
  const response = await api.post('/op/media', body);
  throwIfApiFailed(response.data, 'A média mentése sikertelen.');
  const data = unwrapApiPayload(response.data);
  return (
    parseMediaItem(data) || {
      MediaKey: body.MediaKey,
      Kind: body.Kind,
      FileName: body.FileName,
      Mime: body.Mime,
      SizeInBytes: body.SizeInBytes,
      ContentHash: body.ContentHash,
      BlobUrl: body.BlobUrl,
    }
  );
}

export async function uploadOpMedia(input: {
  eventId: number;
  file: File;
  kind: OpMediaKind;
  questionId?: number | null;
}): Promise<{ item: OpMediaItem; storedFile: File }> {
  let file = input.file;
  if (input.kind === 'image') {
    if (opMediaKindOfFile(file) !== 'image') throw new Error('Csak JPEG, PNG vagy WebP kép tölthető fel.');
    file = await compressOpQuestionImage(file);
  }
  const invalid = validateOpMediaFile(file, input.kind);
  if (invalid) throw new Error(invalid);
  const hash = await hashOpFile(file);
  const urls = await fetchOpMediaUploadUrl(input.eventId, file, input.kind);
  await axios.put(urls.sasUrl, file, {
    headers: {
      'Content-Type': file.type || (input.kind === 'audio' ? 'audio/mpeg' : 'image/webp'),
      'x-ms-blob-type': 'BlockBlob',
    },
  });
  const item = await registerOpMedia({
    EventID: input.eventId,
    MediaKey: urls.mediaKey,
    Kind: input.kind,
    BlobUrl: urls.blobUrl,
    ContentHash: hash,
    Mime: file.type || (input.kind === 'audio' ? 'audio/mpeg' : 'image/webp'),
    SizeInBytes: file.size,
    FileName: file.name,
    QuestionID: input.questionId ?? undefined,
    Slot: input.questionId != null ? input.kind : undefined,
  });
  return { item, storedFile: file };
}

export async function fetchOpMediaManifest(eventId: number | string): Promise<OpMediaItem[]> {
  const response = await api.get(`/op/media/manifest/${eventId}`);
  throwIfApiFailed(response.data, 'A média lista nem tölthető.');
  const data = unwrapApiPayload(response.data);
  const rows = pickDataset(data, 'Items', 'items', 'OpMedia', 'Media', 'Data');
  return rows.map(parseMediaItem).filter((row): row is OpMediaItem => row != null);
}

export async function deleteOpMedia(eventId: number, mediaKey: string): Promise<void> {
  const response = await api.post('/op/media/delete', { EventID: eventId, MediaKey: mediaKey });
  throwIfApiFailed(response.data, 'A média törlése sikertelen.');
}

export function formatOpMediaSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
