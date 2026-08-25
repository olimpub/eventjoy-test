import { isTruthyFlag } from 'src/utils/apiPayload';
import { PTA_SEAT_COLORS } from './drawEngine';
import type { PtaEventPlayer } from './ptaData';

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
  roundId: number;
  desks: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
}): PlayerRoundSeat | null {
  const roundDesks = args.roundDesks.filter(
    (row) => nullableNumber(row.EventRoundID) === args.roundId
  );
  for (const rd of roundDesks) {
    const roundDeskId = nullableNumber(rd.EventRoundDeskID ?? rd.id);
    const seat = args.schedules.find((row) => {
      return (
        nullableNumber(row.EventRoundDeskID) === roundDeskId &&
        nullableNumber(row.PlayerID) === args.playerId
      );
    });
    if (!seat) continue;
    const deskId = nullableNumber(rd.EventDeskID);
    const desk = args.desks.find((row) => nullableNumber(row.EventDeskID ?? row.id) === deskId);
    const deskNo = Number(desk?.DeskNo ?? 0);
    const colorIndex = Number(seat.ColorIndex ?? 0);
    const color = String(seat.ColorHex || PTA_SEAT_COLORS[colorIndex] || PTA_SEAT_COLORS[0]);
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
