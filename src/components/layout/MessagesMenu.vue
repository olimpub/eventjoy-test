<template>
  <q-menu
    class="inbox-menu"
    anchor="bottom right"
    self="top right"
    :offset="[0, 8]"
    transition-show="fade"
    transition-hide="fade"
  >
    <div class="inbox-menu__head">
      <div class="inbox-menu__title">
        <q-icon name="sym_r_forum" size="18px" />
        <span>Üzenetek</span>
      </div>
      <button type="button" class="inbox-menu__mark">Mind olvasva</button>
    </div>

    <div class="inbox-menu__list">
      <button
        v-for="thread in threads"
        :key="thread.id"
        type="button"
        class="inbox-thread"
        :class="{ 'is-unread': thread.unread }"
        v-close-popup
        @click="openThread(thread.id)"
      >
        <div class="inbox-thread__avatar">
          <q-avatar v-if="thread.avatar" size="40px">
            <img :src="thread.avatar" :alt="thread.name" />
          </q-avatar>
          <div v-else class="inbox-thread__group">
            <q-icon name="sym_r_groups" size="20px" />
          </div>
          <span v-if="thread.online" class="inbox-thread__online" />
        </div>

        <div class="inbox-thread__body">
          <div class="inbox-thread__top">
            <span class="inbox-thread__name">{{ thread.name }}</span>
            <span class="inbox-thread__time">{{ thread.time }}</span>
          </div>
          <p class="inbox-thread__preview">{{ thread.preview }}</p>
        </div>

        <span v-if="thread.unread" class="inbox-thread__dot" />
      </button>
    </div>

    <router-link
      to="/messages"
      v-close-popup
      class="inbox-menu__all"
    >
      Összes üzenet
    </router-link>
  </q-menu>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const threads = [
  {
    id: 1,
    name: 'Kovács Péter',
    preview: 'Szia! Találkozunk a kávészünetben a B teremnél?',
    time: '10:42',
    avatar: 'https://i.pravatar.cc/150?u=peter',
    unread: true,
    online: true,
  },
  {
    id: 2,
    name: 'Szabó Gábor',
    preview: 'Átküldtem a jegyzeteket az előző panelbeszélgetésről.',
    time: '09:15',
    avatar: 'https://i.pravatar.cc/150?u=szabo',
    unread: true,
    online: false,
  },
  {
    id: 3,
    name: 'Nagy Anna',
    preview: 'El tudod küldeni a tegnapi prezentációt?',
    time: 'Tegnap',
    avatar: 'https://i.pravatar.cc/150?u=anna',
    unread: false,
    online: true,
  },
  {
    id: 4,
    name: 'Kiss Tamás',
    preview: 'Rendben, köszi az infót!',
    time: 'Hétfő',
    avatar: 'https://i.pravatar.cc/150?u=tamas',
    unread: false,
    online: false,
  },
  {
    id: 5,
    name: 'Marketing Csapat',
    preview: 'Mindenki megkapta az egyedi QR kódokat?',
    time: 'Múlt héten',
    avatar: '',
    unread: false,
    online: false,
  },
];

function openThread(id: number) {
  void router.push(`/messages/${id}`);
}
</script>

<style lang="scss">
.inbox-menu.q-menu {
  width: min(360px, calc(100vw - 24px));
  padding: 12px 12px 10px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(56, 189, 248, 0.22);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.inbox-menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 4px 10px;
}

.inbox-menu__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #38bdf8;
}

.inbox-menu__mark {
  padding: 6px 10px;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.08);
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.inbox-menu__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inbox-thread {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.55);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.inbox-thread:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(56, 189, 248, 0.22);
}

.inbox-thread.is-unread {
  border-color: rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.08);
}

.inbox-thread__avatar {
  position: relative;
  flex-shrink: 0;
}

.inbox-thread__group {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.inbox-thread__online {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  border: 2px solid #0f172a;
}

.inbox-thread__body {
  min-width: 0;
  flex: 1;
}

.inbox-thread__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.inbox-thread__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 800;
  color: #f8fafc;
}

.inbox-thread.is-unread .inbox-thread__name {
  color: #7dd3fc;
}

.inbox-thread__time {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.inbox-thread.is-unread .inbox-thread__time {
  color: #38bdf8;
}

.inbox-thread__preview {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.inbox-thread.is-unread .inbox-thread__preview {
  color: #cbd5e1;
}

.inbox-thread__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
}

.inbox-menu__all {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  border-radius: 14px;
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
}

.inbox-menu__all:hover {
  background: rgba(56, 189, 248, 0.2);
}
</style>
