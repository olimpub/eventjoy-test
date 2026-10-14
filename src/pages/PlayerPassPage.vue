<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="pass-page flex items-center justify-center min-h-screen bg-brand-dark text-white q-pa-md">
        <div class="pass-card text-center">
          <img src="~assets/eventjoy_logo_full_dark.svg" alt="EventJoy" class="pass-logo" />
          <h1 class="pass-title">Belépő</h1>

          <div v-if="loading" class="pass-state">
            <q-spinner color="brand-primary" size="36px" />
            <p>Beléptetés…</p>
          </div>

          <template v-else-if="waiting">
            <p class="pass-hint">A telefonod ehhez a belépőhöz tartozik.</p>
            <p class="pass-hint">Az adatlap a bejelentkezéskor nyílik meg.</p>
          </template>

          <template v-else>
            <p v-if="errorMessage" class="pass-error">{{ errorMessage }}</p>
            <p v-else class="pass-hint">A belépő kód nem nyitható.</p>
          </template>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { useEventStore } from 'src/stores/event';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import { enterEventSession } from 'src/utils/eventEnter';
import { eventRolePath, eventRoleQuery } from 'src/utils/eventRoleNav';
import { joinWithPlayerDevicePass } from 'src/utils/playerDevicePass';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const eventStore = useEventStore();

const loading = ref(true);
const waiting = ref(false);
const errorMessage = ref('');

async function openDatasheet(eventId: number, eventUserId: number) {
  try {
    await eventStore.refreshEventData();
  } catch {
    /* a belépés válasza elég a navigációhoz */
  }
  try {
    await eventStore.loadEventUserDataSheet(eventUserId);
  } catch {
    /* a szerepek a katalógusból is jöhetnek */
  }
  const roles = eventStore.getEnterableRolesForEvent(eventId);
  const role = roles.find((item) => item.eventUserId === eventUserId) || null;
  if (!role) {
    waiting.value = true;
    return;
  }
  try {
    await enterEventSession(eventId, role);
  } catch {
    /* az útvonal ettől még nyílhat */
  }
  await router.replace({
    path: eventRolePath(eventId, role),
    query: eventRoleQuery(role),
  });
}

onMounted(async () => {
  const passToken = decodeURIComponent(String(route.params.token || '')).trim();
  if (!passToken) {
    loading.value = false;
    errorMessage.value = 'Hiányzik a belépő kód.';
    return;
  }
  try {
    const result = await joinWithPlayerDevicePass(passToken);
    authStore.beginFreshSession(result.token);
    try {
      await authStore.fetchBootData();
    } catch {
      /* az adatlap a belépés azonosítóival is nyílhat */
    }
    if (!result.checkedIn) {
      waiting.value = true;
      loading.value = false;
      return;
    }
    await openDatasheet(result.eventId, result.eventUserId);
  } catch (error) {
    errorMessage.value = readAxiosErrorMessage(error, 'A belépő kód nem érvényes.');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.pass-card {
  width: 100%;
  max-width: 420px;
}

.pass-logo {
  width: 180px;
  height: auto;
  margin: 0 auto 20px;
}

.pass-title {
  margin: 0 0 16px;
  font-size: 28px;
  font-weight: 800;
}

.pass-state,
.pass-hint,
.pass-error {
  margin: 8px 0;
  font-size: 15px;
  line-height: 1.45;
  color: #cbd5e1;
}

.pass-error {
  color: #fb7185;
  font-weight: 700;
}
</style>
