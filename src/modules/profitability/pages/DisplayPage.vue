<template>
  <q-layout view="hHh lpR fFf" class="pta-scope pta-wall">
    <q-page-container class="pta-wall__container">
      <q-page class="pta-wall__page">
        <div class="pta-wall__stage">
          <div class="pta-wall__watermark" aria-hidden="true">
            <img src="~assets/eventjoy_icon.svg" alt="" />
          </div>

          <header class="pta-wall__header">
            <div class="pta-wall__heading">
              <p class="pta-wall__kicker">PROFI-T-ABILITY</p>
              <h1 class="pta-wall__title">{{ eventName }}</h1>
              <p v-if="wallState !== 'idle' && (wallState === 'seating' || wallState === 'ceremony' || wallState === 'roundstand' || !isIdle)" class="pta-wall__caption">
                {{ wallCaption }}
              </p>
            </div>
            <div class="pta-wall__tools">
              <button
                type="button"
                class="pta-wall__tool"
                :aria-label="isFullscreen ? 'Kilépés a teljes képernyőből' : 'Teljes képernyő'"
                @click="toggleFullscreen"
              >
                <q-icon :name="isFullscreen ? 'sym_r_fullscreen_exit' : 'sym_r_fullscreen'" size="22px" />
              </button>
              <button
                v-if="!kioskMode"
                type="button"
                class="pta-wall__tool"
                aria-label="Bezárás"
                @click="leaveDisplay"
              >
                <q-icon name="close" size="22px" />
              </button>
            </div>
          </header>

          <section v-if="bootError && kioskMode" class="pta-wall__idle">
            <q-icon name="sym_r_lock" class="pta-wall__idle-icon" />
            <p class="pta-wall__idle-title">{{ bootError }}</p>
            <form class="pta-wall__pin" @submit.prevent="submitPin">
              <input
                v-model="pinInput"
                class="pta-wall__pin-input"
                inputmode="numeric"
                maxlength="4"
                autocomplete="one-time-code"
                placeholder="PIN"
              />
              <button type="submit" class="pta-wall__pin-btn">Belépés</button>
            </form>
          </section>

          <section v-else-if="wallState === 'idle'" class="pta-wall__idle">
            <q-icon name="emoji_events" class="pta-wall__idle-icon" />
            <p class="pta-wall__idle-title">Várakozás a kivetítésre.</p>
          </section>

          <section v-else-if="wallState === 'seating'" ref="seatsRef" class="pta-wall__seats">
            <div v-if="!seatingList.length" class="pta-wall__idle">
              <p class="pta-wall__idle-title">Nincs ülésrend ebben a fordulóban.</p>
            </div>
            <template v-else>
              <div class="pta-seat-list" :style="{ '--cols': String(seatingColumns.length || 1) }">
                <div v-for="(col, colIndex) in seatingColumns" :key="colIndex" class="pta-seat-list__col">
                  <div class="pta-seat-list__head" aria-hidden="true">
                    <span>Név / csapat</span>
                    <span class="pta-seat-list__meta">Asztal</span>
                  </div>
                  <div
                    v-for="row in col"
                    :key="row.key"
                    class="pta-seat-list__row"
                  >
                    <span class="pta-seat-list__who">
                      <span class="pta-seat-list__name">{{ row.name }}</span>
                      <span class="pta-seat-list__team">{{ row.team || '—' }}</span>
                    </span>
                    <span class="pta-seat-list__meta">
                      <span class="pta-seat-list__desk">{{ row.deskNo }}</span>
                      <i class="pta-seat-list__swatch" :style="{ background: row.color }" />
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="seatingPageCount > 1" class="pta-wall__pager">
                <span class="pta-wall__pager-label">{{ pageIndex + 1 }} / {{ seatingPageCount }}</span>
                <span
                  v-for="n in seatingPageCount"
                  :key="n"
                  class="pta-wall__pager-dot"
                  :class="{ 'is-on': n - 1 === pageIndex }"
                />
              </div>
            </template>
          </section>

          <section v-else-if="wallState === 'ceremony'" class="pta-wall__ceremony">
            <div v-if="!ceremonyRow" class="pta-wall__idle">
              <p class="pta-wall__idle-title">Még nincs publikált eredmény.</p>
            </div>
            <Transition v-else name="pta-ceremony" mode="out-in">
              <article
                :key="ceremonyRow.place + '-' + ceremonyRow.name"
                class="pta-ceremony"
                :class="{
                  'is-first': ceremonyRow.place === 1,
                  'is-second': ceremonyRow.place === 2,
                  'is-third': ceremonyRow.place === 3,
                }"
              >
                <p v-if="ceremonyMedal" class="pta-ceremony__medal">{{ ceremonyMedal }}</p>
                <p class="pta-ceremony__kicker">Dobogó</p>
                <p class="pta-ceremony__place">{{ ceremonyRow.place }}</p>
                <h2 class="pta-ceremony__name">{{ ceremonyRow.name }}</h2>
                <p v-if="ceremonyRow.subLine" class="pta-ceremony__sub">{{ ceremonyRow.subLine }}</p>
                <div class="pta-ceremony__stats">
                  <span class="pta-ceremony__stat">
                    <img :src="scoreIcon" alt="" />
                    {{ ceremonyRow.amount }}
                  </span>
                  <span class="pta-ceremony__stat">
                    <img :src="scoreTruckIcon" alt="" />
                    {{ ceremonyRow.onTrack }}
                  </span>
                  <span class="pta-ceremony__points">{{ ceremonyRow.resultPoint }} e</span>
                </div>
              </article>
            </Transition>
          </section>

          <section v-else-if="wallState === 'roundstand'" class="pta-wall__progress">
            <div v-if="!roundstandDesks.length" class="pta-wall__idle">
              <p class="pta-wall__idle-title">Nincs asztal ebben a fordulóban.</p>
            </div>
            <template v-else>
              <p class="pta-progress__count">
                <span class="pta-progress__done">{{ roundstandClosedCount }}</span>
                <span class="pta-progress__slash">/</span>
                <span>{{ roundstandDesks.length }}</span>
              </p>
              <p class="pta-progress__label">asztal lezárva</p>
              <div class="pta-progress__bar" aria-hidden="true">
                <i :style="{ width: roundstandClosedRatio + '%' }" />
              </div>
              <div class="pta-progress__cols">
                <div class="pta-progress__col">
                  <h2 class="pta-progress__head">Függő</h2>
                  <p v-if="!roundstandPending.length" class="pta-progress__empty">Minden asztal kész.</p>
                  <p v-for="desk in roundstandPending" :key="'p-' + desk.id" class="pta-progress__desk">
                    {{ desk.name }}
                  </p>
                </div>
                <div class="pta-progress__col is-done">
                  <h2 class="pta-progress__head">Lezárt</h2>
                  <p v-if="!roundstandClosed.length" class="pta-progress__empty">Még nincs lezárt asztal.</p>
                  <p v-for="desk in roundstandClosed" :key="'c-' + desk.id" class="pta-progress__desk">
                    {{ desk.name }}
                  </p>
                </div>
              </div>
            </template>
          </section>

          <section v-else-if="isIdle" class="pta-wall__idle">
            <q-icon name="emoji_events" class="pta-wall__idle-icon" />
            <p class="pta-wall__idle-title">Még nincs publikált eredmény.</p>
          </section>

          <section v-else ref="boardRef" class="pta-wall__board">
            <div v-if="!displayRows.length" class="pta-wall__idle">
              <p class="pta-wall__idle-title">Nincs megjeleníthető eredmény.</p>
            </div>
            <template v-else>
              <div class="pta-wall__grid" :style="{ '--cols': String(pageColumns.length || 1) }">
                <div v-for="(col, colIndex) in pageColumns" :key="colIndex" class="pta-wall__col">
                  <div class="pta-wall__cols" aria-hidden="true">
                    <span class="pta-wall__place" />
                    <span class="pta-wall__name" />
                    <img :src="scoreIcon" alt="" class="pta-wall__icon pta-wall__score" />
                    <img :src="scoreTruckIcon" alt="" class="pta-wall__icon pta-wall__truck" />
                    <span class="pta-wall__points" />
                  </div>
                  <div
                    v-for="row in col"
                    :key="(groupKey || 'player') + '-' + (row.playerId || row.name) + '-' + row.place"
                    class="pta-wall__row"
                    :class="{
                      'is-first': row.place === 1,
                      'is-second': row.place === 2,
                      'is-third': row.place === 3,
                    }"
                  >
                    <span class="pta-wall__place">{{ row.place }}</span>
                    <span class="pta-wall__name">
                      <span class="pta-wall__label">{{ row.name }}</span>
                      <span v-if="row.subLine" class="pta-wall__count">{{ row.subLine }}</span>
                    </span>
                    <span class="pta-wall__score">{{ row.amount }}</span>
                    <span class="pta-wall__truck">{{ row.onTrack }}</span>
                    <span class="pta-wall__points">{{ row.resultPoint }} e</span>
                  </div>
                </div>
              </div>
              <div v-if="pageCount > 1" class="pta-wall__pager">
                <span class="pta-wall__pager-label">{{ pageIndex + 1 }} / {{ pageCount }}</span>
                <span
                  v-for="n in pageCount"
                  :key="n"
                  class="pta-wall__pager-dot"
                  :class="{ 'is-on': n - 1 === pageIndex }"
                />
              </div>
            </template>
          </section>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { eventRoleQuery } from 'src/utils/eventRoleNav';
