<template>
  <div class="op-scope op-wall">
    <div v-if="!command" class="op-wall__idle">
      <div class="op-glow" aria-hidden="true" />
      <div class="op-watermark" aria-hidden="true">
        <img :src="brand.iconTransparent" alt="" />
      </div>
      <div class="relative z-10 text-center px-6">
        <img :src="brand.logoDark" alt="Olimpub" class="h-20 mx-auto mb-6 object-contain" />
        <p class="text-lg m-0" style="color: var(--op-muted)">Kivetítő — várakozás a kvízmesterre</p>
      </div>
    </div>

    <OpJoinSplash
      v-else-if="command.face === 'join'"
      :key="`join-${command.nonce}`"
      :event-name="command.title"
      :join-url="command.prompt"
    />

    <OpWaitingRoom
      v-else-if="command.face === 'lobby'"
      :key="`lobby-${command.nonce}`"
      :topic="command.title"
      :face="command.kind"
      :teams="lobbyTeams"
    />

    <OpDisplayQuestion
      v-else-if="command.face === 'question'"
      :key="`${command.title}-${command.sortLabel}-${command.prompt}`"
      :prompt="command.prompt"
      :sort-label="command.sortLabel"
      :topic="command.title"
      :face="command.kind"
      :time-sec="command.timeSec || (command.kind === 'game' ? 10 : 20)"
      :type="command.type || 'single'"
      :answers="command.answers"
      :matches="command.matches"
      :categories="command.categories"
      :media-url="command.mediaUrl || null"
      :clock-phase="command.clockPhase"
      :clock-total-ms="command.clockTotalMs"
      :clock-left-ms="command.clockLeftMs"
      :clock-ends-at="command.clockEndsAt"
      :clock-hold="command.clockHold"
      :answer-count="command.answerCount"
      :roster-count="command.rosterCount"
      :react-glyph="command.reactGlyph"
      :react-at="command.reactAt"
      :show-correct="command.showCorrect"
      :corrects="command.corrects"
      :correct-text="command.correctText"
      :tip-name="command.tipName"
      :tip-team="command.tipTeam"
    />

    <section v-else class="op-wall__sheet" :class="command.kind === 'game' ? 'is-game' : 'is-quiz'">
      <p v-if="command.sample" class="op-wall__sample">minta</p>
      <p class="op-wall__kicker">{{ kicker }}</p>

      <div v-if="command.face === 'draw'" class="op-wall__lottery" :class="drawLive ? 'is-spin' : 'is-landed'">
        <div class="op-wall__reel">
          <strong :key="drawnTitle">{{ drawnTitle }}</strong>
        </div>
        <p v-if="drawnTitle && !drawLive && command.topics.length" class="op-wall__landed">Ez a kör jön</p>
        <ul v-if="command.topics.length" class="op-wall__chips">
          <li
            v-for="row in command.topics"
            :key="row.id"
            :class="{ 'is-on': !drawLive && row.title === drawnTitle }"
          >
            {{ row.title }}
          </li>
        </ul>
      </div>

      <ul
        v-else-if="command.face === 'topics'"
        class="op-wall__tiles"
        :style="{ '--cols': String(topicCols) }"
      >
        <li v-for="(row, index) in command.topics" :key="row.id" :style="{ '--i': index }">
          <b>{{ index + 1 }}</b>
          <span>{{ row.title }}</span>
        </li>
        <li v-if="!command.topics.length" class="is-empty">Nincs nyitott kör.</li>
      </ul>

      <TransitionGroup
        v-else-if="command.revealMode === 'auto'"
        name="op-rank"
        tag="ol"
        class="op-wall__crawl"
      >
        <li
          v-for="row in standingRows"
          :key="row.name"
          :class="{
            'is-up': standingPlayed && row.previous > 0 && row.delta > 0,
            'is-down': standingPlayed && row.previous > 0 && row.delta < 0,
          }"
        >
          <b>{{ row.place }}</b>
          <span>
            {{ row.name }}
            <small v-if="row.team">{{ row.team }}</small>
          </span>
          <strong>{{ formatWallScore(standingPlayed ? row.points : row.previous) }}</strong>
          <i
            v-if="standingPlayed && row.previous > 0 && row.delta !== 0"
            class="op-wall__delta"
            :class="{ 'is-up': row.delta > 0, 'is-down': row.delta < 0 }"
          >
            {{ formatWallDelta(row.delta) }}
          </i>
        </li>
      </TransitionGroup>

      <TransitionGroup
        v-else-if="command.revealMode === 'finale'"
        name="op-rise"
        tag="ol"
        class="op-wall__crawl"
      >
        <li
          v-for="row in finaleRows"
          :key="row.rank"
          :class="{
            'is-gold': row.rank === 1,
            'is-silver': row.rank === 2,
            'is-bronze': row.rank === 3,
          }"
        >
          <b>{{ row.rank }}</b>
          <span>
            {{ row.name }}
            <small v-if="row.team">{{ row.team }}</small>
          </span>
          <strong>{{ formatWallScore(row.points) }}</strong>
        </li>
      </TransitionGroup>

      <div
        v-else-if="command.revealMode === 'ceremony' || command.podiumStep >= 0"
        class="op-wall__finale"
        :class="{ 'is-hero': !!ceremonyHero }"
      >
        <p v-if="command.revealCount === 0 && command.podiumStep <= 0" class="op-wall__cue">A helyezések jönnek</p>
        <Transition v-else-if="ceremonyHero" name="op-hero" mode="out-in">
          <article :key="ceremonyHero.rank" class="op-wall__hero">
            <p class="op-wall__hero-kicker">{{ ceremonyHero.rank }}. hely</p>
            <h2>{{ ceremonyHero.name }}</h2>
            <p v-if="ceremonyHero.team" class="op-wall__hero-team">{{ ceremonyHero.team }}</p>
            <strong>{{ formatWallScore(ceremonyHero.points) }}</strong>
          </article>
        </Transition>
        <template v-else>
          <TransitionGroup name="op-rise" tag="ol" class="op-wall__tail">
            <li v-for="row in ceremonyTail" :key="row.rank">
              <b>{{ row.rank }}</b>
              <span>
                {{ row.name }}
                <small v-if="row.team">{{ row.team }}</small>
              </span>
              <strong>{{ formatWallScore(row.points) }}</strong>
            </li>
          </TransitionGroup>
          <div class="op-wall__podium" :class="{ 'is-with-tail': ceremonyTail.length > 0 }">
            <article
              v-for="place in podiumOrder"
              :key="place"
              class="op-wall__stand"
              :class="[`is-${place}`, { 'is-in': podiumVisible(place) }]"
            >
              <div v-if="podiumVisible(place) && podiumRow(place)" class="op-wall__card">
                <b>{{ place }}</b>
                <span>
                  {{ podiumRow(place)?.name }}
                  <small v-if="podiumRow(place)?.team">{{ podiumRow(place)?.team }}</small>
                </span>
                <strong>{{ formatWallScore(podiumRow(place)?.points) }}</strong>
              </div>
            </article>
          </div>
        </template>
      </div>

      <ol v-else class="op-wall__scores">
        <li v-for="(row, index) in command.rows" :key="`${row.name}-${index}`">
          <b>{{ index + 1 }}</b>
          <span>
            {{ row.name }}
            <small v-if="row.team">{{ row.team }}</small>
          </span>
          <strong>{{ formatWallScore(row.points) }}</strong>
          <i
            v-if="wallGain(row.points, row.previousPoints) > 0"
            class="op-wall__delta is-up"
          >
            {{ formatWallDelta(wallGain(row.points, row.previousPoints)) }}
          </i>
        </li>
        <li v-if="!command.rows.length" class="is-empty">Nincs megjeleníthető eredmény.</li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import { disconnectEventLive, isEventLiveJoinRoute } from 'src/services/signalrService';
