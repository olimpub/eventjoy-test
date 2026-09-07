<template>
  <q-page class="pta-scope pta-results relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="res-wrap relative z-10">
      <header class="res-header">
        <button type="button" class="res-back" aria-label="Vissza" @click="goBack">
          <q-icon name="arrow_back" size="20px" />
        </button>
        <div class="res-header__text">
          <h1 class="res-header__title">Eredmények</h1>
          <p class="res-header__event">{{ eventName }}</p>
        </div>
      </header>

      <section v-if="!hasDraw" class="res-empty">
        <q-icon name="emoji_events" size="48px" style="color: #f68b29;" />
        <h2 class="res-empty__title">Még nincs sorsolás</h2>
        <p class="res-empty__text">Először a Játék oldalon kell generálni a fordulókat.</p>
      </section>

      <section v-else-if="!visibleRounds.length" class="res-empty">
        <q-icon name="emoji_events" size="48px" style="color: #f68b29;" />
        <h2 class="res-empty__title">Még nincs publikált eredmény</h2>
        <p class="res-empty__text">A közreműködő és a játékos csak a publikált fordulók eredményét látja.</p>
      </section>

      <template v-else>
        <section v-if="roundsPanelOpen" class="res-rounds-panel">
          <div class="res-rounds-panel__top">
            <h2 class="res-rounds-panel__title">Fordulók</h2>
            <q-btn
              icon="close"
              flat
              round
              dense
              class="text-slate-400 hover:text-white bg-white/5"
              aria-label="Fordulók elrejtése"
              @click="roundsPanelOpen = false"
            />
          </div>
          <div class="res-rounds">
            <button
              v-for="round in visibleRounds"
              :key="round.id"
              type="button"
              class="res-round"
              :class="{ 'is-active': selectedRoundId === round.id }"
              @click="selectedRoundId = round.id"
            >
              <span class="res-round__num">{{ round.label }}</span>
              <span class="res-round__desks">{{ round.closedDeskCount }}/{{ round.deskCount }}</span>
              <span class="res-round__status" :class="statusClass(round.status)">{{ round.status }}</span>
            </button>
          </div>
        </section>

        <button
          v-else
          type="button"
          class="res-rounds-restore"
          @click="roundsPanelOpen = true"
        >
          <span class="res-rounds-restore__icon">
            <q-icon name="unfold_more" size="20px" />
          </span>
          <span class="res-rounds-restore__body">
            <span class="res-rounds-restore__label">Fordulók</span>
            <span v-if="currentRound" class="res-rounds-restore__meta">
              {{ currentRound.label }}
              <span class="res-round__desks">{{ currentRound.closedDeskCount }}/{{ currentRound.deskCount }}</span>
              · {{ currentRound.status }}
            </span>
          </span>
          <q-icon name="expand_more" size="22px" class="res-rounds-restore__chevron" />
        </button>

        <div class="res-scope" role="tablist" aria-label="Eredmény nézet">
          <button
            type="button"
            class="res-scope__btn"
            :class="{ 'is-on': scope === 'round' }"
            @click="scope = 'round'"
          >
            Forduló
          </button>
          <button
            type="button"
            class="res-scope__btn is-total"
            :class="{ 'is-on': scope === 'total' }"
            @click="scope = 'total'"
          >
            Összesített
          </button>
        </div>
        <p class="res-caption">{{ standingsCaption }}</p>

        <div v-if="groupingAttrs.length" class="res-group" role="tablist" aria-label="Csoportosítás">
          <button
            type="button"
            class="res-group__btn"
            :class="{ 'is-on': groupKey == null }"
            @click="groupKey = null"
          >
            Játékos
          </button>
          <button
            v-for="attr in groupingAttrs"
            :key="attr.key"
            type="button"
            class="res-group__btn"
            :class="{ 'is-on': groupKey === attr.key }"
            @click="groupKey = attr.key"
          >
            {{ attr.label }}
          </button>
        </div>

        <div class="res-toolbar">
          <q-input
            v-model="searchQuery"
            :placeholder="searchPlaceholder"
            dark
            outlined
            dense
            color="orange"
            class="res-search"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="slate-400" size="18px" />
            </template>
            <template v-slot:append>
              <q-icon
                v-if="searchQuery"
                name="close"
                class="cursor-pointer"
                color="slate-400"
                size="18px"
                @click="searchQuery = ''"
              />
            </template>
          </q-input>
        </div>

        <div v-if="filteredStandings.length === 0" class="res-empty res-empty--compact">
          <q-icon name="emoji_events" size="32px" class="text-slate-500" />
          <p class="res-empty__title">Nincs megjeleníthető eredmény</p>
          <p class="res-empty__text">Csak a lezárt asztalok pontjai számítanak.</p>
        </div>

        <div v-else class="res-board">
          <div class="res-board__cols" aria-hidden="true">
            <span v-if="showUserPosition" class="res-board__place" />
            <span class="res-board__name" />
            <img :src="scoreIcon" alt="Összeg" class="res-icon res-board__score" />
            <img :src="scoreTruckIcon" alt="Kamion" class="res-icon res-board__truck" />
            <span class="res-board__points" />
          </div>
          <div
            v-for="(row, index) in filteredStandings"
            :key="(groupKey || 'player') + '-' + (row.playerId || row.name)"
            class="res-board__row"
          >
            <span v-if="showUserPosition" class="res-board__place">{{ index + 1 }}</span>
            <span class="res-board__name">
              <span class="res-board__label">{{ row.name }}</span>
              <span v-if="row.memberCount" class="res-board__count">{{ row.memberCount }} fő</span>
            </span>
            <span class="res-board__score">{{ row.amount }}</span>
            <span class="res-board__truck">{{ row.onTrack }}</span>
            <span class="res-board__points">{{ row.resultPoint }} e</span>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { nullableNumericId } from 'src/utils/apiPayload';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { eventDatasheetKind, eventRolePath, eventRoleQuery } from 'src/utils/eventRoleNav';
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
  foldText,
  isClosedStatus,
  isLiveStatus,
  pickOpenRoundId,
  roundResultsReleased,
  type ResultsScope,
} from 'src/modules/profitability/standings';
import '../theme.css';
import scoreIcon from '../assets/Score.png';
import scoreTruckIcon from '../assets/ScoreTruck.png';

