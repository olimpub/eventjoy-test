<template>
  <q-page class="sa-hub">
    <div class="sa-hub__head">
      <div class="sa-kicker">Adatok</div>
      <h1>Mester adatok</h1>
    </div>
    <div class="manage-grid">
      <button type="button" class="manage-tile" @click="router.push({ name: 'sysadmin-kabalas' })">
        <span class="manage-tile__icon">
          <q-icon name="sym_r_pets" size="26px" />
        </span>
        <span class="manage-tile__label">Kabalák</span>
      </button>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<style scoped lang="scss">
.sa-hub {
  padding: 12px 16px 24px;
  max-width: 42rem;
  margin: 0 auto;
}

.sa-hub__head {
  margin-bottom: 10px;
}

.sa-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fbbf24;
}

h1 {
  margin: 2px 0 0;
  font-size: 24px;
  font-weight: 800;
}

.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.manage-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 108px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: inherit;
  cursor: pointer;
  text-align: center;
}

.manage-tile:active {
  transform: scale(0.98);
}

.manage-tile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.14);
  color: #fbbf24;
}

.manage-tile__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
}
</style>
