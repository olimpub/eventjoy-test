import { bindSchedulesToRoundDesk, ptaEventRoundId, ptaRoundDeskId, ptaSchedulePlayerId, ptaScheduleRoundDeskId } from './ptaData';
import { PLAYERS_PER_DESK, compareSeatRowsByColor, ptaSeatColorFromRow } from './drawEngine';
import { scoreNumber } from './scoreTable';

export type ResultsScope = 'round' | 'total';

/** Egy asztalnál lejátszott forduló, az egymás elleni összevetéshez. */
export interface StandingMeeting {
  roundId: number;
  deskId: number;
  amount: number;
  resultPoint: number;
  position: number | null;
}

export interface StandingRow {
  playerId: number;
  name: string;
  color: string;
  amount: number;
  onTrack: number;
  resultPoint: number;
  /** Helyezésekért kapott pluszpont (fordulópont − nyers összeg), fordulónként összeadva. */
  bonusPoints: number;
  /** Egy fordulóban elért legnagyobb fordulópont. */
  bestRoundPoint: number;
  /** Egy fordulóban elért legnagyobb nyers összeg. */
  bestRoundAmount: number;
  meetings: StandingMeeting[];
  /** Döntős a végeredményen: helye van, pontja nincs. */
  hidePoints?: boolean;
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
  if (rd.CompletedAtUtc || rd.completedAtUtc) return true;
  if (isClosedDeskStatus(deskStatusOf(rd, roundStatus))) return true;
  const bound = roundDesksInRound.length
    ? bindSchedulesToRoundDesk(rd, schedules, roundDesksInRound)
    : (schedules || []).filter((row) => ptaScheduleRoundDeskId(row) === ptaRoundDeskId(rd));
  return bound.some(scheduleRowHasScore);
}

export function isPublishedStatus(status: string) {
  const hay = foldText(status);
  return hay.includes('publik') || hay.includes('kozze');
}

/** Lezárt (4) és Publikus (5). A kivetítő ezeket vetítheti, a nevetől függetlenül is. */
export const PTA_PROJECTABLE_ROUND_STATUS_IDS = [4, 5] as const;

export function isProjectableRoundStatus(status: string, statusId?: number | null): boolean {
  if (statusId != null && (PTA_PROJECTABLE_ROUND_STATUS_IDS as readonly number[]).includes(statusId)) {
    return true;
  }
  return isSettledRoundStatus(status);
}

