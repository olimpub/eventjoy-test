import type { EventGroupingKey } from './ptaData';

/** Asztalonként a négy szín — piros, zöld, kék, sárga */
export const PTA_SEAT_COLORS = ['#FF6060', '#28C76F', '#2AA9FF', '#F2E74B'] as const;

export const PLAYERS_PER_DESK = 4;

export interface DrawPlayer {
  id: number;
  groups: Partial<Record<EventGroupingKey, string>>;
}

export interface SeatAssignment {
  playerId: number;
  deskIndex: number;
  colorIndex: number;
}

interface SeatSlot {
  deskIndex: number;
  colorIndex: number;
}

interface PlayerHistory {
  desks: number[];
  colors: number[];
  mates: Set<number>;
}

const COST_GROUP = 1000;
const COST_REPEAT_MATE = 200;
const COST_SAME_DESK = 80;
const COST_SAME_COLOR = 20;
const BONUS_STRIDE_DESK = 25;
const COST_DESK_NEAR = 6;

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Asztalugrás: 2 → 5 → 8 mintájára, coprime lépésköz ha lehet. */
export function deskStride(deskCount: number): number {
  if (deskCount <= 1) return 1;
  for (const candidate of [3, 2, 5, 4, 7, 1]) {
    if (candidate < deskCount && gcd(candidate, deskCount) === 1) return candidate;
  }
  for (let step = 1; step < deskCount; step += 1) {
    if (gcd(step, deskCount) === 1) return step;
  }
  return 1;
}