import { useOlimpubStore } from 'src/stores/olimpub';
import OpDisplayQuestion from '../components/OpDisplayQuestion.vue';
import OpJoinSplash from '../components/OpJoinSplash.vue';
import OpWaitingRoom from '../components/OpWaitingRoom.vue';
import { opReactGlyph } from '../constants';
import { fetchOpLeaderboard } from '../opApi';
import { commandFromCast, displayScoreScope, onOpDisplay, readOpDisplay, type OpDisplayCommand } from '../opDisplayChannel';
import '../theme.css';

const brand = OLIMPUB_BRAND;
const podiumOrder = [2, 1, 3] as const;

function formatWallScore(value: number | null | undefined) {
  const n = Number(value);
  const decimals = command.value?.scoreDecimals === 2 ? 2 : 0;
  if (!Number.isFinite(n)) return decimals ? '0.00' : '0';
  return decimals ? n.toFixed(2) : String(Math.round(n));
}

function formatWallDelta(value: number) {
  const n = Number(value);
  const decimals = command.value?.scoreDecimals === 2 ? 2 : 0;
  if (!Number.isFinite(n) || n <= 0) return decimals ? '0.00' : '0';
  const abs = decimals ? n.toFixed(2) : String(Math.round(n));
  return `+${abs}`;
}

