<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-[#0F172A] text-white' : 'bg-[#F8FAFC] text-slate-900'">
    <!-- Header: Left side logo, right side Event name + Messages + Notifications -->
    <q-header elevated :class="$q.dark.isActive ? 'bg-[#0F172A]/95 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-slate-800 text-white' : 'bg-white/95 border-b border-slate-200 text-slate-800'">
      <q-toolbar class="justify-between q-px-md" style="height: 64px;">
        <!-- Left side: Brand Logo -->
        <div class="flex items-center gap-2">
          <img :src="headerLogo" alt="EventJoy" style="height: 26px; width: auto;" class="object-contain cursor-pointer" @click="router.push('/')" />

        </div>


        <!-- Right side: PROFI-T-ABILITY + Newsfeed + Messages + Notifications -->
        <div class="flex items-center gap-2 sm:gap-4">
          <!-- PROFI-T-ABILITY kis ikon a Headerben -->
          <q-btn flat round dense icon="auto_graph" to="/profitability" class="text-[#f68b29] hover:bg-[#f68b29]/10 relative" size="18px">
            <q-tooltip>PROFI-T-ABILITY Bajnokságok</q-tooltip>
          </q-btn>

          <!-- Newsfeed (Új hír) -->
          <q-btn flat round dense icon="sym_r_newspaper" to="/feed" class="text-slate-400 hover:text-white relative" size="18px">
            <!-- Kis kék pötty jelzi, ha van új ajánló -->
            <q-badge color="brand-primary" floating style="top: -2px; right: 0px; width: 10px; height: 10px; border-radius: 50%; padding: 0;"></q-badge>
          </q-btn>

          <!-- Értesítések -->
          <q-btn flat round dense icon="sym_r_notifications" class="text-slate-400 hover:text-white relative" size="18px">
            <q-badge color="rose-500" floating style="top: -2px; right: -2px; padding: 3px 5px; font-size: 10px; font-weight: 900; border-radius: 9999px;">2</q-badge>
            <q-menu anchor="bottom right" self="top right" transition-show="jump-down" transition-hide="jump-up" :offset="[0, 10]" style="background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(24px); border-radius: 20px; width: 380px; box-shadow: 0 30px 60px -12px rgba(0,0,0,1); border: none; padding: 16px 24px 16px 16px;">
              
              <!-- HEADER -->
              <div class="flex items-center justify-between pb-3 mb-2">
                <div class="flex items-center gap-2">
                  <q-icon name="sym_r_notifications_active" size="20px" color="rose-400" />
                  <span class="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-rose-100 font-black uppercase tracking-widest text-[16px] drop-shadow-md">Értesítések</span>
                </div>
                <q-btn flat dense no-caps icon-right="sym_r_done_all" label="Mind olvasva" class="bg-white/5 hover:bg-white/10 text-rose-200 rounded-full font-bold text-[10px] uppercase tracking-wider px-3 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.2)]" />
              </div>
              
              <!-- BODY (NOTIFICATIONS) -->
              <div class="flex flex-col gap-3">
                <!-- Unread Notification 1 -->
                <div class="rounded-[16px] bg-[#1E293B] shadow-[0_8px_20px_rgba(0,0,0,0.4)] pl-3 py-3 pr-6 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 shadow-[0_0_12px_#0ea5e9]"></div>
                  <div class="flex items-center gap-3 pl-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shadow-md shrink-0">
                      <q-icon name="sym_r_event" color="sky-400" size="20px" />
                    </div>
                    <div class="flex flex-col flex-1 min-w-0 w-full">
                      <div class="flex justify-between items-center mb-0.5 w-full gap-2">
                        <span class="font-black tracking-[1.5px] text-[13px] text-sky-400 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Helyszín Változás</span>
                        <span class="text-sky-300 text-[10px] font-black uppercase tracking-wider bg-sky-500/10 px-2 py-0.5 rounded-full shrink-0 shadow-inner whitespace-nowrap mr-6">10 P.&nbsp;&nbsp;&nbsp;</span>
                      </div>
                      <span class="text-slate-400 text-[12px] font-medium leading-tight line-clamp-1">A plenáris előadás a B terembe került át. Kérjük fáradj oda!</span>
                    </div>
                  </div>
                </div>

                <!-- Unread Notification 2 -->
                <div class="rounded-[16px] bg-[#1E293B] shadow-[0_8px_20px_rgba(0,0,0,0.4)] pl-3 py-3 pr-6 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_12px_#10b981]"></div>
                  <div class="flex items-center gap-3 pl-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shadow-md shrink-0">
                      <q-icon name="sym_r_local_activity" color="emerald-400" size="20px" />
                    </div>
                    <div class="flex flex-col flex-1 min-w-0 w-full">
                      <div class="flex justify-between items-center mb-0.5 w-full gap-2">
                        <span class="font-black tracking-[1.5px] text-[13px] text-emerald-400 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Jegyvásárlás</span>
                        <span class="text-emerald-300 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0 shadow-inner whitespace-nowrap mr-6">2 Ó.&nbsp;&nbsp;&nbsp;</span>
                      </div>
                      <span class="text-slate-400 text-[12px] font-medium leading-tight line-clamp-1">Sikeresen megvásároltad a VIP belépőjegyet.</span>
                    </div>
                  </div>
                </div>

                <!-- Read Notification 1 -->
                <div class="rounded-[16px] bg-[#1E293B] shadow-[0_8px_20px_rgba(0,0,0,0.4)] pl-3 py-3 pr-6 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-700 opacity-50"></div>
                  <div class="flex items-center gap-3 pl-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center opacity-70 shrink-0">
                      <q-icon name="sym_r_campaign" color="slate-400" size="20px" />
                    </div>
                    <div class="flex flex-col flex-1 min-w-0 w-full">
                      <div class="flex justify-between items-center mb-0.5 w-full gap-2">
                        <span class="font-black tracking-[1.5px] text-[13px] text-slate-300 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Új Előadó</span>
                        <span class="text-slate-500 text-[10px] font-black uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap mr-6">Tegnap&nbsp;&nbsp;&nbsp;</span>
                      </div>
                      <span class="text-slate-500 text-[12px] font-medium leading-tight line-clamp-1">Dr. Horváth Elemér is csatlakozott a csapathoz!</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-4 mt-2 mb-1">
                <q-btn to="/notifications" unelevated class="w-full rounded-[16px] py-3.5" style="background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: white; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4);" no-caps>
                  <div class="flex items-center justify-center gap-2 w-full">
                    <span class="font-black text-[13px] tracking-wide uppercase">Összes értesítés megnyitása</span>
                  </div>
                </q-btn>
              </div>
            </q-menu>
          </q-btn>
          <!-- Üzenetek -->
          <q-btn flat round dense icon="sym_r_chat_bubble" class="text-slate-400 hover:text-white relative" size="18px">
            <q-badge color="sky-500" floating style="top: -2px; right: -2px; padding: 3px 5px; font-size: 10px; font-weight: 900; border-radius: 9999px;">2</q-badge>
            <MessagesMenu />
          </q-btn>

        </div>
      </q-toolbar>
    </q-header>

    <!-- Folyamatban lévő saját esemény (csak főoldalakon) -->
    <NowPlayingBar :footer-visible="footerVisible" />

    <!-- Alsó navigáció mobilon (Eseményeim + QR kód beolvasó, csúsztatható elrejtés) -->
    <q-footer 
      bordered 
      :class="$q.dark.isActive ? 'bg-[#0F172A]/95 border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] text-white' : 'bg-white/95 border-t border-slate-200 text-slate-800 lt-sm'"
      :style="footerVisible ? 'transform: translateY(0); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);' : 'transform: translateY(calc(100% - 16px)); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);'"
      v-touch-swipe.mouse.vertical="handleSwipe"
    >
      <!-- Footer Swipe Handle -->
      <div class="w-full flex justify-center py-2 opacity-50 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors" @click="footerVisible = !footerVisible">
        <div style="width: 50px; height: 5px; background-color: #cbd5e1; border-radius: 4px;"></div>
      </div>

      <q-tabs
        v-model="tab"
        no-caps
        :active-color="$q.dark.isActive ? 'brand-primary' : 'primary'"
        indicator-color="transparent"
        class="text-slate-400"
      >
        <q-route-tab name="home" icon="dashboard" label="Főoldal" to="/" exact />
        <q-route-tab name="my_events" icon="emoji_events" label="Eseményeim" to="/my-events" exact />
        <q-route-tab name="klubhub" to="/klubhub" exact class="tab-klubhub">
          <img :src="klubhubIcon" alt="" class="tab-klubhub__icon" />
          <div class="q-tab__label">KlubHub</div>
        </q-route-tab>
        <q-route-tab name="profile" icon="person" label="Profil" to="/profile" />
      </q-tabs>
    </q-footer>

    <!-- Fő oldaltartalom -->

    <q-page-container :class="$q.dark.isActive ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'">
      <router-view />
    </q-page-container>

    <!-- QR Kód Olvasó Modális ablak (Futurisztikus kamera szimuláció / Valós kamera feed) -->
    <q-dialog v-model="qrScannerOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-[#020617] text-white flex flex-col justify-between" style="width: 100vw; height: 100vh;">
        <!-- Top Toolbar -->
        <q-toolbar class="bg-[#0B0F19] border-b border-white/5 q-py-sm">
          <q-btn flat round dense icon="close" size="lg" @click="closeQrScanner" class="text-white" />
          <q-toolbar-title class="text-center font-bold text-base uppercase tracking-wider">
            QR Kód Beolvasása
          </q-toolbar-title>
          <q-btn flat round dense :icon="flashOn ? 'flash_on' : 'flash_off'" size="md" @click="toggleFlash" class="text-white" />
        </q-toolbar>

        <!-- Scanner Viewport Area -->
        <div class="flex-grow relative flex items-center justify-center overflow-hidden bg-black">
          
          <!-- Valós kamera stream (ha engedélyezett és elérhető) -->
          <video 
            v-show="!showMockScanner" 
            ref="videoRef" 
            autoplay 
            playsinline 
            class="absolute w-full h-full object-cover"
          ></video>

          <!-- Szimulált radar/mátrix (ha nincs kameraelérés) -->
          <div v-if="showMockScanner" class="absolute inset-0 flex flex-col items-center justify-center q-pa-lg text-center bg-slate-950">
            <q-icon name="photo_camera" size="80px" class="text-slate-600 q-mb-md animate-pulse" />
            <div class="text-lg font-bold text-slate-300">Szimulációs mód aktív</div>
            <div class="text-xs text-slate-500 q-mt-sm max-w-xs">
              A böngésző nem tudja megnyitni a kamerát (nincs kamera, vagy nincs engedélyezve), a rendszer szimulálja a beolvasást.
            </div>
            
            <!-- Animated Matrix Grid Background -->
            <div class="absolute inset-0 opacity-5 pointer-events-none" style="background-image: radial-gradient(#0EA5E9 1px, transparent 1px); background-size: 16px 16px;"></div>
          </div>

          <!-- Scanner Overlay Mask (Célkereszt) -->
          <div class="absolute inset-0 flex flex-col justify-between pointer-events-none z-10">
            <div class="bg-black/60 flex-grow"></div>
            
            <div class="flex flex-row justify-between h-[250px] sm:h-[280px]">
              <div class="bg-black/60 flex-grow"></div>
              
              <!-- Scanning Square Window -->
              <div class="w-[250px] sm:w-[280px] relative border border-white/10 flex items-center justify-center">
                <!-- Glowing Corners -->
                <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-primary rounded-tl-md"></div>
                <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-primary rounded-tr-md"></div>
                <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-primary rounded-bl-md"></div>
                <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-primary rounded-br-md"></div>
                
                <!-- Scanning Laser Line -->
                <div class="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent shadow-[0_0_8px_#0EA5E9] animate-scan"></div>
              </div>
              
              <div class="bg-black/60 flex-grow"></div>
            </div>

            <div class="bg-black/60 flex-grow flex flex-col items-center justify-center q-pt-md">
              <p class="text-xs text-brand-primary font-bold uppercase tracking-wider animate-pulse q-mt-sm">
                Pozicionáld a QR kódot a keretbe
              </p>
            </div>
          </div>

        </div>

        <!-- Alsó funkciósáv -->
        <div class="bg-[#0B0F19] border-t border-white/5 q-py-lg text-center flex items-center justify-center gap-6 relative z-20">
          <q-btn outline color="slate-500" label="Galériából" icon="image" class="px-4 text-xs font-bold rounded-xl text-slate-300" dark style="height: 48px;" />
          <q-btn outline color="slate-500" label="Mégse" class="px-4 text-xs font-bold rounded-xl text-slate-300" dark style="height: 48px;" @click="closeQrScanner" />
        </div>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import headerDarkLogo from 'src/assets/eventjoy_header_dark_240.png';
import headerLightLogo from 'src/assets/eventjoy_header_light_240.png';
import { BRAND_MODULES } from 'src/assets/brand';
import MessagesMenu from 'src/components/layout/MessagesMenu.vue';
import NowPlayingBar from 'src/components/layout/NowPlayingBar.vue';

const klubhubIcon = BRAND_MODULES.klubhub.icon;

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const tab = ref('home');

const footerVisible = ref(true);

// QR Scanner state
const qrScannerOpen = ref(false);
const showMockScanner = ref(false);
const videoStream = ref<MediaStream | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const flashOn = ref(false);

// Handle Swipe on the Now Playing Bar
function handleSwipe(info: any) {
  if (info.direction === 'down') {
    footerVisible.value = false;
  } else if (info.direction === 'up') {
    footerVisible.value = true;
  }
}

// Alapértelmezetten bekapcsoljuk a sötét módot, hogy a sötét téma érvényesüljön
$q.dark.set(true);

// Szinkronizáljuk az útvonalat az alsó menüpontok aktív állapotával
watch(() => route.path, (path) => {
  if (path === '/') tab.value = 'home';
  else if (path === '/my-events') tab.value = 'my_events';
  else if (path === '/profile') tab.value = 'profile';
      else if (path === '/klubhub' || path === '/communities') tab.value = 'klubhub';
  else tab.value = '';
}, { immediate: true });

const headerLogo = computed(() => {
  return $q.dark.isActive ? headerDarkLogo : headerLightLogo;
});

// QR Code Scanner actions
async function openQrScanner() {
  qrScannerOpen.value = true;
  showMockScanner.value = false;
  flashOn.value = false;
  
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      videoStream.value = stream;
      setTimeout(() => {
        if (videoRef.value) {
          videoRef.value.srcObject = stream;
        }
      }, 150);
    } else {
      showMockScanner.value = true;
    }
  } catch (e) {
    console.warn('Camera access failed, falling back to mock scanner:', e);
    showMockScanner.value = true;
  }
}

