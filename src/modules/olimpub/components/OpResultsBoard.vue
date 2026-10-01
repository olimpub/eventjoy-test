<template>
  <div class="op-res" :class="{ 'is-played': played, 'is-ranked': ranked, 'is-finale': finale, 'is-game': face === 'game' }">
    <header>
      <p>{{ banner }}</p>
      <h1>Eredmény</h1>
      <div class="op-res__pick" role="tablist" aria-label="Eredmény mód">
        <button type="button" :class="{ 'is-on': !finale }" @click="showStanding">Állás</button>
        <button type="button" :class="{ 'is-on': finale }" @click="showFinale">Forduló vége</button>
      </div>
      <button type="button" class="op-res__cast" @click="emit('cast', finale ? 'finale' : 'standings')">
        Vetítés
      </button>
    </header>
    <p v-if="live && !shown.length" class="op-res__empty">Még nincs eredmény ezen a tabellán.</p>
    <TransitionGroup v-else :name="finale ? 'op-final' : 'op-rank'" tag="ol" class="op-res__list">
      <li
        v-for="row in shown"
        :key="row.name"
        :class="{
          'is-up': row.mostUp,
          'is-down': row.mostDown,
          'is-gold': showMedal && row.place === 1,
          'is-silver': showMedal && row.place === 2,
          'is-bronze': showMedal && row.place === 3,
        }"
        :style="{ '--team': row.color, '--ink': row.ink, '--from': `${row.fromPct}%`, '--to': `${row.toPct}%`, '--mark': `${row.fromPct}%` }"
      >
        <div class="op-res__top">
          <b :class="{ 'is-medal': showMedal && row.place <= 3 }">{{ row.place }}</b>
          <span>{{ row.name }}</span>
          <div class="op-res__score">
            <strong>{{ shownScore(played ? row.points : row.previous) }}</strong>
            <small v-if="played && row.previous > 0 && row.delta !== 0" :class="{ 'is-plus': row.delta > 0, 'is-minus': row.delta < 0 }">{{ deltaText(row.delta) }}</small>
            <q-icon
              v-if="row.mostUp"
              class="op-res__move is-up"
              name="sym_r_arrow_upward"
              size="28px"
              aria-label="Legtöbbet nőtt"
            />
            <q-icon
              v-else-if="row.mostDown"
              class="op-res__move is-down"
              name="sym_r_arrow_downward"
              size="28px"
              aria-label="Legtöbbet csökkent"
            />
          </div>
        </div>
        <div class="op-res__bar" aria-hidden="true">
          <i />
          <s />
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const emit = defineEmits<{
  cast: [mode: 'standings' | 'finale'];
}>();

const props = withDefaults(
  defineProps<{
    roundOver?: boolean;
    topic?: string;
    face?: 'quiz' | 'game';
    rows?: { name: string; points: number; previous?: number }[];
    precise?: boolean;
  }>(),
  { roundOver: false, topic: '', face: 'quiz', precise: false }
);

interface StandingRow {
  name: string;
  points: number;
  previous: number;
  delta: number;
  place: number;
  color: string;
  ink: string;
  fromPct: number;
  toPct: number;
  mostUp: boolean;
  mostDown: boolean;
}

const STORAGE_KEY = 'op-results-previous';

