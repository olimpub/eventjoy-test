import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { hasDatasetKey, nullableNumericId, pickDataset, pickFilledDataset, unwrapApiPayload, warnIfDatasetMissing } from 'src/utils/apiPayload';
import { eventUserUidsMatch, normalizeEventUserUid } from 'src/utils/eventUserQr';
import { membershipRoleKind, pickDisplayEventUser, type MembershipRoleKind } from 'src/utils/eventUserStatus';
import {
  attachPtaDeskNumbers,
  collectGroupingValues,
  findPtaPlayerForEventUser,
  findPtaScheduleForDeskSeat,
  hydratePtaPlayerGraph,
  normalizePtaEventPlayers,
  ptaPersonDisplayName,
  normalizePtaEventRounds,
  normalizePtaEventSettings,
  normalizePtaRoundDesks,
  normalizePtaRows,
  ptaDeskNumber,
  ptaEventDeskId,
  ptaEventRoundId,
  ptaRoundDeskId,
  ptaSchedulePlayerId,
  ptaScheduleRoundDeskId,
  stripAutoAssignedGameMasters,
  type PtaEventPlayer,
  type PtaEventSettings,
} from 'src/modules/profitability/ptaData';
import { buildPtaDraw, type PtaDrawBuildResult } from 'src/modules/profitability/buildPtaDraw';
import { PLAYERS_PER_DESK, normalizePtaSchedules } from 'src/modules/profitability/drawEngine';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';
import {
  catalogHasPublishedStatus,
  computePublishedPlayerFinals,
} from 'src/modules/profitability/standings';
import {
  eventUserStatusColor,
  eventUserStatusName,
  eventUserStatusNameLooksInvited,
  findEventUserStatus,
  isInviteDecisionStatusId,
} from 'src/utils/eventUserFlow';
import { normalizeEventPrograms, type EventProgram } from 'src/utils/eventProgram';
import { useMasterDataStore, ORGANIZER_ROLE_TYPE_ID } from './masterData';

/** GetEventData RS: EventUsers — a belépett user saját sorai */
export interface EventUser {
  id: number;
  EventID: number;
  EventRoleID: number | null;
  EventTicketID: number | null;
  InvoiceID: number | null;
  EventUserStatusID: number | null;
  UserID: number | null;
  /** Uniqueidentifier — QR / deep link később; userdata URL továbbra is numeric id */
  EventUserUID: string | null;
  /** Előző státusz — visszavonás, ha ki van töltve */
  PrevEventUserStatusID: number | null;
  /** 1–5, vagy null ha még nincs értékelés — GET /event/data + userdata */
  Rating: number | null;
  RatingComment: string | null;
  [key: string]: unknown;
}

/** spGetEventUserDataSheet RS5 EventParticpants — EventUser + User mezők */
export interface EventParticipant extends EventUser {
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  PhoneNumber: string | null;
}

export interface EventUserScreenContext {
  requestEventUserId: number | null;
  eventId: number | null;
  requesterRoleCode: string;
  requesterRoleName: string;
  dataSheetType: number | null;
}

/** RoleTypeID = 1 → szervezői adatlap */
export const ORGANIZER_DATASHEET_TYPE = 1;

function rowNullableRating(row: Record<string, unknown>): number | null {
  const raw = row.Rating ?? row.rating;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const rating = Math.trunc(n);
  if (rating < 1 || rating > 5) return null;
  return rating;
}

function rowNumericId(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = row[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function rowNullableString(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const raw = row[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const s = String(raw).trim();
    if (s && s !== 'null' && s !== 'undefined') return s;
  }
  return null;
}

function normalizeEvents(rows: unknown[]): any[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const id = rowNumericId(row, 'id', 'ID', 'Id');
      return {
        ...row,
        id,
        EventTypeID: nullableNumericId(row.EventTypeID ?? row.eventTypeID ?? row.EventTypeId),
        EventStatusID: nullableNumericId(row.EventStatusID ?? row.eventStatusID ?? row.EventStatusId),
        PrevEventStatusID: nullableNumericId(
          row.PrevEventStatusID ?? row.prevEventStatusID ?? row.PrevEventStatusId
        ),
        PendingApprovalID: nullableNumericId(
          row.PendingApprovalID ?? row.pendingApprovalID ?? row.PendingApprovalId
        ),
        EventImageUrl: rowNullableString(row, 'EventImageUrl', 'eventImageUrl'),
        EventUID: rowNullableString(row, 'EventUID', 'EventUid', 'eventUid'),
        ContactOrganizerID: nullableNumericId(
          row.ContactOrganizerID ?? row.contactOrganizerID ?? row.ContactOrganizerId
        ),
        ContactName: rowNullableString(row, 'ContactName', 'contactName'),
        ContactEmail: rowNullableString(row, 'ContactEmail', 'contactEmail'),
        ContactPhone: rowNullableString(row, 'ContactPhone', 'contactPhone'),
      };
    })
    .filter((row) => row.id !== undefined);
}

function normalizeEventUsers(rows: unknown[]): EventUser[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const id = rowNumericId(row, 'id', 'ID', 'Id');
      const eventId = rowNumericId(row, 'EventID', 'eventID', 'EventId');
      return {
        ...row,
        id: id as number,
        EventID: eventId as number,
        EventRoleID: nullableNumericId(row.EventRoleID ?? row.eventRoleID ?? row.EventRoleId),
        EventTicketID: nullableNumericId(
          row.EventTicketID ?? row.eventTicketID ?? row.EventTicketId
        ),
        InvoiceID: nullableNumericId(row.InvoiceID ?? row.invoiceID ?? row.InvoiceId),
        EventUserStatusID: nullableNumericId(
          row.EventUserStatusID ?? row.eventUserStatusID ?? row.EventUserStatusId
        ),
        UserID: nullableNumericId(row.UserID ?? row.userID ?? row.UserId),
        EventUserUID: String(row.EventUserUID ?? row.eventUserUID ?? row.EventUserUid ?? '').trim() || null,
        PrevEventUserStatusID: nullableNumericId(
          row.PrevEventUserStatusID ??
            row.prevEventUserStatusID ??
            row.PrevEventUserStatusId
        ),
        Rating: rowNullableRating(row),
        RatingComment: rowNullableString(row, 'RatingComment', 'ratingComment'),
      };
    })
    .filter((row) => row.id !== undefined && row.EventID !== undefined);
}

function normalizeTickets(rows: unknown[]): any[] {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const id = rowNumericId(row, 'id', 'ID', 'Id');
      return {
        ...row,
        id,
        TemplateID: nullableNumericId(row.TemplateID ?? row.templateID ?? row.TemplateId),
      };
    })
    .filter((row) => row.id !== undefined);
}

function normalizeEventParticipants(rows: unknown[]): EventParticipant[] {
  return normalizeEventUsers(rows).map((row) => ({
    ...row,
    FirstName: String(row.FirstName ?? row.firstName ?? ''),
    LastName: String(row.LastName ?? row.lastName ?? ''),
    EmailAddress: String(row.EmailAddress ?? row.emailAddress ?? row.Email ?? ''),
    PhoneNumber: (row.PhoneNumber ?? row.phoneNumber ?? row.Phone ?? null) as string | null,
  }));
}

function participantFromPtaPlayer(
  row: Record<string, unknown>,
  eventId: number
): EventParticipant | null {
  const eventUserId = nullableNumericId(row.EventUserID ?? row.eventUserID ?? row.EventUserId);
  const playerId = nullableNumericId(row.EventPlayerID ?? row.id);
  const id = eventUserId ?? playerId;
  if (id == null) return null;
  const composed = ptaPersonDisplayName(row);
  const last = String(row.LastName ?? row.lastName ?? row.UserLastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? row.UserFirstName ?? '').trim();
  const parts = composed.split(/\s+/).filter(Boolean);
  return {
    ...row,
    id,
    EventID: nullableNumericId(row.EventID ?? row.eventID ?? row.EventId) ?? eventId,
    EventRoleID: nullableNumericId(row.EventRoleID ?? row.eventRoleID ?? row.EventRoleId),
    EventTicketID: nullableNumericId(row.EventTicketID ?? row.eventTicketID ?? row.EventTicketId),
    InvoiceID: nullableNumericId(row.InvoiceID ?? row.invoiceID ?? row.InvoiceId),
    EventUserStatusID: nullableNumericId(
      row.EventUserStatusID ?? row.eventUserStatusID ?? row.EventUserStatusId
    ),
    UserID: nullableNumericId(row.UserID ?? row.userID ?? row.UserId),
    EventUserUID: String(row.EventUserUID ?? row.eventUserUID ?? '').trim() || null,
    PrevEventUserStatusID: nullableNumericId(row.PrevEventUserStatusID),
    Rating: rowNullableRating(row),
    RatingComment: rowNullableString(row, 'RatingComment', 'ratingComment'),
    FirstName: first || parts.slice(1).join(' '),
    LastName: last === 'Játékos' ? parts[0] || '' : last || parts[0] || '',
    EmailAddress: String(row.EmailAddress ?? row.emailAddress ?? row.Email ?? ''),
    PhoneNumber: (row.PhoneNumber ?? row.phoneNumber ?? null) as string | null,
    DisplayName: composed,
  };
}

function pickFirstRecord(
  source: unknown,
  ...keys: string[]
): Record<string, unknown> | null {
  const rows = pickDataset(source, ...keys);
  const row = rows[0];
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
}

function readReturnValue(data: Record<string, unknown>): number {
  if (data.ReturnValue != null && data.ReturnValue !== '') return Number(data.ReturnValue);
  const row = pickFirstRecord(data, 'ReturnStatus', 'ReturnStatuses', 'Result1');
  const raw = row?.ReturnValue ?? row?.returnValue;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 1;
}

