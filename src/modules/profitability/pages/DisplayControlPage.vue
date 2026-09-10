<template>
  <q-page class="pta-scope vet-page relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="vet-wrap relative z-10">
      <header class="vet-header">
        <button type="button" class="vet-back" aria-label="Vissza" @click="goBack">
          <q-icon name="arrow_back" size="20px" />
        </button>
        <div class="vet-header__text">
          <h1 class="vet-header__title">Vetítés</h1>
          <p class="vet-header__event">{{ eventName }}</p>
        </div>
      </header>

      <p class="vet-hint">
        Ugyanaz a parancs megy a PIN-es TV-re és a laptopos HDMI / Cast falra. Csak szervező.
      </p>
      <p v-if="tvError" class="vet-tv__error">{{ tvError }}</p>

      <p class="vet-tv__label">Kép a falon</p>
      <div class="vet-modes">
        <button
          type="button"
          class="vet-mode"
          :class="{ 'is-on': controlMode === 'players' }"
          :disabled="tvBusy"
          @click="sendControl('players')"
        >
          Játékosok
        </button>
        <button
          v-if="groupingAttrs.length"
          type="button"
          class="vet-mode"
          :class="{ 'is-on': controlMode === 'groups' }"
          :disabled="tvBusy"
          @click="sendControl('groups')"
        >
          Csoportok
        </button>
        <button
          type="button"
          class="vet-mode"
          :class="{ 'is-on': controlMode === 'seating' }"
          :disabled="tvBusy"
          @click="sendControl('seating')"
        >
          Ülésrend
        </button>
        <button
          type="button"
          class="vet-mode"
          :class="{ 'is-on': controlMode === 'ceremony' }"
          :disabled="tvBusy"
          @click="enterCeremony()"
        >
          Dobogó
        </button>
            <button
              type="button"
              class="vet-mode"
              :class="{ 'is-on': controlMode === 'roundstand' }"
              :disabled="tvBusy"
              @click="sendControl('roundstand')"
            >
              Forduló állás
            </button>
        <button
          type="button"
          class="vet-mode"
          :class="{ 'is-on': controlMode === 'idle' }"
          :disabled="tvBusy"
          @click="sendControl('idle')"
        >
          Várakozás
        </button>
      </div>
      <p class="vet-hint">Forduló állás: lezárt / összes asztal, pont nélkül.</p>

      <div
        v-if="controlMode !== 'seating' && controlMode !== 'roundstand'"
        class="vet-scope"
        role="tablist"
        aria-label="Vetítés nézet"
      >
        <button
          type="button"
          class="vet-scope__btn"
          :class="{ 'is-on': controlScope === 'round' }"
          :disabled="tvBusy"
          @click="setControlScope('round')"
        >
          Forduló
        </button>
        <button
          type="button"
          class="vet-scope__btn is-total"
          :class="{ 'is-on': controlScope === 'total' }"
          :disabled="tvBusy"
          @click="setControlScope('total')"
        >
          Összesített
        </button>
      </div>
      <div v-if="controlRounds.length" class="vet-rounds">
        <button
          v-for="round in controlRounds"
          :key="round.id"
          type="button"
          class="vet-round"
          :class="{ 'is-on': controlRoundId === round.id }"
          :disabled="tvBusy"
          @click="setControlRound(round.id)"
        >
          {{ round.label }}
        </button>
      </div>

      <div v-if="controlMode === 'ceremony'" class="vet-ceremony">
        <p class="vet-hint">A dobogó csak innen lép: Előző, Következő, Újra.</p>
        <p class="vet-ceremony__place">{{ ceremonyPlace }}. hely</p>
        <div class="vet-modes">
          <button
            type="button"
            class="vet-mode"
            :disabled="tvBusy || ceremonyPlace >= ceremonyStartPlace"
            @click="stepCeremony(1)"
          >
            Előző
          </button>
          <button
            type="button"
            class="vet-mode"
            :disabled="tvBusy || ceremonyPlace <= 1"
            @click="stepCeremony(-1)"
          >
            Következő
          </button>
          <button type="button" class="vet-mode" :disabled="tvBusy" @click="enterCeremony()">
            Újra
          </button>
        </div>
      </div>

      <button type="button" class="vet-action" @click="openDisplayOnThisDevice">
        <span class="vet-action__icon">
          <q-icon name="sym_r_present_to_all" size="22px" />
        </span>
        <span class="vet-action__body">
          <span class="vet-action__label">Ezen a gépen</span>
          <span class="vet-action__meta">Új ablak HDMI / Cast-ra. A Vetítés itt marad, innen léptetsz.</span>
        </span>
        <q-icon name="chevron_right" size="20px" class="vet-action__chevron" />
      </button>

      <div class="vet-tv">
        <p class="vet-tv__label">Okos TV — PIN</p>
        <p v-if="tvBusy && !tvPin" class="vet-hint">PIN kérése…</p>
        <template v-if="tvPin">
          <p class="vet-tv__pin">{{ tvPin }}</p>
          <p class="vet-tv__url">{{ tvUrl }}</p>
          <img v-if="tvQr" :src="tvQr" alt="Vetítés QR" class="vet-tv__qr" />
          <p v-if="tvExpires" class="vet-hint">Lejár: {{ tvExpires }}</p>
        </template>
        <div class="vet-tv__row">
          <button type="button" class="vet-tv__btn" :disabled="tvBusy" @click="refreshTvPin">
            Új PIN
          </button>
          <button type="button" class="vet-tv__btn" :disabled="!tvUrl" @click="copyTvUrl">
            URL másolása
          </button>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import QRCode from 'qrcode';
