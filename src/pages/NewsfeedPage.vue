<template>
  <q-page class="bg-[#0F172A] text-white relative overflow-hidden q-pa-md flex flex-col items-center">
    <!-- Giant Background Watermark Logo -->
    <div class="absolute -right-24 top-[15%] w-96 h-96 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="Watermark" class="w-full h-full object-contain" />
    </div>

    <div class="w-full max-w-2xl relative z-10 pt-1">
      
      <!-- Oldal címe és Vissza gomb -->
      <div class="q-mb-md flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <q-icon name="sym_r_newspaper" color="brand-primary" size="22px" />
          <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
            {{ isFiltered && filteredPosts.length > 0 ? filteredPosts[0].eventName : 'Hírfolyam' }}
          </h2>
        </div>
        
        <q-btn 
          v-if="isFiltered"
          unelevated 
          no-caps 
          icon="arrow_back" 
          label="Vissza" 
          style="font-size: 13px; font-weight: 800; color: #ffffff; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 12px;"
          @click="$router.push(`/event/${route.query.eventId}`)"
        />
      </div>

      <!-- Kártyák (Posts) -->
      <div class="flex flex-col pb-24" style="gap: 16px;">
        <transition-group appear enter-active-class="animated fadeInUp" leave-active-class="animated fadeOutDown">
          <div 
            v-for="(post, index) in filteredPosts" 
            :key="post.id"
            class="relative flex flex-col overflow-hidden transition-all duration-300"
            :style="{
              borderRadius: '24px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(10px)',
              border: !post.isRead ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: !post.isRead ? '0 0 20px rgba(56, 189, 248, 0.15)' : '0 8px 20px rgba(0,0,0,0.2)',
              animationDelay: `${index * 150}ms`,
              opacity: !post.isRead ? '1' : '0.85'
            }"
          >
            <!-- Új hír jelzés (Kék glow pötty a bal felső sarokban) -->
            <div v-if="!post.isRead" class="absolute top-4 left-4" style="width: 8px; height: 8px; border-radius: 50%; background-color: #38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);"></div>

            <!-- Header: Szerző és Esemény -->
            <div class="flex items-center p-4 px-5" style="gap: 20px;">
              <q-avatar size="42px" style="border: 2px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                <img :src="post.authorAvatar" />
              </q-avatar>
              
              <div class="flex-grow overflow-hidden">
                <div class="flex items-center gap-1.5">
                  <span style="font-size: 15px; font-weight: 800; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ post.authorName }}</span>
                  <q-icon name="sym_r_verified" color="brand-primary" size="14px" class="flex-shrink-0" />
                </div>
                <div style="font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  <span style="color: #cbd5e1;">{{ post.eventName }}</span>
                  <span style="color: #64748b;">•</span>
                  <span style="color: #94a3b8;">{{ post.timeAgo }}</span>
                </div>
              </div>
            </div>

            <!-- Tartalom (Kép + Szöveg) -->
            <div class="px-5 pt-1 pb-2">
              <h2 v-if="post.title" style="font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.3; margin: 0 0 8px 0;">
                {{ post.title }}
              </h2>
              
              <div class="relative mb-4">
                <p 
                  style="font-size: 13px; color: #cbd5e1; line-height: 1.6; white-space: pre-line; margin: 0;"
                  :class="{ 'line-clamp-3': !expandedPosts.includes(post.id) }"
                >
                  {{ post.content }}
                </p>
                <!-- Tovább gomb -->
                <button 
                  v-if="!expandedPosts.includes(post.id) && post.content.length > 120"
                  @click="toggleExpand(post.id)"
                  class="bg-transparent border-none p-0 mt-1 cursor-pointer outline-none"
                  style="color: #38bdf8; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;"
                >
                  Tovább...
                </button>
              </div>

              <!-- Kép (ha van) -->
              <div v-if="post.imageUrl" class="relative group cursor-pointer mb-2" style="border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                <q-img :src="post.imageUrl" :ratio="16/9" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            </div>

            <!-- Akció gombok (Lent) -->
            <div class="flex items-center justify-between px-4 py-4 mt-auto flex-wrap gap-3" style="background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.05);">
              
              <!-- Üzenet a szervezőnek -->
              <q-btn 
                unelevated
                no-caps 
                icon="sym_r_chat" 
                label="Üzenet" 
                style="font-size: 14px; font-weight: 800; color: #ffffff; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 16px; padding: 8px 16px;"
                class="hover:bg-brand-primary transition-all shadow-[0_4px_15px_rgba(14,165,233,0.2)]" 
              />
              
              <!-- Olvasva / Olvasatlan szekció -->
              <div class="flex items-center flex-shrink-0" style="margin-left: auto;">
                <q-btn 
                  v-if="!post.isRead"
                  unelevated 
                  no-caps 
                  icon="sym_r_done_all" 
                  label="Olvasva" 
                  style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-size: 14px; font-weight: 800; border-radius: 16px; padding: 8px 16px; border: 1px solid rgba(16, 185, 129, 0.4);"
                  class="shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                  @click="toggleReadStatus(post)"
                />
                <q-btn 
                  v-else
                  unelevated 
                  no-caps 
                  icon="sym_r_radio_button_unchecked" 
                  label="Olvasatlan" 
                  style="background: rgba(255, 255, 255, 0.05); color: #cbd5e1; font-size: 14px; font-weight: 800; border-radius: 16px; padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.2);"
                  @click="toggleReadStatus(post)"
                />
              </div>
              
            </div>
          </div>
        </transition-group>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const isFiltered = computed(() => !!route.query.eventId);

