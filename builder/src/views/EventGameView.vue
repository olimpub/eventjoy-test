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

      <!-- Status Badge, Toggle & Profile (Single row) -->
      <div class="absolute bottom-2 left-6 right-6 flex items-center justify-between gap-2 z-10">
        <!-- Orange Játék status -->
        <span class="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transition-colors"
          :style="{ backgroundColor: event.theme.primary, color: event.theme.dark }">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: event.theme.dark }"></span>
          Játék
        </span>

        <!-- Collapsible Toggle (Moved here) -->
        <button
          @click="isDetailsExpanded = !isDetailsExpanded"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white"
        >
          {{ isDetailsExpanded ? 'Elrejtés' : 'Részletek' }}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transition-transform duration-300" :class="isDetailsExpanded ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- User Profile Info -->
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
      <!-- Collapsible Title Header & Info Row -->
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
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: event.theme.accent }">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {{ event.location }}
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Row -->
      <div class="flex items-center gap-2 mb-4">
        <div class="w-1.5 h-6 rounded-full" :style="{ backgroundColor: event.theme.primary }"></div>
        <span class="text-lg font-black uppercase tracking-wider text-white/90">Fordulók</span>
      </div>

      <!-- Game Result Details (All 3 Rounds) -->
      <section class="mt-2 space-y-4">
        <div class="grid grid-cols-1 gap-4">
          <!-- Rounds List -->
          <div v-for="(round, index) in rounds" :key="index"
            class="flex items-center justify-between bg-white/5 border border-white/10 rounded-[2rem] p-5 backdrop-blur-md relative overflow-hidden group transition-all hover:bg-white/10"
          >
            <!-- Background Glow for Color -->
            <div class="absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" :style="{ backgroundColor: round.colorCode }"></div>

            <!-- Round Info -->
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
                <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F421226f906dd4e389d8863934ee71f71?format=webp&width=800&height=1200" alt="Round" class="w-full h-full object-contain" />
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Forduló</span>
                <span class="text-xl font-black text-white">{{ round.number }} / 3</span>
              </div>
            </div>

            <div class="w-px h-10 bg-white/10 mx-2"></div>

            <!-- Table Info -->
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
                <img src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F4bd0029b216347de9a1f1fcdb529a4b9?format=webp&width=800&height=1200" alt="Table" class="w-full h-full object-contain" />
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/40">Asztal</span>
                <span class="text-xl font-black text-white">{{ round.table }}</span>
              </div>
            </div>

            <div class="w-px h-10 bg-white/10 mx-2"></div>

            <!-- Color Info -->
            <div class="flex flex-col items-center min-w-[60px]">
              <span class="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Szín</span>
              <div class="w-6 h-6 rounded-full shadow-lg" :style="{ backgroundColor: round.colorCode, boxShadow: `0 0 15px ${round.colorCode}60` }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Next Steps / Actions -->
      <div class="mt-10 mb-20 space-y-4">
        <button
          @click="router.push(`/event/${eventId}/results`)"
          class="w-full py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
          :style="{
            backgroundColor: event.theme.primary,
            color: event.theme.dark,
            boxShadow: `0 10px 15px -3px ${event.theme.primary}40`
          }">
          Megkezdés
        </button>
      </div>
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
      primary: '#f68b29', // Base Orange
      dark: '#2c2e32',
      accent: '#ffffff'
    }
  }
}

const event = computed(() => eventsData[eventId.value as string] || eventsData['1'])

const rounds = [
  { number: 1, table: 12, colorCode: '#28C76F', colorName: 'Zöld' },
  { number: 2, table: 8, colorCode: '#FF6060', colorName: 'Piros' },
  { number: 3, table: 21, colorCode: '#2AA9FF', colorName: 'Kék' }
]
</script>

<style scoped>
.text-brand-cyan {
  color: #00B1E9;
}
.bg-brand-cyan\/20 {
  background-color: rgba(0, 177, 233, 0.2);
}
</style>
