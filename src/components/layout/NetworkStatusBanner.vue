<template>
  <div v-if="visible" class="net-banner" :class="{ 'is-reconnect': reconnecting }" role="status">
    <q-icon :name="reconnecting ? 'sym_r_wifi_tethering' : 'sym_r_wifi_off'" size="18px" />
    <span>{{ reconnecting ? 'Újracsatlakozás…' : 'Nincs internetkapcsolat' }}</span>
  </div>
</template>

<script setup lang="ts">
import { networkBannerVisible, networkReconnecting } from 'src/utils/networkStatus';

const visible = networkBannerVisible;
const reconnecting = networkReconnecting;
</script>

<style scoped>
.net-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 7000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #fff7ed;
  background: #9a3412;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}

.net-banner.is-reconnect {
  background: #1d4ed8;
  color: #eff6ff;
}
</style>