import { useEventStore } from 'src/stores/event';
import { useAuthStore } from 'src/stores/auth';
import { readAxiosErrorMessage, nullableNumericId } from 'src/utils/apiPayload';
import { connectToEventLive, disconnectEventLive, setSignalRDisplayToken } from 'src/services/signalrService';
import {
  fetchPtaDisplay,
  hasDisplaySession,
  onPtaDeskDisplayDirty,
  onPtaShowDisplayPing,
  onStoredDisplayCommand,
  openPtaDisplaySession,
  parsePtaDisplayState,
  readStoredDisplayCommand,
  readStoredDisplayToken,
  type PtaDisplayRemoteState,
  type PtaDisplayWallState,
} from 'src/modules/profitability/ptaDisplayApi';
import {
  bindSchedulesToRoundDesk,
  ptaDeskNumber,
  ptaEventDeskId,
  ptaEventRoundId,
  ptaRoundDeskId,
  ptaRoundDesksForEventRound,
  ptaSchedulePlayerId,
  ptaScheduleRoundDeskId,
  resolvePtaSeatName,
  type EventGroupingKey,
} from 'src/modules/profitability/ptaData';
import { ptaSeatColorFromRow } from 'src/modules/profitability/drawEngine';
import {
  parseResultsScope,
  usePtaStandings,
} from 'src/modules/profitability/usePtaStandings';
import { pickLatestReleasedRoundId, pickOpenRoundId, deskHasRecordedResults } from 'src/modules/profitability/standings';
import '../theme.css';
import scoreIcon from '../assets/Score.png';
import scoreTruckIcon from '../assets/ScoreTruck.png';

const PAGE_MS = 8000;
const FEED_POLL_MS = 10000;
const TWO_COL_MIN_WIDTH = 880;
const ROW_MIN = 58;
const HEAD_H = 28;
const PAGER_H = 28;
const SEAT_ROW_MIN = 44;
const SEAT_HEAD_H = 28;

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const authStore = useAuthStore();
const isFullscreen = ref(false);
const boardRef = ref<HTMLElement | null>(null);
const seatsRef = ref<HTMLElement | null>(null);
const boardWidth = ref(1280);
const boardHeight = ref(720);
const pageIndex = ref(0);
const kioskMode = ref(false);
const wallState = ref<PtaDisplayWallState>('leaderboard');
const commandedState = ref<PtaDisplayWallState | null>(null);
const seatingRoundId = ref<number | null>(null);
const ceremonyPlace = ref(8);
const followRemote = ref(false);
const bootError = ref('');
const pinInput = ref('');

const DISPLAY_CONTROL_QUERY = ['view', 'roundId', 'scope', 'group', 'state'] as const;

const {
  eventId,
  eventName,
  enterableRoles,
  enteredRole,
  isStaffView,
  selectedRoundId,
  scope,
  groupKey,
  rounds,
  visibleRounds,
  hasDraw,
  standings,
  groupingAttrs,
  groupingValueForPlayer,
  standingsCaption,
  playerGroupLine,
} = usePtaStandings({ publishedOnly: true, feed: 'display' });

const isIdle = computed(() => !hasDraw.value || visibleRounds.value.length === 0);

const carouselKey = ref<EventGroupingKey | null>(null);
const carouselIndex = ref(0);
let groupTimer: ReturnType<typeof setInterval> | null = null;

scope.value = parseResultsScope(route.query.scope) || 'total';
groupKey.value = null;

const groupValues = computed(() => {
  const key = carouselKey.value;
  if (!key) return [];
  const values = new Set<string>();
  for (const row of standings.value) {
    const value = groupingValueForPlayer(row.playerId, key);
    if (value && value !== 'Nincs megadva') values.add(value);
  }
  return [...values];
});