const TONES = [
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

const CURRENT = [
  { name: 'Sas', points: 30 },
  { name: 'Medve', points: 24 },
  { name: 'Farkas', points: 20 },
  { name: 'Róka', points: 16 },
  { name: 'Hiúz', points: 14 },
  { name: 'Bagoly', points: 10 },
  { name: 'Vidra', points: 8 },
  { name: 'Gólya', points: 4 },
  { name: 'Nincs csapat', points: 0 },
];

const PREVIOUS_SAMPLE: Record<string, number> = {
  Sas: 18,
  Medve: 28,
  Farkas: 26,
  Róka: 16,
  Hiúz: 14,
  Bagoly: 12,
  Vidra: 10,
  Gólya: 6,
  'Nincs csapat': 2,
};

const played = ref(false);
const ranked = ref(false);
const finale = ref(false);
const rows = ref<StandingRow[]>([]);
const revealed = ref<StandingRow[]>([]);
const shown = computed(() => (finale.value ? revealed.value : rows.value));
const showMedal = computed(() => finale.value || ranked.value);
const live = computed(() => props.rows != null);
const banner = computed(() => {
  const topic = props.topic.trim();
  const mode = props.face === 'game' ? 'Játék' : 'Kvíz';
  if (!live.value && !topic) return finale.value ? 'Forduló vége · minta' : 'Kivetítés · minta';
  if (!topic) return finale.value ? 'Forduló vége' : mode;
  return finale.value ? `${mode} · ${topic} · forduló vége` : `${mode} · ${topic}`;
});
let rankTimer: number | null = null;
let finaleTimer: number | null = null;
let builtCache: StandingRow[] = [];
let booted = false;
let lastSignature = '';

function toneFor(name: string) {
  const named = NAMED_TONE[name];
  if (named != null) return TONES[named] ?? TONES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length] ?? TONES[0];
}

function readSaved(): Record<string, number> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const saved: Record<string, number> = {};
    for (const [name, points] of Object.entries(parsed as Record<string, unknown>)) {
      const value = Number(points);
      if (name && Number.isFinite(value)) saved[name] = value;
    }
    return Object.keys(saved).length ? saved : null;
  } catch {
    return null;
  }
}

function saveStandings(list: { name: string; points: number }[]) {
  const payload: Record<string, number> = {};
  for (const row of list) payload[row.name] = row.points;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* a minta akkor is lejátszható, ha a tároló zárva van */
  }
}

function sameBoard(saved: Record<string, number>) {
  return CURRENT.every((row) => saved[row.name] === row.points);
}

function shownScore(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return props.precise ? '0.00' : '0';
  return props.precise ? n.toFixed(2) : String(n);
}

function deltaText(delta: number) {
  if (props.precise) {
    const n = Number(delta);
    if (!Number.isFinite(n)) return '0.00';
    const text = Math.abs(n).toFixed(2);
    if (n > 0) return `+${text}`;
    if (n < 0) return `-${text}`;
    return text;
  }
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

function byScore(list: StandingRow[], key: 'previous' | 'points') {
  return [...list].sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name, 'hu'));
}

function withPlaces(sorted: StandingRow[], key: 'previous' | 'points') {
  let place = 1;
  return sorted.map((row, index) => {
    if (index > 0 && row[key] < sorted[index - 1][key]) place = index + 1;
    return { ...row, place };
  });
}

function sourceRows() {
  if (props.rows != null) {
    return props.rows.map((row) => ({
      name: row.name,
      points: row.points,
      previous: row.previous,
    }));
  }
  return CURRENT.map((row) => ({ ...row, previous: undefined as number | undefined }));
}

function buildRows() {
  const current = sourceRows();
  const saved = props.rows != null ? null : readSaved();
  const previousSource =
    props.rows != null
      ? Object.fromEntries(
          current.map((row) => [row.name, row.previous != null ? row.previous : 0])
        )
      : !saved || sameBoard(saved)
        ? PREVIOUS_SAMPLE
        : saved;
  const scale = Math.max(
    1,
    ...current.flatMap((row) => [row.points, previousSource[row.name] ?? row.points])
  );
  const built = current.map((row) => {
    const previous = previousSource[row.name] ?? row.points;
    const tone = toneFor(row.name);
    return {
      name: row.name,
      points: row.points,
      previous,
      delta: row.points - previous,
      place: 0,
      color: tone.color,
      ink: tone.ink,
      fromPct: (previous / scale) * 100,
      toPct: (row.points / scale) * 100,
      mostUp: false,
      mostDown: false,
    };
  });
  const gains = [...built].filter((row) => row.delta > 0).sort((a, b) => b.delta - a.delta || b.points - a.points);
  const drops = [...built].filter((row) => row.delta < 0).sort((a, b) => a.delta - b.delta || a.points - b.points);
  if (gains[0]) gains[0].mostUp = true;
  if (drops[0]) drops[0].mostDown = true;
  return built;
}

