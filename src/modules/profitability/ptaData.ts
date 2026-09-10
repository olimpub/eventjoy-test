import { isTruthyFlag, nullableNumericId } from 'src/utils/apiPayload';

function asRows(rows: unknown[]): Record<string, unknown>[] {
  return (rows || []).filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
}

function nullableDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowId(row: Record<string, unknown>, ...keys: string[]): number | null {
  return nullableNumericId(
    keys.reduce<unknown>((found, key) => found ?? row[key], undefined) ??
      row.id ??
      row.ID ??
      row.Id
  );
}

/** EventTypes.PTAFlg */
export function eventTypeHasPtaFlag(eventType: Record<string, unknown> | null | undefined): boolean {
  if (!eventType) return false;
  return isTruthyFlag(eventType.PTAFlg ?? eventType.PtaFlg ?? eventType.ptaFlg);
}

export function eventTypeIdOf(event: Record<string, unknown> | null | undefined): number | null {
  if (!event) return null;
  const raw = event.EventTypeID ?? event.eventTypeId ?? event.EventTypeId;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface PtaGameType {
  id: number;
  GName: string;
  ActiveFlg: boolean;
}

export interface PtaGameTypeRound {
  id: number;
  GameTypeID: number | null;
  OrderIndex: number;
  RName: string;
  QualifyToNextRound: number | null;
  ResultsVisibleFlg: boolean;
  FinalRoundFlg: boolean;
  ActiveFlg: boolean;
}

export interface PtaPairMode {
  id: number;
  PName: string;
  FixedGroupFlg: boolean;
  SameGroupFlg: boolean;
  ActiveFlg: boolean;
}

export interface PtaEventRoundStatus {
  id: number;
  SName: string;
  ActiveFlg: boolean;
}

export interface PtaExtraPrize {
  id: number;
  PName: string;
  ActiveFlg: boolean;
}

export interface PtaChampionship {
  id: number;
  CName: string;
  CDescription: string;
  FromDate: string | null;
  ToDate: string | null;
  MultiLocatonFlg: boolean;
  LocationID: number | null;
  ActiveFlg: boolean;
}

export interface PtaEventSettings {
  EventID: number;
  ChampinshipID: number | null;
  GameTypeID: number;
  PairModeID: number;
  Category: number;
  Point1: number;
  Point2: number;
  Point3: number;
  Point4: number;
  MaxParticipants: number | null;
  OrganizationGrpFlg: boolean;
  TeamGrpFlg: boolean;
  RegionGrpFlg: boolean;
  CompanyGrpFlg: boolean;
  PhotoUploadMadatoryFlg: boolean;
  ExtraPrizeFlg: boolean;
  ShowUserPositionFlg: boolean;
}

/** PTA.tblEventPlayer — userdata EventPlayers result set */
export interface PtaEventPlayer {
  EventPlayerID: number | null;
  EventID: number | null;
  EventUserID: number | null;
  UserID: number | null;
  ActiveFlg?: boolean | number;
  ReserveFlg?: boolean | number;
  Name?: string;
  DisplayName?: string;
  FirstName?: string;
  LastName?: string;
  TeamName?: string;
  CompanyName?: string;
  OrganizationName?: string;
  RegionName?: string;
  FinalPoint: number | null;
  FinalPosition: number | null;
  FinalTruckPoint: number | null;
  [key: string]: unknown;
}

export type EventGroupingKey = 'organization' | 'team' | 'region' | 'company';

export interface EventGroupingAttr {
  key: EventGroupingKey;
  label: string;
  icon: string;
}

const GROUPING_VALUE_KEYS: Record<EventGroupingKey, string[]> = {
  organization: [
    'OrganizationName',
    'organizationName',
    'OrganizationShortName',
    'OrgName',
  ],
  team: ['TeamName', 'teamName', 'Team', 'Csapat', 'GroupName'],
  region: ['RegionName', 'regionName', 'Region', 'StateOrRegion', 'Regio'],
  company: ['CompanyName', 'companyName', 'Company', 'Ceg', 'Cég'],
};

export function listEnabledGroupingAttrs(
  settings: PtaEventSettings | null | undefined
): EventGroupingAttr[] {
  if (!settings) return [];
  const raw = settings as unknown as Record<string, unknown>;
  const flagOn = (pascal: boolean, camel: string) => pascal || isTruthyFlag(raw[camel]);
  const out: EventGroupingAttr[] = [];
  if (flagOn(settings.OrganizationGrpFlg, 'organizationGrpFlg')) {
    out.push({ key: 'organization', label: 'Szervezet', icon: 'sym_r_apartment' });
  }
  if (flagOn(settings.TeamGrpFlg, 'teamGrpFlg')) {
    out.push({ key: 'team', label: 'Csapat', icon: 'sym_r_groups' });
  }
  if (flagOn(settings.RegionGrpFlg, 'regionGrpFlg')) {
    out.push({ key: 'region', label: 'Régió', icon: 'sym_r_map' });
  }
  if (flagOn(settings.CompanyGrpFlg, 'companyGrpFlg')) {
    out.push({ key: 'company', label: 'Cég', icon: 'sym_r_domain' });
  }
  return out;
}

export function pickGroupingText(
  source: Record<string, unknown> | null | undefined,
  key: EventGroupingKey
): string {
  if (!source) return '';
  for (const field of GROUPING_VALUE_KEYS[key]) {
    const raw = source[field];
    if (raw == null || raw === '') continue;
    const text = String(raw).trim();
    if (text) return text;
  }
  return '';
}

export function collectGroupingValues(
  sources: Array<Record<string, unknown> | null | undefined>,
  settings: PtaEventSettings | null | undefined
): Partial<Record<EventGroupingKey, string>> {
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    if (source) Object.assign(merged, source);
  }
  const out: Partial<Record<EventGroupingKey, string>> = {};
  for (const attr of listEnabledGroupingAttrs(settings)) {
    const text = pickGroupingText(merged, attr.key);
    if (text && text !== '—') out[attr.key] = text;
  }
  return out;
}

