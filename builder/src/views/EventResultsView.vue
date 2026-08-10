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
    <!-- Hero Header (Extra compact 120px) -->
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

      <!-- Status Badge, Toggle & Profile -->
      <div class="absolute bottom-2 left-6 right-6 flex items-center justify-between gap-2 z-10">
        <span class="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transition-colors"
          :style="{ backgroundColor: event.theme.primary, color: event.theme.dark }">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: event.theme.dark }"></span>
          Játék
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
        class="mb-2 overflow-hidden transition-all duration-500 ease-in-out"
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

      <!-- Summary Stats (Total Score & Rank) -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <!-- Total Score -->
        <div class="bg-white/5 border border-white/10 rounded-[2rem] p-4 backdrop-blur-md flex items-center gap-4">
          <div class="w-12 h-12 flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
            <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F3a7ae3260b1b4b83959336402dbcae12?format=webp&width=800&height=1200" alt="Total Score" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Pontszám</span>
            <span class="text-xl font-black text-white">89 e</span>
          </div>
        </div>

        <!-- Total Rank -->
        <div class="bg-white/5 border border-white/10 rounded-[2rem] p-4 backdrop-blur-md flex items-center gap-4">
          <div class="w-12 h-12 flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
            <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F4911b503290e438cb556b1335b181afe?format=webp&width=800&height=1200" alt="Total Rank" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Helyezés</span>
            <span class="text-xl font-black text-white">13</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mb-4">
        <div class="w-1.5 h-6 rounded-full" :style="{ backgroundColor: event.theme.primary }"></div>
        <span class="text-lg font-black uppercase tracking-wider text-white/90">Fordulók eredményei</span>
      </div>

      <!-- Rounds List with Results -->
      <section class="space-y-3">
        <div v-for="(round, index) in results" :key="index"
          class="bg-white/5 border border-white/10 rounded-[2rem] p-4 backdrop-blur-md relative overflow-hidden group"
        >
          <!-- Status Badge & Eredmény Button Overlay -->
          <div class="absolute top-4 right-6 flex items-center gap-2">
            <button
              v-if="round.status === 'lezárt'"
              @click="toggleResults(index)"
              class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-cyan text-brand-dark shadow-lg active:scale-95 transition-all"
            >
              Eredmény
            </button>
            <div class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
              :class="round.status === 'lezárt' ? 'bg-white/5 border-white/20 text-white/40' : 'bg-brand-cyan/20 border-brand-cyan/50 text-brand-cyan animate-pulse'">
              {{ round.status }}
            </div>
          </div>

          <!-- Header: Round Info -->
          <div class="flex items-center gap-4 mb-4">
            <div class="w-10 h-10 flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
              <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F421226f906dd4e389d8863934ee71f71?format=webp&width=800&height=1200" alt="Round" class="w-full h-full object-contain" />
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Forduló</span>
              <span class="text-xl font-black text-white">{{ round.number }}. forduló</span>
            </div>
          </div>

          <!-- Results Grid (Collapsible, only for completed rounds) -->
          <div
            v-if="round.status === 'lezárt'"
            class="overflow-hidden transition-all duration-500 ease-in-out"
            :class="round.isExpanded ? 'max-h-[200px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'"
          >
            <div class="grid grid-cols-3 gap-2">
              <!-- Rank -->
              <div class="bg-white/5 rounded-2xl p-3 flex flex-col items-center border border-white/5">
                <div class="w-8 h-8 mb-1.5">
                  <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F85ae4f01c38342a7a8e510e897aa499d?format=webp&width=800&height=1200" alt="Rank" class="w-full h-full object-contain" />
                </div>
                <span class="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Helyezés</span>
                <span class="text-lg font-black text-white">{{ round.rank }}</span>
              </div>

              <!-- Score (Nyeremény) -->
              <div class="bg-white/5 rounded-2xl p-3 flex flex-col items-center border border-white/5">
                <div class="w-8 h-8 mb-1.5">
                  <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F7cdf4d2099d84b8c9579a8bcf3e270cd?format=webp&width=800&height=1200" alt="Score" class="w-full h-full object-contain" />
                </div>
                <span class="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Pont</span>
                <span class="text-lg font-black text-white">{{ round.score }}</span>
              </div>

              <!-- Truck (Kamion) -->
              <div class="bg-white/5 rounded-2xl p-3 flex flex-col items-center border border-white/5">
                <div class="w-8 h-8 mb-1.5">
                  <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F9bf6e3074a084bf79a1f63d8955d556e?format=webp&width=800&height=1200" alt="Truck" class="w-full h-full object-contain" />
                </div>
                <span class="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Kamion</span>
                <span class="text-lg font-black text-white">{{ round.truck }}</span>
              </div>
            </div>
          </div>

          <!-- Pending State / Lottery Info (Round 3) -->
          <div v-else class="py-4 px-6 flex items-center justify-between bg-brand-cyan/5 rounded-[1.5rem] border border-brand-cyan/20 relative overflow-hidden group">
             <!-- Background Glow -->
             <div class="absolute -right-4 -top-4 w-20 h-20 blur-2xl opacity-10" :style="{ backgroundColor: round.colorCode }"></div>

             <div class="flex items-center gap-6">
               <!-- Table Info -->
               <div class="flex items-center gap-3">
                 <div class="w-10 h-10 flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
                   <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F4bd0029b216347de9a1f1fcdb529a4b9?format=webp&width=800&height=1200" alt="Table" class="w-full h-full object-contain" />
                 </div>
                 <div class="flex flex-col">
                   <span class="text-[8px] font-black uppercase tracking-widest text-white/30">Asztal</span>
                   <span class="text-lg font-black text-white">{{ round.table }}</span>
                 </div>
               </div>

               <div class="w-px h-8 bg-white/10"></div>

               <!-- Color Info -->
               <div class="flex flex-col items-center min-w-[50px]">
                 <span class="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Szín</span>
                 <div class="w-5 h-5 rounded-full shadow-lg" :style="{ backgroundColor: round.colorCode, boxShadow: `0 0 12px ${round.colorCode}60` }"></div>
               </div>
             </div>

             <!-- In-progress indicator -->
             <div class="flex flex-col items-end">
               <div class="flex items-center gap-1.5 mb-1">
                 <span class="w-1 h-1 rounded-full bg-brand-cyan animate-pulse"></span>
                 <span class="text-[9px] font-black uppercase tracking-widest text-brand-cyan">Játék alatt</span>
               </div>
               <div class="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                 <div class="h-full bg-brand-cyan animate-progress-fast w-1/3"></div>
               </div>
             </div>
          </div>
        </div>

        <!-- Inline Action Button -->
        <div class="pt-4 pb-10">
          <button
            @click="router.push(`/event/${eventId}/final`)"
            class="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all hover:brightness-110"
            :style="{
              backgroundColor: event.theme.primary,
              color: event.theme.dark,
              boxShadow: `0 15px 30px -5px ${event.theme.primary}60`
            }">
            Játék vége
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const eventId = computed(() => route.params.id)
const isDetailsExpanded = ref(false)

