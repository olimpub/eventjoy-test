<template>
  <q-page class="pta-scope pta-game relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 game-shell">
      <header class="game-header">
        <button type="button" class="game-back" aria-label="Vissza" @click="goBack">
          <q-icon name="arrow_back" size="20px" />
        </button>
        <h1 class="game-header__title">Játék</h1>
        <p class="game-header__event">{{ eventName }}</p>
      </header>

      <section v-if="!hasDraw" class="game-empty">
        <q-icon name="casino" size="48px" style="color: #f68b29;" />
        <h2 class="game-empty__title">Fordulók és sorsolás</h2>
        <p class="game-empty__text">
          Először a játéktípus fordulói jönnek létre, aztán az asztalok,
          majd a belépett játékosok ülnek be a négyes asztalokhoz.
        </p>
        <p class="game-empty__meta">
          Belépett játékos: <strong>{{ checkedInCount }}</strong>
          · Asztal: <strong>{{ expectedDeskCount }}</strong>
          <template v-if="expectedReserveCount">
            · Tartalék: <strong>{{ expectedReserveCount }}</strong>
          </template>
        </p>
        <button
          v-if="canRunDraw"
          type="button"
          class="game-ctrl game-ctrl--start"
          :disabled="checkedInCount < 4 || drawing"
          @click="onStartDraw"
        >
          <q-icon name="shuffle" size="20px" />
          {{ drawing ? 'Sorsolás…' : 'Fordulók generálása' }}
        </button>
        <p v-else class="game-empty__wait">
          {{
            isOrganizerView && !isDrawStatus
              ? 'A sorsolás a Sorsolás státuszban indítható, amíg nincs rögzített eredmény.'
              : 'A sorsolást a szervező indítja.'
          }}
        </p>
      </section>

      <template v-else>
        <section v-if="roundsPanelOpen" class="game-rounds-panel">
          <div class="game-rounds-panel__top">
            <h2 class="game-rounds-panel__title">Fordulók</h2>
            <q-btn
              icon="close"
              flat
              round
              dense
              class="text-slate-400 hover:text-white bg-white/5"
              aria-label="Fordulók elrejtése"
              @click="roundsPanelOpen = false"
            />
          </div>
          <div class="game-rounds">
            <div
              v-for="round in rounds"
              :key="round.id"
              class="game-round"
              :class="{ 'is-active': selectedRoundId === round.id }"
            >
              <button type="button" class="game-round__main" @click="selectedRoundId = round.id">
                <span class="game-round__num">{{ round.label }}</span>
                <span class="game-round__desks">{{ round.closedDeskCount }}/{{ round.deskCount }}</span>
              </button>
              <button
                v-if="canChangeRoundStatus"
                type="button"
                class="game-round__status"
                :class="statusClass(round.status)"
                @click="openRoundStatus(round.id)"
              >
                {{ round.status }}
                <q-icon name="expand_more" size="16px" />
              </button>
              <span
                v-else
                class="game-round__status is-readonly"
                :class="statusClass(round.status)"
              >
                {{ round.status }}
              </span>
            </div>
          </div>
        </section>

        <button
          v-else
          type="button"
          class="game-rounds-restore"
          @click="roundsPanelOpen = true"
        >
          <span class="game-rounds-restore__icon">
            <q-icon name="unfold_more" size="20px" />
          </span>
          <span class="game-rounds-restore__body">
            <span class="game-rounds-restore__label">Fordulók</span>
            <span v-if="currentRound" class="game-rounds-restore__meta">
              {{ currentRound.label }}
              <span class="game-round__desks">{{ currentRound.closedDeskCount }}/{{ currentRound.deskCount }}</span>
              · {{ currentRound.status }}
            </span>
          </span>
          <q-icon name="expand_more" size="22px" class="game-rounds-restore__chevron" />
        </button>

        <div class="game-toolbar">
          <q-input
            v-model="searchQuery"
            placeholder="Asztal vagy játékos"
            dark
            outlined
            dense
            color="orange"
            class="game-search"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="slate-400" size="18px" />
            </template>
            <template v-slot:append>
              <q-icon
                v-if="searchQuery"
                name="close"
                class="cursor-pointer"
                color="slate-400"
                size="18px"
                @click="searchQuery = ''"
              />
            </template>
          </q-input>
          <button
            v-if="canRedraw"
            type="button"
            class="game-ctrl game-ctrl--start"
            :disabled="drawing || drawSaving || checkedInCount < 4"
            @click="onRedrawDraw"
          >
            <q-icon name="shuffle" size="20px" />
            {{ drawing ? 'Újrasorsolás…' : 'Újrasorsolás' }}
          </button>
        </div>

        <p v-if="reserveCount" class="game-hint">
          Tartalék / csere: {{ reserveCount }} fő
        </p>
        <p v-if="resultsEntryHint" class="game-hint">
          {{ resultsEntryHint }}
        </p>
        <p v-if="canClaimTables && !hasClaimedTables && filteredTables.length" class="game-hint">
          A pajzs ikonnal jelöld meg a saját asztalaidat — azok felülre kerülnek.
        </p>

        <div v-if="filteredTables.length === 0" class="game-empty game-empty--compact">
          <q-icon name="sym_r_table_restaurant" size="32px" class="text-slate-500" />
          <p class="game-empty__title">Nincs találat</p>
          <p class="game-empty__text">Próbálj másik asztalt vagy játékosnevet.</p>
        </div>

        <template v-else>
          <section
            v-for="group in tableGroups"
            :key="group.key"
            class="game-tables-group"
          >
            <p v-if="group.label" class="game-tables__label">{{ group.label }}</p>
            <div class="game-tables">
              <div
                v-for="table in group.tables"
                :key="table.id"
                class="game-table"
                :class="{
                  'is-selected': selectedTableId === table.id && isTableSheetOpen,
                  'is-mine': table.isMine,
                }"
                @click="onTableClick(table.id, $event)"
              >
            <div class="game-table__head">
              <span class="game-table__name">
                <img :src="tableIcon" alt="" class="pta-icon pta-icon--table" />
                <span class="game-table__no">{{ table.deskNo }}</span>
              </span>
              <button
                v-if="canClaimTables"
                type="button"
                class="game-table__claim"
                :class="{
                  'is-on': table.isMine,
                  'is-taken': isClaimTaken(table),
                }"
                :disabled="isClaimTaken(table)"
                :title="claimTitle(table)"
                :aria-label="claimTitle(table)"
                @pointerdown.stop.prevent="onClaimPointerDown(table, $event)"
                @click.stop.prevent
              >
                <q-icon name="sym_r_swords" size="14px" />
                JM
              </button>
              <span
                class="game-table__status"
                :class="statusClass(table.deskStatus)"
                :title="table.deskStatus"
              >
                <q-icon :name="deskStatusIcon(table.deskStatus)" size="18px" />
              </span>
            </div>
            <div
              v-for="seat in seatsForCard(table)"
              :key="seat.playerId + seat.color"
              class="game-seat"
            >
              <span class="game-seat__dot" :style="{ background: seat.color }" />
              <span class="game-seat__name" :style="{ color: seat.color }">{{ seat.name }}</span>
              <span v-if="table.isClosed || tableHasScores(table)" class="game-seat__points">
                {{ seat.resultPoint == null ? '—' : seat.resultPoint + ' e' }}
              </span>
            </div>
            <div v-if="photoMandatory" class="game-table__photo">
              <q-icon :name="table.photoUrl ? 'photo' : 'add_a_photo'" size="16px" />
              <span>{{ table.photoUrl ? 'Fotó' : 'Fotó feltöltés' }}</span>
            </div>
              </div>
            </div>
          </section>
        </template>
      </template>
    </div>

    <q-dialog v-model="isStatusSheetOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="game-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="game-sheet__title">Forduló státusza</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
          />
        </q-card-section>
        <q-card-section class="q-pt-md q-px-md pb-8">
          <p v-if="statusSheetRound" class="game-sheet__hint">
            {{ statusSheetRound.label }} · jelenlegi:
            <span class="game-round__status" :class="statusClass(statusSheetRound.status)">
              {{ statusSheetRound.status }}
            </span>
          </p>
          <p class="game-sheet__hint">
            Lezárt: a fordulónak vége, a játékosok még nem látják az eredményt.
            Publikált: a játékosok SignalR-en megkapják és megjelenik náluk.
          </p>
          <div class="game-sheet__list">
            <button
              v-for="item in roundStatusOptions"
              :key="item.id"
              type="button"
              class="game-status-option"
              :class="{ 'is-current': statusSheetRound?.statusId === item.id }"
              @click="setRoundStatus(item.id, item.SName)"
            >
              <span class="game-round__status" :class="statusClass(item.SName)">{{ item.SName }}</span>
              <q-icon v-if="statusSheetRound?.statusId === item.id" name="check" size="18px" class="text-orange-400" />
              <q-icon v-else name="chevron_right" size="18px" class="text-slate-500" />
            </button>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="isTableSheetOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedTable" class="game-sheet game-sheet--desk">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="game-desk__bar q-pt-sm q-pb-none px-5">
          <span
            class="game-desk__status"
            :class="statusClass(selectedTable.deskStatus)"
          >
            <span class="game-table__status" :class="statusClass(selectedTable.deskStatus)">
              <q-icon :name="deskStatusIcon(selectedTable.deskStatus)" size="18px" />
            </span>
            <span class="game-desk__status-name">{{ selectedTable.deskStatus }}</span>
          </span>
          <div class="game-sheet__title">{{ selectedTable.name }}</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
          />
        </q-card-section>
        <q-card-section class="q-pt-sm q-px-md pb-6">
          <div v-if="selectedTable.photoUrl" class="game-photo game-photo--preview">
            <button type="button" class="game-photo__thumb" @click="isPhotoPreviewOpen = true">
              <img :src="selectedTable.photoUrl" alt="Asztal fotó" class="game-photo__img" />
              <span class="game-photo__view">
                <q-icon name="zoom_in" size="18px" />
                Megtekintés
              </span>
            </button>
            <button
              v-if="!deskLocked"
              type="button"
              class="game-photo__retake"
              @click="openCamera"
            >
              <q-icon name="photo_camera" size="18px" />
            </button>
          </div>
          <button
            v-else
            type="button"
            class="game-photo"
            :disabled="deskLocked"
            @click="openCamera"
          >
            <span class="game-photo__empty">
              <q-icon name="photo_camera" size="22px" />
              <span>{{ photoMandatory ? 'Kamera (kötelező)' : 'Kamera' }}</span>
            </span>
          </button>
          <p v-if="resultsEntryHint" class="game-desk__tie">
            {{ resultsEntryHint }}
          </p>
          <p v-else-if="deskHasTie && !selectedTable.manualOrder" class="game-desk__tie">
            Holtverseny — húzd a sorokat a végső sorrendhez.
          </p>
          <div class="game-rank" :class="{ 'is-locked': deskLocked }">
            <div class="game-rank__cols" aria-hidden="true">
              <span class="game-rank__grip" />
              <span class="game-rank__place" />
              <span class="game-rank__name" />
              <img :src="scoreIcon" alt="Összeg" class="pta-icon pta-icon--col game-rank__col-score" />
              <img :src="scoreTruckIcon" alt="Kamion" class="pta-icon pta-icon--col game-rank__col-truck" />
              <span class="game-rank__points" />
            </div>
            <div
              v-for="(seat, index) in rankedSeats"
              :key="seat.playerId"
              class="game-rank__row"
              :style="playerColorStyle(seat.color)"
            >
              <span
                class="game-rank__grip"
                aria-hidden="true"
                @pointerdown.stop="onRankPointerDown(index, $event)"
              >
                <q-icon name="drag_indicator" size="18px" />
              </span>
              <span class="game-rank__place">{{ seat.place ?? '—' }}</span>
              <span class="game-rank__name" :style="{ color: seat.color }">{{ seat.name }}</span>
              <input
                :data-amount="seat.playerId"
                class="game-num"
                inputmode="numeric"
                enterkeyhint="next"
                maxlength="2"
                :disabled="deskLocked"
                :value="amountDraftOf(seat.playerId, seat.amount)"
                placeholder="1–99"
                aria-label="Összeg"
                @focus="onAmountFocus(seat.playerId, $event)"
                @input="onAmountInput(seat.playerId, $event)"
                @blur="onAmountBlur(seat.playerId, $event)"
                @keydown.enter.prevent="onAmountEnter(index, $event)"
              />
              <input
                :data-truck="seat.playerId"
                class="game-num game-num--truck"
                inputmode="numeric"
                enterkeyhint="next"
                maxlength="2"
                :disabled="deskLocked"
                :value="truckDraftOf(seat.playerId, seat.onTrack)"
                placeholder="0"
                aria-label="Kamion"
                @focus="onTruckFocus(seat.playerId, $event)"
                @input="onTruckInput(seat.playerId, $event)"
                @blur="onTruckBlur(seat.playerId, $event)"
                @keydown.enter.prevent="onTruckEnter(index, $event)"
              />
              <span class="game-rank__points">
                {{ seat.resultPoint == null ? '—' : seat.resultPoint + ' e' }}
              </span>
            </div>
          </div>

          <button
            v-if="canEnterResults && !selectedTable.isClosed"
            type="button"
            class="game-close-desk"
            :disabled="deskSaving"
            @click="closeDesk"
          >
            {{ deskSaving ? 'Mentés…' : 'Asztal lezárása' }}
          </button>

          <button
            v-if="canClaimTables"
            type="button"
            class="game-desk__claim"
            :class="{
              'is-on': selectedTable.isMine,
              'is-taken': isClaimTaken(selectedTable),
            }"
            :disabled="isClaimTaken(selectedTable)"
            @click.stop.prevent="onClaimClick(selectedTable)"
          >
            <span class="game-desk__claim-icon">
              <q-icon name="sym_r_swords" size="26px" />
            </span>
            <span class="game-desk__claim-copy">
              <span class="game-desk__gm-label">Játékmester</span>
              <span class="game-desk__gm-name">
                {{
                  selectedTable.isMine
                    ? 'Ez az én asztalom'
                    : selectedTable.gameMasterName || 'Megjelölöm, hogy ez az én asztalom'
                }}
              </span>
            </span>
          </button>
          <div v-else class="game-desk__gm">
            <span class="game-desk__gm-label">Játékmester</span>
            <span class="game-desk__gm-name">{{ selectedTable.gameMasterName || 'Nincs rögzítve' }}</span>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog v-model="isPhotoPreviewOpen">
      <q-card v-if="selectedTable?.photoUrl" class="game-photo-preview">
        <q-btn
          icon="close"
          flat
          round
          dense
          v-close-popup
          class="game-photo-preview__close"
        />
        <img :src="selectedTable.photoUrl" alt="Asztal fotó" class="game-photo-preview__img" />
      </q-card>
    </q-dialog>
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onPhotoPicked"
    />

    <DrawSummarySheet
      v-model="isDrawSummaryOpen"
      :summary="drawSummary"
      :busy="workBusy"
      @redraw="onRedrawDraw"
      @finalize="onFinalizeDraw"
    />

    <PtaBusyOverlay :model-value="workBusy" :label="workLabel" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { eventDatasheetKind, eventRolePath, eventRoleQuery } from 'src/utils/eventRoleNav';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { claimPtaDesk, closePtaRound, patchPtaDesk, publishPtaRound, replacePtaDraw, setPtaDeskResults, setPtaRoundStatus } from 'src/utils/eventChange';
