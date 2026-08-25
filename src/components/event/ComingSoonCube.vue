<template>
  <div class="soon-cube">
    <span v-if="icon" class="soon-cube__icon">
      <q-icon :name="icon" size="32px" />
    </span>
    <span v-if="title" class="soon-cube__title">{{ title }}</span>
    <span class="soon-cube__label">Hamarosan</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  icon?: string;
}>();
</script>

<style scoped>
.soon-cube {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 220px;
  height: 220px;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;
}

.soon-cube__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.soon-cube__title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
  text-align: center;
}

.soon-cube__label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}
</style>
