<template>
  <div class="op-qm" :class="[started ? `is-${phase}` : 'is-gate', face === 'game' ? 'is-game' : 'is-quiz']">
    <div class="op-qm__wash" aria-hidden="true" />
    <header class="op-qm__top">
      <button v-if="showBack" type="button" class="op-qm__backnav" aria-label="Vissza" @click="emit('back')">
        <q-icon name="sym_r_arrow_back" size="22px" />
      </button>
      <div class="op-qm__id">
        <p class="op-qm__ord">{{ face === 'game' ? 'Játék' : 'Kvíz' }}</p>
        <p v-if="started" class="op-qm__topic">{{ [topic, sortLabel].filter(Boolean).join(' · ') }}</p>
      </div>
      <button
        v-if="showSound"
        type="button"
        class="op-qm__tone"
        :class="{ 'is-on': soundOpen, 'is-live': audioPlaying }"
        :aria-label="soundOpen ? 'Hang bezárása' : 'Hang'"
        :aria-expanded="soundOpen"
        @click="soundOpen = !soundOpen"
      >
        <q-icon name="sym_r_music_note" size="36px" />
      </button>
      <button type="button" class="op-qm__close" :class="{ 'is-end': !showSound }" aria-label="Bezárás" @click="emit('close')">
        <q-icon name="close" size="22px" />
      </button>
    </header>
    <Transition name="op-mixer">
      <div v-if="showSound && soundOpen" class="op-qm__mixer" @click.self="soundOpen = false">
        <div class="op-qm__mixer-card">
          <div class="op-qm__mixer-top">
            <b>Hang</b>
            <button type="button" aria-label="Hang bezárása" @click="soundOpen = false">
              <q-icon name="close" size="18px" />
            </button>
          </div>
          <button type="button" class="op-qm__cue" :disabled="!audioUrl" @click="toggleCue">
            <q-icon :name="audioPlaying ? 'sym_r_stop' : 'sym_r_play_arrow'" size="26px" />
            {{ audioPlaying ? 'Leállítás' : audioUrl ? 'Indítás' : 'Betöltés…' }}
          </button>
          <div class="op-qm__track" @pointerdown="onSeek">
            <i :style="{ width: `${seekPct}%` }" />
            <b :style="{ left: `${seekPct}%` }" />
          </div>
          <p class="op-qm__seek-time">{{ clockText(shownTime) }} / {{ clockText(audioDur) }}</p>
          <div class="op-qm__vol">
            <span>
              <q-icon :name="volume === 0 ? 'sym_r_volume_off' : 'sym_r_volume_up'" size="18px" />
              Hangerő
            </span>
            <b>{{ volume }}%</b>
          </div>
          <div class="op-qm__track is-vol" @pointerdown="onVolume">
            <i :style="{ width: `${volume}%` }" />
            <b :style="{ left: `${volume}%` }" />
          </div>
        </div>
      </div>
    </Transition>
    <audio
      v-if="audioUrl"
      ref="audioEl"
      :src="audioUrl"
      preload="metadata"
      @loadedmetadata="onAudioMeta"
      @timeupdate="onAudioTime"
      @play="audioPlaying = true"
      @pause="audioPlaying = false"
      @ended="audioPlaying = false"
    />
    <div v-if="!started" class="op-qm__launch">
      <button type="button" class="op-qm__go" @click="startRound">
        {{ joinLiveQuestion ? 'Csatlakozás' : face === 'game' ? 'Játék indítása' : 'Kvíz indítása' }}
      </button>
      <p class="op-qm__signed">
        <strong>{{ signedIn }}</strong>
        <span>bejelentkező</span>
      </p>
    </div>
    <section v-if="!started" class="op-qm__gate">
      <h2>{{ topic || (face === 'game' ? 'Párbaj' : 'Forduló') }}</h2>
      <p v-if="resumeLabel" class="op-qm__resume">{{ resumeLabel }}</p>
      <div v-if="!showBack" class="op-qm__pick" role="tablist" aria-label="Indítás típusa">
        <button type="button" :class="{ 'is-on': face === 'quiz' }" @click="face = 'quiz'">Kvíz</button>
        <button type="button" :class="{ 'is-on': face === 'game' }" @click="face = 'game'">Játék</button>
      </div>
      <ul>
        <li v-for="team in teamList" :key="team.key" :style="{ background: team.color, color: team.ink }">
          <span>
            {{ team.name }}
            <small v-if="penaltyLabel(team.id)" class="op-qm__adj">{{ penaltyLabel(team.id) }}</small>
          </span>
          <b>{{ team.count }} fő</b>
        </li>
      </ul>
    </section>
    <div v-else class="op-qm__live">
    <div class="op-qm__board">
    <section v-if="tipper" class="op-qm__judge">
      <p>{{ tipper.name }}</p>
      <span :style="{ color: tipper.color }">{{ tipper.team }}</span>
      <div class="op-qm__verdict">
        <button type="button" class="is-ok" :disabled="sending" @click="judge(true)">Jó</button>
        <button type="button" class="is-bad" :disabled="sending" @click="judge(false)">Rossz</button>
      </div>
    </section>
    <section
      v-else
      class="op-qm__clock"
      :class="{ 'is-read': phase === 'read' || (phase === 'paused' && pausedFrom === 'read') }"
      :style="{ '--p': clockRatio }"
    >
      <strong>{{ clockSec }}</strong>
      <span>{{ clockCaption }}</span>
    </section>

    <h2>{{ prompt || 'A kérdés szövege' }}</h2>
    <img v-if="mediaUrl" class="op-qm__pic" :src="mediaUrl" alt="" />
    <p class="op-qm__correct">
      <small>Helyes válasz</small>
      <strong>{{ correct || '—' }}</strong>
    </p>
    </div>
    <p v-if="extraGameId !== 'EG2'" class="op-qm__sent">Beküldte {{ submitted }} / {{ roster }}</p>
    <div class="op-qm__emojis" aria-hidden="true">
      <span
        v-for="item in floaters"
        :key="item.id"
        :style="{ left: `${item.x}%`, animationDuration: `${item.dur}s` }"
      >{{ item.glyph }}</span>
    </div>

    <button
      type="button"
      class="op-qm__play"
      :class="{ 'is-next': canNext && !canFinish, 'is-end': canFinish }"
      :disabled="liveBusy || Boolean(tipper) || (!canFinish && !canNext && phase !== 'ready' && phase !== 'paused')"
      @click="onMain"
    >
      <q-icon
        :name="canFinish ? 'sym_r_check' : canNext ? 'sym_r_arrow_forward' : 'sym_r_play_arrow'"
        size="54px"
      />
      {{ mainLabel }}
    </button>

    <div class="op-qm__row">
      <button type="button" class="op-qm__tool is-answer" :disabled="phase !== 'done'" @click="emit('revealAnswer')">
        <q-icon name="sym_r_visibility" size="28px" />
        Válasz
      </button>
      <button type="button" class="op-qm__tool is-result" @click="openResults">
        <q-icon name="sym_r_leaderboard" size="28px" />
        Eredmény
      </button>
    </div>

    <div class="op-qm__row">
      <button type="button" class="op-qm__tool is-pause" :disabled="liveBusy || (phase !== 'read' && phase !== 'play')" @click="pause">
        <q-icon name="sym_r_pause" size="28px" />
        Szünet
      </button>
      <button type="button" class="op-qm__tool is-repeat" :disabled="liveBusy || phase === 'ready'" @click="repeat">
        <q-icon name="sym_r_replay" size="26px" />
        Újra
      </button>
    </div>

    <div class="op-qm__score">
      <button type="button" class="is-plus" @click="openAdjust('plus')">+ Pont</button>
      <button type="button" class="is-minus" @click="openAdjust('minus')">− Pont</button>
    </div>
    <button v-if="!tipper" type="button" class="op-qm__sample" @click="incomingTip">Minta: tipp érkezett</button>

    <p v-if="jumped" class="op-qm__jump">Következő kérdés. A szerkesztőben ez a minta vége.</p>
    <p v-else-if="face === 'game'" class="op-qm__note">
      Párbaj: 5 kérdés, kérdésenként 10 mp. Csak a leggyorsabb helyes válasz kap +10 pontot. Nem várunk minden telefonra.
    </p>
    <p v-else class="op-qm__note">
      A + és a − a csapatot küldi a szervernek, a pontot ő írja a játékmenet alapján.
      Tippnél az óra helyén látszik, ki tippelt.
    </p>
    <div v-if="showResults" class="op-qm__results">
      <button type="button" class="op-qm__back" @click="closeResults">Vissza</button>
      <p v-if="eventId && resultLoading && !resultRows.length" class="op-qm__note">Eredmények betöltése…</p>
      <OpResultsBoard
        v-else
        :topic="topic"
        :face="face"
        :rows="eventId ? resultRows : undefined"
        :precise="resultPrecise"
        @cast="emit('castResults', $event)"
      />
    </div>
    <div v-if="adjust" class="op-qm__sheet">
      <p>{{ adjust === 'plus' ? 'Pluszpont' : 'Büntetőpont' }}</p>
      <span>Ugyanarra a csapatra többször is lehet. Bezárás: Kész.</span>
      <button
        v-for="team in teamList"
        :key="team.key"
        type="button"
        :disabled="sending"
        :style="{ background: team.color, color: team.ink }"
        @click="sendAdjust(team)"
      >
        <span>{{ team.name }}</span>
        <small class="op-qm__adj-count">{{ adjustCountLabel(team.id) }}</small>
      </button>
      <button type="button" class="is-cancel" :disabled="sending" @click="adjust = null">Kész</button>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useOlimpubStore } from 'src/stores/olimpub';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import { opReactGlyph } from '../constants';
