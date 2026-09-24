<template>
  <q-page class="op-scope relative min-h-full overflow-x-hidden">
    <div class="op-glow" aria-hidden="true" />
    <div class="op-watermark" aria-hidden="true">
      <img :src="brand.iconTransparent" alt="" />
    </div>

    <div class="op-inner">
      <section class="op-glass rounded-3xl p-5 mb-4 text-center">
        <div class="flex justify-between items-start mb-3">
          <RoleSwitchChip :event-id="eventId" :current="enteredRole" :roles="enterableRoles" />
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
        <img :src="brand.logoDark" alt="Olimpub" class="h-12 mx-auto mb-3 object-contain" />
        <h1 class="text-xl font-extrabold m-0">{{ eventName }}</h1>
        <p class="text-sm mt-2 mb-0" style="color: var(--op-muted)">Kvízmester</p>
      </section>

      <div v-if="loading && !currentRound" class="op-empty">
        <q-spinner color="amber-5" size="28px" />
        <p>Vezérlő betöltése…</p>
      </div>

      <section v-else-if="!currentRound" class="op-empty">
        <q-icon name="sym_r_quiz" size="32px" style="color: var(--op-gold)" />
        <p class="font-extrabold m-0">Még nincs forduló</p>
        <p class="text-sm m-0" style="color: var(--op-muted)">
          A szervező a Quiz menüben generál vagy importál egy 8 kérdéses fordulót.
        </p>
        <button type="button" class="op-primary" @click="openQuiz">Quiz megnyitása</button>
      </section>

      <template v-else>
        <section class="op-live mb-4">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="op-chip">{{ currentRound.TopicName || `${currentRound.SortIndex}. forduló` }}</span>
            <span class="op-chip is-soft">{{ roundStatus }}</span>
          </div>
          <p class="op-live__kicker m-0">{{ liveKicker }}</p>
          <h2 class="op-live__prompt">{{ currentQuestion?.Prompt || 'Nincs aktív kérdés' }}</h2>
          <p v-if="currentQuestion" class="op-live__correct">
            Helyes: {{ correctText }}
          </p>
          <div v-if="currentQuestion" class="op-timer">
            <span>{{ remainingLabel }}</span>
            <span>{{ currentQuestion.TimeSec }} mp keret</span>
          </div>
          <div v-if="currentQuestion?.AudioKey || currentQuestion?.AudioUrl" class="op-audio">
            <button type="button" class="op-action" :disabled="!audioUrl" @click="toggleAudio">
              {{ audioPlaying ? 'Szünet' : 'Hang' }}
            </button>
            <span class="op-audio__st">{{ audioStatus }}</span>
          </div>
        </section>

        <div class="mb-3">
          <OpMediaPackButton :event-id="eventId" />
        </div>

        <div class="op-controls mb-5">
          <button type="button" class="op-primary" :disabled="!canStart || busy" @click="startQuestion">
            Indítás
          </button>
          <button type="button" class="op-action" :disabled="!canStop || busy" @click="stopQuestion">
            Megállítás
          </button>
          <button type="button" class="op-action" :disabled="!canNext || busy" @click="nextQuestion">
            Következő
          </button>
          <button type="button" class="op-action" :disabled="!canClose || busy" @click="closeRound">
            Forduló lezárása
          </button>
          <button type="button" class="op-action" :disabled="!canPublish || busy" @click="publishRound">
            Közzététel
          </button>
          <button type="button" class="op-action is-gold" :disabled="busy" @click="showLeaderboard">
            Tabella
          </button>
        </div>

        <section v-if="rounds.length > 1" class="mb-4">
          <q-select
            v-model="selectedRoundId"
            :options="roundOptions"
            emit-value
            map-options
            dark
            outlined
            dense
            color="amber-6"
            label="Forduló"
          />
        </section>

        <section>
          <h2 class="text-sm font-extrabold uppercase tracking-wider mb-3" style="color: var(--op-gold)">
            Kérdések
          </h2>
          <button
            v-for="row in roundQuestions"
            :key="row.id"
            type="button"
            class="op-qrow"
            :class="{ 'is-active': row.id === currentQuestion?.id, 'is-done': row.StatusCode === 'stopped' }"
            @click="selectedQuestionId = row.id"
          >
            <span class="op-qrow__n">{{ row.SortIndex }}</span>
            <span class="min-w-0">
              <span class="block font-extrabold truncate">{{ row.Prompt || `${row.SortIndex}. kérdés` }}</span>
              <span class="text-xs font-bold" style="color: var(--op-muted)">
                {{ typeLabel(row.TypeCode) }} · {{ questionStatus(row.StatusCode) }}
              </span>
            </span>
          </button>
        </section>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import { useEventStore } from 'src/stores/event';