// Mock adatbázis a hírekhez
const mockPosts = ref([
  {
    id: 1,
    eventId: 'e2', // OlimPub
    authorName: 'Szabó Péter',
    authorAvatar: 'https://i.pravatar.cc/150?u=peter',
    eventName: 'OlimPub Kvíz #22',
    timeAgo: '10 perce',
    title: 'Fontos helyszínváltozás!',
    content: 'Sziasztok! \n\nA ma esti kvíz helyszíne a hirtelen jött eső miatt megváltozott. Nem a teraszon, hanem a belső nagyteremben leszünk. \n\nKérlek, érkezzetek 10 perccel korábban, hogy mindenkinek jusson kényelmes asztal. Várunk titeket szeretettel!',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop',
    isRead: false
  },
  {
    id: 4,
    eventId: 'e1', // MLBKT Kongresszus
    authorName: 'Szervezőség',
    authorAvatar: 'https://i.pravatar.cc/150?u=admin',
    eventName: 'XXI. MLBKT KONGRESSZUS',
    timeAgo: '10 perce',
    title: 'Figyelem! Szekció ülés teremcsere',
    content: 'A "Jövő Ellátási Láncai" szekció a B teremből átkerült a C terembe a nagy érdeklődésre való tekintettel.',
    imageUrl: '',
    isRead: false
  },
  {
    id: 5,
    eventId: 'e1', // MLBKT Kongresszus
    authorName: 'Szervezőség',
    authorAvatar: 'https://i.pravatar.cc/150?u=admin',
    eventName: 'XXI. MLBKT KONGRESSZUS',
    timeAgo: '2 napja',
    title: 'Gálavacsora menü',
    content: 'Feltöltöttük a gálavacsora menüjét az információs pultnál lévő QR kódokra. Vegán és mentes opciókat a pincéreknél tudjátok jelezni!',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop',
    isRead: true
  },
  {
    id: 2,
    eventId: 'system',
    authorName: 'EventJoy Csapat',
    authorAvatar: 'https://i.pravatar.cc/150?u=admin',
    eventName: 'EventJoy Exkluzív',
    timeAgo: '2 napja',
    title: 'Megújult az applikáció!',
    content: 'Örömmel jelentjük be, hogy elérhető a vadonatúj EventJoy alkalmazás. Ezentúl sokkal gyorsabban tudtok jegyet venni, és bekerült a Hírfolyam funkció is!\nNézzetek szét a felületen és ha bármi hibát találtok, írjatok nekünk bátran.',
    imageUrl: '',
    isRead: true
  },
  {
    id: 3,
    eventId: 'e3',
    authorName: 'Kovács Anna',
    authorAvatar: 'https://i.pravatar.cc/150?u=anna',
    eventName: 'Tech Meetup 2026',
    timeAgo: '1 hete',
    title: 'Prezentációk letöltése',
    content: 'Köszönjük mindenkinek a részvételt a múlt heti Tech Meetupon! \n\nAz összes előadó prezentációját feltöltöttük, ezen a linken keresztül tudjátok letölteni PDF formátumban: www.example.com/download\n\nJövőre találkozunk!',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop',
    isRead: true
  }
]);

const filteredPosts = computed(() => {
  if (route.query.eventId) {
    return mockPosts.value.filter(post => post.eventId === route.query.eventId);
  }
  return mockPosts.value;
});

// Olvasottra/Olvasatlanra állítás funkciója
function toggleReadStatus(post: any) {
  post.isRead = !post.isRead;
  // Itt hívnánk meg az API-t (POST vagy DELETE végpont attól függően, hogy állítjuk)
}

// "Tovább..." kibontás logikája
const expandedPosts = ref<number[]>([]);
function toggleExpand(id: number) {
  if (!expandedPosts.value.includes(id)) {
    expandedPosts.value.push(id);
  }
}
</script>

<style scoped>
/* Szöveg csonkolás (line-clamp) */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Animációk a kártyák beúszásához */
.animated {
  animation-duration: 0.6s;
  animation-fill-mode: both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 40px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.fadeInUp {
  animation-name: fadeInUp;
}

@keyframes fadeOutDown {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translate3d(0, 40px, 0);
  }
}

.fadeOutDown {
  animation-name: fadeOutDown;
}
</style>
