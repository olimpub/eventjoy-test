import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { isActiveFlag, isTruthyFlag, nullableNumericId, pickDataset, unwrapApiPayload, warnIfDatasetMissing } from 'src/utils/apiPayload';
import {
  eventTypeHasPtaFlag,
  normalizePtaChampionships,
  normalizePtaEventRoundStatuses,
  normalizePtaExtraPrizes,
  normalizePtaGameTypeRounds,
  normalizePtaGameTypes,
  normalizePtaPairModes,
  type PtaChampionship,
  type PtaEventRoundStatus,
  type PtaExtraPrize,
  type PtaGameType,
  type PtaGameTypeRound,
  type PtaPairMode,
} from 'src/modules/profitability/ptaData';
import {
  findEventStatus,
  getEventFlowIdForType,
  getEventStatusNameById,
  listAllowedEventStatusTransitions,
  listUndoEventStatusTransitions,
  normalizeEventFlows,
  normalizeEventFlowStatusRoles,
  normalizeEventFlowStatuses,
  type EventFlow,
  type EventFlowStatus,
  type EventFlowStatusRole,
  type EventStatusTransition,
} from 'src/utils/eventFlow';
import {
  defaultEventUserFlowTemplateCode,
  findEventUserFlowTemplateByCode,
  findEventUserFlowTemplateIdByCode,
  listAllowedEventUserStatusTransitions,
  listUndoEventUserStatusTransitions,
  normalizeEventUserFlowTemplates,
  normalizeEventUserFlowTemplateSteps,
  type EventUserFlowTemplate,
  type EventUserFlowTemplateStep,
  type EventUserStatusTransition,
} from 'src/utils/eventUserFlow';

/** tblOrganization (ActiveFlg = 1) — JSON: Organizations */
export interface MasterOrganization {
  id: number;
  Name: string;
  ShortName?: string | null;
  Email?: string | null;
  Phone?: string | null;
  TaxId?: string | null;
  CountryCode?: string | null;
  PostalCode?: string | null;
  City?: string | null;
  AddressLine1?: string | null;
  AddressLine2?: string | null;
  OrganizationTypeID?: number | null;
  ActiveFlg?: boolean | number;
  LastUpdatedUserID?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** RS 13 — OrganizationTypes */
export interface MasterOrganizationType {
  id: number;
  Name: string;
  Code?: string | null;
  Description?: string | null;
  ActiveFlg?: boolean | number;
}

/** RS 14 — OrganizationUserTypes */
export interface MasterOrganizationUserType {
  id: number;
  Code: string;
  Name: string;
  OwnerFlg: boolean;
  ManagerFlg: boolean;
  MemberFlg: boolean;
  NonMemberFlg: boolean;
  ActiveFlg?: boolean | number;
  LastUpdatedUserID?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

function rowId(row: Record<string, unknown>): number | undefined {
  const raw = row.id ?? row.ID ?? row.Id;
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function isActiveRecord(row: Record<string, unknown>): boolean {
  const flag = row.ActiveFlg ?? row.activeFlg;
  return isActiveFlag(flag);
}

function normalizeEventStatuses(rows: unknown[]): Record<string, unknown>[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const id = rowId(row) ?? nullableNumericId(row.EventStatusID ?? row.eventStatusID ?? row.EventStatusId);
      return {
        ...row,
        id,
        StatusName: String(row.StatusName ?? row.Name ?? row.EventStatusName ?? row.statusName ?? '').trim(),
        InProgressFlg: isTruthyFlag(row.InProgressFlg ?? row.inProgressFlg),
        ClosedFlg: isTruthyFlag(row.ClosedFlg ?? row.closedFlg ?? row.CloseFlg),
        ActiveFlg: row.ActiveFlg ?? row.activeFlg,
      };
    })
    .filter((row) => row.id != null && Number.isFinite(Number(row.id)));
}

/** EventTypes — CanEnterFlg: van beléphető esemény-adatlap; EventFlowID: státuszfolyamat */
function normalizeEventTypes(rows: unknown[]): any[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      ...row,
      id: rowId(row) ?? Number(row.id),
      CanEnterFlg: isTruthyFlag(row.CanEnterFlg ?? row.canEnterFlg),
      PTAFlg: isTruthyFlag(row.PTAFlg ?? row.PtaFlg ?? row.ptaFlg),
      EventFlowID: nullableNumericId(row.EventFlowID ?? row.eventFlowID ?? row.EventFlowId),
    }))
    .filter((row) => Number.isFinite(Number(row.id)));
}

