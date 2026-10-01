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
        :intro-ms="QUIZ_READ_MS"
        :paused="clockPaused"
        :face="focusedQuestion?.ExtraGameId ? 'game' : 'quiz'"
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

        <OpPlayerBreak
          v-if="showBreak"
          :type-label="nextBreak?.typeLabel || 'Kérdés'"
          :remaining="nextBreak?.remaining ?? 0"
          :topic="nextBreak?.topic || ''"
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
  extraPoolToQuestion,
  opExtraQuestionTimeSec,
  parseOpUtcMs,
  previewModelFromQuestion,
  teamsFromKabalaIds,
} from '../opData';
import { matchOpExtraGame, normalizeOpTypeCode, opDefaultTimeSec, opTypeLabel } from '../constants';
import { resolveOpMediaUrl } from '../opMediaCache';
import { onOpDisplay, onOpPlayerFace, readOpDisplay, readOpPlayerFace, type OpDisplayCommand } from '../opDisplayChannel';
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
const joining = ref(false);
const leaving = ref(false);
const joinError = ref('');
const remoteStatusName = ref('');
const localTeamId = ref<number | null>(null);
let tick: number | null = null;
let statusPoll: number | null = null;

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
  if (live.ExtraGameId) {
    const extraId = live.ExtraGameId;
    const fromPool = game.value.extraPool.filter((row) => row.ExtraGameId === extraId);
    const fromQs = game.value.questions.filter((row) => row.ExtraGameId === extraId);
    const pool = (fromPool.length ? fromPool : fromQs)
      .slice()
      .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
    const currentId = live.ActiveExtraQuestionID;
    const current = pool.find((row) => row.id === currentId);
    const later = pool.filter((row) => !current || row.SortIndex > current.SortIndex);
    const extraStatus = String(live.ExtraQuestionStatus || '').toLowerCase();
    if (extraStatus === 'active') return null;
    const next = later[0] || current || pool[0];
    const named = matchOpExtraGame(extraId);
    return {
      typeLabel: opTypeLabel(normalizeOpTypeCode(next?.TypeCode || '') || next?.TypeCode || 'single'),
      remaining: later.length,
      topic: named?.title || 'Játék',
    };
  }
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
  const next = remaining[0] || qs.find((row) => row.id === currentId) || qs[0];
  return {
    typeLabel: opTypeLabel(normalizeOpTypeCode(next?.TypeCode || '') || next?.TypeCode || 'single'),
    remaining: remaining.length,
    topic: opQuestionTopic(next, game.value, store.topics) || round?.TopicName || '',
  };
});

const localPlayerFace = ref(readOpPlayerFace(eventId.value));
let stopPlayerFace = () => undefined;
let stopDisplay = () => undefined;

function playerFace() {
  return String(game.value.live.PlayerFace || localPlayerFace.value || '').trim().toLowerCase();
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
  const live = game.value.live;
  if (live.ExtraGameId) return String(live.ExtraQuestionStatus || '').toLowerCase() === 'active';
  return String(live.QuestionStatus || '').toLowerCase() === 'active';
}

const showBreak = computed(() => {
  if (myTeamId.value == null) return false;
  if (qmOnCatalog()) return false;
  if (playPhase.value === 'ended' || playPhase.value === 'ceremony') return false;
  if (questionIsActive()) return false;
  return liveInRound();
});

