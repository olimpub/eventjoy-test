import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { nullableNumericId } from 'src/utils/apiPayload';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { eventDatasheetKind } from 'src/utils/eventRoleNav';
import {
  collectGroupingValues,
  findPtaPlayerByRef,
  listEnabledGroupingAttrs,
  pickGroupingText,
  ptaEventRoundId,
  resolvePtaSeatName,
  type EventGroupingKey,
} from 'src/modules/profitability/ptaData';
import {
  aggregateStandings,
  buildStandings,
  deskHasRecordedResults,
  pickLatestReleasedRoundId,
  pickOpenRoundId,
  roundResultsReleased,
  type ResultsScope,
  type StandingRow,
} from 'src/modules/profitability/standings';

export interface PtaStandingsRoundRow {
  id: number;
  order: number;
  label: string;
  status: string;
  deskCount: number;
  closedDeskCount: number;
}

const GROUPING_KEYS: EventGroupingKey[] = ['organization', 'team', 'region', 'company'];

export function parseResultsScope(raw: unknown): ResultsScope | null {
  return raw === 'round' || raw === 'total' ? raw : null;
}

export function parseGroupingQuery(
  raw: unknown,
  enabled: EventGroupingKey[]
): EventGroupingKey | null | undefined {
  if (raw == null) return undefined;
  const value = String(raw);
  if (!value || value === 'player') return null;
  if (GROUPING_KEYS.includes(value as EventGroupingKey) && enabled.includes(value as EventGroupingKey)) {
    return value as EventGroupingKey;
  }
  return null;
}

