import { api } from 'src/boot/axios';
import { Notify } from 'quasar';
import { nullableNumericId, throwIfApiFailed } from 'src/utils/apiPayload';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { findPtaPlayerForEventUser, ptaDeskNumber, ptaEventPlayerId, ptaEventRoundId, ptaRoundDeskId, ptaSchedulePlayerId, ptaScheduleRoundDeskId } from 'src/modules/profitability/ptaData';
import { findEventStatusIdByNameHints } from 'src/utils/eventFlow';
import type { SignalRLiveRole } from 'src/utils/eventRoleNav';
import { recordSignalRInbound } from 'src/utils/signalrDebug';
import { ptaRoundStatusKind } from 'src/modules/profitability/standings';
import { ptaSeatColorFromRow, ptaSeatColorIndexFromRow } from 'src/modules/profitability/drawEngine';

/** POST /event/change → spChangeEvent(@Json) */
export interface EventChangePayload {
  EventID: number;
  Action: string;
  Payload: Record<string, unknown>;
}

export async function changeEvent(payload: EventChangePayload): Promise<void> {
  const response = await api.post('/event/change', payload);
  throwIfApiFailed(response.data, 'A módosítás sikertelen.');
}

export async function setEventUserStatus(args: {
  eventId: number;
  toStatusId: number;
  prevStatusId: number | null;
  eventUserId?: number | null;
  eventUserUid?: string | null;
  eventUserIds?: number[];
}): Promise<void> {
  const payload: Record<string, unknown> = {
    ToStatusID: args.toStatusId,
    PrevStatusID: args.prevStatusId,
  };
  if (args.eventUserIds && args.eventUserIds.length > 0) {
    payload.EventUserIDs = args.eventUserIds;
  } else if (args.eventUserUid) {
    payload.EventUserUID = args.eventUserUid;
  } else if (args.eventUserId != null) {
    payload.EventUserID = args.eventUserId;
  } else {
    throw new Error('Hiányzó EventUser.');
  }
  await changeEvent({
    EventID: args.eventId,
    Action: 'EventUser.SetStatus',
    Payload: payload,
  });
}

export async function setEventUserRating(args: {
  eventId: number;
  eventUserId: number;
  rating: number | null;
  ratingComment?: string | null;
}): Promise<void> {
  const comment = args.ratingComment?.trim() || null;
  const rating =
    args.rating != null && args.rating >= 1 && args.rating <= 5 ? Math.trunc(args.rating) : null;
  await changeEvent({
    EventID: args.eventId,
    Action: 'EventUser.SetRating',
    Payload: {
      EventUserID: args.eventUserId,
      Rating: rating,
      RatingComment: rating == null ? null : comment,
    },
  });
  useEventStore().applyEventUserRating(args.eventUserId, rating, rating == null ? null : comment);
}

export async function setEventStatus(args: {
  eventId: number;
  toStatusId: number;
  prevStatusId: number | null;
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Event.SetStatus',
    Payload: {
      ToStatusID: args.toStatusId,
      PrevStatusID: args.prevStatusId,
    },
  });
  const eventStore = useEventStore();
  eventStore.applyEventStatus(args.eventId, args.toStatusId, args.prevStatusId, false);
  eventStore.forgetLocalEventStatus(args.eventId);
}

export async function resetPtaEvent(args: {
  eventId: number;
  toStatusId: number;
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.Reset',
    Payload: {
      ToStatusID: args.toStatusId,
    },
  });
  const eventStore = useEventStore();
  eventStore.resetLocalPtaEvent(args.eventId, {
    toStatusId: args.toStatusId,
    persistLocal: false,
  });
}

function tempId(prefix: string, id: number): string {
  return `${prefix}${id}`;
}

