<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="join-page flex items-center justify-center min-h-screen bg-brand-dark text-white relative overflow-hidden q-pa-md">
        <div class="join-watermark pointer-events-none select-none" aria-hidden="true">
          <img src="~assets/eventjoy_icon.svg" alt="" />
        </div>
        <div class="join-card relative z-10 w-full max-w-md text-center">
          <img src="~assets/eventjoy_logo_full_dark.svg" alt="EventJoy" class="join-logo" />
          <h1 class="join-title">Helyszíni belépés</h1>
          <p v-if="preview?.Title" class="join-event">{{ preview.Title }}</p>

          <div v-if="loading" class="join-state">
            <q-spinner color="brand-primary" size="36px" />
            <p>Ellenőrzés…</p>
          </div>

          <template v-else>
            <p class="join-hint">{{ hintText }}</p>
            <p v-if="errorMessage" class="join-error">{{ errorMessage }}</p>
            <button
              v-if="showLogin"
              type="button"
              class="join-btn"
              :disabled="busy"
              @click="goLogin"
            >
              Bejelentkezés
            </button>
            <button
              v-else-if="!fatal"
              type="button"
              class="join-btn"
              :disabled="busy"
              @click="continueJoin"
            >
              {{ busy ? 'Belépés…' : 'Folytatás' }}
            </button>
          </template>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>

  <q-dialog v-model="nameOpen" persistent position="bottom">
    <q-card class="join-name">
      <div class="join-name__handle" aria-hidden="true" />
      <h2 class="join-name__title">Add meg a neved</h2>
      <p class="join-name__hint">A belépéshez kell a család- és a keresztnév.</p>
      <form class="join-name__form" @submit.prevent="submitName">
        <label class="join-name__field">
          <span>Családnév *</span>
          <input v-model="lastName" type="text" autocomplete="family-name" :disabled="busy" />
        </label>
        <label class="join-name__field">
          <span>Keresztnév *</span>
          <input v-model="firstName" type="text" autocomplete="given-name" :disabled="busy" />
        </label>
        <p v-if="nameError" class="join-error">{{ nameError }}</p>
        <button type="submit" class="join-btn" :disabled="busy">
          {{ busy ? 'Mentés…' : 'Mentés és belépés' }}
        </button>
      </form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { useEventStore } from 'src/stores/event';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import { enterEventSession } from 'src/utils/eventEnter';
import {
  eventDatasheetKind,
  eventRoleEnterBlocked,
  eventRolePath,
  eventRoleQuery,
} from 'src/utils/eventRoleNav';
import {
  fetchEventJoinPreview,
  joinEventByUid,
  saveUserDisplayName,
  userNeedsDisplayName,
  type EventJoinPreview,
} from 'src/utils/eventJoin';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const eventStore = useEventStore();

const loading = ref(true);
const busy = ref(false);
const fatal = ref(false);
const errorMessage = ref('');
const preview = ref<EventJoinPreview | null>(null);
const nameOpen = ref(false);
const firstName = ref('');
const lastName = ref('');
const nameError = ref('');

const eventUid = computed(() => decodeURIComponent(String(route.params.eventUid || '').trim()));

const showLogin = computed(() => !authStore.isAuthenticated && !fatal.value);

const hintText = computed(() => {
  if (fatal.value) return '';
  if (!authStore.isAuthenticated) {
    return 'A belépéshez jelentkezz be e-mail címmel vagy telefonszámmal. Kódot küldünk, jelszó nem kell.';
  }
  if (preview.value?.CheckInOpen === false) {
    return preview.value.EventStatusName
      ? `A helyszíni belépés még nem él (${preview.value.EventStatusName}).`
      : 'A helyszíni belépés a bejelentkezéstől él.';
  }
  return 'Ellenőrizzük a belépést…';
});

function goLogin() {
  void router.replace({ path: '/login', query: { next: route.fullPath } });
}

async function openEvent(eventId: number, eventUserId: number | null) {
  try {
    await eventStore.refreshEventData();
  } catch {
    /* a join válasz elég a navigációhoz */
  }
  if (eventUserId != null) {
    try {
      await eventStore.loadEventUserDataSheet(eventUserId);
    } catch {
      /* EventUsers a katalógusból */
    }
  }
  const roles = eventStore.getEnterableRolesForEvent(eventId);
  const player =
    roles.find((role) => eventDatasheetKind(role, eventId) === 'player') || roles[0] || null;
  if (player && !eventRoleEnterBlocked(eventId, player)) {
    try {
      await enterEventSession(eventId, player);
    } catch {
      /* a route attól még nyílhat */
    }
    await router.replace({
      path: eventRolePath(eventId, player),
      query: eventRoleQuery(player),
    });
    return;
  }
  await router.replace(`/event/${eventId}`);
}