const currentGroupValue = computed(() => {
  if (!groupValues.value.length) return '';
  return groupValues.value[carouselIndex.value % groupValues.value.length] || '';
});

const wallGroupingLabel = computed(() => {
  if (!carouselKey.value) return 'Játékos';
  const attr = groupingAttrs.value.find((item) => item.key === carouselKey.value);
  const prefix = attr?.label || 'Csoport';
  return currentGroupValue.value ? `${prefix} · ${currentGroupValue.value}` : prefix;
});

const wallCaption = computed(() => {
  if (wallState.value === 'seating') {
    return `${seatingRoundLabel.value} · Ülésrend`;
  }
  if (wallState.value === 'roundstand') {
    return `${seatingRoundLabel.value} · Forduló állás`;
  }
  if (wallState.value === 'ceremony') {
    return `${standingsCaption.value} · Dobogó`;
  }
  return `${standingsCaption.value} · ${wallGroupingLabel.value}`;
});

type SeatingSeat = {
  playerId: number | null;
  name: string;
  team: string;
  color: string;
};

type SeatingTable = {
  id: number;
  deskNo: number;
  seats: SeatingSeat[];
};

function formatRoundCaption(order: number, name: string) {
  const n = Number.isFinite(order) && order > 0 ? Math.round(order) : 0;
  const raw = String(name || '').trim();
  if (n > 0 && !/\d/.test(raw)) return `${n}. forduló`;
  if (raw) return raw;
  return n > 0 ? `${n}. forduló` : 'Forduló';
}

function liveRoundRows() {
  return eventStore.getPtaRoundsForEvent(eventId.value).map((row, index) => {
    const id = ptaEventRoundId(row) ?? nullableNumericId(row.id) ?? index + 1;
    const order = Number(row.OrderIndex ?? index + 1);
    const name = String(row.RName || '').trim();
    return { id, order, label: formatRoundCaption(order, name), status: String(row.SName || '') };
  });
}

const effectiveSeatingRoundId = computed(() => {
  if (seatingRoundId.value != null) return seatingRoundId.value;
  if (selectedRoundId.value != null) return selectedRoundId.value;
  const live = liveRoundRows();
  return pickOpenRoundId(live) ?? live[0]?.id ?? null;
});

const seatingRoundLabel = computed(() => {
  const id = effectiveSeatingRoundId.value;
  const row =
    rounds.value.find((item) => item.id === id) ||
    liveRoundRows().find((item) => item.id === id) ||
    visibleRounds.value.find((item) => item.id === id);
  if (!row) return 'Forduló';
  return formatRoundCaption(row.order, row.label);
});

function seatingLiveSource() {
  const rounds = eventStore.getPtaRoundsForEvent(eventId.value);
  const roundIds = new Set(
    rounds
      .map((row) => ptaEventRoundId(row) ?? nullableNumericId(row.id))
      .filter((id): id is number => id != null)
  );
  const roundDesks = eventStore.ptaEventRoundDesks.filter((row) => {
    const rid = ptaEventRoundId(row);
    return rid != null && roundIds.has(rid);
  });
  const deskIds = new Set(
    roundDesks.map((row) => ptaRoundDeskId(row)).filter((id): id is number => id != null)
  );
  const schedules = eventStore.ptaGameSchedules.filter((row) => {
    const sid = ptaScheduleRoundDeskId(row);
    if (sid != null) return deskIds.has(sid);
    const rid = ptaEventRoundId(row);
    return rid != null && roundIds.has(rid);
  });
  const livePlayers = [...eventStore.getPtaPlayersForEvent(eventId.value), ...eventStore.ptaEventPlayers];
  return {
    desks: eventStore.getPtaDesksForEvent(eventId.value),
    roundDesks,
    schedules,
    players: livePlayers,
    people: [
      ...eventStore.getParticipantDirectoryForEvent(eventId.value),
      ...eventStore.getEventParticipantsForEvent(eventId.value),
      ...eventStore.getEventUsersForEvent(eventId.value),
    ],
  };
}

function seatingDataSource() {
  const roundId = effectiveSeatingRoundId.value;
  const live = seatingLiveSource();
  const liveMatch = ptaRoundDesksForEventRound(roundId, live.roundDesks, live.schedules);
  if (liveMatch.length) return live;
  if (!kioskMode.value && (live.roundDesks.length || live.schedules.length)) return live;
  const feed = eventStore.ptaDisplayFeed;
  if (!feed || feed.eventId !== eventId.value) {
    return live.roundDesks.length || live.schedules.length ? live : null;
  }
  const feedMatch = ptaRoundDesksForEventRound(roundId, feed.roundDesks, feed.schedules);
  if (feedMatch.length) {
    return {
      desks: feed.desks.length ? feed.desks : live.desks,
      roundDesks: feed.roundDesks,
      schedules: live.schedules.length ? live.schedules : feed.schedules,
      players: live.players.length ? live.players : feed.players,
      people: live.people,
    };
  }
  if (live.roundDesks.length || live.schedules.length) return live;
  if (feed.roundDesks.length || feed.schedules.length) {
    return {
      desks: feed.desks,
      roundDesks: feed.roundDesks,
      schedules: feed.schedules,
      players: feed.players.length ? feed.players : live.players,
      people: live.people,
    };
  }
  return null;
}

const seatingTables = computed<SeatingTable[]>(() => {
  const roundId = effectiveSeatingRoundId.value;
  const source = seatingDataSource();
  if (roundId == null || !source) return [];
  const roundDesks = ptaRoundDesksForEventRound(roundId, source.roundDesks, source.schedules);
  if (!roundDesks.length) return [];
  const roundSchedules = source.schedules.filter((row) => {
    const sid = ptaEventRoundId(row) ?? nullableNumericId(row.RoundId ?? row.roundId);
    return sid == null || sid === roundId;
  });
  return roundDesks
    .map((rd) => {
      const roundDeskId = ptaRoundDeskId(rd);
      const deskId = ptaEventDeskId(rd);
      const desk = source.desks.find((row) => ptaEventDeskId(row) === deskId);
      const seats = bindSchedulesToRoundDesk(rd, roundSchedules, roundDesks)
        .slice()
        .sort(
          (a, b) =>
            Number(a.SeatNo ?? a.ColorIndex ?? 0) - Number(b.SeatNo ?? b.ColorIndex ?? 0)
        )
        .map((row) => {
          const playerId = ptaSchedulePlayerId(row);
          const teamRaw =
            playerId != null ? groupingValueForPlayer(playerId, 'team') : String(row.TeamName || '').trim();
          const team = teamRaw && teamRaw !== 'Nincs megadva' ? teamRaw : '';
          return {
            playerId,
            name: resolvePtaSeatName({
              playerId,
              players: source.players,
              people: source.people,
              eventId: eventId.value,
              schedule: row,
            }),
            team,
            color: ptaSeatColorFromRow(row),
          };
        });
      return {
        id: roundDeskId ?? deskId ?? 0,
        deskNo: ptaDeskNumber(rd) || ptaDeskNumber(desk),
        seats,
      };
    })
    .filter((table) => table.seats.length)
    .sort((a, b) => (a.deskNo || a.id) - (b.deskNo || b.id))
    .map((table, index) => ({
      ...table,
      deskNo: table.deskNo || index + 1,
    }));
});