const eventsData: Record<string | number, any> = {
  '1': {
    id: 1,
    title: 'Interaktív Kvíz Est',
    location: 'Budapest, Akvárium',
    date: '2024. Október 25.',
    time: 'Péntek • 19:00 - 22:00',
    logo: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F6ee21380f7fd46cda013ce002104beb0?format=webp&width=100&height=100',
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

const results = ref([
  { number: 1, status: 'lezárt', rank: '1', score: '46e', truck: '4e', isExpanded: false, table: 12, colorCode: '#28C76F' },
  { number: 2, status: 'lezárt', rank: '3', score: '27e', truck: '0e', isExpanded: false, table: 8, colorCode: '#FF6060' },
  { number: 3, status: 'folyamatban', rank: '-', score: '-', truck: '-', isExpanded: false, table: 21, colorCode: '#2AA9FF' }
])

const toggleResults = (index: number) => {
  results.value[index].isExpanded = !results.value[index].isExpanded
}
</script>

<style scoped>
.text-brand-cyan { color: #00B1E9; }
.bg-brand-cyan\/20 { background-color: rgba(0, 177, 233, 0.2); }
.bg-brand-cyan\/5 { background-color: rgba(0, 177, 233, 0.05); }
.border-brand-cyan\/20 { border-color: rgba(0, 177, 233, 0.2); }
.border-brand-cyan\/50 { border-color: rgba(0, 177, 233, 0.5); }
@keyframes progress-fast {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
.animate-progress-fast {
  animation: progress-fast 2s linear infinite;
}
</style>
