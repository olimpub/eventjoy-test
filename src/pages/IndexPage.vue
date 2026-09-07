<template>
  <q-page class="bg-brand-dark text-white relative q-pa-md">
    <CatalogPullRefresh @refresh="onPullRefresh">
    <!-- Giant Background Watermark Logo (from Brand Kit) -->
    <div class="absolute -right-24 top-[15%] w-96 h-96 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="Watermark" draggable="false" class="w-full h-full object-contain" />
    </div>

    <!-- UPPER PANEL: Saját eseményeim (Horizontal Scroll Carousel) -->
    <div class="relative z-10 q-mb-lg" style="width: 100%; max-width: 100%;">
      <div class="flex items-center justify-between">
        <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
          <q-icon name="bookmark" color="#38bdf8" size="16px" />
          Saját eseményeim
        </h2>
        <div class="flex items-center gap-2">
          <q-btn
            flat
            round
            dense
            icon="sym_r_refresh"
            color="cyan-4"
            size="sm"
            :loading="catalogRefreshing"
            aria-label="Események frissítése"
            @click="reloadCatalog"
          />
          <span style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
            {{ myEventsSorted.length }} esemény
          </span>
        </div>
      </div>

      <!-- Horizontal Continuous Scroll List -->
      <div 
        ref="scrollContainer"
        class="overflow-x-auto no-scrollbar q-pb-md q-pt-xs cursor-grab" 
        style="display: flex; flex-wrap: nowrap; gap: 16px; width: 100%; max-width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; padding-bottom: 20px; user-select: none;"
        @mousedown="onMouseDown"
        @mouseleave="onMouseLeave"
        @mouseup="onMouseUp"
        @mousemove="onMouseMove"
      >
        <div 
          v-for="event in myEventsSorted" 
          :key="event.id"
          class="relative flex flex-col overflow-hidden transition-all duration-300 cursor-pointer"
          :style="{
            minWidth: '260px',
            maxWidth: '260px',
            borderRadius: '24px',
            flexShrink: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(10px)',
            border: event.status === 'active' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: event.status === 'active' ? '0 0 20px rgba(34, 197, 94, 0.15)' : '0 8px 20px rgba(0,0,0,0.2)',
            padding: '16px'
          }"
          @click="onCardClick(event)"
        >
          <!-- Top Row: Status and Type -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <!-- Status Badge -->
            <div v-if="event.statusName" :style="{
              backgroundColor: getStatusStyle(event).bg,
              borderColor: getStatusStyle(event).border,
              color: getStatusStyle(event).text,
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
              boxShadow: event.statusColor ? '0 0 10px ' + getStatusStyle(event).glow : 'none'
            }">
              {{ event.statusName }}
            </div>
            <div v-else></div>
            
            <!-- Type (PROFI-T-ABILITY esetén csak a szélesebb PTA2.png logó, felirat nélkül) -->
            <img v-if="event.isProfitability" src="~assets/PTA2.png" alt="PROFI-T-ABILITY" style="width: 90px; height: auto; object-fit: contain; margin-top: 2px;" />
            <div v-else style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 16px 8px 8px; padding: 4px 10px; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px);">
              <q-icon :name="event.logo" size="14px" style="color: #cbd5e1;" />
              <span style="font-size: 11px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">{{ event.type }}</span>
            </div>
          </div>



          <!-- Event Name and Roles -->
          <div style="margin-top: 12px; margin-bottom: 12px; display: flex; flex-direction: column;">

            <h3 style="font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.3; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; text-wrap: balance;">
              {{ event.name }}
            </h3>
            
            <!-- Roles Pills -->
            <div v-if="event.roles && event.roles.length > 0" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
              <span v-for="role in event.roles" :key="role.name" class="font-bold px-[10px] py-[4px] rounded-[12px] text-[10px] uppercase tracking-wider"
                :style="{ color: getRoleStyle(role.color).color, backgroundColor: getRoleStyle(role.color).bg, border: '1px solid ' + getRoleStyle(role.color).border }">
                {{ role.name }}
              </span>
            </div>
          </div>

          <!-- Bottom Row: Date & Location & RegStatus -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1; overflow: hidden; padding-right: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <q-icon name="calendar_today" size="15px" style="color: #6366f1; opacity: 0.9;" />
                <span style="font-size: 13px; color: #cbd5e1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ event.date }}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <q-icon name="place" size="15px" style="color: #6366f1; opacity: 0.9;" />
                <span style="font-size: 13px; color: #cbd5e1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ event.location }}</span>
              </div>
            </div>
            
            <!-- Meghívó `!` vagy saját EventUser-státusz (csak Közreműködő / Résztvevő) -->
            <button
              v-if="event.needUserApproval"
              type="button"
              class="invite-bang"
              aria-label="Meghívó megerősítése"
              @click.stop="openInviteDecision(event)"
            >
              !
              <q-tooltip class="bg-[#0B0F19] border border-white/10 text-white text-[11px] font-bold px-3 py-1" anchor="top middle" self="bottom middle" :offset="[0, 8]">
                Meghívó megerősítése
              </q-tooltip>
            </button>
            <div
              v-else-if="event.userStatusIcon"
              class="user-status-icon"
              :aria-label="event.statusName"
              :style="{
                borderColor: hexToRgba(event.statusColor || '#38bdf8', 0.45),
                backgroundColor: hexToRgba(event.statusColor || '#38bdf8', 0.14),
                boxShadow: '0 0 12px ' + hexToRgba(event.statusColor || '#38bdf8', 0.22),
              }"
            >
              <q-icon
                :name="event.userStatusIcon"
                :style="{ color: event.statusColor || '#38bdf8' }"
                size="20px"
              />
              <q-tooltip class="bg-[#0B0F19] border border-white/10 text-white text-[11px] font-bold px-3 py-1" anchor="top middle" self="bottom middle" :offset="[0, 8]">
                {{ event.statusName }}
              </q-tooltip>
            </div>
          </div>
        </div>

        <!-- Empty state for My Events -->
        <div 
          v-if="myEventsSorted.length === 0" 
          class="w-full bg-white/5 border border-white/10 border-dashed q-pa-md text-center flex flex-col items-center justify-center"
          style="height: 165px; min-width: 260px; border-radius: 24px;"
        >
          <q-icon name="emoji_events" size="28px" class="text-slate-600 q-mb-xs" />
          <p style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Még nem jelentkeztél eseményre</p>
        </div>
      </div>
    </div>

    <!-- LOWER PANEL: Esemény felfedező (Buborékos / Chips modell) -->
    <div class="flex-grow relative z-10 flex flex-col justify-start">
      
      <!-- Header Row with Tabs and Search Toggle -->
      <div class="flex items-center justify-between q-mb-md px-1 w-full gap-2">
        
        <!-- Segmented control: Ajánlott / Közelgő -->
        <div class="feed-seg" role="tablist" aria-label="Felfedezés szűrő">
          <span
            class="feed-seg__indicator"
            :class="activeTab === 'upcoming' ? 'is-right' : 'is-left'"
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            class="feed-seg__btn"
            :class="{ 'is-active': activeTab === 'recommended' }"
            :aria-selected="activeTab === 'recommended'"
            @click="activeTab = 'recommended'"
          >
            <q-icon name="sym_r_auto_awesome" size="18px" />
            <span>Ajánlott</span>
            <span v-if="recommendedEvents.length" class="feed-seg__count">{{ recommendedEvents.length }}</span>
          </button>
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
            <span v-if="upcomingEventsSorted.length" class="feed-seg__count">{{ upcomingEventsSorted.length }}</span>
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

      <!-- Unified Scrollable Feed -->
      <div class="q-pb-xl">
        
        <!-- Empty State for Empty Search/Filter -->
        <div v-if="(activeTab === 'recommended' && recommendedEvents.length === 0) || (activeTab === 'upcoming' && upcomingEventsSorted.length === 0)" class="q-pa-xl text-center text-slate-500 font-bold uppercase tracking-wider text-xs border border-sky-500/15 border-dashed rounded-xl mt-4">
           Nincs a keresésnek megfelelő esemény
        </div>

        <!-- RECOMMENDED FEED -->
        <div v-if="activeTab === 'recommended' && recommendedEvents.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
          <div 
            v-for="event in recommendedEvents" 
            :key="event.id"
            class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;"
          >
              <!-- Type Label positioned absolutely in top right (PROFI-T-ABILITY esetén csak a szélesebb PTA2.png logó, felirat nélkül) -->
              <img v-if="event.isProfitability" src="~assets/PTA2.png" alt="PROFI-T-ABILITY" style="position: absolute; top: 21px; right: 16px; z-index: 2; width: 90px; height: auto; object-fit: contain;" />
              <div v-else style="position: absolute; top: 16px; right: 16px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 16px 8px 8px; padding: 6px 14px; z-index: 2; display: flex; align-items: center; gap: 6px;">
                <q-icon :name="event.logo" size="16px" style="color: #cbd5e1;" />
                <span style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">{{ event.type }}</span>
              </div>

              <!-- Tags on the top left, with pr-28 to avoid overlapping type -->
              <div class="flex flex-wrap gap-3 mb-2 pr-28">
                <span 
                  v-for="tag in event.tags.slice(0, 3)" 
                  :key="tag"
                  class="font-bold rounded-full"
                  style="font-size: 13px; padding: 6px 14px; background-color: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid rgba(255,255,255,0.15);"
                >
                  #{{ tag }}
                </span>
              </div>

              <!-- Match Priority Stars -->
              <div v-if="event.matchPriority" class="flex items-center gap-[2px] mb-1">
                <q-icon 
                  v-for="n in (event.matchPriority === 1 ? 3 : (event.matchPriority === 2 ? 2 : 1))" 
                  :key="n" 
                  name="star" 
                  size="18px" 
                  color="amber"
                  style="filter: drop-shadow(0 0 8px rgba(251,191,36,0.4));"
                />
              </div>

              <!-- Event Name -->
              <h3 style="font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3; margin: 0 0 12px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; text-wrap: balance;">
                {{ event.name }}
              </h3>

              <!-- Info lines -->
              <div style="font-size: 14px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <q-icon name="calendar_today" size="18px" style="color: #6366f1; opacity: 0.9;" />
                <span>{{ event.date }}</span>
              </div>
              <div style="font-size: 14px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <q-icon name="place" size="18px" style="color: #6366f1; opacity: 0.9;" />
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ event.location }} ({{ event.city }})</span>
              </div>

            <!-- Bottom Area: Glassmorphism Glow (Alternative B) -->
            <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.15) 100%); margin-top: 4px;">
              <!-- Price -->
              <span style="font-size: 17px; font-weight: 800; color: #38bdf8;">
                <template v-if="event.price === null || event.price === 0">
                  Díjmentes
                </template>
                <template v-else-if="event.priceMax && event.priceMax > event.price">
                  {{ event.price.toLocaleString() }} Ft-tól
                </template>
                <template v-else>
                  {{ event.price.toLocaleString() }} Ft
                </template>
              </span>
              
              <!-- Action Ticket Wide Button -->
              <q-btn 
                unelevated
                icon="confirmation_number"
                label="Jegy"
                style="background: var(--ej-gradient); color: white; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4); border-radius: 10px; padding: 4px 20px; font-weight: 800; font-size: 13px; letter-spacing: 0.05em;"
                class="active:scale-95 transition-all outline-none"
                @click="openRegisterDialog(event)"
              />
            </div>
          </div>
        </div>

        <!-- UPCOMING FEED -->
        <div v-if="activeTab === 'upcoming' && upcomingEventsSorted.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
          <div 
            v-for="event in upcomingEventsSorted" 
            :key="event.id"
            class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;"
          >
              <!-- Type Label positioned absolutely in top right (PROFI-T-ABILITY esetén csak a szélesebb PTA2.png logó, felirat nélkül) -->
              <img v-if="event.isProfitability" src="~assets/PTA2.png" alt="PROFI-T-ABILITY" style="position: absolute; top: 21px; right: 16px; z-index: 2; width: 90px; height: auto; object-fit: contain;" />
              <div v-else style="position: absolute; top: 16px; right: 16px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 16px 8px 8px; padding: 6px 14px; z-index: 2; display: flex; align-items: center; gap: 6px;">
                <q-icon :name="event.logo" size="16px" style="color: #cbd5e1;" />
                <span style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">{{ event.type }}</span>
              </div>

              <!-- Tags on the top left, with pr-28 to avoid overlapping type -->
              <div class="flex flex-wrap gap-3 mb-2 pr-28">
                <span 
                  v-for="tag in event.tags.slice(0, 3)" 
                  :key="tag"
                  class="font-bold rounded-full"
                  style="font-size: 13px; padding: 6px 14px; background-color: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid rgba(255,255,255,0.15);"
                >
                  #{{ tag }}
                </span>
              </div>

              <!-- Match Priority Stars -->
              <div v-if="event.matchPriority" class="flex items-center gap-[2px] mb-1">
                <q-icon 
                  v-for="n in (event.matchPriority === 1 ? 3 : (event.matchPriority === 2 ? 2 : 1))" 
                  :key="n" 
                  name="star" 
                  size="18px" 
                  color="amber"
                  style="filter: drop-shadow(0 0 8px rgba(251,191,36,0.4));"
                />
              </div>

              <!-- Event Name -->
              <h3 style="font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3; margin: 0 0 12px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; text-wrap: balance;">
                {{ event.name }}
              </h3>

              <!-- Info lines -->
              <div style="font-size: 14px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <q-icon name="calendar_today" size="18px" style="color: #6366f1; opacity: 0.9;" />
                <span>{{ event.date }}</span>
              </div>
              <div style="font-size: 14px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <q-icon name="place" size="18px" style="color: #6366f1; opacity: 0.9;" />
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ event.location }} ({{ event.city }})</span>
              </div>

            <!-- Bottom Area: Glassmorphism Glow (Alternative B) -->
            <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.15) 100%); margin-top: 4px;">
              <!-- Price -->
              <span style="font-size: 17px; font-weight: 800; color: #38bdf8;">
                <template v-if="event.price === null || event.price === 0">
                  Díjmentes
                </template>
                <template v-else-if="event.priceMax && event.priceMax > event.price">
                  {{ event.price.toLocaleString() }} Ft-tól
                </template>
                <template v-else>
                  {{ event.price.toLocaleString() }} Ft
                </template>
              </span>
              
              <!-- Action Ticket Wide Button -->
              <q-btn 
                unelevated
                icon="confirmation_number"
                label="Jegy"
                style="background: var(--ej-gradient); color: white; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4); border-radius: 10px; padding: 4px 20px; font-weight: 800; font-size: 13px; letter-spacing: 0.05em;"
                class="active:scale-95 transition-all outline-none"
                @click="openRegisterDialog(event)"
              />
            </div>
          </div>
        </div>

      </div>
    </div>

    </CatalogPullRefresh>

    <!-- REGISTRATION SUCCESS POPUP DIALOG -->
    <q-dialog v-model="successDialogOpen" transition-show="scale" transition-hide="scale">
      <q-card class="bg-[#0B0F19] text-white border border-white/10 rounded-2xl q-pa-md max-w-sm text-center">
        <q-card-section>
          <q-icon name="check_circle" color="positive" size="56px" class="q-mb-md animate-pulse" />
          <h3 class="text-lg font-black uppercase tracking-wider q-mb-sm">Sikeres Jelentkezés!</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Sikeresen jelentkeztél az alábbi eseményre:<br>
            <strong class="text-white text-sm q-mt-xs block">{{ selectedEvent?.name }}</strong>
          </p>
        </q-card-section>

        <q-card-actions align="center" class="q-pt-md">
          <q-btn 
            label="Rendben" 
            no-caps 
            style="background: var(--ej-gradient); color: #FFFFFF;"
            class="font-black text-xs px-6 py-2 rounded-xl outline-none" 
            v-close-popup
            @click="completeRegistration" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <InviteDecisionSheet
      v-model="inviteSheetOpen"
      :event-id="inviteEvent?.id ?? null"
      :event-name="inviteEvent?.name || ''"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { useAuthStore } from 'src/stores/auth';
