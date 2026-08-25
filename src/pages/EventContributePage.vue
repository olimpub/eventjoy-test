<template>
  <q-page class="bg-brand-dark text-white relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 px-4 sm:px-6 pt-4 pb-24 max-w-2xl mx-auto w-full">
      <section class="contribute-panel">
        <div class="contribute-panel__top">
          <RoleSwitchChip
            :event-id="eventId"
            :current="enteredRole"
            :roles="enterableRoles"
          />
          <q-btn
            icon="close"
            flat
            round
            dense
            class="text-slate-400 hover:text-white bg-white/5"
            aria-label="Bezárás"
            @click="closePanel"
          />
        </div>
        <h1 class="contribute-panel__title">{{ eventName }}</h1>
      </section>

      <div class="contribute-empty">
        <ComingSoonCube />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import ComingSoonCube from 'src/components/event/ComingSoonCube.vue';
import { useEventStore } from 'src/stores/event';
import {
  eventDatasheetKind,
  eventGameMasterPath,
  eventRoleQuery,
  gameMasterEnterBlocked,
} from 'src/utils/eventRoleNav';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();

const eventId = computed(() => String(route.params.id));

const dbEvent = computed(() => {
  const targetId = eventId.value;
  return (
    eventStore.events?.find((e: any) => String(e.id) === targetId) ||
    eventStore.myEvents?.find((e: any) => String(e.id) === targetId) ||
    null
  );
});

const eventName = computed(() => {
  const e = dbEvent.value;
  if (!e) return 'Esemény';
  return e.Title || e.EventName || e.Name || 'Esemény';
});

const enterableRoles = computed(() => {
  const e = dbEvent.value;
  if (!e) return [];
  return eventStore.getEnterableRolesForEvent(e.id, e.EventTypeID ?? e.eventTypeId);
});

const enteredRole = computed(() => {
  const roles = enterableRoles.value;
  const qUser = route.query.eventUserId;
  if (qUser != null && qUser !== '') {
    const byUser = roles.find((r) => String(r.eventUserId) === String(qUser));
    if (byUser) return byUser;
  }
  const qRole = route.query.eventRoleId;
  if (qRole != null && qRole !== '') {
    const byRole = roles.find((r) => String(r.eventRoleId) === String(qRole));
    if (byRole) return byRole;
  }
  return (
    roles.find((r) => eventDatasheetKind(r) === 'gamemaster') ||
    roles.find((r) => eventDatasheetKind(r) === 'contributor') ||
    roles.find((r) => !r.isOrganizer) ||
    roles[0] ||
    null
  );
});

watch(
  enteredRole,
  (role) => {
    if (eventDatasheetKind(role) !== 'gamemaster') return;
    const blocked = gameMasterEnterBlocked(eventId.value, role);
    if (blocked) {
      $q.notify({
        message: blocked,
        color: 'dark',
        textColor: 'orange-4',
        position: 'top',
      });
      router.replace({ path: `/event/${eventId.value}` });
      return;
    }
    router.replace({
      path: eventGameMasterPath(eventId.value),
      query: { ...route.query, ...eventRoleQuery(role) },
    });
  },
  { immediate: true }
);

function closePanel() {
  router.push({ path: `/event/${eventId.value}` });
}
</script>

<style scoped>
.contribute-panel {
  position: relative;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 16px 16px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  margin-bottom: 16px;
}

.contribute-panel__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.contribute-panel__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  color: #fff;
  text-align: center;
}

.contribute-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42vh;
}
</style>
