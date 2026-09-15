<template>
  <q-page class="sa-soon">
    <q-icon name="hourglass_empty" size="42px" class="text-amber-400 q-mb-md" />
    <h1>{{ title }}</h1>
    <p>Ez a modul a v1-ben még nem elérhető. Hamarosan.</p>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const titles: Record<string, string> = {
  data: 'Adatok',
  flows: 'Folyamatok',
  comm: 'Kommunikáció',
};
const title = computed(() => titles[String(route.params.section || '')] || 'Hamarosan');
</script>

<style scoped lang="scss">
.sa-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 32px 20px;
  color: #cbd5e1;

  h1 {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 800;
    color: #fde68a;
  }

  p {
    margin: 0;
    color: #94a3b8;
  }
}
</style>
