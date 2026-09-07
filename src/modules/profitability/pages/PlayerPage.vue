<template>
  <q-page class="pta-scope pta-player relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 px-4 sm:px-6 pt-4 pb-24 max-w-2xl mx-auto w-full">
      <section class="manage-panel">
        <div class="manage-panel__top">
          <RoleSwitchChip
            :event-id="eventId"
            :current="enteredRole"
            :roles="enterableRoles"
          />
          <q-btn
            icon="close"
            flat
            round
            dense
            class="text-slate-400 hover:text-white bg-white/5"
            aria-label="Bezárás"
            @click="closePanel"
          />
        </div>

        <div class="manage-panel__brand">
          <img src="~assets/PTA.png" alt="PROFI-T-ABILITY" />
        </div>
        <h1 class="manage-panel__title">{{ eventName }}</h1>

        <div class="manage-status-row">
          <span class="manage-status-btn is-disabled" :style="statusVisual">
            <span v-if="statusKey === 'active'" class="manage-status-btn__dot" />
            <span>{{ statusLabel }}</span>
          </span>
        </div>

        <div v-if="showTotals" class="manage-kpis">
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ formatScore(overallPoint) }}</span>
            <span class="manage-kpi__label">Összpontszám</span>
          </div>
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ formatScore(overallTruck) }}</span>
            <span class="manage-kpi__label">Összkamion</span>
          </div>
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ showOverallPosition && overallPosition != null ? overallPosition + '.' : '—' }}</span>
            <span class="manage-kpi__label">Összhelyezés</span>
          </div>
        </div>
      </section>

      <section v-if="waitMessage" class="player-wait">
        <q-icon :name="waitIcon" size="48px" style="color: #f68b29;" />
        <p class="player-wait__text">{{ waitMessage }}</p>
      </section>

      <template v-else>
        <section v-if="roundsPanelOpen" class="game-rounds-panel">
          <div class="game-rounds-panel__top">
            <h2 class="game-rounds-panel__title">Fordulók</h2>
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
          <div class="game-rounds">
            <button
              v-for="round in rounds"
              :key="round.id"
              type="button"
              class="game-round"
              :class="{ 'is-active': selectedRoundId === round.id }"
              @click="selectedRoundId = round.id"
            >
              <span class="game-round__num">{{ round.label }}</span>
              <span class="game-round__status is-readonly" :class="statusClass(round.status)">
                {{ round.status }}
              </span>
            </button>
          </div>
        </section>

        <button
          v-else
          type="button"
          class="game-rounds-restore"
          @click="roundsPanelOpen = true"
        >
          <span class="game-rounds-restore__icon">
            <q-icon name="unfold_more" size="20px" />
          </span>
          <span class="game-rounds-restore__body">
            <span class="game-rounds-restore__label">Fordulók</span>
            <span v-if="currentRound" class="game-rounds-restore__meta">
              {{ currentRound.label }} · {{ currentRound.status }}
            </span>
          </span>
          <q-icon name="expand_more" size="22px" class="game-rounds-restore__chevron" />
        </button>

        <section v-if="currentSeat" class="player-seat">
          <div class="player-seat__desk">
            <img :src="tableIcon" alt="" class="pta-icon pta-icon--table" />
            <span class="player-seat__desk-no">{{ currentSeat.deskNo }}.</span>
            <span class="player-seat__desk-label">asztal</span>
          </div>
          <div class="player-seat__color">
            <span class="player-seat__swatch" :style="{ background: currentSeat.color }" />
            <span class="player-seat__color-name" :style="{ color: currentSeat.color }">
              {{ currentSeat.colorName }}
            </span>
          </div>

          <div v-if="roundResultVisible && currentSeat.resultPoint != null" class="player-seat__result">
            <div class="player-seat__stat">
              <img :src="scoreIcon" alt="Összeg" class="pta-icon" />
              <span>{{ formatScore(currentSeat.amount) }}</span>
            </div>
            <div class="player-seat__stat">
              <img :src="scoreTruckIcon" alt="Kamion" class="pta-icon" />
              <span>{{ formatScore(currentSeat.onTrack) }}</span>
            </div>
            <div class="player-seat__stat player-seat__stat--points">
              <span>{{ formatScore(currentSeat.resultPoint) }}</span>
            </div>
          </div>
          <p v-else class="player-seat__pending">Az eredmény a forduló publikálása után jelenik meg.</p>
        </section>

        <section v-else class="player-wait player-wait--compact">
          <q-icon name="sym_r_table_restaurant" size="36px" class="text-slate-500" />
          <p class="player-wait__text">{{ emptySeatMessage }}</p>
        </section>
      </template>

      <EventClosedFollowUp
        :event-id="eventId"
        :event-ended="playPhase === 'ended'"
        :current-role="enteredRole"
        :roles="enterableRoles"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import EventClosedFollowUp from 'src/components/event/EventClosedFollowUp.vue';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import { nullableNumericId } from 'src/utils/apiPayload';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { eventPlayPhase, findEventStatus } from 'src/utils/eventFlow';
