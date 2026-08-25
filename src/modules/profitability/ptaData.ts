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
  const out: EventGroupingAttr[] = [];
  if (settings.OrganizationGrpFlg) {
    out.push({ key: 'organization', label: 'Szervezet', icon: 'sym_r_apartment' });
  }
  if (settings.TeamGrpFlg) {
    out.push({ key: 'team', label: 'Csapat', icon: 'sym_r_groups' });
  }
  if (settings.RegionGrpFlg) {
    out.push({ key: 'region', label: 'Régió', icon: 'sym_r_map' });
  }
  if (settings.CompanyGrpFlg) {
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
    const rowEventUserId = nullableNumericId(
      row.EventUserID ?? row.eventUserID ?? row.EventUserId
    );
    if (rowEventUserId != null && rowEventUserId === eventUserId) return row;
    const rowUserId = nullableNumericId(row.UserID ?? row.userID ?? row.UserId);
    if (userId != null && rowUserId != null && rowUserId === userId) return row;
  }
  return null;
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
        Point1: Number(row.Point1 ?? 10),
        Point2: Number(row.Point2 ?? 7),
        Point3: Number(row.Point3 ?? 5),
        Point4: Number(row.Point4 ?? 3),
        MaxParticipants: nullableNumericId(row.MaxParticipants ?? row.maxParticipants),
        OrganizationGrpFlg: isTruthyFlag(row.OrganizationGrpFlg),
        TeamGrpFlg: isTruthyFlag(row.TeamGrpFlg),
        RegionGrpFlg: isTruthyFlag(row.RegionGrpFlg),
        CompanyGrpFlg: isTruthyFlag(row.CompanyGrpFlg),
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

export function normalizePtaRows(rows: unknown[]): Record<string, unknown>[] {
  return asRows(rows);
}

export function normalizePtaEventPlayers(rows: unknown[]): PtaEventPlayer[] {
  return asRows(rows).map((row) => ({
    ...row,
    EventPlayerID: nullableNumericId(row.EventPlayerID ?? row.eventPlayerID ?? row.id),
    EventID: nullableNumericId(row.EventID ?? row.eventID ?? row.EventId),
    EventUserID: nullableNumericId(row.EventUserID ?? row.eventUserID ?? row.EventUserId),
    UserID: nullableNumericId(row.UserID ?? row.userID ?? row.UserId),
    FinalPoint: nullableDecimal(row.FinalPoint ?? row.finalPoint),
    FinalPosition: nullableNumericId(row.FinalPosition ?? row.finalPosition),
    FinalTruckPoint: nullableDecimal(row.FinalTruckPoint ?? row.finalTruckPoint),
  }));
}
