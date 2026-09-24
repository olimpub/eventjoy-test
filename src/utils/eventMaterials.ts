import axios from 'axios';
import { api } from 'src/boot/axios';
import {
  nullableNumericId,
  pickDataset,
  readAxiosErrorMessage,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

export interface EventMaterialRole {
  eventMaterialId: number | null;
  eventRoleId: number;
  roleName: string;
}

export interface EventMaterial {
  eventMaterialId: number;
  materialId: number | null;
  publicName: string;
  fileName: string;
  contentType: string;
  sizeInBytes: number;
  materialTypeId: number | null;
  materialTypeName: string;
  materialTypeCode: string;
  isActive: boolean;
  blobUrl: string;
  downloadUrl: string;
  createdAt: string | null;
  roles: EventMaterialRole[];
}

export interface EventMaterialUploadInput {
  eventId: number;
  file: File;
  publicName: string;
  materialTypeId: number;
  eventRoleIds: number[];
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

function parseRole(row: unknown): EventMaterialRole | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const eventRoleId = nullableNumericId(rec.EventRoleID ?? rec.EventRoleId ?? rec.eventRoleId);
  if (eventRoleId == null) return null;
  return {
    eventMaterialId: nullableNumericId(rec.EventMaterialID ?? rec.EventMaterialId ?? rec.eventMaterialId),
    eventRoleId,
    roleName: readString(rec.RoleName, rec.roleName) || `Szerep #${eventRoleId}`,
  };
}

function parseMaterial(row: unknown): EventMaterial | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const eventMaterialId = nullableNumericId(
    rec.EventMaterialID ?? rec.EventMaterialId ?? rec.eventMaterialId ?? rec.Id ?? rec.ID ?? rec.id
  );
  if (eventMaterialId == null) return null;
  const rolesRaw = rec.Roles ?? rec.roles ?? rec.EventRoles ?? [];
  return {
    eventMaterialId,
    materialId: nullableNumericId(rec.MaterialID ?? rec.MaterialId ?? rec.materialId),
    publicName: readString(rec.PublicName, rec.publicName, rec.FileName, rec.fileName) || 'Anyag',
    fileName: readString(rec.FileName, rec.fileName),
    contentType: readString(rec.ContentType, rec.contentType),
    sizeInBytes: nullableNumericId(rec.SizeInBytes ?? rec.sizeInBytes) ?? 0,
    materialTypeId: nullableNumericId(rec.MaterialTypeID ?? rec.MaterialTypeId ?? rec.materialTypeId),
    materialTypeName: readString(rec.MaterialTypeName, rec.materialTypeName),
    materialTypeCode: readString(rec.MaterialTypeCode, rec.materialTypeCode),
    isActive: rec.IsActive == null && rec.isActive == null ? true : Boolean(rec.IsActive ?? rec.isActive),
    blobUrl: readString(rec.BlobUrl, rec.blobUrl),
    downloadUrl: readString(
      rec.DownloadUrl,
      rec.downloadUrl,
      rec.DownloadSasUrl,
      rec.downloadSasUrl,
      rec.ReadUrl,
      rec.readUrl,
      rec.SasUrl,
      rec.sasUrl
    ),
    createdAt: readString(rec.CreatedAt, rec.createdAt) || null,
    roles: (Array.isArray(rolesRaw) ? rolesRaw : []).map(parseRole).filter((row): row is EventMaterialRole => row != null),
  };
}

function readUploadUrls(raw: unknown): { sasUrl: string; blobUrl: string } {
  const data = unwrapApiPayload(raw);
  const nested = asRecord(data.Data) ?? data;
  const sasUrl = readString(nested.SasUrl, nested.sasUrl, nested.SASUrl, data.SasUrl, data.sasUrl);
  const blobUrl = readString(nested.BlobUrl, nested.blobUrl, data.BlobUrl, data.blobUrl);
  if (!sasUrl || !blobUrl) throw new Error('A feltöltési URL hiányos.');
  return { sasUrl, blobUrl };
}

function readDownloadSasUrl(raw: unknown): string {
  const data = unwrapApiPayload(raw);
  const nested = asRecord(data.Data) ?? data;
  return readString(
    nested.SasUrl,
    nested.sasUrl,
    nested.SASUrl,
    nested.DownloadUrl,
    nested.downloadUrl,
    nested.DownloadSasUrl,
    data.SasUrl,
    data.sasUrl,
    data.DownloadUrl,
    data.downloadUrl
  );
}

function hasSasToken(url: string): boolean {
  return /[?&]sig=/i.test(url);
}

function isReadSasUrl(url: string): boolean {
  if (!hasSasToken(url)) return false;
  try {
    const sp = new URL(url).searchParams.get('sp') || '';
    if (!sp) return true;
    return /r/i.test(sp);
  } catch {
    return true;
  }
}

function httpStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return typeof status === 'number' ? status : null;
}

async function looksLikeAzureXmlError(blob: Blob): Promise<boolean> {
  const type = String(blob.type || '').toLowerCase();
  if (type.includes('xml') || type.includes('text') || type.includes('octet-stream') || !type) {
    const text = await blob.slice(0, 800).text();
    return /<Error>|AuthorizationFailure|AuthenticationFailed/i.test(text);
  }
  return false;
}

