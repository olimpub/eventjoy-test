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

      <!-- Status Badge & Profile (Single row) -->
      <div class="absolute bottom-2 left-6 right-6 flex items-center justify-between gap-2 z-10">
        <span class="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transition-colors bg-brand-cyan text-brand-dark">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-dark animate-pulse"></span>
          Bejelentkezés
        </span>

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
      <!-- Title Header & Info Row -->
      <div class="mb-4">
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

      <!-- Registration Details Summary (Optional, keeping it clean for now) -->
      <div class="mt-8 flex flex-col items-center justify-center py-12 px-6 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-md">
        <div class="w-16 h-16 rounded-full bg-brand-cyan/20 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-center mb-2">Sikeres regisztráció!</h3>
        <p class="text-white/60 text-sm text-center font-medium leading-relaxed">
          Készen állsz az eseményre. Használd az alábbi lehetőségeket a bejutáshoz.
        </p>
      </div>

      <!-- Dual Action Buttons -->
      <div class="mt-10 flex flex-col gap-4 mb-20">
        <!-- QR Code Button -->
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref="cameraInput"
          class="hidden"
        />
        <button
          @click="openCamera"
          class="w-full py-4 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20 bg-white/10 backdrop-blur-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          QR Kód
        </button>

        <!-- Login Button -->
        <button
          @click="router.push(`/event/${eventId}/lottery`)"
          class="w-full py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
          :style="{
            backgroundColor: event.theme.primary,
            color: event.theme.dark,
            boxShadow: `0 10px 15px -3px ${event.theme.primary}40`
          }">
          Bejelentkezés
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

const cameraInput = ref<HTMLInputElement | null>(null)

const openCamera = () => {
  if (cameraInput.value) {
    cameraInput.value.click()
  }
}

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
</script>

<style scoped>
.bg-brand-cyan {
  background-color: #00B1E9;
}
.text-brand-dark {
  color: #303A52;
}
.bg-brand-dark {
  background-color: #303A52;
}
.text-brand-cyan {
  color: #00B1E9;
}
</style>