function wallGain(points: number, previousPoints: number | null | undefined) {
  const current = Number(points) || 0;
  const previous = Number(previousPoints);
  const prior = Number.isFinite(previous) ? previous : 0;
  const baseline = prior > current ? 0 : prior;
  return current - baseline;
}
const route = useRoute();
const router = useRouter();
const store = useOlimpubStore();
const command = ref<OpDisplayCommand | null>(null);
const drawnTitle = ref('');
const drawLive = ref(false);
const revealShown = ref(0);
const standingPlayed = ref(false);
const standingRanked = ref(false);
let drawTimer = 0;
let revealTimer = 0;
let standingTimer = 0;
let stopListen = () => {};

const eventId = computed(() => {
  const id = Number(route.params.id);
  return Number.isFinite(id) ? id : 0;
});

const lobbyTeams = computed(() => {
  const current = command.value;
  if (!current || current.face !== 'lobby') return undefined;
  if (current.sample && !current.teams.length) return undefined;
  return current.teams.map((team) => ({
    name: team.name,
    imageUrl: team.imageUrl,
    people: team.members.map((member) => ({
      name: String(member.nickname || '').trim() || 'Játékos',
      online: true,
    })),
  }));
});

const kicker = computed(() => {
  const current = command.value;
  if (!current) return '';
  if (current.face === 'topics') {
    return `${current.kind === 'game' ? 'Játék' : 'Kvíz'} · még nem kezdett körök`;
  }
  if (current.face === 'draw') return 'Sorsolás';
  return current.title;
});

const topicCols = computed(() => {
  const n = command.value?.topics.length || 0;
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  return 3;
});

function podiumRow(place: number) {
  return command.value?.rows[place - 1];
}

function podiumVisible(place: number) {
  const step = command.value?.podiumStep ?? -1;
  if (place === 3) return step >= 1;
  if (place === 2) return step >= 2;
  return step >= 3;
}

const ceremonyLong = computed(() => (command.value?.rows.length || 0) > 6);

const ceremonyHero = computed(() => {
  const current = command.value;
  if (!current || current.revealMode !== 'ceremony' || !ceremonyLong.value) return null;
  if (current.podiumStep > 0 || current.revealCount <= 0) return null;
  const rank = current.rows.length - current.revealCount + 1;
  const row = current.rows[rank - 1];
  if (!row) return null;
  return { rank, name: row.name, team: row.team, points: row.points };
});