interface ResultsRoundRow {
  id: number;
  order: number;
  label: string;
  status: string;
  deskCount: number;
  closedDeskCount: number;
}

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

const eventId = computed(() => String(route.params.id));
const selectedRoundId = ref<number | null>(null);
const roundsPanelOpen = ref(false);
const searchQuery = ref('');
const scope = ref<ResultsScope>('round');
const groupKey = ref<EventGroupingKey | null>(null);

const dbEvent = computed(() => {
  const targetId = eventId.value;
  return (
    eventStore.events?.find((e: any) => String(e.id) === targetId) ||
    eventStore.myEvents?.find((e: any) => String(e.id) === targetId) ||
    null
  );
});

const eventName = computed(() => {
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
const showUserPosition = computed(() => {
  if (eventDatasheetKind(enteredRole.value) !== 'player') return true;
  return eventStore.getPtaSettingsForEvent(eventId.value)?.ShowUserPositionFlg !== false;
});

function roundStatusName(row: Record<string, unknown>): string {
  const statusId = nullableNumericId(row.EventRoundStatusID);
  const fromMaster =
    statusId != null ? masterDataStore.getPtaEventRoundStatusById(statusId)?.SName : '';
  return String(fromMaster || row.SName || 'Kisorsolva');
}

function playerName(playerId: number | null): string {
  return resolvePtaSeatName({
    playerId,
    players: [...eventStore.getPtaPlayersForEvent(eventId.value), ...eventStore.ptaEventPlayers],
    people: [
      ...eventStore.getParticipantDirectoryForEvent(eventId.value),
      ...eventStore.getEventParticipantsForEvent(eventId.value),
      ...eventStore.getEventUsersForEvent(eventId.value),
    ],
    eventId: eventId.value,
  });
}

function groupingValueForPlayer(playerId: number, key: EventGroupingKey): string {
  const player = findPtaPlayerByRef(
    [...eventStore.getPtaPlayersForEvent(eventId.value), ...eventStore.ptaEventPlayers],
    eventId.value,
    playerId
  );
  const eventUserId = nullableNumericId(player?.EventUserID);
  const eu =
    eventUserId != null
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
  const settings = eventStore.getPtaSettingsForEvent(eventId.value);
  return collectGroupingValues([source], settings)[key] || pickGroupingText(source, key) || 'Nincs megadva';
}

function statusClass(status: string) {
  if (isLiveStatus(status)) return 'is-live';
  if (isClosedStatus(status)) return 'is-done';
  return 'is-drawn';
}

const rounds = computed<ResultsRoundRow[]>(() => {
  const roundDesks = eventStore.getPtaRoundDesksForEvent(eventId.value);
  const schedules = eventStore.getPtaSchedulesForEvent(eventId.value);
  return eventStore.getPtaRoundsForEvent(eventId.value).map((row, index) => {
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
  if (isStaffView.value) return rounds.value;
  return rounds.value.filter((round) => roundResultsReleased(round.status));
});

watch(
  visibleRounds,
  (list) => {
    if (selectedRoundId.value != null && list.some((round) => round.id === selectedRoundId.value)) return;
    selectedRoundId.value = pickOpenRoundId(list);
  },
  { immediate: true }
);

const currentRound = computed(
  () => visibleRounds.value.find((round) => round.id === selectedRoundId.value) || visibleRounds.value[0] || null
);

const standingRoundIds = computed(() => {
  const current = currentRound.value;
  if (!current) return [];
  if (scope.value === 'round') return [current.id];
  return visibleRounds.value.filter((round) => round.order <= current.order).map((round) => round.id);
});

const standings = computed(() => {
  const rows = buildStandings({
    roundIds: standingRoundIds.value,
    rounds: rounds.value,
    roundDesks: eventStore.getPtaRoundDesksForEvent(eventId.value),
    schedules: eventStore.getPtaSchedulesForEvent(eventId.value),
    playerName,
  });
  const key = groupKey.value;
  if (!key) return rows;
  return aggregateStandings(rows, (playerId) => groupingValueForPlayer(playerId, key));
});

const groupingAttrs = computed(() =>
  listEnabledGroupingAttrs(eventStore.getPtaSettingsForEvent(eventId.value))
);

watch(groupingAttrs, (attrs) => {
  if (groupKey.value && !attrs.some((attr) => attr.key === groupKey.value)) {
    groupKey.value = null;
  }
});

const searchPlaceholder = computed(() => {
  const attr = groupingAttrs.value.find((item) => item.key === groupKey.value);
  return attr?.label || 'Játékos';
});

const filteredStandings = computed(() => {
  const q = foldText(searchQuery.value.trim());
  if (!q) return standings.value;
  return standings.value.filter((row) => foldText(row.name).includes(q));
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

function goBack() {
  const { readonly: _readonly, from: _from, ...query } = route.query;
  router.push({
    path: eventRolePath(eventId.value, enteredRole.value),
    query: Object.keys(query).length ? query : eventRoleQuery(enteredRole.value),
  });
}
</script>

<style scoped>
.pta-results {
  background: var(--pta-page);
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.res-wrap {
  box-sizing: border-box;
  width: 100%;
  max-width: 42rem;
  min-width: 0;
  margin: 0 auto;
  padding: 16px max(24px, env(safe-area-inset-right, 0px)) 96px max(24px, env(safe-area-inset-left, 0px));
}

.res-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-bottom: 16px;
}

.res-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  cursor: pointer;
}

.res-header__text {
  min-width: 0;
  flex: 1;
}

.res-header__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
  color: #f1f5f9;
}

.res-header__event {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
  text-align: center;
}

.res-empty--compact {
  padding: 20px 16px;
}

.res-empty__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #f1f5f9;
}

.res-empty__text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.res-rounds-panel {
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
}

.res-rounds-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.res-rounds-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #f1f5f9;
}

.res-rounds-restore {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 60px;
  margin-bottom: 14px;
  padding: 10px 12px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(246, 139, 41, 0.45);
  background: linear-gradient(135deg, rgba(246, 139, 41, 0.18) 0%, rgba(16, 17, 18, 0.92) 55%);
  color: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.res-rounds-restore__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(246, 139, 41, 0.22);
  color: #f68b29;
}

.res-rounds-restore__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.res-rounds-restore__label {
  font-size: 14px;
  font-weight: 800;
}

.res-rounds-restore__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  font-size: 12px;
  font-weight: 600;
  color: #fdba74;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-rounds-restore__meta .res-round__desks {
  font-size: 12px;
  padding: 1px 7px;
}

.res-rounds-restore__chevron {
  flex-shrink: 0;
  color: #f68b29;
}

.res-rounds {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.res-round {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 52px;
  padding: 8px 10px 8px 14px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  cursor: pointer;
}

.res-round.is-active {
  border-color: rgba(246, 139, 41, 0.5);
  background: rgba(246, 139, 41, 0.1);
}

.res-round__num {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-round__desks {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4em;
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid rgba(246, 139, 41, 0.55);
  border-radius: 9999px;
  background: rgba(246, 139, 41, 0.12);
  color: #fdba74;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
}

.res-round__status {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 9999px;
}

.res-round__status.is-drawn {
  color: #fdba74;
  background: rgba(246, 139, 41, 0.12);
}

.res-round__status.is-live {
  color: #28c76f;
  background: rgba(40, 199, 111, 0.12);
}

.res-round__status.is-done {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.14);
}

.res-scope {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-bottom: 8px;
}

.res-scope__btn {
  min-width: 0;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.res-scope__btn.is-on {
  border-color: rgba(246, 139, 41, 0.55);
  background: rgba(246, 139, 41, 0.16);
  color: #fdba74;
}

.res-scope__btn.is-total.is-on {
  border-color: rgba(42, 169, 255, 0.55);
  background: rgba(42, 169, 255, 0.16);
  color: #7dd3fc;
}

.res-caption {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.res-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-bottom: 12px;
}

.res-group__btn {
  min-width: 0;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.res-group__btn.is-on {
  border-color: rgba(246, 139, 41, 0.55);
  background: rgba(246, 139, 41, 0.16);
  color: #fdba74;
}

.res-toolbar {
  margin-bottom: 12px;
  min-width: 0;
  max-width: 100%;
}

.res-search {
  width: 100%;
  max-width: 100%;
}

.res-search :deep(.q-field__control) {
  border-radius: 14px;
}

.res-icon {
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}

.res-board {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.res-board__cols,
.res-board__row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.res-board__cols {
  padding: 0 16px 6px;
}

.res-board__row {
  min-height: 48px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.res-board__place {
  width: 26px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 800;
  color: #94a3b8;
  text-align: center;
}

.res-board__name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.res-board__label {
  font-size: 14px;
  font-weight: 800;
  color: #f1f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-board__count {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}

.res-board__score,
.res-board__cols .res-board__score {
  width: 44px;
  height: 18px;
  flex-shrink: 0;
  object-fit: contain;
  font-size: 13px;
  font-weight: 800;
  color: #f8fafc;
  text-align: center;
}

.res-board__truck,
.res-board__cols .res-board__truck {
  width: 36px;
  height: 16px;
  flex-shrink: 0;
  object-fit: contain;
  font-size: 13px;
  font-weight: 800;
  color: #cbd5e1;
  text-align: center;
}

.res-board__points {
  min-width: 40px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: #fdba74;
  text-align: right;
  white-space: nowrap;
}
</style>
