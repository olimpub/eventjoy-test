<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    
    <!-- Title + Új gomb -->
    <div class="relative z-10 q-mb-md mt-4">
      <div class="flex items-center justify-between gap-3">
        <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
          <q-icon name="emoji_events" color="#38bdf8" size="16px" />
          Eseményeim
        </h2>

        <button
          type="button"
          class="new-event-btn"
          @click="wizardVisible = true"
        >
          <span class="new-event-btn__glow" aria-hidden="true" />
          <q-icon name="add" size="18px" />
          <span>Új</span>
        </button>
      </div>
    </div>

    <CreateEventWizard v-if="wizardVisible" v-model="wizardVisible" mode="create" />

    <!-- Tabs (Közelgő vs Lezárt) -->
    <div class="flex-grow relative z-10 flex flex-col justify-start">
      <!-- Header Row with Tabs and Search Toggle -->
      <div class="flex items-center justify-between q-mb-md px-1 w-full gap-2">
        <!-- Segmented control: Közelgő / Lezárt -->
        <div class="feed-seg" role="tablist" aria-label="Eseményeim szűrő">
          <span
            class="feed-seg__indicator"
            :class="activeTab === 'closed' ? 'is-right' : 'is-left'"
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            class="feed-seg__btn"
            :class="{ 'is-active': activeTab === 'upcoming' }"
            :aria-selected="activeTab === 'upcoming'"
            @click="activeTab = 'upcoming'"
          >
            <q-icon name="sym_r_schedule" size="18px" />
            <span>Közelgő</span>
            <span v-if="upcomingEvents.length" class="feed-seg__count">{{ upcomingEvents.length }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="feed-seg__btn"
            :class="{ 'is-active': activeTab === 'closed' }"
            :aria-selected="activeTab === 'closed'"
            @click="activeTab = 'closed'"
          >
            <q-icon name="sym_r_history" size="18px" />
            <span>Lezárt</span>
            <span v-if="closedEvents.length" class="feed-seg__count">{{ closedEvents.length }}</span>
          </button>
        </div>

        <!-- Search Toggle Button -->
        <q-btn 
          round 
          unelevated
          :icon="isSearchVisible ? 'close' : 'search'"
          class="flex-shrink-0 transition-all"
          :style="isSearchVisible 
            ? 'background: var(--ej-gradient); color: #ffffff; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4); height: 40px; width: 40px;'
            : 'background: rgba(255,255,255,0.05); color: #38bdf8; border: 1px solid rgba(255,255,255,0.1); height: 40px; width: 40px;'"
          @click="isSearchVisible = !isSearchVisible"
        />
      </div>

      <!-- Search Input -->
      <q-slide-transition>
        <div v-show="isSearchVisible" style="display: flex; flex-direction: column; gap: 8px;">
         <div class="flex gap-2 w-full q-mb-xs">
           <!-- Text Search -->
           <q-input 
             v-model="searchQuery" 
             placeholder="Név, típus, város, címke..."
             dark 
             outlined 
             dense 
             color="brand-primary" 
             class="custom-input bg-[#0B0F19]/50 rounded-xl flex-grow"
           >
             <template v-slot:prepend>
               <q-icon name="search" color="slate-400" size="18px" />
             </template>
             <template v-slot:append v-if="searchQuery">
               <q-icon name="close" class="cursor-pointer" @click="searchQuery = ''" color="slate-400" size="18px" />
             </template>
           </q-input>

           <!-- Calendar Button -->
           <q-btn 
             round 
             unelevated
             color="brand-primary"
             text-color="white"
             icon="calendar_month"
             class="flex-shrink-0"
             style="height: 40px; width: 40px; border-radius: 12px; background: var(--ej-gradient); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);"
           >
             <q-popup-proxy cover transition-show="scale" transition-hide="scale">
               <q-date v-model="searchDate" range dark color="brand-primary" mask="YYYY-MM-DD">
                 <div class="row items-center justify-end">
                   <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                 </div>
               </q-date>
             </q-popup-proxy>
           </q-btn>
         </div>

         <!-- Selected Date Chip -->
         <div v-if="searchDate" class="flex items-center gap-2 q-mb-md">
           <div class="bg-brand-primary/20 border border-brand-primary/30 rounded-full px-3 py-1 flex items-center gap-2">
             <q-icon name="event" size="14px" color="brand-primary" />
             <span class="text-brand-primary text-xs font-bold tracking-wide">{{ searchDateDisplay }}</span>
             <q-icon name="cancel" size="16px" color="slate-400" class="cursor-pointer hover:text-white transition-colors" @click="searchDate = null" />
           </div>
         </div>
        </div>
      </q-slide-transition>

      <!-- Scrollable Feed -->
      <div class="flex-grow overflow-y-auto no-scrollbar q-pb-xl" style="max-height: calc(100vh - 250px);">
        <div v-if="filteredEvents.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
          <div 
            v-for="event in filteredEvents" 
            :key="event.id"
            class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card cursor-pointer" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;"
            @click="openEventDetails(event)"
          >
            <!-- Type Label positioned absolutely in top right (PROFI-T-ABILITY esetén csak a szélesebb PTA2.png logó, felirat nélkül) -->
            <img v-if="event.isProfitability" src="~assets/PTA2.png" alt="PROFI-T-ABILITY" style="position: absolute; top: 21px; right: 16px; z-index: 2; width: 90px; height: auto; object-fit: contain;" />
            <div v-else style="position: absolute; top: 16px; right: 16px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 16px 8px 8px; padding: 6px 14px; z-index: 2; display: flex; align-items: center; gap: 6px;">
              <q-icon :name="event.logo" size="16px" style="color: #cbd5e1;" />
              <span style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">{{ event.type }}</span>
            </div>


            <!-- Status (Moved to top-left) -->
            <div v-if="event.userStatusName" class="flex flex-wrap gap-2 mb-2 pr-28 relative z-10">
              <span class="font-bold px-[12px] py-[5px] rounded-[12px] text-[11px] uppercase tracking-wider flex items-center gap-1.5"
                :style="{ color: event.userStatusColor, backgroundColor: event.userStatusColor + '1A', border: '1px solid ' + event.userStatusColor + '33' }">
                <q-icon 
                  :name="event.userStatusName === 'Részt veszek' ? 'check_circle' : 'info'" 
                  size="12px" 
                />
                {{ event.userStatusName }}
              </span>
            </div>

            <!-- Event Name -->
            <h3 style="font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3; margin: 4px 0 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; text-wrap: balance;">
              {{ event.name }}
            </h3>

            <!-- Tags (Moved below name) -->
            <div v-if="event.tags && event.tags.length > 0" class="flex flex-wrap gap-2 mb-4">
              <span 
                v-for="tag in event.tags" 
                :key="tag"
                class="font-bold rounded-full"
                style="font-size: 11px; padding: 4px 10px; background-color: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);"
              >
                #{{ tag }}
              </span>
            </div>

            <!-- Info lines -->
            <div style="font-size: 14px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <q-icon name="calendar_today" size="18px" style="color: #6366f1; opacity: 0.9;" />
              <span>{{ event.date }}</span>
            </div>
            <div style="font-size: 14px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 2px;">
              <q-icon name="place" size="18px" style="color: #6366f1; opacity: 0.9;" />
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ event.location }} ({{ event.city }})</span>
            </div>

            <!-- Bottom Area: arrow -->
            <div class="mt-auto flex items-center justify-end rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.15) 100%); margin-top: 6px;">
              <q-btn 
                round
                unelevated
                icon="arrow_forward"
                style="background: var(--ej-gradient); color: white; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);"
                class="active:scale-95 transition-all outline-none"
                @click="openEventDetails(event)"
              />
            </div>
          </div>
        </div>
        
        <div v-else class="q-pa-xl text-center text-slate-500 font-bold uppercase tracking-wider text-xs border border-white/5 border-dashed rounded-xl mt-4">
          Nincs a keresésnek megfelelő esemény
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import CreateEventWizard from 'src/components/event-wizard/CreateEventWizard.vue';
import { resolveIconName } from 'src/components/event-wizard/groupIcons';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';