function revealedSlice(rows: OpDisplayCommand['rows'], count: number, tailOnly: boolean) {
  const revealed: { name: string; team: string; points: number; rank: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    const place = rows.length - 1 - index;
    if (place < 0) break;
    if (tailOnly && place < 3) break;
    const row = rows[place];
    if (!row) continue;
    revealed.push({ name: row.name, team: row.team, points: row.points, rank: place + 1 });
  }
  return revealed.sort((a, b) => a.rank - b.rank);
}

function placeBy(list: { previous: number; points: number; name: string }[], key: 'previous' | 'points') {
  const sorted = [...list].sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name, 'hu'));
  let place = 1;
  return sorted.map((row, index) => {
    if (index > 0 && row[key] < sorted[index - 1][key]) place = index + 1;
    return { ...row, place };
  });
}

const standingRows = computed(() => {
  const current = command.value;
  if (!current || current.revealMode !== 'auto') return [];
  const list = current.rows.map((row) => {
    const previous = Number(row.previousPoints);
    const prior = Number.isFinite(previous) ? previous : 0;
    const points = Number(row.points) || 0;
    const baseline = prior > points ? 0 : prior;
    return {
      name: row.name,
      team: row.team,
      points,
      previous: baseline,
      delta: points - baseline,
    };
  });
  return placeBy(list, standingRanked.value ? 'points' : 'previous');
});

const finaleRows = computed(() => {
  const current = command.value;
  if (!current || current.revealMode !== 'finale') return [];
  const ranked = current.rows.map((row, index) => ({
    name: row.name,
    team: row.team,
    points: row.points,
    rank: index + 1,
  }));
  const rest = ranked.filter((row) => row.rank > 5);
  const top = ranked.filter((row) => row.rank <= 5).sort((a, b) => b.rank - a.rank);
  return [...rest, ...top.slice(0, revealShown.value)].sort((a, b) => a.rank - b.rank);
});

const ceremonyTail = computed(() => {
  const current = command.value;
  if (!current || current.revealMode !== 'ceremony' || ceremonyLong.value) return [];
  return revealedSlice(current.rows, current.revealCount, true);
});

function stopReveal() {
  window.clearTimeout(revealTimer);
  revealTimer = 0;
}

function stopStanding() {
  window.clearTimeout(standingTimer);
  standingTimer = 0;
}

function syncStanding() {
  stopStanding();
  standingPlayed.value = false;
  standingRanked.value = false;
  const current = command.value;
  if (!current || current.face !== 'results' || current.revealMode !== 'auto') return;
  const startedAt = current.revealStartedAt;
  const hasPrior = current.rows.some((row) => {
    const previous = Number(row.previousPoints);
    const points = Number(row.points) || 0;
    const prior = Number.isFinite(previous) ? previous : 0;
    return prior > 0 && prior <= points;
  });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !hasPrior) {
    standingPlayed.value = true;
    standingRanked.value = true;
    return;
  }
  standingTimer = window.setTimeout(() => {
    if (command.value?.revealStartedAt !== startedAt) return;
    standingPlayed.value = true;
    standingTimer = window.setTimeout(() => {
      if (command.value?.revealStartedAt !== startedAt) return;
      standingRanked.value = true;
    }, 1400);
  }, 900);
}

function syncReveal() {
  stopReveal();
  const current = command.value;
  if (!current || current.face !== 'results' || current.revealMode !== 'finale') {
    revealShown.value = 0;
    return;
  }
  revealShown.value = 0;
  const startedAt = current.revealStartedAt;
  const every = current.revealEveryMs > 0 ? current.revealEveryMs : 3000;
  const total = Math.min(5, current.rows.length);
  const step = () => {
    if (command.value?.revealStartedAt !== startedAt) return;
    const elapsed = Date.now() - startedAt;
    const count = Math.min(total, 1 + Math.floor(Math.max(0, elapsed) / every));
    revealShown.value = count;
    if (count < total) revealTimer = window.setTimeout(step, Math.max(40, every - (elapsed % every)));
  };
  revealTimer = window.setTimeout(step, 40);
}

