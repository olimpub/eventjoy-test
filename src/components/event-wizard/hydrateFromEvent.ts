import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import {
  createEmptyBasics,
  entityId,
  generateTicketCode,
  isActiveFlag,
  type WizardBasics,
  type WizardEventRole,
  type WizardLabelItem,
  type WizardSelection,
  type WizardTicket,
} from './types';

function sameId(a: unknown, b: unknown): boolean {
  if (a == null || b == null || a === '' || b === '') return false;
  return String(a) === String(b);
}

function belongsToEvent(row: Record<string, unknown> | null | undefined, eventId: string | number): boolean {
  if (!row) return false;
  return sameId(row.EventID ?? row.eventID ?? row.EventId, eventId);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function splitDateTime(value: unknown): { date: string; time: string } {
  if (value == null || value === '') return { date: '', time: '' };
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { date: raw, time: '' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function firstString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val == null || val === '') continue;
    return String(val);
  }
  return '';
}

function firstNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = row[key];
    if (val == null || val === '') continue;
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isTruthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function findEvent(eventStore: ReturnType<typeof useEventStore>, eventId: string | number) {
  return (
    eventStore.events?.find((e: any) => sameId(e.id, eventId)) ||
    eventStore.myEvents?.find((e: any) => sameId(e.id, eventId)) ||
    null
  );
}

export function hydrateWizardFromEvent(
  eventId: string | number,
  eventStore: ReturnType<typeof useEventStore>,
  masterData: ReturnType<typeof useMasterDataStore>
): { selection: WizardSelection; basics: WizardBasics } | null {
  const event = findEvent(eventStore, eventId) as Record<string, unknown> | null;
  if (!event) return null;

  const typeId = firstNumber(event, 'EventTypeID', 'eventTypeID', 'EventTypeId', 'eventTypeId');
  const eventType = typeId != null ? masterData.getEventTypeById(typeId) : null;
  const groupId = eventType
    ? Number(eventType.EventTypeGroupID ?? eventType.eventTypeGroupId ?? eventType.GroupID ?? 0) || null
    : null;
  const group = groupId != null
    ? (masterData.eventTypeGroups || []).find((g: any) => entityId(g) === groupId)
    : null;

  const start = splitDateTime(event.StartAtUtc ?? event.startAtUtc ?? event.StartAt ?? event.StartDate);
  const end = splitDateTime(event.EndAtUtc ?? event.endAtUtc ?? event.EndAt ?? event.EndDate);
  const endDate = end.date || start.date;
  const isMultiDay = !!(start.date && endDate && start.date !== endDate);

  const basics = createEmptyBasics();
  basics.title = firstString(event, 'Title', 'EventName', 'Name');
  basics.description = firstString(event, 'Description', 'DescriptionText', 'description');
  basics.isMultiDay = isMultiDay;
  basics.startDate = start.date;
  basics.endDate = endDate;
  basics.startTime = start.time || '10:00';
  basics.endTime = end.time || '18:00';
  basics.onlineFlg = isTruthy(event.OnlineFlg ?? event.onlineFlg);
  basics.onlineUrl = firstString(event, 'OnlineURL', 'OnlineUrl', 'onlineUrl', 'OnlineLink');
  basics.eventLocationId = firstNumber(event, 'EventLocationID', 'eventLocationID', 'EventLocationId');
  basics.capacity = firstNumber(event, 'Capacity', 'capacity');
  basics.publicFlg = event.PublicFlg == null && event.publicFlg == null
    ? true
    : isTruthy(event.PublicFlg ?? event.publicFlg);
  basics.activeFlg = event.ActiveFlg == null && event.activeFlg == null
    ? true
    : isActiveFlag(event.ActiveFlg ?? event.activeFlg);
  basics.eventUid = firstString(event, 'EventUID', 'EventUid', 'eventUid') || basics.eventUid;

  const orgId = firstNumber(event, 'OrganizationID', 'organizationID', 'OrganizationId');
  if (orgId != null) {
    basics.contactKind = 'organization';
    basics.organizationId = orgId;
  }
  basics.contactName = firstString(event, 'ContactName', 'OrganizerName', 'contactName');
  basics.contactEmail = firstString(event, 'ContactEmail', 'OrganizerEmail', 'contactEmail');
  basics.contactPhone = firstString(event, 'ContactPhone', 'OrganizerPhone', 'contactPhone');

  basics.labels = collectLabels(eventStore, masterData, eventId);
  const roles = collectRoles(eventStore, masterData, eventId);
  basics.roles = roles;
  basics.tickets = collectTickets(eventStore, eventId, roles, basics);

  const pta = eventStore.getPtaSettingsForEvent(eventId);
  if (pta) {
    basics.ptaGameTypeId = pta.GameTypeID;
    basics.ptaPairModeId = pta.PairModeID;
    basics.ptaChampionshipId = pta.ChampinshipID;
    basics.ptaChampionshipFlg = pta.ChampinshipID != null;
    basics.ptaCategory = [1, 2, 3, 4].includes(pta.Category) ? pta.Category : 1;
    basics.ptaPoint1 = pta.Point1;
    basics.ptaPoint2 = pta.Point2;
    basics.ptaPoint3 = pta.Point3;
    basics.ptaPoint4 = pta.Point4;
    basics.ptaMaxParticipants = pta.MaxParticipants;
    basics.ptaOrganizationGrpFlg = pta.OrganizationGrpFlg;
    basics.ptaTeamGrpFlg = pta.TeamGrpFlg;
    basics.ptaRegionGrpFlg = pta.RegionGrpFlg;
    basics.ptaCompanyGrpFlg = pta.CompanyGrpFlg;
    basics.ptaPhotoUploadMandatoryFlg = pta.PhotoUploadMadatoryFlg;
    basics.ptaExtraPrizeIds = collectEventPrizeIds(eventStore, eventId);
    basics.ptaExtraPrizeFlg = pta.ExtraPrizeFlg || basics.ptaExtraPrizeIds.length > 0;
    basics.ptaShowUserPositionFlg = pta.ShowUserPositionFlg !== false;
  }

  const selection: WizardSelection = {
    groupId,
    groupName: group ? String(group.GroupName || group.groupName || group.Name || '') : '',
    typeId,
    typeCode: eventType ? String(eventType.Code || eventType.code || '') : '',
    typeName: eventType
      ? String(eventType.TypeName || eventType.typeName || eventType.Name || '')
      : '',
    typeIcon: eventType ? String(eventType.IconName || eventType.iconName || '') : '',
  };

  return { selection, basics };
}

