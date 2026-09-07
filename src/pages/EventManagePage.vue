<template>
  <q-page class="bg-brand-dark text-white relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 px-4 sm:px-6 pt-4 pb-24 max-w-2xl mx-auto w-full">
      <!-- Closable identity panel -->
      <section class="manage-panel">
        <div class="manage-panel__top">
          <RoleSwitchChip
            :event-id="eventId"
            :current="enteredRole"
            :roles="enterableRoles"
          />
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

        <h1 class="manage-panel__title">{{ eventName }}</h1>

        <div class="manage-status-row">
          <button
            type="button"
            class="manage-status-btn"
            :class="{ 'is-disabled': !canOpenStatusSheet }"
            :style="statusVisual"
            @click="onStatusClick"
          >
            <span v-if="statusKey === 'active'" class="manage-status-btn__dot" />
            <span>{{ statusLabel }}</span>
            <q-icon v-if="canOpenStatusSheet" name="expand_more" size="18px" />
          </button>
          <button
            v-if="canUndo"
            type="button"
            class="manage-undo-btn"
            :disabled="!!pendingApprovalId || transitioning"
            @click="onUndoClick"
          >
            <q-icon name="sym_r_undo" size="16px" />
            <span>Visszavonás</span>
          </button>
          <span v-if="pendingApprovalId" class="manage-pending-chip">
            <q-icon name="sym_r_hourglass_top" size="14px" />
            Jóváhagyásra vár
          </span>
        </div>

        <div class="manage-kpis">
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ kpiRegistered }}</span>
            <span class="manage-kpi__label">Jelentkezett</span>
          </div>
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ kpiCheckedIn }}</span>
            <span class="manage-kpi__label">Belépett</span>
          </div>
          <div class="manage-kpi">
            <span class="manage-kpi__value">{{ kpiCapacity }}</span>
            <span class="manage-kpi__label">Kapacitás</span>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="manage-grid">
        <button
          v-for="action in manageActions"
          :key="action.id"
          type="button"
          class="manage-tile"
          @click="action.onClick"
        >
          <span class="manage-tile__icon">
            <q-icon :name="action.icon" size="26px" />
            <span v-if="action.badge" class="manage-tile__badge">{{ action.badge > 99 ? '99+' : action.badge }}</span>
          </span>
          <span class="manage-tile__label">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <q-dialog v-model="isStatusSheetOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="manage-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="manage-sheet__title">Státusz</div>
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
          <p class="manage-sheet__hint">
            Jelenlegi:
            <span class="manage-transition__chip" :style="statusChipStyle(currentStatusColor)">{{ statusLabel }}</span>
          </p>
          <p v-if="pendingApprovalId" class="manage-sheet__pending">
            Van függő jóváhagyás. A váltás a jóváhagyás után lép életbe.
          </p>
          <div class="manage-sheet__list">
            <button
              v-for="item in sheetTransitions"
              :key="item.id"
              type="button"
              class="manage-transition"
              :class="{
                'is-close': item.canClose,
                'is-undo': item.canUndo,
                'is-approval': item.requiresApproval,
              }"
              :disabled="!!pendingApprovalId || transitioning"
              @click="onSelectTransition(item)"
            >
              <span class="manage-transition__icon" :style="statusChipStyle(item.toStatusColor)">
                <q-icon
                  :name="item.requiresApproval ? 'sym_r_verified_user' : item.canClose ? 'sym_r_cancel' : item.canUndo ? 'sym_r_undo' : 'sym_r_arrow_forward'"
                  size="20px"
                />
              </span>
              <span class="manage-transition__body">
                <span class="manage-transition__chip" :style="statusChipStyle(item.toStatusColor)">{{ item.toStatusName }}</span>
                <span v-if="item.requiresApproval" class="manage-transition__meta">Jóváhagyást igényel</span>
                <span v-else-if="item.canClose" class="manage-transition__meta">Lezárás / törlés</span>
                <span v-else-if="item.canUndo" class="manage-transition__meta">Előző státusz</span>
              </span>
              <q-icon name="chevron_right" size="20px" class="manage-transition__chevron" />
            </button>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="isConfirmOpen"
      transition-show="scale"
      transition-hide="scale"
      @hide="onConfirmHide"
    >
      <q-card class="manage-confirm">
        <div class="manage-confirm__icon" :class="{ 'is-danger': confirmDanger, 'is-undo': confirmIsUndo }">
          <q-icon :name="confirmDanger ? 'sym_r_cancel' : 'sym_r_undo'" size="22px" />
        </div>
        <h2 class="manage-confirm__title">{{ confirmTitle }}</h2>
        <p class="manage-confirm__message">{{ confirmMessage }}</p>
        <div class="manage-confirm__actions">
          <button type="button" class="manage-confirm__btn manage-confirm__btn--ghost" @click="finishConfirm(false)">
            Mégsem
          </button>
          <button
            type="button"
            class="manage-confirm__btn"
            :class="confirmDanger ? 'manage-confirm__btn--danger' : 'manage-confirm__btn--primary'"
            @click="finishConfirm(true)"
          >
            {{ confirmOkLabel }}
          </button>
        </div>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="isSoonOpen"
      transition-show="scale"
      transition-hide="scale"
    >
      <ComingSoonCube :title="soonLabel" :icon="soonIcon" />
    </q-dialog>

    <EventProgramEditor
      v-model="isProgramEditorOpen"
      :event-id="eventId"
      @saved="onWizardSaved"
    />

    <CreateEventWizard
      v-if="wizardVisible"
      v-model="wizardVisible"
      mode="edit"
      :event-id="eventId"
      @saved="onWizardSaved"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import CreateEventWizard from 'src/components/event-wizard/CreateEventWizard.vue';
