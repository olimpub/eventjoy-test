import { bindSchedulesToRoundDesk, ptaEventRoundId, ptaRoundDeskId, ptaSchedulePlayerId, ptaScheduleRoundDeskId } from './ptaData';
import { ptaSeatColorFromRow } from './drawEngine';
import { scoreNumber } from './scoreTable';

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

/** Asztal: Lezárt vagy Lejátszott. */
export function isClosedDeskStatus(status: string) {
  const hay = foldText(status);
  return hay.includes('lezar') || hay.includes('lejatszott');
}

function scheduleRowHasScore(row: Record<string, unknown>): boolean {
  const amount = Number(row.Amount ?? row.amount);
  const resultPoint = Number(row.ResultPoint ?? row.resultPoint ?? row.Point);
  const position = Number(row.Position ?? row.position ?? row.RankAtTable);
  if (Number.isFinite(amount) && amount > 0) return true;
  if (Number.isFinite(resultPoint) && resultPoint !== 0) return true;
  return Number.isFinite(position) && position > 0;
}

/** Lezárt asztal, vagy van már rögzített összeg / pont. */
export function deskHasRecordedResults(
  rd: Record<string, unknown>,
  roundStatus: string,
  schedules: Record<string, unknown>[],
  roundDesksInRound: Record<string, unknown>[] = []
): boolean {
  if (isClosedDeskStatus(deskStatusOf(rd, roundStatus))) return true;
  const bound = roundDesksInRound.length
    ? bindSchedulesToRoundDesk(rd, schedules, roundDesksInRound)
    : (schedules || []).filter((row) => ptaScheduleRoundDeskId(row) === ptaRoundDeskId(rd));
  return bound.some(scheduleRowHasScore);
}

export function isPublishedStatus(status: string) {
  const hay = foldText(status);
  return hay.includes('publikal') || hay.includes('kozze');
}

/** Lezárt vagy Publikált — ezeket a betöltés kihagyja a forduló-választáskor. */
export function isSettledRoundStatus(status: string) {
  return isClosedStatus(status) || isPublishedStatus(status);
}

/** Megnyitva / Kisorsolva — a forduló játszható, de még nem Folyamatban. */
export function isOpenRoundStatus(status: string) {
  const hay = foldText(status);
  if (!hay || isLiveStatus(hay) || isSettledRoundStatus(hay)) return false;
  return (
    hay.includes('megnyit') ||
    hay.includes('menyit') ||
    hay.includes('nyitva') ||
    hay.includes('sorsol') ||
    hay.includes('drawn') ||
    hay === 'open'
  );
}

export function canEnterRoundResults(status: string) {
  if (!status || isSettledRoundStatus(status)) return false;
  return isOpenRoundStatus(status) || isLiveStatus(status);
}

export function findPtaRoundStatusIdByNameHints(
  statuses: Array<{ id?: number; SName?: string | null } | null | undefined> | null | undefined,
  hints: string[]
): { id: number; name: string } | null {
  for (const hint of hints) {
    const needle = foldText(hint);
    if (!needle) continue;
    const hit = (statuses || []).find((row) => {
      if (!row) return false;
      const hay = foldText(String(row.SName || ''));
      return hay === needle || hay.includes(needle);
    });
    const id = Number(hit?.id);
    if (hit && Number.isFinite(id) && id > 0) {
      return { id, name: String(hit.SName || '').trim() || hint };
    }
  }
  return null;
}

/** Legkisebb sorszámú forduló, ami még nincs Lezárt / Publikált. Ha mind kész, az első. */
export function pickOpenRoundId(
  rounds: Array<{ id: number; status: string; order?: number }>
): number | null {
  if (!rounds.length) return null;
  const sorted = rounds.slice().sort((a, b) => {
    const byOrder = Number(a.order ?? 0) - Number(b.order ?? 0);
    if (byOrder !== 0) return byOrder;
    return a.id - b.id;
  });
  const open = sorted.find((round) => !isSettledRoundStatus(round.status));
  return (open ?? sorted[0])?.id ?? null;
}

export function catalogHasPublishedStatus(
  statuses: Array<{ SName?: string | null } | null | undefined> | null | undefined
): boolean {
  return (statuses || []).some((row) => isPublishedStatus(String(row?.SName || '')));
}

export type PtaRoundStatusKind = 'set' | 'close' | 'publish';

/** Lezárt = forduló vége, játékos még nem látja. Publikált = játékosnak mehet az eredmény. */
export function ptaRoundStatusKind(statusName: string): PtaRoundStatusKind {
  if (isPublishedStatus(statusName)) return 'publish';
  if (isClosedStatus(statusName)) return 'close';
  return 'set';
}

/** Játékosnak csak publikált forduló látszik. A Lezárt nem közzététel. */
export function roundResultsReleased(status: string, _catalogHasPublished?: boolean): boolean {
  return isPublishedStatus(status);
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
    const roundId = ptaEventRoundId(rd);
    if (roundId == null || !roundIds.has(roundId)) continue;
    const round = opts.rounds.find((item) => item.id === roundId);
    const deskStatus = deskStatusOf(rd, round?.status || '');
    const roundDeskId = ptaRoundDeskId(rd);
    const scored = opts.schedules.some(
      (row) => ptaScheduleRoundDeskId(row) === roundDeskId && scheduleRowHasScore(row)
    );
    if (!isClosedDeskStatus(deskStatus) && !scored) continue;
    for (const row of opts.schedules) {
      if (ptaScheduleRoundDeskId(row) !== roundDeskId) continue;
      const playerId = ptaSchedulePlayerId(row);
      if (playerId == null) continue;
      const amount = scoreNumber(row.Amount ?? row.amount) ?? 0;
      const onTrack = scoreNumber(row.OnTrack ?? row.onTrack ?? row.TruckValue) ?? 0;
      const resultPoint = scoreNumber(row.ResultPoint ?? row.resultPoint ?? row.Point) ?? 0;
      const existing = byPlayer.get(playerId);
      if (!existing) {
        byPlayer.set(playerId, {
          playerId,
          name: opts.playerName(playerId),
          color: ptaSeatColorFromRow(row),
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
