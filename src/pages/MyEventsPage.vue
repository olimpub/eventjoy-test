<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    
    <!-- Title -->
    <div class="relative z-10 q-mb-md mt-4">
      <div class="flex items-center justify-between">
        <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
          <q-icon name="emoji_events" color="#38bdf8" size="16px" />
          Eseményeim
        </h2>
      </div>
    </div>

    <!-- Tabs (Közelgő vs Lezárt) -->
    <div class="flex-grow relative z-10 flex flex-col justify-start">
      <!-- Header Row with Tabs and Search Toggle -->
      <div class="flex items-center justify-between q-mb-md px-1 w-full gap-2">
        <div class="flex flex-row overflow-x-auto no-scrollbar gap-2 flex-grow" style="scroll-snap-type: x mandatory;">
          <!-- Upcoming Chip -->
          <button 
            @click="activeTab = 'upcoming'"
            :style="activeTab === 'upcoming' 
              ? 'background: var(--ej-gradient); color: #ffffff; border: 1px solid transparent; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);' 
              : 'background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1);'"
            class="flex items-center gap-2 rounded-full py-3.5 px-8 text-[15px] sm:text-base font-black uppercase tracking-wider transition-all duration-300 outline-none cursor-pointer flex-shrink-0 hover:bg-white/10"
          >
            <q-icon name="schedule" size="22px" :style="activeTab === 'upcoming' ? 'color: white' : 'color: #38bdf8'" />
            Közelgő
          </button>

          <!-- Closed Chip -->
          <button 
            @click="activeTab = 'closed'"
            :style="activeTab === 'closed' 
              ? 'background: var(--ej-gradient); color: #ffffff; border: 1px solid transparent; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);' 
              : 'background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1);'"
            class="flex items-center gap-2 rounded-full py-3.5 px-8 text-[15px] sm:text-base font-black uppercase tracking-wider transition-all duration-300 outline-none cursor-pointer flex-shrink-0 hover:bg-white/10"
          >
            <q-icon name="history" size="22px" :style="activeTab === 'closed' ? 'color: white' : 'color: #38bdf8'" />
            Lezárt
          </button>
        </div>

        <!-- Search Toggle Button -->
        <q-btn 
          round 
          unelevated
          :icon="isSearchVisible ? 'close' : 'search'"
          class="flex-shrink-0 transition-all"
          :style="isSearchVisible 
            ? 'background: var(--ej-gradient); color: #ffffff; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4); height: 46px; width: 46px;'
            : 'background: rgba(255,255,255,0.05); color: #38bdf8; border: 1px solid rgba(255,255,255,0.1); height: 46px; width: 46px;'"
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
            <div v-else style="position: absolute; top: 16px; right: 16px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 16px 8px 8px; padding: 6px 14px; z-index: 2;">
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

            <!-- Bottom Area: Status instead of price + Arrow Button -->
            <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.15) 100%); margin-top: 6px;">
              
              <!-- Status Badge (from horizontal scroll component) -->
              <div :style="{
                backgroundColor: getStatusStyle(event.status).bg,
                borderColor: getStatusStyle(event.status).border,
                color: getStatusStyle(event.status).text,
                borderWidth: '1px',
                borderStyle: 'solid',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: event.status === 'active' ? '0 0 10px ' + getStatusStyle(event.status).glow : 'none'
              }">
                <div v-if="event.status === 'active'" style="width: 6px; height: 6px; border-radius: 50%; background-color: #4ade80;" class="glow-dot animate-pulse"></div>
                {{ getStatusLabel(event.status) }}
              </div>
              
              <!-- Nav Button -->
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

const router = useRouter();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

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
  roles?: { name: string; type: 'organizer' | 'contributor' | 'participant' }[];
  userStatusName?: string;
  userStatusColor?: string;
  isProfitability?: boolean;
}

// PROFI-T-ABILITY esemény típus azonosítója a master adatban (EventTypeID)
const PTA_EVENT_TYPE_ID = 46;


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

  const myEventUser = eventStore.eventUsers?.find((eu: any) => eu.EventID === dbEvent.id);
  const statusObj = masterDataStore.eventUserStatuses?.find((s: any) => s.id === myEventUser?.EventUserStatusID);

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
    roles: myRoles,
    userStatusName: statusObj ? statusObj.StatusName : 'Jelentkezem',
    userStatusColor: statusObj ? statusObj.ColorCode : '#38bdf8',
    isProfitability: dbEvent.EventTypeID === PTA_EVENT_TYPE_ID
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

// Utility to get status visual styling
function getStatusStyle(status: string) {
  switch(status) {
    case 'active':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', glow: 'rgba(34,197,94,0.4)' };
    case 'checkin':
      return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)', glow: 'transparent' };
    case 'applied':
      return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)', glow: 'transparent' };
    case 'completed':
    default:
      return { bg: 'rgba(255, 255, 255, 0.1)', text: '#94a3b8', border: 'rgba(255, 255, 255, 0.2)', glow: 'transparent' };
  }
}

// Utility to get human-readable status labels
function getStatusLabel(status: string) {
  switch(status) {
    case 'active': return 'Jelenleg fut';
    case 'checkin': return 'Becsekkolás';
    case 'applied': return 'Jelentkezve';
    case 'completed': return 'Lezárt';
    default: return status;
  }
}

function openEventDetails(event: EventItem) {
  console.log('Navigating to event details:', event.name);
  if (event.isProfitability) {
    router.push({ path: `/event/${event.id}`, query: { eventTypeId: String(PTA_EVENT_TYPE_ID) } });
  } else {
    router.push(`/event/${event.id}`);
  }
}

// Role type color mapping
function getRoleTypeStyle(type: string) {
  switch(type) {
    case 'organizer': 
      return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)' };
    case 'contributor': 
      return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.2)' };
    case 'participant':
    default:
      return { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.2)' };
  }
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
</style>
