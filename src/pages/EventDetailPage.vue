<template>
  <q-page class="bg-[#0F172A] text-white relative min-h-screen pb-20 overflow-x-hidden">
    <!-- Giant Background Watermark Logo -->
    <div class="absolute -right-24 top-[15%] w-96 h-96 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="Watermark" class="w-full h-full object-contain" />
    </div>

    <!-- 1. HEADER IMAGE -->
    <div class="relative w-full h-[280px] sm:h-[350px] overflow-hidden">
      <!-- Back Button -->
      <q-btn 
        icon="arrow_back" 
        flat 
        round 
        dense
        color="white"
        class="absolute top-4 left-4 z-20 bg-black/30 backdrop-blur-md"
        @click="router.go(-1)"
      />
      
      <!-- Image -->
      <img :src="event.coverImage" class="w-full h-full object-cover object-center scale-105" />
      
      <!-- Premium Gradient overlay to blend with the background -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent"></div>
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
            {{ getStatusLabel(event.status) }}
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
            <q-btn v-if="event.hasDownloadableFiles" unelevated class="w-full rounded-[16px] py-3.5" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);" @click="modals.downloads = true">
               <div class="flex items-center justify-center gap-3 w-full">
                  <q-icon name="folder_zip" size="20px" />
                  <span class="font-bold text-[14px] tracking-wide uppercase">Anyagok letöltése</span>
               </div>
            </q-btn>

            <!-- HÍRFOLYAM -->
            <q-btn 
              unelevated
              class="w-full rounded-[16px] py-3.5 outline-none"
              style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"
              @click="router.push(`/feed?eventId=${event.id}`)"
            >
              <div class="flex items-center justify-center gap-3 w-full">
                <q-icon name="sym_r_newspaper" color="white" size="20px" />
                <span class="text-white font-bold text-[14px] tracking-wide uppercase">Esemény Hírei</span>
                <div v-if="unreadNewsCount > 0" class="text-white" :style="{ backgroundColor: accentColor, width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', marginLeft: '6px', boxShadow: '0 0 10px ' + accentBg(0.6), lineHeight: '1' }">
                  {{ unreadNewsCount }}
                </div>
              </div>
            </q-btn>

            <!-- SZÁMLA (EventUsers.InvoiceID) -->
            <q-btn v-if="event.hasInvoice" unelevated class="w-full rounded-[16px] py-3.5" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
               <div class="flex items-center justify-center gap-3 w-full">
                  <q-icon name="receipt_long" size="20px" />
                  <span class="font-bold text-[14px] tracking-wide uppercase">Számla letöltése</span>
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
              @click="router.push(`/feed?eventId=${event.id}`)"
            >
              <div class="flex items-center justify-center gap-3 w-full">
                <q-icon name="sym_r_newspaper" color="white" size="20px" />
                <span class="text-white font-bold text-[14px] tracking-wide uppercase">Esemény Hírei</span>
                <div v-if="unreadNewsCount > 0" class="text-white" :style="{ backgroundColor: accentColor, width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', marginLeft: '6px', boxShadow: '0 0 10px ' + accentBg(0.6), lineHeight: '1' }">
                  {{ unreadNewsCount }}
                </div>
              </div>
            </q-btn>

            <!-- SZÁMLA -->
            <q-btn v-if="event.hasInvoice" unelevated class="w-full rounded-[16px] py-3.5" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
               <div class="flex items-center justify-center gap-3 w-full">
                  <q-icon name="receipt_long" size="20px" />
                  <span class="font-bold text-[14px] tracking-wide uppercase">Számla letöltése</span>
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
      <div v-if="event.hasProgram" class="mb-8">
        <div class="flex items-center gap-2 px-2" style="margin-bottom: 12px;">
          <q-icon name="sym_r_view_timeline" :style="{ color: accentColor }" size="20px" />
          <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Esemény Programja</h2>
        </div>
        
        <div class="flex flex-col gap-3">
          <div v-for="(p, idx) in event.program" :key="idx" class="flex items-center gap-4 p-2 pr-4 transition-colors" style="background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
            <div
              class="px-3 py-2 rounded-xl text-white font-black text-[13px] tracking-wider text-center min-w-[65px]"
              :style="idx === 0 && event.status === 'active'
                ? { backgroundColor: accentColor, boxShadow: '0 0 15px ' + accentBg(0.5) }
                : { backgroundColor: '#0B0F19' }"
            >
              {{ p.time }}
            </div>
            <div class="flex flex-col">
              <span class="text-white font-bold text-[14px] leading-tight">{{ p.title }}</span>
              <span v-if="idx === 0 && event.status === 'active'" class="text-[10px] uppercase font-black tracking-widest mt-0.5 animate-pulse" :style="{ color: accentColor }">Most zajlik</span>
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

    <!-- Downloads Modal -->
    <q-dialog v-model="modals.downloads" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-[#0B0F19] text-white rounded-t-3xl border-t border-white/10 w-full max-w-2xl mx-auto pb-8">
        <q-card-section class="flex justify-between items-center pt-6 pb-2 border-b border-white/5">
          <h2 class="text-lg font-black uppercase tracking-widest m-0 flex items-center gap-2">
            <q-icon name="folder_zip" :style="{ color: accentColor }" size="24px"/>
            Letölthető anyagok
          </h2>
          <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white" />
        </q-card-section>
        <q-card-section class="pt-4 flex flex-col gap-3">
          <q-btn outline color="slate-400" align="left" class="w-full rounded-2xl py-3 px-4" no-caps>
            <div class="flex items-center gap-3 w-full">
              <q-icon name="receipt_long" size="24px" :style="{ color: accentColor }" />
              <div class="flex flex-col items-start">
                <span class="font-bold text-white text-sm">Számla letöltése</span>
                <span class="text-[10px] text-slate-500 uppercase font-bold">PDF • 120 KB</span>
              </div>
              <q-icon name="download" size="20px" class="ml-auto text-slate-500" />
            </div>
          </q-btn>
          <q-btn outline color="slate-400" align="left" class="w-full rounded-2xl py-3 px-4" no-caps>
            <div class="flex items-center gap-3 w-full">
              <q-icon name="workspace_premium" size="24px" class="text-amber-400" />
              <div class="flex flex-col items-start">
                <span class="font-bold text-white text-sm">Részvételi Oklevél</span>
                <span class="text-[10px] text-slate-500 uppercase font-bold">PDF • 2.1 MB</span>
              </div>
              <q-icon name="download" size="20px" class="ml-auto text-slate-500" />
            </div>
          </q-btn>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- TICKET MODAL -->
    <q-dialog v-model="modals.ticket" transition-show="scale" transition-hide="scale">
      <q-card class="bg-white text-slate-900 rounded-3xl w-full max-w-sm pb-6 overflow-hidden relative">
        <div class="h-24 w-full flex items-center justify-center relative" :style="{ backgroundColor: accentColor }">
          <q-btn icon="close" flat round dense v-close-popup class="absolute top-2 right-2 text-white" />
          <h2 class="text-white font-black uppercase tracking-widest text-lg m-0">Belépőjegy</h2>
        </div>
        
        <!-- Ticket cutouts -->
        <div class="absolute w-8 h-8 bg-black/50 rounded-full -left-4 top-20 mix-blend-overlay"></div>
        <div class="absolute w-8 h-8 bg-black/50 rounded-full -right-4 top-20 mix-blend-overlay"></div>

        <q-card-section class="pt-8 text-center flex flex-col items-center">
          <div class="text-xl font-black mb-1">{{ event.name }}</div>
          <div class="text-slate-500 text-sm font-bold mb-6">{{ event.date }}</div>
          
          <!-- Ticket QR — EventUser.EventUserUID -->
          <div class="bg-white p-2 rounded-xl shadow-lg border border-slate-200 mb-4 inline-block">
            <img
              v-if="ticketQrUrl"
              :src="ticketQrUrl"
              alt="Jegy QR-kód"
              width="160"
              height="160"
              class="block"
            />
            <q-icon v-else name="qr_code_2" size="160px" class="text-slate-900" />
          </div>
          
          <div class="text-sm font-mono font-bold text-slate-400 tracking-widest uppercase">
            {{ ticketUid ? ticketUid.slice(0, 8).toUpperCase() : 'QR nem elérhető' }}
          </div>
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
    <q-page-sticky position="top-right" :offset="[16, 16]" v-if="canShowEnterButton">
      <q-btn 
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
        @click="enterEvent"

      />
    </q-page-sticky>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import QRCode from 'qrcode';
import { useEventStore, type EnterableEventRole } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';
import { eventDatasheetKind, eventRoleEnterBlocked, eventRolePath, eventRoleQuery } from 'src/utils/eventRoleNav';
import { normalizeEventUserUid } from 'src/utils/eventUserQr';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

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
  downloads: false,
  ticket: false
});
const isEnterRolePickerOpen = ref(false);
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
      status: 'active',
      roles: [{ name: 'Résztvevő', color: '#34d399' }],
      tags: ['üzlet', 'stratégia', 'networking'],
      organizer: {
        name: 'EventJoy Szervezőcsapat',
        allowChat: true
      },
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      description: 'A PROFI-T-ABILITY üzleti és stratégiai szimulációs bajnokság, ahol a résztvevők valós gazdasági döntéseket hozhatnak.',
      allowLateEntry: true,
      hasProgram: true,
      userHasTicket: false,
      isTicketPurchasable: true,
      hasDownloadableFiles: false,
      hasInvoice: false,
      canEnter: false,
      program: [
        { time: '14:00', title: 'Regisztráció és sorsolás' },
        { time: '14:30', title: '1. forduló játékindítás' },
        { time: '16:00', title: '2. forduló és asztalváltás' },
        { time: '17:30', title: 'Eredményhirdetés és díjátadó' }
      ]
    };
  }

  // Típus
  const eventType = masterDataStore.eventTypes?.find((t: any) => t.id === dbEvent.EventTypeID);
  const typeName = eventType?.TypeName || eventType?.Name || (isDemoProfitabilityRoute.value ? 'PROFI-T-ABILITY' : 'Esemény');

  // Helyszín
  const locationObj = eventStore.locations?.find((l: any) => l.id === dbEvent.EventLocationID) || {};
  const locName = locationObj.LocationName || locationObj.Name || dbEvent.LocationName || dbEvent.Location || 'Budapest, Bálna Rendezvényközpont';
  const cityName = locationObj.City || dbEvent.City || 'Budapest';

  // Címkék
  const eventLabelIds = eventStore.eventLabels?.filter((el: any) => el.EventID === dbEvent.id).map((el: any) => el.LabelID) || [];
  const tags = masterDataStore.labels?.filter((l: any) => eventLabelIds.includes(l.id)).map((l: any) => l.LabelName || l.Name) || [];

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
  const imageUrl = dbEvent.CoverImageUrl || dbEvent.ImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80';

  // Leírás
  const desc = dbEvent.Description || dbEvent.DescriptionText || 'A PROFI-T-ABILITY üzleti és stratégiai szimulációs bajnokság, ahol a résztvevők valós gazdasági döntéseket hozhatnak és hálózatot építhetnek.';

  // Szervező
  const orgName = dbEvent.OrganizerName || dbEvent.Organizer || 'EventJoy Szervezőcsapat';

  // Programok
  const programsList = eventStore.eventPrograms?.filter((p: any) => String(p.EventID) === targetId) || [];
  const formattedProgram = programsList.map((p: any) => ({
    time: p.StartTime || p.Time || '14:00',
    title: p.Title || p.Name || 'Programpont'
  }));

  // Jegy: EventUsers.EventTicketID
  const hasValidTicket = eventUserRows.some((eu: any) => eu.EventTicketID != null);

  // Számla: EventUsers.InvoiceID
  const invoiceId = eventStore.getInvoiceIdForEvent(dbEvent.id);
  const hasValidInvoice = invoiceId != null;

  const isUserOnEvent = eventStore.isUserOnEvent(dbEvent.id);
  const isOrganizer = eventStore.isOrganizerOnEvent(dbEvent.id);
  const canEnter =
    isOrganizer ||
    (masterDataStore.eventTypeCanEnter(dbEvent.EventTypeID ?? dbEvent.eventTypeId) && isUserOnEvent);

  // Jegyvásárlás: ha nincs még EventUser sora a felhasználónak és az esemény aktív
  const canBuyTicket = eventUserRows.length === 0 && (dbEvent.Status === 'active' || !dbEvent.Status);

  return {
    id: String(dbEvent.id),
    name: dbEvent.Title || dbEvent.EventName || dbEvent.Name || 'PROFI-T-ABILITY Bajnokság',
    date: formattedDate,
    location: locName,
    city: cityName,
    type: typeName,
    status: dbEvent.Status || 'active',
    roles: myRoles,
    isProfitability: isDemoProfitabilityRoute.value || isProfitabilityEventType(dbEvent.EventTypeID),
    tags: tags.length > 0 ? tags : (isDemoProfitabilityRoute.value ? ['üzlet', 'stratégia', 'networking'] : ['rendezvény']),
    organizer: {
      name: orgName,
      allowChat: true
    },
    coverImage: imageUrl,
    description: desc,
    allowLateEntry: true,
    hasProgram: true,
    userHasTicket: hasValidTicket,
    isTicketPurchasable: canBuyTicket,
    hasDownloadableFiles: true,
    hasInvoice: hasValidInvoice,
    invoiceId,
    canEnter,
    onlineUrl: dbEvent.OnlineURL || dbEvent.OnlineUrl || null,
    onlineFlg: dbEvent.OnlineFlg === 1 || dbEvent.OnlineFlg === true,
    program: formattedProgram.length > 0 ? formattedProgram : [
      { time: '14:00', title: 'Regisztráció és sorsolás' },
      { time: '14:30', title: '1. forduló játékindítás' },
      { time: '16:00', title: '2. forduló és asztalváltás' },
      { time: '17:30', title: 'Eredményhirdetés és díjátadó' }
    ]
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


// Unread news count logic
const eventNews = ref(
  Array.from({ length: 13 }, (_, i) => ({ id: i + 1, isRead: false }))
);
const unreadNewsCount = computed(() => eventNews.value.filter(n => !n.isRead).length);

// Computed properties for logic
const hasParticipated = computed(() => {
  return eventStore.isUserOnEvent(event.value.id);
});

const canShowEnterButton = computed(() => readyEnterRoles.value.length > 0);

const currentDbEvent = computed(() => {
  const targetId = String(route.params.id);
  return eventStore.events?.find((e: any) => String(e.id) === targetId)
    || eventStore.myEvents?.find((e: any) => String(e.id) === targetId)
    || eventStore.discoveryEvents?.find((e: any) => String(e.id) === targetId)
    || null;
});

const enterableRoles = computed(() => {
  const db = currentDbEvent.value;
  if (!db) return [];
  return eventStore.getEnterableRolesForEvent(db.id, db.EventTypeID ?? db.eventTypeId);
});

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
    default:
      return { bg: 'rgba(255, 255, 255, 0.1)', text: '#94a3b8', border: 'rgba(255, 255, 255, 0.2)', glow: 'rgba(255, 255, 255, 0.2)' };
  }
}

function getStatusLabel(status: string) {
  switch(status) {
    case 'active': return 'Jelenleg fut';
    case 'upcoming': return 'Közelgő';
    case 'completed': return 'Lezárt';
    default: return status;
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
  enterAsRole(roles[0] ?? null);
}

function enterAsRole(role: EnterableEventRole | null) {
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
  router.push({
    path: eventRolePath(event.value.id, role),
    query: eventRoleQuery(role),
  });
}

</script>

<style scoped>
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
</style>