function parseScreenContext(row: Record<string, unknown> | null): EventUserScreenContext | null {
  if (!row) return null;
  return {
    requestEventUserId: nullableNumericId(
      row.RequestEventUserID ?? row.requestEventUserID ?? row.RequestEventUserId
    ),
    eventId: nullableNumericId(row.EventID ?? row.eventID ?? row.EventId),
    requesterRoleCode: String(row.RequesterRoleCode ?? row.requesterRoleCode ?? ''),
    requesterRoleName: String(row.RequesterRoleName ?? row.requesterRoleName ?? ''),
    dataSheetType: nullableNumericId(row.DataSheetType ?? row.dataSheetType),
  };
}

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function ptaRowEventKey(row: Record<string, unknown>): string {
  const raw = row.EventID ?? row.eventID ?? row.EventId ?? row.eventId;
  return raw == null || raw === '' ? '' : String(raw);
}

function ptaRowsForEvent<T extends Record<string, unknown>>(rows: T[], eventId: number | string): T[] {
  const key = String(eventId);
  return (rows || []).filter((row) => ptaRowEventKey(row) === key);
}

function ptaRowsExceptEvent<T extends Record<string, unknown>>(rows: T[], eventId: number | string): T[] {
  const key = String(eventId);
  return (rows || []).filter((row) => ptaRowEventKey(row) !== key);
}

function participantDisplayName(row: Record<string, unknown>): string {
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const display = String(row.DisplayName ?? row.UserName ?? row.Name ?? '').trim();
  return [last, first].filter(Boolean).join(' ') || display || 'Játékos';
}

function eventUserLooksCheckedIn(statusName: string): boolean {
  const hay = foldText(statusName);
  if (!hay || hay === 'ismeretlen') return false;
  return (
    hay.includes('belep') ||
    hay.includes('bejelentkez') ||
    hay.includes('checkin') ||
    hay.includes('check-in')
  );
}

function isPtaDrawPlayerKind(kind: MembershipRoleKind): boolean {
  return kind === 'participant' || kind === 'contributor';
}

export function isGameMasterRole(
  masterRoleId: number | null,
  roleName: string,
  roleTypeName: string
): boolean {
  if (masterRoleId === 7) return true;
  const hay = foldText(`${roleName} ${roleTypeName}`);
  return hay.includes('jatekmester') || hay.includes('gamemaster') || hay.includes('game master');
}

/** TEMP: EventUser státusz overlay (meghívó döntés), amíg a GET utoléri. */
const LS_EVENT_USER_STATUS = 'ej_localEventUserStatus';
const LS_EVENT_STATUS = 'ej_localEventStatus';
/** Régi kliens-oldali sorsolás cache. Többé nem olvassuk rá az API-ra. */
const LS_PTA_DRAW = 'ej_localPtaDraw';

interface LocalStatusPatch {
  statusId: number;
  prevStatusId: number | null;
}

interface LocalPtaDrawSnapshot {
  desks: Record<string, unknown>[];
  rounds: Record<string, unknown>[];
  roundDesks: Record<string, unknown>[];
  players: PtaEventPlayer[];
  schedules: Record<string, unknown>[];
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function rememberEventUserStatus(eventUserId: number | string, statusId: number, prevStatusId: number | null) {
  const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_USER_STATUS, {});
  patches[String(eventUserId)] = { statusId, prevStatusId };
  writeLocalJson(LS_EVENT_USER_STATUS, patches);
}

/**
 * Login / event/data után az API a forrás.
 * Scan-ből származó Belépett overlay-t meghívott API státuszon eldobjuk.
 * Elfogadom / Elutasítom (Megerősítve, Elutasítva) marad, amíg a GET utoléri.
 */
function pruneLocalEventUserStatusPatches(eventUsers: EventUser[]) {
  const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_USER_STATUS, {});
  const master = useMasterDataStore();
  let changed = false;
  for (const eu of eventUsers || []) {
    const key = String(eu.id);
    const patch = patches[key];
    if (!patch) continue;
    const apiStatusId = nullableNumericId(eu.EventUserStatusID);
    const patchStatusId = Number(patch.statusId);
    if (apiStatusId != null && apiStatusId === patchStatusId) {
      delete patches[key];
      changed = true;
      continue;
    }
    const apiNeedsUserApproval = master.eventUserStatusNeedsUserApproval(apiStatusId);
    if (apiNeedsUserApproval && isInviteDecisionStatusId(master.eventUserStatuses, patchStatusId)) {
      continue;
    }
    if (apiNeedsUserApproval || patchStatusId !== Number(eu.EventUserStatusID)) {
      delete patches[key];
      changed = true;
    }
  }
  if (changed) writeLocalJson(LS_EVENT_USER_STATUS, patches);
}

function applyStatusPatchToEventUser(
  row: EventUser,
  statusId: number,
  prevStatusId: number | null
) {
  row.EventUserStatusID = statusId;
  row.PrevEventUserStatusID = prevStatusId;
  const master = useMasterDataStore();
  if (!master.eventUserStatusNeedsUserApproval(statusId)) {
    row.NeedUserApprovalFlg = 0;
    row.needUserApprovalFlg = 0;
  }
}

function rememberEventStatus(eventId: number | string, statusId: number, prevStatusId: number | null) {
  const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_STATUS, {});
  patches[String(eventId)] = { statusId, prevStatusId };
  writeLocalJson(LS_EVENT_STATUS, patches);
}

function forgetEventStatus(eventId: number | string) {
  const all = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_STATUS, {});
  delete all[String(eventId)];
  writeLocalJson(LS_EVENT_STATUS, all);
}

function clearLocalEventStatuses() {
  writeLocalJson(LS_EVENT_STATUS, {});
}

function forgetPtaDraw(eventId: number | string) {
  const all = readLocalJson<Record<string, LocalPtaDrawSnapshot>>(LS_PTA_DRAW, {});
  delete all[String(eventId)];
  writeLocalJson(LS_PTA_DRAW, all);
}

function clearLocalPtaDraws() {
  writeLocalJson(LS_PTA_DRAW, {});
}

export interface EnterableEventRole {
  eventUserId: number;
  eventRoleId: number | null;
  masterRoleId: number | null;
  name: string;
  roleTypeName: string;
  color: string;
  isOrganizer: boolean;
}

function resolveMasterRoleId(eventRoles: any[], eu: EventUser): number | null {
  const eventRole = (eventRoles || []).find(
    (er: any) =>
      Number(er.id) === Number(eu.EventRoleID) ||
      Number(er.ID) === Number(eu.EventRoleID)
  );
  const raw =
    eventRole?.RoleID ??
    eventRole?.RoleId ??
    eu.RoleID ??
    eu.RoleId ??
    eu.EventRoleID;
  return nullableNumericId(raw);
}

function eventUserRoleTypeId(eventRoles: any[], eu: EventUser): number | null {
  const eventRole = (eventRoles || []).find(
    (er: any) =>
      Number(er.id) === Number(eu.EventRoleID) ||
      Number(er.ID) === Number(eu.EventRoleID)
  );
  return nullableNumericId(
    eu.RoleTypeID ??
      eu.roleTypeID ??
      eu.RoleTypeId ??
      eventRole?.RoleTypeID ??
      eventRole?.roleTypeID ??
      eventRole?.RoleTypeId
  );
}

function eventUserMembershipKind(
  eventRoles: any[],
  masterDataStore: ReturnType<typeof useMasterDataStore>,
  eu: EventUser
): MembershipRoleKind {
  const masterRoleId = resolveMasterRoleId(eventRoles, eu);
  return membershipRoleKind({
    isOrganizer:
      eventUserRoleTypeId(eventRoles, eu) === ORGANIZER_ROLE_TYPE_ID ||
      masterDataStore.isOrganizerRole(masterRoleId),
    roleTypeName: masterRoleId != null ? masterDataStore.getRoleTypeNameByRoleId(masterRoleId) : '',
    roleName: masterRoleId != null ? masterDataStore.getRoleNameById(masterRoleId) : '',
  });
}

function isInviteDecisionRoleKind(kind: MembershipRoleKind): boolean {
  return kind === 'contributor' || kind === 'participant';
}