const seatingList = computed(() => {
  const rows = seatingTables.value.flatMap((table) =>
    table.seats.map((seat) => ({
      key: `${table.id}-${seat.playerId || seat.name}`,
      name: seat.name,
      team: seat.team,
      deskNo: table.deskNo,
      color: seat.color,
    }))
  );
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'hu', { sensitivity: 'base', numeric: true }));
});

const seatingColCount = computed(() => {
  const n = seatingList.value.length;
  if (n <= 16) return 1;
  if (boardWidth.value < TWO_COL_MIN_WIDTH) return 1;
  if (n <= 36) return 2;
  return 3;
});

const seatingRowsPerCol = computed(() => {
  const usable = boardHeight.value - SEAT_HEAD_H - PAGER_H;
  if (usable < SEAT_ROW_MIN * 6) return 8;
  return Math.max(6, Math.floor(usable / SEAT_ROW_MIN));
});

const seatingPageSize = computed(() => Math.max(1, seatingColCount.value * seatingRowsPerCol.value));
const seatingPageCount = computed(() =>
  Math.max(1, Math.ceil(seatingList.value.length / seatingPageSize.value))
);

const seatingPageRows = computed(() => {
  const start = pageIndex.value * seatingPageSize.value;
  return seatingList.value.slice(start, start + seatingPageSize.value);
});

const seatingColumns = computed(() => {
  const rows = seatingPageRows.value;
  const cols = seatingColCount.value;
  if (cols <= 1 || rows.length <= seatingRowsPerCol.value) return [rows];
  const perCol = Math.min(seatingRowsPerCol.value, Math.ceil(rows.length / cols));
  const out = [];
  for (let i = 0; i < cols; i += 1) {
    const chunk = rows.slice(i * perCol, (i + 1) * perCol);
    if (chunk.length) out.push(chunk);
  }
  return out.length ? out : [rows];
});

const roundstandDesks = computed(() => {
  const roundId = effectiveSeatingRoundId.value;
  const source = seatingDataSource();
  if (roundId == null || !source) return [];
  const roundDesks = ptaRoundDesksForEventRound(roundId, source.roundDesks, source.schedules);
  const round =
    liveRoundRows().find((row) => row.id === roundId) ||
    visibleRounds.value.find((row) => row.id === roundId);
  const status = round?.status || '';
  return roundDesks
    .map((rd, index) => {
      const deskId = ptaEventDeskId(rd);
      const desk = source.desks.find((row) => ptaEventDeskId(row) === deskId);
      const deskNo = ptaDeskNumber(rd) || ptaDeskNumber(desk) || index + 1;
      return {
        id: ptaRoundDeskId(rd) ?? deskId ?? index + 1,
        deskNo,
        name: String(rd.DName || desk?.DName || `${deskNo}. asztal`).trim() || `${deskNo}. asztal`,
        closed: deskHasRecordedResults(rd, status, source.schedules, roundDesks),
      };
    })
    .sort((a, b) => a.deskNo - b.deskNo);
});

const roundstandClosed = computed(() => roundstandDesks.value.filter((desk) => desk.closed));
const roundstandPending = computed(() => roundstandDesks.value.filter((desk) => !desk.closed));
const roundstandClosedCount = computed(() => roundstandClosed.value.length);
const roundstandClosedRatio = computed(() => {
  const total = roundstandDesks.value.length;
  if (!total) return 0;
  return Math.round((roundstandClosedCount.value / total) * 100);
});

watch(
  visibleRounds,
  (list) => {
    if (kioskMode.value || followRemote.value) return;
    if (selectedRoundId.value != null && list.some((round) => round.id === selectedRoundId.value)) return;
    selectedRoundId.value = pickLatestReleasedRoundId(list);
  },
  { immediate: true }
);

watch(
  [enterableRoles, isStaffView],
  () => {
    if (kioskMode.value) return;
    if (!enterableRoles.value.length) return;
    if (isStaffView.value) return;
    void router.replace({
      path: `/profitability/event/${eventId.value}/results`,
      query: eventRoleQuery(enteredRole.value),
    });
  },
  { immediate: true }
);

const displayRows = computed(() => {
  const key = carouselKey.value;
  const current = currentGroupValue.value;
  const source =
    key && current
      ? standings.value.filter((row) => groupingValueForPlayer(row.playerId, key) === current)
      : standings.value;
  return source.map((row, index) => ({
    ...row,
    place: index + 1,
    subLine: playerGroupLine(row.playerId),
  }));
});

const ceremonyMax = computed(() => Math.max(0, Math.min(8, displayRows.value.length)));

const ceremonyRow = computed(() => {
  const place = ceremonyPlace.value;
  return displayRows.value.find((row) => row.place === place) || null;
});

const ceremonyMedal = computed(() => {
  const place = ceremonyRow.value?.place;
  if (place === 1) return 'Arany';
  if (place === 2) return 'Ezüst';
  if (place === 3) return 'Bronz';
  return '';
});

const rowsPerCol = computed(() => {
  const usable = boardHeight.value - HEAD_H - PAGER_H;
  if (usable < ROW_MIN * 4) return 8;
  return Math.max(5, Math.min(12, Math.floor(usable / ROW_MIN)));
});

const colCount = computed(() => {
  if (displayRows.value.length <= rowsPerCol.value) return 1;
  return boardWidth.value >= TWO_COL_MIN_WIDTH ? 2 : 1;
});

const pageSize = computed(() => Math.max(1, colCount.value * rowsPerCol.value));
const pageCount = computed(() => Math.max(1, Math.ceil(displayRows.value.length / pageSize.value)));

const pageRows = computed(() => {
  const start = pageIndex.value * pageSize.value;
  return displayRows.value.slice(start, start + pageSize.value);
});