const router = useRouter();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const wizardVisible = ref(false);

// Event interface structure
interface EventItem {
  id: string;
  name: string;
  date: string;
  dateISO: string; // For sorting
  type: string;
  status: 'applied' | 'active' | 'checkin' | 'completed';
  location: string;
  city: string;
  tags: string[];
  isMyEvent: boolean;
  logo?: string;
  roles?: { name: string; type: 'organizer' | 'contributor' | 'participant' }[];
  userStatusName?: string;
  userStatusColor?: string;
  isProfitability?: boolean;
}

const activeTab = ref<'upcoming' | 'closed'>('upcoming');
const isSearchVisible = ref(false);
const searchQuery = ref('');
const searchDate = ref<any>(null);
const searchDateDisplay = computed(() => {
  if (!searchDate.value) return '';
  if (typeof searchDate.value === 'object' && searchDate.value.from && searchDate.value.to) {
    return `${searchDate.value.from} - ${searchDate.value.to}`;
  }
  return String(searchDate.value);
});

// Mapper a DB raw JSON objektumokból a UI EventItem objektumba
const mapToUIEvent = (dbEvent: any): EventItem => {
  const eventType = masterDataStore.eventTypes?.find((t: any) => t.id === dbEvent.EventTypeID);
  const location = eventStore.locations?.find((l: any) => l.id === dbEvent.EventLocationID) || {};
  
  const eventLabelIds = eventStore.eventLabels?.filter((el: any) => el.EventID === dbEvent.id).map((el: any) => el.LabelID) || [];
  const tags = masterDataStore.labels?.filter((l: any) => eventLabelIds.includes(l.id)).map((l: any) => l.LabelName || l.Name) || [];
  
  // Szerepkörök 2-lépcsős feloldással: EventUser.EventRoleID -> EventRoles.id -> EventRoles.RoleID -> MasterData.Roles.id
  const rawRoles: any[] = [];
  const addedRoleNames = new Set<string>();
  
  const eventUserRows = eventStore.eventUsers?.filter((eu: any) => 
    Number(eu.EventID || eu.EventId || eu.event_id) === Number(dbEvent.id) || 
    String(eu.EventID || eu.EventId || eu.event_id) === String(dbEvent.id)
  ) || [];

  for (const eu of eventUserRows) {
    let rName = eu.RoleName || eu.EventRoleName || eu.RoleTitle || eu.roleName || (typeof eu.Role === 'string' ? eu.Role : undefined);
    
    // 1. lépés: Megkeressük a kapcsolódó EventRole rekordot az eventStore.roles tömbben
    const eventRole = eventStore.roles?.find((er: any) => 
      Number(er.id) === Number(eu.EventRoleID || eu.EventRoleId) ||
      Number(er.ID) === Number(eu.EventRoleID || eu.EventRoleId)
    );
    
    // 2. lépés: A valódi MasterData RoleID meghatározása
    const masterRoleId = eventRole 
      ? (eventRole.RoleID || eventRole.RoleId) 
      : (eu.RoleID || eu.RoleId || eu.EventRoleID || eu.EventRoleId);

    if (!rName && masterRoleId !== undefined) {
      rName = masterDataStore.getRoleNameById(masterRoleId);
    }
    if (rName && !addedRoleNames.has(rName)) {
      addedRoleNames.add(rName);
      rawRoles.push({ name: rName, type: 'participant' as any });
    }
  }
  const myRoles = rawRoles;

  const myStatus = eventStore.getMyEventUserStatus(dbEvent.id);

  const dateObj = new Date(dbEvent.StartAtUtc);
  const formattedDate = dateObj.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return {
    id: dbEvent.id.toString(),
    name: dbEvent.Title || dbEvent.EventName || 'Névtelen Esemény',
    date: formattedDate,
    dateISO: dbEvent.StartAtUtc,
    type: eventType?.TypeName || eventType?.Name || 'Esemény',
    status: 'applied', // TODO: Map real status
    location: location.LocationName || location.Name || 'Online/Ismeretlen',
    city: location.City || 'Budapest',
    tags: tags.length > 0 ? tags : ['rendezvény'],
    isMyEvent: true,
    logo: resolveIconName(eventType?.IconName || eventType?.iconName),
    roles: myRoles,
    userStatusName: myStatus?.name,
    userStatusColor: myStatus?.color,
    isProfitability: isProfitabilityEventType(dbEvent.EventTypeID),
    onlineUrl: dbEvent.OnlineURL || dbEvent.OnlineUrl || null,
    onlineFlg: dbEvent.OnlineFlg === 1 || dbEvent.OnlineFlg === true
  };
};