function stopTimers() {
  if (rankTimer != null) window.clearTimeout(rankTimer);
  if (finaleTimer != null) window.clearTimeout(finaleTimer);
  rankTimer = null;
  finaleTimer = null;
}

function showStanding() {
  stopTimers();
  finale.value = false;
  revealed.value = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasPrior = builtCache.some((row) => row.previous > 0);
  if (reduce || !hasPrior) {
    rows.value = withPlaces(byScore(builtCache, 'points'), 'points');
    ranked.value = true;
    played.value = true;
    return;
  }
  rows.value = withPlaces(byScore(builtCache, 'previous'), 'previous');
  ranked.value = false;
  played.value = false;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      played.value = true;
    });
  });
  rankTimer = window.setTimeout(() => {
    rows.value = withPlaces(byScore(builtCache, 'points'), 'points');
    ranked.value = true;
  }, 1200);
}

function showFinale() {
  stopTimers();
  finale.value = true;
  played.value = true;
  ranked.value = true;
  const rankedRows = withPlaces(byScore(builtCache, 'points'), 'points');
  const queue = rankedRows.filter((row) => row.place <= 5).sort((a, b) => b.place - a.place);
  const rest = rankedRows.filter((row) => row.place > 5).sort((a, b) => a.place - b.place);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    revealed.value = [...rankedRows].sort((a, b) => a.place - b.place);
    return;
  }
  revealed.value = rest;
  let step = 0;
  const revealNext = () => {
    const next = queue[step];
    if (!next) return;
    revealed.value = [...revealed.value, next].sort((a, b) => a.place - b.place);
    step += 1;
    if (step < queue.length) finaleTimer = window.setTimeout(revealNext, 3000);
  };
  revealNext();
}

function applyQuiet() {
  const rankedRows = withPlaces(byScore(builtCache, 'points'), 'points');
  if (finale.value) {
    const byName = new Map(rankedRows.map((row) => [row.name, row]));
    revealed.value = revealed.value
      .map((row) => byName.get(row.name))
      .filter((row): row is StandingRow => Boolean(row));
    return;
  }
  rows.value = rankedRows;
  ranked.value = true;
  played.value = true;
}

function bootBoard() {
  builtCache = buildRows();
  if (props.rows == null) saveStandings(CURRENT);
  if (props.roundOver) showFinale();
  else showStanding();
}

watch(
  () => props.rows,
  (next) => {
    if (next == null) return;
    const signature = next.map((row) => `${row.name}:${row.points}`).join('|');
    if (booted && signature === lastSignature) return;
    lastSignature = signature;
    builtCache = buildRows();
    if (!booted) {
      booted = true;
      if (props.roundOver) showFinale();
      else showStanding();
      return;
    }
    applyQuiet();
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  if (props.rows != null) return;
  booted = true;
  bootBoard();
});

onUnmounted(() => {
  stopTimers();
});
</script>

<style scoped>
.op-res {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 72px 20px 20px;
  background:
    radial-gradient(circle at 10% 0%, rgba(56, 189, 248, 0.35), transparent 28%),
    radial-gradient(circle at 90% 20%, rgba(245, 185, 66, 0.28), transparent 26%),
    #14081c;
  color: #fff8f2;
}

.op-res header p {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-res.is-game header p {
  color: #67e8f9;
}

.op-res__empty {
  margin: 12px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: rgba(255, 248, 242, 0.72);
}

.op-res h1 {
  margin: 4px 0 12px;
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 900;
  line-height: 0.95;
}

.op-res__pick {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px;
  width: max-content;
  margin: 0 0 10px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.35);
}

.op-res__cast {
  min-height: 44px;
  margin: 0 0 14px;
  padding: 0 18px;
  border: 0;
  border-radius: 14px;
  background: #fff8f2;
  color: #1a0b24;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.op-res__pick button {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #fff8f2;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.op-res__pick button.is-on {
  background: #f5b942;
  color: #1a1408;
}

