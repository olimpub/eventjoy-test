import { nullableNumericId } from 'src/utils/apiPayload';
import { useEventStore } from 'src/stores/event';
import {
  collectGroupingValues,
  listEnabledGroupingAttrs,
  ptaEventPlayerId,
  ptaEventRoundId,
  ptaRoundDeskId,
  ptaSchedulePlayerId,
  type EventGroupingKey,
  type PtaEventPlayer,
  type PtaEventSettings,
} from 'src/modules/profitability/ptaData';

export interface PtaDrawQuality {
  deskCount: number;
  roundCount: number;
  playerCount: number;
  reserveCount: number;
  playerRepeats: number;
  groupHits: number;
  deskRepeats: number;
  colorRepeats: number;
}

interface SeatOcc {
  roundId: number;
  deskId: number;
  playerId: number;
  colorIndex: number;
}

function extraVisits(count: number): number {
  return count > 1 ? count - 1 : 0;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function scoreDrawDuplicates(
  seats: SeatOcc[],
  playerGroups: Map<number, Partial<Record<EventGroupingKey, string>>>
): Pick<PtaDrawQuality, 'playerRepeats' | 'groupHits' | 'deskRepeats' | 'colorRepeats'> {
  const pairRounds = new Map<string, number>();
  const deskVisits = new Map<string, number>();
  const colorVisits = new Map<string, number>();
  let groupHits = 0;

  const byRoundDesk = new Map<string, SeatOcc[]>();
  for (const seat of seats) {
    const key = `${seat.roundId}:${seat.deskId}`;
    const list = byRoundDesk.get(key) || [];
    list.push(seat);
    byRoundDesk.set(key, list);

    const deskKey = `${seat.playerId}:d:${seat.deskId}`;
    deskVisits.set(deskKey, (deskVisits.get(deskKey) || 0) + 1);
    const colorKey = `${seat.playerId}:c:${seat.colorIndex}`;
    colorVisits.set(colorKey, (colorVisits.get(colorKey) || 0) + 1);
  }

  for (const table of byRoundDesk.values()) {
    for (let i = 0; i < table.length; i += 1) {
      for (let j = i + 1; j < table.length; j += 1) {
        const key = pairKey(table[i].playerId, table[j].playerId);
        pairRounds.set(key, (pairRounds.get(key) || 0) + 1);
      }
    }

    const byAttr = new Map<string, Map<string, number>>();
    for (const seat of table) {
      const groups = playerGroups.get(seat.playerId);
      if (!groups) continue;
      (Object.keys(groups) as EventGroupingKey[]).forEach((attr) => {
        const value = (groups[attr] || '').trim().toLowerCase();
        if (!value) return;
        const bucket = byAttr.get(attr) || new Map<string, number>();
        bucket.set(value, (bucket.get(value) || 0) + 1);
        byAttr.set(attr, bucket);
      });
    }
    for (const bucket of byAttr.values()) {
      for (const n of bucket.values()) {
        if (n >= 2) groupHits += (n * (n - 1)) / 2;
      }
    }
  }

  let playerRepeats = 0;
  for (const n of pairRounds.values()) playerRepeats += extraVisits(n);

  let deskRepeats = 0;
  for (const n of deskVisits.values()) deskRepeats += extraVisits(n);

  let colorRepeats = 0;
  for (const n of colorVisits.values()) colorRepeats += extraVisits(n);

  return { playerRepeats, groupHits, deskRepeats, colorRepeats };
}

function playerGroupsFromRows(
  players: PtaEventPlayer[],
  settings: PtaEventSettings | null
): Map<number, Partial<Record<EventGroupingKey, string>>> {
  const map = new Map<number, Partial<Record<EventGroupingKey, string>>>();
  if (!listEnabledGroupingAttrs(settings).length) return map;
  for (const row of players) {
    const id = ptaEventPlayerId(row);
    if (id == null) continue;
    const groups = collectGroupingValues([row as Record<string, unknown>], settings);
    map.set(id, groups);
  }
  return map;
}

export function summarizePtaDraw(eventId: number | string): PtaDrawQuality | null {
  const store = useEventStore();
  const desks = store.getPtaDesksForEvent(eventId);
  const rounds = store.getPtaRoundsForEvent(eventId);
  if (!desks.length || !rounds.length) return null;

  const roundDesks = store.getPtaRoundDesksForEvent(eventId);
  const schedules = store.getPtaSchedulesForEvent(eventId);
  const players = store.getPtaPlayersForEvent(eventId);
  const settings = store.getPtaSettingsForEvent(eventId);

  const roundDeskMeta = new Map<number, { roundId: number; deskId: number }>();
  for (const row of roundDesks) {
    const rdId = ptaRoundDeskId(row);
    const roundId = ptaEventRoundId(row);
    const deskId = nullableNumericId(row.EventDeskID);
    if (rdId == null || roundId == null || deskId == null) continue;
    roundDeskMeta.set(rdId, { roundId, deskId });
  }

  const seats: SeatOcc[] = [];
  for (const row of schedules) {
    const rdId = ptaRoundDeskId(row);
    const playerId = ptaSchedulePlayerId(row);
    if (rdId == null || playerId == null) continue;
    const meta = roundDeskMeta.get(rdId);
    if (!meta) continue;
    seats.push({
      roundId: meta.roundId,
      deskId: meta.deskId,
      playerId,
      colorIndex: Number(row.ColorIndex ?? 0),
    });
  }

  const dup = scoreDrawDuplicates(seats, playerGroupsFromRows(players, settings));
  const seatedIds = new Set(seats.map((s) => s.playerId));

  return {
    deskCount: desks.length,
    roundCount: rounds.length,
    playerCount: seatedIds.size,
    reserveCount: players.filter((row) => row.ReserveFlg === true || row.ReserveFlg === 1).length,
    ...dup,
  };
}