const showWaitingRoom = computed(
  () =>
    myTeamId.value != null &&
    (mosaicOut.value ||
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

function questionStatusOf(row: { id?: number; StatusCode?: string; ExtraGameId?: string | null } | null) {
  const own = String(row?.StatusCode || '').toLowerCase();
  const live = game.value.live;
  if (row?.ExtraGameId) {
    if (live.ActiveExtraQuestionID != null && row.id != null && row.id !== live.ActiveExtraQuestionID) {
      return own || 'pending';
    }
    return own || String(live.ExtraQuestionStatus || '').toLowerCase();
  }
  if (row?.id != null && live.ActiveEventQuestionID != null && row.id !== live.ActiveEventQuestionID) {
    return own || 'pending';
  }
  return own || String(live.QuestionStatus || '').toLowerCase();
}

const focusedQuestion = computed(() => {
  const live = game.value.live;
  if (live.ExtraGameId) {
    const extraId = live.ActiveExtraQuestionID;
    if (extraId == null) return null;
    const pool = game.value.extraPool.find((row) => row.id === extraId);
    if (pool) {
      return extraPoolToQuestion({
        ...pool,
        StatusCode: live.ExtraQuestionStatus || pool.StatusCode || 'active',
        StartedAtUtc: live.StartedAtUtc || pool.StartedAtUtc,
      });
    }
    return null;
  }
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

function questionWindowSec(q: { TimeSec?: number; ExtraGameId?: string | null; QuestionID?: number | null; TypeCode?: string; Prompt?: string; id?: number } | null) {
  const live = game.value.live;
  const extraId = q?.ExtraGameId || live.ExtraGameId;
  if (extraId) {
    return opExtraQuestionTimeSec({
      extraGameId: extraId,
      extraQuestionId: live.ActiveExtraQuestionID,
      question: q,
      extraPool: game.value.extraPool,
      extraCatalog: game.value.extraCatalog,
      repoQuestions: game.value.repoQuestions,
    });
  }
  if (q?.QuestionID != null) {
    const repo = game.value.repoQuestions.find((item) => item.id === q.QuestionID);
    if (repo?.TimeSec != null && repo.TimeSec > 0) return repo.TimeSec;
  }
  if (q?.TimeSec != null && q.TimeSec > 0) return q.TimeSec;
  if (q?.TypeCode) return opDefaultTimeSec(q.TypeCode);
  return 20;
}

const mosaicLive = computed(
  () => game.value.live.ExtraGameId === 'EG2' && String(game.value.live.ExtraQuestionStatus || '') !== 'stopped'
);

const mosaicBusy = ref(false);
const mosaicTipTeamId = ref<number | null>(null);
const mosaicTipUserId = ref<number | null>(null);
const mosaicOutTeamIds = ref<number[]>([]);
const mosaicOutTeamNames = ref<string[]>([]);
const mosaicFrozenSec = ref<number | null>(null);
const mosaicResume = ref<{ at: number; leftSec: number } | null>(null);

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

const stageQuestion = computed(() => {
  const row = focusedQuestion.value;
  if (!row || !showQuestionStage.value) return null;
  return {
    ...previewModelFromQuestion(row),
    timeSec: questionWindowSec(row),
    topic: opQuestionTopic(row, game.value, store.topics),
  };
});
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

const skipQuizRead = computed(() => {
  const q = focusedQuestion.value;
  if (!q || q.ExtraGameId) return true;
  if (sawQuizRead(q.id)) return true;
  const start = startedAtMs.value;
  if (start == null) return false;
  nowMs.value;
  return Date.now() - start > QUIZ_READ_MS + 2500;
});

const clockPaused = computed(() => {
  if (game.value.live.ClockPaused) return true;
  if (game.value.live.DisplayClockPhase === 'paused') return true;
  if (store.lastPingEventId != null && String(store.lastPingEventId) !== eventId.value) return false;
  if (store.lastPingAction === 'Op.MosaicBuzz') return true;
  if (store.lastPingAction === 'Op.PauseQuestion' && store.lastPingHold === true) return true;
  return (
    store.lastPingAction === 'Op.CastDisplay' &&
    (store.lastPingHold === true || store.lastPingClockPhase === 'paused')
  );
});

function playRemainingSec() {
  const q = focusedQuestion.value;
  if (!q || !showQuestionStage.value) return 0;
  if (questionStatusOf(q) === 'stopped') return 0;
  const total = questionWindowSec(q);
  if (total <= 0) return 0;
  const serverStart = startedAtMs.value;
  const started = serverStart ?? clockAt.value;
  if (started == null) return total;
  const readMs = serverStart != null && !q.ExtraGameId ? QUIZ_READ_MS : 0;
  const playAt = started + readMs;
  if (nowMs.value < playAt) return total;
  return Math.max(0, total - (nowMs.value - playAt) / 1000);
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
  if (clockPaused.value || mosaicFrozenSec.value != null || mosaicTipTeamId.value != null) {
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
  const total = game.value.extraPool.filter((item) => item.ExtraGameId === 'EG2').length;
  const index = row.SortIndex || 1;
  return total > 0 ? `${index}/${total}` : String(index);
});
const mosaicCanTip = computed(
  () => mosaicLive.value && showQuestionStage.value && !mosaicOut.value && !mosaicHold.value && !mosaicBusy.value
);

function onStageReady() {
  markQuizRead(focusedQuestion.value?.id);
  if (clockAt.value != null) return;
  const start = startedAtMs.value;
  if (start != null && Date.now() - start > QUIZ_READ_MS) {
    clockAt.value = start + QUIZ_READ_MS;
    return;
  }
  clockAt.value = Date.now();
}

watch(
  () => focusedQuestion.value?.id ?? null,
  () => {
    clockAt.value = null;
  }
);

watch(
  () => game.value.live.ActiveExtraQuestionID ?? null,
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
    if (paused || phase === 'paused' || tipName) {
      freezeMosaicClock(leftMs != null ? leftMs / 1000 : null);
      if (mosaicTipTeamId.value == null && tipTeam) {
        const name = String(tipTeam).trim().toLowerCase();
        const team =
          game.value.teams.find((row) => row.Name.trim().toLowerCase() === name) ||
          lobbyTeams.value.find((row) => row.Name.trim().toLowerCase() === name);
        if (team?.id != null) mosaicTipTeamId.value = team.id;
      }
    }
    const outIds = game.value.live.MosaicOutTeamIds || [];
    mosaicOutTeamIds.value = [...outIds];
    if (!outIds.length) mosaicOutTeamNames.value = [];
    else for (const id of outIds) markTeamOut(id);
    void outKey;
  }
);

let mosaicSync: number | null = null;
watch(
  () => mosaicLive.value,
  (on) => {
    if (mosaicSync != null) {
      window.clearInterval(mosaicSync);
      mosaicSync = null;
    }
    if (!on || numericEventId.value == null) return;
    const pull = () => {
      if (numericEventId.value == null) return;
      void store.loadGame(numericEventId.value);
    };
    pull();
    mosaicSync = window.setInterval(pull, 280);
  }
);

watch(clockPaused, (paused) => {
  if (paused) freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
}, { flush: 'sync' });

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
      if (store.lastPingHold || store.lastPingClockPhase === 'paused') {
        freezeMosaicClock(store.lastPingLeftMs != null ? store.lastPingLeftMs / 1000 : null);
        if (mosaicTipTeamId.value == null) {
          mosaicTipTeamId.value = resolvePingTeamId();
          mosaicTipUserId.value = store.lastPingEventUserId;
        }
      }
      mosaicOutTeamIds.value = [...outIds];
      if (!outIds.length) mosaicOutTeamNames.value = [];
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
      store.lastPingAction === 'Op.React'
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
    } catch {
      /* a váróterem státusz-szöveggel akkor is kell */
    }
  } finally {
    lobbyInFlight = false;
  }
}

