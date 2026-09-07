<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    <div class="absolute -right-24 top-[15%] w-96 h-96 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 q-mb-md mt-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="page-kicker">
          <q-icon name="sym_r_notifications" color="#38bdf8" size="16px" />
          Értesítések
        </h2>
        <button
          v-if="unreadCount"
          type="button"
          class="mark-btn"
          @click="markAllNotificationsRead"
        >
          Mind olvasva
        </button>
      </div>
    </div>

    <div class="feed-seg q-mb-md" role="tablist" aria-label="Értesítés szűrő">
      <span
        class="feed-seg__indicator"
        :class="{
          'is-left': tab === 'all',
          'is-mid': tab === 'events',
          'is-right': tab === 'system',
        }"
        aria-hidden="true"
      />
      <button
        type="button"
        role="tab"
        class="feed-seg__btn"
        :class="{ 'is-active': tab === 'all' }"
        :aria-selected="tab === 'all'"
        @click="tab = 'all'"
      >
        <span>Összes</span>
        <span v-if="unreadCount" class="feed-seg__count">{{ unreadCount }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="feed-seg__btn"
        :class="{ 'is-active': tab === 'events' }"
        :aria-selected="tab === 'events'"
        @click="tab = 'events'"
      >
        Események
      </button>
      <button
        type="button"
        role="tab"
        class="feed-seg__btn"
        :class="{ 'is-active': tab === 'system' }"
        :aria-selected="tab === 'system'"
        @click="tab = 'system'"
      >
        Rendszer
      </button>
    </div>

    <div v-if="filtered.length" class="notif-list relative z-10">
      <button
        v-for="item in filtered"
        :key="item.id"
        type="button"
        class="notif-card"
        :class="{ 'is-unread': item.unread }"
        @click="openItem(item)"
      >
        <div class="notif-card__icon">
          <q-icon :name="item.icon" size="22px" />
        </div>
        <div class="notif-card__body">
          <div class="notif-card__top">
            <span class="notif-card__title">{{ item.title }}</span>
            <span class="notif-card__time">{{ item.time }}</span>
          </div>
          <p class="notif-card__text">{{ item.body }}</p>
        </div>
        <span v-if="item.unread" class="notif-card__dot" />
      </button>
    </div>

    <div v-else class="empty-state relative z-10">
      <q-icon name="sym_r_notifications_off" size="28px" class="text-slate-600 q-mb-xs" />
      <p>Nincs ilyen értesítés</p>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  markAllNotificationsRead,
  markNotificationRead,
  previewNotifications,
  unreadNotificationCount,
  type AppNotification,
} from 'src/utils/notificationMock';

const router = useRouter();
const tab = ref<'all' | 'events' | 'system'>('all');

const unreadCount = unreadNotificationCount;

const filtered = computed(() => {
  if (tab.value === 'all') return previewNotifications.value;
  return previewNotifications.value.filter((n) => n.category === tab.value);
});

function openItem(item: AppNotification) {
  markNotificationRead(item.id);
  if (item.to) void router.push(item.to);
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
}

.mark-btn {
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.08);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.feed-seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.feed-seg__indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(33.333% - 4px);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.95) 0%, rgba(20, 184, 166, 0.95) 100%);
  box-shadow:
    0 2px 10px rgba(14, 165, 233, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;

  &.is-left {
    transform: translateX(0);
  }
  &.is-mid {
    transform: translateX(100%);
  }
  &.is-right {
    transform: translateX(200%);
  }
}

.feed-seg__btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 9px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  outline: none;

  &:hover:not(.is-active) {
    color: #e2e8f0;
  }

  &.is-active {
    color: #ffffff;
  }
}

.feed-seg__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  line-height: 1;
}

.feed-seg__btn.is-active .feed-seg__count {
  background: rgba(15, 23, 42, 0.25);
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 120px;
}

.notif-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.notif-card:hover {
  border-color: rgba(56, 189, 248, 0.22);
}

.notif-card.is-unread {
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.12);
}

.notif-card__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.notif-card.is-unread .notif-card__icon {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.28);
  color: #38bdf8;
}

.notif-card__body {
  min-width: 0;
  flex: 1;
}

.notif-card__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.notif-card__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}

.notif-card.is-unread .notif-card__title {
  color: #7dd3fc;
}

.notif-card__time {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.notif-card.is-unread .notif-card__time {
  color: #38bdf8;
}

.notif-card__text {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: #94a3b8;
}

.notif-card.is-unread .notif-card__text {
  color: #cbd5e1;
}

.notif-card__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
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