export async function replacePtaDraw(eventId: number): Promise<void> {
  const eventStore = useEventStore();
  const desks = eventStore.getPtaDesksForEvent(eventId);
  const rounds = eventStore.getPtaRoundsForEvent(eventId);
  const roundDesks = eventStore.getPtaRoundDesksForEvent(eventId);
  const players = eventStore.getPtaPlayersForEvent(eventId);
  const schedules = eventStore.getPtaSchedulesForEvent(eventId);
  if (!desks.length || !rounds.length) {
    throw new Error('Nincs sorsolás a mentéshez.');
  }

  await changeEvent({
    EventID: eventId,
    Action: 'Pta.ReplaceDraw',
    Payload: {
      Desks: desks.map((row) => {
        const id = nullableNumericId(row.EventDeskID ?? row.id) ?? 0;
        const deskNumber = ptaDeskNumber(row);
        return {
          TempId: tempId('d', id),
          DeskNumber: deskNumber,
          DeskNo: deskNumber,
          DName: String(row.DName ?? `${deskNumber}. asztal`),
          GameMasterUserID: null,
          ActiveFlg: true,
        };
      }),
      Rounds: rounds.map((row) => {
        const id = nullableNumericId(row.EventRoundID ?? row.id) ?? 0;
        return {
          TempId: tempId('r', id),
          RoundID: nullableNumericId(row.RoundID),
          EventRoundStatusID: nullableNumericId(row.EventRoundStatusID),
          NoOfDesks: Number(row.NoOfDesks ?? desks.length),
          OrderIndex: Number(row.OrderIndex ?? 0),
          RName: String(row.RName ?? ''),
          ActiveFlg: true,
        };
      }),
      RoundDesks: roundDesks.map((row) => {
        const id = ptaRoundDeskId(row) ?? 0;
        const deskId = nullableNumericId(row.EventDeskID) ?? 0;
        const roundId = ptaEventRoundId(row) ?? 0;
        return {
          TempId: tempId('rd', id),
          DeskTempId: tempId('d', deskId),
          RoundTempId: tempId('r', roundId),
          GameMasterUserID: null,
          SName: String(row.SName ?? 'Kisorsolva'),
          ActiveFlg: true,
        };
      }),
      Players: players.map((row) => {
        const id = ptaEventPlayerId(row) ?? 0;
        return {
          TempId: tempId('p', id),
          EventUserID: nullableNumericId(row.EventUserID),
          UserID: nullableNumericId(row.UserID),
          ReserveFlg: row.ReserveFlg === true || row.ReserveFlg === 1,
          Name: String(row.Name ?? row.DisplayName ?? ''),
          TeamName: row.TeamName ?? null,
          CompanyName: row.CompanyName ?? null,
          OrganizationName: row.OrganizationName ?? null,
          RegionName: row.RegionName ?? null,
          ActiveFlg: true,
        };
      }),
      Schedules: schedules.map((row) => {
        const id = nullableNumericId(row.GameScheduleID ?? row.id) ?? 0;
        const roundDeskId = ptaScheduleRoundDeskId(row) ?? 0;
        const playerId = ptaSchedulePlayerId(row) ?? 0;
        const colorIndex = ptaSeatColorIndexFromRow(row);
        return {
          TempId: tempId('s', id),
          RoundDeskTempId: tempId('rd', roundDeskId),
          PlayerTempId: tempId('p', playerId),
          ColorIndex: colorIndex,
          ColorHex: ptaSeatColorFromRow(row),
          SeatNo: Number(row.SeatNo ?? row.seatNo ?? colorIndex + 1),
          ActiveFlg: true,
        };
      }),
    },
  });
}

export async function claimPtaDesk(args: {
  eventId: number;
  eventRoundDeskId: number;
  gameMasterUserId: number | null;
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.ClaimDesk',
    Payload: {
      EventRoundDeskID: args.eventRoundDeskId,
      GameMasterUserID: args.gameMasterUserId,
    },
  });
}

export type PtaDeskSeatResult = {
  playerId: number;
  amount: number | null;
  onTrack: number | null;
  position: number | null;
  resultPoint: number | null;
};

export async function setPtaDeskResults(args: {
  eventId: number;
  eventRoundDeskId: number;
  seats: PtaDeskSeatResult[];
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.SetDeskResults',
    Payload: {
      EventRoundDeskID: args.eventRoundDeskId,
      Seats: args.seats.map((seat) => ({
        PlayerID: seat.playerId,
        Amount: seat.amount,
        OnTrack: seat.onTrack,
        Position: seat.position,
        ResultPoint: seat.resultPoint,
      })),
    },
  });
}