import { resolveIconName } from 'src/components/event-wizard/groupIcons';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';
import InviteDecisionSheet from 'src/components/event/InviteDecisionSheet.vue';
import CatalogPullRefresh from 'src/components/layout/CatalogPullRefresh.vue';
import { refreshEventCatalog } from 'src/utils/eventCatalogRefresh';
import { eventUserStatusIcon, findEventUserStatus } from 'src/utils/eventUserFlow';

const router = useRouter();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const authStore = useAuthStore();
const catalogRefreshing = ref(false);

onMounted(() => {
  void refreshEventCatalog().catch(() => undefined);
});

async function reloadCatalog() {
  catalogRefreshing.value = true;
  try {
    await refreshEventCatalog({ force: true });
  } finally {
    catalogRefreshing.value = false;
  }
}

function onPullRefresh(done: () => void) {
  void reloadCatalog().finally(() => done());
}

// Event interface structure based on UI needs
interface EventItem {
  id: string;
  name: string;
  date: string;
  dateISO: string;
  type: string;
  status: 'applied' | 'active' | 'checkin' | 'completed';
  location: string;
  city: string;
  tags: string[];
  isMyEvent: boolean;
  statusName?: string;
  statusColor?: string;
  needUserApproval?: boolean;
  userStatusIcon?: string;
  logo: string;
  price: number | null;
  priceMax?: number | null;
  category: string;
  roles?: { name: string; color: string }[];
  matchPriority?: number;
  isProfitability?: boolean;
}

