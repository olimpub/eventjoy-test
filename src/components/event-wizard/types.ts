export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const WIZARD_STEP: Record<string, WizardStep> = {
  type: 1,
  basics: 2,
  restrictions: 3,
  ptaSettings: 4,
  tickets: 5,
  extraSheet: 6,
};

export interface WizardSelection {
  groupId: number | null;
  groupName: string;
  typeId: number | null;
  typeCode: string;
  typeName: string;
  typeIcon: string;
}

/** Új helyszín — API POST később; create flow-ban együtt mehet az eseménnyel */
export interface WizardNewLocation {
  LocationName: string;
  PostalCode: string;
  City: string;
  AddressLine1: string;
  CountryCode: string;
}

/** Kiválasztott / új címke a wizardban */
export interface WizardLabelItem {
  /** Meglévő label id; új címkénél null */
  id: number | null;
  name: string;
  isNew: boolean;
}

/**
 * event.roles előkészítés
 * Commit után: { id, EventID, RoleID, ActiveFlg, ... }
 */
export interface WizardEventRole {
  /** Kliens oldali kulcs → EventRoleID a roleTickets-ben commit előtt */
  tempId: string;
  RoleID: number;
  ActiveFlg: boolean;
  roleName: string;
}

/**
 * event.tickets előkészítés
 * Code konvenció: EV-{EventUID8}-T{n}-{RAND4}  pl. EV-A1B2C3D4-T1-F9E2
 */
export interface WizardTicket {
  tempId: string;
  Code: string;
  TicketName: string;
  Description: string;
  isFree: boolean;
  Price: number | null;
  CurrencyCode: 'HUF';
  Capacity: number | null;
  RegistrationStartDate: string;
  RegistrationStartTime: string;
  RegistrationEndDate: string;
  RegistrationEndTime: string;
  ActiveFlg: boolean;
  /** tblEventTicket.TemplateID — EventUserFlowTemplates; kötelező */
  TemplateID: number | null;
  /** WizardEventRole.tempId lista → event.roleTickets */
  roleTempIds: string[];
}

export interface WizardBasics {
  title: string;
  description: string;
  isMultiDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  onlineFlg: boolean;
  eventLocationId: number | null;
  useNewLocation: boolean;
  newLocation: WizardNewLocation;
  onlineUrl: string;
  capacity: number | null;
  publicFlg: boolean;
  /** Default true — nincs a képernyőn */
  activeFlg: boolean;
  eventUid: string;
  labels: WizardLabelItem[];
  roles: WizardEventRole[];
  tickets: WizardTicket[];
  /** tblEvent.EventImageUrl — a Szerkesztés alapadatai mutatják; feltöltés később */
  eventImageUrl: string | null;
  /** Kapcsolattartó — 3. lépés */
  contactKind: 'person' | 'organization';
  organizationId: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** PTA Beállítások — PTA.tblEventSettings */
  ptaGameTypeId: number | null;
  ptaPairModeId: number | null;
  ptaChampionshipId: number | null;
  ptaChampionshipFlg: boolean;
  ptaCategory: number;
  ptaPoint1: number;
  ptaPoint2: number;
  ptaPoint3: number;
  ptaPoint4: number;
  ptaMaxParticipants: number | null;
  ptaOrganizationGrpFlg: boolean;
  ptaTeamGrpFlg: boolean;
  ptaRegionGrpFlg: boolean;
  ptaCompanyGrpFlg: boolean;
  ptaPhotoUploadMandatoryFlg: boolean;
  ptaExtraPrizeFlg: boolean;
  ptaExtraPrizeIds: number[];
  ptaShowUserPositionFlg: boolean;
}

export const EVENT_STATUS_PLANNING = 1;

