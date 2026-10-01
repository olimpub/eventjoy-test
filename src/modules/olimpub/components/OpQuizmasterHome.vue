<template>
  <div class="op-qh-shell">
  <OpQuizmasterStage
    v-if="openItem"
    :key="openItem.id"
    :prompt="promptFor(openItem)"
    :correct="stageCorrect"
    :time-sec="stageTimeSec(openItem)"
    :sort-label="sortFor(openItem)"
    :topic="openItem.title"
    :media-url="stageImageUrl"
    :audio-url="stageAudioUrl"
    :has-audio="stageHasAudio"
    :event-id="eventId"
    :initial-face="openItem.kind"
    :resume-label="resumeFor(openItem)"
    :ender="openItem.total == null"
    :show-back="true"
    :event-question-id="liveQuestionId"
    :round-id="openItem.roundId ?? null"
    :question-index="openItem.index"
    :question-total="openItem.total"
    :extra-game-id="openItem.extraGameId || ''"
    :extra-question-id="liveExtraQuestionId"
    :extra-run-id="liveExtraRunId"
    :result-rows="roundScoreRows"
    :result-loading="roundLoading"
    :result-precise="true"
    @back="openItem = null"
    @begin="onBegin(openItem)"
    @advance="onAdvance(openItem)"
    @finish="onFinish(openItem)"
    @results="onResults(openItem)"
    @cast-results="onCastResults"
    @reveal-answer="onRevealAnswer(openItem)"
    @clock="onClock(openItem, $event)"
    @close="emit('close')"
  />
  <div v-else class="op-qh" :class="area === 'game' ? 'is-game' : 'is-quiz'">
    <header class="op-qh__top">
      <button v-if="area" type="button" class="op-qh__icon" aria-label="Vissza" @click="back">
        <q-icon name="sym_r_arrow_back" size="22px" />
      </button>
      <b>{{ heading }}</b>
      <button type="button" class="op-qh__icon" aria-label="Bezárás" @click="emit('close')">
        <q-icon name="close" size="22px" />
      </button>
    </header>

    <template v-if="!area">
      <div class="op-qh__menu">
        <button type="button" class="op-qh__launch is-join" @click="projectJoin">
          <span class="op-qh__launch-icon" aria-hidden="true">
            <q-icon name="sym_r_qr_code_2" size="32px" />
          </span>
          <span class="op-qh__launch-copy">
            <strong>Belépés</strong>
            <small>Logó, QR, csatlakozás</small>
          </span>
          <q-icon name="sym_r_cast" size="22px" class="op-qh__launch-go" aria-hidden="true" />
        </button>
        <button type="button" class="op-qh__launch is-game" @click="area = 'game'">
          <span class="op-qh__launch-icon" aria-hidden="true">
            <q-icon name="sym_r_sports_esports" size="32px" />
          </span>
          <span class="op-qh__launch-copy">
            <strong>Játék</strong>
            <small>Párbaj, karaoke, extra körök</small>
          </span>
          <q-icon name="sym_r_chevron_right" size="22px" class="op-qh__launch-go" aria-hidden="true" />
        </button>
        <button type="button" class="op-qh__launch is-quiz" @click="area = 'quiz'">
          <span class="op-qh__launch-icon" aria-hidden="true">
            <q-icon name="sym_r_quiz" size="32px" />
          </span>
          <span class="op-qh__launch-copy">
            <strong>Kvíz</strong>
            <small>Fordulók, kérdések, sorsolás</small>
          </span>
          <q-icon name="sym_r_chevron_right" size="22px" class="op-qh__launch-go" aria-hidden="true" />
        </button>
        <button type="button" class="op-qh__launch is-wall" @click="area = 'results'">
          <span class="op-qh__launch-icon" aria-hidden="true">
            <q-icon name="sym_r_emoji_events" size="32px" />
          </span>
          <span class="op-qh__launch-copy">
            <strong>Eredmények</strong>
            <small>Állás és ceremónia</small>
          </span>
          <q-icon name="sym_r_chevron_right" size="22px" class="op-qh__launch-go" aria-hidden="true" />
        </button>
      </div>
      <p v-if="castNote" class="op-qh__ack">{{ castNote }}</p>
    </template>

    <section v-else-if="area === 'quiz' || area === 'game'" class="op-qh__panel">
      <div class="op-qh__cast">
        <button type="button" class="is-cast" :class="{ 'is-sent': sent === 'topics' }" @click="projectTopics">
          {{ sent === 'topics' ? 'Kiküldve' : 'Vetítés' }}
        </button>
        <button type="button" :class="{ 'is-sent': sent === 'draw' }" @click="projectDraw">
          {{ sent === 'draw' ? 'Elindult' : 'Sorsolás' }}
        </button>
      </div>
      <p v-if="castNote" class="op-qh__ack">{{ castNote }}</p>
      <p v-if="loadError" class="op-qh__ack">{{ loadError }}</p>
      <p class="op-qh__hint">
        A Vetítés a látható, még el nem kezdett köröket küldi a kijelzőre. A Sorsolás egyet kisorsol, és újra megnyomható.
        Lezárás a kvízen F-et számol, a játékon ExtraScore-t ír. Lezárt körön a Vetítés azt az állást küldi. Reset törli a progress-t. Látható csak a nyitott körök listáját állítja.
        <span v-if="eventId">Kijelző: /olimpub/event/{{ eventId }}/display</span>
      </p>
      <p v-if="!fromLive && !loadError" class="op-qh__hint">minta</p>
      <p v-else-if="!listed.length" class="op-qh__hint">Nincs még feltöltött {{ area === 'game' ? 'játék' : 'forduló' }}.</p>
      <ul class="op-qh__list">
        <li v-for="row in listed" :key="row.id" class="op-qh__item">
          <button type="button" class="op-qh__open" :class="{ 'is-hidden': !roundVisible(row) }" @click="enter(row)">
            <strong>{{ row.title }}</strong>
            <em :class="`is-${row.status}`">{{ statusText(row) }}</em>
          </button>
          <div class="op-qh__acts">
            <button
              type="button"
              class="is-lock"
              aria-label="Lezárás"
              :disabled="!canCloseRound(row) || busyKey === row.id"
              @click.stop="onCloseRoundRow(row)"
            >
              <q-icon :name="isRowClosed(row) ? 'sym_r_lock' : 'sym_r_lock_open'" size="20px" />
              <q-tooltip>Lezárás</q-tooltip>
            </button>
            <button
              type="button"
              class="is-cast"
              aria-label="Vetítés"
              :disabled="!canProjectClosed(row) || busyKey === row.id"
              @click.stop="onProjectClosedRow(row)"
            >
              <q-icon name="sym_r_present_to_all" size="20px" />
              <q-tooltip>Vetítés</q-tooltip>
            </button>
            <button
              type="button"
              class="is-reset"
              aria-label="Reset"
              :disabled="!canResetRound(row) || busyKey === row.id"
              @click.stop="onResetRoundRow(row)"
            >
              <q-icon name="sym_r_replay" size="20px" />
              <q-tooltip>Reset</q-tooltip>
            </button>
            <button
              type="button"
              class="is-eye"
              :class="{ 'is-on': roundVisible(row) }"
              :aria-label="roundVisible(row) ? 'Látható' : 'Rejtett'"
              :aria-pressed="roundVisible(row)"
              :disabled="busyKey === row.id"
              @click.stop="onToggleVisible(row)"
            >
              <q-icon :name="roundVisible(row) ? 'sym_r_visibility' : 'sym_r_visibility_off'" size="20px" />
              <q-tooltip>{{ roundVisible(row) ? 'Látható' : 'Rejtett' }}</q-tooltip>
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section v-else-if="area === 'results'" class="op-qh__wall">
      <div class="op-qh__pick" role="tablist" aria-label="Vetítés mód">
        <button type="button" :class="{ 'is-on': wallMode === 'standings' }" @click="wallMode = 'standings'">
          Állás
        </button>
        <button type="button" :class="{ 'is-on': wallMode === 'ceremony' }" @click="wallMode = 'ceremony'">
          Ceremónia
        </button>
      </div>
      <div class="op-qh__cast">
        <button type="button" class="is-cast" :class="{ 'is-sent': sent === 'wall' }" @click="projectWall">
          {{ sent === 'wall' ? 'Kiküldve' : 'Vetítés' }}
        </button>
      </div>
      <div v-if="ceremonyPlace != null" class="op-qh__stepper" aria-label="Ceremónia léptető">
        <p class="op-qh__place">{{ podiumLine(ceremonyPlace) }}</p>
        <div class="op-qh__step">
          <button type="button" :disabled="ceremonyPlace >= scoreRows.length" @click="stepCeremony(1)">Előző</button>
          <button type="button" :disabled="ceremonyPlace <= 1" @click="stepCeremony(-1)">Következő</button>
          <button type="button" @click="enterCeremony">Újra</button>
        </div>
      </div>
      <p v-if="castNote" class="op-qh__ack">{{ castNote }}</p>
      <p class="op-qh__hint">
        Állás: az F helyezési pontok, hátulról. Ceremónia: ugyanaz kézzel. Ha még nincs lezárt forduló, mindenki 0.
        <span v-if="eventId">Kijelző: /olimpub/event/{{ eventId }}/display</span>
      </p>
      <p v-if="leaderLoading && !leaderLoaded" class="op-qh__hint">Eredmények betöltése…</p>
      <p v-else-if="leaderError && !scoreRows.length" class="op-qh__hint">{{ leaderError }}</p>
      <p v-else-if="leaderLoaded && !hasPlacementF" class="op-qh__hint">Még nincs lezárt forduló — mindenki 0 F.</p>
      <p v-else-if="leaderLoaded && !scoreRows.length" class="op-qh__hint">Még nincs eredmény ezen a tabellán.</p>
      <p v-else-if="leaderError" class="op-qh__hint">{{ leaderError }}</p>
      <div class="op-qh__score">
        <div class="op-qh__pick" role="tablist" aria-label="Csapat vagy egyéni">
          <button type="button" :class="{ 'is-on': who === 'team' }" @click="who = 'team'">Csapat</button>
          <button type="button" :class="{ 'is-on': who === 'person' }" @click="who = 'person'">Egyéni</button>
        </div>
        <div v-if="who === 'team'" class="op-qh__pick" role="group" aria-label="Kvíz, játék és extra eredmény">
          <button type="button" :class="{ 'is-on': showQuiz }" :aria-pressed="showQuiz" @click="toggleBoard('quiz')">
            Kvíz
          </button>
          <button type="button" :class="{ 'is-on': showGame }" :aria-pressed="showGame" @click="toggleBoard('game')">
            Játék
          </button>
          <button type="button" :class="{ 'is-on': showExtra }" :aria-pressed="showExtra" @click="toggleBoard('extra')">
            Extra
          </button>
        </div>
        <p class="op-qh__caption">{{ scoreCaption }}</p>
        <ol>
          <li v-for="row in scoreRows" :key="row.key">
            <b>{{ row.place }}</b>
            <span>
              {{ row.name }}
              <small v-if="row.team">{{ row.team }}</small>
            </span>
            <strong>{{ row.points }}</strong>
          </li>
        </ol>
      </div>
    </section>
  </div>

  <q-dialog
    v-model="confirmOpen"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @hide="onConfirmHide"
  >
    <div class="op-confirm" :class="{ 'is-reset': confirmKind === 'reset' }">
      <div class="op-confirm__icon">
        <q-icon :name="confirmKind === 'reset' ? 'sym_r_replay' : 'sym_r_lock'" size="28px" />
      </div>
      <h2>{{ confirmTitle }}</h2>
      <p>{{ confirmMessage }}</p>
      <div class="op-confirm__actions">
        <button type="button" class="op-confirm__btn" @click="answerConfirm(false)">Mégse</button>
        <button type="button" class="op-confirm__btn is-ok" @click="answerConfirm(true)">{{ confirmOk }}</button>
      </div>
    </div>
  </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { useOlimpubStore } from 'src/stores/olimpub';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import { closeOpRound, castOpDisplay, fetchOpLeaderboard, resetOpExtra, resetOpRound, showOpLeaderboard, startOpExtra, stopOpExtra, stopOpExtraQuestion, stopOpQuestion } from '../opApi';