import { nullableNumericId } from 'src/utils/apiPayload';
import { useEventStore } from 'src/stores/event';
import { eventDatasheetKind, eventRolePath, eventRoleQuery } from 'src/utils/eventRoleNav';
import { resolvePtaSeatName, type EventGroupingKey } from 'src/modules/profitability/ptaData';
import {
  buildStandings,
  pickLatestReleasedRoundId,
  pickOpenRoundId,
  roundResultsReleased,
  type ResultsScope,
} from 'src/modules/profitability/standings';
import {
  displayWallAbsoluteUrl,
  readCachedDisplayPin,
  requestPtaDisplayToken,
  showPtaDisplay,
} from 'src/modules/profitability/ptaDisplayApi';
import { usePtaStandings } from 'src/modules/profitability/usePtaStandings';
import '../theme.css';

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();

const {
  eventId,
  eventName,
  enteredRole,
  enterableRoles,
  selectedRoundId,
  rounds,
  groupingAttrs,
} = usePtaStandings();

const tvPin = ref('');
const tvUrl = ref('');
const tvQr = ref('');
const tvExpires = ref('');
const tvBusy = ref(false);
const tvError = ref('');
const controlMode = ref<'players' | 'groups' | 'seating' | 'ceremony' | 'roundstand' | 'idle'>('players');
const controlScope = ref<ResultsScope>('total');
const controlRoundId = ref<number | null>(null);
const controlGroupKey = ref<EventGroupingKey | null>(null);
const ceremonyPlace = ref(8);

const publishedRounds = computed(() =>
  rounds.value.filter((round) => roundResultsReleased(round.status))
);

const controlRounds = computed(() =>
  controlMode.value === 'seating' || controlMode.value === 'roundstand'
    ? rounds.value
    : publishedRounds.value
);

watch(groupingAttrs, (attrs) => {
  if (!controlGroupKey.value && attrs[0]) controlGroupKey.value = attrs[0].key;
});

watch(
  controlRounds,
  (list) => {
    if (controlRoundId.value != null && list.some((round) => round.id === controlRoundId.value)) return;
    controlRoundId.value =
      controlMode.value === 'seating' || controlMode.value === 'roundstand'
        ? selectedRoundId.value ?? pickOpenRoundId(list)
        : pickLatestReleasedRoundId(list);
  },
  { immediate: true }
);

watch(
  [enteredRole, enterableRoles],
  () => {
    if (!enterableRoles.value.length) return;
    if (eventDatasheetKind(enteredRole.value) === 'organizer') return;
    router.replace({
      path: eventRolePath(eventId.value, enteredRole.value),
      query: eventRoleQuery(enteredRole.value),
    });
  },
  { immediate: true }
);

function goBack() {
  const { readonly: _readonly, from: _from, ...query } = route.query;
  router.push({
    path: eventRolePath(eventId.value, enteredRole.value),
    query: Object.keys(query).length ? query : eventRoleQuery(enteredRole.value),
  });
}

function displayQuery(): Record<string, string> {
  return { ...eventRoleQuery(enteredRole.value) };
}

function openDisplayOnThisDevice() {
  void sendControl(controlMode.value);
  const wall = router.resolve({
    name: 'profitability-display',
    params: { id: eventId.value },
    query: displayQuery(),
  });
  const url = new URL(wall.href, window.location.origin).href;
  const opened = window.open(url, `ptaDisplay:${eventId.value}`);
  if (!opened) {
    Notify.create({
      message: 'Az ablakot a böngésző blokkolta. Engedélyezd a felugró ablakokat.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
      timeout: 3200,
    });
    return;
  }
  opened.focus();
}