/** Játékosok / Csoportok: Lezárt vagy Publikus, illetve ha minden asztal le van zárva. Publikálás nem kell. */
export function roundCanProjectResults(round: {
  status: string;
  statusId?: number | null;
  deskCount?: number;
  closedDeskCount?: number;
}): boolean {
  if (isProjectableRoundStatus(round.status, round.statusId)) return true;
  const desks = Number(round.deskCount ?? 0);
  const closed = Number(round.closedDeskCount ?? 0);
  return desks > 0 && closed >= desks;
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

function pickLatestMatchingRoundId<T extends { id: number; status: string; order?: number; statusId?: number | null }>(
  rounds: T[],
  include: (round: T) => boolean
): number | null {
  const released = rounds.filter((round) => include(round));
  if (!released.length) return null;
  released.sort((a, b) => {
    const byOrder = Number(b.order ?? 0) - Number(a.order ?? 0);
    if (byOrder !== 0) return byOrder;
    return b.id - a.id;
  });
  return released[0]?.id ?? null;
}

/** Legmagasabb sorszámú publikált forduló — játékos eredmény. */
export function pickLatestReleasedRoundId(
  rounds: Array<{ id: number; status: string; order?: number }>
): number | null {
  return pickLatestMatchingRoundId(rounds, (round) => roundResultsReleased(round.status));
}

/** Kivetítés: Lezárt (4) vagy Publikus (5), illetve végig lezárt asztalok. A legmagasabb sorszám. */
export function pickLatestSettledRoundId(
  rounds: Array<{
    id: number;
    status: string;
    order?: number;
    statusId?: number | null;
    deskCount?: number;
    closedDeskCount?: number;
  }>
): number | null {
  return pickLatestMatchingRoundId(rounds, (round) => roundCanProjectResults(round));
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

function tablePosition(row: Record<string, unknown>): number | null {
  const position = scoreNumber(row.Position ?? row.position ?? row.RankAtTable);
  return position != null && position > 0 ? position : null;
}

function emptyStanding(playerId: number, name: string, color: string): StandingRow {
  return {
    playerId,
    name,
    color,
    amount: 0,
    onTrack: 0,
    resultPoint: 0,
    bonusPoints: 0,
    bestRoundPoint: 0,
    bestRoundAmount: 0,
    meetings: [],
  };
}

function addRoundResult(
  standing: StandingRow,
  part: {
    roundId: number | null;
    deskId: number | null;
    amount: number;
    onTrack: number;
    resultPoint: number;
    position: number | null;
  }
) {
  standing.amount += part.amount;
  standing.onTrack += part.onTrack;
  standing.resultPoint += part.resultPoint;
  standing.bonusPoints += part.resultPoint - part.amount;
  if (part.resultPoint > standing.bestRoundPoint) standing.bestRoundPoint = part.resultPoint;
  if (part.amount > standing.bestRoundAmount) standing.bestRoundAmount = part.amount;
  if (part.roundId != null && part.deskId != null) {
    standing.meetings.push({
      roundId: part.roundId,
      deskId: part.deskId,
      amount: part.amount,
      resultPoint: part.resultPoint,
      position: part.position,
    });
  }
}

/**
 * Közös asztalok: a magasabb ott szerzett fordulópont nyer.
 * Ha az is azonos, a jobb asztali helyezés (kisebb helyszám), majd a nagyobb nyers összeg.
 * Ha nem ültek egy asztalnál, nincs döntés.
 */
function compareHeadToHead(a: StandingRow, b: StandingRow): number {
  let aPoints = 0;
  let bPoints = 0;
  let aPlace = 0;
  let bPlace = 0;
  let aAmount = 0;
  let bAmount = 0;
  let shared = 0;
  for (const left of a.meetings) {
    const right = b.meetings.find(
      (meeting) => meeting.roundId === left.roundId && meeting.deskId === left.deskId
    );
    if (!right) continue;
    shared += 1;
    aPoints += left.resultPoint;
    bPoints += right.resultPoint;
    aAmount += left.amount;
    bAmount += right.amount;
    if (left.position != null && right.position != null) {
      aPlace += left.position;
      bPlace += right.position;
    }
  }
  if (!shared) return 0;
  if (bPoints !== aPoints) return bPoints - aPoints;
  if (aPlace !== bPlace) return aPlace - bPlace;
  return bAmount - aAmount;
}

/**
 * Elsődleges: összpontszám (fordulópont).
 * Azonos összpontnál: kocsin maradt áru, helyezési pluszpont, egymás elleni eredmény,
 * egy fordulóban elért legnagyobb érték, és legvégül az eredetileg szerzett nyers összeg.
 * Ha ezek mind egyeznek, a helyezés közös. Az azonosító csak a lista sorrendje, helyet nem ad.
 */
export function compareStandingMerit(a: StandingRow, b: StandingRow): number {
  if (b.resultPoint !== a.resultPoint) return b.resultPoint - a.resultPoint;
  if (b.onTrack !== a.onTrack) return b.onTrack - a.onTrack;
  if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
  const head = compareHeadToHead(a, b);
  if (head !== 0) return head;
  if (b.bestRoundPoint !== a.bestRoundPoint) return b.bestRoundPoint - a.bestRoundPoint;
  if (b.bestRoundAmount !== a.bestRoundAmount) return b.bestRoundAmount - a.bestRoundAmount;
  if (b.amount !== a.amount) return b.amount - a.amount;
  return 0;
}

export function compareStandings(a: StandingRow, b: StandingRow): number {
  const merit = compareStandingMerit(a, b);
  if (merit !== 0) return merit;
  if (a.playerId !== b.playerId) return a.playerId - b.playerId;
  return a.name.localeCompare(b.name, 'hu', { sensitivity: 'base' });
}

/** Közös helyezés: 1, 1, 3. A döntő ülései külön helyek maradnak. */
export function standingPlace(rows: StandingRow[], index: number): number {
  const row = rows[index];
  if (!row || row.hidePoints) return index + 1;
  let cursor = index;
  while (
    cursor > 0 &&
    !rows[cursor - 1]?.hidePoints &&
    compareStandingMerit(rows[cursor - 1], rows[cursor]) === 0
  ) {
    cursor -= 1;
  }
  return cursor + 1;
}

export function buildStandings(opts: {
  roundIds: number[];
  rounds: Array<{ id: number; status: string }>;
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  playerName: (playerId: number) => string;
  includePlayer?: (playerId: number) => boolean;
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
      if (playerId == null || (opts.includePlayer && !opts.includePlayer(playerId))) continue;
      const amount = scoreNumber(row.Amount ?? row.amount) ?? 0;
      const onTrack = scoreNumber(row.OnTrack ?? row.onTrack ?? row.TruckValue) ?? 0;
      const resultPoint = scoreNumber(row.ResultPoint ?? row.resultPoint ?? row.Point) ?? 0;
      const standing = byPlayer.get(playerId) ?? emptyStanding(
        playerId,
        opts.playerName(playerId),
        ptaSeatColorFromRow(row)
      );
      addRoundResult(standing, {
        roundId,
        deskId: roundDeskId,
        amount,
        onTrack,
        resultPoint,
        position: tablePosition(row),
      });
      byPlayer.set(playerId, standing);
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
        ...emptyStanding(0, name, ''),
        amount: row.amount,
        onTrack: row.onTrack,
        resultPoint: row.resultPoint,
        bonusPoints: row.bonusPoints,
        bestRoundPoint: row.bestRoundPoint,
        bestRoundAmount: row.bestRoundAmount,
        memberCount: 1,
      });
      continue;
    }
    existing.amount += row.amount;
    existing.onTrack += row.onTrack;
    existing.resultPoint += row.resultPoint;
    existing.bonusPoints += row.bonusPoints;
    if (row.bestRoundPoint > existing.bestRoundPoint) existing.bestRoundPoint = row.bestRoundPoint;
    if (row.bestRoundAmount > existing.bestRoundAmount) existing.bestRoundAmount = row.bestRoundAmount;
    existing.memberCount = (existing.memberCount ?? 1) + 1;
  }
  return Array.from(byGroup.values()).sort(compareStandings);
}

