<template>
  <div class="flex flex-col min-h-full w-full bg-brand-dark text-white pb-24 selection:bg-brand-cyan/30">
    <!-- Header with Safe Area -->
    <header class="p-5 flex items-center justify-between sticky top-0 bg-brand-dark/95 backdrop-blur-md z-[40] border-b border-white/5">
      <div class="flex items-center gap-3 active:opacity-70 transition-opacity">
        <div class="relative">
          <div class="absolute inset-0 bg-brand-cyan/20 blur-md rounded-full"></div>
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F6ee21380f7fd46cda013ce002104beb0?format=webp&width=800&height=1200"
            alt="EJ Logo"
            class="w-10 h-10 object-contain rounded-xl relative z-10 border border-white/10"
          />
        </div>
        <div class="flex flex-col">
          <h1 class="text-xl font-bold text-brand-yellow leading-tight tracking-tight">EventJoy</h1>
          <p class="text-[10px] text-brand-cyan/80 font-bold uppercase tracking-widest">Budapest • {{ new Date().toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="isNotificationsOpen = !isNotificationsOpen"
          class="relative p-2.5 bg-slate-800/50 rounded-2xl text-brand-yellow active:scale-90 transition-transform shadow-inner border border-white/5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <!-- Notification dot -->
          <span class="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-slate-800 rounded-full"></span>
        </button>

        <button class="w-10 h-10 rounded-xl overflow-hidden border-2 border-brand-cyan/30 active:scale-95 transition-transform">
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop" alt="Profile" class="w-full h-full object-cover" />
        </button>
      </div>
    </header>

    <!-- Notifications Panel -->
    <div v-if="isNotificationsOpen" class="px-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div class="bg-brand-yellow/10 border border-brand-yellow/30 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute -right-4 -top-4 w-20 h-20 bg-brand-yellow/10 rounded-full blur-2xl"></div>

        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-brand-yellow/20 flex items-center justify-center text-brand-yellow border border-brand-yellow/30 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-black uppercase tracking-widest text-brand-yellow mb-1">Értesítés</h3>
            <p class="text-white font-bold leading-tight">Függőben lévő részvételed van.</p>
          </div>
          <button @click="isNotificationsOpen = false" class="text-white/40 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-white/40">Esemény</span>
            <span class="text-[10px] font-black uppercase tracking-widest text-brand-cyan">PROFI-T-Ability</span>
          </div>
          <h4 class="text-lg font-black text-white mb-1">Regionális bajnokság</h4>
          <p class="text-xs text-white/60 mb-3">Esemény részletei</p>
          <div class="flex items-center gap-2 text-[10px] font-bold text-brand-yellow bg-brand-yellow/10 w-fit px-2 py-1 rounded-lg">
            <span class="w-1 h-1 rounded-full bg-brand-yellow animate-pulse"></span>
            Kérlek erősítsd meg a részvételed!
          </div>
        </div>

        <button
          @click="goToDetails(2)"
          class="w-full py-4 rounded-2xl bg-brand-yellow text-brand-dark font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-yellow/20 active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-2"
        >
          Tovább
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- My Events Section (Replacing Welcome and Search) -->
    <section class="px-6 mb-8">
      <h2 class="text-xl font-bold mb-4">Saját ⭐</h2>
      <div class="flex gap-4 overflow-x-auto modern-scrollbar pb-3 snap-x">
        <div v-for="event in myUpcomingEvents" :key="event.id" @click="goToDetails(event.id)" class="min-w-[155px] flex-1 snap-start bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl p-3.5 relative overflow-hidden active:scale-95 transition-transform cursor-pointer">
          <div class="absolute -right-4 -top-4 w-16 h-16 bg-brand-cyan/10 rounded-full blur-xl"></div>

          <!-- Category Badge in Top Right -->
          <div v-if="event.category" class="absolute top-0 right-0 z-10">
            <div class="bg-brand-cyan text-brand-dark px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest shadow-md">
              {{ event.category }}
            </div>
          </div>

          <div class="mb-3">
            <p class="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">{{ event.date }}</p>
          </div>

          <h3 class="font-bold text-sm leading-tight mb-2 line-clamp-1">{{ event.title }}</h3>
          <div class="flex items-center gap-1.5 flex-wrap">
            <div class="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse shrink-0"></div>
            <span class="text-[10px] text-slate-400 font-medium">{{ event.time }}</span>
            <span v-if="event.location" class="text-[10px] text-brand-yellow font-bold opacity-80">• {{ event.location }}</span>
          </div>

          <!-- Status Icon in Bottom Right -->
          <div v-if="event.status" class="absolute bottom-2.5 right-3">
            <div v-if="event.status === 'confirmed'" class="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 border border-green-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div v-else-if="event.status === 'pending'" class="w-5 h-5 bg-brand-yellow/20 rounded-full flex items-center justify-center text-brand-yellow border border-brand-yellow/30 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div v-if="myUpcomingEvents.length === 0" class="w-full py-8 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
          <p class="text-slate-500 text-sm">Nincsenek közelgő eseményeid</p>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <div class="relative mb-8 group">
      <!-- Edge Fade Indicators -->
      <div class="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-brand-dark via-brand-dark/40 to-transparent z-10 pointer-events-none transition-opacity duration-300"></div>
      <div class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-brand-dark via-brand-dark/40 to-transparent z-10 pointer-events-none transition-opacity duration-300"></div>

      <div class="px-6 overflow-x-auto modern-scrollbar pb-3 relative snap-x snap-proximity">
        <div class="flex gap-4 min-w-max pr-6">
          <button v-for="cat in categories" :key="cat" class="px-5 py-2.5 rounded-2xl whitespace-nowrap transition-all border border-white/5 text-sm font-bold shadow-lg snap-start" :class="cat === 'Összes' ? 'bg-brand-cyan text-brand-dark border-brand-cyan shadow-brand-cyan/20 scale-105' : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 active:scale-95'">
            {{ cat }}
          </button>
        </div>
      </div>
    </div>

    <!-- Featured Section -->
    <section class="mb-10 group relative">
      <div class="px-6 flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Népszerű események</h2>
        <button class="text-brand-cyan text-sm font-medium hover:underline">Mindet látom</button>
      </div>

      <!-- Edge Fade Indicators -->
      <div class="absolute left-0 top-12 bottom-0 w-12 bg-gradient-to-r from-brand-dark via-brand-dark/40 to-transparent z-10 pointer-events-none transition-opacity duration-300"></div>
      <div class="absolute right-0 top-12 bottom-0 w-12 bg-gradient-to-l from-brand-dark via-brand-dark/40 to-transparent z-10 pointer-events-none transition-opacity duration-300"></div>

      <div class="overflow-x-auto px-6 pb-6 modern-scrollbar relative scroll-smooth snap-x snap-mandatory">
        <div class="flex gap-5 min-w-max pr-6">
          <div v-for="(event, index) in featuredEvents" :key="event.id" @click="goToDetails(event.id)" class="min-w-[280px] snap-start bg-slate-800/40 rounded-3xl overflow-hidden border border-slate-700/50 group/card hover:border-brand-cyan/50 transition-all shadow-xl relative cursor-pointer active:scale-95">
            <!-- New Label for the first event -->
            <div v-if="index === 0" class="absolute -top-1 -right-1 z-30">
              <div class="bg-brand-yellow text-brand-dark px-3 py-1 rounded-bl-xl rounded-tr-3xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1">
                <span class="w-1 h-1 bg-brand-dark rounded-full animate-ping"></span>
                Kiemelt
              </div>
            </div>
            <div class="relative h-44 overflow-hidden">
              <img :src="event.image" :alt="event.title" class="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
              <div class="absolute bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20" :class="index === 0 ? 'top-10 right-3' : 'top-3 right-3'">
                {{ event.date }}
              </div>
            </div>
            <div class="p-5">
              <h3 class="text-lg font-bold mb-1 group-hover/card:text-brand-yellow transition-colors line-clamp-1">{{ event.title }}</h3>
              <p class="text-slate-400 text-sm flex items-center gap-1.5 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ event.location }}
              </p>
              <div class="flex items-center justify-between mt-auto">
                <span class="text-brand-yellow font-bold">{{ event.price }} Ft</span>
                <button class="bg-brand-cyan text-brand-dark px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-white transition-all transform active:scale-95 shadow-md shadow-brand-cyan/20">Jegyvásárlás</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Upcoming Events List -->
    <section class="px-6 mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Közelgő események</h2>
        <button class="text-brand-cyan text-sm font-medium hover:underline">Mutass többet</button>
      </div>
      <div class="space-y-4">
        <div v-for="event in upcomingEvents" :key="event.id" @click="goToDetails(event.id)" class="flex gap-4 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30 hover:bg-slate-800/60 transition-colors cursor-pointer active:scale-95 transition-transform">
          <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            <img :src="event.image" :alt="event.title" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col justify-between py-1 flex-grow">
            <div>
              <p class="text-[10px] font-bold text-brand-cyan uppercase tracking-wider mb-0.5">{{ event.date }} • {{ event.time }}</p>
              <h3 class="font-bold text-base leading-tight">{{ event.title }}</h3>
            </div>
            <p class="text-slate-400 text-xs flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {{ event.location }}
            </p>
          </div>
          <button class="self-center p-2 text-slate-500 hover:text-brand-yellow">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isNotificationsOpen = ref(false)
const categories = ['Összes', 'Kvíz', 'PROFI-T-Ability', 'Csapatépítő', 'Konferencia', 'Stand-Up']

const goToDetails = (id: number | string) => {
  router.push({ name: 'event-details', params: { id } })
}

const myUpcomingEvents = [
  {
    id: 1,
    title: 'Interaktív Kvíz',
    date: 'Okt 25',
    time: '19:00',
    category: 'Kvíz',
    location: 'Budapest',
    status: 'confirmed'
  },
  {
    id: 2,
    title: 'Regionális bajnokság',
    date: 'Okt 28',
    time: '10:00',
    category: 'PROFI-T-Ability',
    location: 'Vác',
    status: 'pending'
  }
]

const featuredEvents = [
  {
    id: 1,
    title: 'Interaktív Kvíz',
    location: 'Budapest, Akvárium',
    date: 'Okt 25',
    price: '4.500',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F64200d13bdf14799b32ee26506ffaa08?format=webp&width=800&height=1200'
  },
  {
    id: 2,
    title: 'NLVk konferencia',
    location: 'Hotel Azúr, Siófók',
    date: 'Nov 12',
    price: '114.000',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F6c1bfd75a593428eb280275604d50f4f?format=webp&width=800&height=1200'
  }
]

const upcomingEvents = [
  {
    id: 3,
    title: 'Kvíz esemény',
    location: 'Budapest, Akvárium',
    date: 'Ma',
    time: '19:00',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2Fd11811f1debb4aab8b24606976c8119e?format=webp&width=800&height=1200'
  },
  {
    id: 4,
    title: 'Profi-T-Ability esemény',
    location: 'Millenáris Park',
    date: 'Holnap',
    time: '14:00',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F02405f1e35404f04be1445d02c616fed?format=webp&width=800&height=1200'
  },
  {
    id: 5,
    title: 'NLVk esemény',
    location: 'Siófok, Hotel Azúr',
    date: 'Szo',
    time: '10:00',
    image: 'https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F77d10a0fa9a14c2bb6f0f336d44d07ed?format=webp&width=800&height=1200'
  }
]
</script>

<style scoped>
/* Individual component overrides if needed */
</style>