import ComingSoonCube from 'src/components/event/ComingSoonCube.vue';
import EventProgramEditor from 'src/components/event/EventProgramEditor.vue';
import RoleSwitchChip from 'src/components/event/RoleSwitchChip.vue';
import { useCommunicationStore } from 'src/stores/communication';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { findEventStatus, type EventStatusTransition } from 'src/utils/eventFlow';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { setEventStatus } from 'src/utils/eventChange';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const communicationStore = useCommunicationStore();
const wizardVisible = ref(false);
const isSoonOpen = ref(false);
const soonLabel = ref('Hamarosan');
const soonIcon = ref('sym_r_schedule');
const isStatusSheetOpen = ref(false);
const isProgramEditorOpen = ref(false);
const transitioning = ref(false);
const isConfirmOpen = ref(false);
const confirmTitle = ref('Megerősítés');
const confirmMessage = ref('');
const confirmOkLabel = ref('Igen');
const confirmDanger = ref(false);
const confirmIsUndo = ref(false);
let confirmResolver: ((ok: boolean) => void) | null = null;

const eventId = computed(() => String(route.params.id));

const sheetEventUserId = computed(() => {
  const q = route.query.eventUserId;
  if (q != null && q !== '') {
    const n = Number(q);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return enteredRole.value?.eventUserId ?? null;
});

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
    return roles.find((r) => String(r.eventRoleId) === String(qRole)) || roles.find((r) => r.isOrganizer) || roles[0] || null;
  }
  return roles.find((r) => r.isOrganizer) || roles[0] || null;
});

const eventTypeId = computed(() => {
  const e = dbEvent.value;
  if (!e) return null;
  return e.EventTypeID ?? e.eventTypeId ?? null;
});

const sheetParticipants = computed(() => eventStore.getEventParticipantsForEvent(eventId.value));
const sheetLoaded = computed(() => {
  const ctx = eventStore.eventUserScreenContext;
  if (!ctx?.eventId) return false;
  return String(ctx.eventId) === eventId.value;
});

const eventStatusId = computed(() => {
  const e = dbEvent.value;
  if (!e) return null;
  return e.EventStatusID ?? e.eventStatusID ?? e.StatusID ?? e.StatusId ?? null;
});

const pendingApprovalId = computed(() => {
  const e = dbEvent.value;
  if (!e) return null;
  return e.PendingApprovalID ?? e.pendingApprovalID ?? e.PendingApprovalId ?? null;
});

const actorRoleId = computed(() => {
  const fromEntered = enteredRole.value?.masterRoleId ?? null;
  if (fromEntered != null) return fromEntered;
  const e = dbEvent.value;
  if (!e) return null;
  return eventStore.getMasterRoleIdsForEvent(e.id)[0] ?? null;
});

const prevEventStatusId = computed(() => {
  const e = dbEvent.value;
  if (!e) return null;
  return nullableNumericId(e.PrevEventStatusID ?? e.prevEventStatusID ?? e.PrevEventStatusId);
});

