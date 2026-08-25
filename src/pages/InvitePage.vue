<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="invite-page flex items-center justify-center min-h-screen bg-brand-dark text-white relative overflow-hidden q-pa-md">
        <div class="invite-watermark pointer-events-none select-none" aria-hidden="true">
          <img src="~assets/eventjoy_icon.svg" alt="" />
        </div>

        <div class="invite-card relative z-10 w-full max-w-md">
          <div class="invite-card__brand text-center q-mb-lg">
            <img src="~assets/eventjoy_logo_full_dark.svg" alt="EventJoy" class="invite-card__logo" />
            <h1 class="invite-card__title">Meghívó</h1>
            <p class="invite-card__subtitle">{{ headline }}</p>
          </div>

          <div v-if="loading" class="invite-state">
            <q-spinner color="brand-primary" size="42px" />
            <p>Meghívó betöltése…</p>
          </div>

          <div v-else-if="fatalError" class="invite-state invite-state--error">
            <q-icon name="sym_r_error" size="40px" color="amber-4" />
            <p>{{ fatalError }}</p>
            <button type="button" class="invite-btn invite-btn--ghost" @click="goHomeOrLogin">
              Vissza
            </button>
          </div>

          <div v-else-if="view === 'already_accepted'" class="invite-state">
            <q-icon name="sym_r_mark_email_read" size="40px" color="light-blue-4" />
            <p class="invite-state__lead">Ezt a meghívót már feldolgoztad.</p>
            <p v-if="snapshot?.eventTitle" class="invite-event">{{ snapshot.eventTitle }}</p>
            <button
              v-if="snapshot?.eventId"
              type="button"
              class="invite-btn invite-btn--primary"
              @click="goToEvent"
            >
              Esemény megnyitása
            </button>
            <button type="button" class="invite-btn invite-btn--ghost" @click="goHomeOrLogin">
              Főoldal
            </button>
          </div>

          <div v-else-if="view === 'account_conflict'" class="invite-state">
            <q-icon name="sym_r_person_off" size="40px" color="amber-4" />
            <p class="invite-state__lead">Másik fiókkal vagy bejelentkezve.</p>
            <p class="invite-hint">
              Ez a meghívó
              <strong>{{ snapshot?.identityDisplay || 'másik azonosítóra' }}</strong>
              szól. A folytatáshoz ki kell jelentkezned.
            </p>
            <button type="button" class="invite-btn invite-btn--primary" @click="logoutAndEnterCode">
              Kijelentkezés és folytatás
            </button>
            <button type="button" class="invite-btn invite-btn--ghost" @click="goHomeOrLogin">
              Mégsem
            </button>
          </div>

          <div v-else-if="view === 'enter_code'" class="invite-form">
            <div class="invite-meta">
              <p class="invite-event">{{ snapshot?.eventTitle }}</p>
              <p v-if="snapshot?.roleName" class="invite-role">{{ snapshot.roleName }}</p>
            </div>

            <label class="invite-label">Azonosító</label>
            <q-input
              :model-value="snapshot?.identityDisplay || ''"
              dark
              filled
              readonly
              color="brand-primary"
              class="invite-input"
            >
              <template #prepend>
                <q-icon :name="identityIcon" color="slate-400" />
              </template>
            </q-input>

            <label class="invite-label q-mt-md">6 jegyű kód a levélből</label>
            <q-input
              v-model="code"
              dark
              filled
              color="brand-primary"
              class="invite-input invite-input--code"
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code"
              placeholder="••••••"
              @keyup.enter="submitCode"
            />

            <p v-if="formError" class="invite-error">{{ formError }}</p>

            <button
              type="button"
              class="invite-btn invite-btn--primary q-mt-lg"
              :disabled="submitting || code.trim().length < 6"
              @click="submitCode"
            >
              {{ submitting ? 'Ellenőrzés…' : 'Belépés' }}
            </button>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { fetchInviteByUid, type InviteSnapshot } from 'src/utils/invite';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const loading = ref(true);
