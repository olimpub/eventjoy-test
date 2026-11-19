import { nullableNumericId } from 'src/utils/apiPayload';
import { PTA_SEAT_COLORS, PTA_SEAT_DISPLAY_ORDER, PLAYERS_PER_DESK } from './drawEngine';
import {
  ptaEventRoundId,
  ptaRoundDeskId,
  ptaScheduleRoundDeskId,
  type PtaGameTypeRound,
} from './ptaData';
import { buildStandings, deskStatusOf, isClosedDeskStatus, isSettledRoundStatus } from './standings';

export function finalTemplateIdSet(templates: PtaGameTypeRound[]): Set<number> {
  return new Set(templates.filter((round) => round.FinalRoundFlg).map((round) => round.id));
}

export function eventRoundIsFinal(
  row: Record<string, unknown>,
  finalTemplateIds: Set<number>
): boolean {
  if (row.FinalRoundFlg === true || row.FinalRoundFlg === 1) return true;
  const templateId = nullableNumericId(row.RoundID ?? row.roundID);
  return templateId != null && finalTemplateIds.has(templateId);
}

export interface FinalSeatSpec {
  playerId: number;
  colorHex: string;
  colorIndex: number;
  seatNo: number;
}

export interface FinalSeatReady {
  ok: true;
  code: 'ready';
  eventRoundId: number;
  eventRoundDeskId: number;
  seats: FinalSeatSpec[];
  schedules: Record<string, unknown>[];
}

export interface FinalSeatBlocked {
  ok: false;
  code: 'no-final' | 'seated' | 'blocked';
  message: string;
}

export type FinalSeatPlan = FinalSeatReady | FinalSeatBlocked;

function qualifyCount(templates: PtaGameTypeRound[]): number {
  const preliminary = templates
    .filter((round) => !round.FinalRoundFlg)
    .sort((a, b) => a.OrderIndex - b.OrderIndex || a.id - b.id);
  const marked = preliminary[preliminary.length - 1]?.QualifyToNextRound;
  return marked != null && marked > 0 ? marked : PLAYERS_PER_DESK;
}

function nextScheduleId(schedules: Record<string, unknown>[]): number {
  let max = 0;
  for (const row of schedules) {
    const id = nullableNumericId(row.GameScheduleID ?? row.gameScheduleID ?? row.id);
    if (id != null && id > max) max = id;
  }
  return max + 1;
}

/** A döntő négy székének terve. Nem ír adatot. */
export function planFinalSeating(input: {
  templates: PtaGameTypeRound[];
  rounds: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  statusName: (round: Record<string, unknown>) => string;
  playerName: (playerId: number) => string;
  includePlayer?: (playerId: number) => boolean;
}): FinalSeatPlan {
  const finalIds = finalTemplateIdSet(input.templates);
  if (!finalIds.size) {
    return { ok: false, code: 'no-final', message: 'Ehhez a játéktípushoz nincs döntő.' };
  }

  const finalRounds = input.rounds.filter((row) => eventRoundIsFinal(row, finalIds));
  const finalRound = finalRounds[0];
  const eventRoundId = finalRound ? ptaEventRoundId(finalRound) : null;
  if (!finalRound || eventRoundId == null) {
    return { ok: false, code: 'no-final', message: 'A döntő forduló még nincs kisorsolva.' };
  }

  const finalDesks = input.roundDesks.filter((row) => ptaEventRoundId(row) === eventRoundId);
  const finalDesk = finalDesks[0];
  const eventRoundDeskId = finalDesk ? ptaRoundDeskId(finalDesk) : null;
  if (eventRoundDeskId == null) {
    return { ok: false, code: 'blocked', message: 'A döntő asztal hiányzik. Sorsolj újra.' };
  }

  const occupied = input.schedules.some(
    (row) => ptaScheduleRoundDeskId(row) === eventRoundDeskId
  );
  if (occupied) {
    return { ok: false, code: 'seated', message: 'A döntő már ki van sorsolva.' };
  }

  const spots = qualifyCount(input.templates);
  if (spots !== PLAYERS_PER_DESK) {
    return {
      ok: false,
      code: 'blocked',
      message: 'A döntő asztal 4 fős. A játéktípus továbbjutási létszáma nem 4.',
    };
  }

  const preliminary = input.rounds.filter((row) => !eventRoundIsFinal(row, finalIds));
  for (const round of preliminary) {
    const roundId = ptaEventRoundId(round);
    if (roundId == null) continue;
    const status = input.statusName(round);
    if (isSettledRoundStatus(status)) continue;
    const desks = input.roundDesks.filter((row) => ptaEventRoundId(row) === roundId);
    const ready =
      desks.length > 0 &&
      desks.every((desk) => isClosedDeskStatus(deskStatusOf(desk, status)));
    if (!ready) {
      return {
        ok: false,
        code: 'blocked',
        message: 'A döntő akkor sorsolható, ha az előző fordulók minden asztala le van zárva.',
      };
    }
  }

  const preliminaryIds = preliminary
    .map((row) => ptaEventRoundId(row))
    .filter((id): id is number => id != null);
  const ranked = buildStandings({
    roundIds: preliminaryIds,
    rounds: preliminary.map((row) => ({
      id: ptaEventRoundId(row) ?? 0,
      status: input.statusName(row),
    })),
    roundDesks: input.roundDesks,
    schedules: input.schedules,
    playerName: input.playerName,
    includePlayer: input.includePlayer,
  });
  if (ranked.length < spots) {
    return {
      ok: false,
      code: 'blocked',
      message: `A döntőhöz ${spots} játékos kell. Az elődöntő állásban ${ranked.length} fő van.`,
    };
  }

  let scheduleId = nextScheduleId(input.schedules);
  const qualifiers = ranked.slice(0, spots);
  const seats: FinalSeatSpec[] = [];
  const schedules: Record<string, unknown>[] = [];
  qualifiers.forEach((row, index) => {
    const colorHex = PTA_SEAT_DISPLAY_ORDER[index] || PTA_SEAT_COLORS[0];
    const colorIndex = PTA_SEAT_COLORS.findIndex(
      (item) => item.toUpperCase() === colorHex.toUpperCase()
    );
    const seatNo = index + 1;
    const seat: FinalSeatSpec = {
      playerId: row.playerId,
      colorHex,
      colorIndex: colorIndex >= 0 ? colorIndex : 0,
      seatNo,
    };
    seats.push(seat);
    const id = scheduleId;
    scheduleId += 1;
    schedules.push({
      GameScheduleID: id,
      id,
      EventRoundDeskID: eventRoundDeskId,
      PlayerID: row.playerId,
      ColorIndex: seat.colorIndex,
      ColorHex: colorHex,
      PlayColorHex: colorHex,
      SeatNo: seatNo,
      ActiveFlg: true,
    });
  });

  return { ok: true, code: 'ready', eventRoundId, eventRoundDeskId, seats, schedules };
}