export async function patchPtaDesk(args: {
  eventId: number;
  eventRoundDeskId: number;
  sName?: string | null;
  photoUrl?: string | null;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    EventRoundDeskID: args.eventRoundDeskId,
  };
  const sName = String(args.sName || '').trim();
  if (sName) payload.SName = sName;
  const photoUrl = String(args.photoUrl || '').trim();
  if (photoUrl && !photoUrl.startsWith('data:')) payload.PhotoUrl = photoUrl;
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.PatchDesk',
    Payload: payload,
  });
}

export async function setPtaRoundStatus(args: {
  eventId: number;
  eventRoundId: number;
  toStatusId: number;
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.SetRoundStatus',
    Payload: {
      EventRoundID: args.eventRoundId,
      ToStatusID: args.toStatusId,
    },
  });
}

export async function closePtaRound(args: {
  eventId: number;
  eventRoundId: number;
  toStatusId: number;
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.CloseRound',
    Payload: {
      EventRoundID: args.eventRoundId,
      ToStatusID: args.toStatusId,
    },
  });
}

export async function publishPtaRound(args: {
  eventId: number;
  eventRoundId: number;
  toStatusId: number;
}): Promise<void> {
  await changeEvent({
    EventID: args.eventId,
    Action: 'Pta.PublishRound',
    Payload: {
      EventRoundID: args.eventRoundId,
      ToStatusID: args.toStatusId,
    },
  });
}

export const SIGNALR_LIVE_ACTIONS = [
  'EventUser.SetStatus',
  'Event.SetStatus',
  'EventUser.Apply',
  'EventUser.Remove',
  'Pta.ReplaceDraw',
  'Pta.SetRoundStatus',
  'Pta.CloseRound',
  'Pta.PublishRound',
  'Pta.SetDeskResults',
  'Pta.ClaimDesk',
  'Pta.PatchDesk',
  'Pta.Reset',
  'Pta.ShowDisplay',
] as const;

export interface LiveChangeContext {
  eventId?: number | null;
  eventUserId?: number | null;
  /** Join role group: organizer / contributor / participant. */
  roleName?: SignalRLiveRole | null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function notifyTicketScanSuccess() {
  Notify.create({
    message: 'Sikeres jegyolvasás',
    color: 'dark',
    textColor: 'green-4',
    icon: 'sym_r_check_circle',
    position: 'top',
    timeout: 2400,
    classes: 'ej-notify',
  });
}

function asDrawSource(payload: Record<string, unknown>): Record<string, unknown> {
  let drawData: unknown = payload.DrawData ?? payload.drawData;
  if (typeof drawData === 'string') {
    try {
      drawData = JSON.parse(drawData);
    } catch {
      drawData = null;
    }
  }
  return asRecord(drawData) || payload;
}

function eventHasPtaDraw(eventId: number): boolean {
  const eventStore = useEventStore();
  return (
    eventStore.getPtaDesksForEvent(eventId).length > 0 ||
    eventStore.getPtaRoundsForEvent(eventId).length > 0
  );
}

/** SignalR ReplaceDraw gyakran ping / dump nélkül jön. A GET userdata a forrás. */
function reloadPtaDrawFromUserdata(eventId: number, eventUserId: number): void {
  const eventStore = useEventStore();
  void (async () => {
    try {
      await eventStore.loadEventUserDataSheet(eventUserId);
      if (eventHasPtaDraw(eventId)) return;
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 400);
      });
      await eventStore.loadEventUserDataSheet(eventUserId);
    } catch {
      /* következő adatlap-nyitás GET-el */
    }
  })();
}