export function createEmptyBasics(): WizardBasics {
  return {
    title: '',
    description: '',
    isMultiDay: false,
    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '18:00',
    onlineFlg: false,
    onlineUrl: '',
    eventLocationId: null,
    useNewLocation: false,
    newLocation: {
      LocationName: '',
      PostalCode: '',
      City: '',
      AddressLine1: '',
      CountryCode: 'HU',
    },
    capacity: null,
    publicFlg: true,
    activeFlg: true,
    eventUid: crypto.randomUUID(),
    labels: [],
    roles: [],
    tickets: [],
    eventImageUrl: null,
    contactKind: 'person',
    organizationId: null,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    ptaGameTypeId: null,
    ptaPairModeId: null,
    ptaChampionshipId: null,
    ptaChampionshipFlg: false,
    ptaCategory: 1,
    ptaPoint1: 8,
    ptaPoint2: 4,
    ptaPoint3: 2,
    ptaPoint4: 0,
    ptaMaxParticipants: null,
    ptaOrganizationGrpFlg: false,
    ptaTeamGrpFlg: false,
    ptaRegionGrpFlg: false,
    ptaCompanyGrpFlg: false,
    ptaPhotoUploadMandatoryFlg: false,
    ptaExtraPrizeFlg: false,
    ptaExtraPrizeIds: [],
    ptaShowUserPositionFlg: true,
  };
}

export function eventEndDate(basics: Pick<WizardBasics, 'startDate' | 'endDate' | 'isMultiDay'>): string {
  return basics.isMultiDay ? basics.endDate || basics.startDate : basics.startDate;
}

export function localDateTimeParts(date = new Date()): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** Új jegy: kezdet = most, vége = esemény záró időpontja. */
export function ticketRegistrationWindow(
  basics: Pick<WizardBasics, 'startDate' | 'endDate' | 'isMultiDay' | 'endTime'>
): Pick<WizardTicket, 'RegistrationStartDate' | 'RegistrationEndDate' | 'RegistrationStartTime' | 'RegistrationEndTime'> {
  const start = localDateTimeParts();
  return {
    RegistrationStartDate: start.date,
    RegistrationStartTime: start.time,
    RegistrationEndDate: eventEndDate(basics) || '',
    RegistrationEndTime: basics.endTime || '18:00',
  };
}

export function fillEmptyTicketRegistrationWindows(tickets: WizardTicket[], basics: WizardBasics): boolean {
  const window = ticketRegistrationWindow(basics);
  let changed = false;
  for (const ticket of tickets || []) {
    if (!ticket.RegistrationStartDate && window.RegistrationStartDate) {
      ticket.RegistrationStartDate = window.RegistrationStartDate;
      ticket.RegistrationStartTime = window.RegistrationStartTime;
      changed = true;
    }
    if (!ticket.RegistrationEndDate && window.RegistrationEndDate) {
      ticket.RegistrationEndDate = window.RegistrationEndDate;
      ticket.RegistrationEndTime = window.RegistrationEndTime;
      changed = true;
    }
  }
  return changed;
}

export function createEmptyTicket(
  eventUid: string,
  ticketIndex: number,
  defaults?: Partial<Pick<WizardTicket, 'RegistrationStartDate' | 'RegistrationEndDate' | 'RegistrationStartTime' | 'RegistrationEndTime'>>
): WizardTicket {
  const now = localDateTimeParts();
  return {
    tempId: crypto.randomUUID(),
    Code: generateTicketCode(eventUid, ticketIndex),
    TicketName: '',
    Description: '',
    isFree: false,
    Price: null,
    CurrencyCode: 'HUF',
    Capacity: null,
    RegistrationStartDate: defaults?.RegistrationStartDate || now.date,
    RegistrationStartTime: defaults?.RegistrationStartTime || now.time,
    RegistrationEndDate: defaults?.RegistrationEndDate || '',
    RegistrationEndTime: defaults?.RegistrationEndTime || '18:00',
    ActiveFlg: true,
    TemplateID: null,
    roleTempIds: [],
  };
}

export const PTA_STARTER_ROLE_NAMES = ['Játékos', 'Játékmester', 'Szervező'] as const;

const PTA_ROLE_FALLBACK_IDS: Record<string, number> = {
  Játékos: 3,
  Játékmester: 7,
  Szervező: 1,
};