function collectEventPrizeIds(
  eventStore: ReturnType<typeof useEventStore>,
  eventId: string | number
): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const row of eventStore.ptaEventPrizes || []) {
    if (!belongsToEvent(row, eventId)) continue;
    const prizeId = Number(row.PrizeID ?? row.prizeID ?? row.PrizeId ?? row.id);
    if (!Number.isFinite(prizeId) || prizeId <= 0 || seen.has(prizeId)) continue;
    seen.add(prizeId);
    ids.push(prizeId);
  }
  return ids;
}

function collectLabels(
  eventStore: ReturnType<typeof useEventStore>,
  masterData: ReturnType<typeof useMasterDataStore>,
  eventId: string | number
): WizardLabelItem[] {
  const links = (eventStore.eventLabels || []).filter((row: any) => belongsToEvent(row, eventId));
  const catalog = [...(eventStore.labels || []), ...(masterData.labels || [])];
  const seen = new Set<number>();
  const list: WizardLabelItem[] = [];
  for (const link of links) {
    const labelId = Number(link.LabelID ?? link.labelID ?? link.LabelId);
    if (!Number.isFinite(labelId) || seen.has(labelId)) continue;
    seen.add(labelId);
    const row = catalog.find((l: any) => entityId(l) === labelId);
    const name = row
      ? String(row.LabelName || row.Name || row.labelName || '').trim()
      : '';
    list.push({ id: labelId, name: name || `Címke ${labelId}`, isNew: false });
  }
  return list;
}

function collectRoles(
  eventStore: ReturnType<typeof useEventStore>,
  masterData: ReturnType<typeof useMasterDataStore>,
  eventId: string | number
): WizardEventRole[] {
  return (eventStore.roles || [])
    .filter((row: any) => belongsToEvent(row, eventId))
    .map((row: any) => {
      const roleId = Number(row.RoleID ?? row.roleID ?? row.RoleId);
      return {
        tempId: String(row.id ?? row.ID ?? crypto.randomUUID()),
        RoleID: Number.isFinite(roleId) ? roleId : 0,
        ActiveFlg: isActiveFlag(row.ActiveFlg ?? row.activeFlg),
        roleName: Number.isFinite(roleId) ? masterData.getRoleNameById(roleId) : String(row.RoleName || ''),
      } as WizardEventRole;
    })
    .filter((row) => row.RoleID > 0);
}

function collectTickets(
  eventStore: ReturnType<typeof useEventStore>,
  eventId: string | number,
  roles: WizardEventRole[],
  basics: WizardBasics
): WizardTicket[] {
  const roleByEventRoleId = new Map(roles.map((r) => [r.tempId, r]));
  const tickets = (eventStore.tickets || []).filter((row: any) => belongsToEvent(row, eventId));

  return tickets.map((row: any, index: number) => {
    const ticketId = String(row.id ?? row.ID ?? '');
    const price = firstNumber(row, 'Price', 'TicketPrice', 'Amount');
    const start = splitDateTime(
      row.RegistrationStartAtUtc ??
        row.RegistrationStartUtc ??
        row.RegistrationStartDate ??
        row.SaleStartAtUtc
    );
    const end = splitDateTime(
      row.RegistrationEndAtUtc ??
        row.RegistrationEndUtc ??
        row.RegistrationEndDate ??
        row.SaleEndAtUtc
    );
    const roleTempIds = (eventStore.roleTickets || [])
      .filter((link: any) => sameId(link.EventTicketID ?? link.eventTicketID ?? link.EventTicketId, ticketId))
      .map((link: any) => String(link.EventRoleID ?? link.eventRoleID ?? link.EventRoleId ?? ''))
      .filter((id) => id && roleByEventRoleId.has(id));

    const isFree = isTruthy(row.FreeFlg ?? row.freeFlg) || price === 0;

    return {
      tempId: ticketId || crypto.randomUUID(),
      Code: firstString(row, 'Code', 'TicketCode', 'code') || generateTicketCode(basics.eventUid, index + 1),
      TicketName: firstString(row, 'TicketName', 'Name', 'name'),
      Description: firstString(row, 'Description', 'description'),
      isFree,
      Price: isFree ? 0 : price,
      CurrencyCode: 'HUF',
      Capacity: firstNumber(row, 'Capacity', 'capacity'),
      RegistrationStartDate: start.date || basics.startDate,
      RegistrationStartTime: start.time || '00:00',
      RegistrationEndDate: end.date || basics.endDate || basics.startDate,
      RegistrationEndTime: end.time || basics.startTime || '23:59',
      ActiveFlg: isActiveFlag(row.ActiveFlg ?? row.activeFlg),
      TemplateID: firstNumber(row, 'TemplateID', 'templateID', 'TemplateId'),
      roleTempIds,
    } as WizardTicket;
  });
}