export function ptaEventUserId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  return nullableNumericId(row.EventUserID ?? row.eventUserID ?? row.EventUserId);
}

/** EventPlayer PK. A GET gyakran `PlayerID`-t vagy EventUser `id`-t küld. */
export function ptaEventPlayerId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  const eventUserId = ptaEventUserId(row);
  const explicit = nullableNumericId(
    row.EventPlayerID ?? row.eventPlayerID ?? row.PlayerID ?? row.playerID
  );
  const fromId = nullableNumericId(row.id ?? row.ID ?? row.Id);
  if (explicit != null && explicit !== eventUserId) return explicit;
  if (fromId != null && fromId !== eventUserId) return fromId;
  return explicit ?? fromId;
}

export function ptaEventRoundId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  return nullableNumericId(row.EventRoundID ?? row.eventRoundID ?? row.EventRoundId);
}

export function ptaEventDeskId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  return nullableNumericId(
    row.EventDeskID ?? row.eventDeskID ?? row.EventDeskId ?? row.DeskID ?? row.deskID
  );
}

export function ptaRoundDeskId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  const deskId = ptaEventDeskId(row);
  const explicit = nullableNumericId(
    row.EventRoundDeskID ??
      row.eventRoundDeskID ??
      row.RoundDeskID ??
      row.roundDeskID
  );
  if (explicit != null && explicit !== deskId) return explicit;
  const fromId = nullableNumericId(row.id ?? row.ID ?? row.Id);
  if (fromId != null && fromId !== deskId) return fromId;
  return explicit;
}

/** GameSchedule.EventRoundDeskID — soha ne a GameScheduleID (`id`). */
export function ptaScheduleRoundDeskId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  return nullableNumericId(
    row.EventRoundDeskID ?? row.eventRoundDeskID ?? row.RoundDeskID ?? row.roundDeskID
  );
}

/** GameSchedule.PlayerID = EventPlayerID; a GET néha EventUserID-t küld. */
export function ptaSchedulePlayerId(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  return nullableNumericId(row.PlayerID ?? row.playerID ?? row.EventPlayerID ?? row.eventPlayerID);
}

