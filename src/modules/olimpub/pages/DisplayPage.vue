<template>
  <q-page class="op-scope flex items-center justify-center min-h-full relative overflow-hidden">
    <div class="op-glow" aria-hidden="true" />
    <div class="op-watermark" aria-hidden="true">
      <img :src="brand.iconTransparent" alt="" />
    </div>
    <div class="relative z-10 text-center px-6">
      <img :src="brand.logoDark" alt="Olimpub" class="h-20 mx-auto mb-6 object-contain" />
      <p class="text-lg m-0" style="color: var(--op-muted)">Kivetítő — várakozás a kvízmesterre</p>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import { disconnectEventLive, isEventLiveJoinRoute } from 'src/services/signalrService';
import '../theme.css';

const brand = OLIMPUB_BRAND;
const router = useRouter();

onUnmounted(() => {
  if (!isEventLiveJoinRoute(router.currentRoute.value.name)) {
    disconnectEventLive();
  }
});
</script>