const allowedTransitions = computed(() => {
  const e = dbEvent.value;
  if (!e) return [] as EventStatusTransition[];
  return masterDataStore.getAllowedEventStatusTransitions(
    eventTypeId.value,
    eventStatusId.value,
    actorRoleId.value
  );
});

const sheetTransitions = computed(() => allowedTransitions.value);

const canOpenStatusSheet = computed(() => allowedTransitions.value.length > 0);
const canUndo = computed(() => prevEventStatusId.value != null);

const statusRecord = computed(() => findEventStatus(masterDataStore.eventStatuses, eventStatusId.value));

const statusLabel = computed(() => {
  const rec = statusRecord.value;
  if (rec) return String(rec.StatusName || rec.Name || 'Státusz');
  return masterDataStore.getEventStatusNameById(
    eventStatusId.value,
    eventStatusId.value == null ? 'Tervezés' : 'Státusz'
  );
});

const statusKey = computed(() => {
  const name = (statusLabel.value || '').toLowerCase();
  if (pendingApprovalId.value) return 'pending';
  if (name.includes('folyamat') || name.includes('fut') || name.includes('élő') || name.includes('live')) return 'active';
  if (name.includes('lezárt') || name.includes('kész') || name.includes('töröl')) return 'completed';
  return 'other';
});

const currentStatusColor = computed(() => {
  const rec = statusRecord.value;
  return String(rec?.ColorHex ?? rec?.ColorCode ?? rec?.colorHex ?? rec?.colorCode ?? '');
});

function expandHex(color: string): string {
  let hex = color || '';
  if (hex.length === 4 && hex.startsWith('#')) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

function statusChipStyle(color: string) {
  if (!color) {
    return {
      color: '#94a3b8',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.1)',
    };
  }
  const hex = expandHex(color);
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return {
      color: '#94a3b8',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.1)',
    };
  }
  return { color: hex, backgroundColor: hex + '1A', borderColor: hex + '33' };
}

const statusVisual = computed(() => {
  const rec = statusRecord.value;
  const hex = String(rec?.ColorHex ?? rec?.ColorCode ?? rec?.colorHex ?? '');
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const r = parseInt(full.slice(1, 3), 16);
    const g = parseInt(full.slice(3, 5), 16);
    const b = parseInt(full.slice(5, 7), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
      color: full,
    };
  }
  if (statusKey.value === 'active') {
    return {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.35)',
      color: '#4ade80',
    };
  }
  if (statusKey.value === 'completed' || statusKey.value === 'pending') {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.16)',
      color: '#94a3b8',
    };
  }
  return {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
  };
});

const kpiRegistered = computed(() => {
  if (!sheetLoaded.value) return '—';
  return String(sheetParticipants.value.length);
});
const kpiCheckedIn = computed(() => {
  if (!sheetLoaded.value) return '—';
  return String(
    sheetParticipants.value.filter((row) => {
      const sid = Number(row.EventUserStatusID);
      const name = masterDataStore.getEventUserStatusName(sid).toLowerCase();
      return name.includes('belép');
    }).length
  );
});
const kpiCapacity = computed(() => {
  const cap = dbEvent.value?.Capacity ?? dbEvent.value?.capacity;
  if (cap == null || cap === '' || Number(cap) === 0) return '∞';
  const n = Number(cap);
  return Number.isFinite(n) ? String(n) : '∞';
});

const eventIsClosed = computed(() => {
  if (statusKey.value === 'completed') return true;
  const current = eventStatusId.value;
  if (current == null) return false;
  return (masterDataStore.eventFlowStatuses || []).some(
    (row) => Number(row.ToStatusID) === Number(current) && row.CanCloseFlg
  );
});

const isOwnerEnteredRole = computed(() =>
  masterDataStore.isOwnerRole(enteredRole.value?.masterRoleId)
);

const unreadMessageCount = computed(() => communicationStore.totalUnreadChats || 0);