function applyLivePtaReplaceDraw(eventId: number, payload: Record<string, unknown>) {
  const src = asDrawSource(payload);
  const desks = asArray(src.Desks ?? src.desks);
  const rounds = asArray(src.Rounds ?? src.rounds);
  const roundDesks = asArray(src.RoundDesks ?? src.roundDesks);
  const players = asArray(src.Players ?? src.players);
  const schedules = asArray(src.Schedules ?? src.schedules);
  const explicit =
    src.Desks != null ||
    src.desks != null ||
    Array.isArray(src.Rounds) ||
    Array.isArray(src.rounds) ||
    src.RoundDesks != null ||
    src.roundDesks != null;
  if (!explicit && !desks.length && !rounds.length && !roundDesks.length) return;
  useEventStore().applyPtaDrawSnapshot(eventId, {
    desks: desks as Record<string, unknown>[],
    rounds: rounds as Record<string, unknown>[],
    roundDesks: roundDesks as Record<string, unknown>[],
    players: players as never[],
    schedules: schedules as Record<string, unknown>[],
  });
}

function applyLiveDeskResults(eventId: number, payload: Record<string, unknown>) {
  const eventStore = useEventStore();
  const roundDeskId = nullableNumericId(
    payload.EventRoundDeskID ?? payload.eventRoundDeskID ?? payload.RoundDeskID ?? payload.roundDeskID
  );
  if (roundDeskId == null) return;

  const seatsRaw = asArray(payload.Seats ?? payload.seats);
  const resultsRaw = asArray(payload.Results ?? payload.results);
  const seats: Array<{
    playerId: number;
    amount: number | null;
    onTrack: number | null;
    position: number | null;
    resultPoint: number | null;
  }> = [];

  for (const item of seatsRaw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const playerId = nullableNumericId(rec.PlayerID ?? rec.playerID ?? rec.EventPlayerID);
    if (playerId == null) continue;
    seats.push({
      playerId,
      amount: nullableNumericId(rec.Amount ?? rec.amount),
      onTrack: nullableNumericId(rec.OnTrack ?? rec.onTrack),
      position: nullableNumericId(rec.Position ?? rec.position ?? rec.Rank),
      resultPoint: nullableNumericId(rec.ResultPoint ?? rec.resultPoint ?? rec.Score),
    });
  }

  for (const item of resultsRaw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const eventUserId = nullableNumericId(rec.EventUserID ?? rec.eventUserID);
    const mappedPlayer =
      eventUserId != null
        ? findPtaPlayerForEventUser(eventStore.ptaEventPlayers, eventId, eventUserId, null)
        : null;
    const playerId =
      nullableNumericId(rec.PlayerID ?? rec.playerID ?? rec.EventPlayerID) ??
      nullableNumericId(mappedPlayer?.EventPlayerID ?? mappedPlayer?.id);
    if (playerId == null) continue;
    seats.push({
      playerId,
      amount: nullableNumericId(rec.Amount ?? rec.amount),
      onTrack: nullableNumericId(rec.OnTrack ?? rec.onTrack),
      position: nullableNumericId(rec.Rank ?? rec.rank ?? rec.Position),
      resultPoint: nullableNumericId(rec.Score ?? rec.score ?? rec.ResultPoint),
    });
  }

  if (seats.length) {
    eventStore.applyDeskSeatResults(eventId, roundDeskId, seats);
  }
  const sName = String(payload.SName ?? payload.sName ?? payload.DeskStatus ?? '').trim();
  if (sName) {
    eventStore.applyEventRoundDeskPatch(eventId, roundDeskId, { SName: sName });
  }
}

/** PublishRound személyes csatorna: saját Seat + Player. A mini státusz JSON-ban ezek nincsenek. */
function hasPersonalPublishReveal(payload: Record<string, unknown>): boolean {
  return Boolean(asRecord(payload.Seat ?? payload.seat) || asRecord(payload.Player ?? payload.player));
}