async function submitJoin() {
  errorMessage.value = '';
  busy.value = true;
  try {
    const result = await joinEventByUid(eventUid.value);
    const eventId = result.EventID ?? preview.value?.EventID ?? null;
    if (eventId == null) {
      errorMessage.value = result.message || 'A belépés kész, de hiányzik az esemény azonosítója.';
      return;
    }
    await openEvent(eventId, result.EventUserID);
  } catch (error) {
    errorMessage.value = readAxiosErrorMessage(error, 'A helyszíni belépés sikertelen.');
    if (/neved/i.test(errorMessage.value)) {
      nameOpen.value = true;
    }
  } finally {
    busy.value = false;
  }
}

function continueJoin() {
  if (preview.value?.CheckInOpen === false) {
    fatal.value = true;
    errorMessage.value = preview.value.EventStatusName
      ? `A helyszíni belépés még nem él (${preview.value.EventStatusName}).`
      : 'A helyszíni belépés a bejelentkezéstől él.';
    return;
  }
  if (!authStore.isAuthenticated) {
    goLogin();
    return;
  }
  if (userNeedsDisplayName(authStore.user)) {
    lastName.value = String(authStore.user?.LastName ?? '').trim();
    firstName.value = String(authStore.user?.FirstName ?? '').trim();
    nameError.value = '';
    nameOpen.value = true;
    return;
  }
  void submitJoin();
}

async function submitName() {
  const last = lastName.value.trim();
  const first = firstName.value.trim();
  if (!last || !first) {
    nameError.value = 'Add meg a család- és a keresztnevet.';
    return;
  }
  nameError.value = '';
  busy.value = true;
  try {
    await saveUserDisplayName(first, last);
    nameOpen.value = false;
    await submitJoin();
  } catch (error) {
    nameError.value = readAxiosErrorMessage(error, 'A név mentése sikertelen.');
    busy.value = false;
  }
}

async function boot() {
  loading.value = true;
  errorMessage.value = '';
  fatal.value = false;
  if (!eventUid.value) {
    fatal.value = true;
    errorMessage.value = 'Érvénytelen belépési link.';
    loading.value = false;
    return;
  }
  try {
    preview.value = await fetchEventJoinPreview(eventUid.value);
    if (preview.value.CheckInOpen === false) {
      fatal.value = true;
      errorMessage.value = preview.value.EventStatusName
        ? `A helyszíni belépés még nem él (${preview.value.EventStatusName}).`
        : 'A helyszíni belépés a bejelentkezéstől él.';
      loading.value = false;
      return;
    }
  } catch {
    preview.value = {
      EventUID: eventUid.value,
      EventID: null,
      Title: 'Esemény',
      CheckInOpen: null,
      EventStatusName: '',
    };
  }
  loading.value = false;
  if (!authStore.isAuthenticated) {
    goLogin();
    return;
  }
  continueJoin();
}

onMounted(() => {
  void boot();
});
</script>

<style scoped>
.join-watermark {
  position: absolute;
  right: -4rem;
  top: 18%;
  width: 16rem;
  height: 16rem;
  opacity: 0.04;
}
.join-watermark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.join-logo {
  height: 36px;
  margin: 0 auto 20px;
}
.join-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}
.join-event {
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
}
.join-hint {
  margin: 12px 0 24px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: #94a3b8;
}
.join-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
}
.join-error {
  margin: 0 0 16px;
  color: #fda4af;
  font-size: 13px;
  font-weight: 700;
}
.join-btn {
  width: 100%;
  border: none;
  border-radius: 16px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 800;
  background: #38bdf8;
  color: #0f172a;
  cursor: pointer;
}
.join-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.join-name {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: #0f172a;
  color: #fff;
  padding: 8px 20px 28px;
}
.join-name__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 16px;
}
.join-name__title {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}
.join-name__hint {
  margin: 8px 0 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}
.join-name__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.join-name__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}
.join-name__field input {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 600;
}
</style>