const manageActions = computed(() => {
  const items: Array<{
    id: string;
    label: string;
    icon: string;
    badge?: number;
    onClick: () => void;
  }> = [
    { id: 'participants', label: 'Résztvevők', icon: 'sym_r_group', onClick: openParticipants },
    { id: 'edit', label: 'Szerkesztés', icon: 'sym_r_edit_square', onClick: openWizard },
    { id: 'cover', label: 'Borítókép', icon: 'sym_r_add_a_photo', onClick: () => comingSoon('Borítókép', 'sym_r_add_a_photo') },
    { id: 'program', label: 'Programok', icon: 'sym_r_view_timeline', onClick: openProgramEditor },
    { id: 'tickets', label: 'Jegykezelés', icon: 'sym_r_qr_code_scanner', onClick: openScan },
    { id: 'files', label: 'Anyagok', icon: 'sym_r_folder', onClick: () => comingSoon('Anyagok', 'sym_r_folder') },
    {
      id: 'messages',
      label: 'Üzenetek',
      icon: 'sym_r_chat',
      badge: unreadMessageCount.value || undefined,
      onClick: () => comingSoon('Üzenetek', 'sym_r_chat'),
    },
    { id: 'news', label: 'Hírek', icon: 'sym_r_newspaper', onClick: () => comingSoon('Hírek', 'sym_r_newspaper') },
  ];
  if (eventIsClosed.value) {
    items.push({
      id: 'reviews',
      label: 'Értékelések',
      icon: 'sym_r_star',
      onClick: () => comingSoon('Értékelések', 'sym_r_star'),
    });
  }
  if (isOwnerEnteredRole.value) {
    items.push({
      id: 'settlements',
      label: 'Elszámolások',
      icon: 'sym_r_account_balance_wallet',
      onClick: () => comingSoon('Elszámolások', 'sym_r_account_balance_wallet'),
    });
  }
  return items;
});