import { opDefaultTimeSec, opJoinAbsoluteUrl, opReactGlyph } from '../constants';
import {
  extraPoolToQuestion,
  opExtraQuestionTimeSec,
  formatOpQuestionCorrect,
  liveAnswerCountFor,
  kabalaImageOf,
  opQuestionAudioUrl,
  opQuestionImageUrl,
  extraPenaltyStandings,
  uniqueOpExtraGameIds,
  withOpPenaltyPoints,
  type OpEventQuestion,
  type OpLeaderboardRow,
} from '../opData';
import {
  emptyOpDisplayCommand,
  publishOpDisplay,
  commandToCastPayload,
  writeOpPlayerFace,
  type OpDisplayClockPhase,
  type OpDisplayCommand,
  type OpDisplayLobbyTeam,
  type OpDisplayRow,
  type OpPlayerFace,
} from '../opDisplayChannel';
import { resolveOpMediaUrl } from '../opMediaCache';
import { buildQmCatalog, type QmCatalogItem } from '../qmCatalog';
import { useOpLeaderboards, type OpStandingsSource } from '../useOpLeaderboards';

const OpQuizmasterStage = defineAsyncComponent(() => import('./OpQuizmasterStage.vue'));

type CatalogItem = QmCatalogItem;

const props = withDefaults(
  defineProps<{
    prompt: string;
    correct: string;
    timeSec: number;
    topic?: string;
    mediaUrl?: string | null;
    audioUrl?: string | null;
    eventId?: number | null;
    initialArea?: 'quiz' | 'game' | 'results' | null;
  }>(),
  {
    topic: '',
    mediaUrl: null,
    audioUrl: null,
    eventId: null,
    initialArea: null,
  }
);

const emit = defineEmits<{
  close: [];
}>();

const $q = useQuasar();
const store = useOlimpubStore();
const eventStore = useEventStore();
const sent = ref<'topics' | 'draw' | 'results' | 'standings' | 'join' | 'wall' | ''>('');
const wallMode = ref<'standings' | 'ceremony'>('standings');
const castNote = ref('');
const loadError = ref('');
const fromLive = ref(false);
let sentTimer = 0;

const SAMPLE_ITEMS: CatalogItem[] = [
  { id: 'r1', kind: 'quiz', title: '90-es évek', total: 8, index: 3, status: 'live', prompt: '', correct: '' },
  { id: 'r2', kind: 'quiz', title: 'Albumok', total: 8, index: 1, status: 'wait', prompt: 'Melyik lemezen van a Black?', correct: 'Ten' },
  { id: 'r3', kind: 'quiz', title: 'Műfajok', total: 8, index: 8, status: 'closed', prompt: 'Melyik műfaj a grunge?', correct: 'Grunge' },
  { id: 'r4', kind: 'quiz', title: 'Filmek', total: 8, index: 1, status: 'wait', prompt: 'Ki rendezte a Ponyvaregényt?', correct: 'Tarantino' },
  { id: 'g1', kind: 'game', title: 'Párbaj', total: 5, index: 2, status: 'live', prompt: 'Melyik együttes adta ki a Nevermindot?', correct: 'Nirvana' },
  { id: 'g2', kind: 'game', title: 'Mozaik', total: 6, index: 1, status: 'wait', prompt: 'Melyik szám szól?', correct: 'Smells Like Teen Spirit' },
  { id: 'g3', kind: 'game', title: 'Karaoke', total: null, index: 0, status: 'wait', prompt: 'Karaoke', correct: '' },
  { id: 'g4', kind: 'game', title: 'Fordított', total: 5, index: 5, status: 'closed', prompt: 'Mondd vissza a sorst.', correct: 'Sor' },
  { id: 'g5', kind: 'game', title: 'Generációk', total: 5, index: 1, status: 'wait', prompt: 'Melyik évjárat?', correct: '1991' },
  { id: 'g6', kind: 'game', title: 'Műsorvezető', total: 5, index: 1, status: 'wait', prompt: 'Ki a műsorvezető?', correct: 'Név' },
  { id: 'g7', kind: 'game', title: 'Filmguru', total: 5, index: 1, status: 'wait', prompt: 'Melyik film?', correct: 'Film' },
  { id: 'g8', kind: 'game', title: 'Ki beszél?', total: 5, index: 1, status: 'wait', prompt: 'Kié a hang?', correct: 'Hang' },
];

const liveItems = computed(() => {
  if (!props.eventId) return [] as CatalogItem[];
  const game = store.getGame(props.eventId);
  const extra = uniqueOpExtraGameIds(
    store.getSettingsForEvent(props.eventId)?.ExtraGameIds,
    eventStore.getOpSettingsForEvent(props.eventId)?.ExtraGameIds,
    (game.extraPool || []).map((row) => row.ExtraGameId),
    (game.extraCatalog || []).map((row) => row.ExtraGameId)
  );
  return buildQmCatalog(game, extra, store.topics);
});

const items = computed(() => {
  if (fromLive.value) return liveItems.value;
  if (loadError.value) return [];
  return SAMPLE_ITEMS;
});

const area = ref<'quiz' | 'game' | 'results' | null>(
  props.initialArea === 'quiz' || props.initialArea === 'game' || props.initialArea === 'results'
    ? props.initialArea
    : null
);
const resultsLive = computed(() => area.value === 'results');
const eventIdRef = computed(() => props.eventId);
const who = ref<'team' | 'person'>('team');
const showQuiz = ref(true);
const showGame = ref(false);
const showExtra = ref(true);
const openItem = ref<CatalogItem | null>(null);
const standingsRoundId = computed(() => null as number | null);
const standingsSource = computed<OpStandingsSource>(() => {
  if (who.value === 'person') return 'shadow';
  const quiz = showQuiz.value;
  const game = showGame.value;
  const extra = showExtra.value;
  if (quiz && game && extra) return 'main';
  if (quiz && game) return 'compose';
  if (extra && !quiz && !game) return 'extra';
  if (game && !quiz) return 'games';
  return 'quiz';
});
const {
  rows: leaderRows,
  loaded: leaderLoaded,
  loading: leaderLoading,
  error: leaderError,
  reload: reloadLeaderboards,
} = useOpLeaderboards(eventIdRef, resultsLive, standingsSource, standingsRoundId);
const roundRows = ref<OpLeaderboardRow[]>([]);
const roundLoading = ref(false);
const roundError = ref('');
const busyKey = ref('');
const visibleOverride = ref<Record<string, boolean>>({});
const extraClosedOverride = ref<Record<string, boolean>>({});
const podiumStep = ref(-1);
const revealCount = ref(0);
const ceremonyPlace = ref<number | null>(null);
let standingsTimer = 0;
let standingsToken = 0;
const lastFace = ref<OpDisplayCommand['face'] | ''>('');
let lastClock: {
  phase: OpDisplayClockPhase;
  totalMs: number;
  leftMs: number;
  endsAt: number;
  hold?: boolean;
  tipName?: string;
  tipTeam?: string;
  outTeamIds?: number[];
} | null = null;
const liveQuestionId = computed(() => {
  const row = openItem.value;
  if (!row) return null;
  if (row.eventQuestionId != null) return row.eventQuestionId;
  if (!props.eventId || row.roundId == null) return null;
  const qs = store
    .getGame(props.eventId)
    .questions.filter((item) => item.RoundID === row.roundId && !item.ExtraGameId)
    .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
  return (
    qs.find((item) => item.SortIndex === row.index)?.id ??
    qs[Math.max(0, (row.index || 1) - 1)]?.id ??
    qs[0]?.id ??
    null
  );
});
const liveExtraQuestionId = computed(() => {
  const row = openItem.value;
  if (!row?.extraGameId || !props.eventId) return row?.extraQuestionId ?? null;
  if (row.extraQuestionId != null) return row.extraQuestionId;
  const live = store.getGame(props.eventId).live;
  if (live.ActiveExtraQuestionID != null) return live.ActiveExtraQuestionID;
  const pool = store
    .getGame(props.eventId)
    .extraPool.filter((item) => item.ExtraGameId === row.extraGameId)
    .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
  return pool.find((item) => item.SortIndex === row.index)?.id ?? pool[0]?.id ?? null;
});
const liveExtraRunId = computed(() => (props.eventId ? store.getGame(props.eventId).live.ExtraRunID : null));

