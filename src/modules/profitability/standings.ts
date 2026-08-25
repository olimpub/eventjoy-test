import { nullableNumericId } from 'src/utils/apiPayload';
import { PTA_SEAT_COLORS } from './drawEngine';

export type ResultsScope = 'round' | 'total';

export interface StandingRow {
  playerId: number;
  name: string;
  color: string;
  amount: number;
  onTrack: number;
  resultPoint: number;
  memberCount?: number;
}

export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isLiveStatus(status: string) {
  return foldText(status).includes('folyamat');
}

export function isClosedStatus(status: string) {
  return foldText(status).includes('lezar');
}

export function isPublishedStatus(status: string) {
  const hay = foldText(status);
  return hay.includes('publikal') || hay.includes('kozze');
}

export function catalogHasPublishedStatus(
  statuses: Array<{ SName?: string | null } | null | undefined> | null | undefined
): boolean {
  return (statuses || []).some((row) => isPublishedStatus(String(row?.SName || '')));
}

/** Játékosnak csak publikált forduló látszik; ha nincs ilyen státusz a törzsben, a lezárt a közzététel. */
export function roundResultsReleased(status: string, catalogHasPublished: boolean): boolean {
  if (catalogHasPublished) return isPublishedStatus(status);
  return isClosedStatus(status);
}

export function deskStatusOf(rd: Record<string, unknown>, roundStatus: string): string {
  const own = String(rd.SName ?? rd.StatusName ?? rd.DeskStatus ?? '').trim();
  if (own) return own;
  if (isLiveStatus(roundStatus)) return 'Folyamatban';
  if (isClosedStatus(roundStatus)) return 'Lezárt';
  return 'Kisorsolva';
}

export function compareStandings(a: StandingRow, b: StandingRow): number {
  if (b.resultPoint !== a.resultPoint) return b.resultPoint - a.resultPoint;
  if (b.amount !== a.amount) return b.amount - a.amount;
  return b.onTrack - a.onTrack;
}

export function buildStandings(opts: {
  roundIds: number[];
  rounds: Array<{ id: number; status: string }>;
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  playerName: (playerId: number) => string;
}): StandingRow[] {
  const roundIds = new Set(opts.roundIds);
  if (!roundIds.size) return [];
  const byPlayer = new Map<number, StandingRow>();

  for (const rd of opts.roundDesks) {
    const roundId = nullableNumericId(rd.EventRoundID);
    if (roundId == null || !roundIds.has(roundId)) continue;
    const round = opts.rounds.find((item) => item.id === roundId);
    const deskStatus = deskStatusOf(rd, round?.status || '');
    if (!isClosedStatus(deskStatus)) continue;
    const roundDeskId = nullableNumericId(rd.EventRoundDeskID ?? rd.id);
    for (const row of opts.schedules) {
      if (nullableNumericId(row.EventRoundDeskID) !== roundDeskId) continue;
      const playerId = nullableNumericId(row.PlayerID);
      if (playerId == null) continue;
      const amount = nullableNumericId(row.Amount ?? row.amount) ?? 0;
      const onTrack = nullableNumericId(row.OnTrack ?? row.onTrack ?? row.TruckValue) ?? 0;
      const resultPoint = nullableNumericId(row.ResultPoint ?? row.resultPoint ?? row.Point) ?? 0;
      const colorIndex = Number(row.ColorIndex ?? 0);
      const existing = byPlayer.get(playerId);
      if (!existing) {
        byPlayer.set(playerId, {
          playerId,
          name: opts.playerName(playerId),
          color: String(row.ColorHex || PTA_SEAT_COLORS[colorIndex] || PTA_SEAT_COLORS[0]),
          amount,
          onTrack,
          resultPoint,
        });
        continue;
      }
      existing.amount += amount;
      existing.onTrack += onTrack;
      existing.resultPoint += resultPoint;
    }
  }

  return Array.from(byPlayer.values()).sort(compareStandings);
}

export function aggregateStandings(
  rows: StandingRow[],
  groupOf: (playerId: number) => string
): StandingRow[] {
  const byGroup = new Map<string, StandingRow>();
  for (const row of rows) {
    const name = groupOf(row.playerId) || 'Nincs megadva';
    const existing = byGroup.get(name);
    if (!existing) {
      byGroup.set(name, {
        playerId: 0,
        name,
        color: '',
        amount: row.amount,
        onTrack: row.onTrack,
        resultPoint: row.resultPoint,
        memberCount: 1,
      });
      continue;
    }
    existing.amount += row.amount;
    existing.onTrack += row.onTrack;
    existing.resultPoint += row.resultPoint;
    existing.memberCount = (existing.memberCount ?? 1) + 1;
  }
  return Array.from(byGroup.values()).sort(compareStandings);
}

export interface PlayerFinalTotals {
  playerId: number;
  FinalPoint: number;
  FinalTruckPoint: number;
  FinalPosition: number;
}

export function computePublishedPlayerFinals(opts: {
  rounds: Array<{ id: number; status: string }>;
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  catalogHasPublished: boolean;
}): PlayerFinalTotals[] {
  const roundIds = opts.rounds
    .filter((round) => roundResultsReleased(round.status, opts.catalogHasPublished))
    .map((round) => round.id);
  const rows = buildStandings({
    roundIds,
    rounds: opts.rounds,
    roundDesks: opts.roundDesks,
    schedules: opts.schedules,
    playerName: () => '',
  });
  return rows.map((row, index) => ({
    playerId: row.playerId,
    FinalPoint: row.resultPoint,
    FinalTruckPoint: row.onTrack,
    FinalPosition: index + 1,
  }));
}
