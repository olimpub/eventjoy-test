<template>
  <q-page class="op-results-redirect" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  const id = route.params.id;
  void router.replace({
    path: `/olimpub/event/${String(id)}/quizmaster`,
    query: { ...route.query, area: 'results' },
  });
});
</script>