const pageColumns = computed(() => {
  const rows = pageRows.value;
  const cols = colCount.value;
  if (cols <= 1 || rows.length <= rowsPerCol.value) return [rows];
  const perCol = Math.min(rowsPerCol.value, Math.ceil(rows.length / cols));
  const out = [];
  for (let i = 0; i < cols; i += 1) {
    const chunk = rows.slice(i * perCol, (i + 1) * perCol);
    if (chunk.length) out.push(chunk);
  }
  return out.length ? out : [rows];
});

watch(pageCount, (count) => {
  if (wallState.value !== 'seating' && pageIndex.value >= count) pageIndex.value = 0;
});

watch(seatingPageCount, (count) => {
  if (wallState.value === 'seating' && pageIndex.value >= count) pageIndex.value = 0;
});

watch(
  () => displayRows.value.length,
  () => {
    if (wallState.value !== 'seating') pageIndex.value = 0;
  }
);

watch(
  () => [wallState.value, seatingRoundId.value, seatingList.value.length] as const,
  () => {
    pageIndex.value = 0;
  }
);

function applyUrlControlHint() {
  const view = String(route.query.view || route.query.state || '').toLowerCase();
  const qRound = Number(route.query.roundId);
  if (view === 'seating') {
    commandedState.value = 'seating';
    wallState.value = 'seating';
  } else if (view === 'ceremony' || view === 'podium') {
    commandedState.value = 'ceremony';
    wallState.value = 'ceremony';
  } else if (view === 'roundstand' || view === 'progress') {
    commandedState.value = 'roundstand';
    wallState.value = 'roundstand';
  } else if (view === 'idle') {
    commandedState.value = 'idle';
    wallState.value = 'idle';
  }
  if (Number.isFinite(qRound) && qRound > 0) seatingRoundId.value = qRound;
}

function clampCeremonyPlace() {
  const max = ceremonyMax.value;
  if (max <= 0) return;
  if (ceremonyPlace.value > max) ceremonyPlace.value = max;
  if (ceremonyPlace.value < 1) ceremonyPlace.value = max;
}

function applyRemoteDisplayState(remote: PtaDisplayRemoteState | null, fromGet = false) {
  if (remote) {
    const keepSeating = commandedState.value === 'seating' && remote.state !== 'idle';
    const keepRoundstand =
      commandedState.value === 'roundstand' &&
      remote.state !== 'idle' &&
      remote.state !== 'ceremony' &&
      remote.state !== 'seating';
    const keepCeremony =
      commandedState.value === 'ceremony' &&
      remote.state !== 'idle' &&
      remote.state !== 'seating' &&
      remote.state !== 'roundstand';
    wallState.value = keepSeating
      ? 'seating'
      : keepRoundstand
        ? 'roundstand'
        : keepCeremony
          ? 'ceremony'
          : remote.state;
    if (remote.roundId != null) {
      selectedRoundId.value = remote.roundId;
      if (wallState.value === 'seating' || wallState.value === 'roundstand') {
        seatingRoundId.value = remote.roundId;
      }
    }
    if (remote.state === 'ceremony' && !fromGet) {
      if (remote.place != null) ceremonyPlace.value = remote.place;
    }
    if (wallState.value === 'seating' || wallState.value === 'roundstand') {
      scope.value = 'round';
      groupKey.value = null;
      carouselKey.value = null;
      if (seatingRoundId.value == null) {
        const live = liveRoundRows();
        seatingRoundId.value = pickOpenRoundId(live) ?? live[0]?.id ?? null;
      }
    } else if (wallState.value === 'ceremony') {
      scope.value = remote.scope || 'total';
      groupKey.value = remote.groupKey;
      carouselKey.value = null;
      clampCeremonyPlace();
    } else {
      scope.value = remote.scope;
      groupKey.value = null;
      carouselKey.value = remote.groupKey;
    }
    carouselIndex.value = 0;
    return;
  }
  if (commandedState.value === 'seating' || commandedState.value === 'roundstand') {
    wallState.value = commandedState.value;
    scope.value = 'round';
    groupKey.value = null;
    carouselKey.value = null;
    if (seatingRoundId.value == null) {
      const live = liveRoundRows();
      seatingRoundId.value = pickOpenRoundId(live) ?? live[0]?.id ?? null;
    }
    return;
  }
  if (commandedState.value === 'ceremony') {
    wallState.value = 'ceremony';
    carouselKey.value = null;
    clampCeremonyPlace();
    return;
  }
  if (visibleRounds.value.length) {
    wallState.value = 'leaderboard';
    if (!scope.value) scope.value = 'total';
    if (selectedRoundId.value == null) {
      selectedRoundId.value = pickLatestReleasedRoundId(visibleRounds.value);
    }
    groupKey.value = null;
    carouselKey.value = null;
  } else {
    wallState.value = 'idle';
  }
}

function commandFromQueryOrStore(): PtaDisplayRemoteState | null {
  const stored = readStoredDisplayCommand(eventId.value);
  const view = String(route.query.view || route.query.state || stored?.state || '').toLowerCase();
  const qRound = Number(route.query.roundId);
  const queryRound = Number.isFinite(qRound) && qRound > 0 ? qRound : null;
  const roundId = stored?.roundId ?? queryRound;
  if (view === 'seating') {
    return { state: 'seating', scope: 'round', roundId, groupKey: null, place: null, paused: false };
  }
  if (view === 'roundstand' || view === 'progress') {
    return { state: 'roundstand', scope: 'round', roundId, groupKey: null, place: null, paused: false };
  }
  if (view === 'ceremony' || view === 'podium') {
    return {
      state: 'ceremony',
      scope: stored?.scope || 'total',
      roundId,
      groupKey: stored?.groupKey ?? null,
      place: stored?.place ?? null,
      paused: !!stored?.paused,
    };
  }
  if (view === 'idle') {
    return { state: 'idle', scope: stored?.scope || 'total', roundId, groupKey: null, place: null, paused: false };
  }
  return stored;
}

function applyLocalCommandHint() {
  if (followRemote.value) return;
  const local = commandFromQueryOrStore();
  if (!local) return;
  commandedState.value = local.state;
  applyRemoteDisplayState(local);
}

async function ensureLiveDraw() {
  if (kioskMode.value) return;
  const eu =
    nullableNumericId(route.query.eventUserId) ?? nullableNumericId(enteredRole.value?.eventUserId);
  if (eu == null) return;
  const live = seatingLiveSource();
  const roundId = seatingRoundId.value;
  if (roundId != null && ptaRoundDesksForEventRound(roundId, live.roundDesks, live.schedules).length) {
    return;
  }
  try {
    await eventStore.loadEventUserDataSheet(eu);
  } catch {
    /* seating a userdata sorsolásból */
  }
}