function formatExpiry(iso: string): string {
  if (!iso) return '';
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return iso;
  return new Date(at).toLocaleString('hu-HU');
}

async function applyTvPin(pin: string, expiresAtUtc: string) {
  tvPin.value = pin;
  tvUrl.value = displayWallAbsoluteUrl(eventId.value, pin);
  tvExpires.value = formatExpiry(expiresAtUtc);
  tvQr.value = await QRCode.toDataURL(tvUrl.value, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

async function refreshTvPin() {
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  tvBusy.value = true;
  tvError.value = '';
  try {
    const result = await requestPtaDisplayToken(id);
    await applyTvPin(result.pin, result.expiresAtUtc);
  } catch {
    tvError.value = 'A kivetítés nem indult el.';
  } finally {
    tvBusy.value = false;
  }
}

async function bootPin() {
  const cached = readCachedDisplayPin(eventId.value);
  if (cached) {
    await applyTvPin(cached.pin, cached.expiresAtUtc);
    return;
  }
  await refreshTvPin();
}

async function copyTvUrl() {
  if (!tvUrl.value) return;
  try {
    await navigator.clipboard.writeText(tvUrl.value);
    Notify.create({
      message: 'URL másolva.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
      timeout: 1600,
    });
  } catch {
    Notify.create({
      message: tvUrl.value,
      color: 'dark',
      position: 'top',
      timeout: 4000,
    });
  }
}

function publishedRoundIdForTv(): number | null {
  return pickLatestReleasedRoundId(publishedRounds.value);
}

function playerName(playerId: number | null): string {
  return resolvePtaSeatName({
    playerId,
    players: [...eventStore.getPtaPlayersForEvent(eventId.value), ...eventStore.ptaEventPlayers],
    people: [
      ...eventStore.getParticipantDirectoryForEvent(eventId.value),
      ...eventStore.getEventParticipantsForEvent(eventId.value),
      ...eventStore.getEventUsersForEvent(eventId.value),
    ],
    eventId: eventId.value,
  });
}

const ceremonyStandingCount = computed(() => {
  const roundId = controlRoundId.value ?? publishedRoundIdForTv();
  const current = publishedRounds.value.find((round) => round.id === roundId) || publishedRounds.value[0];
  if (!current) return 0;
  const roundIds =
    controlScope.value === 'round'
      ? [current.id]
      : publishedRounds.value.filter((round) => round.order <= current.order).map((round) => round.id);
  return buildStandings({
    roundIds,
    rounds: rounds.value,
    roundDesks: eventStore.getPtaRoundDesksForEvent(eventId.value),
    schedules: eventStore.getPtaSchedulesForEvent(eventId.value),
    playerName,
  }).length;
});

const ceremonyStartPlace = computed(() => Math.max(1, Math.min(8, ceremonyStandingCount.value)));

async function sendControl(mode: 'players' | 'groups' | 'seating' | 'ceremony' | 'roundstand' | 'idle') {
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  const liveRound = mode === 'seating' || mode === 'roundstand';
  if (liveRound) {
    const list = rounds.value;
    if (controlRoundId.value == null || !list.some((round) => round.id === controlRoundId.value)) {
      controlRoundId.value = selectedRoundId.value ?? pickOpenRoundId(list);
    }
  }
  if (mode === 'ceremony') {
    const list = publishedRounds.value;
    if (controlRoundId.value == null || !list.some((round) => round.id === controlRoundId.value)) {
      controlRoundId.value = publishedRoundIdForTv();
    }
  }
  const roundId = liveRound
    ? controlRoundId.value ?? selectedRoundId.value ?? pickOpenRoundId(rounds.value)
    : controlRoundId.value ?? publishedRoundIdForTv();
  if (liveRound && roundId == null) {
    tvError.value = 'Nincs kisorsolt forduló.';
    return;
  }
  if (mode !== 'idle' && !liveRound && roundId == null) {
    tvError.value = 'Előbb publikáld a fordulót.';
    return;
  }
  if (mode === 'ceremony' && ceremonyStandingCount.value <= 0) {
    tvError.value = 'Előbb publikáld a fordulót.';
    return;
  }
  controlMode.value = mode;
  tvBusy.value = true;
  tvError.value = '';
  try {
    await showPtaDisplay({
      eventId: id,
      state:
        mode === 'idle'
          ? 'idle'
          : mode === 'seating'
            ? 'seating'
            : mode === 'roundstand'
              ? 'roundstand'
              : mode === 'ceremony'
                ? 'ceremony'
                : 'leaderboard',
      scope: liveRound ? 'round' : controlScope.value,
      roundId,
      groupKey:
        mode === 'groups' ? controlGroupKey.value || groupingAttrs.value[0]?.key || null : null,
      place: mode === 'ceremony' ? ceremonyPlace.value : null,
      paused: false,
    });
  } catch {
    if (!liveRound && mode !== 'ceremony') tvError.value = 'A kivetítés nem indult el.';
  } finally {
    tvBusy.value = false;
  }
}

function enterCeremony() {
  ceremonyPlace.value = ceremonyStartPlace.value;
  void sendControl('ceremony');
}

function stepCeremony(delta: number) {
  const max = ceremonyStartPlace.value;
  ceremonyPlace.value = Math.min(max, Math.max(1, ceremonyPlace.value + delta));
  void sendControl('ceremony');
}

function setControlScope(next: ResultsScope) {
  controlScope.value = next;
  if (controlMode.value === 'idle') return;
  if (controlMode.value === 'ceremony') {
    enterCeremony();
    return;
  }
  void sendControl(controlMode.value);
}

function setControlRound(roundId: number) {
  controlRoundId.value = roundId;
  if (controlMode.value === 'idle') return;
  if (controlMode.value === 'ceremony') {
    enterCeremony();
    return;
  }
  void sendControl(controlMode.value);
}

async function loadDataSheet() {
  const q = route.query.eventUserId;
  const fromQuery = q != null && q !== '' ? Number(q) : NaN;
  const fromCtx = eventStore.eventUserScreenContext?.requestEventUserId;
  const id = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : fromCtx;
  if (id == null) return;
  try {
    await eventStore.loadEventUserDataSheet(id);
  } catch {
    /* a már betöltött userdata elég a vezérléshez */
  }
}

onMounted(() => {
  void loadDataSheet();
  void bootPin();
});
</script>

<style scoped>
.vet-page {
  background: var(--pta-page);
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.vet-wrap {
  box-sizing: border-box;
  width: 100%;
  max-width: 42rem;
  min-width: 0;
  margin: 0 auto;
  padding: 16px max(24px, env(safe-area-inset-right, 0px)) 96px max(24px, env(safe-area-inset-left, 0px));
}

.vet-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-bottom: 16px;
}

.vet-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  cursor: pointer;
}

.vet-header__text {
  min-width: 0;
  flex: 1;
}

.vet-header__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
  color: #f1f5f9;
}

