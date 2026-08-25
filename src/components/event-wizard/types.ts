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
    ptaPoint1: 10,
    ptaPoint2: 7,
    ptaPoint3: 5,
    ptaPoint4: 3,
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

export function createEmptyTicket(
  eventUid: string,
  ticketIndex: number,
  defaults?: Partial<Pick<WizardTicket, 'RegistrationStartDate' | 'RegistrationEndDate' | 'RegistrationStartTime' | 'RegistrationEndTime'>>
): WizardTicket {
  return {
    tempId: crypto.randomUUID(),
    Code: generateTicketCode(eventUid, ticketIndex),
    TicketName: '',
    Description: '',
    isFree: false,
    Price: null,
    CurrencyCode: 'HUF',
    Capacity: null,
    RegistrationStartDate: defaults?.RegistrationStartDate || '',
    RegistrationStartTime: defaults?.RegistrationStartTime || '00:00',
    RegistrationEndDate: defaults?.RegistrationEndDate || '',
    RegistrationEndTime: defaults?.RegistrationEndTime || '23:59',
    ActiveFlg: true,
    TemplateID: null,
    roleTempIds: [],
  };
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