function rowDisplayName(row: Record<string, unknown>): string {
  return String(
    row.Name ??
      row.name ??
      row.TypeName ??
      row.typeName ??
      row.OrganizationTypeName ??
      row.OrganizationUserTypeName ??
      ''
  );
}

function normalizeOrganizations(rows: unknown[]): MasterOrganization[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(isActiveRecord)
    .map((row) => {
      const typeRaw = row.OrganizationTypeID ?? row.organizationTypeID ?? row.OrganizationTypeId;
      const typeNum = typeRaw === undefined || typeRaw === null || typeRaw === '' ? null : Number(typeRaw);

      return {
        id: rowId(row)!,
        Name: String(row.Name ?? row.name ?? ''),
        ShortName: (row.ShortName ?? row.shortName ?? null) as string | null,
        Email: (row.Email ?? row.email ?? null) as string | null,
        Phone: (row.Phone ?? row.phone ?? null) as string | null,
        TaxId: (row.TaxId ?? row.taxId ?? row.TaxID ?? null) as string | null,
        CountryCode: (row.CountryCode ?? row.countryCode ?? null) as string | null,
        PostalCode: (row.PostalCode ?? row.postalCode ?? null) as string | null,
        City: (row.City ?? row.city ?? null) as string | null,
        AddressLine1: (row.AddressLine1 ?? row.addressLine1 ?? null) as string | null,
        AddressLine2: (row.AddressLine2 ?? row.addressLine2 ?? null) as string | null,
        OrganizationTypeID: typeNum !== null && Number.isFinite(typeNum) ? typeNum : null,
        ActiveFlg: row.ActiveFlg ?? row.activeFlg,
        LastUpdatedUserID: (row.LastUpdatedUserID ?? row.lastUpdatedUserID ?? null) as number | null,
        createdAt: row.createdAt as string | undefined,
        updatedAt: row.updatedAt as string | undefined,
      };
    })
    .filter((org) => org.id !== undefined && org.Name.length > 0);
}

function normalizeLookupTypes<T extends { id: number; Name: string }>(rows: unknown[]): T[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(isActiveRecord)
    .map((row) => ({
      id: rowId(row)!,
      Name: rowDisplayName(row),
      Code: (row.Code ?? row.code ?? null) as string | null,
      Description: (row.Description ?? row.description ?? null) as string | null,
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
    }))
    .filter((row) => row.id !== undefined && row.Name.length > 0) as T[];
}

function normalizeOrganizationUserTypes(rows: unknown[]): MasterOrganizationUserType[] {
  return (rows || [])
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .filter(isActiveRecord)
    .map((row) => ({
      id: rowId(row)!,
      Code: String(row.Code ?? row.code ?? ''),
      Name: rowDisplayName(row),
      OwnerFlg: isTruthyFlag(row.OwnerFlg ?? row.ownerFlg),
      ManagerFlg: isTruthyFlag(row.ManagerFlg ?? row.managerFlg),
      MemberFlg: isTruthyFlag(row.MemberFlg ?? row.memberFlg),
      NonMemberFlg: isTruthyFlag(row.NonMemberFlg ?? row.nonMemberFlg),
      ActiveFlg: row.ActiveFlg ?? row.activeFlg,
      LastUpdatedUserID: (row.LastUpdatedUserID ?? row.lastUpdatedUserID ?? null) as number | null,
      createdAt: row.createdAt as string | undefined,
      updatedAt: row.updatedAt as string | undefined,
    }))
    .filter((row) => row.id !== undefined && row.Name.length > 0);
}

