import { buildStandings, projectStandings, standingPlace, type StandingRow } from './standings';
import { eventRoundIsFinal, finalTemplateIdSet } from './finalRound';
import { ptaEventRoundId, type PtaGameTypeRound } from './ptaData';

export type PrizeKind = 'surprise' | 'weighted';

export interface PrizeContender {
  playerId: number;
  name: string;
  amount: number;
  onTrack: number;
  tickets: number;
  place: number;
}

export interface SurprisePrize {
  ok: true;
  fieldSize: number;
  hatSize: number;
  hat: PrizeContender[];
  winner: PrizeContender;
  round3Amount: number;
  round3Truck: number;
  placeAfterTwo: number;
}

export interface WeightedPool {
  ok: true;
  excluded: number;
  players: number;
  cards: number;
  pool: PrizeContender[];
}

export type PrizeFailure = { ok: false; message: string };

/**
 * 1 játék-összeg = 1 000 EUR. Ha a tárolt szám már a teljes EUR (130000), ezerrel osztunk.
 * 130 összeg és 130 000 EUR is 130 kártya.
 */
export function prizeTickets(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount >= 1000) return Math.floor(amount / 1000);
  return Math.floor(amount);
}

export function prizeEuro(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount >= 1000 ? amount : amount * 1000;
}

export function formatPrizeEuro(amount: number): string {
  return `${new Intl.NumberFormat('hu-HU').format(prizeEuro(amount))} EUR`;
}

interface PrizeRound {
  id: number;
  order: number;
  final: boolean;
  status: string;
}

function asRounds(
  rows: Record<string, unknown>[],
  templates: PtaGameTypeRound[],
  statusName: (row: Record<string, unknown>) => string
): PrizeRound[] {
  const finalIds = finalTemplateIdSet(templates);
  return rows.map((row, index) => {
    const id = ptaEventRoundId(row) ?? index + 1;
    const order = Number(row.OrderIndex ?? index + 1);
    return {
      id,
      order: Number.isFinite(order) ? order : index + 1,
      final: eventRoundIsFinal(row, finalIds),
      status: statusName(row),
    };
  });
}

function contender(row: StandingRow, place: number): PrizeContender {
  return {
    playerId: row.playerId,
    name: row.name,
    amount: row.amount,
    onTrack: row.onTrack,
    tickets: prizeTickets(row.amount),
    place,
  };
}

export function evaluateSpecialPrizes(input: {
  templates: PtaGameTypeRound[];
  rounds: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  statusName: (row: Record<string, unknown>) => string;
  playerName: (playerId: number) => string;
  includePlayer?: (playerId: number) => boolean;
}): { surprise: SurprisePrize | PrizeFailure; weighted: WeightedPool | PrizeFailure } {
  const rounds = asRounds(input.rounds, input.templates, input.statusName);
  const preliminary = rounds.filter((round) => !round.final).sort((a, b) => a.order - b.order);
  const shared = {
    rounds,
    roundDesks: input.roundDesks,
    schedules: input.schedules,
    playerName: input.playerName,
    includePlayer: input.includePlayer,
  };
  const finalRoundIds = rounds.filter((round) => round.final).map((round) => round.id);

  return {
    surprise: surprisePrize(preliminary, shared),
    weighted: weightedPool(preliminary, finalRoundIds, shared),
  };
}