import { useOlimpubStore } from 'src/stores/olimpub';
import { postOpGameChange } from '../opApi';
import { formatOpQuestionCorrect } from '../opData';
import { resolvePlayableUrl } from '../opMediaCache';
import OpMediaPackButton from '../components/OpMediaPackButton.vue';
import { opQuestionStatusLabel, opRoundStatusLabel, opTypeLabel } from '../constants';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import '../theme.css';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const store = useOlimpubStore();
const brand = OLIMPUB_BRAND;
const eventId = computed(() => String(route.params.id));
const loading = ref(false);
const busy = ref(false);
const selectedRoundId = ref<number | null>(null);
const selectedQuestionId = ref<number | null>(null);
const nowMs = ref(Date.now());
const audioUrl = ref<string | null>(null);
const audioPlaying = ref(false);
const audioStatus = ref('');
let audioEl: HTMLAudioElement | null = null;
let tick: number | null = null;

const dbEvent = computed(() => {
  return (
    eventStore.events?.find((e: { id?: number | string }) => String(e.id) === eventId.value) ||
    eventStore.myEvents?.find((e: { id?: number | string }) => String(e.id) === eventId.value) ||
    null
  );
});

const eventName = computed(() => dbEvent.value?.Title || dbEvent.value?.EventName || dbEvent.value?.Name || 'Esemény');

const enterableRoles = computed(() => {
  const e = dbEvent.value;
  if (!e) return [];
  return eventStore.getEnterableRolesForEvent(e.id, e.EventTypeID ?? e.eventTypeId);
});

const enteredRole = computed(() => {
  const roles = enterableRoles.value;
  const qUser = route.query.eventUserId;
  if (qUser != null && qUser !== '') {
    return roles.find((r) => String(r.eventUserId) === String(qUser)) || roles[0] || null;
  }
  return roles.find((r) => !r.isOrganizer) || roles[0] || null;
});

const game = computed(() => store.getGame(eventId.value));
const rounds = computed(() => game.value.rounds);

const currentRound = computed(() => {
  if (selectedRoundId.value != null) {
    return rounds.value.find((r) => r.id === selectedRoundId.value) || null;
  }
  const liveId = game.value.live.ActiveRoundID;
  return (
    rounds.value.find((r) => r.id === liveId) ||
    rounds.value.find((r) => r.StatusCode === 'active') ||
    rounds.value.find((r) => r.StatusCode === 'pending') ||
    rounds.value[rounds.value.length - 1] ||
    null
  );
});

const roundQuestions = computed(() =>
  game.value.questions
    .filter((q) => q.RoundID === currentRound.value?.id)
    .slice()
    .sort((a, b) => a.SortIndex - b.SortIndex)
);

const currentQuestion = computed(() => {
  const liveId = game.value.live.ActiveEventQuestionID;
  return (
    roundQuestions.value.find((q) => q.id === liveId) ||
    roundQuestions.value.find((q) => q.StatusCode === 'active') ||
    roundQuestions.value.find((q) => q.id === selectedQuestionId.value) ||
    roundQuestions.value.find((q) => q.StatusCode === 'pending') ||
    roundQuestions.value[0] ||
    null
  );
});

const nextPending = computed(() => {
  const current = currentQuestion.value;
  if (!current) return roundQuestions.value.find((q) => q.StatusCode === 'pending') || null;
  return (
    roundQuestions.value.find((q) => q.SortIndex > current.SortIndex && q.StatusCode === 'pending') ||
    null
  );
});

const hasActive = computed(() => roundQuestions.value.some((q) => q.StatusCode === 'active'));
const allStopped = computed(
  () => roundQuestions.value.length > 0 && roundQuestions.value.every((q) => q.StatusCode === 'stopped')
);

