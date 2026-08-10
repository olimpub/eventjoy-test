<template>
  <q-page class="bg-[#0F172A] w-full block">
    <div class="px-4 pt-4 pb-[100px]">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between mb-4 pt-2 px-2">
        <div class="flex items-center gap-2">
          <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
            <q-icon name="sym_r_notifications" color="#38bdf8" size="16px" />
            Értesítések
          </h2>
        </div>
        <q-btn unelevated round class="bg-slate-800 text-sky-400 shadow-md" icon="sym_r_done_all" />
      </div>

      <!-- TABS -->
      <div class="px-2 mb-6">
        <q-tabs 
          v-model="tab" 
          dense 
          class="text-slate-500 font-bold" 
          active-color="sky-400" 
          indicator-color="sky-400" 
          align="left" 
          narrow-indicator
        >
          <q-tab name="all" label="Összes" class="capitalize" />
          <q-tab name="events" label="Események" class="capitalize" />
          <q-tab name="system" label="Rendszer" class="capitalize" />
        </q-tabs>
      </div>

      <!-- NOTIFICATIONS LIST -->
      <div class="flex flex-col gap-5 px-2">
        
        <!-- Notification 1 (Unread, Sky) -->
        <div class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
          <div class="flex items-center gap-4 pl-2">
            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shadow-lg shrink-0 border-2 border-slate-700">
              <q-icon name="sym_r_event" color="sky-400" size="24px" />
            </div>
            <div class="flex flex-col flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1 w-full gap-2">
                <span class="font-black tracking-[1.5px] text-[13px] text-sky-400 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Helyszín Változás</span>
                <span class="text-sky-300 text-[10px] font-black uppercase tracking-wider bg-sky-500/10 px-2.5 py-1 rounded-full shrink-0 shadow-inner whitespace-nowrap mr-8">10 Perce&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
              <span class="text-slate-300 text-[13px] font-medium leading-relaxed">A plenáris előadás a B terembe került át. Kérjük fáradj oda az új kezdéshez!</span>
            </div>
          </div>
        </div>

        <!-- Notification 2 (Unread, Emerald) -->
        <div class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
          <div class="flex items-center gap-4 pl-2">
            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shadow-lg shrink-0 border-2 border-slate-700">
              <q-icon name="sym_r_local_activity" color="emerald-400" size="24px" />
            </div>
            <div class="flex flex-col flex-1 min-w-0">
              <div class="flex justify-between items-center mb-1 w-full gap-2">
                <span class="font-black tracking-[1.5px] text-[13px] text-emerald-400 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Jegyvásárlás</span>
                <span class="text-emerald-300 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0 shadow-inner whitespace-nowrap mr-8">2 Órája&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
              <span class="text-slate-300 text-[13px] font-medium leading-relaxed">Sikeresen megvásároltad a VIP belépőjegyet az OlimPub Kvízre.</span>
            </div>
          </div>
        </div>

        <!-- Notification 3 (Read, Slate) -->
        <div class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
          <div class="flex items-center gap-4 pl-2">
            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center opacity-70 shrink-0 border-2 border-[#1E293B]">
              <q-icon name="sym_r_campaign" color="slate-400" size="24px" />
            </div>
            <div class="flex flex-col flex-1 min-w-0 opacity-80">
              <div class="flex justify-between items-center mb-1 w-full gap-2">
                <span class="font-black tracking-[1.5px] text-[13px] text-slate-300 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Új Előadó</span>
                <span class="text-slate-500 text-[10px] font-black uppercase tracking-wider bg-slate-800/50 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap mr-8">Tegnap&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
              <span class="text-slate-500 text-[13px] font-medium leading-relaxed">Dr. Horváth Elemér is csatlakozott a holnapi IoT kerekasztalhoz.</span>
            </div>
          </div>
        </div>

        <!-- Notification 4 (Read, Purple) -->
        <div class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
          <div class="flex items-center gap-4 pl-2">
            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center opacity-70 shrink-0 border-2 border-[#1E293B]">
              <q-icon name="sym_r_groups" color="indigo-400" size="24px" />
            </div>
            <div class="flex flex-col flex-1 min-w-0 opacity-80">
              <div class="flex justify-between items-center mb-1 w-full gap-2">
                <span class="font-black tracking-[1.5px] text-[13px] text-slate-300 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Csoport Frissítés</span>
                <span class="text-slate-500 text-[10px] font-black uppercase tracking-wider bg-slate-800/50 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap mr-8">Hétfő&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
              <span class="text-slate-500 text-[13px] font-medium leading-relaxed">Az OlimPub Kvíz Csoport új eseményt hirdetett: "Tavaszi Kvíz Bajnokság".</span>
            </div>
          </div>
        </div>

        <!-- Notification 5 (Read, Rose) -->
        <div class="rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(56, 189, 248, 0.15); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
          <div class="flex items-center gap-4 pl-2">
            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center opacity-70 shrink-0 border-2 border-[#1E293B]">
              <q-icon name="sym_r_build" color="rose-400" size="24px" />
            </div>
            <div class="flex flex-col flex-1 min-w-0 opacity-80">
              <div class="flex justify-between items-center mb-1 w-full gap-2">
                <span class="font-black tracking-[1.5px] text-[13px] text-slate-300 truncate drop-shadow-md flex-1 min-w-0" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Karbantartás</span>
                <span class="text-slate-500 text-[10px] font-black uppercase tracking-wider bg-slate-800/50 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap mr-8">Márc 12.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
              <span class="text-slate-500 text-[13px] font-medium leading-relaxed">Pénteken hajnalban 2:00 és 4:00 között rendszerkarbantartás lesz.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
const tab = ref('all')
</script>
