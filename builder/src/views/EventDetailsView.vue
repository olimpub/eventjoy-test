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

      <!-- Back Button (Increased size) -->
      <button
        @click="$router.back()"
        class="absolute top-3 left-6 w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 active:scale-90 transition-all z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Share Button (Increased size) -->
      <button class="absolute top-3 right-6 w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 active:scale-90 transition-all z-20">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      <!-- Centered Logo (Increased size) -->
      <div class="absolute top-2 left-1/2 -translate-x-1/2 h-16 w-32 flex items-center justify-center z-20">
        <img :src="event.logo" :alt="event.title" class="w-full h-full object-contain drop-shadow-2xl" />
      </div>

      <!-- Hero Footer Info (Badges only) -->
      <div class="absolute bottom-2 left-6 right-6 flex items-center gap-2 z-10">
        <span class="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg transition-colors"
          :style="{ backgroundColor: event.theme.primary, color: event.theme.dark, boxShadow: `0 8px 12px -3px ${event.theme.primary}40` }">
          {{ event.category }}
        </span>
        <span class="px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-colors"
          :style="{ backgroundColor: event.theme.accent, color: event.theme.dark }">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: event.theme.dark }"></span>
          Kiemelt
        </span>
        <!-- Organizer Badge -->
        <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 ml-auto">
          <div class="w-4 h-4 flex items-center justify-center text-white/80">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.972 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <span class="text-xs font-black text-white uppercase tracking-wider">NLVk</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-6 mt-4 relative z-10">
      <!-- Title Header & Info Row -->
      <div class="mb-8">
        <h1 class="text-4xl font-black leading-[1.1] text-white tracking-tighter mb-2">{{ event.title }}</h1>

        <!-- Integrated Quick Info Row -->
        <div class="flex items-center gap-4 text-xs font-bold text-white/80">
          <div class="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: event.theme.primary }">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ event.date }} • {{ event.time }}
          </div>
          <div class="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: event.theme.accent }">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {{ event.location }}
          </div>
        </div>
      </div>

      <!-- Roles / Roles Selection -->
      <section class="mb-8">
        <h2 class="text-lg font-bold mb-4 flex items-center justify-between">
          Szerepkörök
          <button class="text-xs transition-colors" :style="{ color: event.theme.primary }">Infó</button>
        </h2>
        <div class="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          <!-- Role: Játékos -->
          <button
            @click="router.push(`/event/${eventId}/registration`)"
            class="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl px-4 py-3 active:scale-95 transition-all flex-shrink-0 group"
          >
            <div class="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors bg-white/5 border-white/10 group-hover:border-brand-cyan/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 group-hover:text-brand-cyan transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-sm font-bold text-white uppercase tracking-widest">Játékos</span>
            </div>
          </button>

          <!-- Role: Játékmester -->
          <button
            @click="router.push(`/event/${eventId}/gm`)"
            class="flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl px-4 py-3 active:scale-95 transition-all flex-shrink-0 group"
          >
            <div class="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors bg-white/5 border-white/10 group-hover:border-brand-yellow/50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 group-hover:text-brand-yellow transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-sm font-bold text-white uppercase tracking-widest">Játékmester</span>
            </div>
          </button>
        </div>
      </section>

      <!-- About Section -->
      <section class="mb-8">
        <h2 class="text-lg font-bold mb-4">Az eseményről</h2>
        <div class="bg-slate-800/20 border border-slate-700/30 rounded-3xl p-6 leading-relaxed">
          <p class="text-slate-300 text-sm mb-4">
            {{ event.description }}
          </p>
          <ul class="space-y-2 mb-4">
            <li v-for="feature in event.features" :key="feature" class="flex items-start gap-2 text-sm text-slate-400">
              <span class="font-bold transition-colors" :style="{ color: event.theme.primary }">•</span>
              {{ feature }}
            </li>
          </ul>
        </div>
      </section>

      <!-- Map Mockup -->
      <section class="mb-10">
        <h2 class="text-lg font-bold mb-4">Helyszín</h2>
        <div class="h-48 w-full bg-slate-800/40 rounded-3xl overflow-hidden relative border border-slate-700/50">
          <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop" alt="Map" class="w-full h-full object-cover grayscale opacity-50" />
          <div class="absolute inset-0 flex items-center justify-center">
             <div class="relative">
               <div class="absolute inset-0 blur-xl rounded-full animate-ping transition-colors" :style="{ backgroundColor: event.theme.primary + '60' }"></div>
               <div class="w-8 h-8 rounded-full border-4 shadow-2xl relative z-10 flex items-center justify-center transition-all"
                 :style="{ backgroundColor: event.theme.primary, borderColor: event.theme.dark, boxShadow: `0 0 20px ${event.theme.primary}80` }">
                 <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: event.theme.dark }"></div>
               </div>
             </div>
          </div>
          <button class="absolute bottom-4 right-4 bg-brand-dark/80 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-white/10 active:scale-95 transition-all">
            Útvonaltervezés
          </button>
        </div>
      </section>
    </div>

    <!-- Sticky Bottom Bar -->
    <div class="fixed bottom-0 left-0 right-0 p-6 z-[80] pointer-events-none">
      <div class="max-w-[480px] mx-auto w-full pointer-events-auto">
        <div class="backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 flex items-center justify-between shadow-2xl shadow-black/50 transition-colors duration-500"
          :style="{ backgroundColor: event.theme.dark + 'E6' }">
          <div class="flex flex-col pl-4">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jegyár</span>
            <span class="text-2xl font-black tracking-tight transition-colors" :style="{ color: event.theme.accent }">
              {{ event.price === '0' ? 'Ingyenes' : event.price + ' Ft' }}
            </span>
          </div>
          <button
            @click="router.push(`/event/${eventId}/registration`)"
            class="px-10 py-4 rounded-[1.8rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all hover:bg-white"
            :style="{
              backgroundColor: event.theme.primary,
              color: event.theme.dark,
              boxShadow: `0 10px 15px -3px ${event.theme.primary}40`
            }">
            {{ event.price === '0' ? 'Megerősítem' : 'Jegyvásárlás' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const eventId = computed(() => route.params.id)

// Mocked database of events
const eventsData: Record<string | number, any> = {
  '1': {
    id: 1,
    title: 'Interaktív Kvíz Est',
    location: 'Budapest, Akvárium',
    fullLocation: '1051 Budapest, Erzsébet tér 12.',
    date: '2024. Október 25.',
    time: 'Péntek • 19:00 - 22:00',
    price: '4.500',
    category: 'Kvíz',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F64200d13bdf14799b32ee26506ffaa08?format=webp&width=800&height=1200',
    description: 'Csatlakozz hozzánk egy felejthetetlen estére az Akvárium Klubban! Az Interaktív Kvíz est nem csak a tudásodról szól, hanem a közösségről, a nevetésről és a versenyszellemről.',
    features: ['Több mint 50 izgalmas kérdés', 'Értékes nyeremények a dobogósoknak', 'Különleges italakciók a résztvevőknek'],
    logo: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F6ee21380f7fd46cda013ce002104beb0?format=webp&width=100&height=100',
    theme: {
      primary: '#00B1E9', // brand-cyan
      dark: '#303A52',    // brand-dark
      accent: '#FFF76A'   // brand-yellow
    }
  },
  '2': {
    id: 2,
    title: 'Regionális bajnokság',
    location: 'Vác',
    fullLocation: '2600 Vác, Sportcsarnok u. 1-3.',
    date: '2024. Október 28.',
    time: 'Hétfő • 10:00 - 18:00',
    price: '0',
    category: 'PROFI-T-Ability',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F02405f1e35404f04be1445d02c616fed?format=webp&width=800&height=1200',
    description: 'A Profi-T-Ability regionális bajnoksága váci helyszínnel tér vissza! Készülj fel a logisztikai és stratégiai kihívásokra, ahol a legjobbak mérhetik össze tudásukat.',
    features: ['Profi logisztikai szimuláció', 'Hálózati építési lehetőségek', 'Országos döntőbe jutási lehetőség'],
    logo: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F02405f1e35404f04be1445d02c616fed?format=webp&width=800&height=1200',
    theme: {
      primary: '#f68b29', // Orange
      dark: '#2c2e32',    // Grayish dark
      accent: '#ffffff'   // White
    }
  }
}

const event = computed(() => eventsData[eventId.value as string] || eventsData['1'])
</script>

<style scoped>
/* Individual component overrides if needed */
</style>