function applyLivePublishedSeat(eventId: number, payload: Record<string, unknown>) {
  const eventStore = useEventStore();
  const seat = asRecord(payload.Seat ?? payload.seat);
  if (seat) {
    const roundDeskId = nullableNumericId(
      seat.EventRoundDeskID ?? seat.eventRoundDeskID ?? payload.EventRoundDeskID
    );
    const playerId = nullableNumericId(seat.PlayerID ?? seat.playerID ?? seat.EventPlayerID);
    if (roundDeskId != null && playerId != null) {
      eventStore.applyDeskSeatResults(eventId, roundDeskId, [
        {
          playerId,
          amount: nullableNumericId(seat.Amount ?? seat.amount),
          onTrack: nullableNumericId(seat.OnTrack ?? seat.onTrack),
          position: nullableNumericId(seat.Position ?? seat.position),
          resultPoint: nullableNumericId(seat.ResultPoint ?? seat.resultPoint),
        },
      ]);
    }
  }
  const player = asRecord(payload.Player ?? payload.player);
  if (player) {
    eventStore.applyPtaPlayerFinals(eventId, {
      eventPlayerId: nullableNumericId(player.EventPlayerID ?? player.eventPlayerID ?? player.id),
      finalPoint: nullableNumericId(player.FinalPoint ?? player.finalPoint),
      finalTruckPoint: nullableNumericId(player.FinalTruckPoint ?? player.finalTruckPoint),
      finalPosition: nullableNumericId(player.FinalPosition ?? player.finalPosition),
    });
  }
}

function applyLiveRoundStatusChange(
  eventId: number | null,
  payload: Record<string, unknown>,
  opts: { revealToPlayer: boolean; reloadSheet: boolean; context?: LiveChangeContext }
): { roundId: number; toId: number | null } | null {
  const roundId = nullableNumericId(
    payload.EventRoundID ?? payload.eventRoundID ?? payload.RoundID ?? payload.roundID
  );
  const toId = nullableNumericId(payload.ToStatusID ?? payload.toStatusID);
  if (roundId == null) return null;
  const master = useMasterDataStore();
  const statusName = toId != null ? master.getPtaEventRoundStatusById(toId)?.SName : '';
  const eventStore = useEventStore();
  eventStore.applyEventRoundStatus(roundId, toId, statusName || null);
  if (opts.revealToPlayer && eventId != null) {
    applyLivePublishedSeat(eventId, payload);
  }
  if (opts.reloadSheet) {
    const sheetId = opts.context?.eventUserId;
    if (sheetId != null) {
      void eventStore.loadEventUserDataSheet(sheetId).catch(() => undefined);
    }
  }
  return { roundId, toId };
}

/** SignalR body = change API JSON, vagy csak a Payload. */
export function parseChangeMessage(
  actionHint: string,
  raw: unknown,
  fallbackEventId?: number | null
): EventChangePayload | null {
  let data: unknown = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const rec = asRecord(data);
  if (!rec) return null;

  const nested = asRecord(rec.Payload) || asRecord(rec.payload);
  const payload = nested || rec;
  const action = String(
    rec.Action ??
      rec.action ??
      rec.EventName ??
      rec.eventName ??
      payload.Action ??
      payload.action ??
      payload.EventName ??
      actionHint ??
      ''
  ).trim();
  const eventId =
    nullableNumericId(rec.EventID ?? rec.eventID ?? rec.EventId) ??
    nullableNumericId(payload.EventID ?? payload.eventID ?? payload.EventId) ??
    fallbackEventId ??
    null;
  if (!action) return null;
  return {
    EventID: eventId ?? 0,
    Action: action,
    Payload: payload,
  };
}

function payloadKeyList(payload: Record<string, unknown>): string {
  return Object.keys(payload).slice(0, 16).join(',');
}

function resolveLiveEventStatusId(payload: Record<string, unknown>): number | null {
  const direct = nullableNumericId(
    payload.ToStatusID ?? payload.toStatusID ?? payload.EventStatusID ?? payload.eventStatusID
  );
  if (direct != null) return direct;
  const name = String(
    payload.ToStatusName ??
      payload.toStatusName ??
      payload.EventStatusName ??
      payload.eventStatusName ??
      payload.SName ??
      payload.sName ??
      payload.Name ??
      ''
  ).trim();
  if (!name) return null;
  return findEventStatusIdByNameHints(useMasterDataStore().eventStatuses, [name]);
}

