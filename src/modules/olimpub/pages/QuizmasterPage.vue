<template>
  <q-page class="op-qm-page">
    <OpQuizmasterHome
      prompt=""
      correct=""
      :time-sec="20"
      :event-id="eventId"
      :initial-area="startArea"
      @close="closePanel"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OpQuizmasterHome from '../components/OpQuizmasterHome.vue';
import { eventOrganizerManagePath } from 'src/utils/eventRoleNav';

const route = useRoute();
const router = useRouter();

const eventId = computed(() => {
  const id = Number(route.params.id);
  return Number.isFinite(id) ? id : null;
});

const startArea = computed<'results' | null>(() => (route.query.area === 'results' ? 'results' : null));

function closePanel() {
  if (eventId.value == null) {
    void router.push({ name: 'my_events' });
    return;
  }
  const query = { ...route.query };
  delete query.area;
  void router.push({
    path: eventOrganizerManagePath(eventId.value),
    query,
  });
}
</script>

<style scoped>
.op-qm-page {
  min-height: 100%;
  padding: 0;
}
</style>
