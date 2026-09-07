<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    <div class="absolute -right-24 top-[15%] w-96 h-96 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 q-mb-md mt-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="page-kicker">
          <q-icon name="sym_r_newspaper" color="#38bdf8" size="16px" />
          {{ pageTitle }}
        </h2>
        <button
          v-if="isFiltered"
          type="button"
          class="back-btn"
          @click="goBackToEvent"
        >
          <q-icon name="arrow_back" size="16px" />
          Vissza
        </button>
      </div>
    </div>

    <div v-if="filteredPosts.length" class="post-list relative z-10">
      <article
        v-for="post in filteredPosts"
        :key="post.id"
        class="post-card"
        :class="{ 'is-unread': !post.isRead }"
      >
        <header class="post-card__head">
          <q-avatar size="42px" class="post-card__avatar">
            <img :src="post.authorAvatar" :alt="post.authorName" />
          </q-avatar>
          <div class="post-card__meta">
            <div class="post-card__author">
              <span>{{ post.authorName }}</span>
              <q-icon name="sym_r_verified" size="14px" color="#38bdf8" />
              <span v-if="!post.isRead" class="post-card__dot" />
            </div>
            <p class="post-card__sub">
              <span>{{ post.eventName }}</span>
              <span class="post-card__sep">•</span>
              <span>{{ post.timeAgo }}</span>
            </p>
          </div>
        </header>

        <div class="post-card__content">
          <h3 v-if="post.title" class="post-card__title">{{ post.title }}</h3>
          <p
            class="post-card__text"
            :class="{ 'is-clamped': !expandedPosts.includes(post.id) }"
          >
            {{ post.content }}
          </p>
          <button
            v-if="!expandedPosts.includes(post.id) && post.content.length > 120"
            type="button"
            class="post-card__more"
            @click="toggleExpand(post.id)"
          >
            Tovább
          </button>
          <div v-if="post.imageUrl" class="post-card__media">
            <q-img :src="post.imageUrl" :ratio="16 / 9" />
          </div>
        </div>

        <footer class="post-card__actions">
          <button type="button" class="post-btn post-btn--ghost" @click="askOrganizer(post)">
            <q-icon name="sym_r_chat" size="16px" />
            Üzenet
          </button>
          <button
            v-if="!post.isRead"
            type="button"
            class="post-btn post-btn--primary"
            @click="toggleReadStatus(post)"
          >
            <q-icon name="sym_r_done_all" size="16px" />
            Olvasva
          </button>
          <button
            v-else
            type="button"
            class="post-btn post-btn--ghost"
            @click="toggleReadStatus(post)"
          >
            Olvasatlan
          </button>
        </footer>
      </article>
    </div>

    <div v-else class="empty-state relative z-10">
      <q-icon name="sym_r_newspaper" size="28px" class="text-slate-600 q-mb-xs" />
      <p>Nincs hír ebben a listában</p>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

interface NewsPost {
  id: number;
  eventId: string;
  authorName: string;
  authorAvatar: string;
  eventName: string;
  timeAgo: string;
  title: string;
  content: string;
  imageUrl: string;
  isRead: boolean;
}

const isFiltered = computed(() => !!route.query.eventId);

