<template>
  <q-page class="op-scope op-player-page">
    <OpPlayerMosaic
      v-if="showQuestionStage && mosaicLive"
      :topic="mosaicTopic"
      :sort-label="mosaicSort"
      :paused="mosaicHold"
      :mine="mosaicMine"
      :can-tip="mosaicCanTip"
      :busy="mosaicBusy"
      @tip="onBuzz"
    />
    <div v-else-if="showQuestionStage && stageQuestion">
      <OpPlayerStage
        :key="`${focusedQuestion?.id || 0}`"
        :question="stageQuestion"
        :media-url="playerImage"
        :remaining-ratio="remainingRatio"
        :remaining-sec="remainingSec"
        :skip-intro="skipQuizRead"
        :hold-read="quizReading"
        :submit-failed="submitFailed"
        :intro-ms="QUIZ_READ_MS"
        :paused="answerPaused"
        :face="manualStage ? 'game' : 'quiz'"
        :listen-only="manualStage"
        :accepting="!quizReading && !answerPaused"
        phase="play"
        @ready="onStageReady"
        @submitted="onSubmitted"
        @reacted="onReacted"
      />
    </div>

    <div v-else>
      <div class="op-glow" :class="{ 'is-stage': showWaitingRoom || showBreak }" aria-hidden="true" />
      <div class="op-inner" :class="{ 'is-wait': showWaitingRoom || showBreak }">
        <div class="op-player-bar">
          <RoleSwitchChip
            :event-id="eventId"
            :current="enteredRole"
            :roles="enterableRoles"
          />
          <button
            type="button"
            class="op-player-close"
            aria-label="Bezárás"
            @click="closePanel"
          >
            <q-icon name="close" size="22px" />
          </button>
        </div>

        <section v-if="!showWaitingRoom && !showBreak" class="manage-panel">
          <div class="manage-panel__brand">
            <img :src="brand.wordmark" alt="Olimpub" />
          </div>
          <h1 class="manage-panel__title">{{ eventName }}</h1>
        </section>

        <section v-if="accessBlocked" class="op-player-denied" role="alert">
          <q-icon name="sym_r_lock" size="32px" />
          <p class="op-player-denied__title">Nem érjük el az estét</p>
          <p class="op-player-denied__text">
            A belépésed lejárt, vagy ehhez az eseményhez nincs jogod ezzel a fiókkal. Csatlakozz újra.
          </p>
          <button type="button" class="op-player-denied__btn" @click="rejoin">Újracsatlakozás</button>
        </section>
        <OpPlayerBreak
          v-else-if="showBreak"
          :type-label="breakInfo?.typeLabel || ''"
          :remaining="breakInfo?.remaining ?? 0"
          :position="breakInfo?.position ?? null"
          :total="breakInfo?.total ?? null"
          :topic="breakInfo?.topic || ''"
        />
        <OpPlayerWaitingRoom
          v-else-if="showWaitingRoom && myTeam"
          :event-name="eventName"
          :team-name="myTeam.Name || ''"
          :image-url="waitingImage"
          :member-count="waitingMemberCount"
          :mates="teammates"
          :leaving="leaving"
          :error="joinError"
          @change-team="onLeaveTeam"
        />
        <OpPlayerLobby
          v-else
          :phase="playPhase"
          :nickname="nickname"
          :teams="lobbyTeams"
          :kabalas="store.kabalas"
          :max-team-size="maxTeamSize"
          :my-team-id="myTeamId"
          :joining="joining"
          :error="joinError"
          @join="onJoinTeam"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import { joinOpTeam, leaveOpTeam, mosaicBuzzOp, reactOp, submitOpAnswer } from '../opApi';
import { applyFetchedOpCurrent, fetchOpCurrent, readOpDeviceSession } from '../opDevice';
import {
  kabalaImageOf,
  opQuestionImageUrl,
  opQuestionTopic,
  buildOpAnswerItems,
  parseOpUtcMs,
  previewModelFromQuestion,
  teamsFromKabalaIds,
} from '../opData';
import { readOpNextCue } from '../opDisplayChannel';
import {
  isNoOptionsType,
  normalizeOpTypeCode,
  normalizeRoundTypeCode,
  stageMarkForRound,
  opDefaultTimeSec,
  opTypeLabel,
} from '../constants';
import { resolveOpMediaUrl } from '../opMediaCache';
import { useOpLiveResync } from '../useOpLiveResync';
import { eventLiveJoinDenied } from 'src/services/signalrService';
import OpPlayerBreak from '../components/OpPlayerBreak.vue';
import OpPlayerLobby from '../components/OpPlayerLobby.vue';
import OpPlayerWaitingRoom from '../components/OpPlayerWaitingRoom.vue';
import OpPlayerMosaic from '../components/OpPlayerMosaic.vue';
import OpPlayerStage from '../components/OpPlayerStage.vue';
import { useAuthStore } from 'src/stores/auth';
import { useEventStore, type EnterableEventRole } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { useOlimpubStore } from 'src/stores/olimpub';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { eventPlayPhase, type EventPlayPhase } from 'src/utils/eventFlow';
import { fetchEventJoinPreview, pickEventUid } from 'src/utils/eventJoin';
import { eventDatasheetKind } from 'src/utils/eventRoleNav';
import '../theme.css';

const brand = OLIMPUB_BRAND;
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const store = useOlimpubStore();

const eventId = computed(() => String(route.params.id));
const numericEventId = computed(() => nullableNumericId(eventId.value));
const nowMs = ref(Date.now());
const clockAt = ref<number | null>(null);
const submitFailed = ref(0);
const joining = ref(false);
const leaving = ref(false);
const joinError = ref('');
const remoteStatusName = ref('');
/** `GET /op/event` 401 / 403: a szerver nem enged be ebbe az eseménybe. */
const accessDenied = ref<number | null>(null);
const accessBlocked = computed(() => accessDenied.value != null || eventLiveJoinDenied.value != null);
const localTeamId = ref<number | null>(null);
let tick: number | null = null;