function apply(next: OpDisplayCommand | null) {
  command.value = next;
  syncReveal();
  syncStanding();
}

function mapBoardRows(rows: { name: string; teamName?: string; points: number; previousPoints: number }[]) {
  return rows.map((row) => ({
    name: row.name,
    team: row.teamName || '',
    points: row.points,
    previousPoints: row.previousPoints,
  }));
}

async function scopedResultRows(next: OpDisplayCommand) {
  if (!eventId.value) return null;
  const scope = displayScoreScope(next);
  if (scope === 'game' || next.extraGameId) {
    const extraGameId = next.extraGameId || undefined;
    if (!extraGameId) return null;
    const rows = await fetchOpLeaderboard(eventId.value, 'games', { extraGameId });
    return mapBoardRows(rows);
  }
  if (scope === 'round' || next.roundId) {
    if (next.roundId == null) return null;
    const rows = await fetchOpLeaderboard(eventId.value, 'quiz', { roundId: next.roundId });
    return mapBoardRows(rows);
  }
  return null;
}

async function applyCast(raw: unknown) {
  const next = commandFromCast(raw);
  if (!next) return;
  if (next.face !== 'results') {
    apply(next);
    return;
  }
  const current = command.value;
  if (
    next.face === 'results' &&
    current?.face === 'results' &&
    next.nonce > 0 &&
    next.nonce === current.nonce &&
    current.rows.length
  ) {
    return;
  }
  try {
    const scoped = await scopedResultRows(next);
    if (scoped) next.rows = scoped;
    else if (!next.rows.length && eventId.value) {
      const board =
        next.board === 'games' || next.kind === 'game'
          ? 'games'
          : next.board === 'shadow'
            ? 'shadow'
            : next.board === 'main'
              ? 'main'
              : 'quiz';
      const rows = await fetchOpLeaderboard(eventId.value, board);
      next.rows = mapBoardRows(rows);
    }
  } catch {
    /* a helyi Cast sorai maradnak */
  }
  apply(next);
}

function applyPingCast() {
  if (store.lastPingEventId !== eventId.value) return;
  const action = store.lastPingAction;
  const raw = store.lastPingCast;
  if (action === 'Op.ShowLeaderboard') {
    const body = raw || {};
    const extra = String(body.ExtraGameId ?? body.extraGameId ?? '').trim();
    const round = Number(body.RoundID ?? body.roundId ?? body.RoundId);
    const current = command.value;
    if (
      !extra &&
      !(Number.isFinite(round) && round > 0) &&
      current?.face === 'results' &&
      (current.extraGameId || current.roundId)
    ) {
      return;
    }
    void applyCast({ ...body, Face: 'results', face: 'results' });
    return;
  }
  if (action !== 'Op.CastDisplay') return;
  const next = commandFromCast(raw);
  const current = command.value;
  if (next?.face === 'question' && !next.prompt) {
    if (current?.face === 'question') {
      command.value = {
        ...current,
        clockPhase: next.clockPhase || current.clockPhase,
        clockHold: next.clockHold,
        clockLeftMs: next.clockLeftMs || current.clockLeftMs,
        clockEndsAt: next.clockHold ? 0 : current.clockEndsAt,
        tipName: next.tipName || current.tipName,
        tipTeam: next.tipTeam || current.tipTeam,
      };
    }
    return;
  }
  void applyCast(raw);
}

function stopDraw() {
  window.clearTimeout(drawTimer);
  drawTimer = 0;
}