function schedulesOnRounds(
  roundIds: number[],
  roundDesks: Record<string, unknown>[],
  schedules: Record<string, unknown>[]
): Record<string, unknown>[] {
  const wanted = new Set(roundIds);
  const deskIds = new Set(
    roundDesks
      .filter((row) => {
        const roundId = ptaEventRoundId(row);
        return roundId != null && wanted.has(roundId);
      })
      .map((row) => ptaRoundDeskId(row))
      .filter((id): id is number => id != null)
  );
  return schedules.filter((row) => {
    const deskId = ptaScheduleRoundDeskId(row);
    return deskId != null && deskIds.has(deskId);
  });
}

function blankFinalist(seat: {
  playerId: number;
  name: string;
  color: string;
}): StandingRow {
  return { ...emptyStanding(seat.playerId, seat.name, seat.color), hidePoints: true };
}

/** Kész döntő: mind a négy ülésnek van helyezése. Különben null. */
function completedFinalRanking(
  roundIds: number[],
  opts: {
    roundDesks: Record<string, unknown>[];
    schedules: Record<string, unknown>[];
    playerName: (playerId: number) => string;
    includePlayer?: (playerId: number) => boolean;
  }
): Array<{ playerId: number; position: number; name: string; color: string }> | null {
  const seats = schedulesOnRounds(roundIds, opts.roundDesks, opts.schedules);
  if (seats.length !== PLAYERS_PER_DESK) return null;
  const ranked = seats.map((row) => {
    const playerId = ptaSchedulePlayerId(row);
    const position = tablePosition(row);
    if (playerId == null || position == null) return null;
    return {
      playerId,
      position,
      name: opts.playerName(playerId),
      color: ptaSeatColorFromRow(row),
    };
  });
  if (ranked.some((row) => row == null)) return null;
  return (ranked as Array<{ playerId: number; position: number; name: string; color: string }>)
    .filter((row) => !opts.includePlayer || opts.includePlayer(row.playerId))
    .sort((a, b) => a.position - b.position);
}

function finalRoundBoard(
  roundIds: number[],
  opts: {
    roundDesks: Record<string, unknown>[];
    schedules: Record<string, unknown>[];
    playerName: (playerId: number) => string;
    includePlayer?: (playerId: number) => boolean;
  }
): StandingRow[] {
  const done = completedFinalRanking(roundIds, opts);
  if (done) return done.map((seat) => blankFinalist(seat));
  return schedulesOnRounds(roundIds, opts.roundDesks, opts.schedules)
    .slice()
    .sort(compareSeatRowsByColor)
    .map((row) => {
      const playerId = ptaSchedulePlayerId(row);
      if (playerId == null || (opts.includePlayer && !opts.includePlayer(playerId))) return null;
      return blankFinalist({
        playerId,
        name: opts.playerName(playerId),
        color: ptaSeatColorFromRow(row),
      });
    })
    .filter((row): row is StandingRow => row != null);
}

