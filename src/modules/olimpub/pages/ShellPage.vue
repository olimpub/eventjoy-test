<template>
  <q-page class="op-scope relative min-h-full overflow-x-hidden">
    <div class="op-glow" aria-hidden="true" />
    <div class="op-watermark" aria-hidden="true">
      <img :src="brand.iconTransparent" alt="" />
    </div>
    <div class="op-inner">
      <header class="flex items-center gap-3 mb-8">
        <q-btn
          icon="arrow_back"
          flat
          round
          dense
          class="text-slate-400 hover:text-white bg-white/5"
          aria-label="Vissza"
          @click="goBack"
        />
        <div>
          <h1 class="text-xl font-extrabold m-0">{{ title }}</h1>
          <p class="text-sm m-0 mt-1" style="color: var(--op-muted)">{{ eventName }}</p>
        </div>
      </header>
      <section class="op-glass rounded-3xl p-6 text-center">
        <img :src="brand.icon" alt="" class="w-16 h-16 mx-auto mb-4 object-contain" />
        <p class="font-semibold m-0" style="color: var(--op-cream)">{{ hint }}</p>
      </section>
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
  hint: string;
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