const game = computed(() => store.getGame(eventId.value));
const settings = computed(
  () => store.getSettingsForEvent(eventId.value) || eventStore.getOpSettingsForEvent(eventId.value)
);
const maxTeamSize = computed(() => settings.value?.MaxTeamSize ?? null);

const dbEvent = computed(() => {
  const targetId = eventId.value;
  return (
    eventStore.events?.find((e: any) => String(e.id) === targetId) ||
    eventStore.myEvents?.find((e: any) => String(e.id) === targetId) ||
    null
  );
});

const eventName = computed(() => {
  const e = dbEvent.value;
  if (e) return String(e.Title || e.EventName || e.Name || 'Olimpub');
  const session = readOpDeviceSession();
  if (session && String(session.eventId) === eventId.value && session.eventTitle) {
    return session.eventTitle;
  }
  return 'Olimpub';
});

const enterableRoles = computed(() => {
  const e = dbEvent.value;
  if (!e) return [];
  return eventStore.getEnterableRolesForEvent(e.id, e.EventTypeID ?? e.eventTypeId);
});

const enteredRole = computed((): EnterableEventRole | null => {
  const roles = enterableRoles.value;
  const qUser = route.query.eventUserId;
  if (qUser != null && qUser !== '') {
    const byUser = roles.find((r) => String(r.eventUserId) === String(qUser));
    if (byUser) return byUser;
  }
  const qRole = route.query.eventRoleId;
  if (qRole != null && qRole !== '') {
    const byRole = roles.find((r) => String(r.eventRoleId) === String(qRole));
    if (byRole) return byRole;
  }
  return (
    roles.find((r) => eventDatasheetKind(r, eventId.value) === 'player') ||
    roles.find((r) => !r.isOrganizer) ||
    roles[0] ||
    null
  );
});

const eventUserId = computed(() => {
  const fromQuery = nullableNumericId(route.query.eventUserId);
  if (fromQuery != null) return fromQuery;
  const fromRole = nullableNumericId(enteredRole.value?.eventUserId);
  if (fromRole != null) return fromRole;
  const fromAuth = nullableNumericId(
    (auth.user as Record<string, unknown> | null)?.EventUserID ??
      (auth.user as Record<string, unknown> | null)?.EventUserId
  );
  if (fromAuth != null) return fromAuth;
  const session = readOpDeviceSession();
  if (session && String(session.eventId) === eventId.value) return session.eventUserId;
  return null;
});

const nickname = computed(() => {
  const session = readOpDeviceSession();
  if (session && String(session.eventId) === eventId.value && session.nickname) {
    return session.nickname;
  }
  return String(auth.currentUserDisplayName || '').trim();
});

const statusLabel = computed(() => {
  if (remoteStatusName.value) return remoteStatusName.value;
  const e = dbEvent.value;
  const fromEvent = String(
    e?.EventStatusName ?? e?.StatusName ?? e?.SName ?? e?.EventStatus ?? e?.statusName ?? ''
  ).trim();
  if (fromEvent) return fromEvent;
  const statusId = e
    ? nullableNumericId(e.EventStatusID ?? e.eventStatusID ?? e.StatusID ?? e.StatusId)
    : null;
  const fromMaster = masterDataStore.getEventStatusNameById(statusId, '');
  if (fromMaster) return fromMaster;
  const session = readOpDeviceSession();
  if (session && String(session.eventId) === eventId.value && session.statusName) {
    return session.statusName;
  }
  return '';
});

const playPhase = computed((): EventPlayPhase => eventPlayPhase(statusLabel.value));

const lobbyTeams = computed(() =>
  teamsFromKabalaIds(
    numericEventId.value,
    settings.value?.KabalaIds || [],
    store.kabalas,
    game.value.teams
  )
);

const teamKey = computed(() => {
  const userId = eventUserId.value;
  if (userId == null) return '';
  return `op_my_team_${eventId.value}_${userId}`;
});

const myTeamId = computed(() => {
  const userId = eventUserId.value;
  const fromMembers =
    userId != null
      ? game.value.teamMembers.find((row) => row.EventUserID === userId)?.TeamID
      : game.value.teamMembers[0]?.TeamID;
  return fromMembers ?? localTeamId.value;
});

const myTeam = computed(
  () => lobbyTeams.value.find((row) => row.id === myTeamId.value) || null
);

const nextBreak = computed(() => {
  const live = game.value.live;
  const roundId = live.ActiveRoundID;
  if (roundId == null && live.FocusedEventQuestionID == null && live.ActiveEventQuestionID == null) {
    return null;
  }
  const round =
    (roundId != null ? game.value.rounds.find((row) => row.id === roundId) : undefined) ||
    game.value.rounds.find((row) =>
      game.value.questions.some(
        (q) =>
          q.RoundID === row.id &&
          (q.id === live.FocusedEventQuestionID || q.id === live.ActiveEventQuestionID)
      )
    );
  if (round && String(round.StatusCode || '').toLowerCase() === 'closed') return null;
  const qs = game.value.questions
    .filter((row) => (round ? row.RoundID === round.id : !row.ExtraGameId) && !row.ExtraGameId)
    .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
  const qStatus = String(live.QuestionStatus || '').toLowerCase();
  const currentId = live.ActiveEventQuestionID ?? live.FocusedEventQuestionID;
  const remaining = qs.filter((row) => {
    const st = String(row.StatusCode || '').toLowerCase();
    if (st === 'stopped' || st === 'closed') return false;
    if (qStatus === 'stopped' && currentId != null && row.id === currentId) return false;
    return true;
  });
  if (qStatus === 'active') return null;
  /* A játékos a GET-ben csak az aktív és a lezárt kérdéseket kapja; a következő (pending) ismeretlen lehet.
     Ilyenkor nem az előző kérdés típusát írjuk ki, hanem üresen hagyjuk. */
  const next = remaining[0];
  /* A típus és a „X/Y" a kvízmester indításáig látszik (a `showBreak` aktív kérdésnél lekapcsol).
     Ha a telefon ismeri a következő sort, abból számol; különben a szerver `Next*` mezőiből. */
  const cue = readOpNextCue(game.value.displayCast);
  const serverTotal = live.RoundQuestionCount ?? null;
  const serverNo = live.NextQuestionNo ?? null;
  const serverType = String(live.NextTypeCode || '').trim();
  let position: number | null = null;
  let total: number | null = null;
  let typeCode = '';
  if (next) {
    typeCode = next.TypeCode || '';
    /* A játékos GET-je csak az aktív / fókuszban lévő kérdést adja (1–2 sor), ezért a helyi darabszám nem igaz:
       a sorszám a sor SortIndexe, az összes a szerver (vagy a QM jelzése) értéke. */
    if (serverTotal != null) {
      position = next.SortIndex > 0 ? next.SortIndex : serverNo;
      total = serverTotal;
    } else if (cue) {
      position = cue.no;
      total = cue.total;
    }
  } else if (cue) {
    position = cue.no;
    total = cue.total;
    typeCode = cue.typeCode;
  } else if (serverTotal != null) {
    position = serverNo;
    total = serverTotal;
    typeCode = serverType;
  }
  if (position != null && total != null && (position < 1 || position > total)) {
    position = null;
    total = null;
    typeCode = '';
  }
  return {
    /* Szóbeli feladatnál (no_options) a típus nem látszik. */
    typeLabel:
      typeCode && !isNoOptionsType(normalizeOpTypeCode(typeCode) || typeCode)
        ? opTypeLabel(normalizeOpTypeCode(typeCode) || typeCode)
        : '',
    remaining: remaining.length,
    position,
    total,
    topic: (next ? opQuestionTopic(next, game.value, store.topics) : '') || round?.TopicName || '',
  };
});