function triggerAnchorOpen(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  if (filename) link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function materialRolesLabel(item: EventMaterial): string {
  if (!item.roles.length) return 'Mindenki';
  return item.roles.map((row) => row.roleName).join(', ');
}

export function materialFileUrl(item: EventMaterial): string {
  return item.downloadUrl || item.blobUrl;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function downloadFromAzureSas(sasUrl: string, filename: string, contentType: string): Promise<void> {
  try {
    const response = await fetch(sasUrl, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (response.ok) {
      const blob = await response.blob();
      if (!(await looksLikeAzureXmlError(blob))) {
        triggerBrowserDownload(
          new Blob([blob], { type: contentType || blob.type || 'application/octet-stream' }),
          filename
        );
        return;
      }
    }
  } catch {
    /* CORS / hálózati hiba: SAS URL-t nyitjuk, JWT nélkül */
  }
  triggerAnchorOpen(sasUrl, filename);
}

async function fetchMaterialDownloadSasUrl(eventId: number, item: EventMaterial): Promise<string> {
  const attempts = [
    () => api.get(`/event/${eventId}/materials/${item.eventMaterialId}/download-url`),
    () =>
      api.get(`/event/${eventId}/materials/download-url`, {
        params: {
          eventMaterialId: item.eventMaterialId,
          materialId: item.materialId || undefined,
          fileName: item.fileName || undefined,
        },
      }),
  ];
  let lastError: unknown;
  for (const run of attempts) {
    try {
      const response = await run();
      throwIfApiFailed(response.data, 'A letöltési URL nem kérhető.');
      const sasUrl = readDownloadSasUrl(response.data);
      if (!sasUrl) throw new Error('A letöltési URL hiányos.');
      return sasUrl;
    } catch (error) {
      lastError = error;
      const status = httpStatus(error);
      if (status === 401 || status === 403) throw error;
    }
  }
  throw lastError || new Error('A letöltési URL nem kérhető.');
}

async function downloadFromApiStream(eventId: number, item: EventMaterial, filename: string): Promise<void> {
  const response = await api.get(`/event/${eventId}/materials/${item.eventMaterialId}/file`, {
    responseType: 'blob',
  });
  const contentType = String(response.headers['content-type'] || '');
  if (contentType.includes('json')) throw new Error('A letöltés sikertelen.');
  const blob = response.data as Blob;
  if (await looksLikeAzureXmlError(blob)) throw new Error('A letöltés sikertelen.');
  triggerBrowserDownload(blob, filename);
}

export async function downloadEventMaterialFile(eventId: number, item: EventMaterial): Promise<void> {
  if (!Number.isFinite(eventId) || eventId <= 0) throw new Error('Ehhez az anyaghoz nincs fájl.');
  const filename = item.fileName || item.publicName || 'anyag';
  const existingSas = [item.downloadUrl, item.blobUrl].find((url) => url && isReadSasUrl(url));
  if (existingSas) {
    await downloadFromAzureSas(existingSas, filename, item.contentType);
    return;
  }

  try {
    const sasUrl = await fetchMaterialDownloadSasUrl(eventId, item);
    await downloadFromAzureSas(sasUrl, filename, item.contentType);
    return;
  } catch (error) {
    const status = httpStatus(error);
    if (status === 401 || status === 403) throw error;
    try {
      await downloadFromApiStream(eventId, item, filename);
      return;
    } catch {
      throw error;
    }
  }
}

export async function fetchEventMaterials(eventId: number): Promise<EventMaterial[]> {
  const response = await api.get(`/event/${eventId}/materials`);
  throwIfApiFailed(response.data, 'Az anyagok nem tölthetők.');
  const payload = unwrapApiPayload(response.data);
  return pickDataset(payload, 'Data', 'data', 'Materials', 'materials')
    .map(parseMaterial)
    .filter((row): row is EventMaterial => row != null);
}

export async function fetchMaterialUploadUrl(
  eventId: number,
  file: File
): Promise<{ sasUrl: string; blobUrl: string }> {
  const response = await api.get(`/event/${eventId}/materials/upload-url`, {
    params: {
      fileName: file.name,
      contentType: file.type || undefined,
      sizeInBytes: file.size || undefined,
    },
  });
  throwIfApiFailed(response.data, 'A feltöltési URL nem kérhető.');
  return readUploadUrls(response.data);
}

export async function putFileToSasUrl(sasUrl: string, file: File): Promise<void> {
  await axios.put(sasUrl, file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-ms-blob-type': 'BlockBlob',
    },
  });
}

export async function registerEventMaterial(input: EventMaterialUploadInput, blobUrl: string): Promise<void> {
  const response = await api.post(`/event/${input.eventId}/materials`, {
    FileName: input.file.name,
    BlobUrl: blobUrl,
    ContentType: input.file.type || 'application/octet-stream',
    SizeInBytes: input.file.size,
    PublicName: input.publicName.trim() || input.file.name,
    MaterialTypeID: input.materialTypeId,
    EventRoleIDs: input.eventRoleIds,
  });
  throwIfApiFailed(response.data, 'Az anyag mentése sikertelen.');
}

export async function uploadPtaDeskPhoto(eventId: number, roundDeskId: number, file: File): Promise<string> {
  const named =
    file.name && /\.(jpe?g|png|webp)$/i.test(file.name)
      ? file
      : new File([file], `desk-${roundDeskId}.jpg`, { type: file.type || 'image/jpeg' });
  const urls = await fetchMaterialUploadUrl(eventId, named);
  await putFileToSasUrl(urls.sasUrl, named);
  return urls.blobUrl;
}

export async function uploadEventMaterial(input: EventMaterialUploadInput): Promise<void> {
  const urls = await fetchMaterialUploadUrl(input.eventId, input.file);
  await putFileToSasUrl(urls.sasUrl, input.file);
  await registerEventMaterial(input, urls.blobUrl);
}

export function materialUploadErrorMessage(error: unknown): string {
  return readAxiosErrorMessage(error, 'A feltöltés sikertelen.');
}

export function materialDownloadErrorMessage(error: unknown): string {
  return readAxiosErrorMessage(error, 'A letöltés sikertelen.');
}