import { countOpPenaltiesByTeam, formatOpPenaltySum, liveAnswerCountFor, parseOpUtcMs, sumOpPenaltiesByTeam } from '../opData';
import {
  nextOpQuestion,
  postOpGameChange,
  reopenOpQuestion,
  pauseOpQuestion,
  startOpExtraQuestion,
  startOpQuestion,
  stopOpExtraQuestion,
  stopOpQuestion,
} from '../opApi';
import OpResultsBoard from './OpResultsBoard.vue';

const emit = defineEmits<{
  close: [];
  back: [];
  begin: [];
  advance: [];
  finish: [];
  results: [];
  castResults: [mode: 'standings' | 'finale'];
  clock: [payload: { phase: Phase; totalMs: number; leftMs: number; endsAt: number; hold: boolean; tipName?: string; tipTeam?: string; outTeamIds?: number[] }];
  revealAnswer: [];
}>();

const props = withDefaults(
  defineProps<{
    prompt: string;
    correct: string;
    timeSec: number;
    sortLabel: string;
    topic?: string;
    mediaUrl?: string | null;
    audioUrl?: string | null;
    hasAudio?: boolean;
    eventId?: number | null;
    showBack?: boolean;
    resumeLabel?: string;
    ender?: boolean;
    initialFace?: 'quiz' | 'game';
    eventQuestionId?: number | null;
    roundId?: number | null;
    extraGameId?: string;
    extraQuestionId?: number | null;
    extraRunId?: number | null;
    questionIndex?: number;
    questionTotal?: number | null;
    resultRows?: { name: string; points: number; previous?: number }[];
    resultLoading?: boolean;
    resultPrecise?: boolean;
  }>(),
  {
    topic: '',
    mediaUrl: null,
    audioUrl: null,
    hasAudio: false,
    eventId: null,
    showBack: false,
    resumeLabel: '',
    ender: false,
    initialFace: 'quiz',
    eventQuestionId: null,
    roundId: null,
    extraGameId: '',
    extraQuestionId: null,
    extraRunId: null,
    questionIndex: 0,
    questionTotal: null,
    resultRows: () => [],
    resultLoading: false,
    resultPrecise: false,
  }
);

const $q = useQuasar();
const store = useOlimpubStore();

type Phase = 'ready' | 'read' | 'play' | 'paused' | 'done';

interface QmTeam {
  key: string;
  id: number | null;
  name: string;
  color: string;
  ink: string;
  count: number;
}

const TEAM_TONES = [
  { color: '#ff4d6d', ink: '#2a0610' },
  { color: '#38bdf8', ink: '#042433' },
  { color: '#f5b942', ink: '#2a1c04' },
  { color: '#c084fc', ink: '#1c0730' },
  { color: '#4ade80', ink: '#052e16' },
  { color: '#fb923c', ink: '#2a1204' },
  { color: '#22d3ee', ink: '#083344' },
  { color: '#f472b6', ink: '#3b0764' },
  { color: '#e2e8f0', ink: '#1e293b' },
];

