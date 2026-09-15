import { api } from 'src/boot/axios';
import {
  isTruthyFlag,
  nullableNumericId,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';

export interface PtaRoundAvailableStatus {
  statusId: number;
  statusName: string;
}

export interface PtaRoundStatusAvailability {
  currentStatusId: number | null;
  currentStatusName: string;
  canUndoCurrent: boolean;
  availableNextStatuses: PtaRoundAvailableStatus[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseNextStatus(row: unknown): PtaRoundAvailableStatus | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const statusId = nullableNumericId(
    rec.statusId ?? rec.StatusId ?? rec.StatusID ?? rec.id ?? rec.Id
  );
  if (statusId == null) return null;
  const statusName = String(
    rec.statusName ?? rec.StatusName ?? rec.SName ?? rec.Name ?? ''
  ).trim();
  return { statusId, statusName: statusName || 'Státusz' };
}

export function parsePtaRoundStatusAvailability(raw: unknown): PtaRoundStatusAvailability {
  const data = unwrapApiPayload(raw);
  const nested = asRecord(data.Result2) || asRecord(data);
  const source = nested || data;
  const nextRaw =
    source.availableNextStatuses ??
    source.AvailableNextStatuses ??
    source.NextStatuses ??
    source.nextStatuses ??
    [];
  const nextList = Array.isArray(nextRaw) ? nextRaw : [];
  return {
    currentStatusId: nullableNumericId(
      source.currentStatusId ?? source.CurrentStatusId ?? source.CurrentStatusID
    ),
    currentStatusName: String(
      source.currentStatusName ?? source.CurrentStatusName ?? source.SName ?? ''
    ).trim(),
    canUndoCurrent: isTruthyFlag(source.canUndoCurrent ?? source.CanUndoCurrent ?? source.CanUndo),
    availableNextStatuses: nextList
      .map(parseNextStatus)
      .filter((row): row is PtaRoundAvailableStatus => row != null),
  };
}

export async function fetchPtaRoundAvailableStatuses(
  roundId: number
): Promise<PtaRoundStatusAvailability> {
  const response = await api.get(`/pta/rounds/${roundId}/available-statuses`);
  throwIfApiFailed(response.data, 'A forduló státuszai nem tölthetők.');
  return parsePtaRoundStatusAvailability(response.data);
}

export async function postPtaRoundStatus(roundId: number, newStatusId: number): Promise<void> {
  const response = await api.post(`/pta/rounds/${roundId}/status`, {
    newStatusId,
    NewStatusId: newStatusId,
    ToStatusID: newStatusId,
  });
  throwIfApiFailed(response.data, 'A forduló státusza nem változott.');
}

export async function rollbackPtaRoundStatus(roundId: number): Promise<void> {
  const response = await api.post(`/pta/rounds/${roundId}/status/rollback`, {});
  throwIfApiFailed(response.data, 'A visszavonás sikertelen.');
}