const canStart = computed(() => {
  const q = currentQuestion.value;
  if (!q || busy.value || hasActive.value) return false;
  if (q.StatusCode !== 'pending') return false;
  if (q.SortIndex <= 1) return true;
  const prev = roundQuestions.value.find((row) => row.SortIndex === q.SortIndex - 1);
  return !prev || prev.StatusCode === 'stopped';
});

const canStop = computed(() => currentQuestion.value?.StatusCode === 'active');
const canNext = computed(() => !hasActive.value && !!nextPending.value && currentQuestion.value?.StatusCode === 'stopped');
const canClose = computed(
  () =>
    allStopped.value &&
    !!currentRound.value &&
    currentRound.value.StatusCode !== 'closed' &&
    currentRound.value.StatusCode !== 'published'
);
const canPublish = computed(() => currentRound.value?.StatusCode === 'closed');

const roundStatus = computed(() => opRoundStatusLabel(currentRound.value?.StatusCode || ''));
const liveKicker = computed(() => {
  if (currentQuestion.value?.StatusCode === 'active') return 'Élő kérdés';
  if (currentQuestion.value?.StatusCode === 'stopped') return 'Kérdés leállítva';
  return 'Következő kérdés';
});
const correctText = computed(() =>
  currentQuestion.value ? formatOpQuestionCorrect(currentQuestion.value) : '—'
);

const remainingLabel = computed(() => {
  const q = currentQuestion.value;
  if (!q) return '—';
  if (q.StatusCode !== 'active' || !q.StartedAtUtc) return `${q.TimeSec} mp`;
  const started = Date.parse(q.StartedAtUtc);
  if (!Number.isFinite(started)) return `${q.TimeSec} mp`;
  const left = Math.max(0, q.TimeSec - Math.floor((nowMs.value - started) / 1000));
  return `${left} mp`;
});

const roundOptions = computed(() =>
  rounds.value.map((row) => ({
    label: `${row.SortIndex}. forduló · ${row.TopicName || 'Témakör'} · ${opRoundStatusLabel(row.StatusCode)}`,
    value: row.id,
  }))
);

function typeLabel(code: string) {
  return opTypeLabel(code);
}

function questionStatus(code: string) {
  return opQuestionStatusLabel(code);
}

function closePanel() {
  void router.push({ name: 'my_events' });
}

function openQuiz() {
  void router.push({ path: `/olimpub/event/${eventId.value}/quiz`, query: route.query });
}