function askConfirm(opts: {
  title: string;
  message: string;
  okLabel: string;
  danger?: boolean;
  undo?: boolean;
}): Promise<boolean> {
  confirmTitle.value = opts.title;
  confirmMessage.value = opts.message;
  confirmOkLabel.value = opts.okLabel;
  confirmDanger.value = !!opts.danger;
  confirmIsUndo.value = !!opts.undo;
  isConfirmOpen.value = true;
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function finishConfirm(ok: boolean) {
  const resolve = confirmResolver;
  confirmResolver = null;
  isConfirmOpen.value = false;
  resolve?.(ok);
}

function onConfirmHide() {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  resolve(false);
}

function closePanel() {
  void router.push({ name: 'my_events' });
}

async function loadDataSheet() {
  const id = sheetEventUserId.value;
  if (id == null) return;
  try {
    await eventStore.loadEventUserDataSheet(id);
  } catch (error) {
    $q.notify({
      message: error instanceof Error ? error.message : 'Adatlap betöltése sikertelen',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2400,
      classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  }
}

function onWizardSaved() {
  void loadDataSheet();
}

onMounted(() => {
  void loadDataSheet();
});
watch(sheetEventUserId, (id, prev) => {
  if (id != null && id !== prev) void loadDataSheet();
});

function openParticipants() {
  router.push({
    path: `/event/${eventId.value}/manage/participants`,
    query: route.query,
  });
}

function openScan() {
  router.push({
    path: `/event/${eventId.value}/manage/scan`,
    query: route.query,
  });
}

function onStatusClick() {
  if (!canOpenStatusSheet.value) return;
  isStatusSheetOpen.value = true;
}

async function onUndoClick() {
  const prevId = prevEventStatusId.value;
  if (prevId == null || pendingApprovalId.value || transitioning.value) return;
  const prevName = masterDataStore.getEventStatusNameById(prevId);
  const confirmed = await askConfirm({
    title: 'Visszavonás',
    message: `Visszavonod erre: ${prevName}?`,
    okLabel: 'Visszavonás',
    undo: true,
  });
  if (!confirmed) return;

  transitioning.value = true;
  try {
    const id = nullableNumericId(eventId.value);
    if (id == null) throw new Error('Hiányzó esemény.');
    await setEventStatus({ eventId: id, toStatusId: prevId, prevStatusId: null });
    $q.notify({
      message: `Visszavonva: ${prevName}`,
      color: 'dark',
      textColor: 'blue-4',
      position: 'top',
      timeout: 1800,
      classes: 'border border-blue-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A visszavonás sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2400,
      classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  } finally {
    transitioning.value = false;
  }
}

async function onSelectTransition(item: EventStatusTransition) {
  if (transitioning.value || pendingApprovalId.value) return;

  if (item.requiresApproval) {
    $q.notify({
      message: 'Ez a váltás jóváhagyást igényel — a kérés még nincs bekötve.',
      color: 'dark',
      textColor: 'amber-4',
      position: 'top',
      timeout: 2400,
      classes: 'border border-amber-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
    return;
  }

  const needsConfirm = item.canClose;
  const confirmed = needsConfirm
    ? await askConfirm({
        title: 'Státuszváltás',
        message: `Átállítod: ${item.toStatusName}?`,
        okLabel: 'Igen',
        danger: item.canClose,
      })
    : true;

  if (!confirmed) return;

  transitioning.value = true;
  try {
    const id = nullableNumericId(eventId.value);
    if (id == null) throw new Error('Hiányzó esemény.');
    const prevToStore = item.canRecordPrev ? nullableNumericId(eventStatusId.value) : null;
    await setEventStatus({
      eventId: id,
      toStatusId: item.toStatusId,
      prevStatusId: prevToStore,
    });
    isStatusSheetOpen.value = false;
    $q.notify({
      message: `Státusz: ${item.toStatusName}`,
      color: 'dark',
      textColor: 'blue-4',
      position: 'top',
      timeout: 1800,
      classes: 'border border-blue-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A státuszváltás sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2400,
      classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  } finally {
    transitioning.value = false;
  }
}

function openWizard() {
  wizardVisible.value = true;
}

function openProgramEditor() {
  isProgramEditorOpen.value = true;
}

function comingSoon(label: string, icon = 'sym_r_schedule') {
  soonLabel.value = label;
  soonIcon.value = icon;
  isSoonOpen.value = true;
}
</script>

<style scoped>
.manage-panel {
  position: relative;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 16px 16px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  margin-bottom: 16px;
}

.manage-panel__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.manage-panel__title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  color: #fff;
  text-align: center;
}

.manage-status-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.manage-status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 168px;
  min-height: 44px;
  padding: 10px 28px;
  border-radius: 9999px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
}

.manage-status-btn.is-disabled {
  cursor: default;
  opacity: 0.9;
}

.manage-undo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.manage-undo-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.manage-status-btn__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
}

.manage-pending-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 9999px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.manage-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.manage-kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border-radius: 16px;
  background: rgba(11, 15, 25, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.manage-kpi__value {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.1;
}

.manage-kpi__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.manage-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 108px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: inherit;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.manage-tile:active {
  transform: scale(0.98);
}

.manage-tile:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(56, 189, 248, 0.25);
}

.manage-tile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  position: relative;
}

.manage-tile__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #f43f5e;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
}

.manage-tile__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
}

.manage-sheet {
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
  color: #fff;
}

.manage-sheet__title {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #38bdf8;
}

.manage-sheet__hint {
  margin: 0 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.manage-sheet__pending {
  margin: 0 4px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #fbbf24;
}

.manage-sheet__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manage-transition {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.55);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.manage-transition:disabled {
  opacity: 0.45;
  cursor: default;
}

.manage-transition.is-close {
  border-color: rgba(244, 63, 94, 0.28);
}

.manage-transition.is-undo {
  border-color: rgba(148, 163, 184, 0.28);
}

.manage-transition.is-approval {
  border-color: rgba(251, 191, 36, 0.28);
}

.manage-transition__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  flex-shrink: 0;
}

.manage-transition.is-close .manage-transition__icon {
  background: rgba(244, 63, 94, 0.12);
  color: #fb7185;
}

.manage-transition.is-undo .manage-transition__icon {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}

.manage-transition.is-approval .manage-transition__icon {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

.manage-transition__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.manage-transition__chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.manage-transition__name {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}

.manage-transition__meta {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.manage-transition__chevron {
  margin-left: auto;
  color: #64748b;
}

.manage-confirm {
  width: min(100%, 360px);
  margin: 16px;
  padding: 22px 20px 18px;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;
}

.manage-confirm__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.manage-confirm__icon.is-undo {
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
}

.manage-confirm__icon.is-danger {
  background: rgba(244, 63, 94, 0.14);
  color: #fb7185;
}

.manage-confirm__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: #38bdf8;
}

.manage-confirm__icon.is-undo + .manage-confirm__title {
  color: #cbd5e1;
}

.manage-confirm__icon.is-danger + .manage-confirm__title {
  color: #fb7185;
}

.manage-confirm__message {
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-align: center;
  color: #cbd5e1;
}

.manage-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.manage-confirm__btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.manage-confirm__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.manage-confirm__btn--primary {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
}

.manage-confirm__btn--danger {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.35);
  color: #fb7185;
}
</style>