function itemsFromSubmit(payload: Record<string, unknown>) {
  const type = String(payload.TypeCode || '');
  if (type === 'single') {
    const indexes = Array.isArray(payload.Indexes) ? payload.Indexes : [];
    return { Index: Number(indexes[0] ?? 0) };
  }
  if (type === 'multi' || type === 'order') return { Indexes: payload.Indexes || [] };
  if (type === 'freetext') return { Text: payload.Text || '' };
  if (type === 'category') return { Buckets: payload.Buckets || {} };
  if (type === 'match') return { Matches: payload.Matches || {} };
  return payload;
}

async function onSubmitted(payload: Record<string, unknown>) {
  const q = focusedQuestion.value;
  if (!q || numericEventId.value == null) return;
  if (questionStatusOf(q) !== 'active' || clockPaused.value) return;
  const live = game.value.live;
  if (q.ExtraGameId && live.ActiveExtraQuestionID != null && q.id !== live.ActiveExtraQuestionID) return;
  if (!q.ExtraGameId && live.ActiveEventQuestionID != null && q.id !== live.ActiveEventQuestionID) return;
  const cap = Math.max(1, questionWindowSec(q) || 20) * 1000;
  const serverStart = startedAtMs.value;
  const started = serverStart ?? clockAt.value;
  const readMs = serverStart != null && !q.ExtraGameId ? QUIZ_READ_MS : 0;
  const playAt = started != null ? started + readMs : Date.now();
  const elapsed = Math.max(0, Date.now() - playAt);
  try {
    await submitOpAnswer(numericEventId.value, {
      eventQuestionId: q.id,
      items: itemsFromSubmit(payload),
      correct: Boolean(payload.Correct),
      ratio: typeof payload.Ratio === 'number' ? payload.Ratio : payload.Correct ? 1 : 0,
      elapsedMs: Math.min(cap, Math.max(0, elapsed)),
      extra: Boolean(q.ExtraGameId),
    });
  } catch {
    /* a helyi verdikt megmarad; a következő Stop pontozása nélkül esik ki */
  }
}

