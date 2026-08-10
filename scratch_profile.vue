<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden flex flex-col h-full">
    <!-- View: MENU -->
    <div v-if="activeView === 'menu'" class="q-pa-md flex flex-col h-full overflow-y-auto no-scrollbar">
      <!-- Premium Profile Header -->
      <div class="profile-card text-center q-pt-lg q-pb-md q-px-md flex flex-col items-center justify-center relative overflow-hidden">
        <div class="avatar-glow absolute w-24 h-24 bg-brand-primary/20 rounded-full blur-xl pointer-events-none"></div>
        
        <q-avatar size="80px" class="bg-[#0F172A] text-brand-primary border-2 border-brand-primary/30 shadow-[0_4px_20px_rgba(14,165,233,0.25)] z-10">
          <q-icon v-if="!authStore.user?.LastName && !authStore.user?.FirstName" name="person" size="48px" />
          <span v-else class="text-3xl font-black">{{ (authStore.user?.LastName?.charAt(0) || '') + (authStore.user?.FirstName?.charAt(0) || '') }}</span>
        </q-avatar>
        
        <h2 class="text-xl font-black text-white tracking-wide q-mt-md q-mb-xs z-10">
          {{ authStore.user?.LastName || '' }} {{ authStore.user?.FirstName || 'Felhasználó' }}
        </h2>
        <p class="text-xs text-slate-400 font-medium z-10">{{ authStore.user?.Email || '' }}</p>
      </div>

      <!-- Menu List -->
      <div class="menu-container q-mt-md flex-grow">
        <q-list class="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden p-2 shadow-2xl backdrop-blur-md">
          
          <!-- 1. Adataim -->
          <q-item clickable v-ripple class="menu-item q-py-md q-px-md rounded-2xl" @click="activeView = 'adataim'">
            <q-item-section avatar>
              <div class="icon-wrap bg-brand-primary/10 border border-brand-primary/20">
                <q-icon name="badge" color="brand-primary" size="20px" />
              </div>
            </q-item-section>
            <q-item-section class="font-bold text-slate-200 text-sm tracking-wide">Adataim</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="arrow-icon" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <!-- 2. Preferenciák -->
          <q-item clickable v-ripple class="menu-item q-py-md q-px-md rounded-2xl" @click="activeView = 'preferenciak'">
            <q-item-section avatar>
              <div class="icon-wrap bg-brand-primary/10 border border-brand-primary/20">
                <q-icon name="favorite_border" color="brand-primary" size="20px" />
              </div>
            </q-item-section>
            <q-item-section class="font-bold text-slate-200 text-sm tracking-wide">Preferenciák</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="arrow-icon" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <!-- 3. Beállítások -->
          <q-item clickable v-ripple class="menu-item q-py-md q-px-md rounded-2xl" @click="activeView = 'beallitasok'">
            <q-item-section avatar>
              <div class="icon-wrap bg-brand-primary/10 border border-brand-primary/20">
                <q-icon name="settings" color="brand-primary" size="20px" />
              </div>
            </q-item-section>
            <q-item-section class="font-bold text-slate-200 text-sm tracking-wide">Beállítások</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="arrow-icon" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <!-- 4. QR-kód olvasó -->
          <q-item clickable v-ripple class="menu-item q-py-md q-px-md rounded-2xl" @click="openQrScanner">
            <q-item-section avatar>
              <div class="icon-wrap bg-emerald-500/10 border border-emerald-500/20">
                <q-icon name="qr_code_scanner" color="emerald-400" size="20px" />
              </div>
            </q-item-section>
            <q-item-section class="font-bold text-slate-200 text-sm tracking-wide">QR-kód olvasó</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="arrow-icon" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <!-- 5. Kijelentkezés -->
          <q-item clickable v-ripple class="menu-item logout-item q-py-md q-px-md rounded-2xl" @click="logout">
            <q-item-section avatar>
              <div class="icon-wrap bg-rose-500/10 border border-rose-500/20">
                <q-icon name="logout" color="rose-400" size="20px" />
              </div>
            </q-item-section>
            <q-item-section class="font-bold text-rose-400 text-sm tracking-wide">Kijelentkezés</q-item-section>
          </q-item>

        </q-list>
      </div>
    </div>

    <!-- View: ADATAIM -->
    <div v-else-if="activeView === 'adataim'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-[#0B0F19] border-b border-white/5 q-py-sm z-20">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-white" />
        <q-toolbar-title class="font-bold text-base uppercase tracking-wider text-center pr-10">Adataim</q-toolbar-title>
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <!-- Személyes adatok kártya -->
        <div class="mb-6 rounded-[24px] bg-[#1E293B]/70 border border-white/5 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
          <h3 class="text-sm font-black text-brand-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <q-icon name="person" size="18px" /> Személyes Adatok
          </h3>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Vezetéknév</div>
              <div class="text-slate-200 font-medium bg-slate-900/50 px-4 py-3 rounded-xl border border-white/5">{{ authStore.user?.LastName || '-' }}</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Keresztnév</div>
              <div class="text-slate-200 font-medium bg-slate-900/50 px-4 py-3 rounded-xl border border-white/5">{{ authStore.user?.FirstName || '-' }}</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">E-mail cím</div>
              <div class="text-slate-200 font-medium bg-slate-900/50 px-4 py-3 rounded-xl border border-white/5">{{ authStore.user?.Email || '-' }}</div>
            </div>
          </div>
        </div>

        <!-- Számlázási címek -->
        <div class="mb-6 rounded-[24px] bg-[#1E293B]/70 border border-white/5 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 m-0">
              <q-icon name="receipt_long" size="18px" /> Számlázási címek
            </h3>
            <q-btn round flat dense icon="add_circle" color="emerald-400" />
          </div>
          <div v-if="authStore.billingAddress && authStore.billingAddress.length > 0" class="flex flex-col gap-3">
            <div v-for="(addr, idx) in authStore.billingAddress" :key="idx" class="bg-slate-900/50 p-4 rounded-xl border border-white/5 relative">
              <q-btn flat round dense icon="edit" size="sm" class="absolute top-2 right-2 text-slate-500 hover:text-emerald-400" />
              <div class="font-bold text-slate-200 mb-1">{{ addr.Name || addr.City }}</div>
              <div class="text-xs text-slate-400">{{ addr.ZipCode }} {{ addr.City }}, {{ addr.Address }}</div>
              <div class="text-xs text-slate-500 mt-1" v-if="addr.TaxNumber">Adószám: {{ addr.TaxNumber }}</div>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-xl">
            Nincs rögzített számlázási cím
          </div>
        </div>

        <!-- Alternatív Elérhetőségek (Login Identifiers) -->
        <div class="mb-6 rounded-[24px] bg-[#1E293B]/70 border border-white/5 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 m-0">
              <q-icon name="contact_phone" size="18px" /> Elérhetőségek
            </h3>
            <q-btn round flat dense icon="add_circle" color="amber-400" />
          </div>
          <div v-if="authStore.loginIdentifiers && authStore.loginIdentifiers.length > 0" class="flex flex-col gap-3">
            <div v-for="(ident, idx) in authStore.loginIdentifiers" :key="idx" class="flex items-center justify-between bg-slate-900/50 px-4 py-3 rounded-xl border border-white/5">
              <div class="flex items-center gap-3">
                <q-icon :name="ident.Type === 'phone' ? 'phone' : 'email'" color="slate-400" size="20px" />
                <div>
                  <div class="text-slate-200 font-medium text-sm">{{ ident.Value }}</div>
                </div>
              </div>
              <q-btn flat round dense icon="delete_outline" size="sm" color="rose-400" />
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-xl">
            Nincs rögzített alternatív elérhetőség
          </div>
        </div>

      </div>
    </div>

    <!-- View: PREFERENCIÁK -->
    <div v-else-if="activeView === 'preferenciak'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-[#0B0F19] border-b border-white/5 q-py-sm z-20">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-white" />
        <q-toolbar-title class="font-bold text-base uppercase tracking-wider text-center pr-10">Preferenciák</q-toolbar-title>
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <div class="text-center mb-6 mt-2">
          <q-icon name="magic_button" size="40px" class="text-brand-primary mb-2 opacity-80" />
          <h2 class="text-lg font-black text-white">Érdeklődési körök</h2>
          <p class="text-xs text-slate-400 mt-1">Válaszd ki azokat a kategóriákat és címkéket, amelyek érdekelnek, hogy személyre szabott eseményeket ajánlhassunk!</p>
        </div>

        <!-- Event Types -->
        <div class="mb-8">
          <h3 class="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 pl-2">Esemény Típusok</h3>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="type in masterDataStore.eventTypes" 
              :key="'type_'+type.id"
              @click="togglePreference('type', type.id)"
              class="cursor-pointer font-bold px-[16px] py-[8px] rounded-[16px] text-[12px] tracking-wide transition-all duration-300"
              :class="isPreferred('type', type.id) ? 'bg-brand-primary text-white shadow-[0_0_15px_rgba(14,165,233,0.5)] border-brand-primary' : 'bg-[#1E293B] text-slate-400 border-white/5 hover:bg-white/10'"
              style="border-width: 1px; border-style: solid;"
            >
              {{ type.TypeName || type.Name }}
            </div>
          </div>
        </div>

        <!-- Labels -->
        <div class="mb-4">
          <h3 class="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 pl-2">Címkék & Témák</h3>
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="label in masterDataStore.labels" 
              :key="'label_'+label.id"
              @click="togglePreference('label', label.id)"
              class="cursor-pointer font-bold px-[16px] py-[8px] rounded-[16px] text-[12px] tracking-wide transition-all duration-300"
              :class="isPreferred('label', label.id) ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border-indigo-500' : 'bg-[#1E293B] text-slate-400 border-white/5 hover:bg-white/10'"
              style="border-width: 1px; border-style: solid;"
            >
              {{ label.LabelName || label.Name }}
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- View: BEÁLLÍTÁSOK -->
    <div v-else-if="activeView === 'beallitasok'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-[#0B0F19] border-b border-white/5 q-py-sm z-20">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-white" />
        <q-toolbar-title class="font-bold text-base uppercase tracking-wider text-center pr-10">Beállítások</q-toolbar-title>
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <q-list class="bg-[#1E293B]/70 border border-white/5 rounded-[24px] overflow-hidden p-2 shadow-lg backdrop-blur-md">
          <q-item tag="label" v-ripple class="q-py-md rounded-xl">
            <q-item-section>
              <q-item-label class="text-white font-bold">Értesítések engedélyezése</q-item-label>
              <q-item-label caption class="text-slate-400">Push értesítések küldése az eszközre</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="mockSettings.pushEnabled" />
            </q-item-section>
          </q-item>
          
          <div class="menu-divider"></div>
          
          <q-item tag="label" v-ripple class="q-py-md rounded-xl">
            <q-item-section>
              <q-item-label class="text-white font-bold">E-mail hírlevél</q-item-label>
              <q-item-label caption class="text-slate-400">Heti összefoglaló a közelgő eseményekről</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="mockSettings.emailEnabled" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <q-item tag="label" v-ripple class="q-py-md rounded-xl">
            <q-item-section>
              <q-item-label class="text-white font-bold">Sötét mód</q-item-label>
              <q-item-label caption class="text-slate-400">Alkalmazás megjelenése</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="indigo-500" v-model="mockSettings.darkMode" disable />
            </q-item-section>
          </q-item>
        </q-list>
        
        <div class="text-center mt-6">
          <q-btn unelevated color="brand-primary" text-color="white" label="Beállítások mentése" class="rounded-xl px-8 font-bold" />
        </div>

      </div>
    </div>


    <!-- QR Kód Olvasó Modális ablak -->
    <q-dialog v-model="qrScannerOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-[#020617] text-white flex flex-col justify-between" style="width: 100vw; height: 100vh;">
        <!-- Top Toolbar -->
        <q-toolbar class="bg-[#0B0F19] border-b border-white/5 q-py-sm z-20">
          <q-btn flat round dense icon="close" size="lg" @click="qrScannerOpen = false" class="text-white" />
          <q-toolbar-title class="text-center font-bold text-base uppercase tracking-wider">
            QR Kód Beolvasása
          </q-toolbar-title>
          <q-btn flat round dense icon="flash_on" size="md" class="text-white opacity-50" />
        </q-toolbar>

        <!-- Scanner Viewport Area -->
        <div class="flex-grow relative flex items-center justify-center overflow-hidden bg-black">
          
          <!-- Szimulált radar/mátrix (ha nincs kameraelérés) -->
          <div class="absolute inset-0 flex flex-col items-center justify-center q-pa-lg text-center bg-slate-950">
            <q-icon name="photo_camera" size="80px" class="text-slate-600 q-mb-md animate-pulse" />
            <div class="text-lg font-bold text-slate-300">Kamera aktiválása...</div>
            <div class="text-xs text-slate-500 q-mt-sm max-w-xs">
              Irányítsd a kamerát a QR kódra a beolvasáshoz.
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
            
            <div class="bg-black/60 flex-grow flex items-center justify-center">
              <div class="text-white/70 text-sm font-bold tracking-widest uppercase bg-black/50 px-6 py-2 rounded-full backdrop-blur-md">
                Keresés...
              </div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuthStore } from 'src/stores/auth';