// 1. Upcoming events (not completed), closest date first
const upcomingEvents = computed(() => {
  return eventStore.activeMyEvents
    .map((e: any) => mapToUIEvent(e))
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
});

// 2. Closed events (completed), newest (closest to now backwards) first
const closedEvents = computed(() => {
  return eventStore.pastMyEvents
    .map((e: any) => mapToUIEvent(e))
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
});

// Combine with search
const filteredEvents = computed(() => {
  let baseList = activeTab.value === 'upcoming' ? upcomingEvents.value : closedEvents.value;
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim();
    baseList = baseList.filter(e => 
      e.name.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      e.type.toLowerCase().includes(q) ||
      (e.roles && e.roles.some((r: any) => r.name.toLowerCase().includes(q)))
    );
  }

  if (searchDate.value) {
    if (typeof searchDate.value === 'object' && searchDate.value.from && searchDate.value.to) {
      const fromTime = new Date(searchDate.value.from).getTime();
      const toTime = new Date(searchDate.value.to).getTime() + 86400000;
      baseList = baseList.filter(e => {
        const t = new Date(e.dateISO).getTime();
        return t >= fromTime && t <= toTime;
      });
    } else if (typeof searchDate.value === 'string') {
      const dayStart = new Date(searchDate.value).getTime();
      const dayEnd = dayStart + 86400000;
      baseList = baseList.filter(e => {
        const t = new Date(e.dateISO).getTime();
        return t >= dayStart && t <= dayEnd;
      });
    }
  }

  return baseList;
});

