import { nullableNumericId } from 'src/utils/apiPayload';
import { PTA_SEAT_COLORS, PLAYERS_PER_DESK, seatPlayers } from './drawEngine';
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
  gameMasterUserIds: number[];
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

  const assignments = seatPlayers({
    players: drawPlayers,
    roundCount: input.templateRounds.length,
    deskCount,
  });

  const deskSeq = new IdSeq(maxRowId(input.remainingDesks, 'EventDeskID'));
  const roundSeq = new IdSeq(maxRowId(input.remainingRounds, 'EventRoundID'));
  const roundDeskSeq = new IdSeq(maxRowId(input.remainingRoundDesks, 'EventRoundDeskID'));
  const scheduleSeq = new IdSeq(maxRowId(input.remainingSchedules, 'GameScheduleID'));

  const desks = Array.from({ length: deskCount }, (_, index) => {
    const eventDeskId = deskSeq.next();
    const gm = input.gameMasterUserIds.length
      ? input.gameMasterUserIds[index % input.gameMasterUserIds.length]
      : null;
    return {
      EventDeskID: eventDeskId,
      id: eventDeskId,
      EventID: input.eventId,
      DeskNo: index + 1,
      DName: `${index + 1}. asztal`,
      GameMasterUserID: gm,
      ActiveFlg: true,
    } as Record<string, unknown>;
  });

  const rounds = input.templateRounds.map((template) => {
    const eventRoundId = roundSeq.next();
    return {
      EventRoundID: eventRoundId,
      id: eventRoundId,
      RoundID: template.id,
      EventRoundStatusID: input.drawnStatusId,
      NoOfDesks: deskCount,
      EventID: input.eventId,
      OrderIndex: template.OrderIndex,
      RName: template.RName,
      ActiveFlg: true,
    } as Record<string, unknown>;
  });

  const roundDesks: Record<string, unknown>[] = [];
  const schedules: Record<string, unknown>[] = [];

  rounds.forEach((round, roundIndex) => {
    const eventRoundId = Number(round.EventRoundID);
    const roundAssignments = assignments[roundIndex] || [];
    const roundDeskIdByDesk = new Map<number, number>();

    desks.forEach((desk, deskIndex) => {
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