function currentStageQuestion(row: CatalogItem): OpEventQuestion | null {
  const fromCatalog = eventQuestionOf(row);
  if (fromCatalog) return fromCatalog;
  if (!props.eventId) return null;
  const game = store.getGame(props.eventId);
  const live = game.live;
  if (row.extraGameId) {
    const liveId = live.ActiveExtraQuestionID ?? row.extraQuestionId;
    const pool =
      (liveId != null
        ? game.extraPool.find(
            (item) => item.id === liveId && item.ExtraGameId === row.extraGameId
          )
        : undefined) ||
      game.extraPool.find((item) => item.ExtraGameId === row.extraGameId) ||
      game.extraCatalog.find((item) => item.ExtraGameId === row.extraGameId);
    return pool ? withExtraTime(row, extraPoolToQuestion(pool)) : null;
  }
  const liveId = live.FocusedEventQuestionID ?? live.ActiveEventQuestionID;
  if (liveId == null) return null;
  return game.questions.find((item) => item.id === liveId) || null;
}

function withExtraTime(row: CatalogItem, q: OpEventQuestion): OpEventQuestion {
  if (!props.eventId || !row.extraGameId) return q;
  const game = store.getGame(props.eventId);
  return {
    ...q,
    TimeSec: opExtraQuestionTimeSec({
      extraGameId: row.extraGameId,
      extraQuestionId: row.extraQuestionId ?? q.id,
      question: q,
      extraPool: game.extraPool,
      extraCatalog: game.extraCatalog,
      repoQuestions: game.repoQuestions,
    }),
  };
}

function stageTimeSec(row: CatalogItem) {
  if (row.kind === 'game') {
    if (row.total == null) return 0;
    if (!props.eventId) return 10;
    const game = store.getGame(props.eventId);
    return opExtraQuestionTimeSec({
      extraGameId: row.extraGameId,
      extraQuestionId: row.extraQuestionId,
      question: currentStageQuestion(row),
      extraPool: game.extraPool,
      extraCatalog: game.extraCatalog,
      repoQuestions: game.repoQuestions,
    });
  }
  const q = currentStageQuestion(row);
  if (props.eventId && q?.QuestionID != null) {
    const repo = store.getGame(props.eventId).repoQuestions.find((item) => item.id === q.QuestionID);
    if (repo?.TimeSec != null && repo.TimeSec > 0) return repo.TimeSec;
  }
  if (q?.TimeSec != null && q.TimeSec > 0) return q.TimeSec;
  if (q?.TypeCode) return opDefaultTimeSec(q.TypeCode);
  return props.timeSec || 20;
}

const heading = computed(() => {
  if (area.value === 'quiz') return 'Kvíz';
  if (area.value === 'game') return 'Játék';
  if (area.value === 'results') return 'Eredmények';
  return 'Kvízmester';
});

const listed = computed(() =>
  items.value
    .filter((row) => row.kind === area.value)
    .map((row) => {
      if (row.kind !== 'game') return row;
      if (extraRunActive(row)) return { ...row, status: 'live' as const };
      if (extraClosedNow(row)) return { ...row, status: 'closed' as const };
      return row;
    })
);

const eventName = computed(() => {
  const id = String(props.eventId ?? '');
  const ev =
    eventStore.events?.find((row: { id?: number | string }) => String(row.id) === id) ||
    eventStore.myEvents?.find((row: { id?: number | string }) => String(row.id) === id);
  return String(ev?.Title || ev?.EventName || ev?.Name || '').trim() || 'Olimpub';
});

function teamNameFor(row: OpLeaderboardRow) {
  if (row.teamName) return row.teamName;
  if (!props.eventId || row.eventUserId == null) return '';
  const game = store.getGame(props.eventId);
  const member = game.teamMembers.find((item) => item.EventUserID === row.eventUserId);
  if (!member) return '';
  return game.teams.find((team) => team.id === member.TeamID)?.Name || '';
}

const priorByName = ref<Record<string, number>>({});

function boardMemoryKey() {
  return `opBoardSeen:${props.eventId || 0}:${standingsSource.value}`;
}

function readBoardMemory(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(boardMemoryKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const saved: Record<string, number> = {};
    for (const [name, points] of Object.entries(parsed as Record<string, unknown>)) {
      const value = Number(points);
      if (name && Number.isFinite(value)) saved[name] = value;
    }
    return saved;
  } catch {
    return {};
  }
}

function writeBoardMemory(rows: { name: string; points: number }[]) {
  const payload: Record<string, number> = {};
  for (const row of rows) payload[row.name] = row.points;
  try {
    sessionStorage.setItem(boardMemoryKey(), JSON.stringify(payload));
  } catch {
    /* a következő vetítés akkor is megy */
  }
}

function priorPoints(row: OpLeaderboardRow) {
  const current = hasPlacementF.value ? Number(row.points) || 0 : 0;
  let prior = 0;
  if (Object.prototype.hasOwnProperty.call(priorByName.value, row.name)) {
    prior = Number(priorByName.value[row.name]) || 0;
  } else {
    const api = Number(row.previousPoints);
    if (Number.isFinite(api) && api > 0) prior = api;
  }
  if (prior > current) return 0;
  return prior;
}

function commitProjectedPoints() {
  const rows = scoreRows.value.map((row) => ({ name: row.name, points: row.points }));
  priorByName.value = Object.fromEntries(rows.map((row) => [row.name, row.points]));
  writeBoardMemory(rows);
}

function resetProjectedPoints() {
  const names = new Set<string>();
  for (const row of leaderRows.value) {
    if (row.name) names.add(row.name);
  }
  if (props.eventId) {
    for (const team of store.getGame(props.eventId).teams) {
      if (team.Name) names.add(team.Name);
    }
  }
  const zeros: Record<string, number> = {};
  for (const name of names) zeros[name] = 0;
  priorByName.value = zeros;
  if (!props.eventId) return;
  try {
    for (const board of ['quiz', 'games', 'main', 'shadow', 'compose', 'extra']) {
      const key = `opBoardSeen:${props.eventId}:${board}`;
      if (names.size) sessionStorage.setItem(key, JSON.stringify(zeros));
      else sessionStorage.removeItem(key);
    }
  } catch {
    /* a következő Állás 0-ról indul */
  }
}

function roundIsClosed(code: string) {
  const key = String(code || '').toLowerCase();
  return key === 'closed' || key === 'published' || key === 'lezárt' || key === 'lezart';
}

function visibleStorageKey() {
  return props.eventId ? `opRoundVisible:${props.eventId}` : '';
}

function visibleRowKey(row: CatalogItem) {
  return row.roundId != null ? `r${row.roundId}` : row.id;
}

function readVisibleOverride() {
  const key = visibleStorageKey();
  if (!key) {
    visibleOverride.value = {};
    return;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      visibleOverride.value = {};
      return;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      visibleOverride.value = {};
      return;
    }
    const next: Record<string, boolean> = {};
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (name) next[name] = Boolean(value);
    }
    visibleOverride.value = next;
  } catch {
    visibleOverride.value = {};
  }
}

function writeVisibleOverride() {
  const key = visibleStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(visibleOverride.value));
  } catch {
    /* a Vetítés ettől a gépről akkor is megy */
  }
}

function extraClosedStorageKey() {
  return props.eventId ? `opExtraClosed:${props.eventId}` : '';
}

function readJsonFlagMap(key: string) {
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: Record<string, boolean> = {};
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (name) next[name] = Boolean(value);
    }
    return next;
  } catch {
    return {};
  }
}

function readExtraClosedOverride() {
  extraClosedOverride.value = readJsonFlagMap(extraClosedStorageKey());
}

function writeExtraClosedOverride() {
  const key = extraClosedStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(extraClosedOverride.value));
  } catch {
    /* a Lezárt állapot ettől a gépről akkor is megy */
  }
}

function markExtraClosed(extraGameId: string | undefined, closed: boolean) {
  if (!extraGameId) return;
  extraClosedOverride.value = { ...extraClosedOverride.value, [extraGameId]: closed };
  writeExtraClosedOverride();
}

function extraPoolOf(row: CatalogItem) {
  if (!props.eventId || !row.extraGameId) return [];
  return store.getGame(props.eventId).extraPool.filter((item) => item.ExtraGameId === row.extraGameId);
}

function extraRunActive(row: CatalogItem) {
  if (!props.eventId || !row.extraGameId) return false;
  return store.getGame(props.eventId).live.ExtraGameId === row.extraGameId;
}

function extraRunIdOf(row: CatalogItem) {
  if (!props.eventId || !row.extraGameId) return null;
  const live = store.getGame(props.eventId).live;
  return live.ExtraGameId === row.extraGameId ? live.ExtraRunID : null;
}

function extraClosedNow(row: CatalogItem) {
  if (row.kind !== 'game') return roundClosedNow(row);
  if (extraRunActive(row)) return false;
  const key = row.extraGameId || row.id;
  if (Object.prototype.hasOwnProperty.call(extraClosedOverride.value, key)) {
    return extraClosedOverride.value[key];
  }
  return row.status === 'closed';
}

function quizQuestionsOf(roundId: number) {
  if (!props.eventId) return [];
  return store
    .getGame(props.eventId)
    .questions.filter((row) => row.RoundID === roundId && !row.ExtraGameId);
}

function quizRoundOf(row: CatalogItem) {
  if (!props.eventId || row.roundId == null) return null;
  return store.getGame(props.eventId).rounds.find((item) => item.id === row.roundId) || null;
}

function roundClosedNow(row: CatalogItem) {
  const round = quizRoundOf(row);
  if (round) return roundIsClosed(round.StatusCode);
  return row.status === 'closed';
}

function roundHasAnswer(row: CatalogItem) {
  if (!fromLive.value || !props.eventId || row.roundId == null) {
    return row.status === 'live' || row.status === 'closed' || row.index > 1;
  }
  const qs = quizQuestionsOf(row.roundId);
  if (qs.some((item) => (item.AnswerCount || 0) > 0)) return true;
  if (
    qs.some((item) => {
      const st = String(item.StatusCode || '').toLowerCase();
      return st === 'stopped' || st === 'closed';
    })
  ) {
    return true;
  }
  const live = store.getGame(props.eventId).live;
  return live.ActiveRoundID === row.roundId && (live.AnswerCount || 0) > 0;
}

function roundHasProgress(row: CatalogItem) {
  if (roundClosedNow(row) || roundHasAnswer(row)) return true;
  if (!fromLive.value || !props.eventId || row.roundId == null) {
    return row.status !== 'wait' || row.index > 1;
  }
  return quizQuestionsOf(row.roundId).some((item) => {
    const st = String(item.StatusCode || '').toLowerCase();
    return st !== 'pending' && st !== 'wait';
  });
}