const NAMED_TONE: Record<string, number> = {
  Farkas: 0,
  Sas: 1,
  Medve: 2,
  Róka: 3,
  Hiúz: 4,
  Bagoly: 5,
  Vidra: 6,
  Gólya: 7,
  'Nincs csapat': 8,
};

function toneFor(name: string) {
  const named = NAMED_TONE[name];
  if (named != null) return TEAM_TONES[named] ?? TEAM_TONES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TEAM_TONES[hash % TEAM_TONES.length] ?? TEAM_TONES[0];
}

function asTeam(name: string, id: number | null, key: string, count: number): QmTeam {
  const tone = toneFor(name);
  return { key, id, name, color: tone.color, ink: tone.ink, count };
}

const SAMPLE_COUNTS = [5, 4, 6, 3, 4, 5, 4, 3, 2];

const SAMPLE_TEAMS: QmTeam[] = [
  'Farkas',
  'Sas',
  'Medve',
  'Róka',
  'Hiúz',
  'Bagoly',
  'Vidra',
  'Gólya',
  'Nincs csapat',
].map((name, index) => asTeam(name, null, name, SAMPLE_COUNTS[index] ?? 4));

const phase = ref<Phase>('ready');
const pausedFrom = ref<'read' | 'play' | null>(null);
const readLeft = ref(0);
const playLeft = ref(0);
const jumped = ref(false);
let wantMosaicContinue = false;
const showResults = ref(false);
const audioEl = ref<HTMLAudioElement | null>(null);
const audioPlaying = ref(false);
const audioNow = ref(0);
const audioDur = ref(0);
const scrub = ref(0);
const scrubbing = ref(false);
const volume = ref(80);
const soundOpen = ref(false);
const teams = ref<QmTeam[]>(SAMPLE_TEAMS);
const face = ref<'quiz' | 'game'>(props.initialFace);
const started = ref(false);
const adjust = ref<'plus' | 'minus' | null>(null);
const sending = ref(false);
const liveBusy = ref(false);
const stoppedOnServer = ref(false);
const tipper = ref<{ name: string; team: string; teamId: number | null; color: string } | null>(null);
const mosaicOutTeams = ref<number[]>([]);
const teamList = computed(() =>
  [...teams.value].sort((a, b) => a.name.localeCompare(b.name, 'hu'))
);
const penaltyByTeam = computed(() =>
  sumOpPenaltiesByTeam(props.eventId ? store.getGame(props.eventId).penalties : [])
);
const penaltyCounts = computed(() =>
  countOpPenaltiesByTeam(props.eventId ? store.getGame(props.eventId).penalties : [])
);

function penaltyLabel(teamId: number | null) {
  if (teamId == null) return '';
  return formatOpPenaltySum(penaltyByTeam.value[teamId] || 0);
}

function adjustCountLabel(teamId: number | null) {
  if (teamId == null) return adjust.value === 'minus' ? '−0' : '+0';
  const slot = penaltyCounts.value[teamId] || { plus: 0, minus: 0 };
  if (adjust.value === 'minus') return `−${slot.minus}`;
  return `+${slot.plus}`;
}
const signedIn = computed(() => teams.value.reduce((sum, team) => sum + team.count, 0));
const demoSubmitted = ref(0);
const roster = computed(() => {
  if (!props.eventId) return 6;
  const fromPing =
    store.lastPingEventId === props.eventId ? store.lastPingRosterCount : null;
  if (fromPing != null && fromPing > 0) return fromPing;
  const game = store.getGame(props.eventId);
  const seats = game.teams.reduce((sum, team) => sum + (team.MemberCount || 0), 0);
  return Math.max(1, signedIn.value, game.teamMembers.length, seats);
});
const submitted = computed(() => {
  if (!props.eventId) return demoSubmitted.value;
  const fromPing = store.lastPingEventId === props.eventId ? store.lastPingAnswerCount : null;
  return liveAnswerCountFor(store.getGame(props.eventId).live, fromPing, {
    eventQuestionId: props.eventQuestionId,
    extraQuestionId: props.extraQuestionId,
  });
});
let tickTimer: number | null = null;
let lastTick = 0;
let answerGap = 0;
let runUntil = 0;

const noClock = computed(() => props.ender || props.timeSec === 0);
const answerMs = computed(() => {
  if (noClock.value) return 0;
  if (props.extraGameId === 'EG1' || face.value === 'game') return Math.max(5, props.timeSec || 10) * 1000;
  return Math.max(5, props.timeSec || 20) * 1000;
});
const readMs = 3000;

const clockSec = computed(() => {
  if (phase.value === 'read' || (phase.value === 'paused' && pausedFrom.value === 'read')) {
    return Math.ceil(readLeft.value / 1000);
  }
  if (phase.value === 'ready') return Math.ceil(answerMs.value / 1000);
  return Math.max(0, Math.ceil(playLeft.value / 1000));
});

const clockRatio = computed(() => {
  if (phase.value === 'read' || (phase.value === 'paused' && pausedFrom.value === 'read')) {
    return readMs ? readLeft.value / readMs : 0;
  }
  if (phase.value === 'ready') return 1;
  return answerMs.value ? Math.max(0, playLeft.value) / answerMs.value : 0;
});

const clockCaption = computed(() => {
  if (phase.value === 'read' || (phase.value === 'paused' && pausedFrom.value === 'read')) return 'Kérdés';
  return 'Válaszidő';
});

const playLabel = computed(() => (phase.value === 'paused' ? 'Folytatás' : 'Indítás'));
const shownTime = computed(() => (scrubbing.value ? scrub.value : audioNow.value));
const seekPct = computed(() => (audioDur.value > 0 ? Math.min(100, (shownTime.value / audioDur.value) * 100) : 0));
const showSound = computed(() => Boolean(props.audioUrl || props.hasAudio));

watch(
  () => [props.audioUrl, props.eventQuestionId, props.extraQuestionId],
  () => {
    audioPlaying.value = false;
    audioNow.value = 0;
    audioDur.value = 0;
    scrub.value = 0;
    soundOpen.value = false;
  }
);

