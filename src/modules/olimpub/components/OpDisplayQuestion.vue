<template>
  <section class="op-dq" :class="[heat, face === 'game' ? 'is-game' : 'is-quiz', { 'is-hold': holding }]">
    <div class="op-dq__board" :class="{ 'is-plain': !mediaUrl }">
      <div class="op-dq__main">
        <p class="op-dq__ord">
          <b>{{ face === 'game' ? 'Játék' : 'Kvíz' }}</b>
          <span v-if="topic">{{ topic }}</span>
          <span>{{ sortLabel }}</span>
        </p>
        <h2>{{ prompt || 'A kérdés szövege' }}</h2>
        <p v-if="tipName" class="op-dq__tip">
          <b>{{ tipTeam || 'Csapat' }}</b>
          <span>{{ tipName }} tippel</span>
        </p>
        <p v-if="showCorrect && correctText" class="op-dq__solve">{{ correctText }}</p>
        <div v-if="holding && !showCorrect" class="op-dq__hold">
          <strong>{{ shownSec }}</strong>
          <span>Kérdés</span>
        </div>

        <template v-else>
        <div v-if="type === 'match'" class="op-dq__pair">
          <div>
            <p class="op-dq__kicker">Bal oldal</p>
            <ul class="op-dq__opts">
              <li v-for="(row, n) in choiceRows" :key="`l-${n}`" :class="[`c-${n % 6}`, { 'is-ok': showCorrect && corrects[n] }]">
                <b>{{ letter(n) }}</b>
                <span>{{ row }}</span>
              </li>
            </ul>
          </div>
          <div>
            <p class="op-dq__kicker">Jobb oldal</p>
            <ul class="op-dq__opts is-dark">
              <li v-for="(row, n) in matchRows" :key="`r-${n}`" :class="`c-${n % 6}`">
                <b>{{ n + 1 }}</b>
                <span>{{ row }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div v-else-if="type === 'category'" class="op-dq__pair">
          <div>
            <p class="op-dq__kicker">Darabok</p>
            <ul class="op-dq__opts">
              <li v-for="(row, n) in choiceRows" :key="`c-${n}`" :class="[`c-${n % 6}`, { 'is-ok': showCorrect && corrects[n] }]">
                <b>{{ letter(n) }}</b>
                <span>{{ row }}</span>
              </li>
            </ul>
          </div>
          <div>
            <p class="op-dq__kicker">Kategóriák</p>
            <ul class="op-dq__opts is-dark">
              <li v-for="(row, n) in categoryRows" :key="`k-${n}`" :class="`c-${n % 6}`">
                <span>{{ row }}</span>
              </li>
            </ul>
          </div>
        </div>

        <ul v-else-if="choiceRows.length" class="op-dq__opts" :class="{ 'is-split': choiceRows.length > 4 }">
          <li v-for="(row, n) in choiceRows" :key="`a-${n}`" :class="[`c-${n % 6}`, { 'is-ok': showCorrect && corrects[n] }]">
            <b>{{ letter(n) }}</b>
            <span>{{ row }}</span>
          </li>
        </ul>

        <p v-else-if="type === 'mosaic'" class="op-dq__free">Hallgassátok a zenét.</p>
        <p v-else-if="type === 'freetext'" class="op-dq__free">Szabad szöveg — a választ beírják.</p>
        </template>
      </div>

      <div v-if="mediaUrl" class="op-dq__media">
        <img :src="mediaUrl" alt="" />
      </div>
    </div>

        <div v-if="!holding" class="op-dq__stage">
      <div class="op-dq__bar">
        <div class="op-dq__bar-time">
          <i :style="{ width: `${ratio * 100}%` }" />
          <strong :key="shownSec">{{ shownSec }}</strong>
        </div>
        <div v-if="!isMosaic" class="op-dq__bar-ans">
          <i :style="{ width: `${answerRatio * 100}%` }" />
        </div>
        <p v-if="!isMosaic" class="op-dq__count">
          Beküldte
          <b :key="sentCount">{{ sentCount }}</b>
          <small>/ {{ roster }}</small>
        </p>
        <div class="op-dq__emojis">
          <span
            v-for="item in floaters"
            :key="item.id"
            :style="{ left: `${item.x}%`, animationDuration: `${item.dur}s` }"
          >
            {{ item.glyph }}
          </span>
          <ul class="op-dq__tally">
            <li v-for="row in tallyRows" :key="row.glyph">
              <span>{{ row.glyph }}</span>
              <b :key="row.count">{{ row.count }}</b>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { OpDisplayClockPhase } from '../opDisplayChannel';

const props = withDefaults(
  defineProps<{
    prompt: string;
    sortLabel: string;
    topic?: string;
    face?: 'quiz' | 'game';
    timeSec: number;
    mediaUrl?: string | null;
    type?: string;
    answers?: string[];
    matches?: string[];
    categories?: string[];
    clockPhase?: OpDisplayClockPhase;
    clockTotalMs?: number;
    clockLeftMs?: number;
    clockEndsAt?: number;
    clockHold?: boolean;
    answerCount?: number | null;
    rosterCount?: number | null;
    reactGlyph?: string;
    reactAt?: number;
    showCorrect?: boolean;
    corrects?: boolean[];
    correctText?: string;
    tipName?: string;
    tipTeam?: string;
  }>(),
  {
    topic: '',
    face: 'quiz',
    mediaUrl: null,
    type: 'single',
    answers: () => [],
    matches: () => [],
    categories: () => [],
    clockPhase: '',
    clockTotalMs: 0,
    clockLeftMs: 0,
    clockEndsAt: 0,
    clockHold: false,
    answerCount: null,
    rosterCount: null,
    reactGlyph: '',
    reactAt: 0,
    showCorrect: false,
    corrects: () => [],
    correctText: '',
    tipName: '',
    tipTeam: '',
  }
);

const isMosaic = computed(() => String(props.type || '').toLowerCase() === 'mosaic');
const isFreetext = computed(() => String(props.type || '').toLowerCase() === 'freetext' || isMosaic.value);
const choiceRows = computed(() =>
  isFreetext.value ? [] : (props.answers || []).map((item) => item.trim()).filter(Boolean)
);
const matchRows = computed(() => (props.matches || []).map((item) => item.trim()).filter(Boolean));
const categoryRows = computed(() => {
  const named = (props.categories || []).map((item) => item.trim()).filter(Boolean);
  const source = named.length ? named : matchRows.value;
  return [...new Set(source)];
});

function letter(index: number) {
  return 'ABCDEFGH'[index] || String(index + 1);
}

const glyphs = ['❤️', '😂', '🔥', '😢', '💩'] as const;
type Floater = { id: number; glyph: string; x: number; dur: number };

const liveCounts = computed(() => props.answerCount != null || props.rosterCount != null);
const roster = computed(() => Math.max(1, props.rosterCount || 0));
const leftMs = ref(0);
const sentCount = ref(0);
const tally = ref<Record<string, number>>({ '❤️': 0, '😂': 0, '🔥': 0, '😢': 0, '💩': 0 });
const floaters = ref<Floater[]>([]);
let timer: number | null = null;
let restart: number | null = null;
let last = 0;
let answerGap = 0;
let emojiGap = 0;
let floaterId = 0;
let alive = true;

const synced = computed(() => props.clockPhase !== '');
const holding = computed(
  () => !isMosaic.value && (props.clockHold || props.clockPhase === 'read')
);
const totalMs = computed(() =>
  synced.value && props.clockTotalMs > 0 ? props.clockTotalMs : Math.max(5, props.timeSec || 20) * 1000
);
const ratio = computed(() => (totalMs.value ? Math.max(0, leftMs.value) / totalMs.value : 0));
const shownSec = computed(() => Math.max(0, Math.ceil(leftMs.value / 1000)));
const answerRatio = computed(() => Math.min(1, sentCount.value / roster.value));
const heat = computed(() => (ratio.value < 0.22 ? 'is-hot' : ratio.value < 0.5 ? 'is-mid' : 'is-calm'));
const tallyRows = computed(() => glyphs.map((glyph) => ({ glyph, count: tally.value[glyph] || 0 })));

function reset() {
  leftMs.value = totalMs.value;
  sentCount.value = 0;
  answerGap = 0;
  emojiGap = 0;
  tally.value = { '❤️': 0, '😂': 0, '🔥': 0, '😢': 0, '💩': 0 };
  floaters.value = [];
  last = Date.now();
}

function spawn(glyph = glyphs[Math.floor(Math.random() * glyphs.length)] ?? '❤️') {
  if (!glyph) return;
  tally.value = { ...tally.value, [glyph]: (tally.value[glyph] || 0) + 1 };
  const item: Floater = {
    id: ++floaterId,
    glyph,
    x: 6 + Math.random() * 88,
    dur: 1.6,
  };
  floaters.value = [...floaters.value, item].slice(-16);
  window.setTimeout(() => {
    if (!alive) return;
    floaters.value = floaters.value.filter((row) => row.id !== item.id);
  }, item.dur * 1000 + 40);
}

function tick() {
  const now = Date.now();
  const delta = now - last;
  last = now;
  leftMs.value -= delta;
  answerGap += delta;
  emojiGap += delta;
  if (!liveCounts.value && !synced.value) {
    const answerEvery = Math.max(320, totalMs.value / 42);
    while (answerGap >= answerEvery && sentCount.value < roster.value && leftMs.value > 0) {
      answerGap -= answerEvery;
      sentCount.value += 1;
    }
    if (emojiGap >= 700 && leftMs.value > 0) {
      emojiGap = 0;
      spawn();
    }
  }
  if (leftMs.value <= 0) {
    leftMs.value = 0;
    stopClock();
    restart = window.setTimeout(() => start(), 700);
  }
}

function stopClock() {
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function stop() {
  stopClock();
  if (restart != null) {
    window.clearTimeout(restart);
    restart = null;
  }
}

function start() {
  stop();
  reset();
  timer = window.setInterval(tick, 80);
}

function followClock() {
  stop();
  const phase = props.clockPhase;
  if (props.clockHold || phase === 'paused') {
    leftMs.value = props.clockLeftMs > 0 ? props.clockLeftMs : leftMs.value;
    return;
  }
  if (phase === 'read' || phase === 'play') {
    if (!liveCounts.value) sentCount.value = 0;
    answerGap = 0;
    emojiGap = 0;
    if (phase === 'read' && !liveCounts.value) {
      tally.value = { '❤️': 0, '😂': 0, '🔥': 0, '😢': 0, '💩': 0 };
      floaters.value = [];
    }
    const step = () => {
      const left = Math.max(0, props.clockEndsAt - Date.now());
      leftMs.value = left;
      if (phase !== 'play' || left <= 0) {
        if (left <= 0) stopClock();
        return;
      }
      if (liveCounts.value || synced.value) return;
    };
    step();
    timer = window.setInterval(step, 80);
    return;
  }
  leftMs.value = phase === 'done' ? 0 : props.clockLeftMs || totalMs.value;
  if (phase === 'ready' && !liveCounts.value) {
    sentCount.value = 0;
    floaters.value = [];
  }
}

watch(
  () => props.timeSec,
  () => {
    if (!synced.value) start();
  }
);

watch(
  () => [props.clockPhase, props.clockEndsAt, props.clockLeftMs, props.clockTotalMs, props.clockHold] as const,
  () => {
    if (synced.value) followClock();
  }
);

watch(
  () => props.answerCount,
  (count) => {
    if (count != null) sentCount.value = count;
  },
  { immediate: true }
);

let lastReactAt = 0;
watch(
  () => props.reactAt,
  (at) => {
    if (!at || !props.reactGlyph || at === lastReactAt) return;
    lastReactAt = at;
    spawn(props.reactGlyph);
  }
);

onMounted(() => {
  if (synced.value) followClock();
  else start();
});
onUnmounted(() => {
  alive = false;
  stop();
});
</script>

<style scoped>
.op-dq__hold {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8vh;
}

.op-dq__hold strong {
  font-size: clamp(72px, 12vw, 160px);
  line-height: 0.9;
  font-weight: 900;
}

.op-dq__hold span {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-dq__tip {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 14px 0 0;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(34, 211, 238, 0.18);
  border: 2px solid #22d3ee;
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 900;
  line-height: 1.15;
  color: #ecfeff;
}

.op-dq__tip b {
  padding: 6px 12px;
  border-radius: 999px;
  background: #22d3ee;
  color: #042433;
}

.op-dq__solve {
  margin: 12px 0 0;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(74, 222, 128, 0.2);
  border: 2px solid #4ade80;
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 900;
  line-height: 1.15;
  color: #f0fdf4;
}

.op-dq.is-hold h2 {
  font-size: clamp(36px, 5vw, 72px);
}

.op-dq {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 64px 24px 24px;
  overflow: hidden;
  color: #fff8f2;
  background:
    radial-gradient(circle at 8% 12%, rgba(255, 77, 109, 0.45), transparent 28%),
    radial-gradient(circle at 92% 18%, rgba(56, 189, 248, 0.4), transparent 26%),
    radial-gradient(circle at 70% 90%, rgba(245, 185, 66, 0.35), transparent 30%),
    #14081c;
}

.op-dq.is-game {
  background:
    radial-gradient(circle at 8% 12%, rgba(34, 211, 238, 0.42), transparent 28%),
    radial-gradient(circle at 92% 18%, rgba(99, 102, 241, 0.4), transparent 26%),
    radial-gradient(circle at 70% 90%, rgba(16, 185, 129, 0.28), transparent 30%),
    #06141c;
}

.op-dq.is-hot {
  animation: op-dq-flash 0.6s ease-in-out infinite;
}

.op-dq__board {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.75fr);
  gap: 20px;
  align-items: start;
  min-height: 0;
}

.op-dq__board.is-plain {
  grid-template-columns: minmax(0, 1fr);
}

.op-dq__ord {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #fff8f2;
}

.op-dq__ord b {
  padding: 6px 12px;
  border-radius: 999px;
  background: #ff4d6d;
  color: #2a0610;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.op-dq.is-game .op-dq__ord b {
  background: #22d3ee;
  color: #042433;
}

.op-dq__ord span {
  color: #ffe8c2;
}

.op-dq.is-game .op-dq__ord span {
  color: #a5f3fc;
}

.op-dq__main h2 {
  margin: 6px 0 0;
  font-size: clamp(26px, 3.4vw, 46px);
  font-weight: 900;
  line-height: 1.08;
  text-align: left;
}

.op-dq__kicker {
  margin: 14px 0 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fde68a;
}

.op-dq__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
  align-items: start;
}

.op-dq__opts {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.op-dq__opts.is-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
}

.op-dq__opts li {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px 14px;
  border-radius: 14px;
  color: #141018;
  font-size: clamp(16px, 1.8vw, 24px);
  font-weight: 800;
  line-height: 1.2;
  text-align: left;
}

.op-dq__opts li.is-ok {
  box-shadow: 0 0 0 3px #4ade80, 0 0 24px rgba(74, 222, 128, 0.55);
  outline: 3px solid #bbf7d0;
}

.op-dq__opts b {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  font-size: 15px;
}

.op-dq__opts .c-0 { background: #ff4d6d; }
.op-dq__opts .c-1 { background: #38bdf8; }
.op-dq__opts .c-2 { background: #f5b942; }
.op-dq__opts .c-3 { background: #4ade80; }
.op-dq__opts .c-4 { background: #c084fc; }
.op-dq__opts .c-5 { background: #fb923c; }

.op-dq__opts.is-dark li {
  color: #fff8f2;
}

.op-dq__opts.is-dark b {
  background: rgba(255, 255, 255, 0.16);
  color: #fff8f2;
}

.op-dq__opts.is-dark .c-0 { background: #5c1a2e; }
.op-dq__opts.is-dark .c-1 { background: #123044; }
.op-dq__opts.is-dark .c-2 { background: #3d3010; }
.op-dq__opts.is-dark .c-3 { background: #143528; }
.op-dq__opts.is-dark .c-4 { background: #2c1844; }
.op-dq__opts.is-dark .c-5 { background: #3d2414; }

.op-dq__free {
  margin: 16px 0 0;
  font-size: 20px;
  font-weight: 800;
  color: #fde68a;
}

.op-dq__media {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  max-height: 46vh;
  padding: 8px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.28);
}

.op-dq__media img {
  display: block;
  width: 100%;
  max-height: 42vh;
  object-fit: contain;
}

.op-dq__stage {
  margin-top: auto;
  padding-top: 16px;
}

.is-calm {
  --clock: #4ade80;
}

.is-mid {
  --clock: #f5b942;
}

.is-hot {
  --clock: #ff4d6d;
}

.op-dq__bar-time strong,
.op-dq__count b,
.op-dq__tally b {
  animation: op-dq-pop 0.38s cubic-bezier(0.18, 1.4, 0.32, 1);
}

.op-dq__bar {
  flex: 1;
  min-width: 0;
  margin: 0;
  max-width: none;
}

.op-dq__bar-time,
.op-dq__bar-ans {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.op-dq__bar-time {
  height: 64px;
}

.op-dq__bar-ans {
  height: 28px;
  margin-top: 10px;
}

.op-dq__bar-time i,
.op-dq__bar-ans i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.12s linear;
}

.op-dq__bar-time i {
  background: linear-gradient(90deg, var(--clock), #fff 140%);
  background-size: 200% 100%;
  animation: op-dq-shine 1.1s linear infinite;
}

.op-dq__bar-ans i {
  background: #38bdf8;
}

.op-dq__bar-time strong {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 48px;
  font-weight: 900;
}

.op-dq__count {
  margin: 10px 0 0;
  font-size: clamp(18px, 2vw, 28px);
  font-weight: 800;
}

.op-dq__count b {
  display: inline-block;
  margin: 0 6px;
  font-size: 1.35em;
  color: #7dd3fc;
}

.op-dq__count small {
  font-size: 0.62em;
  color: rgba(255, 248, 242, 0.7);
}

.op-dq__tally {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 36px 0 0;
  padding: 0;
  list-style: none;
}

.op-dq__tally li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 22px;
}

.op-dq__tally b {
  font-size: 16px;
  font-weight: 900;
}

.op-dq__emojis {
  position: relative;
  min-height: 92px;
  margin-top: 8px;
  overflow: hidden;
}

.op-dq__emojis > span {
  position: absolute;
  bottom: 46px;
  z-index: 2;
  font-size: 36px;
  animation-name: op-dq-emoji;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  pointer-events: none;
}

@keyframes op-dq-pop {
  0% { transform: scale(0.82); }
  55% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

@keyframes op-dq-emoji {
  0% { transform: translateY(18px) scale(0.4); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-8px) scale(1.05); opacity: 0; }
}

@keyframes op-dq-shine {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.25); }
  100% { filter: brightness(1); }
}

@keyframes op-dq-flash {
  0%, 100% { box-shadow: inset 0 0 0 0 rgba(255, 77, 109, 0); }
  50% { box-shadow: inset 0 0 80px 0 rgba(255, 77, 109, 0.28); }
}
</style>