export function usePtaStandings(options?: { publishedOnly?: boolean; feed?: 'store' | 'display' }) {
  const publishedOnly = options?.publishedOnly === true;
  const useDisplayFeed = options?.feed === 'display';
  const route = useRoute();
  const eventStore = useEventStore();
  const masterDataStore = useMasterDataStore();

  const eventId = computed(() => String(route.params.id));
  const selectedRoundId = ref<number | null>(null);
  const scope = ref<ResultsScope>('round');
  const groupKey = ref<EventGroupingKey | null>(null);

  const feed = computed(() => {
    const row = eventStore.ptaDisplayFeed;
    if (!useDisplayFeed || !row || row.eventId !== eventId.value) return null;
    const hasDraw =
      row.rounds.length > 0 || row.roundDesks.length > 0 || row.schedules.length > 0;
    if (!hasDraw) return null;
    return row;
  });

  const dbEvent = computed(() => {
    const targetId = eventId.value;
    return (
      eventStore.events?.find((e: any) => String(e.id) === targetId) ||
      eventStore.myEvents?.find((e: any) => String(e.id) === targetId) ||
      null
    );
  });

  const eventName = computed(() => {
    if (feed.value?.eventName) return feed.value.eventName;
    const e = dbEvent.value;
    if (!e) return 'Esemény';
    return e.Title || e.EventName || e.Name || 'Esemény';
  });

  const enterableRoles = computed(() => {
    const e = dbEvent.value;
    if (!e) return [];
    return eventStore.getEnterableRolesForEvent(e.id, e.EventTypeID ?? e.eventTypeId);
  });

  const enteredRole = computed(() => {
    const roles = enterableRoles.value;
    const qUser = route.query.eventUserId;
    if (qUser != null && qUser !== '') {
      const byUser = roles.find((r) => String(r.eventUserId) === String(qUser));
      if (byUser) return byUser;
    }
    const qRole = route.query.eventRoleId;
    if (qRole != null && qRole !== '') {
      const byRole = roles.find((r) => String(r.eventRoleId) === String(qRole));
      if (byRole) return byRole;
    }
    return roles.find((r) => r.isOrganizer) || roles[0] || null;
  });

  const isStaffView = computed(() => {
    const kind = eventDatasheetKind(enteredRole.value);
    return kind === 'organizer' || kind === 'gamemaster';
  });

  function roundStatusName(row: Record<string, unknown>): string {
    const statusId = nullableNumericId(row.EventRoundStatusID);
    const fromMaster =
      statusId != null ? masterDataStore.getPtaEventRoundStatusById(statusId)?.SName : '';
    return String(fromMaster || row.SName || 'Kisorsolva');
  }

  function playerRows() {
    if (feed.value) return feed.value.players;
    return [...eventStore.getPtaPlayersForEvent(eventId.value), ...eventStore.ptaEventPlayers];
  }

  function peopleRows() {
    if (feed.value) return [];
    return [
      ...eventStore.getParticipantDirectoryForEvent(eventId.value),
      ...eventStore.getEventParticipantsForEvent(eventId.value),
      ...eventStore.getEventUsersForEvent(eventId.value),
    ];
  }

  function roundRows() {
    return feed.value ? feed.value.rounds : eventStore.getPtaRoundsForEvent(eventId.value);
  }

  function roundDeskRows() {
    return feed.value ? feed.value.roundDesks : eventStore.getPtaRoundDesksForEvent(eventId.value);
  }

  function scheduleRows() {
    return feed.value ? feed.value.schedules : eventStore.getPtaSchedulesForEvent(eventId.value);
  }

  function settingsRow() {
    if (feed.value?.settings.length) return feed.value.settings[0] || null;
    return eventStore.getPtaSettingsForEvent(eventId.value);
  }

  function playerName(playerId: number | null): string {
    return resolvePtaSeatName({
      playerId,
      players: playerRows(),
      people: peopleRows(),
      eventId: eventId.value,
    });
  }

  function groupingValueForPlayer(playerId: number, key: EventGroupingKey): string {
    const player = findPtaPlayerByRef(playerRows(), eventId.value, playerId);
    const eventUserId = nullableNumericId(player?.EventUserID);
    const eu =
      eventUserId != null && !feed.value
        ? eventStore.getParticipantDirectoryForEvent(eventId.value).find((row) => row.id === eventUserId)
        : null;
    const source: Record<string, unknown> = {
      ...(player || {}),
      ...((eu as Record<string, unknown>) || {}),
    };
    const orgId = nullableNumericId(source.OrganizationID ?? source.organizationID ?? source.OrganizationId);
    if (orgId != null && !pickGroupingText(source, 'organization')) {
      const orgName = masterDataStore.getOrganizationNameById(orgId);
      if (orgName) source.OrganizationName = orgName;
    }
    const settings = settingsRow();
    return collectGroupingValues([source], settings)[key] || pickGroupingText(source, key) || 'Nincs megadva';
  }

  const rounds = computed<PtaStandingsRoundRow[]>(() => {
    const roundDesks = roundDeskRows();
    const schedules = scheduleRows();
    return roundRows().map((row, index) => {
      const id = ptaEventRoundId(row) ?? nullableNumericId(row.id) ?? index + 1;
      const order = Number(row.OrderIndex ?? index + 1);
      const name = String(row.RName || '').trim();
      const status = roundStatusName(row);
      const desks = roundDesks.filter((desk) => ptaEventRoundId(desk) === id);
      return {
        id,
        order,
        label: name || `${order}. forduló`,
        status,
        deskCount: desks.length,
        closedDeskCount: desks.filter((desk) => deskHasRecordedResults(desk, status, schedules, desks)).length,
      };
    });
  });

  const hasDraw = computed(() => rounds.value.length > 0);

  const visibleRounds = computed(() => {
    if (publishedOnly || !isStaffView.value) {
      return rounds.value.filter((round) => roundResultsReleased(round.status));
    }
    return rounds.value;
  });

  const groupingAttrs = computed(() => listEnabledGroupingAttrs(settingsRow()));

  watch(
    visibleRounds,
    (list) => {
      if (selectedRoundId.value != null && list.some((round) => round.id === selectedRoundId.value)) return;
      selectedRoundId.value = publishedOnly ? pickLatestReleasedRoundId(list) : pickOpenRoundId(list);
    },
    { immediate: true }
  );

  watch(groupingAttrs, (attrs) => {
    if (groupKey.value && !attrs.some((attr) => attr.key === groupKey.value)) {
      groupKey.value = null;
    }
  });

  const currentRound = computed(
    () => visibleRounds.value.find((round) => round.id === selectedRoundId.value) || visibleRounds.value[0] || null
  );

  const standingRoundIds = computed(() => {
    const current = currentRound.value;
    if (!current) return [];
    if (scope.value === 'round') return [current.id];
    return visibleRounds.value.filter((round) => round.order <= current.order).map((round) => round.id);
  });

  const standings = computed<StandingRow[]>(() => {
    const rows = buildStandings({
      roundIds: standingRoundIds.value,
      rounds: rounds.value,
      roundDesks: roundDeskRows(),
      schedules: scheduleRows(),
      playerName,
    });
    const key = groupKey.value;
    if (!key) return rows;
    return aggregateStandings(rows, (playerId) => groupingValueForPlayer(playerId, key));
  });

  const standingsCaption = computed(() => {
    const current = currentRound.value;
    if (!current) return '';
    if (scope.value === 'round') return `Csak a ${current.label}`;
    const included = visibleRounds.value.filter((round) => round.order <= current.order);
    if (included.length <= 1) return `${current.label} után — megegyezik a fordulóval`;
    const first = included[0]?.label || '';
    return `${first} – ${current.label} után`;
  });

  const groupingLabel = computed(() => {
    const attr = groupingAttrs.value.find((item) => item.key === groupKey.value);
    return attr?.label || 'Játékos';
  });

  function playerGroupLine(playerId: number | null | undefined): string {
    if (playerId == null || playerId <= 0) return '';
    return groupingAttrs.value
      .map((attr) => groupingValueForPlayer(playerId, attr.key))
      .filter((value) => value && value !== 'Nincs megadva')
      .join(' · ');
  }

  return {
    eventId,
    eventName,
    enterableRoles,
    enteredRole,
    isStaffView,
    selectedRoundId,
    scope,
    groupKey,
    rounds,
    visibleRounds,
    hasDraw,
    currentRound,
    standings,
    groupingAttrs,
    groupingLabel,
    groupingValueForPlayer,
    playerGroupLine,
    standingsCaption,
  };
}
