import { nullableNumericId } from 'src/utils/apiPayload';
import { PTA_SEAT_COLORS, PLAYERS_PER_DESK, seatPlayers } from './drawEngine';
import { scoreCountEnabled } from './ptaData';
import type { EventGroupingKey, PtaEventPlayer, PtaGameTypeRound } from './ptaData';

export interface PtaDrawPlayerDraft {
  eventUserId: number;
  userId: number | null;
  name: string;
  groups: Partial<Record<EventGroupingKey, string>>;
  existingPlayer: PtaEventPlayer | null;
}

export interface BuildPtaDrawInput {
  eventId: number;
  playing: PtaDrawPlayerDraft[];
  reserves: PtaDrawPlayerDraft[];
  templateRounds: PtaGameTypeRound[];
  drawnStatusId: number | null;
  remainingDesks: Record<string, unknown>[];
  remainingRounds: Record<string, unknown>[];
  remainingRoundDesks: Record<string, unknown>[];
  remainingSchedules: Record<string, unknown>[];
  allPlayers: PtaEventPlayer[];
}

export interface PtaDrawOk {
  ok: true;
  desks: Record<string, unknown>[];
  rounds: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  players: PtaEventPlayer[];
  schedules: Record<string, unknown>[];
  deskCount: number;
  roundCount: number;
  playerCount: number;
  reserveCount: number;
}

export interface PtaDrawFail {
  ok: false;
  message: string;
}

export type PtaDrawBuildResult = PtaDrawOk | PtaDrawFail;

class IdSeq {
  private n: number;
  constructor(start: number) {
    this.n = start;
  }
  next(): number {
    this.n += 1;
    return this.n;
  }
}

function maxRowId(rows: Record<string, unknown>[], ...keys: string[]): number {
  let max = 0;
  for (const row of rows || []) {
    const id = nullableNumericId(
      keys.reduce<unknown>((found, key) => found ?? row[key], undefined) ?? row.id ?? row.ID
    );
    if (id != null && id > max) max = id;
  }
  return max;
}

function groupingFields(groups: Partial<Record<EventGroupingKey, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  if (groups.team) out.TeamName = groups.team;
  if (groups.company) out.CompanyName = groups.company;
  if (groups.organization) out.OrganizationName = groups.organization;
  if (groups.region) out.RegionName = groups.region;
  return out;
}

function toPlayerRow(
  draft: PtaDrawPlayerDraft,
  eventId: number,
  reserve: boolean,
  playerSeq: IdSeq
): PtaEventPlayer {
  const existingId = nullableNumericId(
    draft.existingPlayer?.EventPlayerID ??
      draft.existingPlayer?.eventPlayerID ??
      draft.existingPlayer?.id
  );
  const eventPlayerId = existingId ?? playerSeq.next();
  return {
    ...(draft.existingPlayer || {}),
    EventPlayerID: eventPlayerId,
    id: eventPlayerId,
    EventID: eventId,
    EventUserID: draft.eventUserId,
    UserID: draft.userId,
    ActiveFlg: true,
    ReserveFlg: reserve,
    Name: draft.name,
    DisplayName: draft.name,
    FinalPoint: draft.existingPlayer?.FinalPoint ?? null,
    FinalPosition: draft.existingPlayer?.FinalPosition ?? null,
    FinalTruckPoint: draft.existingPlayer?.FinalTruckPoint ?? null,
    ScoreCountFlg: scoreCountEnabled(draft.existingPlayer),
    ...groupingFields(draft.groups),
  };
}