import { eventDatasheetKind, playerEnterBlocked } from 'src/utils/eventRoleNav';
import {
  findPtaPlayerForEventUser,
  ptaEventPlayerId,
  ptaEventRoundId,
  ptaEventUserId,
} from 'src/modules/profitability/ptaData';
import { findPlayerSeat, isReservePlayer } from 'src/modules/profitability/playerSheet';
import {
  catalogHasPublishedStatus,
  computePublishedPlayerFinals,
  isLiveStatus,
  isPublishedStatus,
  pickOpenRoundId,
  roundResultsReleased,
  foldText,
} from 'src/modules/profitability/standings';
import '../theme.css';
import scoreIcon from '../assets/Score.png';
import scoreTruckIcon from '../assets/ScoreTruck.png';
import tableIcon from '../assets/Table.png';

interface PlayerRoundRow {
  id: number;
  order: number;
  label: string;
  status: string;
}

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

const eventId = computed(() => String(route.params.id));
const selectedRoundId = ref<number | null>(null);
const roundsPanelOpen = ref(false);

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
  return (
    roles.find((r) => eventDatasheetKind(r, eventId.value) === 'player') ||
    roles.find((r) => !r.isOrganizer) ||
    roles[0] ||
    null
  );
});

const sheetEventUserId = computed(() => {
  const q = route.query.eventUserId;
  if (q != null && q !== '') {
    const n = Number(q);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return enteredRole.value?.eventUserId ?? null;
});

const eventStatusId = computed(() => {
  const e = dbEvent.value;
  if (!e) return null;
  return e.EventStatusID ?? e.eventStatusID ?? e.StatusID ?? e.StatusId ?? null;
});

const statusRecord = computed(() => findEventStatus(masterDataStore.eventStatuses, eventStatusId.value));

const statusLabel = computed(() => {
  const rec = statusRecord.value;
  if (rec) return String(rec.StatusName || rec.Name || 'Státusz');
  return masterDataStore.getEventStatusNameById(
    eventStatusId.value,
    eventStatusId.value == null ? 'Tervezés' : 'Státusz'
  );
});

const playPhase = computed(() => eventPlayPhase(statusLabel.value));

const statusKey = computed(() => {
  if (playPhase.value === 'game' || playPhase.value === 'ceremony') return 'active';
  if (playPhase.value === 'ended') return 'completed';
  return 'other';
});

const statusVisual = computed(() => {
  const rec = statusRecord.value;
  const hex = String(rec?.ColorHex ?? rec?.ColorCode ?? rec?.colorHex ?? '');
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const r = parseInt(full.slice(1, 3), 16);
    const g = parseInt(full.slice(3, 5), 16);
    const b = parseInt(full.slice(5, 7), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
      color: full,
    };
  }
  if (statusKey.value === 'active') {
    return {
      backgroundColor: 'rgba(40, 199, 111, 0.15)',
      borderColor: 'rgba(40, 199, 111, 0.35)',
      color: '#28c76f',
    };
  }
  if (statusKey.value === 'completed') {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.16)',
      color: '#94a3b8',
    };
  }
  return {
    backgroundColor: 'rgba(246, 139, 41, 0.12)',
    borderColor: 'rgba(246, 139, 41, 0.3)',
    color: '#f68b29',
  };
});

const myPlayer = computed(() => {
  const eventUserId = sheetEventUserId.value;
  if (eventUserId == null) return null;
  const userId = nullableNumericId(
    eventStore.eventUsers.find((row) => Number(row.id) === Number(eventUserId))?.UserID
  );
  return findPtaPlayerForEventUser(
    eventStore.ptaEventPlayers,
    eventId.value,
    eventUserId,
    userId
  );
});

const myPlayerId = computed(() => ptaEventPlayerId(myPlayer.value));

const showUserPosition = computed(
  () => eventStore.getPtaSettingsForEvent(eventId.value)?.ShowUserPositionFlg !== false
);

const publishedFinals = computed(() =>
  computePublishedPlayerFinals({
    rounds: eventStore.getPtaRoundsForEvent(eventId.value).map((row, index) => {
      const id = ptaEventRoundId(row) ?? nullableNumericId(row.id) ?? index + 1;
      return { id, status: roundStatusName(row) };
    }),
    roundDesks: eventStore.getPtaRoundDesksForEvent(eventId.value),
    schedules: eventStore.getPtaSchedulesForEvent(eventId.value),
    catalogHasPublished: catalogHasPublishedStatus(masterDataStore.ptaEventRoundStatuses),
  })
);