function circDist(a: number, b: number, n: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function groupHits(
  a: Partial<Record<EventGroupingKey, string>>,
  b: Partial<Record<EventGroupingKey, string>>
): number {
  let hits = 0;
  (Object.keys(a) as EventGroupingKey[]).forEach((key) => {
    const left = (a[key] || '').trim().toLowerCase();
    const right = (b[key] || '').trim().toLowerCase();
    if (left && right && left === right) hits += 1;
  });
  return hits;
}

function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function emptyHistory(): PlayerHistory {
  return { desks: [], colors: [], mates: new Set() };
}

function seatCost(
  player: DrawPlayer,
  slot: SeatSlot,
  occupants: DrawPlayer[],
  history: Map<number, PlayerHistory>,
  deskCount: number,
  stride: number
): number {
  const prev = history.get(player.id) || emptyHistory();
  let cost = 0;

  for (const other of occupants) {
    cost += groupHits(player.groups, other.groups) * COST_GROUP;
    if (prev.mates.has(other.id)) cost += COST_REPEAT_MATE;
  }

  const lastDesk = prev.desks.length ? prev.desks[prev.desks.length - 1] : null;
  if (lastDesk != null) {
    if (slot.deskIndex === lastDesk) cost += COST_SAME_DESK;
    const preferred = (lastDesk + stride) % deskCount;
    if (slot.deskIndex === preferred) cost -= BONUS_STRIDE_DESK;
    const maxDist = Math.floor(deskCount / 2);
    cost += (maxDist - circDist(slot.deskIndex, lastDesk, deskCount)) * COST_DESK_NEAR;
  }

  if (prev.colors.includes(slot.colorIndex)) cost += COST_SAME_COLOR;
  return cost;
}

function assignRound(
  players: DrawPlayer[],
  deskCount: number,
  history: Map<number, PlayerHistory>,
  stride: number
): SeatAssignment[] {
  const slots: SeatSlot[] = [];
  for (let deskIndex = 0; deskIndex < deskCount; deskIndex += 1) {
    for (let colorIndex = 0; colorIndex < PLAYERS_PER_DESK; colorIndex += 1) {
      slots.push({ deskIndex, colorIndex });
    }
  }

  const remaining = shuffle(slots);
  const byDesk = new Map<number, DrawPlayer[]>();
  const placed: SeatAssignment[] = [];

  for (const player of shuffle(players)) {
    let best: SeatSlot | null = null;
    let bestCost = Infinity;
    for (const slot of remaining) {
      const occupants = byDesk.get(slot.deskIndex) || [];
      const cost = seatCost(player, slot, occupants, history, deskCount, stride);
      if (cost < bestCost) {
        bestCost = cost;
        best = slot;
      }
    }
    if (!best) break;
    const idx = remaining.findIndex(
      (s) => s.deskIndex === best!.deskIndex && s.colorIndex === best!.colorIndex
    );
    if (idx >= 0) remaining.splice(idx, 1);
    const occupants = byDesk.get(best.deskIndex) || [];
    occupants.push(player);
    byDesk.set(best.deskIndex, occupants);
    placed.push({ playerId: player.id, deskIndex: best.deskIndex, colorIndex: best.colorIndex });
  }

  return placed;
}

function applyHistory(
  assignments: SeatAssignment[],
  players: DrawPlayer[],
  history: Map<number, PlayerHistory>
) {
  const byDesk = new Map<number, number[]>();
  for (const seat of assignments) {
    const list = byDesk.get(seat.deskIndex) || [];
    list.push(seat.playerId);
    byDesk.set(seat.deskIndex, list);
  }

  for (const seat of assignments) {
    const prev = history.get(seat.playerId) || emptyHistory();
    prev.desks.push(seat.deskIndex);
    prev.colors.push(seat.colorIndex);
    const mates = (byDesk.get(seat.deskIndex) || []).filter((id) => id !== seat.playerId);
    mates.forEach((id) => prev.mates.add(id));
    history.set(seat.playerId, prev);
  }
}

function roundScore(
  assignments: SeatAssignment[],
  players: DrawPlayer[],
  history: Map<number, PlayerHistory>,
  deskCount: number,
  stride: number
): number {
  const byId = new Map(players.map((p) => [p.id, p]));
  const byDesk = new Map<number, DrawPlayer[]>();
  for (const seat of assignments) {
    const player = byId.get(seat.playerId);
    if (!player) continue;
    const list = byDesk.get(seat.deskIndex) || [];
    list.push(player);
    byDesk.set(seat.deskIndex, list);
  }

  let total = 0;
  for (const seat of assignments) {
    const player = byId.get(seat.playerId);
    if (!player) continue;
    const occupants = (byDesk.get(seat.deskIndex) || []).filter((p) => p.id !== player.id);
    total += seatCost(
      player,
      { deskIndex: seat.deskIndex, colorIndex: seat.colorIndex },
      occupants,
      history,
      deskCount,
      stride
    );
  }
  return total;
}

/**
 * Fordulónkénti ültetés. Prioritás (ha lehet):
 * 1. azonos grouping érték ne üljön egy asztalnál
 * 2. ugyanazok az emberek ne üljenek újra együtt
 * 3. más asztal (2 → 5 → 8 lépésköz)
 * 4. más szín
 */
export function seatPlayers(args: {
  players: DrawPlayer[];
  roundCount: number;
  deskCount: number;
  attempts?: number;
}): SeatAssignment[][] {
  const { players, roundCount, deskCount } = args;
  const attempts = args.attempts ?? 80;
  const stride = deskStride(deskCount);
  if (!players.length || deskCount < 1 || roundCount < 1) return [];

  let best: SeatAssignment[][] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const history = new Map<number, PlayerHistory>();
    const rounds: SeatAssignment[][] = [];
    let score = 0;
    for (let r = 0; r < roundCount; r += 1) {
      const snapshot = new Map(
        [...history.entries()].map(([id, h]) => [
          id,
          { desks: h.desks.slice(), colors: h.colors.slice(), mates: new Set(h.mates) },
        ])
      );
      const assigned = assignRound(players, deskCount, snapshot, stride);
      score += roundScore(assigned, players, snapshot, deskCount, stride);
      applyHistory(assigned, players, history);
      rounds.push(assigned);
    }
    if (score < bestScore) {
      bestScore = score;
      best = rounds;
    }
  }

  return best;
}