function playerFace() {
  return String(game.value.live.PlayerFace || '').trim().toLowerCase();
}

function liveInRound() {
  const live = game.value.live;
  if (live.ExtraRunID || live.ExtraGameId) return true;
  const roundId = live.ActiveRoundID;
  if (roundId != null) {
    const round = game.value.rounds.find((row) => row.id === roundId);
    if (round && String(round.StatusCode || '').toLowerCase() === 'closed') return false;
    return true;
  }
  return Boolean(live.FocusedEventQuestionID || live.ActiveEventQuestionID);
}

function qmOnCatalog() {
  return playerFace() === 'idle';
}

function questionIsActive() {
  return String(game.value.live.QuestionStatus || '').toLowerCase() === 'active';
}

/** A kérdés már aktív, de a telefon még nem tudja kirajzolni (a GET késve adja a sort). */
const inQuestionGap = computed(
  () =>
    questionIsActive() &&
    !stageRendered.value &&
    !mosaicOut.value &&
    liveInRound() &&
    playPhase.value !== 'ended' &&
    playPhase.value !== 'ceremony'
);

/** Az utolsó nem-kérdés képernyő: a rés alatt ugyanez marad látható, így semmi nem villan fel közte. */
const idleScreen = ref<'break' | 'wait' | ''>('');
const lastBreak = ref<typeof nextBreak.value>(null);

const showBreak = computed(() => {
  if (myTeamId.value == null) return false;
  if (qmOnCatalog()) return false;
  if (playPhase.value === 'ended' || playPhase.value === 'ceremony') return false;
  if (questionIsActive()) return inQuestionGap.value && idleScreen.value === 'break';
  return liveInRound();
});

const breakInfo = computed(() => (questionIsActive() ? lastBreak.value : nextBreak.value));

const showWaitingRoom = computed(
  () =>
    myTeamId.value != null &&
    (mosaicOut.value ||
      /* A kérdés elindult, de még nincs mit kirajzolni: ha a váróból jöttünk, a váróterem marad (nem a csapatválasztó). */
      (inQuestionGap.value && idleScreen.value !== 'break') ||
      (!questionIsActive() &&
        !showBreak.value &&
        (qmOnCatalog() || !liveInRound()) &&
        playPhase.value !== 'ended' &&
        playPhase.value !== 'ceremony' &&
        playPhase.value !== 'before'))
);

const waitingImage = computed(() =>
  myTeam.value ? kabalaImageOf(myTeam.value, store.kabalas, 'full') : ''
);

const teammates = computed(() => {
  const teamId = myTeamId.value;
  if (teamId == null) return [];
  const rows = game.value.teamMembers.filter((row) => row.TeamID === teamId);
  const list = rows.map((row) => {
    const isMe = eventUserId.value != null && row.EventUserID === eventUserId.value;
    const name = String(row.Nickname || '').trim() || (isMe ? nickname.value : '') || 'Játékos';
    return { eventUserId: row.EventUserID, name, isMe };
  });
  if (
    eventUserId.value != null &&
    nickname.value &&
    !list.some((row) => row.isMe)
  ) {
    list.unshift({ eventUserId: eventUserId.value, name: nickname.value, isMe: true });
  }
  return list.sort(
    (a, b) => Number(b.isMe) - Number(a.isMe) || a.name.localeCompare(b.name, 'hu')
  );
});

const waitingMemberCount = computed(() =>
  Math.max(myTeam.value?.MemberCount ?? 0, teammates.value.length)
);

function questionStatusOf(row: { id?: number; StatusCode?: string } | null) {
  const own = String(row?.StatusCode || '').toLowerCase();
  const live = game.value.live;
  if (row?.id != null && live.ActiveEventQuestionID != null && row.id !== live.ActiveEventQuestionID) {
    return own || 'pending';
  }
  const liveStatus = String(live.QuestionStatus || '').toLowerCase();
  /* A ping már aktívra váltotta az élő állapotot, de a sor még a régi (pending) státuszt hordozza: az élő állapot az irányadó. */
  if (row?.id != null && row.id === live.ActiveEventQuestionID && liveStatus === 'active' && own === 'pending') {
    return 'active';
  }
  return own || liveStatus;
}

const focusedQuestion = computed(() => {
  const live = game.value.live;
  const running = String(live.QuestionStatus || '').toLowerCase() === 'active' && live.ActiveEventQuestionID != null;
  const id = running
    ? live.ActiveEventQuestionID
    : live.FocusedEventQuestionID ?? live.ActiveEventQuestionID;
  if (id != null) {
    const hit = game.value.questions.find((row) => row.id === id);
    if (hit) return hit;
  }
  return game.value.questions.find((row) => row.StatusCode === 'active') || null;
});