const submitting = ref(false);
const fatalError = ref('');
const formError = ref('');
const code = ref('');
const snapshot = ref<InviteSnapshot | null>(null);
const view = ref<'enter_code' | 'account_conflict' | 'already_accepted' | 'idle'>('idle');

const uid = computed(() => String(route.params.uid || '').trim());

const headline = computed(() => {
  if (view.value === 'enter_code') return 'Írd be a meghívóban kapott kódot.';
  if (view.value === 'account_conflict') return 'Fiók egyeztetés szükséges.';
  if (view.value === 'already_accepted') return 'A meghívó már nem aktív.';
  return 'Meghívó azonosítása…';
});

const identityIcon = computed(() =>
  (snapshot.value?.identityValue || '').includes('@') ? 'mail' : 'phone'
);

function normalizeIdentity(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function currentUserIdentities(): string[] {
  const out: string[] = [];
  const user = authStore.user as Record<string, unknown> | null;
  if (user) {
    for (const key of ['EmailAddress', 'Email', 'PhoneNumber', 'Phone', 'Mobile']) {
      const raw = user[key];
      if (raw != null && String(raw).trim()) out.push(normalizeIdentity(String(raw)));
    }
  }
  const idents = Array.isArray(authStore.loginIdentifiers)
    ? authStore.loginIdentifiers
    : authStore.loginIdentifiers
      ? [authStore.loginIdentifiers]
      : [];
  for (const row of idents) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    for (const key of ['IdentityValue', 'EmailAddress', 'Email', 'PhoneNumber', 'Phone']) {
      const raw = rec[key];
      if (raw != null && String(raw).trim()) out.push(normalizeIdentity(String(raw)));
    }
  }
  return out.filter(Boolean);
}

/** API often omits NextStep — infer from session when possible. */
function resolveNextStep(data: InviteSnapshot): string {
  const step = data.nextStep;
  if (step === 'open_event' || step === 'account_conflict' || step === 'already_accepted') {
    return step;
  }
  if (!authStore.isAuthenticated) return 'enter_code';

  const inviteIdentity = normalizeIdentity(data.identityValue || '');
  if (!inviteIdentity) {
    return data.eventId != null ? 'open_event' : 'enter_code';
  }
  const mine = currentUserIdentities();
  if (mine.length && mine.includes(inviteIdentity)) return 'open_event';
  if (mine.length) return 'account_conflict';
  // Token van, de még nincs user profil — ne kérjünk újra kódot
  return data.eventId != null ? 'open_event' : 'enter_code';
}

function applyNextStep(step: string) {
  if (step === 'open_event') {
    void leaveInviteFlow();
    return;
  }
  if (step === 'account_conflict') {
    view.value = 'account_conflict';
    return;
  }
  if (step === 'already_accepted') {
    view.value = 'already_accepted';
    return;
  }
  view.value = 'enter_code';
}

async function loadInvite() {
  if (!uid.value) {
    fatalError.value = 'Érvénytelen meghívó link.';
    loading.value = false;
    return;
  }

  loading.value = true;
  fatalError.value = '';
  formError.value = '';

  try {
    const data = await fetchInviteByUid(uid.value);
    snapshot.value = data;
    if (!data.identityValue && resolveNextStep(data) === 'enter_code') {
      fatalError.value = 'A meghívóhoz nem tartozik email vagy telefonszám.';
      return;
    }
    applyNextStep(resolveNextStep(data));
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) fatalError.value = 'A meghívó nem található.';
    else if (status === 410) fatalError.value = 'Ez a meghívó lejárt vagy már nem aktív.';
    else {
      fatalError.value =
        error?.response?.data?.Result1?.ReturnDescription ||
        error?.response?.data?.ReturnDescription ||
        'Nem sikerült betölteni a meghívót.';
    }
  } finally {
    loading.value = false;
  }
}