/** EventRoundDesk / GameSchedule sorok a kiválasztott EventRound.id-re. */
export function ptaRoundDesksForEventRound(
  roundId: number | null,
  roundDesks: Record<string, unknown>[],
  schedules: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (roundId == null || !roundDesks.length) return [];
  const direct = roundDesks.filter((row) => {
    const id =
      ptaEventRoundId(row) ?? nullableNumericId(row.RoundId ?? row.roundId);
    return id === roundId;
  });
  if (direct.length) return direct;

  const deskIds = new Set<number>();
  for (const row of schedules) {
    if (ptaEventRoundId(row) !== roundId) continue;
    const id = ptaScheduleRoundDeskId(row) ?? ptaEventDeskId(row);
    if (id != null) deskIds.add(id);
  }
  if (deskIds.size) {
    const joined = roundDesks.filter((row) => {
      const rd = ptaRoundDeskId(row);
      const desk = ptaEventDeskId(row);
      return (rd != null && deskIds.has(rd)) || (desk != null && deskIds.has(desk));
    });
    if (joined.length) return joined;
  }

  if (roundDesks.every((row) => ptaEventRoundId(row) == null)) return roundDesks;
  return [];
}

export function bindSchedulesToRoundDesk(
  rd: Record<string, unknown>,
  schedules: Record<string, unknown>[],
  roundDesksInRound: Record<string, unknown>[]
): Record<string, unknown>[] {
  const rdId = ptaRoundDeskId(rd);
  const direct = schedules.filter((row) => ptaScheduleRoundDeskId(row) === rdId);
  if (direct.length) return direct;

  const deskId = ptaEventDeskId(rd);
  const roundId = ptaEventRoundId(rd);
  const byDesk = schedules.filter((row) => {
    const rowDesk = ptaEventDeskId(row);
    const rowRound = ptaEventRoundId(row);
    if (deskId == null || rowDesk !== deskId) return false;
    return rowRound == null || rowRound === roundId;
  });
  if (byDesk.length) return byDesk;

  const matchedIds = new Set<number>();
  for (const other of roundDesksInRound) {
    const oid = ptaRoundDeskId(other);
    if (oid == null) continue;
    if (schedules.some((row) => ptaScheduleRoundDeskId(row) === oid)) matchedIds.add(oid);
  }
  const leftoverGroups = new Map<number, Record<string, unknown>[]>();
  for (const row of schedules) {
    const sid = ptaScheduleRoundDeskId(row);
    if (sid == null || matchedIds.has(sid)) continue;
    const list = leftoverGroups.get(sid) || [];
    list.push(row);
    leftoverGroups.set(sid, list);
  }
  const leftoverDesks = roundDesksInRound
    .filter((other) => {
      const oid = ptaRoundDeskId(other);
      return oid == null || !matchedIds.has(oid);
    })
    .sort((a, b) => ptaDeskNumber(a) - ptaDeskNumber(b));
  const leftoverList = [...leftoverGroups.entries()].sort((a, b) => a[0] - b[0]);
  const idx = leftoverDesks.findIndex((other) => other === rd);
  if (idx < 0) return [];
  return leftoverList[idx]?.[1] || [];
}

export function findPtaScheduleForDeskSeat(
  rd: Record<string, unknown> | null | undefined,
  schedules: Record<string, unknown>[],
  roundDesksInRound: Record<string, unknown>[],
  playerId: number
): Record<string, unknown> | null {
  if (playerId == null) return null;
  if (rd) {
    const bound = bindSchedulesToRoundDesk(rd, schedules, roundDesksInRound);
    const hit = bound.find((row) => ptaSchedulePlayerId(row) === playerId);
    if (hit) return hit;
  }
  const rdId = ptaRoundDeskId(rd);
  return (
    schedules.find(
      (row) => ptaScheduleRoundDeskId(row) === rdId && ptaSchedulePlayerId(row) === playerId
    ) || null
  );
}

export function findPtaPlayerForEventUser(
  players: PtaEventPlayer[],
  eventId: string | number,
  eventUserId: number,
  userId: number | null
): PtaEventPlayer | null {
  const eventKey = String(eventId);
  for (const row of players || []) {
    const rowEvent = String(row.EventID ?? row.eventID ?? row.EventId ?? '');
    if (rowEvent && rowEvent !== eventKey) continue;
    const rowEventUserId = ptaEventUserId(row);
    if (rowEventUserId != null && rowEventUserId === eventUserId) return row;
    const rowUserId = nullableNumericId(row.UserID ?? row.userID ?? row.UserId);
    if (userId != null && rowUserId != null && rowUserId === userId) return row;
  }
  return null;
}