function questionWindowSec(q: { TimeSec?: number; QuestionID?: number | null; TypeCode?: string; Prompt?: string; id?: number } | null) {
  if (q?.QuestionID != null) {
    const repo = game.value.repoQuestions.find((item) => item.id === q.QuestionID);
    if (repo?.TimeSec != null && repo.TimeSec > 0) return repo.TimeSec;
  }
  if (q?.TimeSec != null && q.TimeSec > 0) return q.TimeSec;
  if (q?.TypeCode) return opDefaultTimeSec(q.TypeCode);
  return 20;
}

/** V2: a Mozaik egy `manual_display` forduló (a cím alapján elkülönítve a Karaoke-tól); az OpLive Extra* mezői üresek. */
const mosaicLive = computed(() => {
  const row = focusedQuestion.value;
  if (!row) return false;
  const round = game.value.rounds.find((item) => item.id === row.RoundID);
  if (!round) return false;
  const title = round.TopicName || opQuestionTopic(row, game.value, store.topics);
  const code = normalizeRoundTypeCode(round.RoundTypeCode);
  return stageMarkForRound(code, title) === 'EG2' && questionStatusOf(row) !== 'stopped';
});

const mosaicBusy = ref(false);
const mosaicTipTeamId = ref<number | null>(null);
const mosaicTipUserId = ref<number | null>(null);
const mosaicOutTeamIds = ref<number[]>([]);
const mosaicOutTeamNames = ref<string[]>([]);
const mosaicFrozenSec = ref<number | null>(null);
const mosaicResume = ref<{ at: number; leftSec: number } | null>(null);

/** A friss tippet (saját vagy érkező Op.MosaicBuzz) ennyi ideig nem írja felül egy régebbi „play” Cast. */
const MOSAIC_BUZZ_GRACE_MS = 4000;
let lastMosaicBuzzAt = 0;

let mosaicReleaseTimer: number | null = null;

/** A QM Castja (GET-ből) újra „play” fázist mutat és nincs tippelő: a hold véget ért.
 *  A CastDisplay ping a BE-ben vékony, ezért ez a megbízható feloldás. A friss tipp védelmi ideje után is ellenőrzünk. */
function releaseMosaicHoldIfPlaying() {
  if (mosaicReleaseTimer != null) {
    window.clearTimeout(mosaicReleaseTimer);
    mosaicReleaseTimer = null;
  }
  if (!mosaicLive.value) return;
  if (mosaicTipTeamId.value == null && mosaicFrozenSec.value == null) return;
  const live = game.value.live;
  if (String(live.DisplayClockPhase || '').toLowerCase() !== 'play' || live.MosaicTipName) return;
  const wait = MOSAIC_BUZZ_GRACE_MS - (Date.now() - lastMosaicBuzzAt);
  if (wait > 0) {
    mosaicReleaseTimer = window.setTimeout(releaseMosaicHoldIfPlaying, wait + 50);
    return;
  }
  resumeMosaicClock(live.ClockLeftMs != null ? live.ClockLeftMs / 1000 : null);
}

function resetMosaicHold() {
  mosaicTipTeamId.value = null;
  mosaicTipUserId.value = null;
  mosaicFrozenSec.value = null;
  mosaicResume.value = null;
}

function resetMosaicQuestion() {
  resetMosaicHold();
  mosaicOutTeamIds.value = [];
  mosaicOutTeamNames.value = [];
}

function markTeamOut(teamId: number | null, teamName = '') {
  if (teamId != null && teamId > 0 && !mosaicOutTeamIds.value.includes(teamId)) {
    mosaicOutTeamIds.value = [...mosaicOutTeamIds.value, teamId];
  }
  const name = String(teamName || '').trim().toLowerCase();
  if (name && !mosaicOutTeamNames.value.includes(name)) {
    mosaicOutTeamNames.value = [...mosaicOutTeamNames.value, name];
  }
}

function resolvePingTeamId() {
  if (store.lastPingTeamId != null) return store.lastPingTeamId;
  const uid = store.lastPingEventUserId;
  if (uid != null) {
    const member = game.value.teamMembers.find((row) => row.EventUserID === uid);
    if (member?.TeamID) return member.TeamID;
  }
  const name = String(store.lastPingTeamName || '').trim().toLowerCase();
  if (!name) return null;
  const fromGame = game.value.teams.find((row) => row.Name.trim().toLowerCase() === name);
  if (fromGame?.id != null) return fromGame.id;
  const fromLobby = lobbyTeams.value.find((row) => row.Name.trim().toLowerCase() === name);
  return fromLobby?.id ?? null;
}

const showQuestionStage = computed(
  () => questionStatusOf(focusedQuestion.value) === 'active' && !mosaicOut.value
);

const manualStage = computed(() => {
  const row = focusedQuestion.value;
  if (!row) return false;
  const round = game.value.rounds.find((item) => item.id === row.RoundID);
  return String(round?.RoundTypeCode || '') === 'manual_display';
});

/** Párbaj (duel_speed): nincs 3 mp felolvasás, a kérdés opciókkal és órával indul. A Gyorsasági (fast_5) és a fő kvíz megtartja a „következő kérdés" bevezetőt. */
const noReadingRound = computed(() => {
  const row = focusedQuestion.value;
  if (!row) return false;
  const round = game.value.rounds.find((item) => item.id === row.RoundID);
  return normalizeRoundTypeCode(round?.RoundTypeCode) === 'duel_speed';
});

const stageQuestion = computed(() => {
  const row = focusedQuestion.value;
  if (!row || !showQuestionStage.value) return null;
  return {
    ...previewModelFromQuestion(row),
    timeSec: questionWindowSec(row),
    topic: opQuestionTopic(row, game.value, store.topics),
  };
});
/** Igaz, ha a sablon tényleg a kérdésoldalt (Mozaik vagy OpPlayerStage) rajzolja ki. */
const stageRendered = computed(
  () => showQuestionStage.value && (mosaicLive.value || stageQuestion.value != null)
);
const playerImage = ref<string | null>(null);