.op-res__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: auto;
}

.op-rank-move {
  transition: transform 0.9s cubic-bezier(0.22, 0.8, 0.2, 1);
}

.op-final-enter-from {
  opacity: 0;
  transform: translateX(80%);
}

.op-final-enter-active,
.op-final-move {
  transition:
    transform 0.8s cubic-bezier(0.22, 0.8, 0.2, 1),
    opacity 0.8s ease;
}

.op-res li {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 84px;
  padding: 8px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.op-res__top {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
}

.op-res__score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.op-res b {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: clamp(18px, 2.4vw, 28px);
  font-weight: 900;
  line-height: 1;
}

.op-res b.is-medal {
  opacity: 0;
}

.op-res.is-ranked b.is-medal {
  animation: op-medal 0.7s 0.95s both;
}

.op-res.is-ranked .is-gold b.is-medal {
  background: linear-gradient(145deg, #fff4c2, #f5b942 45%, #b45309);
  color: #2a1c04;
  box-shadow: 0 0 18px rgba(245, 185, 66, 0.85);
}

.op-res.is-ranked .is-silver b.is-medal {
  animation-delay: 1.15s;
  background: linear-gradient(145deg, #ffffff, #cbd5e1 50%, #64748b);
  color: #0f172a;
  box-shadow: 0 0 16px rgba(226, 232, 240, 0.7);
}

.op-res.is-ranked .is-bronze b.is-medal {
  animation-delay: 1.35s;
  background: linear-gradient(145deg, #fdba74, #ea580c 48%, #7c2d12);
  color: #2a1204;
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.75);
}

.op-res.is-finale.is-ranked .is-gold b.is-medal,
.op-res.is-finale.is-ranked .is-silver b.is-medal,
.op-res.is-finale.is-ranked .is-bronze b.is-medal {
  animation-delay: 0.2s;
}

.op-res span {
  overflow: hidden;
  font-size: clamp(16px, 2.2vw, 28px);
  font-weight: 900;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.op-res__move.is-up {
  color: #4ade80;
}

.op-res__move.is-down {
  color: #fb7185;
}

.op-res.is-played .op-res__move.is-up {
  animation: op-float 0.7s 0.25s 2 both;
}

.op-res.is-played .op-res__move.is-down {
  animation: op-drop 0.7s 0.25s 2 both;
}

.op-res strong {
  font-size: clamp(18px, 2.6vw, 36px);
  font-weight: 900;
}

.op-res small {
  min-width: 36px;
  font-size: 14px;
  font-weight: 900;
  text-align: right;
  color: rgba(255, 248, 242, 0.7);
}

.op-res small.is-plus { color: #4ade80; }
.op-res small.is-minus { color: #fb7185; }

.op-res__bar {
  position: relative;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.op-res__bar i {
  display: block;
  height: 100%;
  width: var(--from);
  border-radius: inherit;
  background: var(--team);
}

.op-res.is-played .op-res__bar i {
  width: var(--to);
  transition: width 1.05s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.op-res__bar s {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--mark);
  width: 3px;
  margin-left: -1px;
  background: rgba(255, 248, 242, 0.85);
  text-decoration: none;
}

@keyframes op-medal {
  0% { transform: translateY(-28px) scale(0.35) rotate(-18deg); opacity: 0; }
  65% { transform: translateY(3px) scale(1.12) rotate(8deg); opacity: 1; }
  100% { transform: none; opacity: 1; }
}

@keyframes op-float {
  0% { transform: translateY(12px); opacity: 0; }
  40% { transform: translateY(-8px); opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes op-drop {
  0% { transform: translateY(-12px); opacity: 0; }
  40% { transform: translateY(8px); opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .op-res b.is-medal { opacity: 1; }
  .op-rank-move,
  .op-res.is-played .op-res__bar i,
  .op-res.is-ranked b.is-medal,
  .op-res.is-played .op-res__move {
    animation: none;
    transition: none;
  }
}
</style>