export function buildPtaDraw(input: BuildPtaDrawInput): PtaDrawBuildResult {
  const deskCount = Math.floor(input.playing.length / PLAYERS_PER_DESK);
  if (input.templateRounds.length < 1) {
    return { ok: false, message: 'Nincs játéktípus-forduló a sorsoláshoz.' };
  }
  if (deskCount < 1) {
    return { ok: false, message: 'Legalább 4 belépett játékos kell a sorsoláshoz.' };
  }

  const seated = input.playing.slice(0, deskCount * PLAYERS_PER_DESK);
  const extraReserves = input.playing.slice(deskCount * PLAYERS_PER_DESK);
  const reserves = [...input.reserves, ...extraReserves];

  const playerSeq = new IdSeq(maxRowId(input.allPlayers, 'EventPlayerID'));
  const seatedRows = seated.map((draft) => toPlayerRow(draft, input.eventId, false, playerSeq));
  const reserveRows = reserves.map((draft) => toPlayerRow(draft, input.eventId, true, playerSeq));
  const playerRows = [...seatedRows, ...reserveRows];

  const idByEventUser = new Map<number, number>();
  for (const row of seatedRows) {
    const eventUserId = nullableNumericId(row.EventUserID);
    const playerId = nullableNumericId(row.EventPlayerID);
    if (eventUserId != null && playerId != null) idByEventUser.set(eventUserId, playerId);
  }

  const drawPlayers = seated
    .map((draft) => {
      const id = idByEventUser.get(draft.eventUserId);
      return id != null ? { id, groups: draft.groups } : null;
    })
    .filter((row): row is { id: number; groups: Partial<Record<EventGroupingKey, string>> } => row != null);

  const orderedTemplates = [...input.templateRounds].sort(
    (a, b) => a.OrderIndex - b.OrderIndex || a.id - b.id
  );
  const preliminaryCount = orderedTemplates.filter((round) => !round.FinalRoundFlg).length;
  if (preliminaryCount < 1) {
    return { ok: false, message: 'Nincs elődöntő forduló a játéktípusban.' };
  }

  const assignments = seatPlayers({
    players: drawPlayers,
    roundCount: preliminaryCount,
    deskCount,
  });

  const deskSeq = new IdSeq(maxRowId(input.remainingDesks, 'EventDeskID'));
  const roundSeq = new IdSeq(maxRowId(input.remainingRounds, 'EventRoundID'));
  const roundDeskSeq = new IdSeq(maxRowId(input.remainingRoundDesks, 'EventRoundDeskID'));
  const scheduleSeq = new IdSeq(maxRowId(input.remainingSchedules, 'GameScheduleID'));

  const desks = Array.from({ length: deskCount }, (_, index) => {
    const eventDeskId = deskSeq.next();
    return {
      EventDeskID: eventDeskId,
      id: eventDeskId,
      EventID: input.eventId,
      DeskNumber: index + 1,
      DeskNo: index + 1,
      DName: `${index + 1}. asztal`,
      GameMasterUserID: null,
      ActiveFlg: true,
    } as Record<string, unknown>;
  });

  const rounds = orderedTemplates.map((template) => {
    const eventRoundId = roundSeq.next();
    const isFinal = template.FinalRoundFlg === true;
    return {
      EventRoundID: eventRoundId,
      id: eventRoundId,
      RoundID: template.id,
      EventRoundStatusID: input.drawnStatusId,
      NoOfDesks: isFinal ? 1 : deskCount,
      EventID: input.eventId,
      OrderIndex: template.OrderIndex,
      RName: template.RName,
      FinalRoundFlg: isFinal,
      ActiveFlg: true,
    } as Record<string, unknown>;
  });

  const roundDesks: Record<string, unknown>[] = [];
  const schedules: Record<string, unknown>[] = [];
  let preliminaryIndex = 0;

  rounds.forEach((round) => {
    const eventRoundId = Number(round.EventRoundID);
    const isFinal = round.FinalRoundFlg === true;
    const roundAssignments = isFinal ? [] : assignments[preliminaryIndex] || [];
    if (!isFinal) preliminaryIndex += 1;
    const roundDeskIdByDesk = new Map<number, number>();
    const desksForRound = isFinal ? desks.slice(0, 1) : desks;

    desksForRound.forEach((desk, deskIndex) => {
      const eventRoundDeskId = roundDeskSeq.next();
      roundDeskIdByDesk.set(deskIndex, eventRoundDeskId);
      roundDesks.push({
        EventRoundDeskID: eventRoundDeskId,
        id: eventRoundDeskId,
        EventRoundID: eventRoundId,
        EventDeskID: desk.EventDeskID,
        GameMasterUserID: desk.GameMasterUserID ?? null,
        SName: 'Kisorsolva',
        ActiveFlg: true,
      });
    });

    for (const seat of roundAssignments) {
      const eventRoundDeskId = roundDeskIdByDesk.get(seat.deskIndex);
      if (eventRoundDeskId == null) continue;
      const gameScheduleId = scheduleSeq.next();
      const colorHex = PTA_SEAT_COLORS[seat.colorIndex] || PTA_SEAT_COLORS[0];
      schedules.push({
        GameScheduleID: gameScheduleId,
        id: gameScheduleId,
        EventRoundDeskID: eventRoundDeskId,
        PlayerID: seat.playerId,
        ColorIndex: seat.colorIndex,
        ColorHex: colorHex,
        SeatNo: seat.colorIndex + 1,
        ActiveFlg: true,
      });
    }
  });

  return {
    ok: true,
    desks,
    rounds,
    roundDesks,
    players: playerRows,
    schedules,
    deskCount,
    roundCount: rounds.length,
    playerCount: seatedRows.length,
    reserveCount: reserveRows.length,
  };
}