watch(
  focusedQuestion,
  async (row) => {
    const direct = row ? opQuestionImageUrl(row) : null;
    if (direct && /^https?:\/\//i.test(direct)) {
      playerImage.value = direct;
      return;
    }
    playerImage.value = row ? await resolveOpMediaUrl(eventId.value, row.ImageKey, direct) : null;
  },
  { immediate: true }
);

const QUIZ_READ_MS = 3000;

const startedAtMs = computed(() => {
  const q = focusedQuestion.value;
  return parseOpUtcMs(q?.StartedAtUtc) ?? parseOpUtcMs(game.value.live.StartedAtUtc);
});

function readSeenKey(questionId: number) {
  return `opPlayerRead:${eventId.value}:${questionId}`;
}

function sawQuizRead(questionId: number | null | undefined) {
  if (questionId == null) return false;
  try {
    return sessionStorage.getItem(readSeenKey(questionId)) === '1';
  } catch {
    return false;
  }
}

function markQuizRead(questionId: number | null | undefined) {
  if (questionId == null) return;
  try {
    sessionStorage.setItem(readSeenKey(questionId), '1');
  } catch {
    /* a 3 mp akkor is lejátszható */
  }
}

const answerStartedMs = computed(() => parseOpUtcMs(game.value.live.AnswerStartedAtUtc));

/** Felolvasás: a szerver még nem indította a válaszidőt (`AnswerStartedAtUtc` üres). */
const quizReading = computed(() => {
  const q = focusedQuestion.value;
  if (!q || q.ExtraGameId || manualStage.value || noReadingRound.value) return false;
  if (questionStatusOf(q) !== 'active') return false;
  return game.value.live.ClockPaused && answerStartedMs.value == null;
});

/** Szünet a válaszidő közben. A felolvasás ClockPaused értéke nem ez. */
const answerPaused = computed(() => game.value.live.ClockPaused && answerStartedMs.value != null);

const skipQuizRead = computed(() => {
  const q = focusedQuestion.value;
  if (!q || q.ExtraGameId || noReadingRound.value) return true;
  if (sawQuizRead(q.id)) return true;
  const start = startedAtMs.value;
  if (start == null) return false;
  nowMs.value;
  return Date.now() - start > QUIZ_READ_MS + 2500;
});

/** A Mozaik kérdésnél a QM stage nem küld Op.StartClock-ot, így a StartQuestion ClockPaused=1 értéke
 *  végig megmarad. Ez nem tipp: csak az elindult válaszidő alatti szünet számít szünetnek. */
function serverClockPaused() {
  const live = game.value.live;
  if (!live.ClockPaused) return false;
  return !(mosaicLive.value && answerStartedMs.value == null);
}

const clockPaused = computed(() => {
  if (serverClockPaused()) return true;
  if (game.value.live.DisplayClockPhase === 'paused') return true;
  if (store.lastPingEventId != null && String(store.lastPingEventId) !== eventId.value) return false;
  if (store.lastPingAction === 'Op.MosaicBuzz') return true;
  if (store.lastPingAction === 'Op.PauseQuestion' && store.lastPingHold === true) return true;
  /* A QM stage a 3 mp-es felolvasás alatt is hold=true Castot küld; ez nem tipp. */
  return (
    store.lastPingAction === 'Op.CastDisplay' &&
    store.lastPingClockPhase !== 'read' &&
    (store.lastPingHold === true || store.lastPingClockPhase === 'paused')
  );
});

function playRemainingSec() {
  const q = focusedQuestion.value;
  if (!q || !showQuestionStage.value) return 0;
  if (questionStatusOf(q) === 'stopped') return 0;
  const total = questionWindowSec(q);
  if (total <= 0) return 0;
  const answerStart = q.ExtraGameId ? startedAtMs.value : answerStartedMs.value;
  const started = answerStart ?? clockAt.value;
  if (started == null) return total;
  if (game.value.live.ClockPaused && game.value.live.ClockLeftMs != null && answerStartedMs.value != null) {
    return Math.max(0, game.value.live.ClockLeftMs / 1000);
  }
  return Math.max(0, total - (nowMs.value - started) / 1000);
}

function freezeMosaicClock(leftSec?: number | null) {
  mosaicResume.value = null;
  if (mosaicFrozenSec.value != null) return;
  if (leftSec != null && Number.isFinite(leftSec)) {
    mosaicFrozenSec.value = Math.max(0, leftSec);
    return;
  }
  mosaicFrozenSec.value = playRemainingSec();
}

function resumeMosaicClock(leftSec?: number | null) {
  const left = leftSec != null && Number.isFinite(leftSec) ? leftSec : mosaicFrozenSec.value;
  mosaicTipTeamId.value = null;
  mosaicTipUserId.value = null;
  mosaicFrozenSec.value = null;
  mosaicResume.value =
    left != null && Number.isFinite(left) ? { at: Date.now(), leftSec: Math.max(0, left) } : null;
}

function frozenLeftSec() {
  if (mosaicFrozenSec.value != null) return mosaicFrozenSec.value;
  const leftMs = game.value.live.ClockLeftMs ?? store.lastPingLeftMs;
  if (leftMs != null) return Math.max(0, leftMs / 1000);
  return playRemainingSec();
}

const remainingSec = computed(() => {
  if (
    mosaicFrozenSec.value != null ||
    mosaicTipTeamId.value != null ||
    (mosaicLive.value && clockPaused.value) ||
    (!mosaicLive.value && answerPaused.value)
  ) {
    return frozenLeftSec();
  }
  if (mosaicResume.value) {
    return Math.max(0, mosaicResume.value.leftSec - (nowMs.value - mosaicResume.value.at) / 1000);
  }
  return playRemainingSec();
});