function extraHasAnswer(row: CatalogItem) {
  if (!fromLive.value || !props.eventId || !row.extraGameId) {
    return row.status === 'live' || row.status === 'closed' || row.index > 1;
  }
  if (!extraRunActive(row)) return extraClosedNow(row);
  if (row.total == null || row.total === 0) return true;
  const rows = extraPoolOf(row);
  if (
    rows.some((item) => {
      const st = String(item.StatusCode || '').toLowerCase();
      return st === 'stopped' || st === 'closed';
    })
  ) {
    return true;
  }
  const live = store.getGame(props.eventId).live;
  return live.ExtraGameId === row.extraGameId && (live.AnswerCount || 0) > 0;
}

function extraHasProgress(row: CatalogItem) {
  if (extraClosedNow(row) || extraRunActive(row)) return true;
  if (extraHasAnswer(row)) return true;
  if (!fromLive.value || !props.eventId || !row.extraGameId) {
    return row.status !== 'wait' || row.index > 1;
  }
  return false;
}

function canCloseRound(row: CatalogItem) {
  if (row.kind === 'game') return !extraClosedNow(row) && (extraRunActive(row) || extraHasAnswer(row));
  return row.kind === 'quiz' && !roundClosedNow(row) && roundHasAnswer(row);
}

function canResetRound(row: CatalogItem) {
  if (row.kind === 'game') return extraHasProgress(row);
  return row.kind === 'quiz' && roundHasProgress(row);
}

function canProjectClosed(row: CatalogItem) {
  if (row.kind === 'game') return extraClosedNow(row);
  return row.kind === 'quiz' && roundClosedNow(row);
}

function isRowClosed(row: CatalogItem) {
  return row.kind === 'game' ? extraClosedNow(row) : roundClosedNow(row);
}

function roundVisible(row: CatalogItem) {
  const key = visibleRowKey(row);
  if (Object.prototype.hasOwnProperty.call(visibleOverride.value, key)) {
    return visibleOverride.value[key];
  }
  const flag = quizRoundOf(row)?.VisibleFlg;
  return flag == null ? true : flag;
}

const confirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmOk = ref('OK');
const confirmKind = ref<'close' | 'reset'>('close');
let confirmResolve: ((ok: boolean) => void) | null = null;

function confirmOp(title: string, message: string, ok: string, kind: 'close' | 'reset' = 'close') {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmOk.value = ok;
  confirmKind.value = kind;
  confirmOpen.value = true;
  return new Promise<boolean>((resolve) => {
    confirmResolve = resolve;
  });
}

function answerConfirm(ok: boolean) {
  confirmOpen.value = false;
  confirmResolve?.(ok);
  confirmResolve = null;
}

function onConfirmHide() {
  if (!confirmResolve) return;
  confirmResolve(false);
  confirmResolve = null;
}

async function onCloseRoundRow(row: CatalogItem) {
  if (!canCloseRound(row) || busyKey.value === row.id) return;
  const isGame = row.kind === 'game';
  const ok = await confirmOp(
    isGame ? 'Játék lezárása' : 'Forduló lezárása',
    isGame
      ? 'Ez beírja az ExtraScore pontokat a Játék tabellára. Teszt után Reset-tel törölheted.'
      : 'Ez kiszámolja az F helyezési pontokat. Tesztkör után Reset-tel törölheted.',
    'Lezárás',
    'close'
  );
  if (!ok) return;
  busyKey.value = row.id;
  try {
    if (isGame) {
      if (fromLive.value && props.eventId && row.extraGameId) {
        const live = store.getGame(props.eventId).live;
        if (live.ExtraGameId === row.extraGameId) {
          const extraStatus = String(live.ExtraQuestionStatus || '').toLowerCase();
          if (extraStatus === 'active' && live.ActiveExtraQuestionID != null) {
            await stopOpExtraQuestion(props.eventId, live.ActiveExtraQuestionID);
          }
        }
        await stopOpExtra(props.eventId, {
          extraRunId: extraRunIdOf(row),
          extraGameId: row.extraGameId,
        });
        markExtraClosed(row.extraGameId, true);
        await reloadLive();
        void reloadLeaderboards();
        $q.notify({ type: 'positive', message: 'Játék lezárva — ExtraScore kész.', position: 'top', timeout: 1800 });
        return;
      }
      row.status = 'closed';
      markExtraClosed(row.extraGameId, true);
      $q.notify({ type: 'positive', message: 'Játék lezárva — ExtraScore kész.', position: 'top', timeout: 1800 });
      return;
    }
    if (fromLive.value && props.eventId && row.roundId != null) {
      const active = quizQuestionsOf(row.roundId).find(
        (item) => String(item.StatusCode || '').toLowerCase() === 'active'
      );
      if (active) await stopOpQuestion(props.eventId, { eventQuestionId: active.id });
      await closeOpRound(props.eventId, { roundId: row.roundId });
      await reloadLive();
      void reloadLeaderboards();
      let hasF = false;
      try {
        const rows = await fetchOpLeaderboard(props.eventId, 'quiz', { roundId: row.roundId });
        hasF = rows.some((item) => item.points > 0);
      } catch {
        hasF = false;
      }
      $q.notify({
        type: hasF ? 'positive' : 'warning',
        message: hasF
          ? 'Forduló lezárva — F pontok kész.'
          : 'A forduló lezárt, de a GET /op/leaderboard?board=quiz&RoundId= 0 F-et ad.',
        position: 'top',
        timeout: hasF ? 1800 : 3600,
      });
      return;
    } else {
      row.status = 'closed';
    }
    $q.notify({ type: 'positive', message: 'Forduló lezárva — F pontok kész.', position: 'top', timeout: 1800 });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: readAxiosErrorMessage(error, isGame ? 'A játék lezárása nem sikerült.' : 'A forduló lezárása nem sikerült.'),
      position: 'top',
    });
  } finally {
    busyKey.value = '';
  }
}

async function onResetRoundRow(row: CatalogItem) {
  if (!canResetRound(row) || busyKey.value === row.id) return;
  const isGame = row.kind === 'game';
  const ok = await confirmOp(
    isGame ? 'Játék reset' : 'Forduló reset',
    isGame
      ? 'Minden extra pont és progress törlődik, a játék újra Várakozik lesz.'
      : 'Minden válasz, RawS és F pont törlődik, a progress nullázódik.',
    'Reset',
    'reset'
  );
  if (!ok) return;
  busyKey.value = row.id;
  try {
    if (isGame) {
      if (fromLive.value && props.eventId && row.extraGameId) {
        await resetOpExtra(props.eventId, {
          extraRunId: extraRunIdOf(row),
          extraGameId: row.extraGameId,
        });
        await reloadLive();
        store.resetExtraLocalState(props.eventId, row.extraGameId);
      } else {
        row.status = 'wait';
        row.index = 1;
      }
      markExtraClosed(row.extraGameId, false);
      if (openItem.value?.id === row.id) openItem.value = null;
      resetProjectedPoints();
      $q.notify({ type: 'positive', message: 'Játék resetelve.', position: 'top', timeout: 1800 });
      return;
    }
    if (fromLive.value && props.eventId && row.roundId != null) {
      await resetOpRound(props.eventId, { roundId: row.roundId });
      await reloadLive();
    } else {
      row.status = 'wait';
      row.index = 1;
    }
    if (openItem.value?.id === row.id) openItem.value = null;
    resetProjectedPoints();
    $q.notify({ type: 'positive', message: 'Forduló resetelve.', position: 'top', timeout: 1800 });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: readAxiosErrorMessage(
        error,
        isGame
          ? 'A játék reset nem sikerült. A szerver Op.ResetExtra-t vár ExtraGameId-val.'
          : 'A reset nem sikerült.'
      ),
      position: 'top',
    });
  } finally {
    busyKey.value = '';
  }
}

function onToggleVisible(row: CatalogItem) {
  const key = visibleRowKey(row);
  visibleOverride.value = { ...visibleOverride.value, [key]: !roundVisible(row) };
  writeVisibleOverride();
}

function closedBoardMemoryKey(row: CatalogItem) {
  if (row.kind === 'quiz' && row.roundId != null) return `opBoardSeen:${props.eventId || 0}:roundF:${row.roundId}`;
  if (row.extraGameId) return `opBoardSeen:${props.eventId || 0}:games:${row.extraGameId}`;
  return `opBoardSeen:${props.eventId || 0}:games`;
}

function readNamedScoreMemory(key: string): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: Record<string, number> = {};
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      const points = Number(value);
      if (name && Number.isFinite(points)) next[name] = points;
    }
    return next;
  } catch {
    return {};
  }
}

function writeNamedScoreMemory(key: string, rows: { name: string; points: number }[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(rows.map((row) => [row.name, row.points]))));
  } catch {
    /* a következő Állás akkor is megy */
  }
}

function emptyTeamBoard(): OpLeaderboardRow[] {
  if (!props.eventId) return [];
  return store.getGame(props.eventId).teams.map((team, index) => ({
    key: `t${team.id}`,
    name: team.Name,
    points: 0,
    previousPoints: 0,
    place: index + 1,
    teamId: team.id,
    eventUserId: null,
    teamName: '',
    extraGameId: '',
    roundId: null,
  }));
}