export function findPtaPlayerByRef(
  players: PtaEventPlayer[],
  eventId: string | number | null,
  refId: number | null
): PtaEventPlayer | null {
  if (refId == null) return null;
  const eventKey = eventId == null || eventId === '' ? null : String(eventId);
  const inEvent = (row: PtaEventPlayer) => {
    const rowEvent = String(row.EventID ?? row.eventID ?? row.EventId ?? '');
    return !eventKey || !rowEvent || rowEvent === eventKey;
  };
  for (const row of players || []) {
    if (!inEvent(row)) continue;
    if (ptaEventPlayerId(row) === refId) return row;
  }
  for (const row of players || []) {
    if (!inEvent(row)) continue;
    if (ptaEventUserId(row) === refId) return row;
    if (nullableNumericId(row.UserID ?? row.userID ?? row.UserId) === refId) return row;
  }
  return null;
}

function pickPersonNamePart(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const raw = row[key];
    if (raw == null || raw === '') continue;
    const text = String(raw).trim();
    if (!text || text === 'Játékos') continue;
    return text;
  }
  return '';
}

export function ptaPersonDisplayName(row: Record<string, unknown> | null | undefined): string {
  if (!row) return '';
  const last = pickPersonNamePart(row, 'LastName', 'lastName', 'UserLastName');
  const first = pickPersonNamePart(row, 'FirstName', 'firstName', 'UserFirstName');
  const display = pickPersonNamePart(
    row,
    'DisplayName',
    'PlayerDisplayName',
    'PlayerName',
    'FullName',
    'UserName',
    'Name',
    'NickName'
  );
  return [last, first].filter(Boolean).join(' ') || display;
}

/**
 * Ülőhely / játékos név.
 *
 * Join lánc (balról jobbra, első nem üres nyer):
 *   GameSchedule.PlayerID
 *     → EventPlayer.EventPlayerID | EventUserID | UserID
 *     → EventPlayer.Name / DisplayName / FirstName+LastName / UserFirstName+UserLastName
 *     → EventUser.id = EventPlayer.EventUserID  (EventParticpants, EventUsers, directory)
 *     → User.FirstName + User.LastName
 *     → GameSchedule denormalizált Name / PlayerName / FirstName+LastName
 */
export function resolvePtaPlayerDisplayName(
  player: PtaEventPlayer | null | undefined,
  people: Array<Record<string, unknown> | null | undefined>
): string {
  const fromPlayer = ptaPersonDisplayName(player as Record<string, unknown> | null | undefined);
  if (fromPlayer) return fromPlayer;
  const eventUserId = ptaEventUserId(player);
  const playerId = ptaEventPlayerId(player);
  const userId = nullableNumericId(player?.UserID ?? player?.userID);
  for (const row of people) {
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID);
    const rowEventUser = ptaEventUserId(row);
    const rowUser = nullableNumericId(row.UserID ?? row.userID);
    const rowPlayer = ptaEventPlayerId(row);
    const hit =
      (eventUserId != null && (id === eventUserId || rowEventUser === eventUserId)) ||
      (playerId != null && (id === playerId || rowPlayer === playerId)) ||
      (userId != null && (rowUser === userId || id === userId));
    if (!hit) continue;
    const name = ptaPersonDisplayName(row);
    if (name) return name;
  }
  return '';
}

export function resolvePtaSeatName(args: {
  playerId: number | null;
  players: PtaEventPlayer[];
  people: Array<Record<string, unknown> | null | undefined>;
  eventId?: string | number | null;
  schedule?: Record<string, unknown> | null;
}): string {
  if (args.playerId == null) return '—';
  const player = findPtaPlayerByRef(args.players, args.eventId ?? null, args.playerId);
  const fromGraph = resolvePtaPlayerDisplayName(player, args.people);
  if (fromGraph) return fromGraph;
  const fromSchedule = ptaPersonDisplayName(args.schedule);
  if (fromSchedule) return fromSchedule;
  const eu = args.people.find((row) => {
    if (!row) return false;
    const id = nullableNumericId(row.id ?? row.ID);
    return id === args.playerId || id === ptaEventUserId(player);
  });
  return ptaPersonDisplayName(eu) || 'Játékos';
}