function openEventDetails(event: EventItem) {
  router.push(`/event/${event.id}`);
}
</script>

<style scoped lang="scss">
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Keresőmező formázása */
.custom-input {
  :deep(.q-field__control) {
    border-radius: 12px !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    transition: all 0.3s ease;
    
    &:before, &:after {
      display: none !important;
    }
  }
  
  :deep(.q-field__control:hover) {
    border-color: rgba(56, 189, 248, 0.4) !important;
    background-color: rgba(255, 255, 255, 0.08) !important;
  }
  
  :deep(.q-field--focused .q-field__control) {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.2) !important;
  }
}

.new-event-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px 8px 12px;
  border: none;
  border-radius: 9999px;
  background: var(--ej-gradient);
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  outline: none;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;

  &:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 22px rgba(14, 165, 233, 0.55);
  }

  &:active {
    transform: scale(0.96);
  }

  &__glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.22) 50%, transparent 70%);
    transform: translateX(-120%);
    animation: new-event-shine 3.5s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes new-event-shine {
  0%, 55% { transform: translateX(-120%); }
  75%, 100% { transform: translateX(120%); }
}

/* Segmented tabs — Közelgő / Lezárt (same as IndexPage feed-seg) */
.feed-seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  min-width: 0;
  max-width: 360px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.feed-seg__indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.95) 0%, rgba(20, 184, 166, 0.95) 100%);
  box-shadow:
    0 2px 10px rgba(14, 165, 233, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;

  &.is-right {
    transform: translateX(100%);
  }

  &.is-left {
    transform: translateX(0);
  }
}

.feed-seg__btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  outline: none;
  transition: color 0.2s ease;

  &:hover:not(.is-active) {
    color: #e2e8f0;
  }

  &.is-active {
    color: #ffffff;
  }
}

.feed-seg__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  line-height: 1;

  .feed-seg__btn.is-active & {
    background: rgba(255, 255, 255, 0.22);
  }
}
</style>