function closeQrScanner() {
  qrScannerOpen.value = false;
  if (videoStream.value) {
    videoStream.value.getTracks().forEach(track => track.stop());
    videoStream.value = null;
  }
}

function toggleFlash() {
  if (!videoStream.value) return;
  const track = videoStream.value.getVideoTracks()[0];
  if (track) {
    const capabilities = track.getCapabilities() as any;
    if (capabilities.torch) {
      flashOn.value = !flashOn.value;
      track.applyConstraints({
        advanced: [{ torch: flashOn.value } as any]
      });
    } else {
      $q.notify({
        message: 'A vaku nem támogatott ezen a készüléken!',
        color: 'warning',
        position: 'top',
        timeout: 2000
      });
    }
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('AudioContext failed:', e);
  }
}

// Sikeres beolvasás szimulálása 3.5 másodperc után
let scanTimeout: any = null;
watch(qrScannerOpen, (val) => {
  if (val) {
    scanTimeout = setTimeout(() => {
      playBeep();
      closeQrScanner();
      $q.notify({
        message: 'QR kód sikeresen beolvasva: OlimPub Asztal #4',
        color: 'brand-primary',
        textColor: 'brand-dark',
        icon: 'check_circle',
        position: 'top',
        timeout: 3000
      });
    }, 3500);
  } else {
    clearTimeout(scanTimeout);
  }
});
</script>

<style lang="scss">
.q-footer {
  .q-tab__icon {
    font-size: 22px;
  }
  .q-tab__label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tab-klubhub {
    .q-tab__content {
      padding-top: 2px;
    }

    .tab-klubhub__icon {
      width: 30px;
      height: 30px;
      object-fit: contain;
      display: block;
      margin: 0 auto 1px;
      border-radius: 7px;
      flex-shrink: 0;
    }
  }

  .q-tab--active.tab-klubhub .tab-klubhub__icon {
    filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.65));
  }
}

/* QR Lézerszkennelő animáció */
@keyframes scan-laser {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}
.animate-scan {
  position: absolute;
  animation: scan-laser 3s ease-in-out infinite;
}
</style>