function spinDraw() {
  stopDraw();
  const current = command.value;
  if (!current || current.face !== 'draw') {
    drawLive.value = false;
    return;
  }
  const topics = current.topics;
  if (!topics.length) {
    drawnTitle.value = 'Nincs nyitott kör.';
    drawLive.value = false;
    return;
  }
  const winner = topics[Math.floor(Math.random() * topics.length)]?.title || '';
  let step = 0;
  const total = 16 + topics.length;
  drawLive.value = true;
  const tick = () => {
    step += 1;
    if (step >= total) {
      drawnTitle.value = winner;
      drawLive.value = false;
      return;
    }
    drawnTitle.value = topics[step % topics.length]?.title || winner;
    drawTimer = window.setTimeout(tick, 50 + step * 16);
  };
  drawnTitle.value = topics[0]?.title || '';
  drawTimer = window.setTimeout(tick, 50);
}

watch(
  () => [command.value?.face, command.value?.nonce] as const,
  () => spinDraw()
);

watch(
  () => store.pingAt,
  () => {
    const current = command.value;
    if (store.lastPingEventId !== eventId.value) return;
    if (store.lastPingAction === 'Op.CastDisplay' || store.lastPingAction === 'Op.ShowLeaderboard') {
      applyPingCast();
      return;
    }
    if (!current || current.face !== 'question') return;
    if (store.lastPingAction === 'Op.SubmitAnswer') {
      command.value = {
        ...current,
        answerCount: Math.max(
          current.answerCount ?? 0,
          store.lastPingAnswerCount ?? 0,
          store.getGame(eventId.value).live.AnswerCount || 0
        ),
        rosterCount: Math.max(current.rosterCount ?? 0, store.lastPingRosterCount ?? 0),
      };
      return;
    }
    if (store.lastPingAction === 'Op.React') {
      const glyph = opReactGlyph(store.lastPingGlyph) || store.lastPingGlyph;
      if (!glyph) return;
      command.value = {
        ...current,
        reactGlyph: glyph,
        reactAt: Date.now(),
      };
    }
  }
);

onMounted(() => {
  apply(readOpDisplay(eventId.value));
  stopListen = onOpDisplay((id, next) => {
    if (id !== eventId.value) return;
    apply(next);
  });
  void store.loadGame(eventId.value).then(() => {
    if (command.value?.face === 'results' && command.value.rows.length) return;
    const cast = store.getGame(eventId.value).displayCast;
    if (cast) void applyCast(cast);
  });
});

onUnmounted(() => {
  stopDraw();
  stopReveal();
  stopStanding();
  stopListen();
  if (!isEventLiveJoinRoute(router.currentRoute.value.name)) {
    disconnectEventLive();
  }
});
</script>

<style scoped>
.op-wall {
  min-height: 100vh;
  padding: 0;
  background: #120814;
  color: #fff8f2;
}

.op-wall__idle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
}

.op-wall__sheet {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 48px 40px;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 77, 109, 0.45), transparent 36%),
    radial-gradient(circle at 100% 8%, rgba(56, 189, 248, 0.35), transparent 32%),
    #1a0b24;
}

.op-wall__sheet.is-game {
  background:
    radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.45), transparent 36%),
    radial-gradient(circle at 100% 8%, rgba(99, 102, 241, 0.4), transparent 32%),
    #06141c;
}