async function reloadDisplayFeed(applyRemoteState: boolean) {
  try {
    const data = await fetchPtaDisplay(eventId.value, { useDisplayToken: kioskMode.value });
    eventStore.applyPtaDisplayFeed(eventId.value, data);
    if (!kioskMode.value) await ensureLiveDraw();
    const remote = parsePtaDisplayState(data);
    if (applyRemoteState) {
      applyRemoteDisplayState(remote, true);
      applyLocalCommandHint();
    }
    return remote;
  } catch (error) {
    if (kioskMode.value) throw error;
    await ensureLiveDraw();
    if (applyRemoteState) applyLocalCommandHint();
    return null;
  }
}

async function connectKioskLive(token: string) {
  setSignalRDisplayToken(token);
  const id = Number(eventId.value);
  await connectToEventLive({
    eventId: id,
    eventUserId: null,
    roleName: 'organizer',
    displayOnly: true,
    displayToken: token,
  });
}

async function stripDisplayControlQuery() {
  const query = { ...route.query };
  let dirty = false;
  for (const key of DISPLAY_CONTROL_QUERY) {
    if (query[key] != null) {
      delete query[key];
      dirty = true;
    }
  }
  if (!dirty) return;
  await router.replace({ name: 'profitability-display', params: { id: eventId.value }, query });
}

async function stripPinFromUrl() {
  if (route.query.pin == null) return;
  const query = { ...route.query };
  delete query.pin;
  await router.replace({ name: 'profitability-display', params: { id: eventId.value }, query });
}

async function startKiosk(pin: string) {
  bootError.value = '';
  kioskMode.value = true;
  wallState.value = 'idle';
  followRemote.value = true;
  const id = Number(eventId.value);
  try {
    const session = await openPtaDisplaySession({ eventId: id, pin });
    await stripPinFromUrl();
    await reloadDisplayFeed(true);
    await connectKioskLive(session.token);
  } catch (error) {
    bootError.value = readAxiosErrorMessage(error, 'A kivetítés nem indult el.');
    kioskMode.value = true;
  }
}

async function submitPin() {
  const pin = pinInput.value.replace(/\D/g, '').slice(0, 4);
  if (pin.length !== 4) {
    bootError.value = 'Add meg a 4 jegyű PIN-t.';
    return;
  }
  await startKiosk(pin);
}

async function bootDisplay() {
  const id = Number(eventId.value);
  const pin = String(route.query.pin || '').replace(/\D/g, '');
  if (pin.length === 4) {
    pinInput.value = pin;
    await startKiosk(pin);
    return;
  }
  if (hasDisplaySession(id) && !authStore.isAuthenticated) {
    kioskMode.value = true;
    followRemote.value = true;
    wallState.value = 'idle';
    try {
      const token = readStoredDisplayToken(id);
      setSignalRDisplayToken(token);
      await reloadDisplayFeed(true);
      await connectKioskLive(token);
    } catch (error) {
      bootError.value = readAxiosErrorMessage(error, 'A kivetítés nem indult el.');
    }
    return;
  }
  try {
    applyUrlControlHint();
    await stripDisplayControlQuery();
    await reloadDisplayFeed(true);
  } catch {
    await ensureLiveDraw();
    applyLocalCommandHint();
  }
  followRemote.value = true;
  if (authStore.isAuthenticated) {
    try {
      const { resolveEventLiveJoin } = await import('src/utils/eventEnter');
      const join = resolveEventLiveJoin(String(id), null, route);
      if (join) await connectToEventLive({ ...join, includeDisplayGroup: true });
    } catch (err) {
      console.error('SignalR csatlakozás sikertelen:', err);
    }
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  } catch {
    /* F11 / OS */
  }
}

async function leaveDisplay() {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }
  if (window.history.length > 1) {
    router.back();
    return;
  }
  void router.replace({
    path: `/profitability/event/${eventId.value}/results`,
    query: eventRoleQuery(enteredRole.value),
  });
}

let pageTimer: ReturnType<typeof setInterval> | null = null;
let boardObserver: ResizeObserver | null = null;
let stopShowDisplay: (() => void) | null = null;
let stopStoredCommand: (() => void) | null = null;
let stopDeskDirty: (() => void) | null = null;
let feedPollTimer: ReturnType<typeof setInterval> | null = null;

function syncBoardSize() {
  const el = seatsRef.value || boardRef.value;
  if (!el) return;
  boardWidth.value = el.clientWidth;
  boardHeight.value = el.clientHeight;
}

function observePanel(el: HTMLElement | null, prev: HTMLElement | null) {
  if (prev) boardObserver?.unobserve(prev);
  if (!el) return;
  if (!boardObserver) boardObserver = new ResizeObserver(() => syncBoardSize());
  boardObserver.observe(el);
  syncBoardSize();
}

function startPager() {
  if (pageTimer) clearInterval(pageTimer);
  pageTimer = setInterval(() => {
    if (wallState.value === 'ceremony' || wallState.value === 'roundstand' || wallState.value === 'idle') return;
    const count = wallState.value === 'seating' ? seatingPageCount.value : pageCount.value;
    if (count <= 1) return;
    pageIndex.value = (pageIndex.value + 1) % count;
  }, PAGE_MS);
}

function startGroupPager() {
  if (groupTimer) clearInterval(groupTimer);
  groupTimer = setInterval(() => {
    if (groupValues.value.length <= 1) return;
    carouselIndex.value = (carouselIndex.value + 1) % groupValues.value.length;
    pageIndex.value = 0;
  }, PAGE_MS);
}

watch(carouselKey, () => {
  carouselIndex.value = 0;
  pageIndex.value = 0;
});

watch(
  boardRef,
  (el, prev) => {
    observePanel(el, prev);
  }
);

watch(
  seatsRef,
  (el, prev) => {
    observePanel(el, prev);
  }
);

watch(wallState, () => {
  void nextTick(() => syncBoardSize());
  syncFeedPoll();
});

watch(ceremonyMax, () => {
  if (wallState.value === 'ceremony') clampCeremonyPlace();
});

function applyFollowedCommand(remote: PtaDisplayRemoteState) {
  followRemote.value = true;
  commandedState.value = remote.state;
  applyRemoteDisplayState(remote);
  if (remote.state === 'seating' || remote.state === 'roundstand') {
    if (!kioskMode.value) void ensureLiveDraw();
  }
}

function refreshLiveRoundWall() {
  if (wallState.value !== 'roundstand' && wallState.value !== 'seating') return;
  void reloadDisplayFeed(false).catch((error) => {
    if (kioskMode.value) {
      bootError.value = readAxiosErrorMessage(error, 'A kivetítés nem indult el.');
    }
  });
}