async function onProjectClosedRow(row: CatalogItem) {
  if (!canProjectClosed(row) || busyKey.value === row.id) return;
  busyKey.value = row.id;
  const isGame = row.kind === 'game';
  try {
    let apiRows: OpLeaderboardRow[] = [];
    if (fromLive.value && props.eventId) {
      try {
        apiRows = isGame
          ? await fetchOpLeaderboard(props.eventId, 'games', { extraGameId: row.extraGameId })
          : await fetchOpLeaderboard(props.eventId, 'quiz', { roundId: row.roundId });
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: readAxiosErrorMessage(error, isGame ? 'A Játék állás nem olvasható.' : 'Az F állás nem olvasható.'),
          position: 'top',
        });
        return;
      }
    }
    const memoryKey = closedBoardMemoryKey(row);
    const prior = readNamedScoreMemory(memoryKey);
    const source = apiRows.length ? apiRows : emptyTeamBoard();
    const rows: OpDisplayRow[] = source.map((item) => {
      const points = Number(item.points) || 0;
      let previous = 0;
      if (Object.prototype.hasOwnProperty.call(prior, item.name)) {
        previous = Number(prior[item.name]) || 0;
      } else {
        const api = Number(item.previousPoints);
        if (Number.isFinite(api) && api > 0) previous = api;
      }
      if (previous > points) previous = 0;
      return { name: item.name, team: '', points, previousPoints: previous };
    });
    if (!rows.length) {
      $q.notify({
        type: 'warning',
        message: isGame ? 'Nincs kivehető játékállás.' : 'Nincs kivehető F állás.',
        position: 'top',
        timeout: 1800,
      });
      return;
    }
    const hasScore = rows.some((item) => item.points > 0);
    const started = Date.now();
    const every = 3000;
    stopStandingsClock();
    publish({
      face: 'results',
      kind: isGame ? 'game' : 'quiz',
      board: isGame ? 'games' : 'quiz',
      extraGameId: row.extraGameId || '',
      roundId: isGame ? null : row.roundId ?? null,
      scoreScope: isGame ? 'game' : 'round',
      title: `Állás · ${row.title}`,
      rows,
      sample: !fromLive.value,
      scoreDecimals: 0,
      podiumStep: -1,
      revealMode: 'auto',
      revealCount: 0,
      revealEveryMs: every,
      revealStartedAt: started,
    });
    writeNamedScoreMemory(memoryKey, rows);
    if (hasScore || !fromLive.value) {
      acknowledge('wall', `Állás kint: ${row.title}.`);
      return;
    }
    $q.notify({
      type: 'warning',
      message: isGame
        ? 'A játék lezárt, de a GET /op/leaderboard?board=games&ExtraGameId= 0 pontot ad.'
        : 'A forduló lezárt, de a GET /op/leaderboard?board=quiz&RoundId= 0 F-et ad.',
      position: 'top',
      timeout: 3600,
    });
  } finally {
    busyKey.value = '';
  }
}

const hasClosedQuizF = computed(() => {
  if (!props.eventId) return false;
  return store.getGame(props.eventId).rounds.some((row) => roundIsClosed(row.StatusCode));
});

const hasClosedGameF = computed(() => {
  if (Object.values(extraClosedOverride.value).some(Boolean)) return true;
  if (!props.eventId) return false;
  const game = store.getGame(props.eventId);
  if (roundIsClosed(String(game.live.ExtraQuestionStatus || ''))) return true;
  return game.extraPool.some((row) => roundIsClosed(row.StatusCode));
});

const hasPlacementF = computed(() => {
  if (who.value === 'person') return hasClosedQuizF.value;
  if (showExtra.value && !showQuiz.value && !showGame.value) return true;
  if (showGame.value && !showQuiz.value) return hasClosedGameF.value || showExtra.value;
  if (showQuiz.value && !showGame.value) return hasClosedQuizF.value || showExtra.value;
  return hasClosedQuizF.value || hasClosedGameF.value || showExtra.value;
});

const scoreRows = computed(() => {
  const game = props.eventId ? store.getGame(props.eventId) : null;
  const source = standingsSource.value;
  let base = leaderRows.value;
  if (who.value === 'team' && game) {
    if (source === 'extra') {
      base = extraPenaltyStandings(game.teams, game.penalties);
    } else if (showExtra.value && source !== 'main') {
      base = withOpPenaltyPoints(base, game.teams, game.penalties);
    }
  }
  const mapped = base.map((row) => ({
    key: row.key,
    name: row.name,
    team: who.value === 'person' ? teamNameFor(row) : '',
    points: hasPlacementF.value ? row.points : 0,
    previous: hasPlacementF.value ? priorPoints(row) : 0,
    place: row.place,
  }));
  if (mapped.length) return mapped;
  if (!game) return [];
  return game.teams.map((team, index) => ({
    key: `t${team.id}`,
    name: team.Name,
    team: '',
    points: 0,
    previous: 0,
    place: index + 1,
  }));
});

const roundScoreRows = computed(() =>
  roundRows.value.map((row) => {
    const points = Number(row.points) || 0;
    const previous = Number(row.previousPoints) > 0 ? Number(row.previousPoints) : 0;
    return {
      name: row.name,
      points,
      previous: previous > points ? 0 : previous,
    };
  })
);

watch(
  () => boardMemoryKey(),
  () => {
    priorByName.value = readBoardMemory();
  },
  { immediate: true }
);

const scoreCaption = computed(() => {
  if (who.value === 'person') return 'Egyéni · helyezés';
  const parts = [
    showQuiz.value ? 'Kvíz' : '',
    showGame.value ? 'Játék' : '',
    showExtra.value ? 'Extra' : '',
  ].filter(Boolean);
  return `Csapat · helyezés · ${parts.join(' + ')}`;
});

function toggleBoard(which: 'quiz' | 'game' | 'extra') {
  const next = {
    quiz: showQuiz.value,
    game: showGame.value,
    extra: showExtra.value,
  };
  next[which] = !next[which];
  if (!next.quiz && !next.game && !next.extra) return;
  showQuiz.value = next.quiz;
  showGame.value = next.game;
  showExtra.value = next.extra;
}

function statusText(row: CatalogItem) {
  const word = row.status === 'live' ? (row.total == null ? 'Fut' : 'Folyamatban') : row.status === 'closed' ? 'Lezárt' : 'Várakozik';
  if (row.total == null) return word;
  if (row.status === 'wait' && row.index <= 1) return word;
  return `${word} · ${row.index}/${row.total}`;
}

function resumeFor(row: CatalogItem) {
  if (row.total == null) {
    if (row.status === 'live') return 'Fut';
    if (row.status === 'closed') return 'Lezárt';
    return 'Még nincs elkezdve';
  }
  if (row.status === 'wait' && row.index <= 1) return '1. kérdés';
  return `${Math.max(1, row.index)}. kérdés`;
}

function sortFor(row: CatalogItem) {
  if (row.total == null) return 'Karaoke';
  return `${Math.max(1, row.index)}. kérdés`;
}

const stageCorrect = computed(() => {
  const row = openItem.value;
  if (!row) return props.correct || '';
  const q = eventQuestionOf(row);
  if (q) return formatOpQuestionCorrect(q);
  return row.correct || props.correct || '';
});

function promptFor(row: CatalogItem) {
  if (row.kind === 'quiz' && row.id === 'r1' && props.prompt) return props.prompt;
  return row.prompt || props.prompt || 'A kérdés szövege';
}

function back() {
  area.value = null;
  resetCeremony();
  stopStandingsClock();
  castNote.value = '';
  sent.value = '';
}

function channelId() {
  return props.eventId ?? 0;
}

let nonce = 0;

function publish(partial: Partial<OpDisplayCommand>) {
  nonce += 1;
  if (partial.face) lastFace.value = partial.face;
  const command = {
    ...emptyOpDisplayCommand(),
    nonce,
    kind: area.value === 'game' ? 'game' : 'quiz',
    sample: !fromLive.value,
    ...partial,
  };
  publishOpDisplay(channelId(), command);
  if (fromLive.value && props.eventId) {
    void castOpDisplay(props.eventId, commandToCastPayload(command)).catch(() => undefined);
  }
}

function eventQuestionOf(row: CatalogItem): OpEventQuestion | null {
  if (!props.eventId) return null;
  const game = store.getGame(props.eventId);
  if (row.extraGameId) {
    const extraId = row.extraQuestionId;
    const poolHit =
      extraId != null
        ? game.extraPool.find((item) => item.id === extraId && item.ExtraGameId === row.extraGameId)
        : undefined;
    const catalogHit =
      (poolHit?.QuestionID != null
        ? game.extraCatalog.find(
            (item) =>
              item.ExtraGameId === row.extraGameId &&
              (item.QuestionID === poolHit.QuestionID || item.id === poolHit.QuestionID)
          )
        : undefined) ||
      (poolHit
        ? game.extraCatalog.find(
            (item) =>
              item.ExtraGameId === row.extraGameId &&
              String(item.Prompt || '').trim() === String(poolHit.Prompt || '').trim()
          )
        : undefined) ||
      game.extraCatalog.find(
        (item) => item.ExtraGameId === row.extraGameId && item.SortIndex === row.index
      ) ||
      game.extraCatalog.find((item) => item.ExtraGameId === row.extraGameId);
    const pool =
      poolHit ||
      catalogHit ||
      game.extraPool.find((item) => item.ExtraGameId === row.extraGameId && item.StatusCode === 'active') ||
      game.extraPool.find((item) => item.ExtraGameId === row.extraGameId);
    if (!pool) return catalogHit ? withExtraTime(row, extraPoolToQuestion(catalogHit)) : null;
    const merged = catalogHit
      ? {
          ...pool,
          QuestionID: catalogHit.QuestionID ?? pool.QuestionID,
          TimeSec: catalogHit.TimeSec > 0 ? catalogHit.TimeSec : pool.TimeSec,
          Answers: catalogHit.Answers?.length ? catalogHit.Answers : pool.Answers,
          IsCorrect: catalogHit.IsCorrect?.length ? catalogHit.IsCorrect : pool.IsCorrect,
          Prompt: catalogHit.Prompt || pool.Prompt,
          TypeCode: catalogHit.TypeCode || pool.TypeCode,
          ImageKey: pool.ImageKey || catalogHit.ImageKey,
          ImageUrl: pool.ImageUrl || catalogHit.ImageUrl,
          AudioKey: pool.AudioKey || catalogHit.AudioKey,
          AudioUrl: pool.AudioUrl || catalogHit.AudioUrl,
          MediaUrl: pool.MediaUrl || catalogHit.MediaUrl,
        }
      : pool;
    return withExtraTime(row, extraPoolToQuestion(merged));
  }
  if (row.eventQuestionId != null) {
    return game.questions.find((item) => item.id === row.eventQuestionId) || null;
  }
  if (row.roundId == null) return null;
  const qs = game.questions
    .filter((item) => item.RoundID === row.roundId && !item.ExtraGameId)
    .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
  return (
    qs.find((item) => item.SortIndex === row.index) ||
    qs[Math.max(0, (row.index || 1) - 1)] ||
    qs[0] ||
    null
  );
}

const stageAudioUrl = ref<string | null>(null);
const stageImageUrl = ref<string | null>(null);
let audioToken = 0;
let imageToken = 0;

const stageHasAudio = computed(() => {
  const row = openItem.value;
  if (!row) return Boolean(props.audioUrl);
  const q = eventQuestionOf(row);
  return Boolean(q?.AudioKey || opQuestionAudioUrl(q) || stageAudioUrl.value || props.audioUrl);
});