const inviteSheetOpen = ref(false);
const inviteEvent = ref<EventItem | null>(null);

function openInviteDecision(event: EventItem) {
  inviteEvent.value = event;
  inviteSheetOpen.value = true;
}

// Mapper a DB raw JSON objektumokból a UI EventItem objektumba
const mapToUIEvent = (dbEvent: any, isMyEvent: boolean): EventItem => {
  // Master data lookup
  const eventType = masterDataStore.eventTypes?.find((t: any) => t.id === dbEvent.EventTypeID);
  
  // Eseményhez tartozó helyszín
  const location = eventStore.locations?.find((l: any) => l.id === dbEvent.EventLocationID) || {};
  
  // Címkék (Tags) kinyerése
  const eventLabelIds = eventStore.eventLabels?.filter((el: any) => String(el.EventID ?? el.eventID) === String(dbEvent.id)).map((el: any) => el.LabelID) || [];
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
    const rColor = masterRoleId !== undefined ? masterDataStore.getRoleColorById(masterRoleId) : '#38bdf8';
    if (rName && !addedRoleNames.has(rName)) {
      addedRoleNames.add(rName);
      rawRoles.push({ name: rName, color: rColor });
    }
  }
  const myRoles = rawRoles;

  // Saját státusz: résztvevő > közreműködő. `!` / ikon csak ezeknél — szervezőként nincs.
  let customStatusName: string | undefined = undefined;
  let customStatusColor: string | undefined = undefined;
  let needUserApproval = false;
  let userStatusIcon: string | undefined = undefined;

  if (isMyEvent) {
    const mine = eventStore.getMyEventUserStatus(dbEvent.id);
    if (mine) {
      customStatusName = mine.name;
      customStatusColor = mine.color;
      needUserApproval = mine.needUserApproval;
      if (!mine.needUserApproval) {
        const statusRow = findEventUserStatus(masterDataStore.eventUserStatuses, mine.statusId);
        userStatusIcon = eventUserStatusIcon(mine.name, statusRow);
      }
    }
  }

  // Dátum formázás
  const dateObj = new Date(dbEvent.StartAtUtc);
  const formattedDate = dateObj.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Match Priority for non-myEvents
  let priority = undefined;
  if (!isMyEvent) {
    const userEventTypeIds = authStore.eventTypePreferences?.map((p: any) => p.EventTypeID || p.eventTypeId || p.id) || [];
    const userLabelIds = authStore.labelPreferences?.map((p: any) => p.LabelID || p.labelId || p.id) || [];
    
    const typeMatch = userEventTypeIds.includes(dbEvent.EventTypeID || dbEvent.eventTypeId);
    const labelMatch = eventLabelIds.some((id: number) => userLabelIds.includes(id));
    
    if (typeMatch && labelMatch) priority = 1;
    else if (!typeMatch && labelMatch) priority = 2;
    else if (typeMatch && !labelMatch) priority = 3;
  }

  return {
    id: dbEvent.id.toString(),
    name: dbEvent.Title || dbEvent.EventName || 'Névtelen Esemény',
    date: formattedDate,
    dateISO: dbEvent.StartAtUtc,
    type: eventType?.TypeName || eventType?.Name || 'Esemény',
    status: isMyEvent ? 'applied' : 'active', // TODO: Map real status
    location: location.LocationName || location.Name || 'Online/Ismeretlen',
    city: location.City || 'Budapest',
    tags,
    isMyEvent: isMyEvent,
    statusName: customStatusName,
    statusColor: customStatusColor,
    needUserApproval,
    userStatusIcon: userStatusIcon || undefined,
    logo: resolveIconName(eventType?.IconName || eventType?.iconName),
    price: dbEvent.Capacity > 0 ? 5000 : null, // TODO: Jegy árak számítása EventTicket táblából
    category: 'general',
    roles: myRoles,
    matchPriority: priority,
    isProfitability: isProfitabilityEventType(dbEvent.EventTypeID),
    onlineUrl: dbEvent.OnlineURL || dbEvent.OnlineUrl || null,
    onlineFlg: dbEvent.OnlineFlg === 1 || dbEvent.OnlineFlg === true
  };
};