export function stampPtaEventId(
  rows: Array<Record<string, unknown>>,
  eventId: number | string
): void {
  const n = Number(eventId);
  if (!Number.isFinite(n) || n <= 0) return;
  for (const row of rows || []) {
    if (nullableNumericId(row.EventID ?? row.eventID ?? row.EventId ?? row.eventId) == null) {
      row.EventID = n;
    }
  }
}

export function alignSchedulePlayerIds(
  players: PtaEventPlayer[],
  schedules: Record<string, unknown>[]
): void {
  const byEventPlayer = new Set<number>();
  const byEventUser = new Map<number, number>();
  const byUser = new Map<number, number>();
  for (const player of players || []) {
    const eventPlayerId = ptaEventPlayerId(player);
    if (eventPlayerId == null) continue;
    byEventPlayer.add(eventPlayerId);
    const eventUserId = ptaEventUserId(player);
    if (eventUserId != null) byEventUser.set(eventUserId, eventPlayerId);
    const userId = nullableNumericId(player.UserID ?? player.userID ?? player.UserId);
    if (userId != null) byUser.set(userId, eventPlayerId);
  }
  for (const row of schedules || []) {
    const raw = ptaSchedulePlayerId(row);
    if (raw == null) continue;
    if (byEventPlayer.has(raw)) {
      row.PlayerID = raw;
      continue;
    }
    const mapped = byEventUser.get(raw) ?? byUser.get(raw);
    if (mapped != null) row.PlayerID = mapped;
  }
}

export function mergePtaPlayerNames(
  incoming: PtaEventPlayer[],
  previous: PtaEventPlayer[]
): PtaEventPlayer[] {
  if (!incoming.length || !previous.length) return incoming;
  const prevByEu = new Map<number, PtaEventPlayer>();
  for (const row of previous) {
    const eventUserId = ptaEventUserId(row);
    if (eventUserId != null) prevByEu.set(eventUserId, row);
  }
  return incoming.map((row) => {
    if (ptaPersonDisplayName(row)) return row;
    const prev = ptaEventUserId(row) != null ? prevByEu.get(ptaEventUserId(row) as number) : null;
    if (!prev) return row;
    return {
      ...row,
      Name: prev.Name ?? row.Name,
      DisplayName: prev.DisplayName ?? prev.Name ?? row.DisplayName,
      FirstName: row.FirstName ?? prev.FirstName,
      LastName: row.LastName ?? prev.LastName,
      UserFirstName: row.UserFirstName ?? prev.UserFirstName,
      UserLastName: row.UserLastName ?? prev.UserLastName,
    };
  });
}

export function hydratePtaPlayerGraph(args: {
  eventId: number | string | null;
  desks: Record<string, unknown>[];
  rounds: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  players: PtaEventPlayer[];
  schedules: Record<string, unknown>[];
  prizes?: Record<string, unknown>[];
  previousPlayers?: PtaEventPlayer[];
  previousSchedules?: Record<string, unknown>[];
}): { players: PtaEventPlayer[]; schedules: Record<string, unknown>[] } {
  const key = args.eventId == null || args.eventId === '' ? null : args.eventId;
  if (key != null) {
    stampPtaEventId(args.desks, key);
    stampPtaEventId(args.rounds, key);
    stampPtaEventId(args.players, key);
    if (args.prizes) stampPtaEventId(args.prizes, key);
  }

  let players = args.players;
  const previousPlayers = args.previousPlayers || [];
  if (!players.length && previousPlayers.length) {
    players = previousPlayers.filter((row) => {
      if (key == null) return true;
      const rowEvent = String(row.EventID ?? row.eventID ?? row.EventId ?? '');
      return !rowEvent || rowEvent === String(key);
    });
  } else {
    players = mergePtaPlayerNames(players, previousPlayers);
  }

  let schedules = args.schedules;
  if (!schedules.length && args.previousSchedules?.length) {
    const newRdIds = new Set(
      (args.roundDesks || [])
        .map((row) => ptaRoundDeskId(row))
        .filter((id): id is number => id != null)
    );
    if (newRdIds.size) {
      const kept = args.previousSchedules.filter((row) => {
        const id = ptaScheduleRoundDeskId(row);
        return id != null && newRdIds.has(id);
      });
      if (kept.length) schedules = kept;
    }
  }

  alignSchedulePlayerIds(players, schedules);
  return { players, schedules };
}

