<template>
  <div
    v-if="visible"
    class="now-playing"
    :class="{ 'is-footer-up': footerVisible }"
    role="status"
    @click="openEvent"
  >
    <div class="now-playing__row">
      <div class="now-playing__pulse" aria-hidden="true">
        <span class="now-playing__ping" />
        <span class="now-playing__dot" />
      </div>
      <div class="now-playing__copy">
        <span class="now-playing__label">{{ statusLabel }}</span>
        <span class="now-playing__title">{{ eventName }}</span>
      </div>
      <q-btn
        round
        dense
        flat
        icon="play_arrow"
        class="now-playing__play"
        size="13px"
        @click.stop="openEvent"
      />
      <q-btn
        round
        dense
        flat
        icon="close"
        class="now-playing__close"
        size="11px"
        aria-label="Bezárás"
        @click.stop="dismiss"
      />
    </div>
    <div class="now-playing__track" aria-hidden="true">
      <div class="now-playing__fill" :style="{ width: progressPct + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { useUiStore } from 'src/stores/ui';

const NOW_PLAYING_ROUTES = new Set([
  'home',
  'my_events',
  'klubhub',
  'profile',
  'newsfeed',
  'notifications',
  'messages',
  'chat_detail',
]);

const LS_DISMISSED = 'ej_nowPlayingDismissed';

defineProps<{
  footerVisible: boolean;
}>();

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const uiStore = useUiStore();

const dismissedId = ref<string | null>(readDismissed());

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(LS_DISMISSED);
  } catch {
    return null;
  }
}

const event = computed(() => eventStore.nearestInProgressEvent);

const visible = computed(() => {
  if (uiStore.createWizardOpen) return false;
  if (!NOW_PLAYING_ROUTES.has(String(route.name || ''))) return false;
  const ev = event.value;
  if (!ev?.id) return false;
  if (dismissedId.value != null && String(dismissedId.value) === String(ev.id)) return false;
  return true;
});

const eventName = computed(() => {
  const ev = event.value;
  if (!ev) return '';
  return String(ev.Title || ev.EventName || ev.Name || 'Esemény');
});

const statusLabel = computed(() => {
  const ev = event.value;
  if (!ev) return 'Jelenleg fut';
  const statusId = ev.EventStatusID ?? ev.eventStatusID ?? ev.StatusID ?? ev.StatusId;
  return masterDataStore.getEventStatusNameById(statusId, 'Jelenleg fut');
});

const progressPct = computed(() => {
  const ev = event.value;
  if (!ev) return 8;
  const start = new Date(ev.StartAtUtc ?? ev.startAtUtc ?? '').getTime();
  const end = new Date(ev.EndAtUtc ?? ev.endAtUtc ?? '').getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 8;
  const pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.min(96, Math.max(6, pct));
});

watch(event, (next) => {
  if (!next?.id) return;
  if (dismissedId.value != null && String(dismissedId.value) !== String(next.id)) {
    dismissedId.value = null;
  }
});

function openEvent() {
  const ev = event.value;
  if (!ev?.id) return;
  void router.push(`/event/${ev.id}`);
}

function dismiss() {
  const ev = event.value;
  if (!ev?.id) return;
  dismissedId.value = String(ev.id);
  try {
    sessionStorage.setItem(LS_DISMISSED, String(ev.id));
  } catch {
    /* ignore */
  }
}
</script>

<style scoped>
.now-playing {
  position: fixed;
  z-index: 3500;
  left: 16px;
  bottom: 88px;
  width: min(320px, calc(100vw - 32px));
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
  border: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15);
  backdrop-filter: blur(12px);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease-out, bottom 0.3s ease-out;
}

.now-playing.is-footer-up {
  bottom: 80px;
}

.now-playing:hover {
  transform: scale(1.02);
}

.now-playing:active {
  transform: scale(0.98);
}

.now-playing__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 12px;
}

.now-playing__pulse {
  position: relative;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.now-playing__ping {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: #38bdf8;
  opacity: 0.75;
  animation: now-playing-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.now-playing__dot {
  position: relative;
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: #38bdf8;
}

.now-playing__copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.now-playing__label {
  font-size: 10px;
  font-weight: 800;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.now-playing__title {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.now-playing__play {
  flex-shrink: 0;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.now-playing__close {
  flex-shrink: 0;
  color: #94a3b8;
}

.now-playing__close:hover {
  color: #ffffff;
}

.now-playing__track {
  height: 2px;
  width: 100%;
  background: rgba(56, 189, 248, 0.1);
}

.now-playing__fill {
  height: 100%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

@keyframes now-playing-ping {
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
</style>
