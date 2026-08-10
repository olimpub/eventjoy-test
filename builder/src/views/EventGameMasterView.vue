<template>
  <div
    class="flex flex-col min-h-screen w-full text-white pb-32 selection:bg-white/30 overflow-x-hidden transition-colors duration-500"
    :style="{
      backgroundColor: event.theme.dark,
      '--event-primary': event.theme.primary,
      '--event-dark': event.theme.dark,
      '--event-accent': event.theme.accent
    }"
  >
    <!-- Hero Header (Extra compact 120px) - COPIED FROM RESULTS -->
    <div class="relative h-[120px] w-full group overflow-hidden">
      <!-- Overlays -->
      <div class="absolute inset-0 bg-gradient-to-t from-[var(--event-dark)] via-[var(--event-dark)]/30 to-transparent"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-[var(--event-dark)]/50 via-transparent to-transparent h-14"></div>

      <!-- Back Button -->
      <button
        @click="$router.back()"
        class="absolute top-3 left-6 w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 active:scale-90 transition-all z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Share Button -->
      <button class="absolute top-3 right-6 w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 active:scale-90 transition-all z-20">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      <!-- Centered Logo -->
      <div class="absolute top-2 left-1/2 -translate-x-1/2 h-16 w-32 flex items-center justify-center z-20">
        <img :src="event.logo" :alt="event.title" class="w-full h-full object-contain drop-shadow-2xl" />
      </div>

      <!-- Status Badge (UPDATED), Toggle & Profile -->
      <div class="absolute bottom-2 left-6 right-6 flex items-center justify-between gap-2 z-10">
        <span class="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transition-colors"
          :style="{ backgroundColor: event.theme.primary, color: event.theme.dark }">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: event.theme.dark }"></span>
          1. forduló
        </span>

        <button
          @click="isDetailsExpanded = !isDetailsExpanded"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white"
        >
          {{ isDetailsExpanded ? 'Elrejtés' : 'Részletek' }}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transition-transform duration-300" :class="isDetailsExpanded ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1">
          <span class="text-[10px] font-bold text-white uppercase tracking-wider">Kovács János</span>
          <div class="w-6 h-6 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan border border-brand-cyan/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-6 mt-4 relative z-10">
      <!-- Collapsible Title Header -->
      <div
        class="mb-6 overflow-hidden transition-all duration-500 ease-in-out"
        :class="isDetailsExpanded ? 'max-h-[200px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'"
      >
        <div class="bg-white/5 rounded-3xl p-5 border border-white/10 backdrop-blur-md">
          <h1 class="text-3xl font-black leading-[1.1] text-white tracking-tighter mb-3">{{ event.title }}</h1>
          <div class="space-y-2 text-xs font-bold text-white/70">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: event.theme.primary }">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ event.date }} • {{ event.time }}
            </div>
          </div>
        </div>
      </div>

      <!-- Table Selector Section -->
      <section v-if="!selectedTable" class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-1.5 h-6 rounded-full" :style="{ backgroundColor: event.theme.primary }"></div>
          <span class="text-lg font-black uppercase tracking-wider text-white/90">Asztal választás</span>
        </div>

        <div class="grid grid-cols-4 gap-3">
          <button
            v-for="table in tables"
            :key="table.id"
            @click="selectTable(table.id)"
            class="aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-90 relative overflow-hidden group bg-white/5"
            :class="[
              selectedTable === table.id
                ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20'
                : 'border-white/10 text-white/40 hover:border-white/20',
            ]"
          >
            <!-- Subtle Status Indicator (Top-right corner) -->
            <div
              v-if="table.status !== 'pending'"
              class="absolute top-2 right-2 w-2.5 h-2.5 rounded-full shadow-sm"
              :class="table.status === 'ongoing' ? 'bg-amber-400 animate-pulse' : 'bg-green-500'"
            ></div>

            <!-- Table Info -->
            <span class="text-[9px] font-black uppercase tracking-tighter mb-0.5 opacity-30">Asztal</span>
            <span
              class="text-2xl font-black leading-none transition-colors"
              :class="selectedTable === table.id ? 'text-white' : 'text-white/60'"
            >
              {{ table.id }}
            </span>

            <!-- Status text (Optional, very small) -->
            <span
              v-if="table.status !== 'pending'"
              class="absolute bottom-2 text-[7px] font-black uppercase tracking-widest"
              :class="table.status === 'ongoing' ? 'text-amber-400/60' : 'text-green-500/60'"
            >
              {{ table.status === 'ongoing' ? 'Játék' : 'Kész' }}
            </span>
          </button>
        </div>
      </section>

      <!-- Record Results Page -->
      <div v-if="selectedTable" class="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
        <!-- Close button for the page -->
        <button
          @click="selectedTable = null"
          class="absolute top-4 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/40 active:scale-90 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan border border-brand-cyan/30">
              <span class="text-2xl font-black">{{ selectedTable }}</span>
            </div>
            <div>
              <h3 class="text-xl font-black uppercase tracking-tight text-white">Eredmények rögzítése</h3>
              <p class="text-xs font-bold text-white/40 uppercase tracking-widest">1. forduló • {{ selectedTable }}. asztal</p>
            </div>
          </div>

          <div class="relative">
            <button
              @click="handlePhoto"
              class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 active:scale-90 transition-all hover:border-brand-cyan/50 hover:text-brand-cyan group"
              :disabled="isGenerating"
              title="Fotó készítése"
            >
              <div v-if="isGenerating" class="w-5 h-5 border-2 border-t-brand-cyan border-white/10 rounded-full animate-spin"></div>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Players List -->
        <div class="space-y-4 mb-8">
          <div v-for="(player, index) in playerResults" :key="player.id"
            draggable="true"
            @dragstart="onDragStart(index)"
            @dragover.prevent
            @drop="onDrop(index)"
            class="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5 transition-all hover:bg-white/10"
            :class="draggedIndex === index ? 'opacity-40 grayscale scale-95' : ''"
          >
            <!-- Valid Checkmark / Drag Handle -->
            <div class="w-8 flex items-center justify-center shrink-0 cursor-move">
              <div v-if="parseInt(player.prize) >= 1 && parseInt(player.prize) <= 70" class="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div v-else class="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                </svg>
              </div>
            </div>

            <!-- Player Badge with Color Background -->
            <div class="flex-1 min-w-0 relative">
              <div
                class="h-10 px-4 rounded-xl flex items-center justify-between gap-2 shadow-lg"
                :style="{ backgroundColor: player.color }"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-widest truncate"
                  :class="player.color === '#FFF76A' ? 'text-[#2c2e32]' : 'text-white'"
                >
                  {{ player.name }}
                </span>

                <!-- Rank indicator -->
                <div v-if="player.rank > 0 && player.prize !== ''" class="w-5 h-5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center shadow-sm relative shrink-0">
                   {{ player.rank }}
                   <span v-if="player.hasTie" class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] animate-pulse">!</span>
                </div>
              </div>
            </div>

            <!-- Inputs -->
            <div class="flex gap-2">
              <div class="w-16">
                <input
                  type="text"
                  v-model="player.prize"
                  @blur="autoSort"
                  placeholder="1-70"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-center font-black text-brand-cyan focus:outline-none focus:border-brand-cyan/50 transition-colors text-xs placeholder:text-white/5"
                />
                <span
                  class="block text-[7px] font-black uppercase text-center mt-1 transition-opacity duration-300"
                  :class="player.prize !== '' ? 'text-white/40' : 'text-white/10'"
                >
                  Nyeremény
                </span>
              </div>
              <div class="w-16">
                <input
                  type="text"
                  v-model="player.truck"
                  @blur="autoSort"
                  placeholder="0-12"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-center font-black text-brand-accent focus:outline-none focus:border-brand-accent/50 transition-colors text-xs placeholder:text-white/5"
                />
                <span
                  class="block text-[7px] font-black uppercase text-center mt-1 transition-opacity duration-300"
                  :class="player.truck !== '' ? 'text-white/40' : 'text-white/10'"
                >
                  Kamion
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <button
          v-if="isAllValid"
          @click="handleSave"
          class="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all hover:brightness-110 animate-in fade-in slide-in-from-bottom-2"
          :style="{
            backgroundColor: event.theme.primary,
            color: event.theme.dark,
            boxShadow: `0 15px 30px -5px ${event.theme.primary}60`
          }">
          Mentés
        </button>
        <button
          v-else
          disabled
          class="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
        >
          Adatok kitöltése szükséges
        </button>
      </div>
    </div>

    <!-- Custom Modal Overlay -->
    <div
      v-if="modal.show"
      class="fixed inset-0 z-[100] flex items-center justify-center px-6"
    >
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="modal.show = false"
      ></div>
      <div class="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
        <div class="flex flex-col items-center text-center">
          <!-- Icon -->
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            :class="modal.type === 'alert' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'"
          >
            <svg v-if="modal.type === 'alert'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 class="text-xl font-black text-white uppercase tracking-tight mb-2">{{ modal.title }}</h3>
          <p class="text-sm text-white/60 mb-8">{{ modal.message }}</p>

          <div class="flex gap-3 w-full">
            <button
              v-if="modal.type === 'confirm'"
              @click="modal.show = false"
              class="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs active:scale-95 transition-all"
            >
              Mégse
            </button>
            <button
              @click="modal.onConfirm"
              class="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
              :class="modal.type === 'alert' ? 'bg-amber-500 text-brand-dark' : 'bg-brand-cyan text-brand-dark'"
            >
              {{ modal.type === 'alert' ? 'Értem' : 'Rendben' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const eventId = computed(() => route.params.id)
const isDetailsExpanded = ref(false)
const selectedTable = ref<number | null>(null)
const isGenerating = ref(false)

interface Player {
  id: number
  color: string
  name: string
  prize: string
  truck: string
  rank: number
  hasTie: boolean
}

const playerResults = ref<Player[]>([
  { id: 1, color: '#FF6060', name: 'Piros Géza', prize: '', truck: '', rank: 0, hasTie: false },
  { id: 2, color: '#28C76F', name: 'Zöld Feri', prize: '', truck: '', rank: 0, hasTie: false },
  { id: 3, color: '#2AA9FF', name: 'Kék Viola', prize: '', truck: '', rank: 0, hasTie: false },
  { id: 4, color: '#FFF76A', name: 'Sárga Rózsa', prize: '', truck: '', rank: 0, hasTie: false }
])

const isAllValid = computed(() => {
  return playerResults.value.every(p => {
    const pVal = parseInt(p.prize)
    const tVal = p.truck === '' ? 0 : parseInt(p.truck)
    return !isNaN(pVal) && pVal >= 1 && pVal <= 70 && !isNaN(tVal) && tVal >= 0 && tVal <= 12
  })
})

const calculateRanks = () => {
  for (let i = 0; i < playerResults.value.length; i++) {
    const current = playerResults.value[i]
    let tie = false

    const pVal = parseInt(current.prize) || 0
    const tVal = current.truck === '' ? 0 : (parseInt(current.truck) || 0)

    if (i > 0) {
      const prev = playerResults.value[i - 1]
      const prevP = parseInt(prev.prize) || 0
      const prevT = prev.truck === '' ? 0 : (parseInt(prev.truck) || 0)
      if (prevP === pVal && prevT === tVal) tie = true
    }
    if (i < playerResults.value.length - 1) {
      const next = playerResults.value[i + 1]
      const nextP = parseInt(next.prize) || 0
      const nextT = next.truck === '' ? 0 : (parseInt(next.truck) || 0)
      if (nextP === pVal && nextT === tVal) tie = true
    }

    current.rank = i + 1
    current.hasTie = tie
  }
}

const autoSort = () => {
  // Sort by Prize DESC, then Truck DESC initially
  playerResults.value.sort((a, b) => {
    const aP = parseInt(a.prize) || 0
    const bP = parseInt(b.prize) || 0
    const aT = a.truck === '' ? 0 : (parseInt(a.truck) || 0)
    const bT = b.truck === '' ? 0 : (parseInt(b.truck) || 0)
    return bP - aP || bT - aT
  })
  calculateRanks()
}

const selectTable = (id: number) => {
  playerResults.value.forEach(p => {
    p.prize = ''
    p.truck = ''
    p.rank = 0
    p.hasTie = false
  })
  selectedTable.value = id
}

const handlePhoto = () => {
  if (isGenerating.value) return
  isGenerating.value = true
  setTimeout(() => {
    playerResults.value.forEach(p => {
      p.prize = (Math.floor(Math.random() * 70) + 1).toString()
      p.truck = Math.floor(Math.random() * 13).toString()
    })
    autoSort()
    isGenerating.value = false
  }, 1500)
}

const draggedIndex = ref<number | null>(null)
const onDragStart = (index: number) => { draggedIndex.value = index }
const onDrop = (index: number) => {
  if (draggedIndex.value === null) return
  const item = playerResults.value.splice(draggedIndex.value, 1)[0]
  playerResults.value.splice(index, 0, item)
  draggedIndex.value = null
  calculateRanks()
}

// Modal State
interface ModalState {
  show: boolean
  title: string
  message: string
  type: 'alert' | 'confirm'
  onConfirm: () => void
}

const modal = ref<ModalState>({
  show: false,
  title: '',
  message: '',
  type: 'alert',
  onConfirm: () => {}
})

const showAlert = (title: string, message: string) => {
  modal.value = {
    show: true,
    title,
    message,
    type: 'alert',
    onConfirm: () => { modal.value.show = false }
  }
}

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  modal.value = {
    show: true,
    title,
    message,
    type: 'confirm',
    onConfirm: () => {
      onConfirm()
      modal.value.show = false
    }
  }
}

const handleSave = () => {
  if (!isAllValid.value) return

  // 1. Check if order is correct based on priority (Prize then Truck)
  for (let i = 0; i < playerResults.value.length - 1; i++) {
    const cur = playerResults.value[i]
    const nxt = playerResults.value[i + 1]

    const curP = parseInt(cur.prize) || 0
    const curT = cur.truck === '' ? 0 : (parseInt(cur.truck) || 0)
    const nxtP = parseInt(nxt.prize) || 0
    const nxtT = nxt.truck === '' ? 0 : (parseInt(nxt.truck) || 0)

    // Incorrect if current is lower than next
    if (curP < nxtP || (curP === nxtP && curT < nxtT)) {
      showAlert('Figyelem!', 'A sorrend a nyeremények alapján helytelen.')
      return
    }
  }

  // 2. Check for ties in Prize specifically
  let hasTieInPrize = false
  for (let i = 1; i < playerResults.value.length; i++) {
    const p1 = parseInt(playerResults.value[i-1].prize) || 0
    const p2 = parseInt(playerResults.value[i].prize) || 0
    if (p1 === p2) {
      hasTieInPrize = true
      break
    }
  }

  if (hasTieInPrize) {
    showConfirm('Megerősítés', 'Több azonos pontszámmal rendelkező versenyző van, biztos helyes a sorrend?', () => {
      selectedTable.value = null
    })
  } else {
    // Success: Save and close
    selectedTable.value = null
  }
}

const eventsData: Record<string | number, any> = {
  '1': {
    id: 1,
    title: 'Interaktív Kvíz Est',
    theme: {
      primary: '#00B1E9',
      dark: '#303A52',
      accent: '#FFF76A'
    }
  },
  '2': {
    id: 2,
    title: 'Regionális bajnokság',
    location: 'Vác',
    date: '2024. Október 28.',
    time: 'Hétfő • 10:00 - 18:00',
    logo: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F02405f1e35404f04be1445d02c616fed?format=webp&width=800&height=1200',
    theme: {
      primary: '#f68b29',
      dark: '#2c2e32',
      accent: '#ffffff'
    }
  }
}

const event = computed(() => eventsData[eventId.value as string] || eventsData['1'])

const tables = ref(Array.from({ length: 20 }, (_, i) => {
  const id = i + 1
  // Status: ongoing (yellow) for 1, 5, 9, 13...
  // Status: completed (green) for 2, 6, 10, 14...
  // Status: pending (default) for others
  const status = id % 4 === 1 ? 'ongoing' : (id % 4 === 2 ? 'completed' : 'pending')
  return { id, status }
}))
</script>

<style scoped>
.text-brand-dark { color: #2c2e32; }
.bg-brand-cyan { background-color: #00B1E9; }
.text-brand-cyan { color: #00B1E9; }
.border-brand-cyan { border-color: #00B1E9; }
</style>
