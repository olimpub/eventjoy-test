<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SplashScreen from './components/SplashScreen.vue'
import BottomNav from './components/layout/BottomNav.vue'

const isSplashVisible = ref(true)

onMounted(() => {
  // Hide splash screen after 3 seconds
  setTimeout(() => {
    isSplashVisible.value = false
  }, 3000)
})
</script>

<template>
  <div class="bg-[#1a202c] min-h-screen flex items-center justify-center">
    <!-- App Container (Mobile viewport look on Desktop) -->
    <div
      class="w-full max-w-[480px] min-h-screen md:min-h-[85vh] md:h-[844px] bg-brand-dark relative md:rounded-[3rem] md:shadow-2xl md:border-[8px] md:border-slate-800 overflow-hidden flex flex-col transition-opacity duration-700 ease-in-out"
      :class="{ 'opacity-0': isSplashVisible, 'opacity-100': !isSplashVisible }"
    >
      <SplashScreen :show="isSplashVisible" />

      <!-- Main App Content -->
      <main class="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative">
        <router-view v-if="!isSplashVisible" />
      </main>

      <!-- Persistent Navigation (Pinned inside the frame) -->
      <BottomNav v-if="!isSplashVisible" />

      <!-- Floating Chat Button (Fixed inside the frame) -->
      <button
        v-if="!isSplashVisible"
        class="absolute bottom-[110px] right-6 w-16 h-16 bg-brand-yellow text-brand-dark rounded-2xl shadow-2xl shadow-brand-yellow/30 flex items-center justify-center transform active:scale-90 transition-all z-[80] border-4 border-brand-dark hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style>
@import './assets/main.css';

:root {
  background-color: #1a202c;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: white;
  background-color: #1a202c;
  overscroll-behavior-y: contain;
}
</style>