function surprisePrize(
  preliminary: PrizeRound[],
  shared: {
    rounds: PrizeRound[];
    roundDesks: Record<string, unknown>[];
    schedules: Record<string, unknown>[];
    playerName: (playerId: number) => string;
    includePlayer?: (playerId: number) => boolean;
  }
): SurprisePrize | PrizeFailure {
  const firstTwo = preliminary.slice(0, 2);
  const third = preliminary[2];
  if (firstTwo.length < 2 || !third) {
    return { ok: false, message: 'A meglepetés különdíjhoz három lezárt forduló kell.' };
  }
  const field = buildStandings({
    roundIds: firstTwo.map((round) => round.id),
    ...shared,
  });
  if (field.length < 2) {
    return { ok: false, message: 'A második forduló után még nincs mezőny.' };
  }
  const cut = Math.ceil(field.length / 2);
  const bottom = field.filter((row, index) => standingPlace(field, index) > cut);
  const round3 = new Map(
    buildStandings({ roundIds: [third.id], ...shared }).map((row) => [row.playerId, row])
  );
  const ranked = bottom
    .map((row) => {
      const score = round3.get(row.playerId);
      const at = field.indexOf(row);
      return {
        row,
        placeAfterTwo: standingPlace(field, at),
        amount: score?.amount ?? 0,
        onTrack: score?.onTrack ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      if (b.onTrack !== a.onTrack) return b.onTrack - a.onTrack;
      if (b.placeAfterTwo !== a.placeAfterTwo) return b.placeAfterTwo - a.placeAfterTwo;
      return a.row.name.localeCompare(b.row.name, 'hu', { sensitivity: 'base' });
    });
  const winner = ranked[0];
  const rival = ranked[1];
  if (!winner) return { ok: false, message: 'A kalap üres.' };
  if (
    rival &&
    rival.amount === winner.amount &&
    rival.onTrack === winner.onTrack &&
    rival.placeAfterTwo === winner.placeAfterTwo
  ) {
    return { ok: false, message: 'A meglepetés különdíj holtverseny, nincs egyetlen nyertes.' };
  }
  return {
    ok: true,
    fieldSize: field.length,
    hatSize: bottom.length,
    hat: bottom.map((row) => contender(row, standingPlace(field, field.indexOf(row)))),
    winner: {
      ...contender(winner.row, winner.placeAfterTwo),
      amount: winner.amount,
      onTrack: winner.onTrack,
      tickets: prizeTickets(winner.amount),
    },
    round3Amount: winner.amount,
    round3Truck: winner.onTrack,
    placeAfterTwo: winner.placeAfterTwo,
  };
}

function weightedPool(
  preliminary: PrizeRound[],
  finalRoundIds: number[],
  shared: {
    rounds: PrizeRound[];
    roundDesks: Record<string, unknown>[];
    schedules: Record<string, unknown>[];
    playerName: (playerId: number) => string;
    includePlayer?: (playerId: number) => boolean;
  }
): WeightedPool | PrizeFailure {
  if (!preliminary.length) return { ok: false, message: 'Még nincs lezárt forduló a sorsoláshoz.' };
  const roundIds = [...preliminary.map((round) => round.id), ...finalRoundIds];
  const board = projectStandings({
    roundIds,
    finalRoundIds,
    ...shared,
  });
  if (board.length < 5) {
    return { ok: false, message: 'A sorsoláshoz a négy díjazotton kívül is kell játékos.' };
  }
  const excluded = new Set(
    board.filter((row, index) => standingPlace(board, index) <= 4).map((row) => row.playerId)
  );
  const money = buildStandings({
    roundIds: preliminary.map((round) => round.id),
    ...shared,
  });
  const pool = money
    .filter((row) => !excluded.has(row.playerId))
    .map((row) => {
      const place = board.findIndex((item) => item.playerId === row.playerId);
      return contender(row, place >= 0 ? standingPlace(board, place) : 0);
    })
    .filter((row) => row.tickets > 0);
  const cards = pool.reduce((sum, row) => sum + row.tickets, 0);
  if (!pool.length || cards <= 0) {
    return { ok: false, message: 'Senkinek nincs húzható kártyája.' };
  }
  return { ok: true, excluded: excluded.size, players: pool.length, cards, pool };
}

export interface StoredSpecialPrize {
  eventId: number;
  kind: PrizeKind;
  name: string;
  winnerId: number | null;
}

export function normalizeSpecialPrizeRows(rows: unknown[]): Record<string, unknown>[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const kind = String(row.PrizeKind ?? row.prizeKind ?? '').toLowerCase();
      return {
        ...row,
        EventID: row.EventID ?? row.eventID ?? row.EventId,
        PrizeKind: kind === 'surprise' || kind === 'weighted' ? kind : '',
        PrizeName: String(row.PrizeName ?? row.prizeName ?? row.PName ?? '').trim(),
        WinnerEventPlayerID: row.WinnerEventPlayerID ?? row.winnerEventPlayerID ?? null,
      };
    })
    .filter((row) => row.PrizeKind === 'surprise' || row.PrizeKind === 'weighted');
}

export function storedSpecialPrize(
  rows: Record<string, unknown>[],
  eventId: string | number,
  kind: PrizeKind
): StoredSpecialPrize | null {
  const key = String(eventId);
  const row = rows.find((item) => {
    const id = item.EventID ?? item.eventID;
    return String(id ?? '') === key && String(item.PrizeKind) === kind && String(item.PrizeName || '').trim();
  });
  if (!row) return null;
  const winner = Number(row.WinnerEventPlayerID);
  return {
    eventId: Number(key),
    kind,
    name: String(row.PrizeName).trim(),
    winnerId: Number.isFinite(winner) && winner > 0 ? winner : null,
  };
}

export function drawWeightedWinner(pool: PrizeContender[], random: () => number = Math.random): PrizeContender | null {
  const cards = pool.reduce((sum, row) => sum + Math.max(0, row.tickets), 0);
  if (cards <= 0) return null;
  let ticket = Math.floor(random() * cards);
  if (ticket < 0) ticket = 0;
  if (ticket >= cards) ticket = cards - 1;
  for (const row of pool) {
    if (row.tickets <= 0) continue;
    if (ticket < row.tickets) return row;
    ticket -= row.tickets;
  }
  return pool[pool.length - 1] || null;
}