/** Belépés után soha ne maradjunk a kódképernyőn. */
async function leaveInviteFlow() {
  const eventId = snapshot.value?.eventId;
  try {
    if (eventId != null) {
      await router.replace(`/event/${eventId}`);
      return;
    }
  } catch (err) {
    console.warn('Invite → event navigáció sikertelen, főoldalra megyünk.', err);
  }
  await router.replace('/');
}

function goToEvent() {
  void leaveInviteFlow();
}

function goHomeOrLogin() {
  if (authStore.isAuthenticated) void router.replace('/');
  else void router.replace('/login');
}

async function logoutAndEnterCode() {
  authStore.logout();
  view.value = 'enter_code';
  code.value = '';
  formError.value = '';
  // Session nélkül újra lekérjük — NextStep várhatóan enter_code
  await loadInvite();
}

async function submitCode() {
  const identity = snapshot.value?.identityValue?.trim().replace(/\s+/g, '') || '';
  const validationCode = code.value.trim();
  if (!identity) {
    formError.value = 'Hiányzik az azonosító a meghívóból.';
    return;
  }
  if (validationCode.length < 6) {
    formError.value = 'Add meg a 6 jegyű kódot.';
    return;
  }

  submitting.value = true;
  formError.value = '';
  try {
    let deviceId = localStorage.getItem('device_uuid');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_uuid', deviceId);
    }

    await authStore.verifyOtp({
      IdentityValue: identity,
      ValidationCode: validationCode,
      DeviceId: deviceId,
      DeviceName: 'EventJoy WebApp',
    });

    $q.loading.show({ message: 'Adatok szinkronizálása…' });
    await authStore.fetchBootData();
    $q.loading.hide();

    $q.notify({
      message: 'Sikeres belépés',
      color: 'dark',
      textColor: 'blue-4',
      classes: 'ej-notify',
      position: 'top',
    });

    // Soha ne hívjunk applyNextStep(enter_code)-ot sikeres OTP után —
    // az API gyakran nem küld NextStep-et / open_event-et.
    await leaveInviteFlow();
  } catch (error: any) {
    $q.loading.hide();
    formError.value =
      error?.response?.data?.Result1?.ReturnDescription ||
      'Hibás vagy lejárt kód.';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadInvite();
});

watch(uid, () => {
  void loadInvite();
});
</script>

<style scoped lang="scss">
.invite-page {
  background: #0a0b0c;
}

.invite-watermark {
  position: absolute;
  right: -6rem;
  top: 15%;
  width: 24rem;
  height: 24rem;
  opacity: 0.03;
  z-index: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.invite-card {
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  padding: 28px 22px 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}

.invite-card__logo {
  height: 36px;
  width: auto;
  object-fit: contain;
  margin-bottom: 14px;
}

.invite-card__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

.invite-card__subtitle {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.invite-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 12px 0 4px;
  color: #cbd5e1;
  font-size: 14px;
}

.invite-state__lead {
  margin: 0;
  font-weight: 700;
  color: #fff;
}

.invite-state--error {
  color: #fbbf24;
}

.invite-hint {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.45;
}

.invite-meta {
  text-align: center;
  margin-bottom: 18px;
}

.invite-event {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
}

.invite-role {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #38bdf8;
}

.invite-label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.invite-input {
  :deep(.q-field__control) {
    border-radius: 14px !important;
  }
}

.invite-input--code {
  :deep(input) {
    letter-spacing: 0.35em;
    font-weight: 800;
    font-size: 20px;
    text-align: center;
  }
}

.invite-error {
  margin: 10px 0 0;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.invite-btn {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 10px;
}

.invite-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.invite-btn--primary {
  background: var(--ej-gradient, linear-gradient(135deg, #0ea5e9, #14b8a6));
  color: #fff;
}

.invite-btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