function clockText(sec: number) {
  const safe = Number.isFinite(sec) ? Math.max(0, sec) : 0;
  const whole = Math.floor(safe);
  const min = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${min}:${String(rest).padStart(2, '0')}`;
}

const canNext = computed(() => {
  if (props.extraGameId === 'EG2') {
    return phase.value === 'done' || (phase.value !== 'ready' && playLeft.value <= 0);
  }
  const answering =
    phase.value !== 'ready' &&
    phase.value !== 'read' &&
    !(phase.value === 'paused' && pausedFrom.value === 'read');
  if (!answering) return false;
  if (noClock.value) return false;
  return playLeft.value <= 0 || submitted.value >= roster.value;
});
const atLastQuestion = computed(() => {
  if (props.questionTotal == null || props.questionTotal <= 0) return Boolean(props.ender);
  return (props.questionIndex || 0) >= props.questionTotal;
});
const canFinish = computed(() => {
  if (!atLastQuestion.value) return false;
  if (noClock.value) return phase.value === 'play' || phase.value === 'done' || phase.value === 'paused';
  return canNext.value;
});
const mainLabel = computed(() => {
  if (canFinish.value) return 'Vége';
  if (canNext.value) return isExtra() ? 'Folytatás' : 'Következő';
  return playLabel.value;
});

function stopTick() {
  if (tickTimer != null) {
    window.clearInterval(tickTimer);
    tickTimer = null;
  }
}

function emitClock() {
  const reading = phase.value === 'read' || (phase.value === 'paused' && pausedFrom.value === 'read');
  const totalMs = reading ? readMs : answerMs.value;
  const leftMs =
    phase.value === 'ready' ? answerMs.value : reading ? readLeft.value : playLeft.value;
  const running = phase.value === 'read' || phase.value === 'play';
  emit('clock', {
    phase: phase.value,
    totalMs,
    leftMs: Math.max(0, leftMs),
    endsAt: running ? runUntil : 0,
    hold: reading || phase.value === 'paused',
    tipName: tipper.value?.name || '',
    tipTeam: tipper.value?.team || '',
    outTeamIds: mosaicOutTeams.value,
  });
}

let questionStartedAt = 0;
let pausedAt = 0;

function answerLeftMs() {
  if (questionStartedAt) return Math.max(0, answerMs.value - (Date.now() - questionStartedAt));
  return answerMs.value;
}

function syncPause(hold: boolean) {
  if (!canCallLive() || noClock.value || props.extraGameId === 'EG2') return;
  void pauseOpQuestion(props.eventId as number, {
    eventQuestionId: props.eventQuestionId,
    extraQuestionId: props.extraQuestionId,
    hold,
    leftMs: answerLeftMs(),
  }).catch(() => {
    /* a TV helyi Castja megy; a telefon akkor áll, ha a BE is ismeri */
  });
}

function begin(from: 'read' | 'play') {
  jumped.value = false;
  demoSubmitted.value = 0;
  answerGap = 0;
  questionStartedAt = Date.now();
  tipper.value = null;
  mosaicOutTeams.value = [];
  if (noClock.value) {
    playLeft.value = 1;
    readLeft.value = 0;
    phase.value = 'play';
    pausedFrom.value = null;
    runUntil = 0;
    stopTick();
    emitClock();
    return;
  }
  playLeft.value = answerMs.value;
  if (from === 'read') {
    readLeft.value = readMs;
    phase.value = 'read';
    runUntil = Date.now() + readMs;
  } else {
    readLeft.value = 0;
    phase.value = 'play';
    runUntil = Date.now() + answerMs.value;
  }
  pausedFrom.value = null;
  lastTick = Date.now();
  stopTick();
  tickTimer = window.setInterval(tick, 100);
  emitClock();
}

function tick() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;
  if (phase.value === 'read') {
    readLeft.value = Math.max(0, runUntil - now);
    if (readLeft.value <= 0) {
      readLeft.value = 0;
      phase.value = 'play';
      playLeft.value = answerMs.value;
      runUntil = now + answerMs.value;
      emitClock();
    }
    return;
  }
  if (phase.value !== 'play') return;
  playLeft.value = Math.max(0, runUntil - now);
  answerGap += delta;
  if (!props.eventId) {
    while (answerGap >= 1400 && demoSubmitted.value < roster.value && playLeft.value > 0) {
      answerGap -= 1400;
      demoSubmitted.value += 1;
    }
  }
  if (playLeft.value <= 0) {
    playLeft.value = 0;
    phase.value = 'done';
    stopTick();
    emitClock();
    void stopLive();
  }
}

function onAudioMeta() {
  const el = audioEl.value;
  audioDur.value = el && Number.isFinite(el.duration) ? el.duration : 0;
  if (el) el.volume = volume.value / 100;
}

function applyVolume() {
  const el = audioEl.value;
  if (el) el.volume = volume.value / 100;
}

function onVolume(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement;
  el.setPointerCapture(event.pointerId);
  const move = (ev: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const ratio = (ev.clientX - rect.left) / rect.width;
    volume.value = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    applyVolume();
  };
  const end = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
  };
  move(event);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function onAudioTime() {
  const el = audioEl.value;
  if (!el || scrubbing.value) return;
  audioNow.value = el.currentTime || 0;
}

function toggleCue() {
  const el = audioEl.value;
  if (!el || !props.audioUrl) return;
  if (audioPlaying.value) {
    el.pause();
    return;
  }
  void el.play();
}

function seekTo(ratio: number) {
  const el = audioEl.value;
  if (!el || !(audioDur.value > 0)) return;
  const next = Math.min(audioDur.value, Math.max(0, ratio * audioDur.value));
  scrub.value = next;
  el.currentTime = next;
  audioNow.value = next;
}

function onSeek(event: PointerEvent) {
  if (!props.audioUrl || !(audioDur.value > 0)) return;
  const el = event.currentTarget as HTMLElement;
  el.setPointerCapture(event.pointerId);
  scrubbing.value = true;
  const move = (ev: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const ratio = (ev.clientX - rect.left) / rect.width;
    seekTo(Math.min(1, Math.max(0, ratio)));
  };
  const end = () => {
    scrubbing.value = false;
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
  };
  move(event);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function isExtra() {
  return Boolean(props.extraGameId);
}

function liveIsThisQuestion() {
  if (!props.eventId || props.extraGameId === 'EG2') return false;
  const live = store.getGame(props.eventId).live;
  if (isExtra()) {
    return (
      props.extraQuestionId != null &&
      live.ActiveExtraQuestionID === props.extraQuestionId &&
      String(live.ExtraQuestionStatus || '').toLowerCase() === 'active'
    );
  }
  return (
    props.eventQuestionId != null &&
    live.ActiveEventQuestionID === props.eventQuestionId &&
    String(live.QuestionStatus || '').toLowerCase() === 'active'
  );
}

const joinLiveQuestion = computed(() => liveIsThisQuestion());

function remainingPlayMs() {
  if (!props.eventId) return answerMs.value;
  const live = store.getGame(props.eventId).live;
  if (live.ClockLeftMs != null && live.ClockLeftMs >= 0) return live.ClockLeftMs;
  const start = parseOpUtcMs(live.StartedAtUtc);
  if (start == null) return answerMs.value;
  const read = isExtra() || face.value === 'game' ? 0 : readMs;
  return Math.max(0, answerMs.value + read - (Date.now() - start));
}

function attachFromLive() {
  started.value = true;
  stoppedOnServer.value = false;
  jumped.value = false;
  demoSubmitted.value = 0;
  tipper.value = null;
  if (!props.eventId) return;
  const live = store.getGame(props.eventId).live;
  const left = remainingPlayMs();
  if (live.ClockPaused) {
    playLeft.value = left;
    readLeft.value = 0;
    phase.value = 'paused';
    pausedFrom.value = 'play';
    pausedAt = Date.now();
    runUntil = 0;
    stopTick();
    return;
  }
  if (left <= 0) {
    playLeft.value = 0;
    readLeft.value = 0;
    phase.value = 'done';
    runUntil = 0;
    stopTick();
    return;
  }
  playLeft.value = left;
  readLeft.value = 0;
  phase.value = 'play';
  pausedFrom.value = null;
  pausedAt = 0;
  questionStartedAt = Date.now() - (answerMs.value - left);
  runUntil = Date.now() + left;
  lastTick = Date.now();
  stopTick();
  if (!noClock.value) tickTimer = window.setInterval(tick, 100);
}

function tryAttachToLive() {
  if (!liveIsThisQuestion()) return;
  if (phase.value === 'play' || phase.value === 'read' || (phase.value === 'paused' && pausedFrom.value === 'play')) {
    return;
  }
  attachFromLive();
}

function canCallLive() {
  if (props.eventId == null) return false;
  if (isExtra()) return props.extraQuestionId != null && !props.ender;
  return props.eventQuestionId != null;
}

async function runLive(fallback: string, fn: () => Promise<unknown>): Promise<string | null> {
  if (!props.eventId) return null;
  liveBusy.value = true;
  try {
    await fn();
    return null;
  } catch (error) {
    const message = readAxiosErrorMessage(error, fallback);
    $q.notify({ type: 'negative', message, position: 'top' });
    return message;
  } finally {
    liveBusy.value = false;
  }
}

let stopInFlight: Promise<string | null> | null = null;

async function stopLive() {
  if (!canCallLive() || stoppedOnServer.value) return null;
  if (stopInFlight) return stopInFlight;
  stopInFlight = (async () => {
    try {
      if (isExtra() && props.extraQuestionId != null) {
        await stopOpExtraQuestion(props.eventId as number, props.extraQuestionId);
      } else {
        await stopOpQuestion(props.eventId as number, {
          eventQuestionId: props.eventQuestionId as number,
        });
      }
      stoppedOnServer.value = true;
      return null;
    } catch (error) {
      const message = readAxiosErrorMessage(error, 'A kérdés lezárása nem sikerült.');
      $q.notify({ type: 'negative', message, position: 'top' });
      return message;
    } finally {
      stopInFlight = null;
    }
  })();
  return stopInFlight;
}

function resumeAfterHold() {
  if (phase.value !== 'paused' || !pausedFrom.value) {
    emitClock();
    return;
  }
  const left = pausedFrom.value === 'read' ? readLeft.value : playLeft.value;
  if (pausedAt && questionStartedAt) questionStartedAt += Date.now() - pausedAt;
  pausedAt = 0;
  phase.value = pausedFrom.value;
  pausedFrom.value = null;
  runUntil = Date.now() + Math.max(0, left);
  lastTick = Date.now();
  stopTick();
  if (!noClock.value) tickTimer = window.setInterval(tick, 100);
  emitClock();
}

async function start() {
  if (liveBusy.value) return;
  if (phase.value === 'paused' && pausedFrom.value) {
    resumeAfterHold();
    if (props.extraGameId !== 'EG2') syncPause(false);
    return;
  }
  if (phase.value !== 'ready' && phase.value !== 'done') return;
  if (canCallLive()) {
    const error = await runLive('A kérdés nem indult.', () =>
      isExtra() && props.extraQuestionId != null
        ? startOpExtraQuestion(props.eventId as number, props.extraQuestionId)
        : startOpQuestion(props.eventId as number, {
            eventQuestionId: props.eventQuestionId as number,
            roundId: props.roundId,
          })
    );
    if (error) return;
    stoppedOnServer.value = false;
  }
  begin(face.value === 'game' || isExtra() ? 'play' : 'read');
}

function pause() {
  if (phase.value !== 'read' && phase.value !== 'play') return;
  const left = Math.max(0, runUntil - Date.now());
  if (phase.value === 'read') readLeft.value = left;
  else playLeft.value = left;
  pausedFrom.value = phase.value;
  phase.value = 'paused';
  pausedAt = Date.now();
  stopTick();
  emitClock();
  syncPause(true);
}

async function repeat() {
  if (liveBusy.value || phase.value === 'ready') return;
  if (canCallLive() && !isExtra()) {
    const error = await runLive('A kérdés újranyitása nem sikerült.', () =>
      reopenOpQuestion(props.eventId as number, {
        eventQuestionId: props.eventQuestionId as number,
      })
    );
    if (error) return;
    stoppedOnServer.value = false;
  }
  begin(face.value === 'game' || isExtra() ? 'play' : 'read');
}

function onMain() {
  if (canFinish.value) {
    void leaveToList();
    return;
  }
  if (canNext.value) {
    void jump();
    return;
  }
  void start();
}

async function leaveToList() {
  if (liveBusy.value) return;
  stopTick();
  phase.value = 'done';
  const stopError = await stopLive();
  if (stopError) return;
  emit('back');
}

function startRound() {
  if (liveIsThisQuestion()) {
    attachFromLive();
    return;
  }
  started.value = true;
  emit('begin');
}

function closeResults() {
  showResults.value = false;
}

function openResults() {
  showResults.value = true;
  emit('results');
}

function isRoundOver(message: string) {
  return /véget ért|nincs több|nincs kovetkez|kérdéskör/i.test(message);
}

async function jump() {
  if (liveBusy.value || !canNext.value) return;
  stopTick();
  phase.value = 'done';
  if (props.eventId && isExtra()) {
    const stopError = await stopLive();
    if (stopError) return;
  } else if (props.eventId && props.roundId != null) {
    const stopError = await stopLive();
    if (stopError) return;
    const atEnd =
      props.questionTotal != null &&
      props.questionTotal > 0 &&
      props.questionIndex >= props.questionTotal;
    if (!atEnd) {
      const nextError = await runLive('A következő kérdés nem lépett.', () =>
        nextOpQuestion(props.eventId as number, {
          roundId: props.roundId as number,
        })
      );
      if (nextError) {
        if (isRoundOver(nextError)) emit('finish');
        return;
      }
    }
  }
  jumped.value = true;
  if (props.extraGameId === 'EG2' && !atLastQuestion.value) wantMosaicContinue = true;
  emit('advance');
}

function openAdjust(direction: 'plus' | 'minus') {
  adjust.value = direction;
}

function applyBuzzTip(name: string, teamName: string, teamId: number | null) {
  if (props.extraGameId !== 'EG2') return;
  if (tipper.value) return;
  if (teamId != null && mosaicOutTeams.value.includes(teamId)) return;
  const team =
    (teamId != null ? teams.value.find((row) => row.id === teamId) : undefined) ||
    teams.value.find((row) => row.name === teamName);
  tipper.value = {
    name: name || 'Játékos',
    team: team?.name || teamName || 'Csapat',
    teamId: team?.id ?? teamId,
    color: team?.color || '#38bdf8',
  };
  audioEl.value?.pause();
  if (phase.value === 'play' || phase.value === 'read') pause();
  else emitClock();
}

function incomingTip() {
  const team = teams.value.find((row) => row.name === 'Sas') ?? teamList.value[0];
  applyBuzzTip('Csilla', team?.name || 'Sas', team?.id ?? null);
}

const floaters = ref<{ id: number; glyph: string; x: number; dur: number }[]>([]);
let floaterId = 0;

function spawnReact(glyph: string) {
  const item = {
    id: ++floaterId,
    glyph,
    x: 8 + Math.random() * 84,
    dur: 2.2 + Math.random() * 1.4,
  };
  floaters.value = [...floaters.value, item].slice(-16);
  window.setTimeout(() => {
    floaters.value = floaters.value.filter((row) => row.id !== item.id);
  }, item.dur * 1000);
}

watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId !== props.eventId) return;
    if (store.lastPingAction === 'Op.React') {
      const glyph = opReactGlyph(store.lastPingGlyph) || store.lastPingGlyph;
      if (glyph) spawnReact(glyph);
      return;
    }
    if (store.lastPingAction !== 'Op.MosaicBuzz') return;
    if (props.extraGameId !== 'EG2') return;
    applyBuzzTip(store.lastPingNickname, store.lastPingTeamName, store.lastPingTeamId);
  }
);

function teamsFromStore(): QmTeam[] {
  if (!props.eventId) return SAMPLE_TEAMS;
  const rows = store
    .getGame(props.eventId)
    .teams.filter((team) => team.Name.trim())
    .map((team) => asTeam(team.Name, team.id, String(team.id), team.MemberCount));
  return rows.length ? rows : SAMPLE_TEAMS;
}

async function loadTeams() {
  if (!props.eventId) {
    teams.value = SAMPLE_TEAMS;
    return;
  }
  try {
    await store.loadEvent(props.eventId);
  } catch {
    /* a Pinia marad */
  }
  teams.value = teamsFromStore();
}

async function sendAdjust(team: QmTeam) {
  if (!props.eventId || team.id == null) {
    $q.notify({
      type: 'warning',
      message: 'Minta csapat: a szerver nem kapott hívást.',
      position: 'top',
    });
    adjust.value = null;
    return;
  }
  sending.value = true;
  try {
    await postOpGameChange({
      EventID: props.eventId,
      Action: 'Op.AdjustTeam',
      Payload: {
        TeamID: team.id,
        Direction: adjust.value,
      },
    });
    try {
      await store.loadEvent(props.eventId);
    } catch {
      /* a SignalR GET hozza */
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: readAxiosErrorMessage(error, 'A pontot a szerver nem vette át.'),
      position: 'top',
    });
  } finally {
    sending.value = false;
  }
}

function applyMosaicJudge(correct: boolean, who: { teamId: number | null }) {
  tipper.value = null;
  if (correct) {
    mosaicOutTeams.value = [];
    jumped.value = false;
    stopTick();
    phase.value = 'done';
    playLeft.value = 0;
    pausedFrom.value = null;
    emitClock();
    return;
  }
  if (who.teamId != null && !mosaicOutTeams.value.includes(who.teamId)) {
    mosaicOutTeams.value = [...mosaicOutTeams.value, who.teamId];
  }
  audioEl.value?.play();
  resumeAfterHold();
}

async function judge(correct: boolean) {
  const who = tipper.value;
  if (!who) return;
  if (!props.eventId || who.teamId == null) {
    applyMosaicJudge(correct, who);
    if (correct) emit('advance');
    $q.notify({
      type: 'warning',
      message: correct ? 'Jó. Minta, a szerver nem kapott hívást.' : 'Rossz. Minta, a szerver nem kapott hívást.',
      position: 'top',
    });
    return;
  }
  sending.value = true;
  try {
    await postOpGameChange({
      EventID: props.eventId,
      Action: 'Op.MosaicJudge',
      Payload: {
        ExtraQuestionID: props.extraQuestionId,
        TeamID: who.teamId,
        TeamName: who.team,
        CorrectFlg: correct,
      },
    });
    if (correct) {
      applyMosaicJudge(true, who);
      await stopLive();
      return;
    }
    applyMosaicJudge(false, who);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: readAxiosErrorMessage(error, 'Az értékelést a szerver nem vette át.'),
      position: 'top',
    });
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  void loadTeams();
  tryAttachToLive();
});

watch(
  () => props.eventId,
  () => {
    void loadTeams();
  }
);

watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId !== props.eventId) return;
    if (store.lastPingAction === 'Op.AdjustTeam') {
      teams.value = teamsFromStore();
      return;
    }
    if (store.lastPingAction !== 'Op.JoinTeam' && store.lastPingAction !== 'Op.LeaveTeam') return;
    void loadTeams();
  }
);

watch(
  () => (props.eventId ? store.getGame(props.eventId).loadedAt : 0),
  () => {
    if (props.eventId) teams.value = teamsFromStore();
    tryAttachToLive();
  }
);

watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId !== props.eventId) return;
    if (
      store.lastPingAction === 'Op.StartQuestion' ||
      store.lastPingAction === 'Op.StartExtraQuestion' ||
      store.lastPingAction === 'Op.NextQuestion' ||
      store.lastPingAction === 'Op.ReopenQuestion' ||
      store.lastPingAction === 'Op.PauseQuestion'
    ) {
      tryAttachToLive();
    }
  }
);

watch(
  () => props.sortLabel,
  (next, prev) => {
    if (!started.value || !prev || next === prev) return;
    stopTick();
    phase.value = 'ready';
    pausedFrom.value = null;
    readLeft.value = 0;
    playLeft.value = answerMs.value;
    demoSubmitted.value = 0;
    jumped.value = false;
    runUntil = 0;
    stoppedOnServer.value = true;
    tipper.value = null;
    mosaicOutTeams.value = [];
    if (wantMosaicContinue) {
      wantMosaicContinue = false;
      void start();
    }
  }
);

onUnmounted(() => {
  audioEl.value?.pause();
  stopTick();
});
</script>

<style scoped>
.op-qm {
  position: relative;
  min-height: 100%;
  padding: 16px 16px 28px;
  overflow: hidden;
  color: #fff8f2;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 77, 109, 0.55), transparent 36%),
    radial-gradient(circle at 100% 8%, rgba(56, 189, 248, 0.45), transparent 32%),
    radial-gradient(circle at 80% 100%, rgba(245, 185, 66, 0.4), transparent 34%),
    #1a0b24;
}

.op-qm.is-game {
  background:
    radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.5), transparent 36%),
    radial-gradient(circle at 100% 8%, rgba(99, 102, 241, 0.45), transparent 32%),
    radial-gradient(circle at 80% 100%, rgba(16, 185, 129, 0.35), transparent 34%),
    #06141c;
}

.op-qm.is-game .op-qm__ord {
  background: #22d3ee;
  color: #042433;
}

.op-qm__gate {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: calc(100vh - 100px);
}

.op-qm__kicker {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fda4af;
}

.op-qm.is-game .op-qm__kicker {
  color: #67e8f9;
}

.op-qm__gate h2 {
  margin: 0;
  font-size: 40px;
  line-height: 1;
}

.op-qm__pick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.op-qm__pick button {
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__pick button.is-on {
  background: #ff4d6d;
  color: #2a0610;
}

.op-qm.is-game .op-qm__pick button.is-on {
  background: #22d3ee;
  color: #042433;
}

.op-qm__gate ul {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.op-qm__gate li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 0 16px;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 900;
}

.op-qm__adj {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 900;
  opacity: 0.88;
}

.op-qm__go {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: auto;
  min-height: 64px;
  margin: 0;
  border: 0;
  border-radius: 18px;
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__go {
  background: #f5b942;
  color: #2a1c04;
}

.op-qm.is-game .op-qm__go {
  background: #22d3ee;
  color: #042433;
}

.op-qm__launch {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin: 0 0 14px;
}

.op-qm__signed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 108px;
  margin: 0;
  padding: 8px 12px;
  border-radius: 18px;
  background: rgba(255, 248, 242, 0.12);
}

.op-qm__signed strong {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.op-qm__signed span {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 800;
}

.op-qm__wash {
  position: absolute;
  inset: 18% auto auto 20%;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: rgba(192, 132, 252, 0.35);
  filter: blur(8px);
  pointer-events: none;
}

.op-qm.is-game .op-qm__wash {
  background: rgba(34, 211, 238, 0.35);
}

.op-qm__top,
.op-qm__clock,
.op-qm h2,
.op-qm__pic,
.op-qm__correct,
.op-qm__sent,
.op-qm__play,
.op-qm__row,
.op-qm__judge,
.op-qm__score,
.op-qm__sample,
.op-qm__note,
.op-qm__jump {
  position: relative;
}

.op-qm__top {
  position: relative;
  z-index: 7;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
}

.op-qm__close {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff8f2;
  cursor: pointer;
}

.op-qm__backnav {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 248, 242, 0.1);
  color: #fff8f2;
  cursor: pointer;
}

.op-qm__resume {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #7dd3fc;
}

.op-qm__end {
  min-height: 52px;
  padding: 0 18px;
  border: 0;
  border-radius: 16px;
  background: #fb923c;
  color: #2a1204;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__id {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.op-qm__topic {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.op-qm__ord {
  margin: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: #f5b942;
  color: #2a1c04;
  font-size: 14px;
  font-weight: 900;
}

.op-qm__close.is-end {
  margin-left: auto;
}

.op-qm__tone {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  margin-left: auto;
  border: 0;
  border-radius: 18px;
  background: rgba(192, 132, 252, 0.28);
  color: #f5d0fe;
  cursor: pointer;
  animation: op-tone-blink 0.7s ease-in-out infinite;
}

.op-qm__tone.is-live {
  color: #f5b942;
  background: rgba(245, 185, 66, 0.28);
  animation-duration: 0.45s;
}

.op-qm__tone.is-on {
  animation: none;
  background: #c084fc;
  color: #1c0730;
  box-shadow: none;
  filter: none;
  transform: none;
  opacity: 1;
}

@keyframes op-tone-blink {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(192, 132, 252, 0.9);
    filter: drop-shadow(0 0 10px rgba(245, 208, 254, 0.95));
  }
  50% {
    opacity: 0.12;
    transform: scale(0.78);
    box-shadow: 0 0 28px 10px rgba(192, 132, 252, 0.55);
    filter: drop-shadow(0 0 0 transparent);
  }
}

.op-qm__clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 148px;
  height: 148px;
  margin: 18px auto 0;
  border-radius: 999px;
  background:
    radial-gradient(circle at center, #1a0b24 0 58%, transparent 60%),
    conic-gradient(#4ade80 calc(var(--p) * 1turn), rgba(255, 255, 255, 0.16) 0);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
}

.op-qm__clock.is-read {
  background:
    radial-gradient(circle at center, #1a0b24 0 58%, transparent 60%),
    conic-gradient(#f5b942 calc(var(--p) * 1turn), rgba(255, 255, 255, 0.16) 0);
}

.op-qm__clock strong {
  font-size: 48px;
  font-weight: 900;
  line-height: 1;
}

.op-qm__clock span {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fde68a;
}

.op-qm__judge {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 12px;
}

.op-qm__judge p {
  margin: 0;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
}

.op-qm__judge > span {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
  color: #7dd3fc;
}

.op-qm__verdict {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  margin-top: 12px;
}

.op-qm__verdict button {
  min-height: 84px;
  border: 0;
  border-radius: 22px;
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__verdict button:disabled {
  cursor: default;
  opacity: 0.6;
}

.op-qm__verdict .is-ok {
  background: #4ade80;
  color: #052e16;
}

.op-qm__verdict .is-bad {
  background: #ff4d6d;
  color: #2a0610;
}

.op-qm h2 {
  margin: 16px 0 0;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.25;
}

.op-qm__pic {
  display: block;
  width: min(100%, 280px);
  max-height: 160px;
  margin: 12px auto 0;
  object-fit: contain;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.28);
}

.op-qm__correct {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 12px 0 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(74, 222, 128, 0.14);
  color: #bbf7d0;
}

.op-qm__correct small {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #86efac;
}

.op-qm__correct strong {
  font-size: clamp(18px, 3.2vw, 28px);
  font-weight: 900;
  line-height: 1.15;
  color: #f0fdf4;
}

.op-qm__mixer {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 74px;
  z-index: 6;
}

.op-qm__mixer-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 12px 14px;
  border-radius: 20px;
  background: rgba(18, 8, 28, 0.94);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px);
}

.op-qm__mixer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.op-qm__mixer-top b {
  font-size: 15px;
  font-weight: 900;
}

.op-qm__mixer-top button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 248, 242, 0.1);
  color: #fff8f2;
  cursor: pointer;
}

.op-mixer-enter-active,
.op-mixer-leave-active {
  transition: opacity 0.2s ease;
}

.op-mixer-enter-active .op-qm__mixer-card,
.op-mixer-leave-active .op-qm__mixer-card {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.op-mixer-enter-from,
.op-mixer-leave-to {
  opacity: 0;
}

.op-mixer-enter-from .op-qm__mixer-card,
.op-mixer-leave-to .op-qm__mixer-card {
  transform: translateY(-16px);
}

.op-qm__cue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  background: #c084fc;
  color: #1c0730;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__cue:disabled {
  opacity: 0.5;
  cursor: default;
}

.op-qm__seek-time {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #fde68a;
}

.op-qm__vol {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 900;
}

.op-qm__vol span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.op-qm__vol b {
  color: #fde68a;
}

.op-qm__track.is-vol {
  height: 36px;
  margin-top: 0;
}

.op-qm__track.is-vol i {
  background: #38bdf8;
}

.op-qm__track.is-vol b {
  width: 28px;
  height: 28px;
}

.op-qm__track {
  position: relative;
  height: 36px;
  margin: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  touch-action: none;
  cursor: pointer;
}

.op-qm__track i {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #c084fc, #f5b942);
}

.op-qm__track b {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #fff8f2;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
}

.op-qm__sent {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 800;
  color: #7dd3fc;
}

.op-qm__emojis {
  position: relative;
  height: 0;
  min-height: 0;
  margin: 0;
  overflow: visible;
  pointer-events: none;
}

.op-qm__emojis > span {
  position: absolute;
  bottom: 4px;
  font-size: 32px;
  animation-name: op-qm-emoji;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@keyframes op-qm-emoji {
  0% { transform: translateY(16px) scale(0.4); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-10px) scale(1.05); opacity: 0; }
}

.op-qm__play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 92px;
  margin-top: 8px;
  border: 0;
  border-radius: 28px;
  background: linear-gradient(135deg, #ff4d6d, #f5b942 55%, #4ade80);
  color: #1a0b12;
  font-size: 28px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(255, 77, 109, 0.35);
}

.op-qm__play.is-next {
  background: #4ade80;
  color: #052e16;
  box-shadow: 0 14px 28px rgba(74, 222, 128, 0.35);
}

.op-qm__play.is-end {
  background: linear-gradient(135deg, #f5b942, #ff4d6d);
  color: #2a0610;
  box-shadow: 0 14px 28px rgba(255, 77, 109, 0.35);
}

.op-qm__play:disabled {
  cursor: default;
  filter: saturate(0.7);
  opacity: 0.72;
}

.op-qm__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.op-qm__tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 72px;
  border: 0;
  border-radius: 18px;
  color: #101018;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__tool:disabled {
  cursor: default;
  opacity: 0.38;
}

.op-qm__tool.is-pause {
  background: #fb923c;
}

.op-qm__tool.is-repeat {
  background: #38bdf8;
}

.op-qm__tool.is-answer {
  background: #86efac;
  color: #052e16;
}

.op-qm__tool.is-result {
  background: #f5b942;
  color: #2a1c04;
}

.op-qm__results {
  position: absolute;
  inset: 0;
  z-index: 30;
  overflow: auto;
  background: #14081c;
}

.op-qm__results :deep(.op-res) {
  min-height: 100%;
}

.op-qm__back {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff8f2;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__score {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.op-qm__score button {
  min-height: 64px;
  border: 0;
  border-radius: 18px;
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__score .is-plus {
  background: #4ade80;
  color: #052e16;
}

.op-qm__score .is-minus {
  background: #ff4d6d;
  color: #2a0610;
}

.op-qm__sample {
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  color: #fde68a;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__sheet {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 72px 16px 24px;
  overflow: auto;
  background: #14081c;
}

.op-qm__sheet p {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
}

.op-qm__sheet > span {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 248, 242, 0.75);
}

.op-qm__sheet button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 0 18px;
  border: 0;
  border-radius: 16px;
  background: #f5b942;
  color: #2a1c04;
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
}

.op-qm__adj-count {
  font-size: 22px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.op-qm__sheet button:disabled {
  cursor: default;
  opacity: 0.55;
}

.op-qm__sheet .is-cancel {
  justify-content: center;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff8f2;
}

.op-qm__note,
.op-qm__jump {
  margin: 14px 0 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: rgba(255, 248, 242, 0.78);
}

.op-qm__jump {
  color: #fde68a;
}
</style>
