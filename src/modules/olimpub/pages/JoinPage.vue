<template>
  <div class="op-scope op-join">
    <div class="op-glow" aria-hidden="true" />
    <div class="op-join__card">
      <img :src="brand.logoDark" alt="Olimpub" class="op-join__logo" />

      <p v-if="loading" class="op-join__status">Keresem az aktuális játékot…</p>

      <template v-else-if="loadError">
        <p class="op-join__status">{{ loadError }}</p>
        <button type="button" class="op-join__btn" @click="load">Újra</button>
      </template>

      <template v-else-if="!current">
        <h1>Nincs aktuális játék</h1>
        <p class="op-join__status">A szervező még nem kapcsolta be az estét. Ez a QR kód állandó, később ugyanitt tudsz belépni.</p>
      </template>

      <template v-else>
        <h1>{{ current.title }}</h1>
        <p v-if="!current.joinOpen" class="op-join__status">
          {{
            current.statusName
              ? `A belépés még nincs nyitva (${current.statusName}).`
              : 'A belépés még nincs nyitva.'
          }}
        </p>
        <p v-else-if="resuming" class="op-join__status">Ezt a telefont már ismerjük. Beléptetlek…</p>
        <form v-else class="op-join__form" @submit.prevent="submit">
          <p class="op-join__status">Egy becenév kell. E-mail és jelszó nem.</p>
          <label class="op-join__field">
            <span>Becenév</span>
            <input
              v-model="nickname"
              type="text"
              name="nickname"
              autocomplete="nickname"
              maxlength="24"
              minlength="2"
              required
              :disabled="busy"
            />
          </label>
          <p v-if="formError" class="op-join__error">{{ formError }}</p>
          <p v-if="organizerBrowser" class="op-join__warn">
            Ez a böngésző be van jelentkezve. A belépés ezt a fiókot lecseréli egy játékosra.
          </p>
          <button type="submit" class="op-join__btn" :disabled="busy || nickname.trim().length < 2">
            {{ busy ? 'Belépés…' : 'Belépek' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import { useAuthStore } from 'src/stores/auth';
import { readApiReturnDescription } from 'src/utils/apiPayload';
import {
  fetchOpCurrent,
  getOrCreateOpDeviceId,
  joinOpDevice,
  readOpDeviceSession,
  resumeOpDevice,
  consumeOpSkipResume,
  type OpCurrentEvent,
  type OpDeviceJoinResult,
} from '../opDevice';
import '../theme.css';

const brand = OLIMPUB_BRAND;
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const busy = ref(false);
const resuming = ref(false);
const loadError = ref('');
const formError = ref('');
const nickname = ref('');
const current = ref<OpCurrentEvent | null>(null);

const organizerBrowser = computed(() => auth.isAuthenticated && auth.user?.TokenKind !== 'OpDevice');

onMounted(() => {
  getOrCreateOpDeviceId();
  const saved = readOpDeviceSession();
  if (saved) nickname.value = saved.nickname;
  void load();
});

async function enter(joined: OpDeviceJoinResult) {
  auth.beginOpDeviceSession({
    token: joined.token,
    eventId: joined.eventId,
    eventUserId: joined.eventUserId,
    nickname: joined.nickname,
    eventTitle: current.value?.title || '',
  });
  await router.replace({ name: 'olimpub-player', params: { id: String(joined.eventId) } });
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    current.value = await fetchOpCurrent();
    const saved = readOpDeviceSession();
    if (saved && current.value && saved.eventId === current.value.eventId) {
      nickname.value = saved.nickname;
    }
    if (current.value) {
      if (consumeOpSkipResume(current.value.eventId)) {
        /* kilépés: marad a join képernyő, nem dobjuk vissza */
      } else {
        resuming.value = true;
        const resumed = await resumeOpDevice(current.value.eventUid);
        if (resumed) {
          await enter(resumed);
          return;
        }
      }
    }
  } catch (error) {
    current.value = null;
    loadError.value = messageOf(error) || 'Az aktuális játék nem olvasható.';
  } finally {
    resuming.value = false;
    loading.value = false;
  }
}

async function submit() {
  const name = nickname.value.trim();
  formError.value = '';
  if (name.length < 2 || name.length > 24) {
    formError.value = 'A becenév 2–24 karakter legyen.';
    return;
  }
  busy.value = true;
  try {
    await enter(await joinOpDevice(name, current.value?.eventUid));
  } catch (error) {
    formError.value = messageOf(error) || 'A belépés nem sikerült.';
  } finally {
    busy.value = false;
  }
}

function messageOf(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const description = readApiReturnDescription(error.response?.data);
    if (description) return description;
    if (!error.response) return 'Nem sikerült kapcsolódni a szerverhez.';
  }
  if (error instanceof Error && error.message) return error.message;
  return '';
}
</script>

<style scoped>
.op-join {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  position: relative;
  background: var(--op-page);
}

.op-join__card {
  position: relative;
  z-index: 1;
  width: min(420px, 100%);
  padding: 28px 22px 24px;
  border-radius: var(--op-radius);
  background: var(--op-panel);
  border: 1px solid rgba(245, 185, 66, 0.16);
}

.op-join__logo {
  display: block;
  height: 64px;
  margin: 0 auto 18px;
  object-fit: contain;
}

h1 {
  margin: 0 0 8px;
  text-align: center;
  font-size: 1.35rem;
  font-weight: 800;
}

.op-join__status {
  margin: 0 0 16px;
  text-align: center;
  color: var(--op-muted);
  line-height: 1.45;
}

.op-join__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.op-join__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--op-muted);
}

.op-join__field input {
  height: 48px;
  border-radius: var(--op-radius-sm);
  border: 1px solid rgba(245, 185, 66, 0.28);
  background: rgba(7, 10, 20, 0.65);
  color: var(--op-cream);
  padding: 0 14px;
  font-size: 1.05rem;
}

.op-join__field input:focus {
  outline: 2px solid var(--op-gold);
  border-color: transparent;
}

.op-join__error,
.op-join__warn {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.op-join__error {
  color: #ffb4b4;
}

.op-join__warn {
  color: var(--op-gold);
}

.op-join__btn {
  height: 48px;
  border: 0;
  border-radius: var(--op-radius-sm);
  background: var(--op-gold);
  color: #1a1203;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
}

.op-join__btn:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>