function findMasterRole(roles: any[], id: number) {
  const numId = Number(id);
  return roles.find((r: any) =>
    Number(r.id) === numId ||
    Number(r.RoleID) === numId ||
    Number(r.ID) === numId ||
    Number(r.EventRoleID) === numId ||
    Number(r.EventRoleId) === numId ||
    Number(r.RoleId) === numId ||
    String(r.id) === String(id) ||
    String(r.RoleID) === String(id) ||
    String(r.ID) === String(id)
  );
}

/** tblRole.RoleTypeID = 1 → Szervező */
export const ORGANIZER_ROLE_TYPE_ID = 1;

export const useMasterDataStore = defineStore('masterData', {
  state: () => ({
    version: localStorage.getItem('masterDataVersion') ? parseInt(localStorage.getItem('masterDataVersion') as string, 10) : 0,
    eventTypes: normalizeEventTypes(JSON.parse(localStorage.getItem('md_eventTypes') || '[]')),
    eventTypeGroups: JSON.parse(localStorage.getItem('md_eventTypeGroups') || '[]'),
    notificationTypes: JSON.parse(localStorage.getItem('md_notificationTypes') || '[]'),
    roleTypes: JSON.parse(localStorage.getItem('md_roleTypes') || '[]'),
    roles: JSON.parse(localStorage.getItem('md_roles') || '[]'),
    loginIdentifierTypes: JSON.parse(localStorage.getItem('md_loginIdentifierTypes') || '[]'),
    userStatuses: JSON.parse(localStorage.getItem('md_userStatuses') || '[]'),
    chatThreadTypes: JSON.parse(localStorage.getItem('md_chatThreadTypes') || '[]'),
    eventStatuses: normalizeEventStatuses(JSON.parse(localStorage.getItem('md_eventStatuses') || '[]')),
    eventFlows: normalizeEventFlows(JSON.parse(localStorage.getItem('md_eventFlows') || '[]')) as EventFlow[],
    eventFlowStatuses: normalizeEventFlowStatuses(
      JSON.parse(localStorage.getItem('md_eventFlowStatuses') || '[]')
    ) as EventFlowStatus[],
    eventFlowStatusRoles: normalizeEventFlowStatusRoles(
      JSON.parse(localStorage.getItem('md_eventFlowStatusRoles') || '[]')
    ) as EventFlowStatusRole[],
    eventUserStatuses: JSON.parse(localStorage.getItem('md_eventUserStatuses') || '[]'),
    eventUserFlowTemplates: normalizeEventUserFlowTemplates(
      JSON.parse(localStorage.getItem('md_eventUserFlowTemplates') || '[]')
    ) as EventUserFlowTemplate[],
    eventUserFlowTemplateSteps: normalizeEventUserFlowTemplateSteps(
      JSON.parse(localStorage.getItem('md_eventUserFlowTemplateSteps') || '[]')
    ) as EventUserFlowTemplateStep[],
    organizations: JSON.parse(localStorage.getItem('md_organizations') || '[]') as MasterOrganization[],
    organizationTypes: JSON.parse(localStorage.getItem('md_organizationTypes') || '[]') as MasterOrganizationType[],
    organizationUserTypes: JSON.parse(
      localStorage.getItem('md_organizationUserTypes') || '[]'
    ) as MasterOrganizationUserType[],
    ptaGameTypes: normalizePtaGameTypes(JSON.parse(localStorage.getItem('md_ptaGameTypes') || '[]')),
    ptaGameTypeRounds: normalizePtaGameTypeRounds(
      JSON.parse(localStorage.getItem('md_ptaGameTypeRounds') || '[]')
    ),
    ptaPairModes: normalizePtaPairModes(JSON.parse(localStorage.getItem('md_ptaPairModes') || '[]')),
    ptaEventRoundStatuses: normalizePtaEventRoundStatuses(
      JSON.parse(localStorage.getItem('md_ptaEventRoundStatuses') || '[]')
    ),
    ptaExtraPrizes: normalizePtaExtraPrizes(JSON.parse(localStorage.getItem('md_ptaExtraPrizes') || '[]')),
    ptaChampionships: normalizePtaChampionships(
      JSON.parse(localStorage.getItem('md_ptaChampionships') || '[]')
    ),
    labels: JSON.parse(localStorage.getItem('md_labels') || '[]'), // TODO: backend integráció (címkék/tag-ek master adata)
  }),

  getters: {
    getRoleNameById: (state) => (id: number) => {
      const role = findMasterRole(state.roles, id);
      if (role) {
        const name = role.RoleName || role.Name || role.Title || role.name || role.roleName || role.EventRoleName;
        if (name) return name;
      }
      const fallbackRoles: Record<number, string> = {
        1: 'Szervező',
        2: 'Résztvevő',
        3: 'Játékos',
        4: 'Szponzor',
        5: 'Előadó',
        6: 'Szekcióvezető',
        7: 'Játékmester',
        8: 'Vendég',
        9: 'Munkatárs',
        10: 'Házigazda'
      };
      return fallbackRoles[Number(id)] || 'Résztvevő';
    },
    getRoleColorById: (state) => (id: number) => {
      const role = findMasterRole(state.roles, id);
      if (role && role.RoleTypeID) {
        const roleType = state.roleTypes.find((rt: any) => Number(rt.id) === Number(role.RoleTypeID));
        if (roleType && (roleType.ColorHex || roleType.ColorCode)) {
          return roleType.ColorHex || roleType.ColorCode;
        }
      }
      const fallbackColors: Record<number, string> = {
        1: '#a855f7', // Szervező - purple
        2: '#34d399', // Résztvevő - green
        3: '#34d399', // Játékos - green
        4: '#f68b29', // Szponzor - orange
        5: '#f68b29', // Előadó - orange
        6: '#60a5fa', // Szekcióvezető - blue
        7: '#38bdf8', // Játékmester - sky blue
        8: '#34d399', // Vendég - green
        9: '#38bdf8', // Munkatárs - sky blue
        10: '#a855f7' // Házigazda - purple
      };
      return fallbackColors[Number(id)] || '#34d399';
    },
    getRoleTypeNameById: (state) => (typeId: number | null | undefined): string => {
      if (typeId == null) return '';
      const rt = state.roleTypes.find(
        (t: any) => Number(t.id) === Number(typeId) || Number(t.ID) === Number(typeId)
      );
      return String(rt?.TypeName || rt?.Name || rt?.RoleTypeName || '').trim();
    },
    getRoleTypeNameByRoleId() {
      return (roleId: number | null | undefined): string => {
        const typeId = this.getRoleTypeIdByRoleId(roleId);
        return this.getRoleTypeNameById(typeId);
      };
    },
    getEventUserStatusName: (state) => (id: number) => {
      const status = state.eventUserStatuses.find(
        (s: any) => Number(s.id ?? s.ID ?? s.Id) === Number(id)
      );
      return status ? status.StatusName : 'Ismeretlen';
    },
    getEventUserFlowTemplateByCode: (state) => (code: string | null | undefined) =>
      findEventUserFlowTemplateByCode(state.eventUserFlowTemplates, code),
    getEventUserFlowTemplateIdByCode: (state) => (code: string | null | undefined): number | null =>
      findEventUserFlowTemplateIdByCode(state.eventUserFlowTemplates, code),
    getDefaultEventUserFlowTemplateId() {
      return (publicFlg: boolean, isFree: boolean): number | null =>
        this.getEventUserFlowTemplateIdByCode(defaultEventUserFlowTemplateCode(publicFlg, isFree));
    },
    getAllowedEventUserStatusTransitions() {
      return (
        templateId: number | null | undefined,
        currentStatusId: number | null | undefined
      ): EventUserStatusTransition[] =>
        listAllowedEventUserStatusTransitions({
          templateId,
          currentStatusId,
          steps: this.eventUserFlowTemplateSteps,
          eventUserStatuses: this.eventUserStatuses,
        });
    },
    getUndoEventUserStatusTransitions() {
      return (
        prevStatusId: number | null | undefined,
        currentStatusId: number | null | undefined
      ): EventUserStatusTransition[] =>
        listUndoEventUserStatusTransitions({
          prevStatusId,
          currentStatusId,
          eventUserStatuses: this.eventUserStatuses,
        });
    },
    getEventStatusNameById: (state) => (id: number | null | undefined, fallback = 'Státusz') =>
      getEventStatusNameById(state.eventStatuses, id, fallback),
    isEventStatusInProgress: (state) => (statusId: number | null | undefined) => {
      const row = findEventStatus(state.eventStatuses, statusId);
      return isTruthyFlag(row?.InProgressFlg);
    },
    isEventStatusClosed: (state) => (statusId: number | null | undefined) => {
      const row = findEventStatus(state.eventStatuses, statusId);
      return isTruthyFlag(row?.ClosedFlg);
    },
    /** Belépés gomb: EventStatus.InProgressFlg vagy ClosedFlg. */
    eventStatusAllowsEnter: (state) => (statusId: number | null | undefined) => {
      const row = findEventStatus(state.eventStatuses, statusId);
      return isTruthyFlag(row?.InProgressFlg) || isTruthyFlag(row?.ClosedFlg);
    },
    getEventFlowIdForType() {
      return (eventTypeId: number | null | undefined): number | null => {
        if (eventTypeId == null) return null;
        return getEventFlowIdForType(this.getEventTypeById(Number(eventTypeId)));
      };
    },
    /**
     * Szerepkörre szűrt, aktuális státuszból indítható átmenetek.
     * RoleID = master tblRole.id (az EventRole.RoleID).
     */
    getAllowedEventStatusTransitions() {
      return (
        eventTypeId: number | null | undefined,
        currentStatusId: number | null | undefined,
        masterRoleId: number | null | undefined
      ): EventStatusTransition[] => {
        return listAllowedEventStatusTransitions({
          eventFlowId: this.getEventFlowIdForType(eventTypeId),
          currentStatusId,
          masterRoleId,
          roleTypeId: this.getRoleTypeIdByRoleId(masterRoleId),
          flowStatuses: this.eventFlowStatuses,
          flowStatusRoles: this.eventFlowStatusRoles,
          eventStatuses: this.eventStatuses,
        });
      };
    },
    getUndoEventStatusTransitions() {
      return (
        prevStatusId: number | null | undefined,
        currentStatusId: number | null | undefined
      ): EventStatusTransition[] => {
        return listUndoEventStatusTransitions({
          prevStatusId,
          currentStatusId,
          eventStatuses: this.eventStatuses,
        });
      };
    },
    getOrganizationById: (state) => (id: number) => {
      const numId = Number(id);
      return state.organizations.find((org) => Number(org.id) === numId);
    },
    getOrganizationNameById: (state) => (id: number) => {
      const org = state.organizations.find((o) => Number(o.id) === Number(id));
      if (!org) return '';
      return org.ShortName?.trim() || org.Name;
    },
    activeOrganizations: (state) =>
      state.organizations.filter((org) => isActiveRecord(org as unknown as Record<string, unknown>)),
    getOrganizationTypeById: (state) => (id: number) => {
      const numId = Number(id);
      return state.organizationTypes.find((t) => Number(t.id) === numId);
    },
    getOrganizationTypeNameById: (state) => (id: number) => {
      return state.organizationTypes.find((t) => Number(t.id) === Number(id))?.Name || '';
    },
    getOrganizationUserTypeById: (state) => (id: number) => {
      const numId = Number(id);
      return state.organizationUserTypes.find((t) => Number(t.id) === numId);
    },
    getOrganizationUserTypeNameById: (state) => (id: number) => {
      return state.organizationUserTypes.find((t) => Number(t.id) === Number(id))?.Name || '';
    },
    getEventTypeById: (state) => (id: number) => {
      const numId = Number(id);
      return state.eventTypes.find(
        (t: any) => Number(t.id) === numId || Number(t.ID) === numId || Number(t.EventTypeID) === numId
      );
    },
    /** EventTypes.CanEnterFlg — van beléphető adatlapja az eseménytípusnak */
    eventTypeCanEnter() {
      return (typeId: number | null | undefined) => {
        if (typeId == null) return false;
        const t = this.getEventTypeById(Number(typeId));
        return isTruthyFlag(t?.CanEnterFlg ?? t?.canEnterFlg);
      };
    },
    /** EventTypes.PTAFlg — ProfitAbility / PTA modul */
    eventTypeIsPta() {
      return (typeId: number | null | undefined) => {
        if (typeId == null) return false;
        const t = this.getEventTypeById(Number(typeId));
        return eventTypeHasPtaFlag(t as Record<string, unknown> | undefined);
      };
    },
    getPtaGameTypeById: (state) => (id: number) =>
      state.ptaGameTypes.find((row: PtaGameType) => Number(row.id) === Number(id)),
    getPtaPairModeById: (state) => (id: number) =>
      state.ptaPairModes.find((row: PtaPairMode) => Number(row.id) === Number(id)),
    getPtaRoundsForGameType: (state) => (gameTypeId: number | null | undefined) => {
      if (gameTypeId == null) return [] as PtaGameTypeRound[];
      return state.ptaGameTypeRounds
        .filter((row: PtaGameTypeRound) => Number(row.GameTypeID) === Number(gameTypeId))
        .slice()
        .sort((a: PtaGameTypeRound, b: PtaGameTypeRound) => a.OrderIndex - b.OrderIndex);
    },
    getPtaEventRoundStatusById: (state) => (id: number) =>
      state.ptaEventRoundStatuses.find((row: PtaEventRoundStatus) => Number(row.id) === Number(id)),
    getPtaExtraPrizeById: (state) => (id: number) =>
      state.ptaExtraPrizes.find((row: PtaExtraPrize) => Number(row.id) === Number(id)),
    getPtaChampionshipById: (state) => (id: number) =>
      state.ptaChampionships.find((row: PtaChampionship) => Number(row.id) === Number(id)),
    getRoleTypeIdByRoleId: (state) => (roleId: number | null | undefined): number | null => {
      if (roleId == null) return null;
      const role = findMasterRole(state.roles, Number(roleId));
      const raw = role?.RoleTypeID ?? role?.roleTypeID ?? role?.RoleTypeId;
      const num = Number(raw);
      return Number.isFinite(num) && num !== 0 ? num : null;
    },
    isOrganizerRole() {
      return (roleId: number | null | undefined) =>
        this.getRoleTypeIdByRoleId(roleId) === ORGANIZER_ROLE_TYPE_ID;
    },
    /** tblRoleType.OwnerFlg — elszámolás csak tulajdonosi szerepkörnél */
    isOwnerRole() {
      return (roleId: number | null | undefined) => {
        const typeId = this.getRoleTypeIdByRoleId(roleId);
        if (typeId == null) return false;
        const rt = this.roleTypes.find(
          (t: any) => Number(t.id) === Number(typeId) || Number(t.ID) === Number(typeId)
        );
        return isTruthyFlag(rt?.OwnerFlg ?? rt?.ownerFlg);
      };
    },
  },
  actions: {
    async checkAndSync(serverVersion: number) {
      try {
        const response = await api.get('/api/master/data');
        const data = unwrapApiPayload(response.data);
        
        this.version = serverVersion;
        this.eventTypes = normalizeEventTypes(
          pickDataset(data, 'EventTypes', 'eventTypes', 'EventType')
        );
        this.eventTypeGroups = data.EventTypeGroups || [];
        this.notificationTypes = data.NotificationTypes || [];
        this.roleTypes = data.RoleTypes || [];
        this.roles = data.Roles || data.roles || data.EventRoles || data.eventRoles || [];
        this.loginIdentifierTypes = data.LoginIdentifierTypes || [];
        this.userStatuses = data.UserStatuses || [];
        this.chatThreadTypes = data.ChatThreadTypes || [];
        this.eventStatuses = normalizeEventStatuses(
          pickDataset(data, 'EventStatuses', 'eventStatuses', 'EventStatus')
        );
        this.eventUserStatuses = data.EventUserStatuses || [];
        // spGetMasterData: 20 EventUserFlowTemplates | 21 EventUserFlowTemplateSteps
        this.eventUserFlowTemplates = normalizeEventUserFlowTemplates(
          pickDataset(
            data,
            'EventUserFlowTemplates',
            'eventUserFlowTemplates',
            'EventUserFlowTemplate',
            'TblEventUserFlowTemplate',
            'tblEventUserFlowTemplate',
            'RS20',
            'Rs20',
            'ResultSet20',
            'Result20'
          )
        );
        this.eventUserFlowTemplateSteps = normalizeEventUserFlowTemplateSteps(
          pickDataset(
            data,
            'EventUserFlowTemplateSteps',
            'eventUserFlowTemplateSteps',
            'EventUserFlowTemplateStep',
            'TblEventUserFlowTemplateStep',
            'tblEventUserFlowTemplateStep',
            'RS21',
            'Rs21',
            'ResultSet21',
            'Result21'
          )
        );
        // spGetMasterData: 17 EventFlows | 18 EventFlowStatuses | 19 EventFlowStatusRoles
        this.eventFlows = normalizeEventFlows(
          pickDataset(
            data,
            'EventFlows',
            'eventFlows',
            'EventFlow',
            'TblEventFlow',
            'tblEventFlow',
            'RS17',
            'Rs17',
            'ResultSet17',
            'Result17'
          )
        );
        this.eventFlowStatuses = normalizeEventFlowStatuses(
          pickDataset(
            data,
            'EventFlowStatuses',
            'eventFlowStatuses',
            'EventFlowStatus',
            'TblEventFlowStatus',
            'tblEventFlowStatus',
            'RS18',
            'Rs18',
            'ResultSet18',
            'Result18'
          )
        );
        this.eventFlowStatusRoles = normalizeEventFlowStatusRoles(
          pickDataset(
            data,
            'EventFlowStatusRoles',
            'eventFlowStatusRoles',
            'EventFlowStatusRole',
            'TblEventFlowStatusRole',
            'tblEventFlowStatusRole',
            'RS19',
            'Rs19',
            'ResultSet19',
            'Result19'
          )
        );
        this.organizations = normalizeOrganizations(
          pickDataset(
            data,
            'Organizations',
            'organizations',
            'Organization',
            'TblOrganization',
            'tblOrganization'
          )
        );
        // spGetMasterData: 13 OrganizationTypes | 14 OrganizationUserTypes
        this.organizationTypes = normalizeLookupTypes<MasterOrganizationType>(
          pickDataset(
            data,
            'OrganizationTypes',
            'organizationTypes',
            'OrganizationType',
            'TblOrganizationType',
            'tblOrganizationType',
            'RS13',
            'Rs13',
            'ResultSet13',
            'Result13'
          )
        );
        this.organizationUserTypes = normalizeOrganizationUserTypes(
          pickDataset(
            data,
            'OrganizationUserTypes',
            'organizationUserTypes',
            'OrganizationUserType',
            'TblOrganizationUserType',
            'tblOrganizationUserType',
            'RS14',
            'Rs14',
            'ResultSet14',
            'Result14'
          )
        );
        this.ptaGameTypes = normalizePtaGameTypes(
          pickDataset(data, 'PtaGameTypes', 'ptaGameTypes', 'RS22', 'ResultSet22', 'Result22')
        );
        this.ptaGameTypeRounds = normalizePtaGameTypeRounds(
          pickDataset(data, 'PtaGameTypeRounds', 'ptaGameTypeRounds', 'RS23', 'ResultSet23', 'Result23')
        );
        this.ptaPairModes = normalizePtaPairModes(
          pickDataset(data, 'PtaPairModes', 'ptaPairModes', 'RS24', 'ResultSet24', 'Result24')
        );
        this.ptaEventRoundStatuses = normalizePtaEventRoundStatuses(
          pickDataset(
            data,
            'PtaEventRoundStatuses',
            'ptaEventRoundStatuses',
            'RS25',
            'ResultSet25',
            'Result25'
          )
        );
        this.ptaExtraPrizes = normalizePtaExtraPrizes(
          pickDataset(data, 'PtaExtraPrizes', 'ptaExtraPrizes', 'RS26', 'ResultSet26', 'Result26')
        );
        this.ptaChampionships = normalizePtaChampionships(
          pickDataset(data, 'PtaChampionships', 'ptaChampionships', 'RS27', 'ResultSet27', 'Result27')
        );
        warnIfDatasetMissing('masterData.organizations', this.organizations, data);
        warnIfDatasetMissing('masterData.organizationTypes', this.organizationTypes, data);
        warnIfDatasetMissing('masterData.organizationUserTypes', this.organizationUserTypes, data);
        warnIfDatasetMissing('masterData.eventFlows', this.eventFlows, data);
        warnIfDatasetMissing('masterData.eventFlowStatuses', this.eventFlowStatuses, data);
        warnIfDatasetMissing('masterData.eventFlowStatusRoles', this.eventFlowStatusRoles, data);
        warnIfDatasetMissing('masterData.eventUserFlowTemplates', this.eventUserFlowTemplates, data);
        warnIfDatasetMissing('masterData.eventUserFlowTemplateSteps', this.eventUserFlowTemplateSteps, data);
        warnIfDatasetMissing('masterData.ptaGameTypes', this.ptaGameTypes, data);
        warnIfDatasetMissing('masterData.ptaPairModes', this.ptaPairModes, data);

        localStorage.setItem('masterDataVersion', serverVersion.toString());
        localStorage.setItem('md_eventTypes', JSON.stringify(this.eventTypes));
        localStorage.setItem('md_eventTypeGroups', JSON.stringify(this.eventTypeGroups));
        localStorage.setItem('md_notificationTypes', JSON.stringify(this.notificationTypes));
        localStorage.setItem('md_roleTypes', JSON.stringify(this.roleTypes));
        localStorage.setItem('md_roles', JSON.stringify(this.roles));
        localStorage.setItem('md_loginIdentifierTypes', JSON.stringify(this.loginIdentifierTypes));
        localStorage.setItem('md_userStatuses', JSON.stringify(this.userStatuses));
        localStorage.setItem('md_chatThreadTypes', JSON.stringify(this.chatThreadTypes));
        localStorage.setItem('md_eventStatuses', JSON.stringify(this.eventStatuses));
        localStorage.setItem('md_eventFlows', JSON.stringify(this.eventFlows));
        localStorage.setItem('md_eventFlowStatuses', JSON.stringify(this.eventFlowStatuses));
        localStorage.setItem('md_eventFlowStatusRoles', JSON.stringify(this.eventFlowStatusRoles));
        localStorage.setItem('md_eventUserStatuses', JSON.stringify(this.eventUserStatuses));
        localStorage.setItem('md_eventUserFlowTemplates', JSON.stringify(this.eventUserFlowTemplates));
        localStorage.setItem(
          'md_eventUserFlowTemplateSteps',
          JSON.stringify(this.eventUserFlowTemplateSteps)
        );
        localStorage.setItem('md_organizations', JSON.stringify(this.organizations));
        localStorage.setItem('md_organizationTypes', JSON.stringify(this.organizationTypes));
        localStorage.setItem('md_organizationUserTypes', JSON.stringify(this.organizationUserTypes));
        localStorage.setItem('md_ptaGameTypes', JSON.stringify(this.ptaGameTypes));
        localStorage.setItem('md_ptaGameTypeRounds', JSON.stringify(this.ptaGameTypeRounds));
        localStorage.setItem('md_ptaPairModes', JSON.stringify(this.ptaPairModes));
        localStorage.setItem('md_ptaEventRoundStatuses', JSON.stringify(this.ptaEventRoundStatuses));
        localStorage.setItem('md_ptaExtraPrizes', JSON.stringify(this.ptaExtraPrizes));
        localStorage.setItem('md_ptaChampionships', JSON.stringify(this.ptaChampionships));

        console.log(
          'Master Data szinkronizálva! Verzió:',
          serverVersion,
          '| organizations:',
          this.organizations.length,
          '| organizationTypes:',
          this.organizationTypes.length,
          '| organizationUserTypes:',
          this.organizationUserTypes.length,
          '| eventFlows:',
          this.eventFlows.length,
          '| eventFlowStatuses:',
          this.eventFlowStatuses.length,
          '| eventFlowStatusRoles:',
          this.eventFlowStatusRoles.length,
          '| eventUserFlowTemplates:',
          this.eventUserFlowTemplates.length,
          '| eventUserFlowTemplateSteps:',
          this.eventUserFlowTemplateSteps.length
        );
      } catch (error) {
        console.error('Hiba a Master Data szinkronizálásakor', error);
        throw error;
      }
    }
  }
});
