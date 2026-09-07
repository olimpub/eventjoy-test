<template>
  <span
    v-if="visible"
    class="event-live-hit"
    :title="statusLabel"
    aria-label="Élő kapcsolat"
  >
    <span class="event-live-dot" :class="dotClass" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { eventLiveHubState, eventLiveJoinedId, isEventLiveRoute } from 'src/services/signalrService';

const route = useRoute();

const hubState = computed(() => eventLiveHubState.value || 'Disconnected');

const joinedHere = computed(() => {
  const joined = eventLiveJoinedId.value;
  if (joined == null) return false;
  return String(route.params.id) === String(joined);
});

const visible = computed(() => isEventLiveRoute(route.name) && !!route.params.id);

const statusKind = computed<'live' | 'reconnecting' | 'down'>(() => {
  if (hubState.value === 'Reconnecting' || hubState.value === 'Connecting') return 'reconnecting';
  if (hubState.value === 'Connected' && joinedHere.value) return 'live';
  return 'down';
});

const statusLabel = computed(() => {
  if (statusKind.value === 'live') return 'Élő kapcsolat';
  if (statusKind.value === 'reconnecting') return 'Újracsatlakozás…';
  return 'Nincs élő kapcsolat';
});

const dotClass = computed(() => ({
  'is-live': statusKind.value === 'live',
  'is-wait': statusKind.value === 'reconnecting',
  'is-down': statusKind.value === 'down',
}));
</script>

<style scoped>
.event-live-hit {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  pointer-events: none;
}

.event-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  opacity: 0.95;
}

.event-live-dot.is-live {
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.22);
}

.event-live-dot.is-wait {
  background: #fbbf24;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.22);
}

.event-live-dot.is-down {
  background: #f87171;
  box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.22);
}
</style>
