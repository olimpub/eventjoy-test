import { isTruthyFlag } from 'src/utils/apiPayload';
import { ptaSeatColorFromRow } from './drawEngine';
import {
  ptaDeskNumber,
  ptaEventDeskId,
  ptaEventRoundId,
  ptaRoundDeskId,
  ptaSchedulePlayerId,
  ptaScheduleRoundDeskId,
  type PtaEventPlayer,
} from './ptaData';

function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const COLOR_NAMES: Record<string, string> = {
  '#ff6060': 'Piros',
  '#28c76f': 'Zöld',
  '#2aa9ff': 'Kék',
  '#f2e74b': 'Sárga',
};

export function seatColorName(hex: string): string {
  return COLOR_NAMES[hex.trim().toLowerCase()] || 'Szín';
}

export interface PlayerRoundSeat {
  roundId: number;
  deskNo: number;
  deskName: string;
  color: string;
  colorName: string;
  amount: number | null;
  onTrack: number | null;
  resultPoint: number | null;
  position: number | null;
}

export function isReservePlayer(player: PtaEventPlayer | null | undefined): boolean {
  if (!player) return false;
  return isTruthyFlag(player.ReserveFlg);
}

export function findPlayerSeat(args: {
  playerId: number;
  eventUserId?: number | null;
  roundId: number;
  desks: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
}): PlayerRoundSeat | null {
  const roundDesks = args.roundDesks.filter(
    (row) => ptaEventRoundId(row) === args.roundId
  );
  for (const rd of roundDesks) {
    const roundDeskId = ptaRoundDeskId(rd);
    const seat = args.schedules.find((row) => {
      const playerId = ptaSchedulePlayerId(row);
      return (
        ptaScheduleRoundDeskId(row) === roundDeskId &&
        (playerId === args.playerId ||
          (args.eventUserId != null && playerId === args.eventUserId))
      );
    });
    if (!seat) continue;
    const deskId = ptaEventDeskId(rd);
    const desk = args.desks.find((row) => nullableNumber(row.EventDeskID ?? row.id) === deskId);
    const deskNo = ptaDeskNumber(rd) || ptaDeskNumber(desk);
    const color = ptaSeatColorFromRow(seat);
    return {
      roundId: args.roundId,
      deskNo,
      deskName: String(desk?.DName || `${deskNo || '?'}. asztal`),
      color,
      colorName: seatColorName(color),
      amount: nullableNumber(seat.Amount ?? seat.amount),
      onTrack: nullableNumber(seat.OnTrack ?? seat.onTrack ?? seat.TruckValue),
      resultPoint: nullableNumber(seat.ResultPoint ?? seat.resultPoint ?? seat.Point),
      position: nullableNumber(seat.Position ?? seat.RankAtTable),
    };
  }
  return null;
}