export function applyLiveChange(
  actionHint: string,
  raw: unknown,
  fallbackEventId?: number | null,
  context?: LiveChangeContext
): void {
  const msg = parseChangeMessage(actionHint, raw, fallbackEventId);
  if (!msg) {
    recordSignalRInbound({
      method: actionHint,
      action: '',
      eventId: fallbackEventId ?? context?.eventId ?? null,
      toStatusId: null,
      applied: false,
      note: `parse failed; type=${typeof raw}`,
    });
    return;
  }
  const eventStore = useEventStore();
  const eventId = nullableNumericId(msg.EventID) ?? fallbackEventId ?? context?.eventId ?? null;
  const inbound = (applied: boolean, note: string, toStatusId: number | null = null) => {
    recordSignalRInbound({
      method: actionHint,
      action: msg.Action,
      eventId,
      toStatusId,
      applied,
      note,
    });
  };

  if (msg.Action === 'EventUser.SetStatus') {
    eventStore.applyEventUserChangePayload(msg.Payload, false);
    const toId = nullableNumericId(msg.Payload.ToStatusID ?? msg.Payload.toStatusID);
    inbound(true, `keys=${payloadKeyList(msg.Payload)}`, toId);
    return;
  }

  if (msg.Action === 'Event.SetStatus') {
    const toId = resolveLiveEventStatusId(msg.Payload);
    if (eventId == null || toId == null) {
      inbound(
        false,
        `skip eventId=${eventId} toId=${toId} keys=${payloadKeyList(msg.Payload)}`
      );
      return;
    }
    const prevId = nullableNumericId(msg.Payload.PrevStatusID ?? msg.Payload.prevStatusID);
    const before = eventStore.events.find(
      (e: { id?: unknown; ID?: unknown }) => String(e.id) === String(eventId) || String(e.ID ?? '') === String(eventId)
    ) as { EventStatusID?: unknown; eventStatusID?: unknown } | undefined;
    eventStore.applyEventStatus(eventId, toId, prevId, false);
    const after = eventStore.events.find(
      (e: { id?: unknown; ID?: unknown }) => String(e.id) === String(eventId) || String(e.ID ?? '') === String(eventId)
    ) as { EventStatusID?: unknown; eventStatusID?: unknown } | undefined;
    inbound(
      true,
      `EventStatusID ${String(before?.EventStatusID ?? before?.eventStatusID ?? '?')}→${String(after?.EventStatusID ?? after?.eventStatusID ?? toId)} hit=${Boolean(after)}`,
      toId
    );
    return;
  }

  if (msg.Action === 'EventUser.Apply') {
    if (eventId == null) {
      inbound(false, 'skip missing EventID');
      return;
    }
    eventStore.applyEventUserApply(eventId, msg.Payload);
    inbound(true, `keys=${payloadKeyList(msg.Payload)}`);
    return;
  }

  if (msg.Action === 'EventUser.Remove') {
    const id = nullableNumericId(msg.Payload.EventUserID ?? msg.Payload.eventUserID);
    if (id != null) eventStore.removeEventUserLive(id);
    inbound(id != null, `EventUserID=${id}`);
    return;
  }

  if (msg.Action === 'Pta.ReplaceDraw') {
    if (eventId == null) {
      inbound(false, 'skip missing EventID');
      return;
    }
    const sheetId = context?.eventUserId ?? null;
    if (sheetId != null) {
      reloadPtaDrawFromUserdata(eventId, sheetId);
      inbound(true, 'userdata GET after ReplaceDraw');
      return;
    }
    applyLivePtaReplaceDraw(eventId, msg.Payload);
    inbound(true, `keys=${payloadKeyList(msg.Payload)}`);
    return;
  }

  if (msg.Action === 'Pta.SetRoundStatus' || msg.Action === 'Pta.CloseRound' || msg.Action === 'Pta.PublishRound') {
    const master = useMasterDataStore();
    const toId = nullableNumericId(msg.Payload.ToStatusID ?? msg.Payload.toStatusID);
    const statusName = toId != null ? master.getPtaEventRoundStatusById(toId)?.SName : '';
    const kind =
      msg.Action === 'Pta.CloseRound'
        ? 'close'
        : msg.Action === 'Pta.PublishRound'
          ? 'publish'
          : ptaRoundStatusKind(statusName || '');
    const personalReveal = kind === 'publish' && hasPersonalPublishReveal(msg.Payload);
    const applied = applyLiveRoundStatusChange(eventId, msg.Payload, {
      revealToPlayer: personalReveal,
      reloadSheet: personalReveal,
      context,
    });
    if (!applied) {
      inbound(false, `skip missing RoundID keys=${payloadKeyList(msg.Payload)}`);
      return;
    }
    inbound(true, `${msg.Action} round=${applied.roundId} kind=${kind}`, applied.toId);
    return;
  }

  if (msg.Action === 'Pta.SetDeskResults') {
    if (eventId == null) {
      inbound(false, 'skip missing EventID');
      return;
    }
    if (context?.roleName === 'participant') {
      inbound(false, 'skip unpublished desk results for player');
      return;
    }
    applyLiveDeskResults(eventId, msg.Payload);
    inbound(true, `keys=${payloadKeyList(msg.Payload)}`);
    void import('src/modules/profitability/ptaDisplayApi').then((mod) => {
      mod.emitPtaDeskDisplayDirty(eventId);
    });
    return;
  }

  if (msg.Action === 'Pta.ClaimDesk') {
    if (eventId == null) {
      inbound(false, 'skip missing EventID');
      return;
    }
    const roundDeskId = nullableNumericId(
      msg.Payload.EventRoundDeskID ?? msg.Payload.eventRoundDeskID ?? msg.Payload.RoundDeskID
    );
    if (roundDeskId == null) {
      inbound(false, `skip missing RoundDeskID keys=${payloadKeyList(msg.Payload)}`);
      return;
    }
    const gmId = nullableNumericId(
      msg.Payload.GameMasterUserID ?? msg.Payload.gameMasterUserID ?? msg.Payload.GameMasterID
    );
    eventStore.setDeskGameMaster(eventId, roundDeskId, gmId);
    inbound(true, `desk=${roundDeskId}`);
    return;
  }

  if (msg.Action === 'Pta.PatchDesk') {
    if (eventId == null) {
      inbound(false, 'skip missing EventID');
      return;
    }
    const roundDeskId = nullableNumericId(
      msg.Payload.EventRoundDeskID ?? msg.Payload.eventRoundDeskID ?? msg.Payload.RoundDeskID
    );
    if (roundDeskId == null) {
      inbound(false, `skip missing RoundDeskID keys=${payloadKeyList(msg.Payload)}`);
      return;
    }
    const photoUrl = String(msg.Payload.PhotoUrl ?? msg.Payload.photoUrl ?? '').trim();
    const sName = String(msg.Payload.SName ?? msg.Payload.sName ?? '').trim();
    const patch: Record<string, unknown> = {};
    if (photoUrl) {
      patch.PhotoUrl = photoUrl;
      patch.AzurePhotoUrl = photoUrl;
    }
    if (sName) patch.SName = sName;
    eventStore.applyEventRoundDeskPatch(eventId, roundDeskId, patch);
    inbound(true, `desk=${roundDeskId}`);
    void import('src/modules/profitability/ptaDisplayApi').then((mod) => {
      mod.emitPtaDeskDisplayDirty(eventId);
    });
    return;
  }

  if (msg.Action === 'Pta.Reset') {
    if (eventId == null) {
      inbound(false, 'skip missing EventID');
      return;
    }
    const toId = nullableNumericId(msg.Payload.ToStatusID ?? msg.Payload.toStatusID);
    eventStore.resetLocalPtaEvent(eventId, { toStatusId: toId, persistLocal: false });
    inbound(true, `reset to=${toId}`, toId);
    return;
  }

  if (msg.Action === 'Pta.ShowDisplay') {
    void import('src/modules/profitability/ptaDisplayApi').then((mod) => {
      mod.emitPtaShowDisplayPing(
        { ...msg, ...msg.Payload },
        eventId
      );
    });
    inbound(true, `display ${String(msg.Payload.State ?? '')}`);
    return;
  }

  inbound(false, `unhandled action; keys=${payloadKeyList(msg.Payload)}`);
}