import { eventPlayPhase } from 'src/utils/eventFlow';
import { summarizePtaDraw, type PtaDrawQuality } from 'src/modules/profitability/drawQuality';
import DrawSummarySheet from 'src/modules/profitability/components/DrawSummarySheet.vue';
import PtaBusyOverlay from 'src/modules/profitability/components/PtaBusyOverlay.vue';
import { paintBusy } from 'src/modules/profitability/paintBusy';
import { pickOpenRoundId, ptaRoundStatusKind, isPublishedStatus, canEnterRoundResults, findPtaRoundStatusIdByNameHints, isLiveStatus as isRoundLiveStatus, isSettledRoundStatus, deskHasRecordedResults } from 'src/modules/profitability/standings';
import { PLAYERS_PER_DESK, ptaSeatColorFromRow } from 'src/modules/profitability/drawEngine';
import {
  bindSchedulesToRoundDesk,
  ptaDeskNumber,
  ptaEventDeskId,
  ptaEventRoundId,
  ptaRoundDeskId,
  ptaSchedulePlayerId,
  resolvePtaSeatName,
} from 'src/modules/profitability/ptaData';
import {
  AMOUNT_MAX,
  AMOUNT_MIN,
  rankDeskSeats,
  scoreNumber,
  TRUCK_MAX,
  TRUCK_MIN,
} from 'src/modules/profitability/scoreTable';
import { useEventStore } from 'src/stores/event';
import { useAuthStore } from 'src/stores/auth';
import { useMasterDataStore } from 'src/stores/masterData';
import '../theme.css';
import scoreIcon from '../assets/Score.png';
import scoreTruckIcon from '../assets/ScoreTruck.png';
import tableIcon from '../assets/Table.png';

