import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { isTruthyFlag, nullableNumericId, pickDataset, unwrapApiPayload, warnIfDatasetMissing } from 'src/utils/apiPayload';
import { eventUserUidsMatch, normalizeEventUserUid } from 'src/utils/eventUserQr';
import { membershipRoleKind, pickDisplayEventUser } from 'src/utils/eventUserStatus';
import {
  collectGroupingValues,
  findPtaPlayerForEventUser,
  normalizePtaEventPlayers,
  normalizePtaEventSettings,
  normalizePtaRows,
  type PtaEventPlayer,
  type PtaEventSettings,
} from 'src/modules/profitability/ptaData';
import { buildPtaDraw, type PtaDrawBuildResult } from 'src/modules/profitability/buildPtaDraw';
import { PLAYERS_PER_DESK } from 'src/modules/profitability/drawEngine';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';
import {
  catalogHasPublishedStatus,
  computePublishedPlayerFinals,
} from 'src/modules/profitability/standings';
import { findEventStatusIdByNameHints } from 'src/utils/eventFlow';
import {
  eventUserStatusColor,
  eventUserStatusName,
  findEventUserStatus,
} from 'src/utils/eventUserFlow';
import { useMasterDataStore } from './masterData';

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

function rowNumericId(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = row[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
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
  const display = String(row.DisplayName ?? row.Name ?? '').trim();
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const parts = display.split(/\s+/).filter(Boolean);
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
    FirstName: first || parts.slice(1).join(' '),
    LastName: last || parts[0] || display || 'Játékos',
    EmailAddress: String(row.EmailAddress ?? row.emailAddress ?? row.Email ?? ''),
    PhoneNumber: (row.PhoneNumber ?? row.phoneNumber ?? null) as string | null,
    DisplayName: display,
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

function ptaRowsForEvent<T extends Record<string, unknown>>(rows: T[], eventId: number | string): T[] {
  const key = String(eventId);
  return (rows || []).filter(
    (row) => String(row.EventID ?? row.eventID ?? row.EventId ?? '') === key
  );
}

function participantDisplayName(row: Record<string, unknown>): string {
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const display = String(row.DisplayName ?? row.UserName ?? row.Name ?? '').trim();
  return [last, first].filter(Boolean).join(' ') || display || 'Játékos';
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

/** TEMP: nincs mentő API, a userdata újratöltés felülírná a helyi státuszt / sorsolást */
const LS_EVENT_USER_STATUS = 'ej_localEventUserStatus';
const LS_EVENT_STATUS = 'ej_localEventStatus';
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
 * A helyi TEMP státusz-patch csak a következő event/data-ig élhet —
 * meghívó (NeedUserApproval) esetén azonnal eldobjuk, hogy ne legyen Belépett.
 */
function pruneLocalEventUserStatusPatches(eventUsers: EventUser[]) {
  const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_USER_STATUS, {});
  const master = useMasterDataStore();
  let changed = false;
  for (const eu of eventUsers || []) {
    const key = String(eu.id);
    const patch = patches[key];
    if (!patch) continue;
    const apiNeedsUserApproval = master.eventUserStatusNeedsUserApproval(eu.EventUserStatusID);
    const patchDiffers = Number(patch.statusId) !== Number(eu.EventUserStatusID);
    // Meghívott API státusz, vagy eltérő helyi override → API nyer
    if (apiNeedsUserApproval || patchDiffers) {
      delete patches[key];
      changed = true;
    }
  }
  if (changed) writeLocalJson(LS_EVENT_USER_STATUS, patches);
}

function rememberEventStatus(eventId: number | string, statusId: number, prevStatusId: number | null) {
  const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_STATUS, {});
  patches[String(eventId)] = { statusId, prevStatusId };
  writeLocalJson(LS_EVENT_STATUS, patches);
}

function rememberPtaDraw(eventId: number | string, snapshot: LocalPtaDrawSnapshot) {
  const all = readLocalJson<Record<string, LocalPtaDrawSnapshot>>(LS_PTA_DRAW, {});
  all[String(eventId)] = snapshot;
  writeLocalJson(LS_PTA_DRAW, all);
}

function forgetPtaDraw(eventId: number | string) {
  const all = readLocalJson<Record<string, LocalPtaDrawSnapshot>>(LS_PTA_DRAW, {});
  delete all[String(eventId)];
  writeLocalJson(LS_PTA_DRAW, all);
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
    ptaEventSettings: [] as PtaEventSettings[],
    ptaEventDesks: [] as Record<string, unknown>[],
    ptaEventRounds: [] as Record<string, unknown>[],
    ptaEventRoundDesks: [] as Record<string, unknown>[],
    ptaEventPlayers: [] as PtaEventPlayer[],
    ptaGameSchedules: [] as Record<string, unknown>[],
    ptaEventPrizes: [] as Record<string, unknown>[],
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
          if (!synthesized || byId.has(synthesized.id)) continue;
          byId.set(synthesized.id, synthesized);
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
        return Number(a.DeskNo ?? 0) - Number(b.DeskNo ?? 0);
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
            .map((row) => nullableNumericId(row.EventRoundID ?? row.id))
            .filter((id): id is number => id != null)
        );
        return this.ptaEventRoundDesks.filter((row) => {
          const roundId = nullableNumericId(row.EventRoundID);
          return roundId != null && roundIds.has(roundId);
        });
      };
    },
    getPtaSchedulesForEvent() {
      return (eventId: number | string) => {
        const roundDeskIds = new Set(
          this.getPtaRoundDesksForEvent(eventId)
            .map((row) => nullableNumericId(row.EventRoundDeskID ?? row.id))
            .filter((id): id is number => id != null)
        );
        return this.ptaGameSchedules.filter((row) => {
          const deskId = nullableNumericId(row.EventRoundDeskID);
          return deskId != null && roundDeskIds.has(deskId);
        });
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
    /** RoleTypeID = 1 (Szervező) ezen az eseményen */
    isOrganizerOnEvent() {
      return (eventId: number | string) => {
        const masterDataStore = useMasterDataStore();
        return this.getMasterRoleIdsForEvent(eventId).some((roleId) =>
          masterDataStore.isOrganizerRole(roleId)
        );
      };
    },
    /**
     * A kártyán megjelenő saját EventUser: résztvevő > közreműködő.
     * Szervezői RoleType-nak nincs státusza — ha csak az van, null.
     */
    getDisplayEventUserForEvent() {
      return (eventId: number | string): EventUser | null => {
        const masterDataStore = useMasterDataStore();
        return pickDisplayEventUser(this.getEventUsersForEvent(eventId), (eu) => {
          const masterRoleId = resolveMasterRoleId(this.roles, eu);
          return membershipRoleKind({
            isOrganizer: masterDataStore.isOrganizerRole(masterRoleId),
            roleTypeName: masterRoleId != null ? masterDataStore.getRoleTypeNameByRoleId(masterRoleId) : '',
            roleName: masterRoleId != null ? masterDataStore.getRoleNameById(masterRoleId) : '',
          });
        });
      };
    },
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
          const sid = nullableNumericId(eu.EventUserStatusID);
          return (
            masterDataStore.eventUserStatusNeedsUserApproval(sid) ||
            isTruthyFlag(eu.NeedUserApprovalFlg ?? eu.needUserApprovalFlg)
          );
        });
        const eu = pendingUserRow || this.getDisplayEventUserForEvent(eventId);
        const statusId = nullableNumericId(eu?.EventUserStatusID);
        const eventUserId = nullableNumericId(eu?.id);
        if (statusId == null || eventUserId == null) return null;

        const row = findEventUserStatus(masterDataStore.eventUserStatuses, statusId);
        const catalogName = eventUserStatusName(row);
        const fallbackName = masterDataStore.getEventUserStatusName(statusId);
        const resolvedName =
          catalogName || (fallbackName && fallbackName !== 'Ismeretlen' ? fallbackName : '');
        if (!resolvedName) return null;

        const needUserApproval =
          masterDataStore.eventUserStatusNeedsUserApproval(statusId) ||
          isTruthyFlag(eu?.NeedUserApprovalFlg ?? eu?.needUserApprovalFlg) ||
          resolvedName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes('meghivott');
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
      pruneLocalEventUserStatusPatches(this.eventUsers);
      this.reapplyLocalEventUserStatuses();
      this.reapplyLocalEventStatuses();
      this.reapplyAllLocalPtaDraws();
    },

    async refreshEventData() {
      const response = await api.get('/api/event/data');
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

      const response = await api.get(`/api/event/userdata/${id}`);
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

      this.ptaEventSettings = normalizePtaEventSettings(
        pickDataset(data, 'EventSettings', 'eventSettings', 'PtaEventSettings')
      );
      this.ptaEventDesks = normalizePtaRows(pickDataset(data, 'EventDesks', 'eventDesks'));
      this.ptaEventRounds = normalizePtaRows(pickDataset(data, 'EventRounds', 'eventRounds'));
      this.ptaEventRoundDesks = normalizePtaRows(
        pickDataset(data, 'EventRoundDesks', 'eventRoundDesks')
      );
      const nextPlayers = normalizePtaEventPlayers(
        pickDataset(data, 'EventPlayers', 'eventPlayers', 'PtaEventPlayers', 'ptaEventPlayers')
      );
      if (nextPlayers.length) this.ptaEventPlayers = nextPlayers;
      this.ptaGameSchedules = normalizePtaRows(pickDataset(data, 'GameSchedules', 'gameSchedules'));
      this.ptaEventPrizes = normalizePtaRows(pickDataset(data, 'EventPrizes', 'eventPrizes'));

      if (Number(this.eventUserScreenContext?.dataSheetType) === ORGANIZER_DATASHEET_TYPE) {
        warnIfDatasetMissing('event.userdata.EventParticpants', participants, data);
      }

      // userdata EventUsers (saját sorok) — meghívó státusz ne legyen helyi Belépett alá írva
      if (userdataUsers.length) {
        const byId = new Map(this.eventUsers.map((row) => [row.id, row]));
        for (const row of userdataUsers) byId.set(row.id, row);
        this.eventUsers = [...byId.values()];
        pruneLocalEventUserStatusPatches(userdataUsers);
      }

      this.reapplyLocalEventUserStatuses();
      this.reapplyLocalEventStatuses();
      this.reapplyLocalPtaDraw(this.eventUserScreenContext?.eventId ?? null);

      return this.eventUserScreenContext;
    },

    /** Ha az API meghívott (NeedUserApproval), a helyi patch ne írja felül. */
    pruneStaleEventUserStatusPatches() {
      pruneLocalEventUserStatusPatches(this.eventUsers);
    },

    reapplyAllLocalPtaDraws() {
      const all = readLocalJson<Record<string, LocalPtaDrawSnapshot>>(LS_PTA_DRAW, {});
      for (const eventId of Object.keys(all)) {
        this.reapplyLocalPtaDraw(eventId);
      }
    },

    persistCurrentPtaDraw(eventId: number | string) {
      rememberPtaDraw(eventId, {
        desks: ptaRowsForEvent(this.ptaEventDesks, eventId),
        rounds: ptaRowsForEvent(this.ptaEventRounds, eventId),
        roundDesks: this.getPtaRoundDesksForEvent(eventId),
        players: ptaRowsForEvent(this.ptaEventPlayers, eventId),
        schedules: this.getPtaSchedulesForEvent(eventId),
      });
    },

    reapplyLocalEventUserStatuses() {
      const patches = readLocalJson<Record<string, LocalStatusPatch>>(LS_EVENT_USER_STATUS, {});
      for (const [id, patch] of Object.entries(patches)) {
        const target = Number(id);
        if (!Number.isFinite(target) || !patch) continue;
        const apply = (row: EventUser) => {
          if (Number(row.id) === target) {
            row.EventUserStatusID = patch.statusId;
            row.PrevEventUserStatusID = patch.prevStatusId;
          }
        };
        this.eventParticipants.forEach(apply);
        this.eventUsers.forEach(apply);
      }
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
      const snapshot = readLocalJson<Record<string, LocalPtaDrawSnapshot>>(LS_PTA_DRAW, {})[String(eventId)];
      if (!snapshot) return;

      const key = String(eventId);
      const oldRoundIds = new Set(
        ptaRowsForEvent(this.ptaEventRounds, eventId)
          .map((row) => nullableNumericId(row.EventRoundID ?? row.id))
          .filter((id): id is number => id != null)
      );
      const oldRoundDeskIds = new Set(
        this.ptaEventRoundDesks
          .filter((row) => {
            const roundId = nullableNumericId(row.EventRoundID);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => nullableNumericId(row.EventRoundDeskID ?? row.id))
          .filter((id): id is number => id != null)
      );

      this.ptaEventDesks = [
        ...this.ptaEventDesks.filter((row) => String(row.EventID ?? row.eventID ?? '') !== key),
        ...(snapshot.desks || []),
      ];
      this.ptaEventRounds = [
        ...this.ptaEventRounds.filter((row) => String(row.EventID ?? row.eventID ?? '') !== key),
        ...(snapshot.rounds || []),
      ];
      this.ptaEventRoundDesks = [
        ...this.ptaEventRoundDesks.filter((row) => {
          const id = nullableNumericId(row.EventRoundDeskID ?? row.id);
          return id == null || !oldRoundDeskIds.has(id);
        }),
        ...(snapshot.roundDesks || []),
      ];
      this.ptaGameSchedules = [
        ...this.ptaGameSchedules.filter((row) => {
          const deskId = nullableNumericId(row.EventRoundDeskID);
          return deskId == null || !oldRoundDeskIds.has(deskId);
        }),
        ...(snapshot.schedules || []),
      ];

      const nextPlayers = this.ptaEventPlayers.filter(
        (row) => String(row.EventID ?? row.eventID ?? '') !== key
      );
      this.ptaEventPlayers = [...nextPlayers, ...normalizePtaEventPlayers(snapshot.players || [])];
      this.refreshPtaPlayerFinals(eventId);
    },

    applyEventStatus(
      eventId: number | string,
      newStatusId: number,
      prevStatusId: number | null
    ) {
      const target = String(eventId);
      const apply = (event: any) => {
        event.EventStatusID = newStatusId;
        event.PrevEventStatusID = prevStatusId;
      };
      const event = this.events.find((e: any) => String(e.id) === target);
      if (event) apply(event);
      const mine = this.myEvents.find((e: any) => String(e.id) === target);
      if (mine) apply(mine);
      rememberEventStatus(eventId, newStatusId, prevStatusId);
    },

    /** TEMP dummy: helyi sorsolás/eredmény törlése, EventStatus → Szervezés. Nem megy a DB-be. */
    resetLocalPtaEvent(eventId: number | string): { ok: true; statusName: string } | { ok: false; message: string } {
      const key = String(eventId);
      const oldRoundIds = new Set(
        ptaRowsForEvent(this.ptaEventRounds, eventId)
          .map((row) => nullableNumericId(row.EventRoundID ?? row.id))
          .filter((id): id is number => id != null)
      );
      const oldRoundDeskIds = new Set(
        this.ptaEventRoundDesks
          .filter((row) => {
            const roundId = nullableNumericId(row.EventRoundID);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => nullableNumericId(row.EventRoundDeskID ?? row.id))
          .filter((id): id is number => id != null)
      );

      this.ptaEventDesks = this.ptaEventDesks.filter(
        (row) => String(row.EventID ?? row.eventID ?? '') !== key
      );
      this.ptaEventRounds = this.ptaEventRounds.filter(
        (row) => String(row.EventID ?? row.eventID ?? '') !== key
      );
      this.ptaEventRoundDesks = this.ptaEventRoundDesks.filter((row) => {
        const id = nullableNumericId(row.EventRoundDeskID ?? row.id);
        return id == null || !oldRoundDeskIds.has(id);
      });
      this.ptaGameSchedules = this.ptaGameSchedules.filter((row) => {
        const deskId = nullableNumericId(row.EventRoundDeskID);
        return deskId == null || !oldRoundDeskIds.has(deskId);
      });
      this.ptaEventPlayers = this.ptaEventPlayers.filter(
        (row) => String(row.EventID ?? row.eventID ?? '') !== key
      );
      forgetPtaDraw(eventId);

      const master = useMasterDataStore();
      const organizingId = findEventStatusIdByNameHints(master.eventStatuses, [
        'szervezes',
        'szervezés',
        'tervezes',
        'tervezés',
      ]);
      if (organizingId == null) {
        return { ok: false, message: 'Nincs Szervezés / Tervezés EventStatus a törzsben.' };
      }
      this.applyEventStatus(eventId, organizingId, null);
      const event = this.events.find((e: any) => String(e.id) === key);
      if (event) {
        event.PendingApprovalID = null;
        event.pendingApprovalID = null;
      }
      const statusName = master.getEventStatusNameById(organizingId, 'Szervezés');
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

      const drafts: {
        eventUserId: number;
        userId: number | null;
        name: string;
        groups: ReturnType<typeof collectGroupingValues>;
        existingPlayer: PtaEventPlayer | null;
      }[] = [];
      const gameMasterUserIds: number[] = [];

      for (const eu of this.getEventParticipantsForEvent(eventId)) {
        const masterRoleId = resolveMasterRoleId(this.roles, eu);
        const roleName = masterRoleId != null ? master.getRoleNameById(masterRoleId) : '';
        const roleTypeName =
          masterRoleId != null ? master.getRoleTypeNameByRoleId(masterRoleId) : '';
        const kind = membershipRoleKind({
          isOrganizer: master.isOrganizerRole(masterRoleId),
          roleTypeName,
          roleName,
        });
        const statusId = nullableNumericId(eu.EventUserStatusID);
        const statusName = statusId != null ? master.getEventUserStatusName(statusId) : '';
        const checkedIn = foldText(statusName).includes('belep');
        const userId = nullableNumericId(eu.UserID ?? eu.userID ?? eu.UserId);

        if (isGameMasterRole(masterRoleId, roleName, roleTypeName)) {
          if (userId != null) gameMasterUserIds.push(userId);
          continue;
        }
        if (kind !== 'participant' || !checkedIn) continue;

        const existing = findPtaPlayerForEventUser(
          this.ptaEventPlayers,
          eventId,
          eu.id,
          userId
        );
        const orgId = nullableNumericId(
          (existing as Record<string, unknown> | null)?.OrganizationID ??
            (existing as Record<string, unknown> | null)?.organizationID ??
            eu.OrganizationID ??
            (eu as Record<string, unknown>).organizationID
        );
        const orgName = orgId != null ? master.getOrganizationNameById(orgId) : '';
        drafts.push({
          eventUserId: eu.id,
          userId,
          name: participantDisplayName(eu as Record<string, unknown>),
          groups: collectGroupingValues(
            [
              existing,
              eu as Record<string, unknown>,
              orgName ? { OrganizationName: orgName } : null,
            ],
            settings
          ),
          existingPlayer: existing,
        });
      }

      if (drafts.length < PLAYERS_PER_DESK) {
        return {
          ok: false,
          message: `Legalább 4 belépett játékos kell. Jelenleg: ${drafts.length} fő.`,
        };
      }

      drafts.sort((a, b) => a.eventUserId - b.eventUserId);
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
            const roundId = nullableNumericId(row.EventRoundID);
            return roundId != null && oldRoundIds.has(roundId);
          })
          .map((row) => nullableNumericId(row.EventRoundDeskID ?? row.id))
          .filter((id): id is number => id != null)
      );

      const remainingDesks = this.ptaEventDesks.filter(
        (row) => String(row.EventID ?? row.eventID ?? '') !== String(eventId)
      );
      const remainingRounds = this.ptaEventRounds.filter(
        (row) => String(row.EventID ?? row.eventID ?? '') !== String(eventId)
      );
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
        gameMasterUserIds,
        remainingDesks,
        remainingRounds,
        remainingRoundDesks,
        remainingSchedules,
        allPlayers: this.ptaEventPlayers,
      });
      if (!built.ok) return built;

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
        (item) => Number(item.EventRoundDeskID ?? item.id) === Number(roundDeskId)
      );
      if (!row) return;
      Object.assign(row, patch);
      this.persistCurrentPtaDraw(eventId);
    },

    /** Játékmester az asztalra írja magát (EventDesk + minden forduló EventRoundDesk). */
    setDeskGameMaster(
      eventId: number | string,
      roundDeskId: number,
      userId: number | null
    ) {
      const row = this.ptaEventRoundDesks.find(
        (item) => Number(item.EventRoundDeskID ?? item.id) === Number(roundDeskId)
      );
      if (!row) return;
      const deskId = nullableNumericId(row.EventDeskID);
      if (deskId == null) {
        row.GameMasterUserID = userId;
        this.persistCurrentPtaDraw(eventId);
        return;
      }
      const desk = this.ptaEventDesks.find(
        (item) => nullableNumericId(item.EventDeskID ?? item.id) === deskId
      );
      if (desk) desk.GameMasterUserID = userId;
      for (const roundDesk of this.ptaEventRoundDesks) {
        if (nullableNumericId(roundDesk.EventDeskID) === deskId) {
          roundDesk.GameMasterUserID = userId;
        }
      }
      this.persistCurrentPtaDraw(eventId);
    },

    applyGameSchedulePatch(
      eventId: number | string,
      roundDeskId: number,
      playerId: number,
      patch: Record<string, unknown>
    ) {
      const row = this.ptaGameSchedules.find((item) => {
        return (
          Number(item.EventRoundDeskID) === Number(roundDeskId) &&
          Number(item.PlayerID) === Number(playerId)
        );
      });
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
      for (const seat of seats) {
        const row = this.ptaGameSchedules.find((item) => {
          return (
            Number(item.EventRoundDeskID) === Number(roundDeskId) &&
            Number(item.PlayerID) === Number(seat.playerId)
          );
        });
        if (!row) continue;
        row.Amount = seat.amount;
        row.OnTrack = seat.onTrack;
        row.Position = seat.position;
        row.ResultPoint = seat.resultPoint;
      }
      this.persistCurrentPtaDraw(eventId);
      this.refreshPtaPlayerFinals(eventId);
    },

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

    applyEventUserStatus(
      eventUserId: number | string,
      newStatusId: number,
      prevStatusId: number | null
    ) {
      const target = Number(eventUserId);
      if (!Number.isFinite(target)) return;
      const patch = (row: EventUser) => {
        if (Number(row.id) === target) {
          row.EventUserStatusID = newStatusId;
          row.PrevEventUserStatusID = prevStatusId;
        }
      };
      this.eventParticipants.forEach(patch);
      this.eventUsers.forEach(patch);
      rememberEventUserStatus(target, newStatusId, prevStatusId);
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
