<template>
  <q-page v-if="event" class="pta-scope" style="background: var(--pta-page); min-height: 100vh;">
    <div class="p-4 md:p-6 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <q-btn
            icon="arrow_back"
            flat
            round
            dense
            style="color: #f68b29;"
            @click="router.push('/profitability')"
          >
            <q-tooltip>Vissza a PROFI-T-ABILITY eseményekhez</q-tooltip>
          </q-btn>
          <RoleSwitchChip
            :event-id="eventId"
            :current="enteredRole"
            :roles="enterableRoles"
          />
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <img src="~assets/PTA.png" alt="PROFI-T-ABILITY" style="height: 28px; width: auto; object-fit: contain;" />
            </div>
            <h1 class="pta-display text-white text-xl md:text-2xl m-0">{{ event.name }}</h1>
          </div>
        </div>

        <q-badge rounded class="pta-body text-[11px] px-3 py-1.5" style="background: rgba(246,139,41,0.2); color: #f68b29;">
          {{ event.status }}
        </q-badge>
      </div>

      <!-- Info line -->
      <div class="pta-glass rounded-[16px] p-4 mb-5 flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2 text-slate-300 text-[13px] pta-body">
          <q-icon name="calendar_today" size="16px" style="color: #f68b29;" />
          <span>{{ event.date }}</span>
        </div>
        <div class="flex items-center gap-2 text-slate-300 text-[13px] pta-body">
          <q-icon name="place" size="16px" style="color: #f68b29;" />
          <span>{{ event.location }}</span>
        </div>
        <q-space />
        <div class="flex items-center gap-2">
          <span class="text-[9px] text-slate-500 uppercase tracking-widest">Szervező</span>
          <q-avatar size="30px" style="background: #f68b29; color: white;" class="pta-display text-xs">
            {{ (event.organizers[0]?.name || 'PA').substring(0, 2).toUpperCase() }}
          </q-avatar>
        </div>
      </div>

      <!-- Timeline -->
      <div class="mb-5">
        <EventTimeline :current-stage="event.stage" @change-stage="onStageChange" />
      </div>

      <!-- Tabs -->
      <div class="pta-glass rounded-[16px] p-1.5 mb-5 flex gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="pta-display text-[11px] uppercase tracking-wide px-4 py-2 rounded-[10px] whitespace-nowrap shrink-0 transition-colors"
          :disabled="!availability[tab.key]"
          :style="activeTab === tab.key
            ? 'background: linear-gradient(135deg, #f68b29, #ea580c); color: white;'
            : availability[tab.key]
              ? 'background: transparent; color: #94a3b8;'
              : 'background: transparent; color: #475569; cursor: not-allowed;'"
          @click="availability[tab.key] && setTab(tab.key)"
        >
          <q-icon :name="tab.icon" size="14px" class="q-mr-xs" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab content -->
      <div>
        <OverviewTab v-if="activeTab === 'overview'" :event="event" />
        <CheckinTab
          v-else-if="activeTab === 'checkin'"
          :players="event.players"
          @check-in="onCheckIn"
        />
        <DrawTab
          v-else-if="activeTab === 'game' && !event.drawResults"
          :players="event.players"
          :draw-results="event.drawResults"
          @start-draw="onStartDraw"
        />
        <GameTab
          v-else-if="activeTab === 'game' && event.drawResults"
          :draw-results="event.drawResults"
          @start-round="onStartRound"
          @close-round="onCloseRound"
          @close-table="onCloseTable"
          @generate-random="onGenerateRandom"
          @move-order="onMoveOrder"
          @update-result="onUpdateResult"
        />
        <ResultsTab
          v-else-if="activeTab === 'results'"
          :draw-results="event.drawResults"
          :view-mode="event.resultsViewMode || 'individual'"
          :round-filter="event.resultsRoundFilter ?? 0"
          @update:view-mode="onUpdateViewMode"
          @update:round-filter="onUpdateRoundFilter"
          @start-ceremony="startCeremony"
        />
        <FeedbacksTab v-else-if="activeTab === 'feedbacks'" :feedbacks="event.feedbacks" />
      </div>
    </div>
  </q-page>

  <q-page v-else class="pta-scope flex items-center justify-center" style="background: var(--pta-page); min-height: 100vh;">
    <div class="text-center">
      <q-icon name="event_busy" size="64px" style="color: #475569;" />
      <div class="pta-display text-white text-lg mt-3">Esemény nem található</div>
      <q-btn flat no-caps label="Vissza az eseményekhez" style="color: #f68b29;" @click="router.push('/profitability')" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useProfitabilityStore } from '../store/profitabilityStore';
import { useEventStore } from 'src/stores/event';
import { EventStage, EventType, TabKey } from '../types';
import '../theme.css';

import EventTimeline from '../components/EventTimeline.vue';
import OverviewTab from '../components/OverviewTab.vue';
import CheckinTab from '../components/CheckinTab.vue';
import DrawTab from '../components/DrawTab.vue';
import GameTab from '../components/GameTab.vue';
import ResultsTab from '../components/ResultsTab.vue';
import FeedbacksTab from '../components/FeedbacksTab.vue';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import { eventDatasheetKind } from 'src/utils/eventRoleNav';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const store = useProfitabilityStore();
const eventStore = useEventStore();