const mosaicHold = computed(
  () =>
    mosaicLive.value &&
    (mosaicTipTeamId.value != null ||
      mosaicFrozenSec.value != null ||
      clockPaused.value ||
      Boolean(game.value.live.MosaicTipName))
);
const mosaicOut = computed(() => {
  if (
    myTeamId.value != null &&
    game.value.penalties.some(
      (row) => row.TeamID === myTeamId.value && row.PenaltyTypeCode === 'mozaik_wrong' && row.UndoOfID == null
    )
  ) {
    return true;
  }
  if (myTeamId.value != null && mosaicOutTeamIds.value.includes(myTeamId.value)) return true;
  const name = String(myTeam.value?.Name || '').trim().toLowerCase();
  return Boolean(name && mosaicOutTeamNames.value.includes(name));
});
const mosaicMine = computed(
  () =>
    mosaicHold.value &&
    !mosaicOut.value &&
    ((mosaicTipUserId.value != null && mosaicTipUserId.value === eventUserId.value) ||
      (mosaicTipUserId.value == null &&
        mosaicTipTeamId.value != null &&
        mosaicTipTeamId.value === myTeamId.value))
);
const mosaicTopic = computed(
  () => stageQuestion.value?.topic || opQuestionTopic(focusedQuestion.value, game.value, store.topics)
);
const mosaicSort = computed(() => {
  const row = focusedQuestion.value;
  if (!row) return '';
  /* A játékos listája szűkített, ezért a forduló összes kérdését a szerver adja (ha van). */
  const counted = game.value.questions.filter((item) => item.RoundID === row.RoundID).length;
  const total = Math.max(counted, game.value.live.RoundQuestionCount ?? 0);
  const index = row.SortIndex || 1;
  return total > 0 ? `${index}/${total}` : String(index);
});
const mosaicCanTip = computed(
  () => mosaicLive.value && showQuestionStage.value && !mosaicOut.value && !mosaicHold.value && !mosaicBusy.value
);

/* Az azonnali watch minden függőségét (mosaicOut, stageRendered) azok deklarációja UTÁN kell létrehozni,
   különben oldalfrissítéskor (csapattal) "Cannot access ... before initialization" hiba jön. */
watch(
  [showBreak, showWaitingRoom, nextBreak],
  () => {
    if (questionIsActive()) return;
    idleScreen.value = showBreak.value ? 'break' : showWaitingRoom.value ? 'wait' : '';
    if (showBreak.value) lastBreak.value = nextBreak.value;
  },
  { immediate: true }
);

function armAnswerClock() {
  if (answerStartedMs.value != null || clockAt.value != null) return;
  clockAt.value = Date.now();
}

function onStageReady() {
  markQuizRead(focusedQuestion.value?.id);
  if (quizReading.value) return;
  armAnswerClock();
}

/** Ugyanaz a kérdés újranyílt (Op.ReopenQuestion): a régi helyi óra nem érvényes, a tipp visszaszámlálása újra indul. */
watch(quizReading, (reading, was) => {
  if (!reading || reading === was) return;
  clockAt.value = null;
  submitFailed.value = 0;
});

watch(
  () => showQuestionStage.value && !quizReading.value && !answerPaused.value,
  (open) => {
    if (open) armAnswerClock();
  }
);

watch(
  () => focusedQuestion.value?.id ?? null,
  (id, prev) => {
    if (id === prev) return;
    clockAt.value = null;
    submitFailed.value = 0;
    if (showQuestionStage.value && !quizReading.value && !answerPaused.value) armAnswerClock();
  }
);

watch(
  () => (mosaicLive.value ? focusedQuestion.value?.id ?? null : null),
  (id, prev) => {
    if (id == null || id === prev) return;
    resetMosaicQuestion();
  }
);

watch(mosaicHold, (on) => {
  if (on) freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
}, { flush: 'sync' });

watch(
  () =>
    [
      game.value.live.ClockPaused,
      game.value.live.DisplayClockPhase,
      game.value.live.ClockLeftMs,
      game.value.live.MosaicTipTeam,
      game.value.live.MosaicTipName,
      (game.value.live.MosaicOutTeamIds || []).join(','),
    ] as const,
  ([paused, phase, leftMs, tipTeam, tipName, outKey]) => {
    if (!mosaicLive.value) return;
    if (serverClockPaused() || phase === 'paused' || tipName) {
      freezeMosaicClock(leftMs != null ? leftMs / 1000 : null);
      if (mosaicTipTeamId.value == null && tipTeam) {
        const name = String(tipTeam).trim().toLowerCase();
        const team =
          game.value.teams.find((row) => row.Name.trim().toLowerCase() === name) ||
          lobbyTeams.value.find((row) => row.Name.trim().toLowerCase() === name);
        if (team?.id != null) mosaicTipTeamId.value = team.id;
      }
    } else {
      releaseMosaicHoldIfPlaying();
    }
    const outIds = game.value.live.MosaicOutTeamIds || [];
    mosaicOutTeamIds.value = [...outIds];
    if (!outIds.length) mosaicOutTeamNames.value = [];
    else for (const id of outIds) markTeamOut(id);
    void outKey;
  }
);

watch(clockPaused, (paused) => {
  if (paused && mosaicLive.value) {
    freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
  }
}, { flush: 'sync' });

/** Kvíz kérdésnél a mozaik fagyasztás nem élhet: az óra a StartClock / AnswerStartedAtUtc alapján fut. */
watch(
  () => [focusedQuestion.value?.id ?? null, mosaicLive.value] as const,
  ([, mosaic]) => {
    if (!mosaic) resetMosaicHold();
  },
  { immediate: true }
);

const remainingRatio = computed(() => {
  const total = questionWindowSec(focusedQuestion.value) || 1;
  return Math.max(0, Math.min(1, remainingSec.value / total));
});