export function normalizePtaGameTypes(rows: unknown[]): PtaGameType[] {
  return asRows(rows)
    .map((row) => ({
      ...row,
      id: rowId(row, 'GameTypeID') as number,
      GName: String(row.GName ?? row.gName ?? row.Name ?? ''),
      ActiveFlg: isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    }))
    .filter((row) => row.id != null && Number.isFinite(row.id));
}

export function normalizePtaGameTypeRounds(rows: unknown[]): PtaGameTypeRound[] {
  return asRows(rows)
    .map((row) => ({
      ...row,
      id: rowId(row, 'RoundID') as number,
      GameTypeID: nullableNumericId(row.GameTypeID ?? row.gameTypeID ?? row.GameTypeId),
      OrderIndex: Number(row.OrderIndex ?? row.orderIndex ?? 0),
      RName: String(row.RName ?? row.rName ?? row.Name ?? ''),
      QualifyToNextRound: nullableNumericId(row.QualifyToNextRound ?? row.qualifyToNextRound),
      ResultsVisibleFlg: isTruthyFlag(row.ResultsVisibleFlg ?? row.resultsVisibleFlg),
      FinalRoundFlg: isTruthyFlag(row.FinalRoundFlg ?? row.finalRoundFlg),
      ActiveFlg: isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    }))
    .filter((row) => row.id != null && Number.isFinite(row.id));
}

export function normalizePtaPairModes(rows: unknown[]): PtaPairMode[] {
  return asRows(rows)
    .map((row) => ({
      ...row,
      id: rowId(row, 'PairModeID') as number,
      PName: String(row.PName ?? row.pName ?? row.Name ?? ''),
      FixedGroupFlg: isTruthyFlag(row.FixedGroupFlg ?? row.fixedGroupFlg),
      SameGroupFlg: isTruthyFlag(row.SameGroupFlg ?? row.sameGroupFlg),
      ActiveFlg: isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    }))
    .filter((row) => row.id != null && Number.isFinite(row.id));
}

export function normalizePtaEventRoundStatuses(rows: unknown[]): PtaEventRoundStatus[] {
  return asRows(rows)
    .map((row) => ({
      ...row,
      id: rowId(row, 'EventRoundStatusID') as number,
      SName: String(row.SName ?? row.sName ?? row.Name ?? ''),
      ActiveFlg: isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    }))
    .filter((row) => row.id != null && Number.isFinite(row.id));
}

export function normalizePtaExtraPrizes(rows: unknown[]): PtaExtraPrize[] {
  return asRows(rows)
    .map((row) => ({
      ...row,
      id: rowId(row, 'PrizeID') as number,
      PName: String(row.PName ?? row.pName ?? row.Name ?? ''),
      ActiveFlg: isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    }))
    .filter((row) => row.id != null && Number.isFinite(row.id));
}

export function normalizePtaChampionships(rows: unknown[]): PtaChampionship[] {
  return asRows(rows)
    .map((row) => ({
      ...row,
      id: rowId(row, 'ChampionshipID') as number,
      CName: String(row.CName ?? row.cName ?? row.Name ?? ''),
      CDescription: String(row.CDescription ?? row.cDescription ?? row.Description ?? ''),
      FromDate: (row.FromDate ?? row.fromDate ?? null) as string | null,
      ToDate: (row.ToDate ?? row.toDate ?? null) as string | null,
      MultiLocatonFlg: isTruthyFlag(row.MultiLocatonFlg ?? row.MultiLocationFlg ?? row.multiLocatonFlg),
      LocationID: nullableNumericId(row.LocationID ?? row.locationID ?? row.LocationId),
      ActiveFlg: isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    }))
    .filter((row) => row.id != null && Number.isFinite(row.id));
}