.vet-header__event {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vet-hint {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: #94a3b8;
}

.vet-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.vet-mode {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.vet-mode.is-on {
  border-color: rgba(246, 139, 41, 0.7);
  background: rgba(246, 139, 41, 0.16);
  color: #f8fafc;
}

.vet-mode:disabled {
  opacity: 0.4;
  cursor: default;
}

.vet-scope {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
}

.vet-scope__btn {
  min-width: 0;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.vet-scope__btn.is-on {
  border-color: rgba(246, 139, 41, 0.55);
  background: rgba(246, 139, 41, 0.16);
  color: #fdba74;
}

.vet-scope__btn.is-total.is-on {
  border-color: rgba(42, 169, 255, 0.55);
  background: rgba(42, 169, 255, 0.16);
  color: #7dd3fc;
}

.vet-rounds {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.vet-round {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.vet-round.is-on {
  border-color: rgba(246, 139, 41, 0.7);
  background: rgba(246, 139, 41, 0.18);
  color: #f8fafc;
}

.vet-ceremony {
  margin: 4px 0 16px;
}

.vet-ceremony__place {
  margin: 0 0 10px;
  font-size: 28px;
  font-weight: 800;
  color: #f8fafc;
}

.vet-action {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(42, 169, 255, 0.28);
  background: rgba(10, 11, 12, 0.55);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.vet-action__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(42, 169, 255, 0.16);
  color: #7dd3fc;
}

.vet-action__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vet-action__label {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}

.vet-action__meta {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.vet-action__chevron {
  color: #64748b;
}

.vet-tv {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
}

.vet-tv__label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.vet-tv__pin {
  margin: 0 0 6px;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #f8fafc;
}

.vet-tv__url {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #7dd3fc;
  word-break: break-all;
}

.vet-tv__qr {
  display: block;
  width: 160px;
  height: 160px;
  margin: 0 0 10px;
  border-radius: 12px;
  background: #fff;
}

.vet-tv__error {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #fb7185;
}

.vet-tv__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vet-tv__btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.vet-tv__btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