// 1. Saját eseményeim
const myEventsSorted = computed(() => {
  return eventStore.myEvents
    .map(e => mapToUIEvent(e, true))
    .sort((a, b) => {
      if (a.needUserApproval !== b.needUserApproval) return a.needUserApproval ? -1 : 1;
      return new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
    });
});



function applyFilters(list: EventItem[]): EventItem[] {
  let result = list;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(e => {
      return (
        e.name.toLowerCase().includes(query) ||
        e.type.toLowerCase().includes(query) ||
        e.city.toLowerCase().includes(query) ||
        e.location.toLowerCase().includes(query) ||
        e.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  }

  if (searchDate.value) {
    if (typeof searchDate.value === 'object' && searchDate.value.from && searchDate.value.to) {
      const fromTime = new Date(searchDate.value.from).getTime();
      const toTime = new Date(searchDate.value.to).getTime() + 86400000;
      result = result.filter(e => {
        const t = new Date(e.dateISO).getTime();
        return t >= fromTime && t <= toTime;
      });
    } else if (typeof searchDate.value === 'string') {
      const dayStart = new Date(searchDate.value).getTime();
      const dayEnd = dayStart + 86400000;
      result = result.filter(e => {
        const t = new Date(e.dateISO).getTime();
        return t >= dayStart && t <= dayEnd;
      });
    }
  }

  return result;
}

// 2. Tab: Ajánlott (Saját preferenciák alapján priorizálva)
const recommendedEvents = computed(() => {
  const myEventIds = eventStore.myEvents.map((e: any) => e.id);

  const matchedEvents = eventStore.discoveryEvents
    .filter((dbEvent: any) => !myEventIds.includes(dbEvent.id)) // Kiszűrjük a saját eseményeket
    .map((dbEvent: any) => mapToUIEvent(dbEvent, false))
    .filter((uiEvent: EventItem) => uiEvent.matchPriority !== undefined); // Csak azokat tartjuk meg, amiknél van egyezés

  // Rendezés prioritás, majd dátum szerint (növekvő)
  matchedEvents.sort((a: EventItem, b: EventItem) => {
    if (a.matchPriority !== b.matchPriority) {
      return (a.matchPriority || 99) - (b.matchPriority || 99);
    }
    return new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
  });

  return applyFilters(matchedEvents);
});

// 3. Tab: Közelgő
const upcomingEventsSorted = computed(() => {
  const list = eventStore.discoveryEvents
    .map(e => mapToUIEvent(e, false))
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  return applyFilters(list);
});

// State Management
const activeTab = ref<'recommended' | 'upcoming'>('recommended');
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
const successDialogOpen = ref(false);
const selectedEvent = ref<EventItem | null>(null);

// Drag to Scroll functionality for My Events
const scrollContainer = ref<HTMLElement | null>(null);
let isDown = false;
let startX = 0;
let scrollLeft = 0;
let dragMoved = false;
let dragStartX = 0;


function onMouseDown(e: MouseEvent) {
  isDown = true;
  dragMoved = false;
  dragStartX = e.pageX;
  if (!scrollContainer.value) return;
  scrollContainer.value.classList.add('cursor-grabbing');
  startX = e.pageX - scrollContainer.value.offsetLeft;
  scrollLeft = scrollContainer.value.scrollLeft;
}

function onMouseLeave() {
  isDown = false;
  if (scrollContainer.value) scrollContainer.value.classList.remove('cursor-grabbing');
}
function onMouseUp() {
  isDown = false;
  if (scrollContainer.value) scrollContainer.value.classList.remove('cursor-grabbing');
}
function onMouseMove(e: MouseEvent) {
  if (!isDown || !scrollContainer.value) return;
  e.preventDefault();
  if (Math.abs(e.pageX - dragStartX) > 5) {
    dragMoved = true;
  }
  const x = e.pageX - scrollContainer.value.offsetLeft;
  const walk = (x - startX) * 2;
  scrollContainer.value.scrollLeft = scrollLeft - walk;
}

// Kártyára kattintás kezelése (drag-védelemmel, hogy húzás közben ne navigáljon véletlenül)
function onCardClick(event: EventItem) {
  if (dragMoved) return;
  router.push(`/event/${event.id}`);
}

function hexToRgba(hex: string, alpha: number) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 255;
  const b = parseInt(hex.substring(4, 6), 16) || 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getStatusStyle(event: EventItem) {
  if (event.statusColor) {
    return {
      bg: hexToRgba(event.statusColor, 0.15),
      border: hexToRgba(event.statusColor, 0.4),
      text: event.statusColor.startsWith('#') ? event.statusColor : `#${event.statusColor}`,
      glow: hexToRgba(event.statusColor, 0.5)
    };
  }
  switch (event.status) {
    case 'active': return { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#4ade80', glow: 'rgba(34, 197, 94, 0.5)' };
    case 'applied': return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', glow: 'transparent' };
    case 'checkin': return { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', text: '#facc15', glow: 'transparent' };
    case 'completed': return { bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.4)', text: '#94a3b8', glow: 'transparent' };
  }
}

// Registration flow actions
function openRegisterDialog(event: EventItem) {
  selectedEvent.value = event;
  successDialogOpen.value = true;
}

function completeRegistration() {
  if (selectedEvent.value) {
     console.log('Regisztráció végrehajtása API-n keresztül...', selectedEvent.value.id);
     // Itt API hívás történne, ami után a SignalR frissíti az EventStore-t!
     successDialogOpen.value = false;
  }
}

// Role style helper for dynamic colors
function getRoleStyle(hexColor: string) {
  let color = hexColor && hexColor.startsWith('#') ? hexColor : '#94a3b8';
  if (color.length === 4) {
    color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return { 
    color: color, 
    bg: color + '1A', 
    border: color + '33' 
  };
}
</script>

<style scoped lang="scss">
/* Scrollbar removal styling for continuous horizontal carousel */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
@keyframes glowPulse {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
}
.glow-dot {
  animation: glowPulse 2s infinite;
}

.invite-bang {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  background: rgba(251, 191, 36, 0.18);
  color: #fbbf24;
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.25);
}

.invite-bang:active {
  transform: scale(0.94);
}

.user-status-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
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

/* Segmented feed tabs — Ajánlott / Közelgő */
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