interface GameRoundRow {
  id: number;
  order: number;
  label: string;
  status: string;
  statusId: number | null;
  deskCount: number;
  closedDeskCount: number;
}

interface GameSeatRow {
  playerId: number;
  name: string;
  color: string;
  position: number | null;
  resultPoint: number | null;
  amount: number | null;
  onTrack: number | null;
}

interface GameTableRow {
  id: number;
  name: string;
  deskNo: number;
  deskStatus: string;
  gameMasterUserId: number | null;
  gameMasterName: string;
  isMine: boolean;
  photoUrl: string;
  manualOrder: boolean;
  isClosed: boolean;
  seats: GameSeatRow[];
}

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const authStore = useAuthStore();
const masterDataStore = useMasterDataStore();

const eventId = computed(() => String(route.params.id));
const drawing = ref(false);
const isDrawSummaryOpen = ref(false);
const drawSummary = ref<PtaDrawQuality | null>(null);
const drawSaving = ref(false);
const workLabel = ref('Sorsolás…');
const workBusy = computed(() => drawing.value || drawSaving.value || deskSaving.value || roundSaving.value);
const selectedRoundId = ref<number | null>(null);
const selectedTableId = ref<number | null>(null);
const roundsPanelOpen = ref(false);
const searchQuery = ref('');
const isStatusSheetOpen = ref(false);
const statusSheetRoundId = ref<number | null>(null);
const isTableSheetOpen = ref(false);
const isPhotoPreviewOpen = ref(false);
const cameraInput = ref<HTMLInputElement | null>(null);
const dragFromIndex = ref<number | null>(null);
let rankDragMoved = false;
const sheetSeats = ref<GameSeatRow[]>([]);
const sheetManualOrder = ref(false);
const amountDrafts = ref<Record<number, string>>({});
const truckDrafts = ref<Record<number, string>>({});
const focusedScore = ref<{ playerId: number; field: 'amount' | 'truck' } | null>(null);
const claimingDeskId = ref<number | null>(null);
let claimPointerAt = 0;
const deskSaving = ref(false);
const roundSaving = ref(false);
let resultsSyncTimer: ReturnType<typeof setTimeout> | null = null;
let promotingRound = false;
let pendingRoundPromote = false;

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
  if (!e) return 'Esemény';
  return e.Title || e.EventName || e.Name || 'Esemény';
});

const eventStatusId = computed(() => {
  const e = dbEvent.value;
  if (!e) return null;
  return nullableNumericId(e.EventStatusID ?? e.eventStatusID ?? e.StatusID ?? e.StatusId);
});

const playPhase = computed(() =>
  eventPlayPhase(masterDataStore.getEventStatusNameById(eventStatusId.value, ''))
);
const isDrawStatus = computed(() => playPhase.value === 'draw');
const eventReachedGame = computed(
  () => playPhase.value === 'game' || playPhase.value === 'ceremony' || playPhase.value === 'ended'
);

const enterableRoles = computed(() => {
  const e = dbEvent.value;
  if (!e) return [];
  return eventStore.getEnterableRolesForEvent(e.id, e.EventTypeID ?? e.eventTypeId);
});

const enteredRole = computed(() => {
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
  return roles.find((r) => r.isOrganizer) || roles[0] || null;
});

const isOrganizerView = computed(() => eventDatasheetKind(enteredRole.value) === 'organizer');
const isGameMasterView = computed(() => eventDatasheetKind(enteredRole.value) === 'gamemaster');
const deskLocked = computed(() => {
  if (!canEnterResults.value) return true;
  return !!selectedTable.value?.isClosed && !isOrganizerView.value;
});

const currentUserId = computed(() => {
  const fromAuth = nullableNumericId(
    authStore.user?.id ?? authStore.user?.ID ?? authStore.user?.UserID ?? authStore.user?.userID
  );
  if (fromAuth != null) return fromAuth;
  const eventUserId = enteredRole.value?.eventUserId;
  if (eventUserId == null) return null;
  const eu =
    eventStore.getEventUsersForEvent(eventId.value).find((row) => Number(row.id) === Number(eventUserId)) ||
    eventStore.getEventParticipantsForEvent(eventId.value).find((row) => Number(row.id) === Number(eventUserId));
  return nullableNumericId(eu?.UserID ?? eu?.userID ?? eu?.UserId);
});