watch(
  () => {
    const row = openItem.value;
    if (!row) return '';
    const q = eventQuestionOf(row);
    return [props.eventId, q?.id, q?.AudioKey || '', q?.AudioUrl || '', props.audioUrl || ''].join('|');
  },
  async () => {
    const token = ++audioToken;
    const row = openItem.value;
    if (!row) {
      if (token === audioToken) stageAudioUrl.value = props.audioUrl || null;
      return;
    }
    const q = eventQuestionOf(row);
    const fallback = opQuestionAudioUrl(q) || props.audioUrl || null;
    if (token === audioToken) stageAudioUrl.value = fallback;
    if (!props.eventId) return;
    try {
      const next = await resolveOpMediaUrl(props.eventId, q?.AudioKey, fallback);
      if (token === audioToken) stageAudioUrl.value = next;
    } catch {
      if (token === audioToken) stageAudioUrl.value = fallback;
    }
  },
  { immediate: true }
);

watch(
  () => {
    const row = openItem.value;
    if (!row) return '';
    const q = eventQuestionOf(row);
    return [props.eventId, q?.id, q?.ImageKey || '', q?.ImageUrl || '', q?.MediaUrl || '', props.mediaUrl || ''].join('|');
  },
  async () => {
    const token = ++imageToken;
    const row = openItem.value;
    if (!row || row.extraGameId === 'EG2') {
      if (token === imageToken) stageImageUrl.value = row?.kind === 'quiz' ? props.mediaUrl || null : null;
      return;
    }
    const q = eventQuestionOf(row);
    const fallback = opQuestionImageUrl(q) || (row.kind === 'quiz' ? props.mediaUrl : null) || null;
    if (token === imageToken) stageImageUrl.value = fallback;
    if (!props.eventId) return;
    try {
      const next = await resolveOpMediaUrl(props.eventId, q?.ImageKey, fallback);
      if (token === imageToken) stageImageUrl.value = next;
    } catch {
      if (token === imageToken) stageImageUrl.value = fallback;
    }
  },
  { immediate: true }
);

function lobbyTeamsCast(): OpDisplayLobbyTeam[] {
  if (!props.eventId) return [];
  const game = store.getGame(props.eventId);
  return game.teams
    .filter((team) => team.Name.trim())
    .map((team) => {
      const named = game.teamMembers
        .filter((member) => member.TeamID === team.id)
        .map((member) => ({
          nickname: String(member.Nickname || '').trim() || 'Játékos',
        }));
      const count = Math.max(team.MemberCount || 0, named.length);
      const members = named.slice();
      while (members.length < count) members.push({ nickname: 'Játékos' });
      return {
        id: team.id,
        name: team.Name,
        imageUrl: kabalaImageOf(team, store.kabalas, 'full') || '',
        members,
      };
    })
    .filter((team) => team.members.length > 0);
}

function liveRoster() {
  if (!props.eventId) return store.lastPingRosterCount ?? 0;
  const game = store.getGame(props.eventId);
  const seats = game.teams.reduce((sum, team) => sum + (team.MemberCount || 0), 0);
  return Math.max(
    store.lastPingRosterCount ?? 0,
    game.teamMembers.length,
    seats
  );
}

function questionCast(
  row: CatalogItem,
  extra?: { reactGlyph?: string; reactAt?: number; showCorrect?: boolean; tipName?: string; tipTeam?: string; mosaicOutTeamIds?: number[] }
): Partial<OpDisplayCommand> {
  const q = eventQuestionOf(row);
  const live = props.eventId ? store.getGame(props.eventId).live : null;
  const mosaic = row.extraGameId === 'EG2';
  const type = String(q?.TypeCode || '').toLowerCase();
  const freetext = type === 'freetext' || mosaic;
  return {
    type: mosaic ? 'mosaic' : q?.TypeCode || '',
    answers: freetext ? [] : q?.Answers || [],
    matches: freetext ? [] : q?.Matches || [],
    categories: freetext ? [] : q?.Categories || [],
    corrects: freetext ? [] : q?.IsCorrect || [],
    correctText: mosaic ? '' : q ? formatOpQuestionCorrect(q) : row.correct || '',
    showCorrect: Boolean(extra?.showCorrect) && !mosaic,
    mediaUrl: mosaic ? '' : stageImageUrl.value || (q ? opQuestionImageUrl(q) : null) || props.mediaUrl || '',
    timeSec: stageTimeSec(row),
    answerCount: fromLive.value
      ? liveAnswerCountFor(
          live,
          store.lastPingEventId === props.eventId ? store.lastPingAnswerCount : null,
          { eventQuestionId: q?.id ?? row.eventQuestionId, extraQuestionId: row.extraQuestionId }
        )
      : null,
    rosterCount: fromLive.value ? liveRoster() : null,
    reactGlyph: extra?.reactGlyph || '',
    reactAt: extra?.reactAt || 0,
    tipName: extra?.tipName || '',
    tipTeam: extra?.tipTeam || '',
    mosaicOutTeamIds: extra?.mosaicOutTeamIds || [],
  };
}

function openTopics(kind: 'quiz' | 'game') {
  return items.value
    .filter((row) => row.kind === kind && row.status === 'wait' && roundVisible(row))
    .map((row) => ({ id: row.id, title: row.title }));
}

function displayRowsOf(): OpDisplayRow[] {
  return scoreRows.value.map((row) => ({
    name: row.name,
    team: row.team,
    points: row.points,
    previousPoints: row.previous,
  }));
}

async function projectLiveBoard() {
  if (!props.eventId) return;
  const source = standingsSource.value;
  if (source === 'extra' || source === 'compose') return;
  try {
    await showOpLeaderboard(props.eventId, source);
  } catch {
    /* a GET sorai mennek a Caston; a DisplayBoard mentése a BE-n van */
  }
}

async function loadRoundBoard() {
  const roundId = openItem.value?.kind === 'quiz' ? openItem.value.roundId : null;
  if (!props.eventId || roundId == null) {
    roundRows.value = [];
    roundError.value = '';
    return;
  }
  roundLoading.value = true;
  try {
    roundRows.value = await fetchOpLeaderboard(props.eventId, 'raw', { roundId });
    roundError.value = '';
  } catch (error) {
    roundError.value = readAxiosErrorMessage(error, 'Az eredmények nem olvashatók.');
    roundRows.value = [];
  } finally {
    roundLoading.value = false;
  }
}

function acknowledge(which: 'topics' | 'draw' | 'results' | 'standings' | 'join' | 'wall' | '', message: string) {
  sent.value = which;
  castNote.value = message;
  window.clearTimeout(sentTimer);
  sentTimer = window.setTimeout(() => {
    sent.value = '';
  }, 1600);
  $q.notify({ type: 'positive', message, position: 'top', timeout: 1800 });
}

function projectJoin() {
  publish({
    face: 'join',
    kind: 'quiz',
    title: eventName.value,
    prompt: opJoinAbsoluteUrl(),
    sample: false,
  });
  acknowledge('join', 'Belépő képernyő kint a kijelzőn.');
}

function projectTopics() {
  const kind = area.value === 'game' ? 'game' : 'quiz';
  const topics = openTopics(kind);
  publish({
    face: 'topics',
    kind,
    title: kind === 'game' ? 'Játék' : 'Kvíz',
    topics,
  });
  acknowledge(
    'topics',
    topics.length
      ? `Kiküldve a kijelzőre: ${topics.length} nyitott kör.`
      : 'Kiküldve. Nincs el nem kezdett kör.'
  );
}

function projectDraw() {
  const kind = area.value === 'game' ? 'game' : 'quiz';
  const topics = openTopics(kind);
  publish({
    face: 'draw',
    kind,
    title: 'Sorsolás',
    topics,
  });
  acknowledge(
    'draw',
    topics.length ? 'Sorsolás elindult a kijelzőn.' : 'Nincs el nem kezdett kör a sorsoláshoz.'
  );
}

function readyClock(row: CatalogItem) {
  const sec = stageTimeSec(row);
  const totalMs = Math.max(0, sec) * 1000;
  return {
    clockPhase: 'ready' as OpDisplayClockPhase,
    clockTotalMs: totalMs,
    clockLeftMs: totalMs,
    clockEndsAt: 0,
  };
}

function projectQuestion(
  row: CatalogItem,
  clock?: {
    phase: OpDisplayClockPhase;
    totalMs: number;
    leftMs: number;
    endsAt: number;
    hold?: boolean;
    tipName?: string;
    tipTeam?: string;
    outTeamIds?: number[];
  },
  extra?: { reactGlyph?: string; reactAt?: number; showCorrect?: boolean; tipName?: string; tipTeam?: string; mosaicOutTeamIds?: number[] }
) {
  const used = clock || lastClock;
  const mosaic = row.extraGameId === 'EG2';
  publish({
    face: 'question',
    kind: row.kind,
    title: row.title,
    prompt: mosaic ? 'Tippeljetek!' : promptFor(row),
    sortLabel: sortFor(row),
    ...(used
      ? {
          clockPhase: used.phase,
          clockTotalMs: used.totalMs,
          clockLeftMs: used.leftMs,
          clockEndsAt: used.endsAt,
          clockHold: Boolean(used.hold),
        }
      : readyClock(row)),
    ...questionCast(row, {
      ...extra,
      tipName: extra?.tipName || used?.tipName || '',
      tipTeam: extra?.tipTeam || used?.tipTeam || '',
      mosaicOutTeamIds: extra?.mosaicOutTeamIds || used?.outTeamIds || [],
    }),
  });
}

function resultsKind(): 'quiz' | 'game' {
  return showGame.value && !showQuiz.value ? 'game' : 'quiz';
}

function stopStandingsClock() {
  window.clearTimeout(standingsTimer);
  standingsTimer = 0;
  standingsToken += 1;
}

function publishBoard(partial: Partial<OpDisplayCommand>) {
  publish({
    face: 'results',
    kind: resultsKind(),
    board: standingsSource.value === 'compose' ? 'quiz' : standingsSource.value,
    scoreScope: 'total',
    roundId: null,
    extraGameId: '',
    title: scoreCaption.value,
    rows: displayRowsOf(),
    sample: false,
    scoreDecimals: 0,
    ...partial,
  });
}