const eventId = computed(() => Number(route.params.id));
const event = computed(() => {
  const ptaEvent = store.getEventById(eventId.value);
  if (!ptaEvent) return undefined;
  
  const dbEvent = eventStore.events?.find((e: any) => Number(e.id) === eventId.value)
               || eventStore.myEvents?.find((e: any) => Number(e.id) === eventId.value)
               || eventStore.discoveryEvents?.find((e: any) => Number(e.id) === eventId.value);

  if (dbEvent) {
    let formattedDate = ptaEvent.date;
    if (dbEvent.StartAtUtc) {
      const dateObj = new Date(dbEvent.StartAtUtc);
      formattedDate = dateObj.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    const locationObj = eventStore.locations?.find((l: any) => l.id === dbEvent.EventLocationID) || {};
    const locName = locationObj.LocationName || locationObj.Name || dbEvent.LocationName || dbEvent.Location || ptaEvent.location;
    const city = locationObj.City || dbEvent.City || '';

    return {
      ...ptaEvent,
      id: eventId.value,
      name: dbEvent.Title || dbEvent.EventName || dbEvent.Name || ptaEvent.name,
      date: formattedDate,
      location: city ? `${locName} (${city})` : locName
    };
  }

  return ptaEvent;
});

const dbEvent = computed(() => {
  return eventStore.events?.find((e: any) => Number(e.id) === eventId.value)
    || eventStore.myEvents?.find((e: any) => Number(e.id) === eventId.value)
    || eventStore.discoveryEvents?.find((e: any) => Number(e.id) === eventId.value)
    || null;
});

const enterableRoles = computed(() => {
  const e = dbEvent.value;
  if (!e) return eventStore.getEnterableRolesForEvent(eventId.value);
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
    roles.find((r) => eventDatasheetKind(r) === 'player') ||
    roles.find((r) => !r.isOrganizer) ||
    roles[0] ||
    null
  );
});

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Áttekintés', icon: 'info' },
  { key: 'checkin', label: 'Bejelentkezés', icon: 'how_to_reg' },
  { key: 'game', label: 'Sorsolás & Játék', icon: 'casino' },
  { key: 'results', label: 'Eredmények', icon: 'emoji_events' },
  { key: 'feedbacks', label: 'Vélemények', icon: 'reviews' }
];

const availability = computed(() => store.tabAvailability(eventId.value));

const activeTab = computed<TabKey>(() => event.value?.activeTab || 'overview');

function setTab(tab: TabKey) {
  store.setActiveTab(eventId.value, tab);
}

const typeLabel = computed(() => {
  const map: Record<EventType, string> = {
    b2c: 'B2C',
    b2b: 'B2B',
    education: 'Oktatás',
    community: 'Közösség'
  };
  return event.value ? map[event.value.type] : '';
});

function onStageChange(newStage: EventStage) {
  if (!event.value) return;
  store.updateEventStage(event.value.id, newStage);
  $q.notify({
    message: `Az esemény életszakasza átállítva: ${newStage.toUpperCase()}`,
    color: 'positive',
    position: 'top',
    icon: 'check_circle'
  });
}

function onCheckIn(playerId: number) {
  store.checkInPlayer(eventId.value, playerId);
}

function onStartDraw() {
  const result = store.startDraw(eventId.value);
  if (!result.success) {
    $q.notify({ message: result.message, color: 'negative', position: 'top', icon: 'warning' });
  }
}

function onStartRound(roundNum: number) {
  store.startRound(eventId.value, roundNum);
}

function onCloseRound(roundNum: number) {
  const result = store.closeRound(eventId.value, roundNum);
  if (!result.success) {
    $q.notify({ message: result.message, color: 'negative', position: 'top', icon: 'warning' });
  } else {
    $q.notify({ message: `${roundNum}. forduló lezárva!`, color: 'positive', position: 'top', icon: 'check_circle' });
  }
}

function onCloseTable(roundNum: number, tableId: number) {
  const result = store.closeTable(eventId.value, roundNum, tableId);
  if (!result.success) {
    $q.notify({ message: result.message, color: 'negative', position: 'top', icon: 'warning' });
  }
}

function onGenerateRandom(roundNum: number) {
  store.generateRandomResultsForRound(eventId.value, roundNum);
}

function onMoveOrder(roundNum: number, tableId: number, index: number, direction: 'up' | 'down') {
  store.movePlayerOrder(eventId.value, roundNum, tableId, index, direction);
}

function onUpdateResult(roundNum: number, tableId: number, playerId: number, winnings: number | null, truckValue: number | null) {
  const result = store.updatePlayerResult(eventId.value, roundNum, tableId, playerId, winnings, truckValue);
  if (!result.success) {
    $q.notify({ message: result.message, color: 'negative', position: 'top', icon: 'warning' });
  }
}

function onUpdateViewMode(mode: 'individual' | 'team') {
  store.setResultsViewMode(eventId.value, mode);
}

function onUpdateRoundFilter(round: number) {
  store.setResultsRoundFilter(eventId.value, round);
}

function startCeremony() {
  store.startCeremony(eventId.value);
  $q.notify({
    message: 'A Ceremónia elindult!',
    color: 'amber-6',
    textColor: 'dark',
    position: 'top',
    icon: 'emoji_events'
  });
}
</script>