export function normalizePtaEventSettings(rows: unknown[]): PtaEventSettings[] {
  return asRows(rows)
    .map((row) => {
      const eventId = nullableNumericId(row.EventID ?? row.eventID ?? row.EventId);
      const gameTypeId = nullableNumericId(row.GameTypeID ?? row.gameTypeID ?? row.GameTypeId);
      const pairModeId = nullableNumericId(row.PairModeID ?? row.pairModeID ?? row.PairModeId);
      if (eventId == null || gameTypeId == null || pairModeId == null) return null;
      return {
        ...row,
        EventID: eventId,
        ChampinshipID: nullableNumericId(row.ChampinshipID ?? row.ChampionshipID ?? row.champinshipID),
        GameTypeID: gameTypeId,
        PairModeID: pairModeId,
        Category: Number(row.Category ?? 0),
        Point1: Number(row.Point1 ?? 8),
        Point2: Number(row.Point2 ?? 4),
        Point3: Number(row.Point3 ?? 2),
        Point4: Number(row.Point4 ?? 0),
        MaxParticipants: nullableNumericId(row.MaxParticipants ?? row.maxParticipants),
        OrganizationGrpFlg: isTruthyFlag(row.OrganizationGrpFlg ?? row.organizationGrpFlg),
        TeamGrpFlg: isTruthyFlag(row.TeamGrpFlg ?? row.teamGrpFlg),
        RegionGrpFlg: isTruthyFlag(row.RegionGrpFlg ?? row.regionGrpFlg),
        CompanyGrpFlg: isTruthyFlag(row.CompanyGrpFlg ?? row.companyGrpFlg),
        PhotoUploadMadatoryFlg: isTruthyFlag(row.PhotoUploadMadatoryFlg),
        ExtraPrizeFlg: isTruthyFlag(row.ExtraPrizeFlg),
        ShowUserPositionFlg:
          row.ShowUserPositionFlg == null && row.showUserPositionFlg == null
            ? true
            : isTruthyFlag(row.ShowUserPositionFlg ?? row.showUserPositionFlg),
      } as PtaEventSettings;
    })
    .filter((row): row is PtaEventSettings => row != null);
}

export function clearPtaGameMasterUserIds(rows: Record<string, unknown>[]): void {
  for (const row of rows) {
    row.GameMasterUserID = null;
    if ('gameMasterUserID' in row) row.gameMasterUserID = null;
  }
}

/**
 * A sorsolás nem oszt játékmestert. A GET-en maradt körbeosztást eldobjuk:
 * ha minden asztalnak van GM-je, vagy a fizikai asztal GM-je rá lett másolva.
 */
export function stripAutoAssignedGameMasters(
  desks: Record<string, unknown>[],
  roundDesks: Record<string, unknown>[]
): void {
  const deskGm = new Map<number, number>();
  for (const desk of desks) {
    const id = nullableNumericId(desk.EventDeskID ?? desk.id);
    const gm = nullableNumericId(desk.GameMasterUserID ?? desk.gameMasterUserID);
    if (id != null && gm != null) deskGm.set(id, gm);
  }
  clearPtaGameMasterUserIds(desks);

  for (const rd of roundDesks) {
    const deskId = nullableNumericId(rd.EventDeskID);
    const gm = nullableNumericId(rd.GameMasterUserID ?? rd.gameMasterUserID);
    const inherited = deskId != null ? deskGm.get(deskId) : undefined;
    if (inherited != null && gm === inherited) {
      rd.GameMasterUserID = null;
      if ('gameMasterUserID' in rd) rd.gameMasterUserID = null;
    }
  }

  if (
    roundDesks.length > 0 &&
    roundDesks.every((rd) => nullableNumericId(rd.GameMasterUserID ?? rd.gameMasterUserID) != null)
  ) {
    clearPtaGameMasterUserIds(roundDesks);
  }
}

export function attachPtaDeskNumbers(
  roundDesks: Record<string, unknown>[],
  desks: Record<string, unknown>[]
): void {
  if (!roundDesks.length || !desks.length) return;
  const byId = new Map<number, Record<string, unknown>>();
  for (const desk of desks) {
    const id = nullableNumericId(desk.EventDeskID ?? desk.id);
    if (id != null) byId.set(id, desk);
  }
  for (const rd of roundDesks) {
    if (ptaDeskNumber(rd)) continue;
    const desk = byId.get(ptaEventDeskId(rd) ?? -1);
    const n = ptaDeskNumber(desk);
    if (!n) continue;
    rd.DeskNumber = n;
    rd.DeskNo = n;
  }
}

export function ptaDeskNumber(row: Record<string, unknown> | null | undefined): number {
  if (!row) return 0;
  return (
    nullableNumericId(
      row.DeskNumber ?? row.deskNumber ?? row.DeskNo ?? row.deskNo ?? row.DeskNO
    ) ?? 0
  );
}