const myPublishedTotals = computed(() => {
  const id = myPlayerId.value;
  if (id == null) return null;
  const fromBoard = publishedFinals.value.find((row) => row.playerId === id);
  if (fromBoard) return fromBoard;
  const player = myPlayer.value;
  if (!player) return null;
  if (player.FinalPoint == null && player.FinalTruckPoint == null && player.FinalPosition == null) {
    return null;
  }
  return {
    playerId: id,
    FinalPoint: Number(player.FinalPoint ?? 0),
    FinalTruckPoint: Number(player.FinalTruckPoint ?? 0),
    FinalPosition: Number(player.FinalPosition ?? 0) || 0,
  };
});

const hasPublishedRound = computed(() =>
  eventStore.getPtaRoundsForEvent(eventId.value).some((row) => roundResultsReleased(roundStatusName(row)))
);

const showTotals = computed(() => showUserPosition.value && (hasPublishedRound.value || myPublishedTotals.value != null));
const overallPoint = computed(() => myPublishedTotals.value?.FinalPoint ?? null);
const overallTruck = computed(() => myPublishedTotals.value?.FinalTruckPoint ?? null);
const overallPosition = computed(() => {
  const place = myPublishedTotals.value?.FinalPosition;
  return place != null && place > 0 ? place : null;
});
const showOverallPosition = computed(() => showTotals.value && showUserPosition.value);

function roundStatusName(row: Record<string, unknown>): string {
  const statusId = nullableNumericId(row.EventRoundStatusID);
  const fromMaster =
    statusId != null ? masterDataStore.getPtaEventRoundStatusById(statusId)?.SName : '';
  return String(fromMaster || row.SName || 'Kisorsolva');
}

const rounds = computed<PlayerRoundRow[]>(() =>
  eventStore.getPtaRoundsForEvent(eventId.value).map((row, index) => {
    const id = ptaEventRoundId(row) ?? nullableNumericId(row.id) ?? index + 1;
    const order = Number(row.OrderIndex ?? index + 1);
    const name = String(row.RName || '').trim();
    return {
      id,
      order,
      label: name || `${order}. forduló`,
      status: roundStatusName(row),
    };
  })
);

const hasDraw = computed(() => rounds.value.length > 0);
const showSeatBoard = computed(
  () => hasDraw.value && playPhase.value !== 'checkin' && playPhase.value !== 'before'
);

const waitMessage = computed(() => {
  if (hasDraw.value) return '';
  if (playPhase.value === 'checkin' || playPhase.value === 'before') {
    return 'A sorsolás hamarosan megkezdődik.';
  }
  if (playPhase.value === 'draw') return 'A játék sorsolás alatt van.';
  return 'A sorsolás még nem készült el.';
});

const waitIcon = computed(() => {
  if (playPhase.value === 'draw') return 'casino';
  return 'hourglass_top';
});

watch(
  rounds,
  (list) => {
    if (selectedRoundId.value != null && list.some((round) => round.id === selectedRoundId.value)) return;
    selectedRoundId.value = pickOpenRoundId(list);
  },
  { immediate: true }
);

const currentRound = computed(
  () => rounds.value.find((round) => round.id === selectedRoundId.value) || rounds.value[0] || null
);

const currentSeat = computed(() => {
  if (!showSeatBoard.value || (myPlayerId.value == null && ptaEventUserId(myPlayer.value) == null) || currentRound.value == null) {
    return null;
  }
  return findPlayerSeat({
    playerId: myPlayerId.value ?? ptaEventUserId(myPlayer.value) ?? 0,
    eventUserId: ptaEventUserId(myPlayer.value),
    roundId: currentRound.value.id,
    desks: eventStore.getPtaDesksForEvent(eventId.value),
    roundDesks: eventStore.getPtaRoundDesksForEvent(eventId.value),
    schedules: eventStore.getPtaSchedulesForEvent(eventId.value),
  });
});

const roundResultVisible = computed(() => {
  const status = currentRound.value?.status || '';
  return roundResultsReleased(status);
});

const emptySeatMessage = computed(() => {
  if (isReservePlayer(myPlayer.value)) {
    return 'Tartalék játékos vagy. Ha asztalra ültetnek, itt jelenik meg a helyed.';
  }
  return 'Ebben a fordulóban még nincs asztalod.';
});