function syncFeedPoll() {
  if (feedPollTimer) {
    clearInterval(feedPollTimer);
    feedPollTimer = null;
  }
  if (wallState.value !== 'roundstand') return;
  feedPollTimer = setInterval(() => {
    refreshLiveRoundWall();
  }, FEED_POLL_MS);
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  onFullscreenChange();
  startPager();
  startGroupPager();
  syncBoardSize();
  syncFeedPoll();
  void bootDisplay();
  stopShowDisplay = onPtaShowDisplayPing((payload) => {
    if (String(payload.eventId) !== eventId.value) return;
    applyFollowedCommand(payload);
    void reloadDisplayFeed(false).catch((error) => {
      if (kioskMode.value) {
        bootError.value = readAxiosErrorMessage(error, 'A kivetítés nem indult el.');
      }
    });
  });
  stopStoredCommand = onStoredDisplayCommand((id, command) => {
    if (id !== Number(eventId.value)) return;
    applyFollowedCommand(command);
  });
  stopDeskDirty = onPtaDeskDisplayDirty((id) => {
    if (String(id) !== eventId.value) return;
    refreshLiveRoundWall();
  });
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (pageTimer) clearInterval(pageTimer);
  if (groupTimer) clearInterval(groupTimer);
  if (feedPollTimer) clearInterval(feedPollTimer);
  boardObserver?.disconnect();
  stopShowDisplay?.();
  stopStoredCommand?.();
  stopDeskDirty?.();
  eventStore.clearPtaDisplayFeed();
  if (kioskMode.value) {
    setSignalRDisplayToken(null);
    disconnectEventLive();
  }
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
});
</script>

<style scoped>
.pta-wall {
  height: 100%;
  background: var(--pta-page);
  color: #e2e8f0;
}

.pta-wall__container,
.pta-wall__page {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: var(--pta-page);
}

.pta-wall__page {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pta-wall__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(100%, calc(100dvh * 16 / 9));
  height: min(100%, calc(100dvw * 9 / 16));
  max-width: 100%;
  max-height: 100%;
  padding: clamp(16px, 2.4vw, 36px) clamp(20px, 3vw, 48px) clamp(12px, 2vw, 28px);
  box-sizing: border-box;
  overflow: hidden;
}

.pta-wall__watermark {
  position: absolute;
  right: -6%;
  top: 8%;
  width: 42%;
  height: 70%;
  opacity: 0.04;
  pointer-events: none;
}

.pta-wall__watermark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pta-wall__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: clamp(8px, 1.6vh, 20px);
}

.pta-wall__kicker {
  margin: 0 0 4px;
  font-size: clamp(11px, 1.2vw, 16px);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f68b29;
}

.pta-wall__title {
  margin: 0;
  font-size: clamp(22px, 3.2vw, 44px);
  font-weight: 800;
  line-height: 1.1;
  color: #f8fafc;
}

.pta-wall__caption {
  margin: 8px 0 0;
  font-size: clamp(13px, 1.6vw, 22px);
  font-weight: 700;
  color: #94a3b8;
}

.pta-wall__dot {
  margin: 0 0.4em;
  color: #64748b;
}

.pta-wall__tools {
  display: flex;
  gap: 8px;
  opacity: 0.35;
  transition: opacity 0.2s ease;
}

.pta-wall__stage:hover .pta-wall__tools,
.pta-wall__tools:focus-within {
  opacity: 1;
}

.pta-wall__tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  cursor: pointer;
}

.pta-wall__idle {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

.pta-wall__idle-icon {
  font-size: clamp(48px, 8vw, 88px);
  color: #f68b29;
}

.pta-wall__idle-title {
  margin: 0;
  font-size: clamp(20px, 3vw, 36px);
  font-weight: 800;
  color: #e2e8f0;
}

.pta-wall__pin {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.pta-wall__pin-input {
  width: 8rem;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.4em;
  text-align: center;
}

.pta-wall__pin-btn {
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: 14px;
  background: #f68b29;
  color: #121416;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.pta-wall__board {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pta-wall__grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
  gap: clamp(12px, 2vw, 32px);
}

.pta-wall__col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.7vh, 8px);
}

.pta-wall__cols,
.pta-wall__row {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.1vw, 16px);
  min-width: 0;
}

.pta-wall__cols {
  flex-shrink: 0;
  padding: 0 clamp(10px, 1.2vw, 18px) 2px;
}