function applyFinalOrder(
  preliminary: StandingRow[],
  ranking: Array<{ playerId: number; position: number; name: string; color: string }>
): StandingRow[] {
  const ids = new Set(ranking.map((row) => row.playerId));
  const top = [...ranking]
    .sort((a, b) => a.position - b.position)
    .map((seat) => blankFinalist(seat));
  return [...top, ...preliminary.filter((row) => !ids.has(row.playerId))];
}

/**
 * Összesítés: a döntő pontja nem adódik hozzá.
 * Ha a döntő sorrendje megvan, az 1–4. hely pont nélkül áll elöl.
 * Csak a döntő fordulót nézve a négy döntős látszik, pont nélkül.
 */
export function projectStandings(opts: {
  roundIds: number[];
  finalRoundIds: number[];
  rounds: Array<{ id: number; status: string }>;
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  playerName: (playerId: number) => string;
  includePlayer?: (playerId: number) => boolean;
  groupOf?: (playerId: number) => string;
}): StandingRow[] {
  const finals = new Set(opts.finalRoundIds);
  const requestedFinal = opts.roundIds.filter((id) => finals.has(id));
  const scoringIds = opts.roundIds.filter((id) => !finals.has(id));
  const onlyFinal = opts.roundIds.length > 0 && scoringIds.length === 0 && requestedFinal.length > 0;

  if (opts.groupOf) {
    const rows = scoringIds.length
      ? buildStandings({ ...opts, roundIds: scoringIds })
      : [];
    return aggregateStandings(rows, opts.groupOf);
  }

  if (onlyFinal) return finalRoundBoard(requestedFinal, opts);

  const base = scoringIds.length ? buildStandings({ ...opts, roundIds: scoringIds }) : [];
  if (!requestedFinal.length) return base;
  const ranking = completedFinalRanking(requestedFinal, opts);
  if (!ranking) return base;
  return applyFinalOrder(base, ranking);
}

export interface PlayerFinalTotals {
  playerId: number;
  FinalPoint: number | null;
  FinalTruckPoint: number | null;
  FinalPosition: number;
}

export function computePublishedPlayerFinals(opts: {
  rounds: Array<{ id: number; status: string; final?: boolean }>;
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  catalogHasPublished: boolean;
  playerName?: (playerId: number) => string;
  includePlayer?: (playerId: number) => boolean;
}): PlayerFinalTotals[] {
  const published = opts.rounds.filter((round) =>
    roundResultsReleased(round.status, opts.catalogHasPublished)
  );
  const finalIds = published.filter((round) => round.final).map((round) => round.id);
  const preliminaryIds = published.filter((round) => !round.final).map((round) => round.id);
  const playerName = opts.playerName || (() => '');
  const rows = preliminaryIds.length
    ? buildStandings({
        roundIds: preliminaryIds,
        rounds: opts.rounds,
        roundDesks: opts.roundDesks,
        schedules: opts.schedules,
        playerName,
        includePlayer: opts.includePlayer,
      })
    : [];
  const ranking = finalIds.length
    ? completedFinalRanking(finalIds, { ...opts, playerName })
    : null;
  if (!ranking) {
    return rows.map((row, index) => ({
      playerId: row.playerId,
      FinalPoint: row.resultPoint,
      FinalTruckPoint: row.onTrack,
      FinalPosition: standingPlace(rows, index),
    }));
  }
  const finalistIds = new Set(ranking.map((row) => row.playerId));
  const rest = rows.filter((row) => !finalistIds.has(row.playerId));
  return [
    ...ranking.map((row, index) => ({
      playerId: row.playerId,
      FinalPoint: null,
      FinalTruckPoint: null,
      FinalPosition: index + 1,
    })),
    ...rest.map((row, index) => ({
      playerId: row.playerId,
      FinalPoint: row.resultPoint,
      FinalTruckPoint: row.onTrack,
      FinalPosition: ranking.length + standingPlace(rest, index),
    })),
  ];
}