export const useEventStore = defineStore('event', {
  state: () => ({
    events: [] as any[],
    invitations: [] as any[],
    eventLabels: [] as any[],
    labels: [] as any[],
    locations: [] as any[],
    roles: [] as any[],
    roleTickets: [] as any[],
    tickets: [] as any[],
    eventUsers: [] as EventUser[],
    eventParticipants: [] as EventParticipant[],
    eventUserScreenContext: null as EventUserScreenContext | null,
    eventTypeOwners: [] as any[],
    eventPrograms: [] as EventProgram[],
    ptaEventSettings: [] as PtaEventSettings[],
    ptaEventDesks: [] as Record<string, unknown>[],
    ptaEventRounds: [] as Record<string, unknown>[],
    ptaEventRoundDesks: [] as Record<string, unknown>[],
    ptaEventPlayers: [] as PtaEventPlayer[],
    ptaGameSchedules: [] as Record<string, unknown>[],
    ptaEventPrizes: [] as Record<string, unknown>[],
    /** Játékmester pajzsos foglalás — a GET automatikus kiosztását nem írjuk rá. */
    ptaDeskClaims: {} as Record<number, number | null>,
    /** GET /pta/display — ne keverjük a staff userdata sorsolással. */
    ptaDisplayFeed: null as null | {
      eventId: string;
      eventName: string;
      settings: PtaEventSettings[];
      desks: Record<string, unknown>[];
      rounds: Record<string, unknown>[];
      roundDesks: Record<string, unknown>[];
      players: PtaEventPlayer[];
      schedules: Record<string, unknown>[];
    },
  }),
  getters: {
    // A felhasználóhoz kapcsolódó események (amiben EventUser-ként benne van)
    myEvents: (state) => {
      const myEventIds = new Set(state.eventUsers.map((eu) => Number(eu.EventID)));
      return state.events.filter((e) => myEventIds.has(Number(e.id)));
    },
    activeMyEvents(): any[] {
      return this.myEvents.filter((e: any) => new Date(e.EndAtUtc) >= new Date());
    },
    pastMyEvents(): any[] {
      return this.myEvents.filter((e: any) => new Date(e.EndAtUtc) < new Date());
    },
    /** Saját események, amelyek EventStatus.InProgressFlg = true. */
    inProgressMyEvents(): any[] {
      const masterDataStore = useMasterDataStore();
      const myIds = new Set(this.eventUsers.map((eu) => String(eu.EventID)));
      return this.events.filter((event: any) => {
        if (!myIds.has(String(event.id))) return false;
        return masterDataStore.isEventStatusInProgress(
          event.EventStatusID ?? event.eventStatusID ?? event.StatusID ?? event.StatusId
        );
      });
    },
    /** A dátumhoz legközelebbi, folyamatban lévő saját esemény. */
    nearestInProgressEvent(): any | null {
      const now = Date.now();
      const list = this.inProgressMyEvents.slice();
      if (!list.length) return null;
      const eventTime = (event: any) => {
        const raw = event.StartAtUtc ?? event.startAtUtc ?? event.EndAtUtc ?? event.endAtUtc ?? event.date;
        const t = raw ? new Date(raw).getTime() : NaN;
        return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
      };
      list.sort((a: any, b: any) => Math.abs(eventTime(a) - now) - Math.abs(eventTime(b) - now));
      return list[0] || null;
    },
    // Discovery (Kereső) - Minden ami publikus és jövőbeli
    discoveryEvents: (state) => {
      return state.events.filter(e => {
        const isPublic = e.PublicFlg === 1 || e.publicFlg === 1 || e.PublicFlg === true || e.publicFlg === true;
        const endDate = e.EndAtUtc || e.endAtUtc;
        const isFuture = endDate ? new Date(endDate) >= new Date() : true; // Ha nincs dátum, engedjük át
        return isPublic && isFuture;
      });
    },
    getEventUsersForEvent: (state) => (eventId: number | string) => {
      const numId = Number(eventId);
      return state.eventUsers.filter(
        (eu) => Number(eu.EventID) === numId || String(eu.EventID) === String(eventId)
      );
    },
    getEventParticipantsForEvent: (state) => (eventId: number | string) => {
      const numId = Number(eventId);
      return state.eventParticipants.filter(
        (row) => Number(row.EventID) === numId || String(row.EventID) === String(eventId)
      );
    },
    getProgramsForEvent: (state) => (eventId: number | string) => {
      const numId = Number(eventId);
      return state.eventPrograms.filter(
        (row) => Number(row.EventID) === numId || String(row.EventID) === String(eventId)
      );
    },
    /** EventParticpants + sorsolt EventPlayers + saját EventUser sorok — GM adatlaphoz is. */
    getParticipantDirectoryForEvent() {
      return (eventId: number | string): EventParticipant[] => {
        const numId = Number(eventId);
        const byId = new Map<number, EventParticipant>();
        for (const row of this.getEventParticipantsForEvent(eventId)) {
          byId.set(row.id, row);
        }
        for (const player of this.getPtaPlayersForEvent(eventId)) {
          const synthesized = participantFromPtaPlayer(player, numId);
          if (!synthesized) continue;
          const existing = byId.get(synthesized.id);
          if (existing && ptaPersonDisplayName(existing as Record<string, unknown>)) continue;
          byId.set(synthesized.id, existing ? { ...synthesized, ...existing } : synthesized);
        }
        for (const eu of this.getEventUsersForEvent(eventId)) {
          if (byId.has(eu.id)) continue;
          byId.set(eu.id, {
            ...eu,
            FirstName: String((eu as EventParticipant).FirstName ?? ''),
            LastName: String((eu as EventParticipant).LastName ?? ''),
            EmailAddress: String((eu as EventParticipant).EmailAddress ?? ''),
            PhoneNumber: ((eu as EventParticipant).PhoneNumber ?? null) as string | null,
          });
        }
        return [...byId.values()];
      };
    },
    /**
     * Sorsolható belépett játékosok: Résztvevő / Közreműködő (nem szervező, nem játékmester).
     * Ugyanaz a lista, mint amivel a runPtaDraw dolgozik.
     */
    getPtaCheckedInDrawPlayers() {
      return (eventId: number | string) => {
        const master = useMasterDataStore();
        const settings = this.getPtaSettingsForEvent(eventId);
        type Draft = {
          eventUserId: number;
          userId: number | null;
          name: string;
          kind: MembershipRoleKind;
          groups: ReturnType<typeof collectGroupingValues>;
          existingPlayer: PtaEventPlayer | null;
        };
        const byKey = new Map<string, Draft>();

        for (const eu of this.getParticipantDirectoryForEvent(eventId)) {
          const masterRoleId = resolveMasterRoleId(this.roles, eu);
          const roleName = masterRoleId != null ? master.getRoleNameById(masterRoleId) : '';
          const roleTypeName =
            masterRoleId != null ? master.getRoleTypeNameByRoleId(masterRoleId) : '';
          const kind = eventUserMembershipKind(this.roles, master, eu);
          const statusId = nullableNumericId(eu.EventUserStatusID);
          const statusName = statusId != null ? master.getEventUserStatusName(statusId) : '';
          const checkedIn = eventUserLooksCheckedIn(statusName);
          const userId = nullableNumericId(eu.UserID ?? eu.userID ?? eu.UserId);

          if (isGameMasterRole(masterRoleId, roleName, roleTypeName)) {
            continue;
          }
          if (kind === 'organizer' || !isPtaDrawPlayerKind(kind) || !checkedIn) continue;

          const existing = findPtaPlayerForEventUser(this.ptaEventPlayers, eventId, eu.id, userId);
          const orgId = nullableNumericId(
            (existing as Record<string, unknown> | null)?.OrganizationID ??
              (existing as Record<string, unknown> | null)?.organizationID ??
              eu.OrganizationID ??
              (eu as Record<string, unknown>).organizationID
          );
          const orgName = orgId != null ? master.getOrganizationNameById(orgId) : '';
          const draft: Draft = {
            eventUserId: eu.id,
            userId,
            name: participantDisplayName(eu as Record<string, unknown>),
            kind,
            groups: collectGroupingValues(
              [
                existing,
                eu as Record<string, unknown>,
                orgName ? { OrganizationName: orgName } : null,
              ],
              settings
            ),
            existingPlayer: existing,
          };
          const key = userId != null ? `u-${userId}` : `eu-${eu.id}`;
          const prev = byKey.get(key);
          if (!prev || (prev.kind !== 'participant' && kind === 'participant')) {
            byKey.set(key, draft);
          }
        }

        return {
          drafts: [...byKey.values()].sort((a, b) => a.eventUserId - b.eventUserId),
        };
      };
    },
    getPtaSettingsForEvent: (state) => (eventId: number | string) => {
      const numId = Number(eventId);
      return (
        state.ptaEventSettings.find(
          (row) => Number(row.EventID) === numId || String(row.EventID) === String(eventId)
        ) || null
      );
    },
    getPtaDesksForEvent: (state) => (eventId: number | string) =>
      ptaRowsForEvent(state.ptaEventDesks, eventId).slice().sort((a, b) => {
        return ptaDeskNumber(a) - ptaDeskNumber(b);
      }),
    getPtaRoundsForEvent: (state) => (eventId: number | string) =>
      ptaRowsForEvent(state.ptaEventRounds, eventId).slice().sort((a, b) => {
        return Number(a.OrderIndex ?? 0) - Number(b.OrderIndex ?? 0);
      }),
    getPtaPlayersForEvent: (state) => (eventId: number | string) =>
      ptaRowsForEvent(state.ptaEventPlayers, eventId),
    getPtaRoundDesksForEvent() {
      return (eventId: number | string) => {
        const roundIds = new Set(
          this.getPtaRoundsForEvent(eventId)
            .map((row) => ptaEventRoundId(row) ?? nullableNumericId(row.id))
            .filter((id): id is number => id != null)
        );
        return this.ptaEventRoundDesks.filter((row) => {
          const roundId = ptaEventRoundId(row);
          return roundId != null && roundIds.has(roundId);
        });
      };
    },
    getPtaSchedulesForEvent() {
      return (eventId: number | string) => {
        const roundDesks = this.getPtaRoundDesksForEvent(eventId);
        const roundDeskIds = new Set(
          roundDesks.map((row) => ptaRoundDeskId(row)).filter((id): id is number => id != null)
        );
        const otherRoundDeskIds = new Set(
          this.ptaEventRoundDesks
            .filter((row) => !roundDesks.includes(row))
            .map((row) => ptaRoundDeskId(row))
            .filter((id): id is number => id != null)
        );
        return this.ptaGameSchedules.filter((row) => {
          const id = ptaScheduleRoundDeskId(row);
          if (id != null) {
            if (roundDeskIds.has(id)) return true;
            if (otherRoundDeskIds.has(id)) return false;
            return roundDesks.length > 0;
          }
          const roundId = ptaEventRoundId(row);
          if (roundId != null) return roundDesks.some((rd) => ptaEventRoundId(rd) === roundId);
          const deskId = ptaEventDeskId(row);
          if (deskId != null) return roundDesks.some((rd) => ptaEventDeskId(rd) === deskId);
          return false;
        });
      };
    },
    /** Van-e már rögzített asztal-eredmény — üres 0 / Kisorsolva nem számít. */
    hasPtaRecordedResults() {
      return (eventId: number | string): boolean => {
        const filled = (value: unknown) => {
          if (value === undefined || value === null || value === '') return false;
          const n = Number(value);
          return Number.isFinite(n) && n !== 0;
        };
        for (const row of this.getPtaSchedulesForEvent(eventId)) {
          if (
            filled(row.Amount ?? row.amount) ||
            filled(row.OnTrack ?? row.onTrack) ||
            filled(row.Position ?? row.position) ||
            filled(row.ResultPoint ?? row.resultPoint)
          ) {
            return true;
          }
        }
        for (const desk of this.getPtaRoundDesksForEvent(eventId)) {
          const hay = foldText(String(desk.SName ?? desk.StatusName ?? desk.DeskStatus ?? ''));
          if (hay.includes('lejatszott') || hay.includes('lezart')) return true;
        }
        return false;
      };
    },
    findEventUserByUid() {
      return (uid: string | null | undefined): EventUser | null => {
        const wanted = normalizeEventUserUid(uid);
        if (!wanted) return null;
        const match = (row: EventUser) => eventUserUidsMatch(row.EventUserUID, wanted);
        return this.eventParticipants.find(match) || this.eventUsers.find(match) || null;
      };
    },
    isOrganizerDataSheet: (state) =>
      Number(state.eventUserScreenContext?.dataSheetType) === ORGANIZER_DATASHEET_TYPE,
    /** A belépett user szerepel-e az EventUsers-ben erre az eseményre */
    isUserOnEvent() {
      return (eventId: number | string) => this.getEventUsersForEvent(eventId).length > 0;
    },
    getInvoiceIdForEvent() {
      return (eventId: number | string): number | null => {
        const row = this.getEventUsersForEvent(eventId).find((eu) => eu.InvoiceID != null);
        return row?.InvoiceID ?? null;
      };
    },
    /** EventUser → EventRole → MasterData.RoleID */
    getMasterRoleIdsForEvent() {
      return (eventId: number | string): number[] => {
        return this.getEventUsersForEvent(eventId)
          .map((eu) => resolveMasterRoleId(this.roles, eu))
          .filter((id): id is number => id != null);
      };
    },
    /** RoleTypeID = 1 (Szervező) — bármelyik EventUser sor elég, akkor is ha más szerepkörben is benne van. */
    isOrganizerOnEvent() {
      return (eventId: number | string) => {
        const masterDataStore = useMasterDataStore();
        return this.getEventUsersForEvent(eventId).some((eu) => {
          if (eventUserRoleTypeId(this.roles, eu) === ORGANIZER_ROLE_TYPE_ID) return true;
          return masterDataStore.isOrganizerRole(resolveMasterRoleId(this.roles, eu));
        });
      };
    },
    /**
     * A kártyán megjelenő saját EventUser: résztvevő > közreműködő.
     * Szervezői RoleType-nak nincs státusza — ha csak az van, null.
     */
    getDisplayEventUserForEvent() {
      return (eventId: number | string): EventUser | null => {
        const masterDataStore = useMasterDataStore();
        return pickDisplayEventUser(this.getEventUsersForEvent(eventId), (eu) =>
          eventUserMembershipKind(this.roles, masterDataStore, eu)
        );
      };
    },
    /**
     * Saját lista-státusz + meghívó `!`.
     * A felkiáltójel csak Közreműködő / Résztvevő RoleType-nál kell — szervezőként
     * nincs részvétel-megerősítés. Ha szervező + résztvevő is, a résztvevő sor számít.
     */
    getMyEventUserStatus() {
      return (
        eventId: number | string
      ): {
        eventUserId: number;
        statusId: number;
        name: string;
        color: string;
        needUserApproval: boolean;
        needOrganizerApproval: boolean;
      } | null => {
        const masterDataStore = useMasterDataStore();
        const rows = this.getEventUsersForEvent(eventId);
        const pendingUserRow = rows.find((eu) => {
          if (!isInviteDecisionRoleKind(eventUserMembershipKind(this.roles, masterDataStore, eu))) {
            return false;
          }
          const sid = nullableNumericId(eu.EventUserStatusID);
          if (masterDataStore.eventUserStatusNeedsUserApproval(sid)) return true;
          return eventUserStatusNameLooksInvited(masterDataStore.getEventUserStatusName(sid ?? 0));
        });
        const eu = pendingUserRow || this.getDisplayEventUserForEvent(eventId);
        const statusId = nullableNumericId(eu?.EventUserStatusID);
        const eventUserId = nullableNumericId(eu?.id);
        if (statusId == null || eventUserId == null || !eu) return null;

        const kind = eventUserMembershipKind(this.roles, masterDataStore, eu);
        if (!isInviteDecisionRoleKind(kind)) return null;

        const row = findEventUserStatus(masterDataStore.eventUserStatuses, statusId);
        const catalogName = eventUserStatusName(row);
        const fallbackName = masterDataStore.getEventUserStatusName(statusId);
        const resolvedName =
          catalogName || (fallbackName && fallbackName !== 'Ismeretlen' ? fallbackName : '');
        if (!resolvedName) return null;

        const needUserApproval =
          masterDataStore.eventUserStatusNeedsUserApproval(statusId) ||
          eventUserStatusNameLooksInvited(resolvedName);
        const needOrganizerApproval = masterDataStore.eventUserStatusNeedsOrganizerApproval(statusId);

        return {
          eventUserId,
          statusId,
          name: resolvedName,
          color: eventUserStatusColor(row) || '#38bdf8',
          needUserApproval,
          needOrganizerApproval,
        };
      };
    },
    /**
     * Beléphető EventRole-ok a user EventUser sorai alapján.
     * Szervező (RoleTypeID=1) mindig; egyébként EventTypes.CanEnterFlg.
     */
    getEnterableRolesForEvent() {
      return (eventId: number | string, eventTypeId?: number | null): EnterableEventRole[] => {
        const masterDataStore = useMasterDataStore();
        const typeCanEnter = masterDataStore.eventTypeCanEnter(eventTypeId ?? null);
        const ptaSheet =
          isProfitabilityEventType(eventTypeId ?? null) || !!this.getPtaSettingsForEvent(eventId);
        const seen = new Set<string>();
        const result: EnterableEventRole[] = [];

        for (const eu of this.getEventUsersForEvent(eventId)) {
          const masterRoleId = resolveMasterRoleId(this.roles, eu);
          const isOrganizer = masterDataStore.isOrganizerRole(masterRoleId);
          if (!isOrganizer && !typeCanEnter && !ptaSheet) continue;

          const eventRoleId = eu.EventRoleID;
          const key = eventRoleId != null ? `er-${eventRoleId}` : `eu-${eu.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          result.push({
            eventUserId: eu.id,
            eventRoleId,
            masterRoleId,
            name: masterRoleId != null ? masterDataStore.getRoleNameById(masterRoleId) : 'Szerepkör',
            roleTypeName: masterRoleId != null ? masterDataStore.getRoleTypeNameByRoleId(masterRoleId) : '',
            color: masterRoleId != null ? masterDataStore.getRoleColorById(masterRoleId) : '#38bdf8',
            isOrganizer,
          });
        }
        return result;
      };
    },
  },
  actions: {
    setEventData(data: any) {
      this.events = normalizeEvents(data.Events || data.events || []);
      this.invitations = data.Invitations || [];
      this.eventLabels = data.EventLabels || [];
      this.labels = data.Labels || [];
      this.locations = data.Locations || [];
      this.roles = data.Roles || [];
      this.roleTickets = data.RoleTickets || [];
      this.tickets = normalizeTickets(data.Tickets || data.tickets || []);
      this.eventUsers = normalizeEventUsers(data.EventUsers || data.eventUsers || []);
      this.eventTypeOwners = data.EventTypeOwners || [];
      this.eventPrograms = normalizeEventPrograms(data.EventPrograms || data.eventPrograms || []);
      pruneLocalEventUserStatusPatches(this.eventUsers);
      this.reapplyLocalEventUserStatuses();
      // Event.SetStatus a /event/change-en megy; a GET a forrás. Régi dummy overlay ki.
      clearLocalEventStatuses();
      clearLocalPtaDraws();
    },

    async refreshEventData() {
      const response = await api.get('/event/data');
      this.setEventData(unwrapApiPayload(response.data));
    },

    upsertEvents(rows: unknown[]) {
      const incoming = normalizeEvents(rows);
      for (const ev of incoming) {
        const idx = this.events.findIndex((e: any) => String(e.id) === String(ev.id));
        if (idx >= 0) {
          const prev = this.events[idx];
          const merged = { ...prev, ...ev };
          if (ev.EventStatusID == null && prev.EventStatusID != null) {
            merged.EventStatusID = prev.EventStatusID;
            merged.PrevEventStatusID = ev.PrevEventStatusID ?? prev.PrevEventStatusID;
          }
          this.events[idx] = merged;
        } else {
          this.events.push(ev);
        }
      }
    },

    upsertTickets(rows: unknown[]) {
      const incoming = normalizeTickets(rows);
      if (!incoming.length) return;
      for (const ticket of incoming) {
        const idx = this.tickets.findIndex((t: any) => String(t.id) === String(ticket.id));
        if (idx >= 0) {
          this.tickets[idx] = { ...this.tickets[idx], ...ticket };
        } else {
          this.tickets.push(ticket);
        }
      }
    },

    async loadEventUserDataSheet(eventUserId: number | string) {
      const id = Number(eventUserId);
      if (!Number.isFinite(id) || id <= 0) return null;

      const response = await api.get(`/event/userdata/${id}`);
      const data = unwrapApiPayload(response.data);
      const returnValue = readReturnValue(data);
      if (returnValue < 0) {
        const row = pickFirstRecord(data, 'ReturnStatus', 'ReturnStatuses', 'Result1');
        const message = String(row?.ReturnDescription ?? data.ReturnDescription ?? 'Adatlap betöltése sikertelen');
        throw new Error(message);
      }

      this.eventUserScreenContext = parseScreenContext(
        pickFirstRecord(data, 'ScreenContext', 'screenContext', 'RS3', 'ResultSet3', 'Result3')
      );

      const events = pickDataset(data, 'Events', 'events', 'Event', 'RS4', 'ResultSet4', 'Result4');
      this.upsertEvents(events);
      warnIfDatasetMissing('event.userdata.Events', events, data);

      const participants = pickDataset(
        data,
        'EventParticpants',
        'EventParticipants',
        'eventParticipants',
        'EventParticipant'
      );
      const incomingParticipants = normalizeEventParticipants(participants);
      const ctxEventId = this.eventUserScreenContext?.eventId;
      const userdataUsers = normalizeEventParticipants(
        pickDataset(data, 'EventUsers', 'eventUsers')
      ).filter((row) => ctxEventId == null || Number(row.EventID) === Number(ctxEventId));
      const toMerge = incomingParticipants.length ? incomingParticipants : userdataUsers;
      if (toMerge.length) {
        const byId = new Map(this.eventParticipants.map((row) => [row.id, row]));
        for (const row of toMerge) byId.set(row.id, row);
        this.eventParticipants = [...byId.values()];
      } else if (Number(this.eventUserScreenContext?.dataSheetType) === ORGANIZER_DATASHEET_TYPE) {
        const eventId = this.eventUserScreenContext?.eventId;
        if (eventId != null) {
          this.eventParticipants = this.eventParticipants.filter(
            (row) => Number(row.EventID) !== Number(eventId) && String(row.EventID) !== String(eventId)
          );
        }
      }

      const tickets = pickDataset(data, 'Tickets', 'tickets', 'EventTickets', 'EventTicket');
      this.upsertTickets(tickets);

      if (hasDatasetKey(data, 'EventPrograms', 'eventPrograms')) {
        const incomingPrograms = normalizeEventPrograms(
          pickDataset(data, 'EventPrograms', 'eventPrograms')
        );
        const programEventId = this.eventUserScreenContext?.eventId;
        if (programEventId != null) {
          this.eventPrograms = [
            ...this.eventPrograms.filter(
              (row) => Number(row.EventID) !== Number(programEventId)
            ),
            ...incomingPrograms.filter(
              (row) => Number(row.EventID) === Number(programEventId)
            ),
          ];
        } else {
          const byId = new Map(this.eventPrograms.map((row) => [row.id, row]));
          for (const row of incomingPrograms) byId.set(row.id, row);
          this.eventPrograms = [...byId.values()];
        }
      }

      const incomingRoles = pickDataset(data, 'Roles', 'EventRoles', 'eventRoles');
      if (incomingRoles.length) {
        const byId = new Map(
          (this.roles || []).map((row: { id?: number; ID?: number }) => [String(row.id ?? row.ID), row])
        );
        for (const row of incomingRoles) {
          if (!row || typeof row !== 'object') continue;
          const rec = row as Record<string, unknown>;
          const id = rec.id ?? rec.ID ?? rec.Id;
          if (id == null || id === '') continue;
          const prev = byId.get(String(id)) || {};
          byId.set(String(id), { ...prev, ...rec, id: Number(id) });
        }
        this.roles = [...byId.values()];
      }

      this.replaceEventPtaFromApi(this.eventUserScreenContext?.eventId ?? null, {
        settings: normalizePtaEventSettings(
          pickDataset(data, 'EventSettings', 'eventSettings', 'PtaEventSettings')
        ),
        desks: normalizePtaRows(pickDataset(data, 'EventDesks', 'eventDesks', 'PtaEventDesks')),
        rounds: normalizePtaEventRounds(
          pickDataset(data, 'EventRounds', 'eventRounds', 'PtaEventRounds')
        ),
        roundDesks: normalizePtaRoundDesks(
          pickDataset(
            data,
            'EventRoundDesks',
            'eventRoundDesks',
            'PtaEventRoundDesks',
            'RoundDesks',
            'roundDesks'
          )
        ),
        players: normalizePtaEventPlayers(
          pickDataset(
            data,
            'EventPlayers',
            'eventPlayers',
            'PtaEventPlayers',
            'ptaEventPlayers',
            'RS9',
            'Result9',
            'ResultSet9'
          )
        ),
        schedules: normalizePtaSchedules(
          pickDataset(
            data,
            'GameSchedules',
            'gameSchedules',
            'PtaGameSchedules',
            'GameSchedule',
            'Schedules',
            'RS10',
            'Result10',
            'ResultSet10'
          )
        ),
        prizes: normalizePtaRows(pickDataset(data, 'EventPrizes', 'eventPrizes')),
      });

      warnIfDatasetMissing('event.userdata.EventParticpants', participants, data);

      // userdata EventUsers (saját sorok) — meghívó státusz ne legyen helyi Belépett alá írva
      if (userdataUsers.length) {
        const byId = new Map(this.eventUsers.map((row) => [row.id, row]));
        for (const row of userdataUsers) byId.set(row.id, row);
        this.eventUsers = [...byId.values()];
        pruneLocalEventUserStatusPatches(userdataUsers);
      }

      this.reapplyLocalEventUserStatuses();

      return this.eventUserScreenContext;
    },

    /** Ha az API meghívott (NeedUserApproval), a helyi patch ne írja felül. */
    pruneStaleEventUserStatusPatches() {
      pruneLocalEventUserStatusPatches(this.eventUsers);
    },

    reapplyAllLocalPtaDraws() {
      clearLocalPtaDraws();
    },

    persistCurrentPtaDraw(_eventId: number | string) {
      void _eventId;
    },

    reapplyPtaDeskClaims() {
      for (const row of this.ptaEventRoundDesks) {
        const id = nullableNumericId(row.EventRoundDeskID ?? row.id);
        if (id == null || !Object.prototype.hasOwnProperty.call(this.ptaDeskClaims, id)) continue;
        row.GameMasterUserID = this.ptaDeskClaims[id];
      }
    },

    /**
     * PTA a GET /event/userdata-ból. Ha a DB üres, de a sessionben van sorsolás
     * (runPtaDraw, még nincs Pta.ReplaceDraw), ne töröljük — különben a Játék oldal
     * onMounted GET-je azonnal eldobja az asztalokat.
     */
    replaceEventPtaFromApi(
      eventId: number | string | null,
      snapshot: {
        settings: PtaEventSettings[];
        desks: Record<string, unknown>[];
        rounds: Record<string, unknown>[];
        roundDesks: Record<string, unknown>[];
        players: PtaEventPlayer[];
        schedules: Record<string, unknown>[];
        prizes: Record<string, unknown>[];
      }
    ) {
      const key = eventId == null || eventId === '' ? null : String(eventId);
      if (key != null) {
        if (!snapshot.desks.length) snapshot.desks = ptaRowsForEvent(this.ptaEventDesks, key);
        if (!snapshot.rounds.length) snapshot.rounds = ptaRowsForEvent(this.ptaEventRounds, key);
        if (!snapshot.roundDesks.length) {
          const roundIds = new Set(
            (snapshot.rounds.length ? snapshot.rounds : ptaRowsForEvent(this.ptaEventRounds, key))
              .map((row) => ptaEventRoundId(row) ?? nullableNumericId(row.id))
              .filter((id): id is number => id != null)
          );
          snapshot.roundDesks = this.ptaEventRoundDesks.filter((row) => {
            const roundId = ptaEventRoundId(row);
            return roundId != null && (roundIds.size === 0 || roundIds.has(roundId));
          });
        }
      }
      snapshot.roundDesks = normalizePtaRoundDesks(snapshot.roundDesks);
      snapshot.rounds = snapshot.rounds.length
        ? normalizePtaEventRounds(snapshot.rounds)
        : snapshot.rounds;
      attachPtaDeskNumbers(snapshot.roundDesks, snapshot.desks);
      const hydrated = hydratePtaPlayerGraph({
        eventId: key,
        desks: snapshot.desks,
        rounds: snapshot.rounds,
        roundDesks: snapshot.roundDesks,
        players: snapshot.players,
        schedules: snapshot.schedules,
        prizes: snapshot.prizes,
        previousPlayers: key != null ? ptaRowsForEvent(this.ptaEventPlayers, key) : this.ptaEventPlayers,
        previousSchedules: this.ptaGameSchedules,
      });
      snapshot.players = hydrated.players;
      snapshot.schedules = hydrated.schedules;
      const apiHasDraw =
        snapshot.desks.length > 0 ||
        snapshot.rounds.length > 0 ||
        snapshot.roundDesks.length > 0 ||
        snapshot.schedules.length > 0;

      if (key != null && !apiHasDraw) {
        const hasSessionDraw =
          ptaRowsForEvent(this.ptaEventDesks, key).length > 0 ||
          ptaRowsForEvent(this.ptaEventRounds, key).length > 0;
        if (hasSessionDraw) {
          if (snapshot.settings.length) {
            this.ptaEventSettings = [
              ...this.ptaEventSettings.filter((row) => String(row.EventID) !== key),
              ...snapshot.settings,
            ];
          }
          stripAutoAssignedGameMasters(
            ptaRowsForEvent(this.ptaEventDesks, key),
            this.ptaEventRoundDesks.filter((row) => {
              const roundId = ptaEventRoundId(row);
              if (roundId == null) return false;
              return ptaRowsForEvent(this.ptaEventRounds, key).some(
                (round) => (ptaEventRoundId(round) ?? nullableNumericId(round.id)) === roundId
              );
            })
          );
          this.reapplyPtaDeskClaims();
          return;
        }
      }

      if (key == null) {
        stripAutoAssignedGameMasters(snapshot.desks, snapshot.roundDesks);
        this.ptaEventSettings = snapshot.settings;
        this.ptaEventDesks = snapshot.desks;
        this.ptaEventRounds = snapshot.rounds;
        this.ptaEventRoundDesks = snapshot.roundDesks;
        this.ptaEventPlayers = snapshot.players;
        this.ptaGameSchedules = normalizePtaSchedules(snapshot.schedules);
        this.ptaEventPrizes = snapshot.prizes;
        this.reapplyPtaDeskClaims();
        return;
      }

      const oldRoundIds = new Set(
        ptaRowsForEvent(this.ptaEventRounds, key)
          .map((row) => ptaEventRoundId(row) ?? nullableNumericId(row.id))
          .filter((id): id is number => id != null)
      );
      const oldRoundDeskIds = new Set(
        this.ptaEventRoundDesks
          .filter((row) => {
            const roundId = ptaEventRoundId(row);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => ptaRoundDeskId(row))
          .filter((id): id is number => id != null)
      );

      this.ptaEventSettings = [
        ...this.ptaEventSettings.filter((row) => String(row.EventID) !== key),
        ...snapshot.settings,
      ];
      stripAutoAssignedGameMasters(snapshot.desks, snapshot.roundDesks);
      this.ptaEventDesks = [
        ...ptaRowsExceptEvent(this.ptaEventDesks, key),
        ...snapshot.desks,
      ];
      this.ptaEventRounds = [
        ...ptaRowsExceptEvent(this.ptaEventRounds, key),
        ...snapshot.rounds,
      ];
      this.ptaEventRoundDesks = [
        ...this.ptaEventRoundDesks.filter((row) => {
          const id = ptaRoundDeskId(row);
          return id == null || !oldRoundDeskIds.has(id);
        }),
        ...snapshot.roundDesks,
      ];
      this.ptaGameSchedules = [
        ...this.ptaGameSchedules.filter((row) => {
          const deskId = ptaScheduleRoundDeskId(row);
          return deskId == null || !oldRoundDeskIds.has(deskId);
        }),
        ...normalizePtaSchedules(snapshot.schedules),
      ];
      this.ptaEventPlayers = [
        ...ptaRowsExceptEvent(this.ptaEventPlayers, key),
        ...snapshot.players,
      ];
      this.ptaEventPrizes = [
        ...ptaRowsExceptEvent(this.ptaEventPrizes, key),
        ...snapshot.prizes,
      ];
      this.reapplyPtaDeskClaims();
      forgetPtaDraw(key);
    },

    applyPtaDisplayFeed(eventId: number | string, raw: Record<string, unknown>) {
      const key = String(eventId);
      const data = unwrapApiPayload(raw);
      const settings = normalizePtaEventSettings(
        pickDataset(data, 'EventSettings', 'eventSettings', 'PtaEventSettings')
      );
      const desks = normalizePtaRows(pickDataset(data, 'EventDesks', 'eventDesks', 'PtaEventDesks'));
      const rounds = normalizePtaEventRounds(
        pickDataset(data, 'EventRounds', 'eventRounds', 'PtaEventRounds')
      );
      const roundDesks = normalizePtaRoundDesks(
        pickFilledDataset(
          data,
          'EventRoundDesks',
          'eventRoundDesks',
          'PtaEventRoundDesks',
          'RoundDesks',
          'roundDesks',
          'Result6',
          'result6',
          'ResultSet6',
          'RS6'
        )
      );
      const players = normalizePtaEventPlayers(
        pickFilledDataset(data, 'EventPlayers', 'eventPlayers', 'PtaEventPlayers')
      );
      const schedules = normalizePtaSchedules(
        pickFilledDataset(
          data,
          'GameSchedules',
          'gameSchedules',
          'PtaGameSchedules',
          'GameSchedule',
          'Schedules',
          'Result7',
          'result7',
          'ResultSet7',
          'RS7'
        )
      );
      attachPtaDeskNumbers(roundDesks, desks);
      const hydrated = hydratePtaPlayerGraph({
        eventId: key,
        desks,
        rounds,
        roundDesks,
        players,
        schedules,
        prizes: [],
        previousPlayers: [],
        previousSchedules: [],
      });
      const events = pickDataset(data, 'Events', 'events', 'Event');
      const first = (events[0] || {}) as Record<string, unknown>;
      const eventName = String(
        first.Title || first.EventName || first.Name || first.title || ''
      ).trim();
      this.ptaDisplayFeed = {
        eventId: key,
        eventName: eventName || 'Esemény',
        settings,
        desks,
        rounds,
        roundDesks,
        players: hydrated.players,
        schedules: hydrated.schedules,
      };
    },

    clearPtaDisplayFeed() {
      this.ptaDisplayFeed = null;
    },

    reapplyLocalEventUserStatuses() {
      const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_USER_STATUS, {});
      for (const [id, patch] of Object.entries(patches)) {
        const target = Number(id);
        if (!Number.isFinite(target) || !patch) continue;
        const apply = (row: EventUser) => {
          if (Number(row.id) === target) {
            applyStatusPatchToEventUser(row, patch.statusId, patch.prevStatusId);
          }
        };
        this.eventParticipants.forEach(apply);
        this.eventUsers.forEach(apply);
      }
    },

    forgetLocalEventStatus(eventId: number | string) {
      forgetEventStatus(eventId);
    },

    reapplyLocalEventStatuses() {
      const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_STATUS, {});
      for (const [id, patch] of Object.entries(patches)) {
        if (!patch) continue;
        const apply = (event: any) => {
          event.EventStatusID = patch.statusId;
          event.PrevEventStatusID = patch.prevStatusId;
        };
        const event = this.events.find((e: any) => String(e.id) === id);
        if (event) apply(event);
        const mine = this.myEvents.find((e: any) => String(e.id) === id);
        if (mine) apply(mine);
      }
    },

    reapplyLocalPtaDraw(eventId: number | string | null) {
      if (eventId == null || eventId === '') return;
      forgetPtaDraw(eventId);
    },

    applyPtaDrawSnapshot(eventId: number | string, snapshot: LocalPtaDrawSnapshot) {
      const key = String(eventId);
      const desks = snapshot.desks || [];
      const rounds = normalizePtaEventRounds(snapshot.rounds || []);
      const roundDesks = normalizePtaRoundDesks(snapshot.roundDesks || []);
      attachPtaDeskNumbers(roundDesks, desks);
      const hydrated = hydratePtaPlayerGraph({
        eventId: key,
        desks,
        rounds,
        roundDesks,
        players: normalizePtaEventPlayers(snapshot.players || []),
        schedules: normalizePtaSchedules(snapshot.schedules || []),
        previousPlayers: ptaRowsForEvent(this.ptaEventPlayers, key),
        previousSchedules: this.ptaGameSchedules,
      });
      const oldRoundIds = new Set(
        ptaRowsForEvent(this.ptaEventRounds, eventId)
          .map((row) => nullableNumericId(row.EventRoundID ?? row.id))
          .filter((id): id is number => id != null)
      );
      const oldRoundDeskIds = new Set(
        this.ptaEventRoundDesks
          .filter((row) => {
            const roundId = ptaEventRoundId(row);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => ptaRoundDeskId(row))
          .filter((id): id is number => id != null)
      );

      this.ptaEventDesks = [
        ...ptaRowsExceptEvent(this.ptaEventDesks, key),
        ...desks,
      ];
      this.ptaEventRounds = [
        ...ptaRowsExceptEvent(this.ptaEventRounds, key),
        ...rounds,
      ];
      this.ptaEventRoundDesks = [
        ...this.ptaEventRoundDesks.filter((row) => {
          const id = ptaRoundDeskId(row);
          return id == null || !oldRoundDeskIds.has(id);
        }),
        ...roundDesks,
      ];
      this.ptaGameSchedules = [
        ...this.ptaGameSchedules.filter((row) => {
          const deskId = ptaScheduleRoundDeskId(row);
          return deskId == null || !oldRoundDeskIds.has(deskId);
        }),
        ...hydrated.schedules,
      ];

      const nextPlayers = ptaRowsExceptEvent(this.ptaEventPlayers, key);
      this.ptaEventPlayers = [...nextPlayers, ...hydrated.players];
      this.persistCurrentPtaDraw(eventId);
      this.refreshPtaPlayerFinals(eventId);
    },

    applyEventStatus(
      eventId: number | string,
      newStatusId: number,
      prevStatusId: number | null,
      persistLocal = true
    ) {
      const target = String(eventId);
      this.events = this.events.map((event: any) => {
        if (String(event.id) !== target && String(event.ID ?? '') !== target) return event;
        return {
          ...event,
          EventStatusID: newStatusId,
          eventStatusID: newStatusId,
          PrevEventStatusID: prevStatusId,
          prevEventStatusID: prevStatusId,
        };
      });
      if (persistLocal) rememberEventStatus(eventId, newStatusId, prevStatusId);
    },

    /**
     * PTA sorsolás + eredmények törlése. Státuszt csak akkor állítja, ha toStatusId megvan.
     */
    resetLocalPtaEvent(
      eventId: number | string,
      options?: { toStatusId?: number | null; persistLocal?: boolean }
    ): { ok: true; statusName: string } | { ok: false; message: string } {
      const key = String(eventId);
      const persistLocal = options?.persistLocal !== false;
      const oldRoundIds = new Set(
        ptaRowsForEvent(this.ptaEventRounds, eventId)
          .map((row) => nullableNumericId(row.EventRoundID ?? row.id))
          .filter((id): id is number => id != null)
      );
      const oldRoundDeskIds = new Set(
        this.ptaEventRoundDesks
          .filter((row) => {
            const roundId = ptaEventRoundId(row);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => nullableNumericId(row.EventRoundDeskID ?? row.id))
          .filter((id): id is number => id != null)
      );

      this.ptaEventDesks = ptaRowsExceptEvent(this.ptaEventDesks, key);
      this.ptaEventRounds = ptaRowsExceptEvent(this.ptaEventRounds, key);
      this.ptaEventRoundDesks = this.ptaEventRoundDesks.filter((row) => {
        const id = nullableNumericId(row.EventRoundDeskID ?? row.id);
        return id == null || !oldRoundDeskIds.has(id);
      });
      this.ptaGameSchedules = this.ptaGameSchedules.filter((row) => {
        const deskId = nullableNumericId(row.EventRoundDeskID);
        return deskId == null || !oldRoundDeskIds.has(deskId);
      });
      this.ptaEventPlayers = ptaRowsExceptEvent(this.ptaEventPlayers, key);
      for (const id of oldRoundDeskIds) {
        delete this.ptaDeskClaims[id];
      }
      forgetPtaDraw(eventId);

      const master = useMasterDataStore();
      const toStatusId = nullableNumericId(options?.toStatusId);
      if (toStatusId != null) {
        this.applyEventStatus(eventId, toStatusId, null, persistLocal);
      }
      this.events = this.events.map((event: any) => {
        if (String(event.id) !== key && String(event.ID ?? '') !== key) return event;
        return { ...event, PendingApprovalID: null, pendingApprovalID: null };
      });
      const statusName = master.getEventStatusNameById(
        toStatusId ??
          nullableNumericId(
            this.events.find((e: any) => String(e.id) === key)?.EventStatusID
          ),
        'Státusz'
      );
      return { ok: true, statusName };
    },

    applyEventRoundStatus(
      eventRoundId: number | string,
      newStatusId: number | null,
      statusName?: string | null
    ) {
      const target = Number(eventRoundId);
      if (!Number.isFinite(target)) return;
      const row = this.ptaEventRounds.find(
        (item) => Number(item.EventRoundID ?? item.id) === target
      );
      if (!row) return;
      row.EventRoundStatusID = newStatusId;
      if (statusName) row.SName = statusName;
      const eventId = nullableNumericId(row.EventID ?? row.eventID);
      if (eventId != null) {
        this.persistCurrentPtaDraw(eventId);
        // Helyi dummy: a SQL Pta.PublishRound aggregál. CloseRound után a játékosnak ne mutasd.
        this.refreshPtaPlayerFinals(eventId);
      }
    },

    runPtaDraw(eventId: number | string): PtaDrawBuildResult {
      const numId = Number(eventId);
      if (!Number.isFinite(numId)) {
        return { ok: false, message: 'Érvénytelen esemény.' };
      }

      const master = useMasterDataStore();
      const settings = this.getPtaSettingsForEvent(eventId);
      if (!settings) {
        return { ok: false, message: 'Nincs PTA EventSettings ehhez az eseményhez.' };
      }

      const templateRounds = master.getPtaRoundsForGameType(settings.GameTypeID);
      if (!templateRounds.length) {
        return { ok: false, message: 'Nincs forduló a játéktípushoz (GameTypeRounds).' };
      }

      const drawnStatus =
        master.ptaEventRoundStatuses.find((row) => foldText(row.SName).includes('sorsol')) ||
        master.ptaEventRoundStatuses[0] ||
        null;

      const { drafts } = this.getPtaCheckedInDrawPlayers(eventId);

      if (drafts.length < PLAYERS_PER_DESK) {
        return {
          ok: false,
          message: `Legalább 4 belépett játékos kell. Jelenleg: ${drafts.length} fő.`,
        };
      }

      const playingCount = Math.floor(drafts.length / PLAYERS_PER_DESK) * PLAYERS_PER_DESK;
      const playing = drafts.slice(0, playingCount);
      const reserves = drafts.slice(playingCount);

      const oldRoundIds = new Set(
        ptaRowsForEvent(this.ptaEventRounds, eventId)
          .map((row) => nullableNumericId(row.EventRoundID ?? row.id))
          .filter((id): id is number => id != null)
      );
      const oldRoundDeskIds = new Set(
        this.ptaEventRoundDesks
          .filter((row) => {
            const roundId = ptaEventRoundId(row);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => nullableNumericId(row.EventRoundDeskID ?? row.id))
          .filter((id): id is number => id != null)
      );

      const remainingDesks = ptaRowsExceptEvent(this.ptaEventDesks, eventId);
      const remainingRounds = ptaRowsExceptEvent(this.ptaEventRounds, eventId);
      const remainingRoundDesks = this.ptaEventRoundDesks.filter((row) => {
        const id = nullableNumericId(row.EventRoundDeskID ?? row.id);
        return id == null || !oldRoundDeskIds.has(id);
      });
      const remainingSchedules = this.ptaGameSchedules.filter((row) => {
        const deskId = nullableNumericId(row.EventRoundDeskID);
        return deskId == null || !oldRoundDeskIds.has(deskId);
      });

      const built = buildPtaDraw({
        eventId: numId,
        playing,
        reserves,
        templateRounds,
        drawnStatusId: drawnStatus?.id ?? null,
        remainingDesks,
        remainingRounds,
        remainingRoundDesks,
        remainingSchedules,
        allPlayers: this.ptaEventPlayers,
      });
      if (!built.ok) return built;

      for (const id of oldRoundDeskIds) {
        delete this.ptaDeskClaims[id];
      }
      this.ptaEventDesks = [...remainingDesks, ...built.desks];
      this.ptaEventRounds = [...remainingRounds, ...built.rounds];
      this.ptaEventRoundDesks = [...remainingRoundDesks, ...built.roundDesks];
      this.ptaGameSchedules = [...remainingSchedules, ...built.schedules];

      const nextPlayers = this.ptaEventPlayers.slice();
      for (const row of built.players) {
        const eventUserId = nullableNumericId(row.EventUserID);
        const idx = nextPlayers.findIndex((player) => {
          if (String(player.EventID ?? player.eventID ?? '') !== String(eventId)) return false;
          return nullableNumericId(player.EventUserID ?? player.eventUserID) === eventUserId;
        });
        if (idx >= 0) nextPlayers[idx] = { ...nextPlayers[idx], ...row };
        else nextPlayers.push(row);
      }
      this.ptaEventPlayers = nextPlayers;
      this.persistCurrentPtaDraw(eventId);
      this.refreshPtaPlayerFinals(eventId);
      return built;
    },

    applyEventRoundDeskPatch(
      eventId: number | string,
      roundDeskId: number,
      patch: Record<string, unknown>
    ) {
      const row = this.ptaEventRoundDesks.find(
        (item) => ptaRoundDeskId(item) === Number(roundDeskId)
      );
      if (row) {
        Object.assign(row, patch);
        this.persistCurrentPtaDraw(eventId);
      }
      const feedRow = this.ptaDisplayFeed?.roundDesks.find(
        (item) => ptaRoundDeskId(item) === Number(roundDeskId)
      );
      if (feedRow) Object.assign(feedRow, patch);
    },

    /** Játékmester egy EventRoundDesk-re írja magát (Pta.ClaimDesk). */
    setDeskGameMaster(
      eventId: number | string,
      roundDeskId: number,
      userId: number | null
    ) {
      const row = this.ptaEventRoundDesks.find(
        (item) => ptaRoundDeskId(item) === Number(roundDeskId)
      );
      if (!row) return;
      row.GameMasterUserID = userId;
      this.ptaDeskClaims[roundDeskId] = userId;
      this.persistCurrentPtaDraw(eventId);
    },

    applyGameSchedulePatch(
      eventId: number | string,
      roundDeskId: number,
      playerId: number,
      patch: Record<string, unknown>
    ) {
      const rd = this.ptaEventRoundDesks.find((item) => ptaRoundDeskId(item) === Number(roundDeskId));
      const roundId = ptaEventRoundId(rd);
      const roundDesksInRound = this.ptaEventRoundDesks.filter((item) => {
        if (roundId == null) return ptaRoundDeskId(item) === Number(roundDeskId);
        return ptaEventRoundId(item) === roundId;
      });
      const row =
        this.ptaGameSchedules.find((item) => {
          return (
            ptaScheduleRoundDeskId(item) === Number(roundDeskId) &&
            ptaSchedulePlayerId(item) === Number(playerId)
          );
        }) || findPtaScheduleForDeskSeat(rd, this.ptaGameSchedules, roundDesksInRound, Number(playerId));
      if (!row) return;
      Object.assign(row, patch);
      this.persistCurrentPtaDraw(eventId);
    },

    applyDeskSeatResults(
      eventId: number | string,
      roundDeskId: number,
      seats: Array<{
        playerId: number;
        amount: number | null;
        onTrack: number | null;
        position: number | null;
        resultPoint: number | null;
      }>
    ) {
      const rd = this.ptaEventRoundDesks.find((item) => ptaRoundDeskId(item) === Number(roundDeskId));
      const roundId = ptaEventRoundId(rd);
      const roundDesksInRound = this.ptaEventRoundDesks.filter((item) => {
        if (roundId == null) return ptaRoundDeskId(item) === Number(roundDeskId);
        return ptaEventRoundId(item) === roundId;
      });
      for (const seat of seats) {
        const row =
          this.ptaGameSchedules.find((item) => {
            return (
              ptaScheduleRoundDeskId(item) === Number(roundDeskId) &&
              ptaSchedulePlayerId(item) === Number(seat.playerId)
            );
          }) || findPtaScheduleForDeskSeat(rd, this.ptaGameSchedules, roundDesksInRound, seat.playerId);
        if (!row) continue;
        row.Amount = seat.amount;
        row.OnTrack = seat.onTrack;
        row.Position = seat.position;
        row.ResultPoint = seat.resultPoint;
      }
      this.persistCurrentPtaDraw(eventId);
    },

    applyPtaPlayerFinals(
      eventId: number | string,
      patch: {
        eventPlayerId: number | null;
        finalPoint: number | null;
        finalTruckPoint: number | null;
        finalPosition: number | null;
      }
    ) {
      if (patch.eventPlayerId == null) return;
      const key = String(eventId);
      let changed = false;
      const next = this.ptaEventPlayers.map((player) => {
        if (String(player.EventID ?? player.eventID ?? '') !== key) return player;
        const playerId = nullableNumericId(player.EventPlayerID ?? player.id);
        if (playerId !== patch.eventPlayerId) return player;
        changed = true;
        return {
          ...player,
          FinalPoint: patch.finalPoint,
          FinalTruckPoint: patch.finalTruckPoint,
          FinalPosition: patch.finalPosition,
        };
      });
      if (!changed) return;
      this.ptaEventPlayers = next;
      this.persistCurrentPtaDraw(eventId);
    },

    /** Helyi dummy leaderboard. Éles: Pta.PublishRound után GET userdata FinalPoint/FinalTruckPoint. */
    refreshPtaPlayerFinals(eventId: number | string) {
      const key = String(eventId);
      const master = useMasterDataStore();
      const rounds = this.getPtaRoundsForEvent(eventId).map((row, index) => {
        const id = nullableNumericId(row.EventRoundID ?? row.id) ?? index + 1;
        const statusId = nullableNumericId(row.EventRoundStatusID);
        const fromMaster =
          statusId != null ? master.getPtaEventRoundStatusById(statusId)?.SName : '';
        return {
          id,
          status: String(fromMaster || row.SName || ''),
        };
      });
      const finals = computePublishedPlayerFinals({
        rounds,
        roundDesks: this.getPtaRoundDesksForEvent(eventId),
        schedules: this.getPtaSchedulesForEvent(eventId),
        catalogHasPublished: catalogHasPublishedStatus(master.ptaEventRoundStatuses),
      });
      const byId = new Map(finals.map((row) => [row.playerId, row]));
      let changed = false;
      const next = this.ptaEventPlayers.map((player) => {
        if (String(player.EventID ?? player.eventID ?? '') !== key) return player;
        const playerId = nullableNumericId(player.EventPlayerID ?? player.id);
        const row = playerId != null ? byId.get(playerId) : undefined;
        const FinalPoint = row?.FinalPoint ?? null;
        const FinalPosition = row?.FinalPosition ?? null;
        const FinalTruckPoint = row?.FinalTruckPoint ?? null;
        if (
          player.FinalPoint === FinalPoint &&
          player.FinalPosition === FinalPosition &&
          player.FinalTruckPoint === FinalTruckPoint
        ) {
          return player;
        }
        changed = true;
        return { ...player, FinalPoint, FinalPosition, FinalTruckPoint };
      });
      if (!changed) return;
      this.ptaEventPlayers = next;
      this.persistCurrentPtaDraw(eventId);
    },

    applyEventUserContact(
      eventUserId: number | string,
      contact: {
        LastName: string;
        FirstName: string;
        EmailAddress: string;
        PhoneNumber: string | null;
      }
    ) {
      const target = Number(eventUserId);
      if (!Number.isFinite(target)) return;
      const display = [contact.LastName, contact.FirstName].filter(Boolean).join(' ');
      const patchEu = (row: EventUser) => {
        if (Number(row.id) !== target) return;
        row.LastName = contact.LastName;
        row.FirstName = contact.FirstName;
        row.EmailAddress = contact.EmailAddress;
        row.PhoneNumber = contact.PhoneNumber;
        (row as EventParticipant).LastName = contact.LastName;
        (row as EventParticipant).FirstName = contact.FirstName;
        (row as EventParticipant).EmailAddress = contact.EmailAddress;
        (row as EventParticipant).PhoneNumber = contact.PhoneNumber;
        if ('DisplayName' in row) row.DisplayName = display;
      };
      this.eventParticipants.forEach(patchEu);
      this.eventUsers.forEach(patchEu);
      this.ptaEventPlayers = this.ptaEventPlayers.map((player) => {
        const playerEventUserId = nullableNumericId(
          player.EventUserID ?? player.eventUserID ?? player.EventUserId
        );
        if (playerEventUserId !== target) return player;
        return {
          ...player,
          LastName: contact.LastName,
          FirstName: contact.FirstName,
          Name: display,
          DisplayName: display,
        };
      });
    },

    applyEventUserRating(
      eventUserId: number | string,
      rating: number | null,
      ratingComment: string | null
    ) {
      const target = Number(eventUserId);
      if (!Number.isFinite(target)) return;
      const nextRating = rating != null && rating >= 1 && rating <= 5 ? rating : null;
      const nextComment = nextRating == null ? null : ratingComment;
      const patch = (row: EventUser) => {
        if (Number(row.id) !== target) return;
        row.Rating = nextRating;
        row.RatingComment = nextComment;
      };
      this.eventParticipants.forEach(patch);
      this.eventUsers.forEach(patch);
    },

    applyEventUserStatus(
      eventUserId: number | string,
      newStatusId: number,
      prevStatusId: number | null,
      persistLocal = true
    ) {
      const target = Number(eventUserId);
      if (!Number.isFinite(target)) return;
      const patch = (row: EventUser) => {
        if (Number(row.id) === target) {
          applyStatusPatchToEventUser(row, newStatusId, prevStatusId);
        }
      };
      this.eventParticipants.forEach(patch);
      this.eventUsers.forEach(patch);
      if (persistLocal) rememberEventUserStatus(target, newStatusId, prevStatusId);
    },

    applyEventUserChangePayload(payload: Record<string, unknown>, persistLocal = true) {
      const toId = nullableNumericId(payload.ToStatusID ?? payload.toStatusID ?? payload.toStatusId);
      if (toId == null) return;
      const prevId = nullableNumericId(
        payload.PrevStatusID ?? payload.prevStatusID ?? payload.prevStatusId
      );
      const ids = new Set<number>();
      const batch = payload.EventUserIDs ?? payload.eventUserIDs ?? payload.eventUserIds;
      if (Array.isArray(batch)) {
        for (const item of batch) {
          const id = nullableNumericId(item);
          if (id != null) ids.add(id);
        }
      }
      const single = nullableNumericId(
        payload.EventUserID ?? payload.eventUserID ?? payload.eventUserId
      );
      if (single != null) ids.add(single);
      const uid = String(payload.EventUserUID ?? payload.eventUserUID ?? payload.eventUserUid ?? '').trim();
      if (uid) {
        const match = [...this.eventUsers, ...this.eventParticipants].find((row) =>
          eventUserUidsMatch(row.EventUserUID, uid)
        );
        if (match) ids.add(Number(match.id));
      }
      for (const id of ids) {
        this.applyEventUserStatus(id, toId, prevId, persistLocal);
      }
    },

    collectEventUserIdsFromPayload(payload: Record<string, unknown>): number[] {
      const ids = new Set<number>();
      const batch = payload.EventUserIDs ?? payload.eventUserIDs ?? payload.eventUserIds;
      if (Array.isArray(batch)) {
        for (const item of batch) {
          const id = nullableNumericId(item);
          if (id != null) ids.add(id);
        }
      }
      const single = nullableNumericId(
        payload.EventUserID ?? payload.eventUserID ?? payload.eventUserId
      );
      if (single != null) ids.add(single);
      const uid = String(payload.EventUserUID ?? payload.eventUserUID ?? payload.eventUserUid ?? '').trim();
      if (uid) {
        const match = [...this.eventUsers, ...this.eventParticipants].find((row) =>
          eventUserUidsMatch(row.EventUserUID, uid)
        );
        if (match) ids.add(Number(match.id));
      }
      return [...ids];
    },

    applyEventUserApply(eventId: number, payload: Record<string, unknown>) {
      const ticketId = nullableNumericId(
        payload.EventTicketID ?? payload.eventTicketID ?? payload.TicketID ?? payload.ticketID
      );
      const masterRoleId = nullableNumericId(payload.RoleID ?? payload.roleID ?? payload.RoleId);
      const eventRole = (this.roles || []).find((er: any) => {
        const sameEvent =
          nullableNumericId(er.EventID ?? er.eventID) == null ||
          Number(er.EventID ?? er.eventID) === eventId;
        return (
          sameEvent &&
          (Number(er.RoleID ?? er.RoleId) === masterRoleId || Number(er.id) === masterRoleId)
        );
      });
      const id =
        nullableNumericId(payload.EventUserID ?? payload.eventUserID ?? payload.id) ??
        -Math.abs(Date.now() % 1_000_000_000);
      const first = String(payload.FirstName ?? payload.firstName ?? '').trim();
      const last = String(payload.LastName ?? payload.lastName ?? '').trim();
      const existing = this.eventParticipants.find((row) => Number(row.id) === id);
      const row: EventParticipant = {
        ...(existing || {}),
        id,
        EventID: eventId,
        EventRoleID: nullableNumericId(eventRole?.id ?? eventRole?.ID) ?? masterRoleId,
        EventTicketID: ticketId,
        InvoiceID: existing?.InvoiceID ?? null,
        EventUserStatusID: existing?.EventUserStatusID ?? null,
        UserID: existing?.UserID ?? nullableNumericId(payload.UserID ?? payload.userID),
        EventUserUID: existing?.EventUserUID ?? null,
        PrevEventUserStatusID: existing?.PrevEventUserStatusID ?? null,
        Rating: existing?.Rating ?? rowNullableRating(payload as Record<string, unknown>),
        RatingComment:
          existing?.RatingComment ??
          rowNullableString(payload as Record<string, unknown>, 'RatingComment', 'ratingComment'),
        FirstName: first,
        LastName: last,
        EmailAddress: String(payload.EmailAddress ?? payload.email ?? existing?.EmailAddress ?? ''),
        PhoneNumber: existing?.PhoneNumber ?? null,
        ActiveFlg: 1,
      };
      if (existing) {
        Object.assign(existing, row);
      } else {
        this.eventParticipants.push(row);
      }
    },

    removeEventUserLive(eventUserId: number) {
      const id = Number(eventUserId);
      this.eventParticipants = this.eventParticipants.filter((row) => Number(row.id) !== id);
      this.eventUsers = this.eventUsers.filter((row) => Number(row.id) !== id);
    },

    // SignalR élő esemény státusz módosítás
    updateEventStatus(eventId: number, newStatusId: number) {
      const eventUser = this.eventUsers.find(eu => eu.EventID === eventId);
      if (eventUser) {
        eventUser.EventUserStatusID = newStatusId; 
      }
    }
  }
});
