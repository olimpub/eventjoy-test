<template>
  <q-page class="bg-[#0F172A] text-white relative min-h-full pb-20 overflow-x-hidden">
    <!-- Giant Background Watermark Logo -->
    <div class="absolute -right-24 top-[15%] w-96 h-96 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="Watermark" class="w-full h-full object-contain" />
    </div>

    <!-- 1. HEADER IMAGE -->
    <div class="relative w-full h-[280px] sm:h-[350px] overflow-hidden">
      <!-- Back Button -->
      <q-btn 
        icon="arrow_back" 
        round
        unelevated
        dense
        class="absolute top-4 left-4 z-20 text-white event-cover-btn"
        aria-label="Vissza"
        @click="router.go(-1)"
      />

      <!-- Image -->
      <div
        class="w-full h-full"
        :class="event.isDefaultCover ? 'event-cover-default' : ''"
      >
        <img
          :src="event.coverImage"
          alt=""
          class="w-full h-full"
          :class="event.isDefaultCover
            ? 'object-contain p-16 sm:p-24 scale-100'
            : 'object-cover object-center scale-105'"
        />
      </div>

      <!-- Premium Gradient overlay to blend with the background -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent pointer-events-none"></div>
    </div>

    <!-- MAIN CONTENT CONTAINER -->
    <div class="relative z-10 px-4 sm:px-6 -mt-24 sm:-mt-32 max-w-2xl mx-auto w-full">
      
      <!-- 2. FEJLÉC PANEL (Glassmorphism, megegyezik a főoldallal) -->
      <div 
        class="flex flex-col relative overflow-hidden shadow-2xl transition-all duration-300" 
        style="border-radius: 24px; background-color: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); padding: 24px 20px 16px 20px; margin-bottom: 24px;"
      >
        
        <!-- Type Label positioned absolutely in top right -->
        <!-- Type Label or PTA.png positioned absolutely in top right -->
        <div v-if="event.isProfitability || isDemoProfitabilityRoute" style="position: absolute; top: 16px; right: 16px; z-index: 2; display: flex; align-items: center;">
          <img src="~assets/PTA.png" alt="PROFI-T-ABILITY" style="height: 36px; width: auto; object-fit: contain;" />
        </div>
        <div v-else style="position: absolute; top: 16px; right: 16px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px 16px 8px 8px; padding: 6px 14px; z-index: 2; display: flex; align-items: center; gap: 6px;">
          <q-icon name="sym_r_work" size="16px" style="color: #cbd5e1;" />
          <span style="font-size: 12px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em;">{{ event.type }}</span>
        </div>

        <!-- Roles (Megegyezik a kártyák szerepkör címke stílusával) -->
        <div v-if="event.roles && event.roles.length > 0" class="flex flex-wrap gap-2 mb-3 pr-28 relative z-10">
          <span
            v-for="role in event.roles"
            :key="role.name || role"
            class="font-bold px-[10px] py-[4px] rounded-[12px] text-[11px] uppercase tracking-wider"
            :style="{
              color: getRoleStyle(role.color).color,
              backgroundColor: getRoleStyle(role.color).bg,
              border: '1px solid ' + getRoleStyle(role.color).border,
              letterSpacing: '0.05em'
            }"
          >
            {{ role.name || role }}
          </span>
        </div>

        <!-- Event Name -->
        <h3 style="font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.2; margin: 0 0 12px 0; text-wrap: balance; padding-right: 10px;">
          {{ event.name }}
        </h3>

        <!-- Tags -->
        <div v-if="event.tags && event.tags.length > 0" class="flex flex-wrap gap-2 mb-6">
          <span 
            v-for="tag in event.tags" 
            :key="tag"
            class="font-bold rounded-full"
            style="font-size: 12px; padding: 4px 14px; background-color: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.08);"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Info lines -->
        <div style="font-size: 15px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <q-icon name="calendar_today" size="20px" :style="{ color: accentColor, opacity: 0.9 }" />
          <span class="font-medium">{{ event.date }}</span>
        </div>
        <div style="font-size: 15px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <q-icon name="place" size="20px" :style="{ color: accentColor, opacity: 0.9 }" />
          <span class="font-medium">{{ event.location }} ({{ event.city }})</span>
        </div>

        <!-- Bottom Area: Status and Organizer -->
        <div class="event-meta-row">
          <div
            class="event-status-chip"
            :style="{
              backgroundColor: getStatusStyle(event.status).bg,
              borderColor: getStatusStyle(event.status).border,
              color: getStatusStyle(event.status).text,
              boxShadow: event.status === 'active' ? '0 0 15px ' + getStatusStyle(event.status).glow : 'none'
            }"
          >
            <div v-if="event.status === 'active'" class="event-status-chip__dot"></div>
            {{ event.statusName }}
          </div>

          <button
            v-if="event.organizer.allowChat"
            type="button"
            class="event-org-chip"
            @click="initiateChat"
          >
            <span class="event-org-chip__text">
              <span class="event-org-chip__label">Szervező</span>
              <span class="event-org-chip__name">{{ event.organizer.name }}</span>
            </span>
            <q-icon name="sym_r_chat" size="16px" class="event-org-chip__icon" />
          </button>
          <div v-else class="event-org-chip event-org-chip--static">
            <span class="event-org-chip__text">
              <span class="event-org-chip__label">Szervező</span>
              <span class="event-org-chip__name">{{ event.organizer.name }}</span>
            </span>
          </div>
        </div>

        <!-- ACTION BUTTONS STACK -->
        <div class="flex flex-col gap-3">
          
          <!-- STATE A: COMPLETED (Lezárt) & HAS PARTICIPATED -->
          <template v-if="event.status === 'completed' && hasParticipated">
            <!-- HÍRFOLYAM -->
            <q-btn 
              unelevated
              class="w-full rounded-[16px] py-3.5 outline-none"
              style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"
              @click="comingSoon('Hírfolyam', 'sym_r_newspaper')"
            >
              <div class="flex items-center justify-center gap-3 w-full">
                <q-icon name="sym_r_newspaper" color="white" size="20px" />
                <span class="text-white font-bold text-[14px] tracking-wide uppercase">Esemény Hírei</span>
              </div>
            </q-btn>
            
            <!-- INFORMÁCIÓK -->
            <q-btn 
              unelevated 
              class="w-full rounded-[16px] py-3.5" 
              style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);"
              @click="modals.info = true"
            >
               <div class="flex items-center justify-center gap-3 w-full">
                  <q-icon name="sym_r_info" size="20px" />
                  <span class="font-bold text-[14px] tracking-wide uppercase">Információk</span>
               </div>
            </q-btn>
          </template>

          <!-- STATE B/C: UPCOMING OR ACTIVE -->
          <template v-else>
            
            <!-- JEGY (Csak akkor jelenik meg, ha van érvényes, nem null EventTicketID) -->
            <q-btn v-if="event.userHasTicket" unelevated class="w-full rounded-[16px] py-3.5" :style="{ background: accentGradient, color: 'white', boxShadow: '0 4px 15px ' + accentBg(0.4) }" @click="modals.ticket = true">
               <div class="flex items-center justify-center gap-3 w-full">
                  <q-icon name="qr_code_2" size="20px" />
                  <span class="font-black text-[14px] tracking-wide uppercase">Jegyem bemutatása</span>
               </div>
            </q-btn>
              
            <!-- JEGYVÁSÁRLÁS (Ha nincs jegye és vásárolható) -->
            <q-btn 
              v-else-if="event.isTicketPurchasable"
              unelevated
              class="w-full rounded-[16px] py-3.5 relative overflow-hidden group"
              :style="{ boxShadow: '0 10px 30px ' + accentBg(0.3) }"
            >
              <div class="absolute inset-0 opacity-90 group-hover:opacity-100 transition duration-300" :style="{ background: accentDiagonalGradient }"></div>
              <div class="relative z-10 flex items-center justify-center gap-3">
                <q-icon name="shopping_cart" size="20px" color="white" />
                <span class="text-white font-black text-[14px] tracking-[0.1em] uppercase">Jegyvásárlás</span>
              </div>
            </q-btn>

            <!-- HÍRFOLYAM -->
            <q-btn 
              unelevated
              class="w-full rounded-[16px] py-3.5 outline-none"
              style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"
              @click="comingSoon('Hírfolyam', 'sym_r_newspaper')"
            >
              <div class="flex items-center justify-center gap-3 w-full">
                <q-icon name="sym_r_newspaper" color="white" size="20px" />
                <span class="text-white font-bold text-[14px] tracking-wide uppercase">Esemény Hírei</span>
              </div>
            </q-btn>
            
            <!-- INFORMÁCIÓK -->
            <q-btn 
              unelevated 
              class="w-full rounded-[16px] py-3.5" 
              style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);"
              @click="modals.info = true"
            >
               <div class="flex items-center justify-center gap-3 w-full">
                  <q-icon name="sym_r_info" size="20px" />
                  <span class="font-bold text-[14px] tracking-wide uppercase">Információk</span>
               </div>
            </q-btn>
            
          </template>
        </div>
      </div>

      <!-- 4. PROGRAM PANEL -->
      <div class="mb-8">
        <div class="flex items-center gap-2 px-2" style="margin-bottom: 12px;">
          <q-icon name="sym_r_view_timeline" :style="{ color: accentColor }" size="20px" />
          <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Esemény Programja</h2>
        </div>
        <div v-if="!hasPrograms" class="event-program-empty">
          Nincs Program
        </div>
        <div v-else-if="programView.kind === 'flat'" class="event-program">
          <div
            v-for="item in programView.items"
            :key="item.id"
            class="event-program__row"
          >
            <span class="event-program__time" :style="{ color: accentColor }">{{ item.time }}</span>
            <span class="event-program__name">{{ item.name }}</span>
          </div>
        </div>
        <div v-else class="event-program">
          <div v-for="day in programView.days" :key="day.dateKey" class="event-program__day">
            <div class="event-program__day-label">{{ day.label }}</div>
            <div
              v-for="item in day.items"
              :key="item.id"
              class="event-program__row"
            >
              <span class="event-program__time" :style="{ color: accentColor }">{{ item.time }}</span>
              <span class="event-program__name">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ============================================== -->
    <!-- MODALS -->
    <!-- ============================================== -->



    <!-- Info Modal — Adataim / bottom-sheet design -->
    <q-dialog v-model="modals.info" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="event-info-sheet" :style="{ borderTopColor: accentBg(0.4) }">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>

        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="event-info-sheet__title" :style="{ color: accentColor }">
            Információk
          </div>
          <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white transition-colors bg-slate-800/50" size="sm" />
        </q-card-section>

        <q-card-section class="q-pt-md q-px-md pb-8">
          <div class="event-info-sheet__scroll">
            <div class="event-info-card">
              <div class="event-info-card__bar" :style="{ background: accentColor }"></div>
              <div class="event-info-card__label" :style="{ color: accentColor }">
                <q-icon name="sym_r_notes" size="18px" /> Leírás
              </div>
              <p class="event-info-card__text">{{ event.description }}</p>
            </div>

            <div class="event-info-card">
              <div class="event-info-card__bar" :style="{ background: accentColor }"></div>
              <div class="event-info-card__label" :style="{ color: accentColor }">
                <q-icon name="calendar_today" size="18px" /> Időpont
              </div>
              <p class="event-info-card__value">{{ event.date }}</p>
            </div>

            <div class="event-info-card">
              <div class="event-info-card__bar" :style="{ background: accentColor }"></div>
              <div class="event-info-card__label" :style="{ color: accentColor }">
                <q-icon name="place" size="18px" /> Helyszín
              </div>
              <p class="event-info-card__value">{{ event.location }}<span v-if="event.city"> ({{ event.city }})</span></p>
              <a
                v-if="event.onlineFlg && event.onlineUrl"
                :href="event.onlineUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="event-info-card__link"
                :style="{ color: accentColor }"
              >
                <q-icon name="link" size="16px" />
                Online csatlakozás
              </a>
            </div>

            <div class="event-info-card">
              <div class="event-info-card__bar" :style="{ background: accentColor }"></div>
              <div class="event-info-card__label" :style="{ color: accentColor }">
                <q-icon name="sym_r_person" size="18px" /> Szervező
              </div>
              <p class="event-info-card__value">{{ event.organizer.name }}</p>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- TICKET MODAL -->
    <q-dialog v-model="modals.ticket" transition-show="scale" transition-hide="scale">
      <q-card class="event-ticket">
        <q-btn
          icon="close"
          round
          unelevated
          v-close-popup
          class="event-ticket__close"
          aria-label="Bezárás"
        />

        <div class="event-ticket__band" :style="{ background: accentGradient }">
          <span class="event-ticket__kicker">Belépőjegy</span>
          <span class="event-ticket__brand">{{ event.isProfitability || isDemoProfitabilityRoute ? 'PROFI-T-ABILITY' : 'EVENTJOY' }}</span>
        </div>

        <div class="event-ticket__perforation" aria-hidden="true">
          <span class="event-ticket__notch event-ticket__notch--left" />
          <span class="event-ticket__dash" />
          <span class="event-ticket__notch event-ticket__notch--right" />
        </div>

        <q-card-section class="event-ticket__body">
          <h2 class="event-ticket__title">{{ event.name }}</h2>
          <p class="event-ticket__meta">
            <q-icon name="calendar_today" size="16px" :style="{ color: accentColor }" />
            {{ event.date }}
          </p>
          <p class="event-ticket__meta">
            <q-icon name="place" size="16px" :style="{ color: accentColor }" />
            {{ event.location }}
          </p>
          <div v-if="event.roles && event.roles.length" class="event-ticket__roles">
            <span
              v-for="role in event.roles"
              :key="role.name || role"
              class="event-ticket__role"
              :style="{
                color: getRoleStyle(role.color).color,
                backgroundColor: getRoleStyle(role.color).bg,
                border: '1px solid ' + getRoleStyle(role.color).border
              }"
            >
              {{ role.name || role }}
            </span>
          </div>

          <div class="event-ticket__qr">
            <img
              v-if="ticketQrUrl"
              :src="ticketQrUrl"
              alt="Jegy QR-kód"
              width="200"
              height="200"
            />
            <q-icon v-else name="qr_code_2" size="120px" class="text-slate-400" />
          </div>

          <div class="event-ticket__code">
            {{ ticketUid ? ticketUid.slice(0, 8).toUpperCase() : 'QR nem elérhető' }}
          </div>
          <p class="event-ticket__hint">Mutasd a beléptetésnél</p>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Belépés: szerepkör választó, ha több EventRole -->
    <q-dialog v-model="isEnterRolePickerOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="event-info-sheet" :style="{ borderTopColor: accentBg(0.4) }">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="event-info-sheet__title" :style="{ color: accentColor }">Belépés</div>
          <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white transition-colors bg-slate-800/50" size="sm" />
        </q-card-section>
        <q-card-section class="q-pt-md q-px-md pb-8">
          <p class="event-enter-hint">Válaszd ki, melyik szerepkörrel lépsz be az adatlapra.</p>
          <div class="event-info-sheet__scroll">
            <button
              v-for="role in enterableRoles"
              :key="role.eventRoleId ?? role.eventUserId"
              type="button"
              class="event-enter-role"
              :disabled="enterBusy"
              @click="enterAsRole(role)"
            >
              <span
                class="event-enter-role__chip"
                :style="{
                  color: getRoleStyle(role.color).color,
                  backgroundColor: getRoleStyle(role.color).bg,
                  border: '1px solid ' + getRoleStyle(role.color).border
                }"
              >
                {{ role.name }}
              </span>
              <span v-if="role.roleTypeName" class="event-enter-role__type">{{ role.roleTypeName }}</span>
              <q-icon name="chevron_right" size="20px" class="event-enter-role__chevron" />
            </button>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- FIXED ENTER BUTTON: EventTypes.CanEnterFlg + user in EventUsers -->
    <q-page-sticky
      v-if="needUserApproval || canShowEnterButton"
      position="top-right"
      :offset="[16, 16]"
      class="event-sticky-actions"
    >
      <button
        v-if="needUserApproval"
        type="button"
        class="invite-bang"
        aria-label="Meghívó megerősítése"
        @click="inviteSheetOpen = true"
      >
        !
        <q-tooltip class="bg-[#0B0F19] border border-white/10 text-white text-[11px] font-bold px-3 py-1" anchor="bottom middle" self="top middle" :offset="[0, 8]">
          Meghívó megerősítése
        </q-tooltip>
      </button>
      <q-btn
        v-if="canShowEnterButton"
        unelevated
        label="Belépés"
        icon="meeting_room"
        class="rounded-full px-5 py-2 font-black tracking-widest text-sm animate-pulse-slow backdrop-blur-md z-[100]"
        :style="{
          background: isDemoProfitabilityRoute
            ? 'linear-gradient(90deg, rgba(246,139,41,0.95) 0%, rgba(234,88,12,0.95) 100%)'
            : 'linear-gradient(90deg, rgba(16,185,129,0.95) 0%, rgba(13,148,136,0.95) 100%)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: isDemoProfitabilityRoute ? '0 10px 20px rgba(246,139,41,0.4)' : '0 10px 20px rgba(16,185,129,0.4)'
        }"
        :disable="enterBusy"
        :loading="enterBusy"
        @click="enterEvent"
      />
    </q-page-sticky>

    <InviteDecisionSheet
      v-model="inviteSheetOpen"
      :event-id="event.id"
      :event-name="event.name"
    />

    <q-dialog v-model="isSoonOpen" transition-show="scale" transition-hide="scale">
      <ComingSoonCube :title="soonLabel" :icon="soonIcon" />
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import QRCode from 'qrcode';
import { useEventStore, type EnterableEventRole } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';
import defaultCover from 'src/assets/eventjoy_icon_gradient.svg';
import ptaCover from 'src/assets/PTA2_back.png';
import {
  eventDatasheetKind,
  eventRoleEnterBlocked,
  eventRolePath,
  eventRoleQuery,
  isPlayerWaitingForTicketScan,
} from 'src/utils/eventRoleNav';
import { enterEventSession } from 'src/utils/eventEnter';
import { notifyTicketScanSuccess } from 'src/utils/eventChange';
import { refreshEventCatalog } from 'src/utils/eventCatalogRefresh';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { normalizeEventUserUid } from 'src/utils/eventUserQr';
import InviteDecisionSheet from 'src/components/event/InviteDecisionSheet.vue';
import ComingSoonCube from 'src/components/event/ComingSoonCube.vue';
import { eventLocalDateRange, groupProgramsForDisplay } from 'src/utils/eventProgram';
import { findEventStatus } from 'src/utils/eventFlow';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const inviteSheetOpen = ref(false);
const isSoonOpen = ref(false);
const soonLabel = ref('Hamarosan elérhető');
const soonIcon = ref('sym_r_schedule');

