<template>
  <q-page class="bg-[#0F172A] flex flex-col justify-start w-full relative">
    
    <!-- FIXED HEADER -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800/50 shadow-sm" style="height: 70px;">
      <div class="flex items-center justify-between h-full px-4">
        
        <div class="flex items-center gap-4">
          <q-btn flat round dense icon="sym_r_arrow_back" color="slate-400" to="/messages" />
          
          <div class="flex items-center gap-3">
            <div class="relative">
              <q-avatar size="44px" class="bg-slate-800 border border-slate-700 shadow-sm">
                <img src="https://i.pravatar.cc/150?u=peter" />
              </q-avatar>
              <!-- Online Status Dot -->
              <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0F172A] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
            <div class="flex flex-col">
              <span class="font-black uppercase tracking-widest text-[16px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 leading-tight inline-block">Kovács Péter</span>
              <span class="text-emerald-400 font-bold text-[11px] uppercase tracking-widest mt-0.5">Online</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-1">
          <q-btn flat round dense icon="sym_r_call" color="slate-400" />
          <q-btn flat round dense icon="sym_r_more_vert" color="slate-400" />
        </div>

      </div>
    </div>

    <!-- CHAT MESSAGES AREA -->
    <!-- Add top padding for header and bottom padding for input area -->
    <div class="flex-1 overflow-y-auto px-4 pt-[90px] pb-[90px] flex flex-col gap-6">
      
      <!-- Date Group -->
      <div class="flex justify-center my-2">
        <span class="bg-slate-800/60 text-slate-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-slate-700/50">Tegnap</span>
      </div>

      <!-- Their Message -->
      <div class="flex flex-col gap-1 items-start max-w-[85%]">
        <span class="ml-[36px] font-black uppercase tracking-widest text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mb-0.5 inline-block">Kovács Péter</span>
        <div class="flex items-end gap-2">
          <q-avatar size="28px" class="bg-slate-800 shrink-0 mb-1"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>
          <div class="bg-[#1E293B] text-white p-4 rounded-[20px] rounded-bl-sm shadow-[0_4px_15px_rgba(0,0,0,0.3)] relative group">
            <p class="m-0 text-[14px] leading-relaxed font-medium break-words whitespace-pre-wrap px-1">Szia! El tudnád küldeni a holnapi prezentáció vázlatát? Nagyon sokat segítene a felkészülésben.</p>
          </div>
        </div>
        <span class="text-slate-500 text-[10px] font-bold ml-[36px] tracking-wider uppercase">14:23</span>
      </div>

      <!-- My Message (Sent & Read) -->
      <div class="flex flex-col gap-1 items-end max-w-[85%] self-end">
        <div class="bg-gradient-to-br from-sky-500 to-blue-600 text-white p-4 rounded-[20px] rounded-br-sm shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
          <p class="m-0 text-[14px] leading-relaxed font-medium text-white drop-shadow-sm break-words whitespace-pre-wrap px-1">Persze, máris küldöm. Csatoltam a fájlt!</p>
        </div>
        <div class="flex items-center gap-1.5 mr-1">
          <span class="text-slate-500 text-[10px] font-bold tracking-wider uppercase">14:30</span>
          <!-- Read Receipt: Avatar of the person who read it -->
          <q-avatar size="14px" class="opacity-80 shrink-0 shadow-sm"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>
        </div>
      </div>

      <!-- My Message (Attachment) -->
      <div class="flex flex-col gap-1 items-end max-w-[85%] self-end">
        <div class="bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 rounded-[20px] rounded-br-sm shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
          <div class="bg-[#0F172A]/20 rounded-[16px] p-3 flex items-center gap-3 backdrop-blur-sm cursor-pointer hover:bg-[#0F172A]/30 transition-all">
            <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <q-icon name="sym_r_description" color="white" size="20px" />
            </div>
            <div class="flex flex-col min-w-[120px]">
              <span class="text-white font-black text-[13px] truncate">Prezentacio_v2.pdf</span>
              <span class="text-sky-100/70 font-bold text-[11px] uppercase tracking-wider">2.4 MB</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 mr-1">
          <span class="text-slate-500 text-[10px] font-bold tracking-wider uppercase">14:31</span>
          <q-avatar size="14px" class="opacity-80 shrink-0 shadow-sm"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>
        </div>
      </div>

      <!-- Date Group -->
      <div class="flex justify-center my-2">
        <span class="bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.1)]">Ma</span>
      </div>

      <!-- Their Message -->
      <div class="flex flex-col gap-1 items-start max-w-[85%]">
        <span class="ml-[36px] font-black uppercase tracking-widest text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mb-0.5 inline-block">Kovács Péter</span>
        <div class="flex items-end gap-2">
          <q-avatar size="28px" class="bg-slate-800 shrink-0 mb-1"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>
          <div class="bg-[#1E293B] text-white p-4 rounded-[20px] rounded-bl-sm shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
            <p class="m-0 text-[14px] leading-relaxed font-medium break-words whitespace-pre-wrap px-1">Szuper, köszi szépen! Találkozunk a kávészünetben a B teremnél?</p>
          </div>
        </div>
        <span class="text-slate-500 text-[10px] font-bold ml-[36px] tracking-wider uppercase">10:42</span>
      </div>

      <!-- My Message (Typing / Unsent / Delivered but not read) -->
      <div class="flex flex-col gap-1 items-end max-w-[85%] self-end">
        <div class="bg-gradient-to-br from-sky-500 to-blue-600 text-white p-4 rounded-[20px] rounded-br-sm shadow-[0_8px_20px_rgba(14,165,233,0.3)]">
          <p class="m-0 text-[14px] leading-relaxed font-medium text-white drop-shadow-sm break-words whitespace-pre-wrap px-1">Igen, ott leszek! Viszek kávét is neked?</p>
        </div>
        <div class="flex items-center gap-1.5 mr-1">
          <span class="text-sky-400 text-[10px] font-bold tracking-wider uppercase">Épp most</span>
          <!-- Delivered Icon (not read yet) -->
          <q-icon name="sym_r_check_circle" size="14px" color="sky-400" />
        </div>
      </div>

      <!-- Typing Indicator -->
      <div class="flex items-end gap-2 mt-2">
        <q-avatar size="28px" class="bg-slate-800 shrink-0 mb-1"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>
        <div class="bg-[#1E293B] px-4 py-3 rounded-[20px] rounded-bl-sm shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style="animation-delay: 0ms;"></span>
          <span class="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style="animation-delay: 150ms;"></span>
          <span class="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style="animation-delay: 300ms;"></span>
        </div>
      </div>

    </div>

    <!-- FIXED FOOTER (Input Area) -->
    <div class="fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/90 backdrop-blur-md border-t border-slate-800/50 p-4">
      <div class="flex items-center gap-3">
        
        <q-btn flat round dense icon="sym_r_add_circle" color="slate-400" size="16px" class="hover:text-sky-400 transition-colors" />
        
        <div class="flex-1 bg-[#1E293B] rounded-[24px] flex items-center px-4 py-1 shadow-inner focus-within:bg-[#2A3B54] transition-all">
          <q-input 
            v-model="newMessage"
            borderless
            dense
            dark
            autogrow
            placeholder="Írj egy üzenetet..." 
            class="w-full text-white font-medium text-[14px]"
          />
          <q-btn flat round dense icon="sym_r_sentiment_satisfied" color="slate-400" size="14px" class="ml-2 hover:text-white shrink-0" />
        </div>

        <q-btn round unelevated icon="sym_r_send" size="14px" class="shadow-[0_4px_15px_rgba(14,165,233,0.4)] transition-transform hover:scale-105" style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: white;" />
      
      </div>
      <!-- Safe area padding for mobile -->
      <div class="h-4 sm:hidden"></div>
    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
const newMessage = ref('')
</script>