export function resolveMasterRoleByName(
  catalog: unknown[],
  name: string
): { RoleID: number; roleName: string } {
  const folded = name.trim().toLowerCase();
  const hit = ((catalog || []) as Record<string, unknown>[]).find(
    (row) => roleDisplayName(row).toLowerCase() === folded
  );
  if (hit) {
    const id = entityId(hit);
    return { RoleID: id, roleName: roleDisplayName(hit) || name };
  }
  return { RoleID: PTA_ROLE_FALLBACK_IDS[name] || 0, roleName: name };
}

function findStarterRole(roles: WizardEventRole[], name: string): WizardEventRole | undefined {
  const folded = name.toLowerCase();
  const fallbackId = PTA_ROLE_FALLBACK_IDS[name];
  return roles.find(
    (role) =>
      role.roleName.trim().toLowerCase() === folded ||
      (fallbackId != null && role.RoleID === fallbackId)
  );
}

/** PTA create: Játékos / Játékmester / Szervező + 2 díjmentes jegy. */
export function ensurePtaStarterRolesAndTickets(
  basics: WizardBasics,
  catalogRoles: unknown[],
  defaultTemplateId: number | null
) {
  for (const name of PTA_STARTER_ROLE_NAMES) {
    const resolved = resolveMasterRoleByName(catalogRoles, name);
    if (!resolved.RoleID) continue;
    const existing = findStarterRole(basics.roles, name);
    if (existing) {
      existing.RoleID = resolved.RoleID;
      existing.roleName = resolved.roleName;
      continue;
    }
    basics.roles.push({
      tempId: crypto.randomUUID(),
      RoleID: resolved.RoleID,
      ActiveFlg: true,
      roleName: resolved.roleName,
    });
  }

  const window = ticketRegistrationWindow(basics);
  const specs = [
    { ticketName: 'Játékos', roleName: 'Játékos' },
    { ticketName: 'Játékmester', roleName: 'Játékmester' },
  ];
  specs.forEach((spec) => {
    const role = findStarterRole(basics.roles, spec.roleName);
    let ticket = (basics.tickets || []).find(
      (row) => row.TicketName.trim().toLowerCase() === spec.ticketName.toLowerCase()
    );
    if (!ticket) {
      ticket = createEmptyTicket(basics.eventUid, basics.tickets.length + 1, window);
      ticket.TicketName = spec.ticketName;
      ticket.isFree = true;
      ticket.Price = 0;
      ticket.TemplateID = defaultTemplateId;
      basics.tickets.push(ticket);
    }
    if (role && !ticket.roleTempIds.includes(role.tempId)) {
      ticket.roleTempIds = [
        ...ticket.roleTempIds.filter((id) => basics.roles.some((row) => row.tempId === id)),
        role.tempId,
      ];
    }
    if (!ticket.TemplateID && defaultTemplateId) ticket.TemplateID = defaultTemplateId;
  });

  fillEmptyTicketRegistrationWindows(basics.tickets, basics);
}

/** EV-{UID8}-T{n}-{RAND4} */
export function generateTicketCode(eventUid: string, ticketIndex: number): string {
  const uid = (eventUid || crypto.randomUUID()).replace(/-/g, '').slice(0, 8).toUpperCase();
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `EV-${uid}-T${ticketIndex}-${rand}`;
}

/** ISO UTC string for API (datetimeoffset) */
export function combineDateTimeToUtcIso(date: string, time: string): string {
  if (!date || !time) return '';
  const [h, m] = time.split(':').map(Number);
  const local = new Date(`${date}T00:00:00`);
  local.setHours(h || 0, m || 0, 0, 0);
  return local.toISOString();
}

export const WIZARD_STEP_LABELS: Record<number, string> = {
  1: 'Típus',
  2: 'Alapadatok',
  3: 'Korlátozások',
  4: 'Beállítások',
  5: 'Jegyek',
  6: 'Adatlap',
};

export function wizardTypeHasExtraSheet(eventType: Record<string, unknown> | null | undefined): boolean {
  if (!eventType) return false;
  const raw =
    eventType.HasEventSheetFlg ??
    eventType.hasEventSheetFlg ??
    eventType.EventSheetFlg ??
    eventType.eventSheetFlg;
  return raw === true || raw === 1 || raw === '1';
}

