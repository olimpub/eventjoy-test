import type { PtaEventSettings } from './ptaData';

export const AMOUNT_MIN = 1;
export const AMOUNT_MAX = 99;
export const TRUCK_MIN = 0;
export const TRUCK_MAX = 12;

export function scoreNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface ScoreSeat {
  playerId: number;
  amount: number | null;
  onTrack: number | null;
  position: number | null;
  resultPoint: number | null;
}

export function placementBonus(place: number, settings: PtaEventSettings | null | undefined): number {
  if (!settings || place < 1) return 0;
  if (place === 1) return Number(settings.Point1 ?? 8);
  if (place === 2) return Number(settings.Point2 ?? 4);
  if (place === 3) return Number(settings.Point3 ?? 2);
  if (place === 4) return Number(settings.Point4 ?? 0);
  return 0;
}

export function resultPointOf(
  amount: number,
  place: number,
  settings: PtaEventSettings | null | undefined
): number {
  return amount + placementBonus(place, settings);
}

function scoreKey(amount: number | null, onTrack: number | null): number | null {
  if (amount == null) return null;
  return amount * 100 + (onTrack ?? 0);
}

export function seatsHaveTie(seats: ScoreSeat[]): boolean {
  const keys = seats
    .map((seat) => scoreKey(seat.amount, seat.onTrack))
    .filter((key): key is number => key != null);
  return new Set(keys).size !== keys.length;
}

export function compareScoreSeats(a: ScoreSeat, b: ScoreSeat): number {
  const amountA = a.amount ?? -1;
  const amountB = b.amount ?? -1;
  if (amountB !== amountA) return amountB - amountA;
  return (b.onTrack ?? -1) - (a.onTrack ?? -1);
}

export function rankDeskSeats<T extends ScoreSeat>(
  seats: T[],
  settings: PtaEventSettings | null | undefined,
  manualOrder: boolean
): { seats: T[]; hasTie: boolean; allFilled: boolean } {
  const allFilled = seats.length > 0 && seats.every((seat) => seat.amount != null);
  const hasTie = seatsHaveTie(seats);
  const ordered =
    !allFilled || manualOrder ? seats.slice() : seats.slice().sort(compareScoreSeats);
  const canPlace = allFilled && (!hasTie || manualOrder);

  const ranked = ordered.map((seat, index) => {
    if (!canPlace || seat.amount == null) {
      return { ...seat, position: null, resultPoint: null };
    }
    const place = index + 1;
    return {
      ...seat,
      position: place,
      resultPoint: resultPointOf(seat.amount, place, settings),
    };
  });

  return { seats: ranked, hasTie, allFilled };
}
