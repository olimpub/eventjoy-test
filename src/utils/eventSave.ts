import { api } from 'src/boot/axios';
import {
  combineDateTimeToUtcIso,
  EVENT_STATUS_PLANNING,
  type WizardBasics,
  type WizardMode,
  type WizardSelection,
} from 'src/components/event-wizard/types';
import { nullableNumericId, readCreatedEntityId, throwIfApiFailed } from 'src/utils/apiPayload';

/**
 * POST /event/save → spSaveEvent(@Json)
 * Egy JSON, nested datasetek. SQL OPENJSON-nal dolgozza fel.
 */
export interface EventSavePayload {
  EventID: number | null;
  Event: {
    Title: string;
    Description: string;
    EventTypeID: number | null;
    EventStatusID: number;
    EventUID: string;
    StartAtUtc: string;
    EndAtUtc: string;
    OnlineFlg: boolean;
    OnlineURL: string | null;
    EventLocationID: number | null;
    Capacity: number | null;
    PublicFlg: boolean;
    ActiveFlg: boolean;
    EventImageUrl: string | null;
    ContactOrganizerID: number | null;
    ContactName: string;
    ContactEmail: string;
    ContactPhone: string;
  };
  Location: Record<string, unknown> | null;
  Labels: Array<{ id: number | null; Name: string }>;
  Roles: Array<{ TempId: string; RoleID: number; ActiveFlg: boolean }>;
  Tickets: Array<{
    TempId: string;
    Code: string;
    TicketName: string;
    Description: string;
    Price: number | null;
    CurrencyCode: string;
    Capacity: number | null;
    RegistrationStartAtUtc: string;
    RegistrationEndAtUtc: string;
    TemplateID: number | null;
    ActiveFlg: boolean;
  }>;
  RoleTickets: Array<{ RoleTempId: string; TicketTempId: string }>;
  PtaSettings: Record<string, unknown> | null;
  PtaPrizes: Array<{ PrizeID: number }>;
}

export function buildEventSavePayload(args: {
  mode: WizardMode;
  eventId: string | number | null | undefined;
  selection: WizardSelection;
  basics: WizardBasics;
  includePta?: boolean;
  eventStatusId?: number | null;
}): EventSavePayload {
  const { mode, eventId, selection, basics, includePta, eventStatusId } = args;
  const startAt = combineDateTimeToUtcIso(basics.startDate, basics.startTime);
  const endAt = combineDateTimeToUtcIso(
    basics.isMultiDay ? basics.endDate || basics.startDate : basics.startDate,
    basics.endTime
  );

  const location =
    basics.onlineFlg
      ? null
      : basics.useNewLocation
        ? {
            LocationName: basics.newLocation.LocationName,
            PostalCode: basics.newLocation.PostalCode.trim() || null,
            City: basics.newLocation.City,
            AddressLine1: basics.newLocation.AddressLine1,
            CountryCode: basics.newLocation.CountryCode || 'HU',
          }
        : basics.eventLocationId != null
          ? { id: basics.eventLocationId }
          : null;

  const tickets = (basics.tickets || []).map((t) => ({
    TempId: t.tempId,
    Code: t.Code,
    TicketName: t.TicketName,
    Description: t.Description,
    Price: t.isFree ? 0 : t.Price,
    CurrencyCode: t.CurrencyCode || 'HUF',
    Capacity: t.Capacity,
    RegistrationStartAtUtc: combineDateTimeToUtcIso(t.RegistrationStartDate, t.RegistrationStartTime),
    RegistrationEndAtUtc: combineDateTimeToUtcIso(t.RegistrationEndDate, t.RegistrationEndTime),
    TemplateID: t.TemplateID,
    ActiveFlg: t.ActiveFlg !== false,
  }));

  const roleTickets: Array<{ RoleTempId: string; TicketTempId: string }> = [];
  for (const t of basics.tickets || []) {
    for (const roleTempId of t.roleTempIds || []) {
      roleTickets.push({ RoleTempId: roleTempId, TicketTempId: t.tempId });
    }
  }

  const ptaSettings =
    includePta
      ? {
          GameTypeID: basics.ptaGameTypeId,
          PairModeID: basics.ptaPairModeId,
          ChampionshipID: basics.ptaChampionshipFlg ? basics.ptaChampionshipId : null,
          ChampionshipFlg: basics.ptaChampionshipFlg,
          Category: basics.ptaCategory,
          Point1: basics.ptaPoint1,
          Point2: basics.ptaPoint2,
          Point3: basics.ptaPoint3,
          Point4: basics.ptaPoint4,
          MaxParticipants: basics.ptaMaxParticipants,
          OrganizationGrpFlg: basics.ptaOrganizationGrpFlg,
          TeamGrpFlg: basics.ptaTeamGrpFlg,
          RegionGrpFlg: basics.ptaRegionGrpFlg,
          CompanyGrpFlg: basics.ptaCompanyGrpFlg,
          PhotoUploadMandatoryFlg: basics.ptaPhotoUploadMandatoryFlg,
          ExtraPrizeFlg: basics.ptaExtraPrizeFlg,
          ShowUserPositionFlg: basics.ptaShowUserPositionFlg,
        }
      : null;

  return {
    EventID: mode === 'edit' ? nullableNumericId(eventId) : null,
    Event: {
      Title: basics.title.trim(),
      Description: (basics.description || '').trim(),
      EventTypeID: selection.typeId,
      EventStatusID: eventStatusId ?? EVENT_STATUS_PLANNING,
      EventUID: basics.eventUid,
      StartAtUtc: startAt,
      EndAtUtc: endAt,
      OnlineFlg: !!basics.onlineFlg,
      OnlineURL: basics.onlineFlg ? basics.onlineUrl || null : null,
      EventLocationID: basics.onlineFlg || basics.useNewLocation ? null : basics.eventLocationId,
      Capacity: basics.capacity,
      PublicFlg: !!basics.publicFlg,
      ActiveFlg: basics.activeFlg !== false,
      EventImageUrl: basics.eventImageUrl || null,
      ContactOrganizerID: basics.contactKind === 'organization' ? basics.organizationId : null,
      ContactName: basics.contactName.trim(),
      ContactEmail: basics.contactEmail.trim(),
      ContactPhone: basics.contactPhone.trim(),
    },
    Location: location,
    Labels: (basics.labels || []).map((l) => ({ id: l.id, Name: l.name })),
    Roles: (basics.roles || []).map((r) => ({
      TempId: r.tempId,
      RoleID: r.RoleID,
      ActiveFlg: r.ActiveFlg !== false,
    })),
    Tickets: tickets,
    RoleTickets: roleTickets,
    PtaSettings: ptaSettings,
    PtaPrizes:
      includePta && basics.ptaExtraPrizeFlg
        ? (basics.ptaExtraPrizeIds || []).map((PrizeID) => ({ PrizeID }))
        : [],
  };
}

export async function saveEvent(payload: EventSavePayload): Promise<number | null> {
  if (!payload.Event.Title) throw new Error('Az esemény neve kötelező.');
  if (payload.Event.EventTypeID == null) throw new Error('Válassz eseménytípust.');
  const response = await api.post('/event/save', payload);
  throwIfApiFailed(response.data, 'Az esemény mentése sikertelen.');
  return readCreatedEntityId(response.data, 'EventID', 'eventID', 'EventId', 'id') ?? payload.EventID;
}