const mockPosts = ref<NewsPost[]>([
  {
    id: 1,
    eventId: 'e2',
    authorName: 'Szabó Péter',
    authorAvatar: 'https://i.pravatar.cc/150?u=peter',
    eventName: 'OlimPub Kvíz #22',
    timeAgo: '10 perce',
    title: 'Fontos helyszínváltozás!',
    content:
      'Sziasztok!\n\nA ma esti kvíz helyszíne a hirtelen jött eső miatt megváltozott. Nem a teraszon, hanem a belső nagyteremben leszünk.\n\nKérlek, érkezzetek 10 perccel korábban, hogy mindenkinek jusson kényelmes asztal. Várunk titeket szeretettel!',
    imageUrl:
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop',
    isRead: false,
  },
  {
    id: 4,
    eventId: 'e1',
    authorName: 'Szervezőség',
    authorAvatar: 'https://i.pravatar.cc/150?u=admin',
    eventName: 'XXI. MLBKT KONGRESSZUS',
    timeAgo: '10 perce',
    title: 'Figyelem! Szekció ülés teremcsere',
    content:
      'A "Jövő Ellátási Láncai" szekció a B teremből átkerült a C terembe a nagy érdeklődésre való tekintettel.',
    imageUrl: '',
    isRead: false,
  },
  {
    id: 5,
    eventId: 'e1',
    authorName: 'Szervezőség',
    authorAvatar: 'https://i.pravatar.cc/150?u=admin',
    eventName: 'XXI. MLBKT KONGRESSZUS',
    timeAgo: '2 napja',
    title: 'Gálavacsora menü',
    content:
      'Feltöltöttük a gálavacsora menüjét az információs pultnál lévő QR kódokra. Vegán és mentes opciókat a pincéreknél tudjátok jelezni!',
    imageUrl:
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop',
    isRead: true,
  },
  {
    id: 2,
    eventId: 'system',
    authorName: 'EventJoy Csapat',
    authorAvatar: 'https://i.pravatar.cc/150?u=admin',
    eventName: 'EventJoy Exkluzív',
    timeAgo: '2 napja',
    title: 'Megújult az applikáció!',
    content:
      'Örömmel jelentjük be, hogy elérhető a vadonatúj EventJoy alkalmazás. Ezentúl sokkal gyorsabban tudtok jegyet venni, és bekerült a Hírfolyam funkció is!\nNézzetek szét a felületen és ha bármi hibát találtok, írjatok nekünk bátran.',
    imageUrl: '',
    isRead: true,
  },
  {
    id: 3,
    eventId: 'e3',
    authorName: 'Kovács Anna',
    authorAvatar: 'https://i.pravatar.cc/150?u=anna',
    eventName: 'Tech Meetup 2026',
    timeAgo: '1 hete',
    title: 'Prezentációk letöltése',
    content:
      'Köszönjük mindenkinek a részvételt a múlt heti Tech Meetupon!\n\nAz összes előadó prezentációját feltöltöttük, ezen a linken keresztül tudjátok letölteni PDF formátumban: www.example.com/download\n\nJövőre találkozunk!',
    imageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop',
    isRead: true,
  },
]);

const filteredPosts = computed(() => {
  const eventId = route.query.eventId;
  if (eventId) {
    return mockPosts.value.filter((post) => post.eventId === String(eventId));
  }
  return mockPosts.value;
});

const pageTitle = computed(() => {
  if (isFiltered.value && filteredPosts.value.length) {
    return filteredPosts.value[0].eventName;
  }
  return 'Hírfolyam';
});

const expandedPosts = ref<number[]>([]);

function toggleExpand(id: number) {
  if (!expandedPosts.value.includes(id)) expandedPosts.value.push(id);
}

function toggleReadStatus(post: NewsPost) {
  post.isRead = !post.isRead;
}

function askOrganizer(_post: NewsPost) {
  void router.push('/messages');
}

function goBackToEvent() {
  const eventId = route.query.eventId;
  if (eventId) void router.push(`/event/${eventId}`);
  else void router.push('/');
}
</script>

<style scoped lang="scss">
.page-kicker {
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  min-width: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 120px;
}

.post-card {
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.post-card.is-unread {
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.12);
}

.post-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 0;
}

.post-card__avatar {
  border: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.post-card__meta {
  min-width: 0;
  flex: 1;
}

.post-card__author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
}

.post-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
}

.post-card__sub {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-card__sep {
  color: #64748b;
  margin: 0 4px;
}

.post-card__content {
  padding: 12px 16px 8px;
}

.post-card__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: #ffffff;
}

.post-card__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
  white-space: pre-line;
}

.post-card__text.is-clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}

.post-card__more {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}

.post-card__media {
  margin-top: 12px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.post-card__actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}

.post-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.post-btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.post-btn--primary {
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
}

.empty-state {
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px 16px;
  text-align: center;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
</style>
