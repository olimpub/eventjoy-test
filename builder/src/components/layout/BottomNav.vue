<template>
  <nav class="bg-brand-dark/95 backdrop-blur-2xl border-t border-white/5 px-8 pb-8 pt-4 flex items-center justify-between z-[70] md:pb-10">
    <button class="flex flex-col items-center gap-1.5 group">
      <div class="p-1 rounded-xl bg-brand-yellow/10 text-brand-yellow group-active:scale-90 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011-1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      </div>
      <span class="text-[10px] font-bold text-brand-yellow tracking-tight">Kezdőlap</span>
    </button>
    <button class="flex flex-col items-center gap-1.5 group text-slate-500 hover:text-brand-cyan transition-colors">
      <div class="p-1 group-active:scale-90 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <span class="text-[10px] font-bold tracking-tight">Keresés</span>
    </button>
    <button class="flex flex-col items-center gap-1.5 group text-slate-500 hover:text-brand-cyan transition-colors">
      <div class="p-1 group-active:scale-90 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </div>
      <span class="text-[10px] font-bold tracking-tight">Jegyek</span>
    </button>
    <button class="flex flex-col items-center gap-1.5 group text-slate-500 hover:text-brand-cyan transition-colors">
      <div class="p-1 group-active:scale-90 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <span class="text-[10px] font-bold tracking-tight">Események</span>
    </button>
  </nav>
</template>

<script setup lang="ts"></script>