function eventCoverUrl(row: Record<string, unknown> | null | undefined): string {
  const raw = String(row?.EventImageUrl || row?.CoverImageUrl || row?.ImageUrl || '').trim();
  if (!raw || raw === 'null' || raw === 'undefined') return '';
  return raw;
}

function comingSoon(label: string, icon = 'sym_r_schedule') {
  soonLabel.value = label;
  soonIcon.value = icon;
  isSoonOpen.value = true;
}

function eventTagNames(eventId: unknown): string[] {
  const key = String(eventId ?? '');
  const links = (eventStore.eventLabels || []).filter(
    (el: any) => String(el.EventID ?? el.eventID ?? el.EventId ?? '') === key
  );
  const catalog = [...(eventStore.labels || []), ...(masterDataStore.labels || [])];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const labelId = Number(link.LabelID ?? link.labelID ?? link.LabelId);
    if (!Number.isFinite(labelId)) continue;
    const row = catalog.find((l: any) => Number(l.id ?? l.ID ?? l.LabelID) === labelId);
    const name = String(row?.LabelName || row?.Name || row?.labelName || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function eventStatusView(dbEvent: Record<string, unknown> | null | undefined): {
  key: 'active' | 'upcoming' | 'completed' | 'other';
  name: string;
} {
  const statusId = nullableNumericId(
    dbEvent?.EventStatusID ?? dbEvent?.eventStatusID ?? dbEvent?.StatusID ?? dbEvent?.StatusId
  );
  const rec = findEventStatus(masterDataStore.eventStatuses, statusId);
  const name = rec
    ? String(rec.StatusName || rec.Name || 'Státusz')
    : masterDataStore.getEventStatusNameById(statusId, statusId == null ? 'Tervezés' : 'Státusz');
  const folded = name.toLowerCase();
  if (
    masterDataStore.isEventStatusClosed(statusId) ||
    folded.includes('lezárt') ||
    folded.includes('kész') ||
    folded.includes('töröl')
  ) {
    return { key: 'completed', name };
  }
  if (
    masterDataStore.isEventStatusInProgress(statusId) ||
    folded.includes('folyamat') ||
    folded.includes('fut') ||
    folded.includes('élő') ||
    folded.includes('live')
  ) {
    return { key: 'active', name };
  }
  return { key: 'other', name };
}

const isDemoProfitabilityRoute = computed(() => {
  if (isProfitabilityEventType(route.query.eventTypeId as string)) return true;
  const targetId = String(route.params.id);
  const dbEvent =
    eventStore.myEvents?.find((e: any) => String(e.id) === targetId) ||
    eventStore.discoveryEvents?.find((e: any) => String(e.id) === targetId) ||
    eventStore.events?.find((e: any) => String(e.id) === targetId);
  return isProfitabilityEventType(dbEvent?.EventTypeID ?? dbEvent?.eventTypeId);
});



const modals = ref({
  info: false,
  ticket: false
});
const isEnterRolePickerOpen = ref(false);
const enterBusy = ref(false);
const ticketQrUrl = ref('');

const ticketUid = computed(() => {
  const rows = eventStore.getEventUsersForEvent(String(route.params.id));
  const withTicket = rows.find((eu) => eu.EventTicketID != null);
  return normalizeEventUserUid((withTicket || rows[0])?.EventUserUID);
});

watch(
  () => [modals.value.ticket, ticketUid.value] as const,
  async ([open, uid]) => {
    if (!open) return;
    if (!uid) {
      ticketQrUrl.value = '';
      return;
    }
    ticketQrUrl.value = await QRCode.toDataURL(uid, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  }
);

// Dinamikus eseményadatok betöltése az EventStore és MasterDataStore alapján a jelenlegi URL ID szerint
const event = computed(() => {
  const targetId = String(route.params.id);
  const dbEvent = eventStore.events?.find((e: any) => String(e.id) === targetId)
               || eventStore.myEvents?.find((e: any) => String(e.id) === targetId)
               || eventStore.discoveryEvents?.find((e: any) => String(e.id) === targetId);

  if (!dbEvent) {
    return {
      id: targetId,
      name: 'PROFI-T-ABILITY Bajnokság',
      date: '2026. október 15. 14:00',
      location: 'Budapest, Bálna Rendezvényközpont',
      city: 'Budapest',
      type: 'PROFI-T-ABILITY',
      status: 'other',
      roles: [{ name: 'Résztvevő', color: '#34d399' }],
      tags: [] as string[],
      statusName: 'Státusz',
      organizer: {
        name: 'EventJoy Szervezőcsapat',
        allowChat: true
      },
      coverImage: ptaCover,
      isDefaultCover: false,
      description: 'A PROFI-T-ABILITY üzleti és stratégiai szimulációs bajnokság, ahol a résztvevők valós gazdasági döntéseket hozhatnak.',
      allowLateEntry: true,
      userHasTicket: false,
      isTicketPurchasable: true,
      canEnter: false,
    };
  }

  // Típus
  const eventType = masterDataStore.eventTypes?.find((t: any) => t.id === dbEvent.EventTypeID);
  const typeName = eventType?.TypeName || eventType?.Name || (isDemoProfitabilityRoute.value ? 'PROFI-T-ABILITY' : 'Esemény');

  // Helyszín
  const locationObj = eventStore.locations?.find((l: any) => l.id === dbEvent.EventLocationID) || {};
  const locName = locationObj.LocationName || locationObj.Name || dbEvent.LocationName || dbEvent.Location || 'Budapest, Bálna Rendezvényközpont';
  const cityName = locationObj.City || dbEvent.City || 'Budapest';

  // Címkék — csak a ténylegesen felvett EventLabel sorok, nincs dummy fallback
  const tags = eventTagNames(dbEvent.id);

  // Szerepkörök (Duplikációk szűrésével, 2-lépcsős feloldással: EventUser -> EventRole -> MasterData.Role)
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
  const myRoles = rawRoles.length > 0 ? rawRoles : [{ name: 'Résztvevő', color: '#34d399' }];

  // Dátum formázás
  let formattedDate = 'Időpont megadva';
  if (dbEvent.StartAtUtc) {
    const dateObj = new Date(dbEvent.StartAtUtc);
    formattedDate = dateObj.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } else if (dbEvent.date) {
    formattedDate = dbEvent.date;
  }

  // Cover Image
  const isPtaEvent = isDemoProfitabilityRoute.value || isProfitabilityEventType(dbEvent.EventTypeID);
  const uploadedCover = eventCoverUrl(dbEvent);
  const imageUrl = uploadedCover || (isPtaEvent ? ptaCover : defaultCover);

  // Leírás
  const desc = dbEvent.Description || dbEvent.DescriptionText || 'A PROFI-T-ABILITY üzleti és stratégiai szimulációs bajnokság, ahol a résztvevők valós gazdasági döntéseket hozhatnak és hálózatot építhetnek.';

  // Szervező
  const orgName =
    dbEvent.ContactName || dbEvent.OrganizerName || dbEvent.Organizer || 'EventJoy Szervezőcsapat';

  // Jegy: EventUsers.EventTicketID
  const hasValidTicket = eventUserRows.some((eu: any) => eu.EventTicketID != null);

  const isUserOnEvent = eventStore.isUserOnEvent(dbEvent.id);
  const isOrganizer = eventStore.isOrganizerOnEvent(dbEvent.id);
  const canEnter =
    isOrganizer ||
    (masterDataStore.eventTypeCanEnter(dbEvent.EventTypeID ?? dbEvent.eventTypeId) && isUserOnEvent);

  const statusView = eventStatusView(dbEvent);
  const canBuyTicket =
    eventUserRows.length === 0 &&
    !masterDataStore.isEventStatusClosed(
      nullableNumericId(dbEvent.EventStatusID ?? dbEvent.eventStatusID ?? dbEvent.StatusID)
    );

  return {
    id: String(dbEvent.id),
    name: dbEvent.Title || dbEvent.EventName || dbEvent.Name || 'PROFI-T-ABILITY Bajnokság',
    date: formattedDate,
    location: locName,
    city: cityName,
    type: typeName,
    status: statusView.key,
    statusName: statusView.name,
    roles: myRoles,
    isProfitability: isPtaEvent,
    tags,
    organizer: {
      name: orgName,
      allowChat: true
    },
    coverImage: imageUrl,
    isDefaultCover: !uploadedCover && !isPtaEvent,
    description: desc,
    allowLateEntry: true,
    userHasTicket: hasValidTicket,
    isTicketPurchasable: canBuyTicket,
    canEnter,
    onlineUrl: dbEvent.OnlineURL || dbEvent.OnlineUrl || null,
    onlineFlg: dbEvent.OnlineFlg === 1 || dbEvent.OnlineFlg === true,
  };
});

// ===== PROFI-T-ABILITY brand szín logika =====
// Ha az esemény PROFI-T-ABILITY típusú, narancssárga akcentszínt használunk
// a szokásos kék/indigó brand szín helyett.
const PTA_COLOR = { r: 246, g: 139, b: 41 }; // #f68b29
const DEFAULT_COLOR = { r: 14, g: 165, b: 233 }; // #0ea5e9

const accentColor = computed(() => isDemoProfitabilityRoute.value ? '#f68b29' : '#0ea5e9');
const accentGradient = computed(() => isDemoProfitabilityRoute.value
  ? 'linear-gradient(90deg, #f68b29 0%, #ea580c 100%)'
  : 'var(--ej-gradient)');
const accentDiagonalGradient = computed(() => isDemoProfitabilityRoute.value
  ? 'linear-gradient(to right, #f68b29, #ea580c)'
  : 'linear-gradient(to right, #0ea5e9, #6366f1)');

function accentBg(alpha: number): string {
  const c = isDemoProfitabilityRoute.value ? PTA_COLOR : DEFAULT_COLOR;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}


// Computed properties for logic
const hasParticipated = computed(() => {
  return eventStore.isUserOnEvent(event.value.id);
});

const canShowEnterButton = computed(() => readyEnterRoles.value.length > 0);

const needUserApproval = computed(
  () => !!eventStore.getMyEventUserStatus(String(route.params.id))?.needUserApproval
);

const currentDbEvent = computed(() => {
  const targetId = String(route.params.id);
  return eventStore.events?.find((e: any) => String(e.id) === targetId)
    || eventStore.myEvents?.find((e: any) => String(e.id) === targetId)
    || eventStore.discoveryEvents?.find((e: any) => String(e.id) === targetId)
    || null;
});

const programView = computed(() => {
  const db = currentDbEvent.value;
  if (!db) return { kind: 'flat' as const, items: [] };
  const { isMultiDay } = eventLocalDateRange(db as Record<string, unknown>);
  return groupProgramsForDisplay(eventStore.getProgramsForEvent(db.id), isMultiDay);
});

const hasPrograms = computed(() => {
  const view = programView.value;
  if (view.kind === 'flat') return view.items.length > 0;
  return view.days.some((day) => day.items.length > 0);
});

const enterableRoles = computed(() => {
  const db = currentDbEvent.value;
  if (!db) return [];
  return eventStore.getEnterableRolesForEvent(db.id, db.EventTypeID ?? db.eventTypeId);
});

const waitingForTicketScan = computed(() =>
  isPlayerWaitingForTicketScan(event.value.id, enterableRoles.value)
);

const readyEnterRoles = computed(() => {
  const db = currentDbEvent.value;
  if (!db) return [];
  const statusAllowsEnter = masterDataStore.eventStatusAllowsEnter(
    db.EventStatusID ?? db.eventStatusID ?? db.StatusID ?? db.StatusId
  );
  return enterableRoles.value.filter((role) => {
    const kind = eventDatasheetKind(role, event.value.id);
    if (kind === 'organizer' || role.isOrganizer) return true;
    if (kind === 'gamemaster' || kind === 'player') {
      return !eventRoleEnterBlocked(event.value.id, role);
    }
    return statusAllowsEnter;
  });
});

// Utilities
function getStatusStyle(status: string) {
  switch(status) {
    case 'active':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)', glow: 'rgba(34, 197, 94, 0.4)' };
    case 'upcoming':
      return { bg: accentBg(0.15), text: accentColor.value, border: accentBg(0.3), glow: accentBg(0.4) };
    case 'completed':
    case 'other':
    default:
      return { bg: 'rgba(255, 255, 255, 0.1)', text: '#94a3b8', border: 'rgba(255, 255, 255, 0.2)', glow: 'rgba(255, 255, 255, 0.2)' };
  }
}

function initiateChat() {
  $q.notify({
    message: 'Üzenetküldés a szervezőnek indítása...',
    color: 'brand-primary',
    textColor: 'white',
    icon: 'sym_r_chat',
    position: 'top'
  });
}

function getRoleStyle(hexColor?: string) {
  let color = hexColor && hexColor.startsWith('#') ? hexColor : (isDemoProfitabilityRoute.value ? '#f68b29' : '#38bdf8');
  if (color.length === 4) {
    color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return { 
    color: color, 
    bg: color + '1A', 
    border: color + '33' 
  };
}

function enterEvent() {
  const roles = enterableRoles.value;
  if (roles.length > 1) {
    isEnterRolePickerOpen.value = true;
    return;
  }
  void enterAsRole(roles[0] ?? null);
}

async function enterAsRole(role: EnterableEventRole | null) {
  if (enterBusy.value) return;
  isEnterRolePickerOpen.value = false;
  const blocked = eventRoleEnterBlocked(event.value.id, role);
  if (blocked) {
    $q.notify({
      message: blocked,
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    return;
  }
  enterBusy.value = true;
  try {
    await enterEventSession(event.value.id, role);
    await router.push({
      path: eventRolePath(event.value.id, role),
      query: eventRoleQuery(role),
    });
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A belépés sikertelen.'),
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
  } finally {
    enterBusy.value = false;
  }
}

async function enterAfterTicketScan() {
  const player =
    enterableRoles.value.find((role) => eventDatasheetKind(role, event.value.id) === 'player') ||
    enterableRoles.value[0] ||
    null;
  if (!player || eventRoleEnterBlocked(event.value.id, player)) return;
  notifyTicketScanSuccess();
  await enterAsRole(player);
}

watch(waitingForTicketScan, (waiting, wasWaiting) => {
  if (wasWaiting && !waiting) {
    void enterAfterTicketScan();
  }
});

let ticketScanPoll: ReturnType<typeof setInterval> | null = null;

watch(
  waitingForTicketScan,
  (waiting) => {
    if (ticketScanPoll) {
      clearInterval(ticketScanPoll);
      ticketScanPoll = null;
    }
    if (!waiting) return;
    ticketScanPoll = setInterval(() => {
      void refreshEventCatalog({ force: true });
    }, 5000);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (ticketScanPoll) {
    clearInterval(ticketScanPoll);
    ticketScanPoll = null;
  }
});

</script>

<style scoped>
.event-cover-default {
  background: radial-gradient(ellipse at 50% 40%, rgba(14, 165, 233, 0.45) 0%, #0f172a 72%);
}

.event-cover-btn {
  background: rgba(15, 23, 42, 0.82) !important;
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
}

.event-program-empty {
  padding: 20px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.event-program {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.event-program__day {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-program__day + .event-program__day {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.event-program__day-label {
  padding: 2px 4px 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  color: #cbd5e1;
}

.event-program__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 4px;
}

.event-program__time {
  flex-shrink: 0;
  width: 52px;
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.event-program__name {
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.event-ticket {
  position: relative;
  width: min(100%, 380px);
  margin: 16px;
  overflow: hidden;
  border-radius: 28px;
  background: #0b1220;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}

.event-ticket__close {
  position: absolute !important;
  top: 12px;
  right: 12px;
  z-index: 5;
  width: 44px;
  height: 44px;
  background: #ffffff !important;
  color: #0f172a !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.95);
}

.event-ticket__band {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 88px;
  padding: 20px 56px 18px 20px;
}

.event-ticket__kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
}

.event-ticket__brand {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
}

.event-ticket__perforation {
  position: relative;
  height: 20px;
}

.event-ticket__dash {
  display: block;
  height: 0;
  margin: 10px 22px 0;
  border-top: 2px dashed rgba(255, 255, 255, 0.18);
}

.event-ticket__notch {
  position: absolute;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #0f172a;
}

.event-ticket__notch--left {
  left: -10px;
}

.event-ticket__notch--right {
  right: -10px;
}

.event-ticket__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 22px 24px;
  text-align: center;
}

.event-ticket__title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.25;
  text-wrap: balance;
}

.event-ticket__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}

.event-ticket__roles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 10px 0 16px;
}

.event-ticket__role {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
}

.event-ticket__qr {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 220px;
  margin: 4px 0 14px;
  padding: 10px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
}

.event-ticket__qr img {
  display: block;
  width: 200px;
  height: 200px;
}

.event-ticket__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #94a3b8;
}

.event-ticket__hint {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .85;
  }
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.event-status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-status-chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #4ade80;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.event-org-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 58%;
  padding: 6px 10px 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
  }

  &--static {
    cursor: default;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
}

.event-org-chip__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  align-items: flex-end;
}

.event-org-chip__label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  line-height: 1.2;
}

.event-org-chip__name {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.event-org-chip__icon {
  flex-shrink: 0;
  color: #94a3b8;
}

.event-info-sheet {
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
  color: #fff;
}

.event-info-sheet__title {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.event-info-sheet__scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(68vh, 640px);
  overflow-y: auto;
  padding-bottom: 8px;
}

.event-info-card {
  position: relative;
  overflow: hidden;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  border-radius: 24px;
  padding: 20px 20px 18px;
}

.event-info-card__bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 24px 0 0 24px;
}

.event-info-card__label {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
}

.event-info-card__text {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.55;
  color: #cbd5e1;
}

.event-info-card__value {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.4;
}

.event-info-card__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.event-enter-hint {
  margin: 0 4px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.event-enter-role {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.55);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.16);
  }
}

.event-enter-role__chip {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 12px;
}

.event-enter-role__type {
  font-size: 13px;
  font-weight: 700;
  color: #cbd5e1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-enter-role__chevron {
  margin-left: auto;
  color: #64748b;
}

.event-sticky-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
}

.invite-bang {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  background: rgba(251, 191, 36, 0.18);
  color: #fbbf24;
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.28);
  backdrop-filter: blur(8px);
}

.invite-bang:active {
  transform: scale(0.94);
}
</style>