import { useMasterDataStore } from 'src/stores/masterData';
import { useEventStore } from 'src/stores/event';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const masterDataStore = useMasterDataStore();
const eventStore = useEventStore();
const router = useRouter();

type ViewState = 'menu' | 'adataim' | 'preferenciak' | 'beallitasok';
const activeView = ref<ViewState>('menu');
const qrScannerOpen = ref(false);

const mockSettings = reactive({
  pushEnabled: true,
  emailEnabled: false,
  darkMode: true
});

function logout() {
  authStore.logout();
  router.push('/login');
}

function openQrScanner() {
  qrScannerOpen.value = true;
}

// Preferenciák kezelése (Vizuális szimuláció a UI-hoz, a store-ban valószínűleg API hívás is kellene)
const localTypePrefs = ref<number[]>(authStore.eventTypePreferences || []);
const localLabelPrefs = ref<number[]>(authStore.labelPreferences || []);

function isPreferred(category: 'type' | 'label', id: number) {
  if (category === 'type') return localTypePrefs.value.includes(id);
  if (category === 'label') return localLabelPrefs.value.includes(id);
  return false;
}

function togglePreference(category: 'type' | 'label', id: number) {
  const arr = category === 'type' ? localTypePrefs.value : localLabelPrefs.value;
  const index = arr.indexOf(id);
  if (index === -1) {
    arr.push(id);
  } else {
    arr.splice(index, 1);
  }
}
</script>

<style scoped lang="scss">
.profile-card {
  border-radius: 2rem;
  background: radial-gradient(circle at top, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
}

.icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.menu-item {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.03);
    
    .icon-wrap {
      transform: scale(1.05);
      background-color: rgba(14, 165, 233, 0.18);
    }
    
    .arrow-icon {
      transform: translateX(3px);
      color: var(--q-primary) !important;
    }
  }
}

.logout-item {
  &:hover {
    background-color: rgba(239, 68, 68, 0.05);
    
    .icon-wrap {
      background-color: rgba(239, 68, 68, 0.18);
    }
  }
}

.menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03) 10%, rgba(255, 255, 255, 0.03) 90%, transparent);
  margin: 2px 8px;
}

@keyframes scan {
  0%, 100% { top: 0; opacity: 0; }
  10%, 90% { opacity: 1; }
  50% { top: 100%; opacity: 1; }
}
.animate-scan {
  animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