async function projectStandings() {
  await reloadLeaderboards();
  await projectLiveBoard();
  if (!scoreRows.value.length) {
    $q.notify({
      type: 'warning',
      message: leaderError.value || 'Nincs kivehető eredmény.',
      position: 'top',
      timeout: 1800,
    });
    return;
  }
  stopStandingsClock();
  const token = standingsToken;
  resetCeremony();
  const started = Date.now();
  const every = 3000;
  publishBoard({
    title: `Állás · ${scoreCaption.value}`,
    podiumStep: -1,
    revealMode: 'auto',
    revealCount: 0,
    revealEveryMs: every,
    revealStartedAt: started,
  });
  commitProjectedPoints();
  acknowledge('wall', `Állás elindult: ${scoreCaption.value}.`);
  const tick = () => {
    if (token !== standingsToken) return;
    const rows = scoreRows.value;
    const elapsed = Date.now() - started;
    const count = Math.min(rows.length, 1 + Math.floor(Math.max(0, elapsed) / every));
    const row = rows[rows.length - count];
    castNote.value = row
      ? `${row.place}. hely kint: ${row.name}.${count < rows.length ? ' Következő 3 mp múlva.' : ' Az állás kint.'}`
      : castNote.value;
    if (count < rows.length) standingsTimer = window.setTimeout(tick, every - (elapsed % every));
  };
  tick();
}

async function projectWall() {
  if (wallMode.value === 'ceremony') {
    await enterCeremony();
    return;
  }
  await projectStandings();
}

function onCastResults(mode: 'standings' | 'finale') {
  void projectRoundCast(mode);
}

async function projectRoundCast(mode: 'standings' | 'finale') {
  await loadRoundBoard();
  const roundId = openItem.value?.roundId;
  if (props.eventId && roundId != null) {
    try {
      await showOpLeaderboard(props.eventId, 'raw', { roundId });
    } catch {
      /* a GET sorai mennek a Caston */
    }
  }
  const rows = roundScoreRows.value.map((row) => ({
    name: row.name,
    team: '',
    points: row.points,
    previousPoints: row.previous,
  }));
  if (!rows.length) {
    $q.notify({
      type: 'warning',
      message: roundError.value || 'Nincs kivehető eredmény.',
      position: 'top',
      timeout: 1800,
    });
    return;
  }
  const started = Date.now();
  const every = 3000;
  publish({
    face: 'results',
    kind: 'quiz',
    title: 'Forduló · válaszpontok',
    rows,
    sample: false,
    scoreDecimals: 2,
    podiumStep: -1,
    revealMode: mode === 'finale' ? 'finale' : 'auto',
    revealCount: 0,
    revealEveryMs: every,
    revealStartedAt: started,
  });
}

function publishCeremony(note: string, mark: 'results' | 'wall' | '' = '') {
  publishBoard({
    podiumStep: podiumStep.value,
    revealMode: 'ceremony',
    revealCount: revealCount.value,
    revealEveryMs: 0,
    revealStartedAt: 0,
  });
  acknowledge(mark, `${note} ${scoreCaption.value}.`);
}

function applyCeremonyPlace(place: number, mark: 'results' | 'wall' | '' = '') {
  const rows = scoreRows.value;
  const total = rows.length;
  const at = Math.min(total, Math.max(1, place));
  const tailLen = Math.max(0, total - 3);
  if (at > 3) {
    revealCount.value = total - at + 1;
    podiumStep.value = 0;
  } else {
    revealCount.value = tailLen;
    podiumStep.value = 4 - at;
  }
  ceremonyPlace.value = at;
  const row = rows[at - 1];
  const name = row?.name || '';
  publishCeremony(`${row?.place || at}. hely kint${name ? `: ${name}` : ''}.`, mark);
}

async function enterCeremony() {
  await reloadLeaderboards();
  await projectLiveBoard();
  const total = scoreRows.value.length;
  if (!total) {
    $q.notify({
      type: 'warning',
      message: leaderError.value || 'Nincs kivehető helyezés.',
      position: 'top',
      timeout: 1800,
    });
    return;
  }
  stopStandingsClock();
  applyCeremonyPlace(total, 'wall');
  commitProjectedPoints();
}

function stepCeremony(delta: number) {
  const total = scoreRows.value.length;
  if (!total || ceremonyPlace.value == null) return;
  const next = Math.min(total, Math.max(1, ceremonyPlace.value + delta));
  if (next === ceremonyPlace.value) return;
  applyCeremonyPlace(next);
}

function resetCeremony() {
  podiumStep.value = -1;
  revealCount.value = 0;
  ceremonyPlace.value = null;
}

function podiumLine(rank: number) {
  const row = scoreRows.value[rank - 1];
  if (!row) return '';
  return `${row.place}. hely · ${row.name}`;
}

watch([who, showQuiz, showGame, showExtra, wallMode], () => {
  resetCeremony();
  stopStandingsClock();
  castNote.value = '';
});

onUnmounted(stopStandingsClock);

function projectLobby(row: CatalogItem) {
  lastClock = null;
  publish({
    face: 'lobby',
    kind: row.kind,
    title: row.title,
    teams: lobbyTeamsCast(),
  });
}

function rowQuestionActive(row: CatalogItem) {
  if (!props.eventId) return false;
  const live = store.getGame(props.eventId).live;
  if (row.extraGameId === 'EG2') return false;
  if (row.extraGameId) {
    return (
      live.ExtraGameId === row.extraGameId &&
      String(live.ExtraQuestionStatus || '').toLowerCase() === 'active'
    );
  }
  return (
    live.ActiveRoundID === row.roundId &&
    String(live.QuestionStatus || '').toLowerCase() === 'active'
  );
}

function enter(row: CatalogItem) {
  openItem.value = row;
  if (!rowQuestionActive(row)) projectLobby(row);
}

async function onBegin(row: CatalogItem | null) {
  if (!row) return;
  resetProjectedPoints();
  if (fromLive.value && props.eventId && row.extraGameId) {
    try {
      store.reviveExtraGame(props.eventId, row.extraGameId);
      await startOpExtra(props.eventId, row.extraGameId);
      markExtraClosed(row.extraGameId, false);
      await reloadLive();
      const next = liveItems.value.find((item) => item.id === row.id);
      if (next) openItem.value = { ...next };
    } catch (error) {
      const message = readAxiosErrorMessage(error, 'A játék nem indult.');
      if (!/már|active|folyamat/i.test(message)) {
        $q.notify({ type: 'negative', message, position: 'top' });
        return;
      }
      await reloadLive();
    }
  }
  if (!fromLive.value && row.status !== 'closed') {
    row.status = 'live';
    if (row.total != null && row.index < 1) row.index = 1;
  }
  projectLobby(openItem.value || row);
}

async function onAdvance(row: CatalogItem | null) {
  if (!row || row.total == null) return;
  if (!fromLive.value) {
    if (row.index < row.total) row.index += 1;
    projectLobby(row);
    return;
  }
  await reloadLive();
  const next = liveItems.value.find((item) => item.id === row.id);
  if (next) {
    const stayAtEnd =
      row.total != null && row.index >= row.total && next.index < row.index;
    openItem.value = stayAtEnd
      ? { ...next, index: row.total as number, prompt: row.prompt, correct: row.correct, eventQuestionId: row.eventQuestionId }
      : { ...next };
  }
  projectLobby(openItem.value || row);
}

async function onResults(row: CatalogItem | null) {
  if (!row) return;
  await loadRoundBoard();
  if (props.eventId && !roundScoreRows.value.length) {
    $q.notify({
      type: 'warning',
      message: roundError.value || 'Nincs kivehető eredmény.',
      position: 'top',
      timeout: 1800,
    });
  }
}

let lastMosaicCastKey = '';
let lastMosaicCastAt = 0;

function castMosaicClock(
  row: CatalogItem,
  clock: {
    phase: OpDisplayClockPhase;
    totalMs: number;
    leftMs: number;
    endsAt: number;
    hold?: boolean;
    tipName?: string;
    tipTeam?: string;
    outTeamIds?: number[];
  }
) {
  if (!props.eventId) return;
  const mosaic =
    row.extraGameId === 'EG2' || store.getGame(props.eventId).live.ExtraGameId === 'EG2';
  if (!mosaic) return;
  const hold = Boolean(clock.hold) || clock.phase === 'paused';
  if (!hold && clock.phase !== 'play') return;
  const key = `${clock.phase}|${hold}|${clock.tipName || ''}|${(clock.outTeamIds || []).join(',')}`;
  if (key === lastMosaicCastKey && Date.now() - lastMosaicCastAt < 500) return;
  lastMosaicCastKey = key;
  lastMosaicCastAt = Date.now();
  void castOpDisplay(props.eventId, {
    Face: 'question',
    Kind: 'game',
    Type: 'mosaic',
    ClockPhase: clock.phase,
    ClockHold: hold,
    ClockLeftMs: Math.max(0, Math.round(clock.leftMs)),
    ClockTotalMs: Math.max(0, Math.round(clock.totalMs)),
    ClockEndsAt: hold ? 0 : Math.round(clock.endsAt || 0),
    TipName: clock.tipName || '',
    TipTeam: clock.tipTeam || '',
    MosaicBlocked: hold,
    MosaicOutTeamIds: clock.outTeamIds || [],
  }).catch(() => undefined);
}

function onClock(
  row: CatalogItem | null,
  clock: {
    phase: OpDisplayClockPhase;
    totalMs: number;
    leftMs: number;
    endsAt: number;
    hold?: boolean;
    tipName?: string;
    tipTeam?: string;
    outTeamIds?: number[];
  }
) {
  if (!row) return;
  lastClock = clock;
  const running = clock.phase === 'read' || clock.phase === 'play' || clock.phase === 'paused';
  if (running) {
    projectQuestion(row, clock);
    castMosaicClock(row, clock);
    return;
  }
  if (clock.phase === 'done' && lastFace.value === 'question') {
    projectQuestion(row, clock);
  }
}

function onRevealAnswer(row: CatalogItem | null) {
  if (!row) return;
  lastClock = {
    phase: 'done',
    totalMs: lastClock?.totalMs || Math.max(0, stageTimeSec(row)) * 1000,
    leftMs: 0,
    endsAt: 0,
    hold: false,
  };
  projectQuestion(row, lastClock, { showCorrect: true });
  $q.notify({ type: 'positive', message: 'Helyes válasz kint a kijelzőn.', position: 'top', timeout: 1600 });
}

async function onFinish(_row: CatalogItem | null) {
  openItem.value = null;
}

