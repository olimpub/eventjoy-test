<template>
  <q-page class="op-scope relative min-h-full overflow-x-hidden">
    <div class="op-glow" aria-hidden="true" />
    <div class="op-watermark" aria-hidden="true">
      <img :src="brand.iconTransparent" alt="" />
    </div>
    <div class="op-inner">
      <header class="op-subhead">
        <q-btn
          icon="arrow_back"
          flat
          round
          dense
          class="text-slate-400 hover:text-white bg-white/5"
          aria-label="Vissza"
          @click="goBack"
        />
        <div class="op-subhead__text">
          <h1>{{ title }}</h1>
          <p>{{ eventName }}</p>
        </div>
        <div class="op-subhead__actions">
          <slot name="actions" />
        </div>
      </header>
      <slot />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import { useEventStore } from 'src/stores/event';
import { eventOrganizerManagePath } from 'src/utils/eventRoleNav';
import '../theme.css';

const props = defineProps<{
  title: string;
}>();

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const brand = OLIMPUB_BRAND;
const eventId = computed(() => String(route.params.id));

const eventName = computed(() => {
  const ev =
    eventStore.events?.find((e: { id?: number | string }) => String(e.id) === eventId.value) ||
    eventStore.myEvents?.find((e: { id?: number | string }) => String(e.id) === eventId.value);
  return ev?.Title || ev?.EventName || ev?.Name || props.title;
});

function goBack() {
  void router.push({
    path: eventOrganizerManagePath(eventId.value),
    query: route.query,
  });
}
</script>

<style scoped>
.op-subhead {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.op-subhead__text {
  min-width: 0;
  flex: 1;
}

.op-subhead__text h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--op-cream);
}

.op-subhead__text p {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--op-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-subhead__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