.pta-wall__row {
  flex: 1;
  min-height: 0;
  padding: 0 clamp(10px, 1.2vw, 18px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.pta-wall__row.is-first {
  border-color: rgba(246, 139, 41, 0.45);
  background: rgba(246, 139, 41, 0.12);
}

.pta-wall__row.is-second {
  border-color: rgba(148, 163, 184, 0.35);
}

.pta-wall__row.is-third {
  border-color: rgba(234, 88, 12, 0.28);
}

.pta-wall__place {
  width: clamp(24px, 2.4vw, 40px);
  flex-shrink: 0;
  font-size: clamp(14px, 1.8vw, 26px);
  font-weight: 800;
  color: #94a3b8;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.pta-wall__row.is-first .pta-wall__place {
  color: #f68b29;
}

.pta-wall__name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pta-wall__label {
  font-size: clamp(14px, 1.8vw, 26px);
  font-weight: 800;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pta-wall__count {
  font-size: clamp(10px, 1.05vw, 14px);
  font-weight: 700;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pta-wall__icon {
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}

.pta-wall__score,
.pta-wall__cols .pta-wall__score {
  width: clamp(40px, 5.4vw, 72px);
  flex-shrink: 0;
  object-fit: contain;
  font-size: clamp(13px, 1.6vw, 22px);
  font-weight: 800;
  color: #f8fafc;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.pta-wall__cols .pta-wall__score,
.pta-wall__cols .pta-wall__truck {
  height: clamp(14px, 1.8vw, 22px);
}

.pta-wall__truck,
.pta-wall__cols .pta-wall__truck {
  width: clamp(32px, 4.4vw, 60px);
  flex-shrink: 0;
  object-fit: contain;
  font-size: clamp(13px, 1.6vw, 22px);
  font-weight: 800;
  color: #cbd5e1;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.pta-wall__points {
  min-width: clamp(40px, 4.8vw, 72px);
  flex-shrink: 0;
  font-size: clamp(13px, 1.7vw, 24px);
  font-weight: 800;
  color: #fdba74;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.pta-wall__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 28px;
  padding-top: 8px;
}

.pta-wall__pager-label {
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
  margin-right: 4px;
}

.pta-wall__pager-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.pta-wall__pager-dot.is-on {
  background: #f68b29;
}

.pta-wall__progress {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.pta-progress__count {
  margin: 0;
  font-size: clamp(56px, 10vw, 120px);
  font-weight: 800;
  line-height: 0.9;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}

.pta-progress__done {
  color: #f68b29;
}

.pta-progress__slash {
  margin: 0 0.08em;
  color: #64748b;
}

.pta-progress__label {
  margin: 8px 0 0;
  font-size: clamp(13px, 1.6vw, 18px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.pta-progress__bar {
  width: min(100%, 36rem);
  height: 10px;
  margin: 18px 0 22px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.pta-progress__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f68b29, #fdba74);
}

.pta-progress__cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(16px, 3vw, 40px);
  width: min(100%, 52rem);
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.pta-progress__col {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.pta-progress__head {
  margin: 0 0 8px;
  font-size: clamp(12px, 1.3vw, 16px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.pta-progress__col.is-done .pta-progress__head {
  color: #fdba74;
}

.pta-progress__empty {
  margin: 0;
  font-size: clamp(13px, 1.3vw, 16px);
  font-weight: 600;
  color: #64748b;
}

.pta-progress__desk {
  margin: 0 0 4px;
  font-size: clamp(16px, 1.8vw, 22px);
  font-weight: 800;
  color: #e2e8f0;
}

.pta-progress__col.is-done .pta-progress__desk {
  color: #fdba74;
}

.pta-wall__ceremony {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pta-ceremony {
  position: relative;
  overflow: hidden;
  width: min(100%, 52rem);
  padding: clamp(20px, 3vh, 40px) clamp(20px, 3vw, 48px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  text-align: center;
}

.pta-ceremony::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.14) 50%, transparent 60%);
  transform: translateX(-120%);
}

.pta-ceremony-enter-active {
  transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}

.pta-ceremony-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.pta-ceremony-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(28px);
}

.pta-ceremony-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

.pta-ceremony-enter-active::after {
  animation: pta-ceremony-shine 1.1s ease 0.2s both;
}

.pta-ceremony.is-third {
  border-color: rgba(180, 104, 58, 0.7);
  background: linear-gradient(180deg, rgba(180, 104, 58, 0.28) 0%, rgba(16, 17, 18, 0.55) 70%);
  box-shadow: 0 0 48px rgba(180, 104, 58, 0.28);
}

.pta-ceremony.is-second {
  border-color: rgba(192, 205, 220, 0.7);
  background: linear-gradient(180deg, rgba(203, 213, 225, 0.28) 0%, rgba(16, 17, 18, 0.55) 70%);
  box-shadow: 0 0 48px rgba(148, 163, 184, 0.32);
}

.pta-ceremony.is-first {
  border-color: rgba(246, 197, 66, 0.85);
  background: linear-gradient(180deg, rgba(246, 197, 66, 0.32) 0%, rgba(246, 139, 41, 0.16) 42%, rgba(16, 17, 18, 0.55) 78%);
  box-shadow: 0 0 64px rgba(246, 197, 66, 0.38);
  animation: pta-ceremony-gold 2.4s ease-in-out infinite;
}

.pta-ceremony__medal {
  margin: 0 0 6px;
  font-size: clamp(13px, 1.5vw, 18px);
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.pta-ceremony.is-third .pta-ceremony__medal,
.pta-ceremony.is-third .pta-ceremony__place {
  color: #e8b48a;
}

.pta-ceremony.is-second .pta-ceremony__medal,
.pta-ceremony.is-second .pta-ceremony__place {
  color: #e2e8f0;
}

.pta-ceremony.is-first .pta-ceremony__medal,
.pta-ceremony.is-first .pta-ceremony__place {
  color: #f5c542;
}

.pta-ceremony__kicker {
  margin: 0 0 4px;
  font-size: clamp(12px, 1.3vw, 16px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.pta-ceremony__place {
  margin: 0;
  font-size: clamp(64px, 12vw, 140px);
  font-weight: 800;
  line-height: 0.9;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}

.pta-ceremony__name {
  margin: 12px 0 0;
  font-size: clamp(28px, 4.4vw, 56px);
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.1;
}

.pta-ceremony.is-first .pta-ceremony__name {
  color: #fff7d6;
}

.pta-ceremony__sub {
  margin: 8px 0 0;
  font-size: clamp(14px, 1.8vw, 22px);
  font-weight: 700;
  color: #94a3b8;
}

.pta-ceremony__stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 3vw, 36px);
  margin-top: clamp(16px, 3vh, 28px);
}

.pta-ceremony__stat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(18px, 2.4vw, 32px);
  font-weight: 800;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}

.pta-ceremony__stat img {
  width: clamp(22px, 2.4vw, 32px);
  height: clamp(22px, 2.4vw, 32px);
  object-fit: contain;
}

.pta-ceremony__points {
  font-size: clamp(20px, 2.6vw, 34px);
  font-weight: 800;
  color: #fdba74;
  font-variant-numeric: tabular-nums;
}

@keyframes pta-ceremony-shine {
  to {
    transform: translateX(120%);
  }
}

@keyframes pta-ceremony-gold {
  0%,
  100% {
    box-shadow: 0 0 48px rgba(246, 197, 66, 0.28);
  }
  50% {
    box-shadow: 0 0 80px rgba(246, 197, 66, 0.55);
  }
}

.pta-wall__seats {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pta-seat-list {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
  gap: clamp(12px, 1.8vw, 24px);
}

.pta-seat-list__col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pta-seat-list__head,
.pta-seat-list__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pta-seat-list__head {
  flex-shrink: 0;
  padding: 0 8px 6px;
  font-size: clamp(10px, 1.05vw, 13px);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.pta-seat-list__row {
  padding: 5px 8px;
  border-radius: 8px;
}

.pta-seat-list__row:nth-child(even) {
  background: rgba(255, 255, 255, 0.04);
}

.pta-seat-list__who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pta-seat-list__name,
.pta-seat-list__team {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pta-seat-list__name {
  font-size: clamp(13px, 1.3vw, 17px);
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.2;
}

.pta-seat-list__team {
  font-size: clamp(11px, 1.05vw, 13px);
  font-weight: 700;
  color: #94a3b8;
  line-height: 1.2;
}

.pta-seat-list__meta {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.pta-seat-list__desk {
  min-width: 1.6em;
  font-size: clamp(14px, 1.4vw, 18px);
  font-weight: 800;
  color: #f8fafc;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pta-seat-list__swatch {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex-shrink: 0;
}
</style>
