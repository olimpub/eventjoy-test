<template>
  <q-page class="bg-[#0F172A] w-full block">
    <div class="px-4 pt-4 pb-[100px]">
    <!-- HEADER -->
    <div class="flex items-center justify-between mb-4 pt-2 px-2">
      <div>
        <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
          <q-icon name="sym_r_forum" color="#38bdf8" size="16px" />
          Üzeneteim
        </h2>
      </div>
      <q-btn unelevated round class="bg-slate-800 text-sky-400 shadow-md" icon="sym_r_add_comment" />
    </div>

    <!-- SEARCH & FILTER -->
    <div class="px-2 mb-6">
      <div class="w-full bg-[#1E293B] rounded-[20px] px-4 py-1 shadow-inner focus-within:bg-[#2A3B54] transition-all">
        <q-input 
          v-model="search"
          borderless
          dense
          dark
          placeholder="Keresés..." 
          class="w-full text-white font-medium text-[14px]"
        >
          <template v-slot:prepend>
            <q-icon name="sym_r_search" class="text-slate-400" size="22px" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- CHAT LIST -->
    <div class="flex flex-col gap-5 px-2">
      
      <!-- Chat Item 1 (Unread, Online) -->
      <div @click="goToChat(1)" class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
        <div class="flex items-center pl-2">
          
          <div class="shrink-0 mr-8 relative">
            <q-avatar size="56px" class="bg-slate-800 shadow-lg border-2 border-slate-700"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>
            <!-- Online Dot -->
            <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-[#1E293B] shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          </div>
          
          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex items-center justify-between mb-1">
              <div class="truncate min-w-0 font-black tracking-[1.5px] text-[13px] text-sky-400 drop-shadow-md mr-2" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Kovács Péter</div>
              <div class="shrink-0 text-sky-300 text-[10px] font-black uppercase bg-sky-500/10 px-2.5 py-1 rounded-full whitespace-nowrap mr-8">10:42&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="truncate text-white font-bold text-[13px] leading-tight flex-1">Szia! Találkozunk a kávészünetben a B teremnél?</div>
              <q-badge color="sky-500" rounded label="2" class="font-black" style="margin-right: 16px;" />
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Item 2 (Read, Offline) -->
      <div @click="goToChat(2)" class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
        <div class="flex items-center pl-2">
          
          <div class="shrink-0 mr-8 relative">
            <q-avatar size="56px" class="bg-slate-800 opacity-80"><img src="https://i.pravatar.cc/150?u=anna" /></q-avatar>
          </div>
          
          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex items-center justify-between mb-1">
              <div class="truncate min-w-0 font-black tracking-[1.5px] text-[13px] text-slate-300 drop-shadow-md mr-2 opacity-80" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Nagy Anna</div>
              <div class="shrink-0 text-slate-500 text-[10px] font-black uppercase bg-slate-800/50 px-2.5 py-1 rounded-full whitespace-nowrap mr-8">Tegnap&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            </div>
            <div class="flex items-center gap-1">
              <!-- Read Receipt Icon -->
              <q-avatar size="14px" class="shrink-0"><img src="https://i.pravatar.cc/150?u=anna" /></q-avatar>
              <div class="truncate text-slate-500 text-[13px] font-medium leading-tight flex-1">El tudod küldeni a tegnapi prezentációt?</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Item 3 (Group Chat, Read) -->
      <div @click="goToChat(3)" class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
        <div class="flex items-center pl-2">
          
          <div class="shrink-0 mr-8 relative">
            <div class="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg border-2 border-slate-700">
              <q-icon name="sym_r_groups" color="white" size="24px" />
            </div>
            <!-- Event Badge -->
            <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border-2 border-[#1E293B]">
              <q-icon name="sym_r_event" color="sky-400" size="12px" />
            </div>
          </div>
          
          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex items-center justify-between mb-1">
              <div class="truncate min-w-0 font-black tracking-[1.5px] text-[13px] text-slate-300 drop-shadow-md mr-2 opacity-80" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">OlimPub Kvíz Csoport</div>
              <div class="shrink-0 text-slate-500 text-[10px] font-black uppercase bg-slate-800/50 px-2.5 py-1 rounded-full whitespace-nowrap mr-8">Hétfő&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-sky-400 font-bold text-[13px] shrink-0">Gábor:</span>
              <div class="truncate text-slate-500 text-[13px] font-medium leading-tight flex-1">Mindenki megkapta az egyedi QR kódokat?</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    </div>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
const router = useRouter()
const search = ref('')

const goToChat = (id) => {
  router.push(`/messages/${id}`)
}
</script>