function statusClass(status: string) {
  if (isLiveStatus(status)) return 'is-live';
  if (isPublishedStatus(status) || foldText(status).includes('lezar')) return 'is-done';
  return 'is-drawn';
}

function formatScore(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value} e`;
}

function closePanel() {
  router.push({ path: `/event/${eventId.value}` });
}

function bounceIfBlocked() {
  const blocked = playerEnterBlocked(eventId.value, enteredRole.value);
  if (!blocked) return false;
  $q.notify({
    message: blocked,
    color: 'dark',
    textColor: 'orange-4',
    position: 'top',
  });
  router.replace({ path: `/event/${eventId.value}` });
  return true;
}

async function loadDataSheet() {
  const id = sheetEventUserId.value;
  if (id != null) {
    try {
      await eventStore.loadEventUserDataSheet(id);
    } catch (error) {
      $q.notify({
        message: error instanceof Error ? error.message : 'Adatlap betöltése sikertelen',
        color: 'dark',
        textColor: 'red-4',
        position: 'top',
      });
    }
  }
  bounceIfBlocked();
}

onMounted(() => {
  void loadDataSheet();
});
watch(sheetEventUserId, (id, prev) => {
  if (id != null && id !== prev) void loadDataSheet();
});
</script>

<style scoped>
.pta-player {
  background: var(--pta-page);
}

.manage-panel {
  position: relative;
  overflow: hidden;
  background: rgba(16, 17, 18, 0.92);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 16px 16px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  margin-bottom: 16px;
}

.manage-panel__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.manage-panel__title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  color: #f1f5f9;
  text-align: center;
}

.manage-panel__brand {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.manage-panel__brand img {
  height: 28px;
  width: auto;
  object-fit: contain;
}

.manage-status-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.manage-status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(246, 139, 41, 0.3);
  background: rgba(246, 139, 41, 0.12);
  color: #f68b29;
  font-size: 13px;
  font-weight: 800;
}

.manage-status-btn.is-disabled {
  cursor: default;
  opacity: 0.9;
}

.manage-status-btn__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #28c76f;
}

.manage-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.manage-kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border-radius: 12px;
  background: rgba(10, 11, 12, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.manage-kpi__value {
  font-size: 18px;
  font-weight: 800;
  color: #f1f5f9;
  line-height: 1.1;
}

.manage-kpi__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.player-wait {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  padding: 28px 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
  text-align: center;
}

.player-wait--compact {
  min-height: 140px;
}

.player-wait__text {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #e2e8f0;
  max-width: 22rem;
}

.game-rounds-panel {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(246, 139, 41, 0.22);
  background: rgba(16, 17, 18, 0.92);
}

.game-rounds-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.game-rounds-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #f1f5f9;
}

.game-rounds-restore {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid rgba(246, 139, 41, 0.45);
  background: linear-gradient(135deg, rgba(246, 139, 41, 0.18) 0%, rgba(16, 17, 18, 0.92) 55%);
  color: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.game-rounds-restore__icon {
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

.game-rounds-restore__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.game-rounds-restore__label {
  font-size: 14px;
  font-weight: 800;
}

.game-rounds-restore__meta {
  font-size: 12px;
  font-weight: 600;
  color: #fdba74;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-rounds-restore__chevron {
  flex-shrink: 0;
  color: #f68b29;
}

.game-rounds {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-round {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 10px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.game-round.is-active {
  border-color: rgba(246, 139, 41, 0.5);
  background: rgba(246, 139, 41, 0.1);
}

.game-round__num {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}

.game-round__status {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 9999px;
}

.game-round__status.is-drawn {
  color: #fdba74;
  background: rgba(246, 139, 41, 0.14);
}

.game-round__status.is-live {
  color: #86efac;
  background: rgba(40, 199, 111, 0.16);
}

.game-round__status.is-done {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.16);
}

.player-seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 28px 18px 24px;
  border-radius: 20px;
  border: 1px solid rgba(246, 139, 41, 0.28);
  background: rgba(16, 17, 18, 0.92);
}

.player-seat__desk {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.player-seat__desk-no {
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
  color: #f1f5f9;
}

.player-seat__desk-label {
  font-size: 16px;
  font-weight: 700;
  color: #94a3b8;
}

.player-seat__color {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-seat__swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08);
}

.player-seat__color-name {
  font-size: 20px;
  font-weight: 800;
}

.player-seat__result {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  width: 100%;
}

.player-seat__stat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(10, 11, 12, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 18px;
  font-weight: 800;
  color: #f1f5f9;
}

.player-seat__stat--points {
  color: #fdba74;
}

.player-seat__pending {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  text-align: center;
}

.pta-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.pta-icon--table {
  width: 28px;
  height: 28px;
}
</style>
