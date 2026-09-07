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
        <q-icon name="sym_r_notifications" size="18px" />
        <span>Értesítések</span>
      </div>
      <button type="button" class="inbox-menu__mark" @click="markAllRead">Mind olvasva</button>
    </div>

    <div class="inbox-menu__list">
      <button
        v-for="item in preview"
        :key="item.id"
        type="button"
        class="inbox-thread"
        :class="{ 'is-unread': item.unread }"
        v-close-popup
        @click="openItem(item)"
      >
        <div class="inbox-thread__avatar">
          <div class="notif-icon">
            <q-icon :name="item.icon" size="20px" />
          </div>
        </div>

        <div class="inbox-thread__body">
          <div class="inbox-thread__top">
            <span class="inbox-thread__name">{{ item.title }}</span>
            <span class="inbox-thread__time">{{ item.time }}</span>
          </div>
          <p class="inbox-thread__preview">{{ item.body }}</p>
        </div>

        <span v-if="item.unread" class="inbox-thread__dot" />
      </button>
    </div>

    <router-link to="/notifications" v-close-popup class="inbox-menu__all">
      Összes értesítés
    </router-link>
  </q-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { previewNotifications, markAllNotificationsRead } from 'src/utils/notificationMock';

const router = useRouter();

const preview = computed(() => previewNotifications.value.slice(0, 4));

function markAllRead() {
  markAllNotificationsRead();
}

function openItem(item: { id: number; to?: string }) {
  void router.push(item.to || '/notifications');
}
</script>

<style lang="scss">
/* Same dropdown chrome as MessagesMenu — q-menu teleports outside scoped CSS. */
.inbox-menu.q-menu {
  width: min(360px, calc(100vw - 24px));
  padding: 12px 12px 10px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(56, 189, 248, 0.22);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}
</style>

<style scoped lang="scss">
.notif-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.inbox-thread.is-unread .notif-icon {
  background: rgba(56, 189, 248, 0.2);
}
</style>