function notifyErr(error: unknown, fallback: string) {
  $q.notify({
    message: readAxiosErrorMessage(error, fallback),
    color: 'dark',
    textColor: 'red-4',
    position: 'top',
    timeout: 2800,
    classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}

async function runAction(action: string, payload: Record<string, unknown>) {
  busy.value = true;
  try {
    await postOpGameChange({
      EventID: Number(eventId.value),
      Action: action,
      Payload: payload,
    });
    await store.loadGame(eventId.value);
  } catch (error) {
    notifyErr(error, 'A művelet sikertelen.');
  } finally {
    busy.value = false;
  }
}

function revokeAudio() {
  audioPlaying.value = false;
  if (audioEl) {
    audioEl.pause();
    audioEl.src = '';
    audioEl = null;
  }
  if (audioUrl.value?.startsWith('blob:')) URL.revokeObjectURL(audioUrl.value);
  audioUrl.value = null;
}

async function loadQuestionAudio() {
  const row = currentQuestion.value;
  revokeAudio();
  if (!row?.AudioKey && !row?.AudioUrl) {
    audioStatus.value = '';
    return;
  }
  audioStatus.value = 'Hang betöltése…';
  const url = await resolvePlayableUrl(eventId.value, row.AudioKey, row.AudioUrl);
  if (!url) {
    audioStatus.value = 'Hang hiányzik — töltsd le az eszközre.';
    return;
  }
  audioUrl.value = url;
  audioStatus.value = url.startsWith('blob:') ? 'Helyben megvan' : 'Blob';
}

function toggleAudio() {
  if (!audioUrl.value) return;
  if (!audioEl) {
    audioEl = new Audio(audioUrl.value);
    audioEl.addEventListener('ended', () => {
      audioPlaying.value = false;
    });
  }
  if (audioPlaying.value) {
    audioEl.pause();
    audioPlaying.value = false;
    return;
  }
  void audioEl.play().then(() => {
    audioPlaying.value = true;
  });
}

function startQuestion() {
  if (!currentQuestion.value) return;
  if (audioUrl.value) {
    if (!audioEl) audioEl = new Audio(audioUrl.value);
    void audioEl.play().then(() => {
      audioPlaying.value = true;
    });
  }
  void runAction('Op.StartQuestion', { EventQuestionID: currentQuestion.value.id });
}

function stopQuestion() {
  if (!currentQuestion.value) return;
  if (audioEl) {
    audioEl.pause();
    audioPlaying.value = false;
  }
  void runAction('Op.StopQuestion', { EventQuestionID: currentQuestion.value.id });
}

function nextQuestion() {
  if (!currentRound.value) return;
  void runAction('Op.NextQuestion', { RoundID: currentRound.value.id });
}

function closeRound() {
  if (!currentRound.value) return;
  void runAction('Op.CloseRound', { RoundID: currentRound.value.id });
}

function publishRound() {
  if (!currentRound.value) return;
  void runAction('Op.PublishRound', { RoundID: currentRound.value.id });
}

function showLeaderboard() {
  void runAction('Op.ShowLeaderboard', { Board: 'main' });
}

async function reload() {
  loading.value = true;
  try {
    await store.loadGame(eventId.value);
    if (selectedRoundId.value == null && currentRound.value) {
      selectedRoundId.value = currentRound.value.id;
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId != null && String(store.lastPingEventId) !== eventId.value) return;
    void store.loadGame(eventId.value);
  }
);

watch(currentRound, (round) => {
  if (round && selectedRoundId.value == null) selectedRoundId.value = round.id;
});

watch(
  () => currentQuestion.value?.id,
  () => {
    void loadQuestionAudio();
  },
  { immediate: true }
);

onMounted(() => {
  void reload();
  tick = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 500);
});

onUnmounted(() => {
  if (tick != null) window.clearInterval(tick);
  revokeAudio();
});
</script>

<style scoped>
.op-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 32px 16px;
  border-radius: 22px;
  border: 1px solid rgba(245, 185, 66, 0.12);
  background: rgba(12, 16, 28, 0.78);
}

.op-live {
  padding: 18px 16px;
  border-radius: 22px;
  border: 1px solid rgba(245, 185, 66, 0.35);
  background:
    radial-gradient(circle at 50% 0%, rgba(245, 185, 66, 0.2), transparent 70%),
    rgba(12, 16, 28, 0.92);
}

.op-live__kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--op-gold);
}

.op-live__prompt {
  margin: 8px 0 10px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.3;
}

.op-live__correct {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: #fde68a;
}

.op-audio {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.op-audio__st {
  font-size: 12px;
  font-weight: 700;
  color: var(--op-muted);
}

.op-timer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 800;
  color: var(--op-muted);
}

.op-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.op-action,
.op-primary {
  min-height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(245, 185, 66, 0.28);
  background: rgba(12, 16, 28, 0.86);
  color: var(--op-cream);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.op-primary,
.op-action.is-gold {
  background: var(--op-gold);
  color: #1a1408;
  border-color: transparent;
}

.op-action:disabled,
.op-primary:disabled {
  opacity: 0.4;
  cursor: default;
}

.op-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(245, 185, 66, 0.18);
  color: var(--op-gold);
  font-size: 11px;
  font-weight: 800;
}

.op-chip.is-soft {
  background: rgba(255, 255, 255, 0.06);
  color: var(--op-muted);
}

.op-qrow {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 8px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(245, 185, 66, 0.12);
  background: rgba(12, 16, 28, 0.78);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.op-qrow.is-active {
  border-color: rgba(245, 185, 66, 0.55);
  box-shadow: 0 0 0 1px rgba(245, 185, 66, 0.2);
}

.op-qrow.is-done {
  opacity: 0.7;
}

.op-qrow__n {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 185, 66, 0.18);
  color: var(--op-gold);
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}
</style>