.op-wall__sample {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.op-wall__kicker {
  margin: 0 0 24px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-wall__lottery {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.op-wall__reel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(920px, 100%);
  min-height: 28vh;
  padding: 28px;
  border-radius: 36px;
  border: 4px solid rgba(245, 185, 66, 0.75);
  background: rgba(0, 0, 0, 0.32);
  box-shadow: 0 0 0 12px rgba(245, 185, 66, 0.12), 0 22px 0 rgba(0, 0, 0, 0.28);
}

.op-wall__reel strong {
  font-size: clamp(48px, 8vw, 112px);
  line-height: 0.95;
  font-weight: 900;
  text-align: center;
}

.op-wall__lottery.is-spin .op-wall__reel strong {
  animation: op-flick 0.12s linear infinite;
}

.op-wall__lottery.is-landed .op-wall__reel {
  animation: op-land 0.45s both;
}

.op-wall__landed {
  margin: 0;
  padding: 8px 18px;
  border-radius: 999px;
  background: #f5b942;
  color: #2a1c04;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.op-wall__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.op-wall__chips li {
  max-width: min(100%, 280px);
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 248, 242, 0.08);
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  overflow-wrap: break-word;
  line-height: 1.2;
}

.op-wall__chips li.is-on {
  background: #fff8f2;
  color: #1a0b24;
}

.op-wall__tiles {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
  gap: 18px;
  align-content: start;
}

.op-wall__tiles li {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
  min-height: 128px;
  padding: 18px 20px;
  border-radius: 28px;
  border: 3px solid rgba(255, 248, 242, 0.16);
  background: rgba(255, 248, 242, 0.08);
  box-shadow: 0 14px 0 rgba(0, 0, 0, 0.28);
  font-weight: 900;
  animation: op-pop 0.55s both;
  animation-delay: calc(var(--i) * 70ms);
}

.op-wall__tiles span {
  min-width: 0;
  flex: 1;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.15;
  font-size: clamp(22px, 2.1vw, 34px);
}

.op-wall__tiles b {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  border-radius: 16px;
  background: #ff4d6d;
  color: #2a0610;
  font-size: 24px;
}

.op-wall__sheet.is-game .op-wall__tiles b {
  background: #22d3ee;
  color: #042433;
}

.op-wall__tiles li.is-empty {
  color: #94a3b8;
  font-size: 28px;
  box-shadow: none;
  animation: none;
}

@keyframes op-pop {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes op-flick {
  50% {
    opacity: 0.35;
    transform: translateY(-6px);
  }
}

@keyframes op-land {
  from {
    transform: scale(0.86);
  }
  to {
    transform: scale(1);
  }
}

.op-wall__podium {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
  min-height: 68vh;
  margin-top: 12px;
  overflow: hidden;
}

.op-wall__finale {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
  min-height: 78vh;
  overflow: hidden;
}

.op-wall__finale.is-hero {
  justify-content: center;
  align-items: center;
}

.op-wall__hero {
  width: min(100%, 52rem);
  padding: clamp(28px, 5vh, 56px) clamp(24px, 4vw, 56px);
  border-radius: 28px;
  border: 1px solid rgba(245, 185, 66, 0.28);
  background: rgba(255, 248, 242, 0.08);
  text-align: center;
}

.op-wall__hero-kicker {
  margin: 0 0 12px;
  font-size: clamp(18px, 2.4vw, 28px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-wall__hero h2 {
  margin: 0;
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 900;
  line-height: 0.95;
}

.op-wall__hero-team {
  margin: 8px 0 0;
  font-size: clamp(18px, 2.4vw, 28px);
  font-weight: 700;
  color: #7dd3fc;
}

.op-wall__hero strong {
  display: block;
  margin-top: 18px;
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 900;
  color: #f5b942;
}

.op-hero-enter-active {
  transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}

.op-hero-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.op-hero-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(28px);
}

.op-hero-leave-to {
  opacity: 0;
  transform: scale(1.04) translateY(-16px);
}

.op-wall__podium.is-with-tail {
  min-height: 42vh;
  margin-top: 0;
}

.op-wall__crawl,
.op-wall__tail {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.op-wall__crawl {
  justify-content: flex-start;
  min-height: 0;
  max-height: calc(100vh - 140px);
  margin-top: 0;
  overflow: auto;
}

.op-wall__crawl li,
.op-wall__tail li {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 72px;
  padding: 0 22px;
  border-radius: 20px;
  background: rgba(255, 248, 242, 0.1);
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 900;
}

.op-wall__tail li {
  min-height: 58px;
  font-size: clamp(18px, 2.2vw, 30px);
}

.op-wall__crawl b,
.op-wall__tail b {
  width: 48px;
  color: #f5b942;
}

.op-wall__crawl li.is-gold b {
  color: #f5b942;
}

.op-wall__crawl li.is-silver b {
  color: #e2e8f0;
}

.op-wall__crawl li.is-bronze b {
  color: #fb923c;
}

.op-wall__crawl span,
.op-wall__tail span {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.op-wall__crawl small,
.op-wall__tail small {
  font-size: 16px;
  font-weight: 700;
  color: #7dd3fc;
}

.op-rise-enter-from {
  opacity: 0;
  transform: translateY(120%);
}

.op-rise-enter-active,
.op-rise-move,
.op-rank-move {
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease;
}

.op-wall__crawl li.is-up {
  background: rgba(74, 222, 128, 0.16);
}

.op-wall__crawl li.is-down {
  background: rgba(251, 113, 133, 0.16);
}

.op-wall__crawl .op-wall__delta {
  min-width: 5ch;
  margin-left: 8px;
  font-size: clamp(22px, 2.8vw, 36px);
}

.op-wall__podium.is-with-tail .op-wall__stand.is-1 {
  min-height: 38vh;
}

.op-wall__podium.is-with-tail .op-wall__stand.is-2 {
  min-height: 28vh;
}

.op-wall__podium.is-with-tail .op-wall__stand.is-3 {
  min-height: 20vh;
}

.op-wall__cue {
  position: absolute;
  left: 0;
  right: 0;
  top: 12%;
  margin: 0;
  text-align: center;
  font-size: clamp(28px, 4vw, 56px);
  font-weight: 900;
}

.op-wall__stand {
  width: min(280px, 30vw);
  transform: translateY(120%);
  opacity: 0;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease;
}

.op-wall__stand.is-in {
  transform: none;
  opacity: 1;
}

.op-wall__stand.is-1 {
  min-height: 56vh;
}

.op-wall__stand.is-2 {
  min-height: 42vh;
}

.op-wall__stand.is-3 {
  min-height: 30vh;
}

.op-wall__card {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  min-height: inherit;
  padding: 22px 18px 16px;
  border-radius: 28px 28px 12px 12px;
  background: rgba(255, 248, 242, 0.1);
  box-shadow: 0 18px 0 rgba(0, 0, 0, 0.28);
}

.op-wall__stand.is-1 .op-wall__card {
  background: linear-gradient(180deg, rgba(245, 185, 66, 0.95), rgba(180, 110, 20, 0.9));
  color: #2a1c04;
}

.op-wall__stand.is-2 .op-wall__card {
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.95), rgba(148, 163, 184, 0.9));
  color: #1e293b;
}

.op-wall__stand.is-3 .op-wall__card {
  background: linear-gradient(180deg, rgba(251, 146, 60, 0.95), rgba(180, 83, 9, 0.9));
  color: #2a1204;
}

.op-wall__card b {
  font-size: clamp(42px, 6vw, 84px);
  line-height: 0.9;
  font-weight: 900;
}

.op-wall__card span {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 900;
}

.op-wall__card small {
  font-size: 16px;
  font-weight: 700;
}

.op-wall__card strong {
  margin-top: auto;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 900;
}

.op-wall__scores {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.op-wall__scores li {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 84px;
  padding: 0 28px;
  border-radius: 22px;
  background: rgba(255, 248, 242, 0.08);
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 900;
}

.op-wall__scores li.is-empty {
  color: #94a3b8;
  font-size: 28px;
}

.op-wall__scores b {
  width: 48px;
  color: #f5b942;
}

.op-wall__scores span {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.op-wall__scores small {
  font-size: 16px;
  font-weight: 700;
  color: #7dd3fc;
}

.op-wall__scores strong {
  font-size: clamp(28px, 4vw, 48px);
}

.op-wall__delta {
  min-width: 4ch;
  font-size: clamp(18px, 2.2vw, 28px);
  font-style: normal;
  font-weight: 800;
  color: #94a3b8;
}

.op-wall__delta.is-up {
  color: #4ade80;
}

.op-wall__delta.is-down {
  color: #fb7185;
}
</style>