let lobbyInFlight = false;
watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId != null && String(store.lastPingEventId) !== eventId.value) return;
    const action = store.lastPingAction;
    if (action === 'Op.StartExtraQuestion' || action === 'Op.StartExtra') {
      resetMosaicQuestion();
      return;
    }
    if (action === 'Op.MosaicBuzz') {
      lastMosaicBuzzAt = Date.now();
      freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
      const teamId = resolvePingTeamId();
      if (teamId != null && mosaicOutTeamIds.value.includes(teamId)) return;
      if (mosaicTipTeamId.value == null) {
        mosaicTipTeamId.value = teamId;
        mosaicTipUserId.value = store.lastPingEventUserId;
      }
      return;
    }
    if (action === 'Op.CastDisplay') {
      const outIds = game.value.live.MosaicOutTeamIds || [];
      if (!store.lastPingHold && store.lastPingClockPhase === 'play' && !outIds.length) {
        resetMosaicQuestion();
        return;
      }
      const readingCast = store.lastPingClockPhase === 'read';
      if ((store.lastPingHold && !readingCast) || store.lastPingClockPhase === 'paused') {
        freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
        if (mosaicTipTeamId.value == null) {
          mosaicTipTeamId.value = resolvePingTeamId();
          mosaicTipUserId.value = store.lastPingEventUserId;
        }
      }
      mosaicOutTeamIds.value = [...outIds];
      if (!outIds.length) mosaicOutTeamNames.value = [];
      /* Rossz tipp után a QM „play” Castja (a bővített ping hordozza a fázist) oldja a holdot, a kiesett csapat listájával. */
      if (!store.lastPingHold && store.lastPingClockPhase === 'play') releaseMosaicHoldIfPlaying();
      return;
    }
    if (action === 'Op.PauseQuestion') {
      if (store.lastPingHold) {
        freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
      } else if (mosaicTipTeamId.value == null) {
        resumeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
      }
      return;
    }
    if (action === 'Op.MosaicJudge') {
      const teamId = resolvePingTeamId();
      if (store.lastPingCorrectFlg === true) {
        resetMosaicQuestion();
        return;
      }
      markTeamOut(teamId, store.lastPingTeamName);
      resumeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
    }
  }
);

watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId != null && String(store.lastPingEventId) !== eventId.value) return;
    if (
      store.lastPingAction === 'Op.MosaicBuzz' ||
      store.lastPingAction === 'Op.PauseQuestion' ||
      store.lastPingAction === 'Op.MosaicJudge' ||
      store.lastPingAction === 'Op.CastDisplay' ||
      store.lastPingAction === 'Op.React' ||
      store.lastPingAction === 'Op.Presence'
    ) {
      return;
    }
    if (lobbyInFlight) return;
    void refreshLobby();
  }
);

watch(showQuestionStage, (on, was) => {
  if (was && !on) void refreshLobby();
});

watch(
  teamKey,
  (key) => {
    if (!key) return;
    localTeamId.value = nullableNumericId(localStorage.getItem(key));
  },
  { immediate: true }
);

function closePanel() {
  void router.replace({ path: `/event/${eventId.value}` });
}

async function refreshLobby() {
  if (lobbyInFlight) return;
  lobbyInFlight = true;
  try {
    const uid = pickEventUid(dbEvent.value);
    if (uid) {
      try {
        const preview = await fetchEventJoinPreview(uid);
        if (preview.EventStatusName) {
          remoteStatusName.value = preview.EventStatusName;
          if (numericEventId.value != null) {
            eventStore.applyOpLiveStatus({
              eventId: numericEventId.value,
              title: preview.Title,
              statusName: preview.EventStatusName,
              statusId: null,
            });
          }
        }
      } catch {
        /* a join preview opcionális */
      }
    }
    try {
      const current = await fetchOpCurrent();
      if (current && String(current.eventId) === eventId.value) {
        remoteStatusName.value = current.statusName || remoteStatusName.value;
        await applyFetchedOpCurrent(current);
      }
    } catch {
      /* a státusz a store-ból marad */
    }
    try {
      await store.loadGame(eventId.value);
      accessDenied.value = null;
    } catch (error) {
      const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
      if (status === 401 || status === 403) accessDenied.value = status;
      /* egyéb hibánál a váróterem státusz-szöveggel akkor is kell */
    }
  } finally {
    lobbyInFlight = false;
  }
}

async function onSubmitted(payload: Record<string, unknown>) {
  const q = focusedQuestion.value;
  if (!q || numericEventId.value == null) return;
  if (questionStatusOf(q) !== 'active') return;
  if (q.ExtraGameId ? clockPaused.value : quizReading.value || answerPaused.value) return;
  const live = game.value.live;
  if (q.ExtraGameId && live.ActiveExtraQuestionID != null && q.id !== live.ActiveExtraQuestionID) return;
  if (!q.ExtraGameId && live.ActiveEventQuestionID != null && q.id !== live.ActiveEventQuestionID) return;
  const cap = Math.max(1, questionWindowSec(q) || 20) * 1000;
  const started = (q.ExtraGameId ? startedAtMs.value : answerStartedMs.value) ?? clockAt.value;
  const elapsed = Math.max(0, Date.now() - (started ?? Date.now()));
  try {
    await submitOpAnswer(numericEventId.value, {
      eventQuestionId: q.id,
      items: buildOpAnswerItems(q, payload),
      correct: Boolean(payload.Correct),
      ratio: typeof payload.Ratio === 'number' ? payload.Ratio : payload.Correct ? 1 : 0,
      elapsedMs: Math.min(cap, Math.max(0, elapsed)),
      extra: Boolean(q.ExtraGameId),
    });
  } catch {
    submitFailed.value += 1;
    /* a helyi verdikt megmarad; a következő Stop pontozása nélkül esik ki */
  }
}

async function onBuzz() {
  if (numericEventId.value == null || !mosaicCanTip.value || mosaicOut.value) return;
  mosaicBusy.value = true;
  lastMosaicBuzzAt = Date.now();
  const leftMs = Math.round(remainingSec.value * 1000);
  try {
    await mosaicBuzzOp(numericEventId.value, focusedQuestion.value?.id ?? null, {
      leftMs,
      teamId: myTeamId.value,
      teamName: myTeam.value?.Name || '',
      nickname: nickname.value,
      eventUserId: eventUserId.value,
    });
    /* A BE az első érvényes tippet fogadja el, a többit csendben eldobja (válasz mindkét esetben sikeres).
       Nyertest nem feltételezünk: az Op.MosaicBuzz ping jelzi, ki nyert. Ha a ping nem jön, a GET dönt. */
    if (mosaicTipTeamId.value == null) {
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      if (mosaicTipTeamId.value == null && numericEventId.value != null) {
        await store.loadGame(String(numericEventId.value)).catch(() => undefined);
      }
    }
  } catch {
    if (mosaicTipTeamId.value == null) resetMosaicHold();
  } finally {
    mosaicBusy.value = false;
  }
}