const canClaimTables = computed(() => isGameMasterView.value && currentUserId.value != null);

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function playerColorStyle(color: string) {
  const hex = String(color || '').trim();
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return {};
  }
  const full =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return {
    borderColor: full,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.22)`,
    boxShadow: `inset 6px 0 0 ${full}`,
  };
}

function roundStatusName(row: Record<string, unknown>): string {
  const statusId = nullableNumericId(row.EventRoundStatusID);
  const fromMaster =
    statusId != null ? masterDataStore.getPtaEventRoundStatusById(statusId)?.SName : '';
  return String(fromMaster || row.SName || 'Kisorsolva');
}

function seatPeople(): Record<string, unknown>[] {
  return [
    ...eventStore.getParticipantDirectoryForEvent(eventId.value),
    ...eventStore.getEventParticipantsForEvent(eventId.value),
    ...eventStore.getEventUsersForEvent(eventId.value),
  ];
}

function playerName(playerId: number | null, schedule?: Record<string, unknown> | null): string {
  return resolvePtaSeatName({
    playerId,
    players: [...eventStore.getPtaPlayersForEvent(eventId.value), ...eventStore.ptaEventPlayers],
    people: seatPeople(),
    eventId: eventId.value,
    schedule,
  });
}

function personName(row: Record<string, unknown> | null | undefined): string {
  if (!row) return '';
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const display = String(row.DisplayName ?? row.UserName ?? row.Name ?? '').trim();
  return [last, first].filter(Boolean).join(' ') || display;
}

function gameMasterName(userId: number | null): string {
  if (userId == null) return '';
  const fromPart = eventStore
    .getEventParticipantsForEvent(eventId.value)
    .find((row) => nullableNumericId(row.UserID ?? row.userID) === userId);
  const fromPartName = personName(fromPart as Record<string, unknown> | undefined);
  if (fromPartName) return fromPartName;
  const fromEu = eventStore
    .getEventUsersForEvent(eventId.value)
    .find((row) => nullableNumericId(row.UserID ?? row.userID) === userId);
  return personName(fromEu as Record<string, unknown> | undefined) || `GM ${userId}`;
}

function deskStatusOf(rd: Record<string, unknown>, roundStatus: string): string {
  const own = String(rd.SName ?? rd.StatusName ?? rd.DeskStatus ?? '').trim();
  if (own) return own;
  if (isLiveStatus(roundStatus)) return 'Folyamatban';
  if (isClosedStatus(roundStatus)) return 'Lezárt';
  return 'Kisorsolva';
}

const checkedInCount = computed(
  () => eventStore.getPtaCheckedInDrawPlayers(eventId.value).drafts.length
);

const expectedDeskCount = computed(() => Math.floor(checkedInCount.value / PLAYERS_PER_DESK));
const expectedReserveCount = computed(() => checkedInCount.value % PLAYERS_PER_DESK);

const rounds = computed<GameRoundRow[]>(() => {
  const roundDesks = eventStore.getPtaRoundDesksForEvent(eventId.value);
  const schedules = eventStore.getPtaSchedulesForEvent(eventId.value);
  return eventStore.getPtaRoundsForEvent(eventId.value).map((row, index) => {
    const id = ptaEventRoundId(row) ?? nullableNumericId(row.id) ?? index + 1;
    const order = Number(row.OrderIndex ?? index + 1);
    const name = String(row.RName || '').trim();
    const status = roundStatusName(row);
    const desks = roundDesks.filter((desk) => ptaEventRoundId(desk) === id);
    return {
      id,
      order,
      label: name || `${order}. forduló`,
      status,
      statusId: nullableNumericId(row.EventRoundStatusID),
      deskCount: desks.length,
      closedDeskCount: desks.filter((desk) => deskHasRecordedResults(desk, status, schedules, desks)).length,
    };
  });
});

const hasDraw = computed(() => rounds.value.length > 0);
const hasRecordedResults = computed(() => eventStore.hasPtaRecordedResults(eventId.value));
const canRunDraw = computed(() => isOrganizerView.value && isDrawStatus.value && !hasDraw.value);
const canRedraw = computed(
  () => isOrganizerView.value && isDrawStatus.value && hasDraw.value && !hasRecordedResults.value
);
const canChangeRoundStatus = computed(() => isOrganizerView.value && eventReachedGame.value);
const reserveCount = computed(
  () => eventStore.getPtaPlayersForEvent(eventId.value).filter((row) => row.ReserveFlg === true || row.ReserveFlg === 1).length
);

watch(
  rounds,
  (list) => {
    if (selectedRoundId.value != null && list.some((round) => round.id === selectedRoundId.value)) return;
    selectedRoundId.value = pickOpenRoundId(list);
  },
  { immediate: true }
);

const currentRound = computed(() => rounds.value.find((round) => round.id === selectedRoundId.value) || rounds.value[0] || null);

const canEnterResults = computed(
  () => playPhase.value === 'game' && canEnterRoundResults(currentRound.value?.status || '')
);

const resultsEntryHint = computed(() => {
  if (canEnterResults.value) return '';
  if (playPhase.value !== 'game') {
    return 'Eredményt csak Játék státuszban lehet felvinni.';
  }
  const status = currentRound.value?.status || '';
  if (isSettledRoundStatus(status)) {
    return 'Eredményt lezárt vagy publikált fordulóban nem lehet felvinni.';
  }
  return 'Eredményt csak Megnyitva vagy Folyamatban fordulóban lehet felvinni.';
});

const currentTables = computed<GameTableRow[]>(() => {
  const roundId = currentRound.value?.id;
  if (roundId == null) return [];
  const desks = eventStore.getPtaDesksForEvent(eventId.value);
  const roundDesks = eventStore.getPtaRoundDesksForEvent(eventId.value).filter((row) => {
    return ptaEventRoundId(row) === roundId;
  });
  const schedules = eventStore.getPtaSchedulesForEvent(eventId.value);

  return roundDesks
    .map((rd) => {
      const roundDeskId = ptaRoundDeskId(rd);
      const deskId = ptaEventDeskId(rd);
      const desk = desks.find((d) => nullableNumericId(d.EventDeskID ?? d.id) === deskId);
      const seats = bindSchedulesToRoundDesk(rd, schedules, roundDesks)
        .slice()
        .sort((a, b) => Number(a.SeatNo ?? a.ColorIndex ?? 0) - Number(b.SeatNo ?? b.ColorIndex ?? 0))
        .map((row) => {
          const playerId = ptaSchedulePlayerId(row);
          return {
            playerId: playerId ?? 0,
            name: playerName(playerId, row),
            color: ptaSeatColorFromRow(row),
            position: scoreNumber(row.Position ?? row.RankAtTable),
            resultPoint: scoreNumber(row.ResultPoint ?? row.resultPoint ?? row.Point),
            amount: scoreNumber(row.Amount ?? row.amount),
            onTrack: scoreNumber(row.OnTrack ?? row.onTrack ?? row.TruckValue),
          };
        });
      const gmId = nullableNumericId(rd.GameMasterUserID ?? rd.gameMasterUserID);
      const deskStatus = deskStatusOf(rd, currentRound.value?.status || '');
      const mineId = currentUserId.value;
      return {
        id: roundDeskId ?? deskId ?? 0,
        name: String(desk?.DName || `${(ptaDeskNumber(rd) || ptaDeskNumber(desk) || '?')}. asztal`),
        deskNo: ptaDeskNumber(rd) || ptaDeskNumber(desk),
        deskStatus,
        gameMasterUserId: gmId,
        gameMasterName: gameMasterName(gmId),
        isMine: mineId != null && gmId === mineId,
        photoUrl: String(rd.AzurePhotoUrl ?? rd.azurePhotoUrl ?? rd.PhotoUrl ?? rd.PhotoDataUrl ?? ''),
        manualOrder: rd.ManualOrderFlg === true || rd.ManualOrderFlg === 1,
        isClosed: isClosedStatus(deskStatus),
        seats,
      };
    })
    .sort((a, b) => {
      if (canClaimTables.value && a.isMine !== b.isMine) return a.isMine ? -1 : 1;
      return a.deskNo - b.deskNo;
    });
});

const filteredTables = computed(() => {
  const q = foldText(searchQuery.value.trim());
  if (!q) return currentTables.value;
  return currentTables.value.filter((table) => {
    if (foldText(table.name).includes(q) || String(table.deskNo).includes(q)) return true;
    return table.seats.some((seat) => foldText(seat.name).includes(q));
  });
});

const hasClaimedTables = computed(() => currentTables.value.some((table) => table.isMine));

const tableGroups = computed(() => {
  return [{ key: 'all', label: '', tables: filteredTables.value }];
});

const roundStatusOptions = computed(() => {
  const rows = masterDataStore.ptaEventRoundStatuses || [];
  const active = rows.filter((row) => row.ActiveFlg);
  const list = (active.length ? active : rows).slice();
  if (list.length) return list;
  return [
    { id: -1, SName: 'Megnyitva', ActiveFlg: true },
    { id: -2, SName: 'Kisorsolva', ActiveFlg: true },
    { id: -3, SName: 'Folyamatban', ActiveFlg: true },
    { id: -4, SName: 'Lezárt', ActiveFlg: true },
    { id: -5, SName: 'Publikált', ActiveFlg: true },
  ];
});

const statusSheetRound = computed(() => rounds.value.find((round) => round.id === statusSheetRoundId.value) || null);

const ptaSettings = computed(() => eventStore.getPtaSettingsForEvent(eventId.value));
const photoMandatory = computed(() => !!ptaSettings.value?.PhotoUploadMadatoryFlg);

const selectedTable = computed(() => currentTables.value.find((table) => table.id === selectedTableId.value) || null);

function clearScoreDrafts() {
  amountDrafts.value = {};
  truckDrafts.value = {};
  focusedScore.value = null;
}

function hydrateSheetSeats() {
  const table = selectedTable.value;
  if (!table) {
    sheetSeats.value = [];
    sheetManualOrder.value = false;
    clearScoreDrafts();
    return;
  }
  sheetSeats.value = table.seats.map((seat) => ({ ...seat }));
  sheetManualOrder.value = table.manualOrder;
  amountDrafts.value = Object.fromEntries(
    table.seats.map((seat) => [seat.playerId, seat.amount == null ? '' : String(seat.amount)])
  );
  truckDrafts.value = Object.fromEntries(
    table.seats.map((seat) => [seat.playerId, String(seat.onTrack ?? 0)])
  );
}

const rankedSeats = computed(() => {
  const table = selectedTable.value;
  const useSheet = isTableSheetOpen.value && sheetSeats.value.length > 0;
  const seats = useSheet ? sheetSeats.value : table?.seats || [];
  const manual = useSheet ? sheetManualOrder.value : !!table?.manualOrder;
  const ranked = rankDeskSeats(seats, ptaSettings.value, manual);
  return ranked.seats.map((seat) => ({
    ...seat,
    place: seat.position,
  }));
});

const deskHasTie = computed(() => {
  const table = selectedTable.value;
  const useSheet = isTableSheetOpen.value && sheetSeats.value.length > 0;
  const seats = useSheet ? sheetSeats.value : table?.seats || [];
  const manual = useSheet ? sheetManualOrder.value : !!table?.manualOrder;
  if (!seats.length) return false;
  return rankDeskSeats(seats, ptaSettings.value, manual).hasTie;
});

watch(
  () => [isTableSheetOpen.value, selectedTableId.value] as const,
  ([open]) => {
    if (!open) {
      isPhotoPreviewOpen.value = false;
      sheetSeats.value = [];
      sheetManualOrder.value = false;
      clearScoreDrafts();
      return;
    }
    hydrateSheetSeats();
    if (deskLocked.value) return;
    void nextTick(() => {
      const firstEmpty = rankedSeats.value.find((seat) => seat.amount == null) || rankedSeats.value[0];
      if (firstEmpty) focusAmount(firstEmpty.playerId);
    });
  }
);

watch(
  () =>
    selectedTable.value?.seats
      .map((seat) => `${seat.playerId}:${seat.amount}:${seat.onTrack}:${seat.resultPoint}`)
      .join('|'),
  () => {
    if (!isTableSheetOpen.value || focusedScore.value) return;
    const table = selectedTable.value;
    if (!table) return;
    const storeHas = table.seats.some(
      (seat) => seat.amount != null || seat.resultPoint != null || seat.position != null
    );
    const sheetHas = sheetSeats.value.some(
      (seat) => seat.amount != null || seat.resultPoint != null || seat.position != null
    );
    if (storeHas && !sheetHas) hydrateSheetSeats();
  }
);

function isLiveStatus(status: string) {
  return foldText(status).includes('folyamat');
}
function isClosedStatus(status: string) {
  const hay = foldText(status);
  return hay.includes('lezar') || hay.includes('lejatszott');
}

function statusClass(status: string) {
  if (isLiveStatus(status)) return 'is-live';
  if (isPublishedStatus(status) || isClosedStatus(status)) return 'is-done';
  return 'is-drawn';
}

function deskStatusIcon(status: string) {
  if (isLiveStatus(status)) return 'bolt';
  if (isClosedStatus(status)) return 'lock';
  return 'casino';
}

function tableHasScores(table: GameTableRow) {
  return table.seats.some(
    (seat) => seat.amount != null || seat.resultPoint != null || seat.position != null
  );
}

function seatsForCard(table: GameTableRow) {
  if (!table.isClosed && !tableHasScores(table)) return table.seats;
  const ranked = table.seats.some((seat) => seat.position != null || seat.resultPoint != null)
    ? table.seats.slice()
    : rankDeskSeats(table.seats, ptaSettings.value, table.manualOrder).seats;
  return ranked.sort((a, b) => {
    const placeA = a.position ?? 99;
    const placeB = b.position ?? 99;
    if (placeA !== placeB) return placeA - placeB;
    return (b.resultPoint ?? -1) - (a.resultPoint ?? -1);
  });
}

function openRoundStatus(roundId: number) {
  if (!canChangeRoundStatus.value) return;
  selectedRoundId.value = roundId;
  statusSheetRoundId.value = roundId;
  isStatusSheetOpen.value = true;
}

async function setRoundStatus(statusId: number, statusName: string) {
  if (!canChangeRoundStatus.value || roundSaving.value) return;
  const roundId = statusSheetRoundId.value ?? selectedRoundId.value;
  if (roundId == null) return;
  const prevId = statusSheetRound.value?.statusId ?? null;
  const prevName = statusSheetRound.value?.status || '';
  eventStore.applyEventRoundStatus(roundId, statusId, statusName);
  isStatusSheetOpen.value = false;
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  const kind = ptaRoundStatusKind(statusName);
  roundSaving.value = true;
  workLabel.value = kind === 'publish' ? 'Publikálás…' : kind === 'close' ? 'Lezárás…' : 'Mentés…';
  try {
    if (kind === 'close') {
      await closePtaRound({ eventId: id, eventRoundId: roundId, toStatusId: statusId });
    } else if (kind === 'publish') {
      await publishPtaRound({ eventId: id, eventRoundId: roundId, toStatusId: statusId });
    } else {
      await setPtaRoundStatus({ eventId: id, eventRoundId: roundId, toStatusId: statusId });
    }
  } catch (error) {
    eventStore.applyEventRoundStatus(roundId, prevId, prevName);
    $q.notify({
      message: readAxiosErrorMessage(error, 'A forduló státusza nem változott.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    roundSaving.value = false;
  }
}

function onTableClick(tableId: number, event?: Event) {
  const target = event?.target as HTMLElement | undefined;
  if (target?.closest('.game-table__claim')) return;
  if (Date.now() - claimPointerAt < 500) return;
  selectedTableId.value = tableId;
  hydrateSheetSeats();
  isTableSheetOpen.value = true;
}

function onClaimPointerDown(table: GameTableRow, event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  claimPointerAt = Date.now();
  if (isClaimTaken(table)) return;
  void toggleClaim(table);
}

function onClaimClick(table: GameTableRow) {
  if (isClaimTaken(table)) return;
  void toggleClaim(table);
}

function isClaimTaken(table: GameTableRow) {
  return table.gameMasterUserId != null && !table.isMine;
}

function claimTitle(table: GameTableRow): string {
  if (table.isMine) return 'Ez az én asztalom — koppints a levételehez';
  if (isClaimTaken(table)) {
    const label = table.gameMasterName || `GM ${table.gameMasterUserId}`;
    return `Foglalt (${label})`;
  }
  return 'Megjelölöm, hogy ez az én asztalom';
}

async function toggleClaim(table: GameTableRow) {
  if (!canClaimTables.value || currentUserId.value == null) return;
  if (isClaimTaken(table)) return;
  if (claimingDeskId.value != null) return;
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  const prev = table.gameMasterUserId;
  const next = table.isMine ? null : currentUserId.value;
  claimingDeskId.value = table.id;
  eventStore.setDeskGameMaster(eventId.value, table.id, next);
  try {
    await claimPtaDesk({
      eventId: id,
      eventRoundDeskId: table.id,
      gameMasterUserId: next,
    });
  } catch (error) {
    eventStore.setDeskGameMaster(eventId.value, table.id, prev);
    $q.notify({
      message: readAxiosErrorMessage(error, 'Az asztal foglalása nem sikerült.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    claimingDeskId.value = null;
  }
}

function deskResultPayload(seats: GameSeatRow[]) {
  return seats.map((seat) => ({
    playerId: seat.playerId,
    amount: seat.amount,
    onTrack: seat.onTrack ?? 0,
    position: seat.position,
    resultPoint: seat.resultPoint,
  }));
}

async function ensureRoundInProgress() {
  const round = currentRound.value;
  if (!round) return;
  if (isRoundLiveStatus(round.status) || isSettledRoundStatus(round.status)) return;
  if (!canEnterRoundResults(round.status)) return;
  const live = findPtaRoundStatusIdByNameHints(masterDataStore.ptaEventRoundStatuses, [
    'folyamatban',
    'folyamat',
  ]);
  if (!live) return;
  if (promotingRound) return;
  promotingRound = true;
  const id = nullableNumericId(eventId.value);
  if (id == null) {
    promotingRound = false;
    return;
  }
  try {
    await setPtaRoundStatus({ eventId: id, eventRoundId: round.id, toStatusId: live.id });
    eventStore.applyEventRoundStatus(round.id, live.id, live.name);
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A forduló státusza nem vált Folyamatban-ra.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    promotingRound = false;
  }
}

function persistDeskRanking(seats: GameSeatRow[], manualOrder: boolean) {
  if (!canEnterResults.value) return;
  const table = selectedTable.value;
  if (!table) return;
  const ranked = rankDeskSeats(seats, ptaSettings.value, manualOrder);
  sheetSeats.value = ranked.seats.map((seat) => ({ ...seat }));
  if (manualOrder) sheetManualOrder.value = true;
  eventStore.applyDeskSeatResults(eventId.value, table.id, deskResultPayload(ranked.seats));
  if (manualOrder) {
    eventStore.applyEventRoundDeskPatch(eventId.value, table.id, { ManualOrderFlg: true });
  }
  queueDeskResultsSync(table.id, ranked.seats);
  return ranked.seats;
}

function queueDeskResultsSync(tableId: number, seats: GameSeatRow[]) {
  if (resultsSyncTimer) clearTimeout(resultsSyncTimer);
  resultsSyncTimer = setTimeout(() => {
    resultsSyncTimer = null;
    void pushDeskResults(tableId, seats).catch((error) => {
      $q.notify({
        message: readAxiosErrorMessage(error, 'Az eredmény mentése nem sikerült.'),
        color: 'dark',
        textColor: 'red-4',
        position: 'top',
      });
    });
  }, 600);
}

function scoreInputFocused() {
  return focusedScore.value != null;
}

function flushPendingRoundPromote() {
  if (!pendingRoundPromote || scoreInputFocused()) return;
  pendingRoundPromote = false;
  void ensureRoundInProgress();
}

async function pushDeskResults(tableId: number, seats: GameSeatRow[]) {
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  await setPtaDeskResults({
    eventId: id,
    eventRoundDeskId: tableId,
    seats: deskResultPayload(seats),
  });
  if (scoreInputFocused()) {
    pendingRoundPromote = true;
    return;
  }
  void ensureRoundInProgress();
}

function parseAmount(raw: string): number | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < AMOUNT_MIN) return null;
  return Math.min(AMOUNT_MAX, n);
}

function parseTruck(raw: string): number {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(TRUCK_MAX, n);
}

function amountDraftOf(playerId: number, amount: number | null) {
  const draft = amountDrafts.value[playerId];
  if (draft !== undefined) return draft;
  return amount == null ? '' : String(amount);
}

function truckDraftOf(playerId: number, onTrack: number | null) {
  const draft = truckDrafts.value[playerId];
  if (draft !== undefined) return draft;
  return String(onTrack ?? 0);
}

function setAmountDraft(playerId: number, raw: string) {
  amountDrafts.value = { ...amountDrafts.value, [playerId]: raw };
}

function setTruckDraft(playerId: number, raw: string) {
  truckDrafts.value = { ...truckDrafts.value, [playerId]: raw };
}

function patchSeat(playerId: number, fields: Partial<GameSeatRow>, keepOrder: boolean) {
  if (deskLocked.value) return;
  const source = sheetSeats.value.length ? sheetSeats.value : selectedTable.value?.seats;
  if (!source) return;
  const nextSeats = source.map((seat) =>
    seat.playerId === playerId ? { ...seat, ...fields } : seat
  );
  persistDeskRanking(nextSeats, keepOrder && sheetManualOrder.value);
}

function commitAmount(playerId: number, raw: string) {
  const parsed = parseAmount(raw);
  setAmountDraft(playerId, parsed == null ? '' : String(parsed));
  patchSeat(playerId, { amount: parsed }, false);
}

function commitTruck(playerId: number, raw: string) {
  const parsed = parseTruck(raw);
  setTruckDraft(playerId, String(parsed));
  patchSeat(playerId, { onTrack: parsed }, false);
}

function focusAmount(playerId: number) {
  void nextTick(() => {
    const el = document.querySelector<HTMLInputElement>(`[data-amount="${playerId}"]`);
    el?.focus();
    el?.select();
  });
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function onAmountInput(playerId: number, event: Event) {
  const raw = inputValue(event).replace(/\D/g, '').slice(0, 2);
  setAmountDraft(playerId, raw);
  const el = event.target as HTMLInputElement;
  if (el.value !== raw) el.value = raw;
}

function onTruckInput(playerId: number, event: Event) {
  const raw = inputValue(event).replace(/\D/g, '').slice(0, 2);
  setTruckDraft(playerId, raw);
  const el = event.target as HTMLInputElement;
  if (el.value !== raw) el.value = raw;
}

function onAmountFocus(playerId: number, event: Event) {
  focusedScore.value = { playerId, field: 'amount' };
  if (amountDrafts.value[playerId] === undefined) {
    setAmountDraft(playerId, inputValue(event));
  }
  (event.target as HTMLInputElement).select();
}

function onTruckFocus(playerId: number, event: Event) {
  focusedScore.value = { playerId, field: 'truck' };
  const current = truckDraftOf(playerId, null);
  if (!current || current === '0') setTruckDraft(playerId, '');
  (event.target as HTMLInputElement).select();
}

function onAmountBlur(playerId: number, event: Event) {
  commitAmount(playerId, inputValue(event));
  if (focusedScore.value?.playerId === playerId && focusedScore.value.field === 'amount') {
    focusedScore.value = null;
  }
  flushPendingRoundPromote();
}

function onTruckBlur(playerId: number, event: Event) {
  commitTruck(playerId, inputValue(event));
  if (focusedScore.value?.playerId === playerId && focusedScore.value.field === 'truck') {
    focusedScore.value = null;
  }
  flushPendingRoundPromote();
}

function onAmountEnter(index: number, event: Event) {
  const playerId = rankedSeats.value[index]?.playerId;
  if (playerId == null) return;
  commitAmount(playerId, inputValue(event));
  const list = rankedSeats.value;
  const at = list.findIndex((seat) => seat.playerId === playerId);
  const next = (at >= 0 ? list[at + 1] : null) || list.find((seat) => seat.amount == null);
  if (next && next.playerId !== playerId) focusAmount(next.playerId);
}

function onTruckEnter(index: number, event: Event) {
  const playerId = rankedSeats.value[index]?.playerId;
  if (playerId == null) return;
  commitTruck(playerId, inputValue(event));
  const list = rankedSeats.value;
  const at = list.findIndex((seat) => seat.playerId === playerId);
  const next = at >= 0 ? list[at + 1] : null;
  if (next) focusAmount(next.playerId);
}

function onRankPointerDown(index: number, event: PointerEvent) {
  if (deskLocked.value) return;
  dragFromIndex.value = index;
  rankDragMoved = false;
  const rankRoot = (event.currentTarget as HTMLElement).closest('.game-rank');
  const onMove = (move: PointerEvent) => {
    const from = dragFromIndex.value;
    if (from == null) return;
    const rows = rankRoot?.querySelectorAll('.game-rank__row');
    if (!rows?.length) return;
    rows.forEach((row, to) => {
      const box = row.getBoundingClientRect();
      if (move.clientY >= box.top && move.clientY <= box.bottom && to !== from) {
        rankDragMoved = true;
        reorderSeats(from, to);
        dragFromIndex.value = to;
      }
    });
  };
  const onUp = () => {
    dragFromIndex.value = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.setTimeout(() => {
      rankDragMoved = false;
    }, 0);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function reorderSeats(from: number, to: number) {
  if (deskLocked.value || from === to) return;
  const next = (sheetSeats.value.length ? sheetSeats.value : rankedSeats.value).map((seat) => ({ ...seat }));
  const [moved] = next.splice(from, 1);
  if (!moved) return;
  next.splice(to, 0, moved);
  persistDeskRanking(next, true);
}

function openCamera() {
  if (deskLocked.value) return;
  cameraInput.value?.click();
}

async function onPhotoPicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  const table = selectedTable.value;
  if (!file || !table) return;
  const dataUrl = await compressPhoto(file);
  eventStore.applyEventRoundDeskPatch(eventId.value, table.id, { PhotoUrl: dataUrl });
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Fotó olvasása sikertelen'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function closeDesk() {
  const table = selectedTable.value;
  if (!table || !canEnterResults.value || deskSaving.value) return;
  const source = sheetSeats.value.length ? sheetSeats.value : table.seats;
  const ranked = rankDeskSeats(source, ptaSettings.value, sheetManualOrder.value || table.manualOrder);
  if (!ranked.allFilled) {
    $q.notify({ message: 'Mind a négy összeg kell a lezáráshoz.', color: 'dark', textColor: 'red-4', position: 'top' });
    return;
  }
  if (ranked.hasTie && !(sheetManualOrder.value || table.manualOrder)) {
    $q.notify({
      message: 'Holtverseny van — húzd a sorrendet a helyezéshez.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    return;
  }
  if (ranked.seats.some((seat) => seat.position == null || seat.resultPoint == null)) {
    $q.notify({
      message: 'Mind a négy helyezés és pontszám kell a lezáráshoz.',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
    return;
  }
  if (photoMandatory.value && !table.photoUrl) {
    $q.notify({
      message: 'A fotó feltöltése kötelező a lezáráshoz.',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
    return;
  }
  persistDeskRanking(ranked.seats, sheetManualOrder.value || table.manualOrder || ranked.hasTie);
  if (resultsSyncTimer) {
    clearTimeout(resultsSyncTimer);
    resultsSyncTimer = null;
  }
  const prevStatus = table.deskStatus;
  eventStore.applyEventRoundDeskPatch(eventId.value, table.id, { SName: 'Lezárt' });
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  deskSaving.value = true;
  workLabel.value = 'Mentés…';
  try {
    await pushDeskResults(table.id, ranked.seats);
    await patchPtaDesk({
      eventId: id,
      eventRoundDeskId: table.id,
      sName: 'Lezárt',
      photoUrl: table.photoUrl,
    });
    $q.notify({
      message: `${table.name} lezárva`,
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    isTableSheetOpen.value = false;
    selectedTableId.value = null;
  } catch (error) {
    eventStore.applyEventRoundDeskPatch(eventId.value, table.id, { SName: prevStatus });
    $q.notify({
      message: readAxiosErrorMessage(error, 'Az asztal lezárása nem sikerült.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    deskSaving.value = false;
  }
}

function goBack() {
  const { readonly: _readonly, from: _from, ...query } = route.query;
  router.push({
    path: eventRolePath(eventId.value, enteredRole.value),
    query: Object.keys(query).length ? query : eventRoleQuery(enteredRole.value),
  });
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
    /* a játék oldal a már betöltött userdata-ra is rá tud épülni */
  }
}

onMounted(() => {
  void loadDataSheet();
});

function notifyDrawFail(message: string) {
  $q.notify({
    message,
    color: 'dark',
    textColor: 'red-4',
    position: 'top',
    timeout: 2400,
  });
}

function openDrawSummary() {
  drawSummary.value = summarizePtaDraw(eventId.value);
  isDrawSummaryOpen.value = true;
}

function onStartDraw() {
  if (!canRunDraw.value) return;
  void runDraw('Sorsolás…');
}

async function runDraw(label = 'Sorsolás…') {
  if (drawSaving.value || drawing.value) return;
  if (!isDrawStatus.value || hasRecordedResults.value) {
    notifyDrawFail(
      hasRecordedResults.value
        ? 'Már van rögzített eredmény, az újrasorsolás nem lehetséges.'
        : 'Újrasorsolás csak Sorsolás státuszban indítható.'
    );
    return;
  }
  workLabel.value = label;
  drawing.value = true;
  await paintBusy();
  try {
    const result = eventStore.runPtaDraw(eventId.value);
    if (!result.ok) {
      notifyDrawFail(result.message);
      return;
    }
    selectedRoundId.value = pickOpenRoundId(rounds.value);
    openDrawSummary();
  } finally {
    drawing.value = false;
  }
}

function onRedrawDraw() {
  if (drawSaving.value) return;
  if (!isDrawStatus.value || hasRecordedResults.value) {
    notifyDrawFail(
      hasRecordedResults.value
        ? 'Már van rögzített eredmény, az újrasorsolás nem lehetséges.'
        : 'Újrasorsolás csak Sorsolás státuszban indítható.'
    );
    return;
  }
  void runDraw('Újrasorsolás…');
}

async function onFinalizeDraw() {
  if (drawSaving.value) return;
  const id = nullableNumericId(eventId.value);
  if (id == null) return;
  workLabel.value = 'Mentés…';
  drawSaving.value = true;
  await paintBusy();
  try {
    await replacePtaDraw(id);
    isDrawSummaryOpen.value = false;
    const gamePath = `/profitability/event/${id}/game`;
    if (route.path !== gamePath) {
      await router.push({ path: gamePath, query: route.query });
    }
    $q.notify({
      message: 'Sorsolás mentve.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
      timeout: 1800,
    });
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A sorsolás mentése sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    drawSaving.value = false;
  }
}
</script>

<style scoped>
.pta-game {
  background: var(--pta-page);
  overflow-x: hidden;
}

.game-shell {
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
  padding: 16px 16px 96px;
  box-sizing: border-box;
  overflow-x: hidden;
}

.game-shell *,
.game-shell *::before,
.game-shell *::after {
  box-sizing: border-box;
}
.game-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 14px;
  padding: 8px 12px 8px 8px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
}

.game-back {
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

.game-header__title {
  margin: 0;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 36px;
  color: #f1f5f9;
}

.game-header__event {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 36px;
  color: #94a3b8;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
  text-align: center;
}

.game-empty--compact {
  padding: 20px 16px;
}

.game-empty__title {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 800;
  color: #f1f5f9;
}

.game-empty__text,
.game-empty__meta {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  max-width: 28rem;
}

.game-empty__meta strong {
  color: #e2e8f0;
}

.game-empty__wait {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: #fdba74;
}

.game-rounds-panel {
  margin-bottom: 14px;
  padding: 14px;
  box-sizing: border-box;
  width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(246, 139, 41, 0.22);
  background: rgba(16, 17, 18, 0.92);
}

.game-rounds-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.game-rounds-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #f1f5f9;
}

.game-rounds-restore {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  min-height: 60px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid rgba(246, 139, 41, 0.45);
  background: linear-gradient(135deg, rgba(246, 139, 41, 0.18) 0%, rgba(16, 17, 18, 0.92) 55%);
  color: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.game-rounds-restore__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(246, 139, 41, 0.22);
  color: #f68b29;
}

.game-rounds-restore__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.game-rounds-restore__label {
  font-size: 14px;
  font-weight: 800;
}

.game-rounds-restore__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fdba74;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-rounds-restore__meta .game-round__desks {
  font-size: 12px;
  padding: 1px 7px;
}

.game-rounds-restore__chevron {
  flex-shrink: 0;
  color: #f68b29;
}

.game-rounds {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-round {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 52px;
  padding: 6px 6px 6px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.game-round.is-active {
  border-color: rgba(246, 139, 41, 0.5);
  background: rgba(246, 139, 41, 0.1);
}

.game-round__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.game-round__num {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-round__desks {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4em;
  padding: 2px 8px;
  border: 1px solid rgba(246, 139, 41, 0.55);
  border-radius: 9999px;
  background: rgba(246, 139, 41, 0.12);
  color: #fdba74;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
}

.game-round__status {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  max-width: 48%;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 9999px;
  border: 0;
  cursor: pointer;
  overflow: hidden;
}

.game-round__status.is-readonly {
  cursor: default;
}

.game-round__status.is-drawn {
  color: #fdba74;
  background: rgba(246, 139, 41, 0.12);
}

.game-round__status.is-live {
  color: #28c76f;
  background: rgba(40, 199, 111, 0.12);
}

.game-round__status.is-done {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
}

.game-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.game-search {
  flex: 1 1 100%;
  min-width: 0;
  width: 100%;
}

.game-search :deep(.q-field) {
  width: 100%;
  max-width: 100%;
}

.game-search :deep(.q-field__control) {
  border-radius: 16px;
  background: rgba(10, 11, 12, 0.55);
  min-height: 48px;
}

.game-hint {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.game-ctrl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 44px;
  max-width: 100%;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.game-ctrl:disabled {
  opacity: 0.45;
  cursor: default;
}

.game-ctrl--start {
  flex: 1 1 100%;
  width: 100%;
  border-color: rgba(40, 199, 111, 0.4);
  background: rgba(40, 199, 111, 0.16);
  color: #28c76f;
}

.game-tables-group + .game-tables-group {
  margin-top: 14px;
}

.game-tables__label {
  margin: 0 2px 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.game-tables {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 148px), 1fr));
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.game-table {
  min-width: 0;
  padding: 6px 8px 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 17, 18, 0.92);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.game-table:hover,
.game-table.is-selected {
  border-color: rgba(246, 139, 41, 0.5);
  background: rgba(246, 139, 41, 0.08);
}

.game-table.is-mine {
  border-color: rgba(246, 139, 41, 0.7);
  background:
    radial-gradient(circle at 50% 0%, rgba(246, 139, 41, 0.22), transparent 72%),
    rgba(16, 17, 18, 0.92);
  box-shadow: 0 0 0 1px rgba(246, 139, 41, 0.22);
}

.game-table.is-mine:hover,
.game-table.is-mine.is-selected {
  border-color: rgba(246, 139, 41, 0.9);
  background:
    radial-gradient(circle at 50% 0%, rgba(246, 139, 41, 0.3), transparent 72%),
    rgba(246, 139, 41, 0.1);
}

.game-table__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 3px;
  margin-bottom: 6px;
  color: #f8fafc;
}

.game-table__claim {
  position: relative;
  z-index: 2;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 44px;
  max-width: 100%;
  height: 32px;
  padding: 0 8px;
  border-radius: 9999px;
  border: 1.5px dashed rgba(246, 139, 41, 0.55);
  background: rgba(246, 139, 41, 0.08);
  color: #f68b29;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  pointer-events: auto;
}

.game-table__claim :deep(.q-icon) {
  pointer-events: none;
}

.game-table__claim:hover {
  background: rgba(246, 139, 41, 0.18);
}

.game-table__claim.is-on {
  border-style: solid;
  border-color: #f68b29;
  background: #f68b29;
  color: #0a0b0c;
}

.game-table__claim.is-taken {
  border-style: solid;
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  cursor: default;
  pointer-events: none;
}

.game-table__name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.game-table__no {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.pta-icon {
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}

.pta-icon--table {
  height: 16px;
  width: auto;
}

.pta-icon--col {
  object-fit: contain;
}

.game-table__status {
  justify-self: end;
  grid-column: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 9999px;
}

.game-table__status.is-drawn {
  color: #f68b29;
  background: rgba(246, 139, 41, 0.18);
}

.game-table__status.is-live {
  color: #28c76f;
  background: rgba(40, 199, 111, 0.18);
}

.game-table__status.is-done {
  color: #2aa9ff;
  background: rgba(42, 169, 255, 0.18);
}

.game-desk__bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.game-desk__bar .game-desk__status {
  justify-self: start;
}

.game-desk__bar .game-sheet__title {
  flex: none;
  justify-self: center;
}

.game-desk__bar .q-btn {
  justify-self: end;
}

.game-desk__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.game-desk__status-name {
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-desk__status.is-drawn {
  color: #f68b29;
}

.game-desk__status.is-live {
  color: #28c76f;
}

.game-desk__status.is-done {
  color: #2aa9ff;
}

.game-photo {
  position: relative;
  display: block;
  width: 100%;
  margin: 0 0 10px;
  overflow: hidden;
  border: 1px dashed rgba(246, 139, 41, 0.45);
  border-radius: 12px;
  background: rgba(246, 139, 41, 0.08);
  color: #fdba74;
  cursor: pointer;
}

.game-photo:disabled {
  opacity: 0.7;
  cursor: default;
}

.game-photo--preview {
  border-style: solid;
  cursor: default;
}

.game-photo__thumb {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.game-photo__view {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
}

.game-photo__retake {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 9999px;
  background: rgba(10, 11, 12, 0.78);
  color: #fdba74;
  cursor: pointer;
}

.hidden {
  display: none;
}

.game-photo__empty {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 800;
}

.game-photo__img {
  display: block;
  width: 100%;
  max-height: 140px;
  object-fit: cover;
}

.game-photo-preview {
  position: relative;
  width: min(100vw, 520px);
  background: #0a0b0c;
}

.game-photo-preview__close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  background: rgba(10, 11, 12, 0.7);
  color: #e2e8f0;
}

.game-photo-preview__img {
  display: block;
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.game-desk__tie {
  margin: 0 4px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fdba74;
}

.game-rank {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.game-rank__cols {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 0 10px 4px 14px;
}

.game-rank__cols .game-rank__grip {
  width: 18px;
  height: 18px;
}

.game-rank__col-score {
  width: 52px;
  height: 20px;
}

.game-rank__col-truck {
  width: 40px;
  height: 18px;
}

.game-rank__row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 8px 10px 8px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
}

.game-rank__row.is-closed {
  opacity: 0.85;
}

.game-num {
  width: 52px;
  height: 40px;
  flex-shrink: 0;
  padding: 0 4px;
  border: 1px solid rgba(246, 139, 41, 0.45);
  border-radius: 10px;
  background: rgba(10, 11, 12, 0.7);
  color: #f8fafc;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}

.game-num--truck {
  width: 40px;
  border-color: rgba(255, 255, 255, 0.16);
  color: #cbd5e1;
}

.game-num:focus {
  outline: none;
  border-color: #f68b29;
  background: rgba(246, 139, 41, 0.12);
}

.game-num:disabled {
  opacity: 0.6;
}

.game-rank__place {
  width: 22px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
  text-align: center;
}

.game-rank.is-locked .game-rank__grip {
  visibility: hidden;
  pointer-events: none;
}

.game-rank__grip {
  display: inline-flex;
  color: #64748b;
  touch-action: none;
}

.game-rank__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.game-rank__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-rank__meta {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.game-rank__points {
  min-width: 36px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: #fdba74;
  text-align: center;
  white-space: nowrap;
}

.game-desk__gm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.game-desk__claim {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin-top: 10px;
  padding: 12px 14px;
  min-height: 56px;
  border-radius: 16px;
  border: 2px dashed rgba(246, 139, 41, 0.5);
  background: rgba(246, 139, 41, 0.06);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.game-desk__claim.is-on {
  border-style: solid;
  border-color: rgba(246, 139, 41, 0.7);
  background: rgba(246, 139, 41, 0.16);
}

.game-desk__claim.is-taken,
.game-desk__claim:disabled {
  border-style: solid;
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(148, 163, 184, 0.08);
  cursor: default;
}

.game-desk__claim.is-taken .game-desk__claim-icon,
.game-desk__claim:disabled .game-desk__claim-icon {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.16);
}

.game-desk__claim-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 9999px;
  color: #f68b29;
  background: rgba(246, 139, 41, 0.18);
}

.game-desk__claim.is-on .game-desk__claim-icon {
  background: #f68b29;
  color: #0a0b0c;
}

.game-desk__claim-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.game-desk__gm-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.game-desk__claim.is-on .game-desk__gm-label {
  color: #fdba74;
}

.game-desk__gm-name {
  font-size: 15px;
  font-weight: 700;
  color: #cbd5e1;
  text-align: left;
}

.game-desk__gm .game-desk__gm-name {
  text-align: right;
}

.game-sheet--desk {
  min-height: 42vh;
}

.game-close-desk {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  margin: 4px 0 10px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #f68b29 0%, #ea580c 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.game-seat {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
}

.game-seat__dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.game-seat__name {
  min-width: 0;
  flex: 1;
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-seat__points {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  color: #cbd5e1;
}

.game-table__photo {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #fdba74;
  font-size: 11px;
  font-weight: 800;
}

.game-sheet {
  width: 100%;
  background: #141516;
  border-radius: 24px 24px 0 0;
  color: #e2e8f0;
}

.game-sheet__title {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  color: #f1f5f9;
}

.game-sheet__hint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.game-sheet__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-status-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  cursor: pointer;
}

.game-status-option.is-current {
  border-color: rgba(246, 139, 41, 0.45);
  background: rgba(246, 139, 41, 0.1);
}

</style>
