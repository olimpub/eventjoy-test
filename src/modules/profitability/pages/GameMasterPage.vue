<template>
  <q-page class="pta-scope pta-organizer relative min-h-full overflow-x-hidden">
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

        <div class="manage-kpis">
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ kpiRegistered }}</span>
            <span class="manage-kpi__label">Jelentkezett</span>
          </div>
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ kpiCheckedIn }}</span>
            <span class="manage-kpi__label">Belépett</span>
          </div>
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ kpiDesks }}</span>
            <span class="manage-kpi__label">Asztal</span>
          </div>
        </div>
      </section>

      <div class="manage-grid">
        <button type="button" class="manage-tile pta-play-tile" @click="openGame">
          <span class="manage-tile__icon">
            <q-icon name="sym_r_sports_esports" size="26px" />
          </span>
          <span class="manage-tile__label">Játék</span>
        </button>
        <button type="button" class="manage-tile" @click="openResults">
          <span class="manage-tile__icon">
            <q-icon name="sym_r_emoji_events" size="26px" />
          </span>
          <span class="manage-tile__label">Eredmények</span>
        </button>
        <button
          v-for="action in manageActions"
          :key="action.id"
          type="button"
          class="manage-tile"
          @click="action.onClick"
        >
          <span class="manage-tile__icon">
            <q-icon :name="action.icon" size="26px" />
            <span v-if="action.badge" class="manage-tile__badge">{{ action.badge > 99 ? '99+' : action.badge }}</span>
          </span>
          <span class="manage-tile__label">{{ action.label }}</span>
        </button>
      </div>

      <EventClosedFollowUp
        :event-id="eventId"
        :event-ended="playPhase === 'ended'"
        :current-role="enteredRole"
        :roles="enterableRoles"
      />
    </div>

    <q-dialog v-model="isSoonOpen" transition-show="scale" transition-hide="scale">
      <ComingSoonCube :title="soonLabel" :icon="soonIcon" />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ComingSoonCube from 'src/components/event/ComingSoonCube.vue';
import EventClosedFollowUp from 'src/components/event/EventClosedFollowUp.vue';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import { useCommunicationStore } from 'src/stores/communication';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { eventPlayPhase, findEventStatus } from 'src/utils/eventFlow';
import { nullableNumericId } from 'src/utils/apiPayload';
import { eventDatasheetKind, gameMasterEnterBlocked, isEventUserCheckedInName } from 'src/utils/eventRoleNav';
import '../theme.css';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const communicationStore = useCommunicationStore();
const isSoonOpen = ref(false);
const soonLabel = ref('Hamarosan');
const soonIcon = ref('sym_r_schedule');

const eventId = computed(() => String(route.params.id));

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
    roles.find((r) => eventDatasheetKind(r) === 'gamemaster') ||
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

const sheetParticipants = computed(() => eventStore.getParticipantDirectoryForEvent(eventId.value));
const sheetLoaded = computed(() => {
  const ctx = eventStore.eventUserScreenContext;
  if (!ctx?.eventId) return false;
  return String(ctx.eventId) === eventId.value;
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
  const name = (statusLabel.value || '').toLowerCase();
  if (name.includes('folyamat') || name.includes('fut') || name.includes('élő') || name.includes('live')) return 'active';
  if (name.includes('lezárt') || name.includes('kész') || name.includes('töröl')) return 'completed';
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

const kpiRegistered = computed(() => {
  if (!sheetLoaded.value) return '—';
  return String(sheetParticipants.value.length);
});

const kpiCheckedIn = computed(() => {
  if (!sheetLoaded.value) return '—';
  return String(
    sheetParticipants.value.filter((row) => {
      const sid = Number(row.EventUserStatusID);
      return isEventUserCheckedInName(masterDataStore.getEventUserStatusName(sid));
    }).length
  );
});

const kpiDesks = computed(() => {
  const n = eventStore.getPtaDesksForEvent(eventId.value).length;
  return n > 0 ? String(n) : '—';
});

const unreadMessageCount = computed(() => communicationStore.totalUnreadChats || 0);

const manageActions = computed(() => [
  { id: 'participants', label: 'Résztvevők', icon: 'sym_r_group', onClick: openParticipants },
  { id: 'files', label: 'Anyagok', icon: 'sym_r_folder', onClick: () => comingSoon('Anyagok', 'sym_r_folder') },
  {
    id: 'messages',
    label: 'Üzenetek',
    icon: 'sym_r_chat',
    badge: unreadMessageCount.value || undefined,
    onClick: () => comingSoon('Üzenetek', 'sym_r_chat'),
  },
  { id: 'news', label: 'Hírek', icon: 'sym_r_newspaper', onClick: () => comingSoon('Hírek', 'sym_r_newspaper') },
]);

function closePanel() {
  router.push({ path: `/event/${eventId.value}` });
}

function openParticipants() {
  router.push({
    path: `/profitability/event/${eventId.value}/participants`,
    query: { ...route.query, readonly: '1' },
  });
}

function openGame() {
  router.push({
    path: `/profitability/event/${eventId.value}/game`,
    query: route.query,
  });
}

function openResults() {
  router.push({
    path: `/profitability/event/${eventId.value}/results`,
    query: route.query,
  });
}

function comingSoon(label: string, icon = 'sym_r_schedule') {
  soonLabel.value = label;
  soonIcon.value = icon;
  isSoonOpen.value = true;
}

function bounceIfBlocked() {
  const blocked = gameMasterEnterBlocked(eventId.value, enteredRole.value);
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
.pta-organizer {
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

.pta-play-tile {
  border-color: rgba(246, 139, 41, 0.55);
  background:
    radial-gradient(circle at 50% 0%, rgba(246, 139, 41, 0.22), transparent 70%),
    rgba(16, 17, 18, 0.92);
  box-shadow: 0 0 0 1px rgba(246, 139, 41, 0.25), 0 8px 20px rgba(246, 139, 41, 0.2);
}

.pta-play-tile:hover {
  background:
    radial-gradient(circle at 50% 0%, rgba(246, 139, 41, 0.32), transparent 70%),
    rgba(255, 255, 255, 0.05);
  border-color: rgba(246, 139, 41, 0.8);
}

.pta-play-tile .manage-tile__icon {
  background: rgba(246, 139, 41, 0.22);
  color: #f68b29;
  box-shadow: 0 0 12px rgba(246, 139, 41, 0.35);
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
  min-width: 168px;
  min-height: 44px;
  padding: 10px 28px;
  border-radius: 9999px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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

.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.manage-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 108px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
  color: inherit;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.manage-tile:active {
  transform: scale(0.98);
}

.manage-tile:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(246, 139, 41, 0.35);
}

.manage-tile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(246, 139, 41, 0.16);
  color: #f68b29;
  position: relative;
}

.manage-tile__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #ff6060;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
}

.manage-tile__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #e2e8f0;
}
</style>