async function onBuzz() {
  if (numericEventId.value == null || !mosaicCanTip.value || mosaicOut.value) return;
  mosaicBusy.value = true;
  const leftMs = Math.round(remainingSec.value * 1000);
  try {
    await mosaicBuzzOp(numericEventId.value, game.value.live.ActiveExtraQuestionID, {
      leftMs,
      teamId: myTeamId.value,
      teamName: myTeam.value?.Name || '',
      nickname: nickname.value,
      eventUserId: eventUserId.value,
    });
    if (mosaicTipTeamId.value != null && mosaicTipTeamId.value !== myTeamId.value) return;
    if (mosaicTipUserId.value != null && mosaicTipUserId.value !== eventUserId.value) return;
    freezeMosaicClock(leftMs / 1000);
    if (mosaicTipTeamId.value == null) mosaicTipTeamId.value = myTeamId.value;
    if (mosaicTipUserId.value == null) mosaicTipUserId.value = eventUserId.value;
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

function applyMosaicDisplay(command: OpDisplayCommand) {
  if (command.face !== 'question') return;
  const mosaic = command.type === 'mosaic' || game.value.live.ExtraGameId === 'EG2';
  if (!mosaic) return;
  if (command.clockPhase === 'paused' || command.tipName) {
    freezeMosaicClock(command.clockLeftMs > 0 ? command.clockLeftMs / 1000 : null);
    if (mosaicTipTeamId.value == null && command.tipTeam) {
      const name = command.tipTeam.trim().toLowerCase();
      const team =
        game.value.teams.find((row) => row.Name.trim().toLowerCase() === name) ||
        lobbyTeams.value.find((row) => row.Name.trim().toLowerCase() === name);
      if (team?.id != null) mosaicTipTeamId.value = team.id;
    }
  } else if (command.clockPhase === 'play' && mosaicTipTeamId.value == null) {
    resumeMosaicClock(command.clockLeftMs > 0 ? command.clockLeftMs / 1000 : null);
  }
  for (const id of command.mosaicOutTeamIds || []) markTeamOut(id);
}

onMounted(() => {
  void store.loadMaster(true);
  void refreshLobby();
  tick = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 200);
  statusPoll = window.setInterval(() => {
    if (!showQuestionStage.value) void refreshLobby();
  }, 8000);
  stopPlayerFace = onOpPlayerFace((id, face) => {
    if (id !== eventId.value) return;
    localPlayerFace.value = face;
  });
  stopDisplay = onOpDisplay((id, command) => {
    if (String(id) !== eventId.value) return;
    applyMosaicDisplay(command);
  });
  const current = readOpDisplay(eventId.value);
  if (current) applyMosaicDisplay(current);
});

onUnmounted(() => {
  if (tick != null) window.clearInterval(tick);
  if (statusPoll != null) window.clearInterval(statusPoll);
  if (mosaicSync != null) window.clearInterval(mosaicSync);
  stopPlayerFace();
  stopDisplay();
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
}
</style>