export function visibleWizardSteps(hasExtraSheet: boolean, isPta = false): WizardStep[] {
  const steps: WizardStep[] = [1, 2, 3];
  if (isPta) steps.push(4);
  steps.push(5);
  if (hasExtraSheet) steps.push(6);
  return steps;
}

export function isActiveFlag(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return value === true || value === 1 || value === '1';
}

export function entityId(row: any): number {
  return Number(row?.id ?? row?.ID ?? row?.Id ?? 0);
}

export function labelName(row: any): string {
  return String(row?.LabelName || row?.Name || row?.labelName || '').trim();
}

export function roleDisplayName(row: any): string {
  return String(
    row?.RoleName || row?.Name || row?.Title || row?.roleName || row?.EventRoleName || ''
  ).trim();
}

export type WizardMode = 'create' | 'edit';

export function isTicketComplete(t: WizardTicket): boolean {
  if (!t.TicketName.trim()) return false;
  if (!t.roleTempIds.length) return false;
  if (t.TemplateID == null) return false;
  if (!t.isFree && (t.Price == null || t.Price < 0)) return false;
  if (!t.RegistrationStartDate || !t.RegistrationEndDate) return false;
  const startIso = combineDateTimeToUtcIso(t.RegistrationStartDate, t.RegistrationStartTime);
  const endIso = combineDateTimeToUtcIso(t.RegistrationEndDate, t.RegistrationEndTime);
  if (startIso && endIso && endIso < startIso) return false;
  return true;
}

export function isBasicsStepComplete(basics: WizardBasics): boolean {
  if (!basics.title.trim()) return false;
  if (!basics.startDate) return false;
  if (basics.isMultiDay && basics.endDate && basics.endDate < basics.startDate) return false;
  if (!basics.isMultiDay && basics.startDate === basics.endDate && basics.endTime <= basics.startTime) {
    return false;
  }
  if (basics.onlineFlg) return true;
  if (basics.useNewLocation) {
    return !!(basics.newLocation.LocationName.trim() && basics.newLocation.City.trim());
  }
  return basics.eventLocationId != null;
}

export function isPtaSettingsComplete(basics: WizardBasics): boolean {
  if (basics.ptaGameTypeId == null || basics.ptaPairModeId == null) return false;
  if (![1, 2, 3, 4].includes(basics.ptaCategory)) return false;
  if (basics.ptaChampionshipFlg && basics.ptaChampionshipId == null) return false;
  if (basics.ptaExtraPrizeFlg && !(basics.ptaExtraPrizeIds || []).length) return false;
  const points = [basics.ptaPoint1, basics.ptaPoint2, basics.ptaPoint3, basics.ptaPoint4];
  return points.every((n) => Number.isFinite(n));
}

/** Adott lépés kitöltött-e (navigáció / progress) */
export function isWizardStepComplete(
  step: WizardStep,
  selection: WizardSelection,
  basics: WizardBasics
): boolean {
  switch (step) {
    case 1:
      return selection.groupId != null && selection.typeId != null;
    case 2:
      return isBasicsStepComplete(basics);
    case 3:
      return (basics.roles || []).length > 0;
    case 4:
      return isPtaSettingsComplete(basics);
    case 5:
      return (basics.tickets || []).length > 0 && basics.tickets.every(isTicketComplete);
    case 6:
      return true;
    default:
      return false;
  }
}

/**
 * Lépésre ugrás engedélyezett?
 * - edit: mindig
 * - create: a cél lépésig minden megelőző lépés kész (vagy az összes lépés kész → szabad ugrás)
 */
export function canNavigateToWizardStep(
  target: WizardStep,
  mode: WizardMode,
  selection: WizardSelection,
  basics: WizardBasics,
  hasExtraSheet = false,
  isPta = false
): boolean {
  const steps = visibleWizardSteps(hasExtraSheet, isPta);
  if (!steps.includes(target)) return false;
  if (mode === 'edit') return true;
  const allDone = steps.every((s) => isWizardStepComplete(s, selection, basics));
  if (allDone) return true;
  for (const s of steps) {
    if (s >= target) break;
    if (!isWizardStepComplete(s, selection, basics)) return false;
  }
  return true;
}