async function reloadLive() {
  if (!props.eventId) {
    fromLive.value = false;
    return;
  }
  try {
    await store.loadMaster();
    await store.loadGame(props.eventId);
    fromLive.value = true;
    loadError.value = '';
  } catch (error) {
    fromLive.value = false;
    loadError.value = readAxiosErrorMessage(error, 'A fordulók nem olvashatók.');
  }
}

onMounted(() => {
  readVisibleOverride();
  readExtraClosedOverride();
  void reloadLive();
});
watch(
  () => area.value,
  (next) => {
    if (next === 'results') void reloadLeaderboards();
  }
);
let lastPlayerCue = '';
watch(
  () => props.eventId,
  () => {
    lastPlayerCue = '';
    readVisibleOverride();
    readExtraClosedOverride();
    void reloadLive();
  }
);
watch(
  () => ({
    ready: fromLive.value && Boolean(props.eventId),
    onStage: Boolean(openItem.value),
    area: area.value,
  }),
  (next) => {
    if (!next.ready || !props.eventId) return;
    const live = store.getGame(props.eventId).live;
    if (live.ExtraGameId === 'EG2' && String(live.ExtraQuestionStatus || '').toLowerCase() === 'active') {
      return;
    }
    if (
      String(live.QuestionStatus || '').toLowerCase() === 'active' ||
      String(live.ExtraQuestionStatus || '').toLowerCase() === 'active'
    ) {
      return;
    }
    const face: OpPlayerFace = next.onStage
      ? 'lobby'
      : next.area === 'quiz' || next.area === 'game'
        ? 'idle'
        : '';
    if (!face || face === lastPlayerCue) return;
    if (lastFace.value === 'results') return;
    lastPlayerCue = face;
    store.setPlayerFace(props.eventId, face);
    writeOpPlayerFace(props.eventId, face);
    void castOpDisplay(props.eventId, face).catch(() => undefined);
  }
);

watch(
  () =>
    props.eventId
      ? [
          store
            .getGame(props.eventId)
            .teams.map((row) => `${row.id}:${row.MemberCount}`)
            .join(','),
          store
            .getGame(props.eventId)
            .teamMembers.map((row) => `${row.TeamID}:${row.EventUserID}:${row.Nickname || ''}`)
            .join('|'),
        ].join('#')
      : '',
  () => {
    const row = openItem.value;
    if (!row || lastFace.value !== 'lobby') return;
    publish({
      face: 'lobby',
      kind: row.kind,
      title: row.title,
      teams: lobbyTeamsCast(),
    });
  }
);

watch(
  () => store.pingAt,
  () => {
    if (!props.eventId || store.lastPingEventId !== props.eventId) return;
    const action = store.lastPingAction;
    const row = openItem.value;
    if (!row) return;
    if (action === 'Op.SubmitAnswer') {
      if (lastFace.value === 'question') projectQuestion(row);
      return;
    }
    if (action === 'Op.React' && lastFace.value === 'question') {
      projectQuestion(row, lastClock || undefined, {
        reactGlyph: opReactGlyph(store.lastPingGlyph) || store.lastPingGlyph,
        reactAt: Date.now(),
      });
    }
  }
);
</script>

<style scoped>
.op-qh-shell {
  min-height: 100%;
}

.op-confirm {
  width: min(100%, 380px);
  margin: 16px;
  padding: 24px 20px 18px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 12% 0%, rgba(245, 185, 66, 0.22), transparent 42%),
    #120c18;
  border: 1px solid rgba(245, 185, 66, 0.28);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  color: #fff8f2;
  text-align: center;
}

.op-confirm.is-reset {
  background:
    radial-gradient(circle at 12% 0%, rgba(251, 113, 133, 0.2), transparent 42%),
    #160a12;
  border-color: rgba(251, 113, 133, 0.28);
}

.op-confirm__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 20px;
  background: rgba(245, 185, 66, 0.16);
  color: #f5b942;
}

.op-confirm.is-reset .op-confirm__icon {
  background: rgba(251, 113, 133, 0.16);
  color: #fb7185;
}

.op-confirm h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 900;
}

.op-confirm p {
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(255, 248, 242, 0.72);
}

.op-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.op-confirm__btn {
  min-height: 48px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.op-confirm__btn.is-ok {
  background: #f5b942;
  color: #2a1c04;
}

.op-confirm.is-reset .op-confirm__btn.is-ok {
  background: #fb7185;
  color: #2a0c12;
}

.op-qh {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: 16px 16px 28px;
  color: #fff8f2;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 77, 109, 0.55), transparent 36%),
    radial-gradient(circle at 100% 8%, rgba(56, 189, 248, 0.45), transparent 32%),
    #1a0b24;
}

.op-qh.is-game {
  background:
    radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.5), transparent 36%),
    radial-gradient(circle at 100% 8%, rgba(99, 102, 241, 0.45), transparent 32%),
    #06141c;
}

.op-qh__top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.op-qh__top b {
  font-size: 22px;
  font-weight: 900;
}

.op-qh__icon {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff8f2;
  cursor: pointer;
}

.op-qh__top .op-qh__icon:last-child {
  margin-left: auto;
}

.op-qh__menu {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: center;
  gap: 12px;
  padding: 12px 0 8px;
}

.op-qh__launch {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 14px;
  width: 100%;
  min-height: 156px;
  padding: 18px 16px 16px;
  border: 0;
  border-radius: 28px;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
  transition: transform 0.14s ease, filter 0.14s ease;
}

.op-qh__launch:active {
  transform: scale(0.98);
  filter: brightness(0.96);
}

.op-qh__launch-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  flex-shrink: 0;
  border-radius: 20px;
}

.op-qh__launch-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.op-qh__launch-copy strong {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1;
}

.op-qh__launch-copy small {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  opacity: 0.7;
}

.op-qh__launch-go {
  position: absolute;
  top: 16px;
  right: 14px;
  opacity: 0.5;
}

.op-qh__launch.is-join {
  background: linear-gradient(135deg, #7dd3fc 0%, #0ea5e9 52%, #0284c7 100%);
  color: #062033;
}

.op-qh__launch.is-join .op-qh__launch-icon {
  background: rgba(6, 32, 51, 0.16);
}

.op-qh__launch.is-game {
  background: linear-gradient(135deg, #7af0ff 0%, #22d3ee 48%, #0891b2 100%);
  color: #042433;
}

.op-qh__launch.is-game .op-qh__launch-icon {
  background: rgba(4, 36, 51, 0.16);
}

.op-qh__launch.is-quiz {
  background: linear-gradient(135deg, #ff8aa0 0%, #ff4d6d 52%, #e11d48 100%);
  color: #2a0610;
}

.op-qh__launch.is-quiz .op-qh__launch-icon {
  background: rgba(42, 6, 16, 0.16);
}

.op-qh__launch.is-wall {
  background: linear-gradient(135deg, #fff8f2 0%, #ffe08a 58%, #f5b942 100%);
  color: #1a0b24;
}

.op-qh__launch.is-wall .op-qh__launch-icon {
  background: rgba(26, 11, 36, 0.12);
}

.op-qh__cast {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.op-qh__cast button {
  flex: 1;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  font-weight: 900;
  cursor: pointer;
}

.op-qh__cast .is-cast {
  flex: 1;
  background: #fff8f2;
  color: #1a0b24;
}

.op-qh__cast button.is-sent {
  background: #4ade80;
  color: #052e16;
}

.op-qh__stepper {
  margin-bottom: 12px;
}

.op-qh__place {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 800;
}

.op-qh__step {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.op-qh__step button {
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  font-weight: 800;
  cursor: pointer;
}

.op-qh__step button:disabled {
  opacity: 0.38;
  cursor: default;
}

.op-qh__ack {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 800;
  color: #4ade80;
}

.op-qh__hint {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.4;
  color: #94a3b8;
}

.op-qh__hint span {
  display: block;
  margin-top: 4px;
  color: #f5b942;
}

.op-qh__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.op-qh__item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 6px;
  border-radius: 18px;
  background: rgba(255, 248, 242, 0.08);
}

.op-qh__item strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.op-qh__open {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
  min-height: 52px;
  padding: 8px 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #fff8f2;
  cursor: pointer;
  text-align: left;
}

.op-qh__open.is-hidden {
  opacity: 0.45;
}

.op-qh__acts {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  padding-right: 2px;
}

.op-qh__acts button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  min-height: 40px;
  padding: 0;
  border: 1px solid rgba(255, 248, 242, 0.12);
  border-radius: 14px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.12s ease, background 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}

.op-qh__acts button:active:not(:disabled) {
  transform: scale(0.92);
}

.op-qh__acts button.is-lock {
  color: #f5b942;
}

.op-qh__acts button.is-reset {
  color: #7dd3fc;
}

.op-qh__acts button.is-cast {
  color: #5eead4;
}

.op-qh__acts button.is-eye {
  color: #e2e8f0;
}

.op-qh__acts button.is-on {
  background: #f5b942;
  border-color: transparent;
  color: #2a1c04;
  box-shadow: 0 6px 16px rgba(245, 185, 66, 0.28);
}

.op-qh__acts button:disabled {
  opacity: 0.28;
  cursor: default;
  box-shadow: none;
}

.op-qh__list strong,
.op-qh__board strong {
  font-size: 18px;
  font-weight: 900;
}

.op-qh__list em {
  display: block;
  font-style: normal;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.op-qh__list em.is-live,
.op-qh__list em.is-wait {
  color: #7dd3fc;
}

.op-qh__list em.is-closed {
  color: #94a3b8;
}

.op-qh__pick {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.op-qh__pick button,
.op-qh__rounds button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  font-weight: 800;
  cursor: pointer;
}

.op-qh__pick button.is-on,
.op-qh__rounds button.is-on {
  background: #f5b942;
  color: #2a1c04;
}

.op-qh__board,
.op-qh__score ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.op-qh__board li,
.op-qh__score li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 0 16px;
  border-radius: 16px;
  background: rgba(255, 248, 242, 0.08);
}

.op-qh__board li.is-empty {
  color: #94a3b8;
  font-weight: 800;
}

.op-qh__rounds {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.op-qh__caption {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-qh__score li b {
  width: 28px;
  font-size: 18px;
}

.op-qh__score li span {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-weight: 900;
}

.op-qh__score small {
  font-size: 12px;
  font-weight: 700;
  color: #7dd3fc;
}

.op-qh__score li strong {
  font-size: 22px;
}
</style>