async function onReacted(glyph: string) {
  if (numericEventId.value == null) return;
  try {
    await reactOp(numericEventId.value, glyph);
  } catch {
    /* a TV ping nélkül is megjeleníti a gombot; ne dobjuk a kérdést */
  }
}

async function onLeaveTeam() {
  if (leaving.value || joining.value || numericEventId.value == null) return;
  if (questionStatusOf(focusedQuestion.value) === 'active') {
    joinError.value = 'A kérdés alatt nem válthatsz csapatot.';
    return;
  }
  leaving.value = true;
  joinError.value = '';
  try {
    await leaveOpTeam(numericEventId.value);
    localTeamId.value = null;
    if (teamKey.value) localStorage.removeItem(teamKey.value);
    store.dropOwnTeam(eventId.value, eventUserId.value);
    await store.loadGame(eventId.value);
  } catch (error) {
    joinError.value = readAxiosErrorMessage(error, 'A csapatváltás nem sikerült.');
  } finally {
    leaving.value = false;
  }
}

async function onJoinTeam(teamId: number) {
  if (joining.value || numericEventId.value == null) return;
  if (myTeamId.value != null && myTeamId.value !== teamId) return;
  if (myTeamId.value === teamId) return;
  joining.value = true;
  joinError.value = '';
  try {
    const team = lobbyTeams.value.find((row) => row.id === teamId);
    await joinOpTeam(numericEventId.value, teamId, team?.KabalaID);
    localTeamId.value = teamId;
    if (teamKey.value) localStorage.setItem(teamKey.value, String(teamId));
    await store.loadGame(eventId.value);
  } catch (error) {
    joinError.value = readAxiosErrorMessage(error, 'A csapathoz csatlakozás nem sikerült.');
  } finally {
    joining.value = false;
  }
}
/* Belépéskor teljes betöltés (kérdések megoldással), utána a GET csak az állapotot kéri (`?scope=live`). */
store.startPlayerSync(eventId.value);
useOpLiveResync(
  numericEventId,
  () => {
    /* Újracsatlakozás / csend után biztosan teljes szinkron, hogy a lokális kérdéslista friss legyen. */
    store.resetFullSync(eventId.value);
    return refreshLobby();
  },
  { blocked: () => accessBlocked.value }
);

function rejoin() {
  void router.push({ name: 'olimpub-join' });
}

watch(
  () => String(dbEvent.value?.EventStatusID ?? ''),
  (next, prev) => {
    if (prev && next && next !== prev) void refreshLobby();
  }
);

onMounted(() => {
  void store.loadMaster(true);
  void refreshLobby();
  tick = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 200);
});

/* Ha a kérdés aktív, de a telefon még nem tud kirajzolni (a GET késve vagy üresen jött, a StartClock ping pedig nem tölt újra),
   addig kérdezzük újra a szervert, amíg a kérdés meg nem jelenik. */
let gapTimer: number | null = null;

function stopGapPolling() {
  if (gapTimer != null) window.clearInterval(gapTimer);
  gapTimer = null;
}

watch(
  inQuestionGap,
  (gap) => {
    stopGapPolling();
    if (!gap) return;
    let tries = 0;
    gapTimer = window.setInterval(() => {
      tries += 1;
      if (!inQuestionGap.value || tries > 20) {
        stopGapPolling();
        return;
      }
      /* Ha a kérdés itt azért nem rajzolható ki, mert a sor hiányzik a helyi listából, a teljes betöltés hozza meg. */
      store.resetFullSync(String(numericEventId.value));
      void store.loadGame(String(numericEventId.value)).catch(() => undefined);
    }, 700);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (tick != null) window.clearInterval(tick);
  stopGapPolling();
  store.stopPlayerSync(eventId.value);
});
</script>

<style scoped>
.op-player-page {
  padding: 0;
  min-height: 100vh;
  background: var(--op-page);
}

.op-player-page :deep(.op-play) {
  min-height: 100vh;
  border-radius: 0;
}

.op-glow.is-stage {
  background:
    radial-gradient(ellipse 78% 52% at 50% 36%, rgba(245, 185, 66, 0.26), transparent 58%),
    radial-gradient(circle at 50% 92%, rgba(245, 185, 66, 0.1), transparent 42%),
    radial-gradient(circle at 88% 12%, rgba(245, 185, 66, 0.08), transparent 34%);
}

.op-inner.is-wait {
  padding-top: 0.75rem;
}

.op-player-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  position: relative;
  z-index: 2;
}

.manage-panel {
  position: relative;
  overflow: hidden;
  background: var(--op-panel);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(245, 185, 66, 0.18);
  border-radius: var(--op-radius);
  padding: 16px 16px 18px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), 0 0 40px rgba(245, 185, 66, 0.06);
  margin-bottom: 16px;
}

.op-player-close {
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.op-player-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.manage-panel__brand {
  display: flex;
  justify-content: center;
  margin: 4px 0 10px;
}

.manage-panel__brand img {
  height: 72px;
  width: auto;
  max-width: 380px;
  object-fit: contain;
  background: transparent;
}

.manage-panel__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--op-cream);
  text-align: center;

.op-player-denied {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 24px 20px;
  background: var(--op-panel);
  border: 1px solid rgba(251, 113, 133, 0.28);
  border-radius: var(--op-radius);
  color: #fb7185;
  text-align: center;
}

.op-player-denied__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--op-cream);
}

.op-player-denied__text {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.4;
}

.op-player-denied__btn {
  margin-top: 8px;
  padding: 10px 22px;
  border: 0;
  border-radius: 9999px;
  background: #f5b942;
  color: #120c18;
  font-weight: 800;
  cursor: pointer;
}
}
</style>