export function normalizePtaRows(rows: unknown[]): Record<string, unknown>[] {
  return asRows(rows).map((row) => {
    const eventId = nullableNumericId(row.EventID ?? row.eventID ?? row.EventId ?? row.eventId);
    const deskNumber = nullableNumericId(
      row.DeskNumber ?? row.deskNumber ?? row.DeskNo ?? row.deskNo ?? row.DeskNO
    );
    const eventRoundId = ptaEventRoundId(row);
    const eventDeskId = ptaEventDeskId(row);
    const next: Record<string, unknown> = { ...row };
    if (eventId != null) next.EventID = eventId;
    if (deskNumber != null) {
      next.DeskNumber = deskNumber;
      next.DeskNo = deskNumber;
    }
    if (eventRoundId != null) next.EventRoundID = eventRoundId;
    if (eventDeskId != null) next.EventDeskID = eventDeskId;
    return next;
  });
}

/** EventRoundDesk: GET camelCase / id PK / DeskID alias. */
export function normalizePtaRoundDesks(rows: unknown[]): Record<string, unknown>[] {
  return asRows(rows).map((row) => {
    const eventRoundId = ptaEventRoundId(row);
    const eventDeskId = ptaEventDeskId(row);
    const fromId = nullableNumericId(row.id ?? row.ID);
    const eventRoundDeskId = nullableNumericId(
      row.EventRoundDeskID ?? row.eventRoundDeskID ?? row.RoundDeskID ?? row.roundDeskID
    ) ?? (fromId != null && fromId !== eventDeskId ? fromId : null);
    const deskNumber = nullableNumericId(
      row.DeskNumber ?? row.deskNumber ?? row.DeskNo ?? row.deskNo
    );
    return {
      ...row,
      EventRoundDeskID: eventRoundDeskId,
      id: eventRoundDeskId ?? row.id,
      EventRoundID: eventRoundId,
      EventDeskID: eventDeskId,
      GameMasterUserID: nullableNumericId(row.GameMasterUserID ?? row.gameMasterUserID),
      ...(deskNumber != null ? { DeskNumber: deskNumber, DeskNo: deskNumber } : {}),
    };
  });
}

export function normalizePtaEventRounds(rows: unknown[]): Record<string, unknown>[] {
  return normalizePtaRows(rows).map((row) => {
    const eventRoundId = nullableNumericId(row.EventRoundID ?? row.eventRoundID ?? row.id);
    const order = nullableNumericId(row.OrderIndex ?? row.Order ?? row.RoundID ?? row.roundID);
    return {
      ...row,
      EventRoundID: eventRoundId,
      id: eventRoundId ?? row.id,
      OrderIndex: order ?? row.OrderIndex,
    };
  });
}

export function normalizePtaEventPlayers(rows: unknown[]): PtaEventPlayer[] {
  return asRows(rows).map((row) => {
    const eventUserId = ptaEventUserId(row);
    const firstName = pickPersonNamePart(row, 'FirstName', 'firstName', 'UserFirstName');
    const lastName = pickPersonNamePart(row, 'LastName', 'lastName', 'UserLastName');
    const name =
      pickPersonNamePart(
        row,
        'Name',
        'DisplayName',
        'PlayerDisplayName',
        'PlayerName',
        'FullName'
      ) || [lastName, firstName].filter(Boolean).join(' ');
    const eventPlayerId = ptaEventPlayerId({
      ...row,
      EventUserID: eventUserId,
    });
    return {
      ...row,
      EventPlayerID: eventPlayerId,
      id: eventPlayerId ?? row.id,
      EventID: nullableNumericId(row.EventID ?? row.eventID ?? row.EventId),
      EventUserID: eventUserId,
      UserID: nullableNumericId(row.UserID ?? row.userID ?? row.UserId),
      FirstName: firstName || row.FirstName,
      LastName: lastName || row.LastName,
      Name: name || row.Name,
      DisplayName: name || row.DisplayName,
      FinalPoint: nullableDecimal(row.FinalPoint ?? row.finalPoint),
      FinalPosition: nullableNumericId(row.FinalPosition ?? row.finalPosition),
      FinalTruckPoint: nullableDecimal(row.FinalTruckPoint ?? row.finalTruckPoint),
    };
  });
}
