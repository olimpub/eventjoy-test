<template>
  <q-page class="bg-brand-dark text-white relative min-h-full overflow-x-hidden">
    <div class="absolute -right-24 top-[12%] w-80 h-80 opacity-[0.03] pointer-events-none select-none z-0">
      <img src="~assets/eventjoy_icon.svg" alt="" class="w-full h-full object-contain" />
    </div>

    <div class="relative z-10 px-5 sm:px-6 pt-6 pb-24 max-w-2xl mx-auto w-full">
      <header class="part-header">
        <q-btn
          icon="arrow_back"
          flat
          round
          dense
          class="text-slate-400 hover:text-white bg-white/5"
          aria-label="Vissza"
          @click="goBack"
        />
        <div class="part-header__text">
          <h1 class="part-header__title">Résztvevők</h1>
          <p class="part-header__event">{{ eventName }}</p>
        </div>
        <button
          type="button"
          class="part-excel-btn"
          aria-label="Excel feltöltés"
          @click="openExcelPicker"
        >
          <q-icon name="sym_r_upload_file" size="26px" />
        </button>
        <input
          ref="excelInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="onExcelSelected"
        />
      </header>

      <div class="part-kpis">
        <div class="part-kpi">
          <span class="part-kpi__value">{{ kpiRegistered }}</span>
          <span class="part-kpi__label">Jelentkezett</span>
        </div>
        <div class="part-kpi">
          <span class="part-kpi__value">{{ kpiCheckedIn }}</span>
          <span class="part-kpi__label">Belépett</span>
        </div>
        <div class="part-kpi">
          <span class="part-kpi__value">{{ kpiCapacity }}</span>
          <span class="part-kpi__label">Kapacitás</span>
        </div>
      </div>

      <!-- TEMP: tömeges beléptetés a sorsoláshoz — később töröljük -->
      <button type="button" class="part-temp-checkin" @click="checkInEveryone">
        Mindenki bejelentkezik
      </button>

      <div class="part-toolbar" :class="{ 'has-chips': activeFilterChips.length > 0 }">
        <q-input
          v-model="searchQuery"
          placeholder="Név vagy e-mail"
          dark
          outlined
          dense
          color="brand-primary"
          class="part-search"
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
          type="button"
          class="part-filter-btn"
          :class="{ 'is-on': activeFilterChips.length > 0 }"
          aria-label="Szűrők"
          @click="isFilterSheetOpen = true"
        >
          <q-icon name="sym_r_filter_alt" size="24px" />
          <span v-if="activeFilterChips.length" class="part-filter-btn__badge">
            {{ activeFilterChips.length }}
          </span>
        </button>
      </div>

      <div v-if="activeFilterChips.length" class="part-active-chips">
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          type="button"
          class="part-active-chip"
          :class="'is-' + chip.kind"
          @click="clearFilterChip(chip.kind, chip.id)"
        >
          <span>{{ chip.label }}</span>
          <q-icon name="close" size="14px" />
        </button>
      </div>

      <div v-if="filteredParticipants.length === 0" class="part-empty">
        <q-icon name="sym_r_group_off" size="36px" class="text-slate-500" />
        <p class="part-empty__title">{{ participants.length === 0 ? 'Még nincs jelentkező' : 'Nincs találat' }}</p>
        <p class="part-empty__hint">
          {{ participants.length === 0 ? 'Oszd meg a meghívót, hogy jelentkezni tudjanak.' : 'Próbálj másik keresést vagy szűrőt.' }}
        </p>
        <button v-if="participants.length === 0" type="button" class="part-empty__btn" @click="comingSoon('Meghívó')">
          <q-icon name="sym_r_share" size="18px" />
          Meghívó
        </button>
      </div>

      <div v-else class="part-list">
        <div
          v-for="row in filteredParticipants"
          :key="row.id"
          class="part-card"
        >
          <button type="button" class="part-card__main" @click="openDetail(row)">
            <span class="part-avatar">{{ row.initials }}</span>
            <span class="part-card__body">
              <span class="part-card__name">{{ row.name }}</span>
              <span
                v-if="row.roleName"
                class="part-role"
                :style="roleChipStyle(row.roleColor)"
              >{{ row.roleName }}</span>
            </span>
          </button>
          <button
            type="button"
            class="part-card__status"
            :class="{ 'is-disabled': !rowCanChangeStatus(row) }"
            :style="statusChipStyle(row.statusColor)"
            @click="openStatusForRow(row)"
          >
            <span>{{ row.statusName || 'Státusz' }}</span>
            <q-icon v-if="rowCanChangeStatus(row)" name="expand_more" size="18px" />
          </button>
        </div>
      </div>
    </div>

    <q-dialog v-model="isDetailOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selected" class="part-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="part-sheet__title">Résztvevő</div>
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
          <div class="part-sheet__person">
            <span class="part-avatar part-avatar--lg">{{ selected.initials }}</span>
            <div>
              <div class="part-card__name">{{ selected.name }}</div>
              <div v-if="selected.email" class="part-sheet__email">{{ selected.email }}</div>
            </div>
          </div>
          <div class="part-card__meta q-mb-md">
            <span v-if="selected.roleName" class="part-role" :style="roleChipStyle(selected.roleColor)">
              {{ selected.roleName }}
            </span>
          </div>
          <div class="part-sheet__status-row">
            <button
              type="button"
              class="part-status-btn"
              :class="{ 'is-disabled': !canOpenStatusSheet }"
              :style="statusChipStyle(selected.statusColor)"
              @click="onStatusClick"
            >
              <span>{{ selected.statusName || 'Státusz' }}</span>
              <q-icon v-if="canOpenStatusSheet" name="expand_more" size="18px" />
            </button>
            <button
              v-if="canUndo"
              type="button"
              class="part-undo-btn"
              :disabled="transitioning"
              @click="onUndoClick"
            >
              <q-icon name="sym_r_undo" size="16px" />
              <span>Visszavonás</span>
            </button>
          </div>

          <div class="part-sheet__list">
            <div v-if="selected.ticketName" class="part-sheet__row">
              <q-icon name="sym_r_confirmation_number" size="20px" />
              <span>{{ selected.ticketName }}</span>
            </div>
            <button
              v-if="selected.invoiceId != null"
              type="button"
              class="part-sheet__row is-btn"
              @click="comingSoon('Számla')"
            >
              <q-icon name="sym_r_receipt_long" size="20px" />
              <span>Számla</span>
              <q-icon name="chevron_right" size="18px" class="ml-auto text-slate-500" />
            </button>
            <button type="button" class="part-sheet__row is-btn" @click="comingSoon('Üzenet')">
              <q-icon name="sym_r_chat" size="20px" />
              <span>Üzenet</span>
              <q-icon name="chevron_right" size="18px" class="ml-auto text-slate-500" />
            </button>
            <button type="button" class="part-sheet__row is-btn is-danger" @click="comingSoon('Eltávolítás')">
              <q-icon name="sym_r_person_remove" size="20px" />
              <span>Eltávolítás</span>
            </button>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="isFilterSheetOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="part-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="part-sheet__title">Szűrők</div>
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
          <div class="part-filter-group">
            <div class="part-filter-group__label is-role">Szerepkör</div>
            <div class="part-sheet__list">
              <button
                type="button"
                class="part-filter-option"
                :class="{ 'is-on is-role': roleFilterIds.length === 0 }"
                @click="clearRoleFilters"
              >
                <span>Mind</span>
                <q-icon v-if="roleFilterIds.length === 0" name="check" size="18px" />
              </button>
              <button
                v-for="role in roleFilters"
                :key="'f-role-' + role.id"
                type="button"
                class="part-filter-option"
                :class="{ 'is-on is-role': roleFilterIds.includes(role.id) }"
                @click="toggleRoleFilter(role.id)"
              >
                <span>{{ role.name }}</span>
                <q-icon v-if="roleFilterIds.includes(role.id)" name="check" size="18px" />
              </button>
            </div>
          </div>
          <div class="part-filter-group">
            <div class="part-filter-group__label is-status">Státusz</div>
            <div class="part-sheet__list">
              <button
                type="button"
                class="part-filter-option"
                :class="{ 'is-on is-status': statusFilterIds.length === 0 }"
                @click="clearStatusFilters"
              >
                <span>Mind</span>
                <q-icon v-if="statusFilterIds.length === 0" name="check" size="18px" />
              </button>
              <button
                v-for="status in statusFilters"
                :key="'f-st-' + status.id"
                type="button"
                class="part-filter-option"
                :class="{ 'is-on is-status': statusFilterIds.includes(status.id) }"
                @click="toggleStatusFilter(status.id)"
              >
                <span>{{ status.name }}</span>
                <q-icon v-if="statusFilterIds.includes(status.id)" name="check" size="18px" />
              </button>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="isStatusSheetOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="part-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="part-sheet__title">{{ sheetKind === 'undo' ? 'Visszavonás' : 'Státusz' }}</div>
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
          <p class="part-sheet__hint">
            Jelenlegi:
            <span
              class="part-transition__chip"
              :style="statusChipStyle(selected?.statusColor || '')"
            >{{ selected?.statusName || 'Státusz' }}</span>
          </p>
          <div class="part-sheet__list">
            <button
              v-for="item in sheetTransitions"
              :key="item.id"
              type="button"
              class="part-transition"
              :class="{ 'is-undo': item.canUndo }"
              :disabled="transitioning"
              @click="onSelectTransition(item)"
            >
              <span class="part-transition__icon" :style="statusChipStyle(item.toStatusColor)">
                <q-icon :name="item.canUndo ? 'sym_r_undo' : 'sym_r_arrow_forward'" size="20px" />
              </span>
              <span class="part-transition__body">
                <span
                  class="part-transition__chip"
                  :style="statusChipStyle(item.toStatusColor)"
                >{{ item.toStatusName }}</span>
                <span v-if="item.canUndo" class="part-transition__meta">Előző státusz</span>
              </span>
              <q-icon name="chevron_right" size="20px" class="part-transition__chevron" />
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
      <q-card class="part-confirm">
        <div class="part-confirm__icon" :class="{ 'is-undo': confirmIsUndo }">
          <q-icon name="sym_r_undo" size="22px" />
        </div>
        <h2 class="part-confirm__title">{{ confirmTitle }}</h2>
        <p class="part-confirm__message">{{ confirmMessage }}</p>
        <div class="part-confirm__actions">
          <button type="button" class="part-confirm__btn part-confirm__btn--ghost" @click="finishConfirm(false)">
            Mégsem
          </button>
          <button
            type="button"
            class="part-confirm__btn part-confirm__btn--primary"
            @click="finishConfirm(true)"
          >
            {{ confirmOkLabel }}
          </button>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { useEventStore, type EventUser } from 'src/stores/event';
import { useMasterDataStore, ORGANIZER_ROLE_TYPE_ID } from 'src/stores/masterData';
import { nullableNumericId } from 'src/utils/apiPayload';
import { EVENT_USER_FLOW_TEMPLATE_CODE, findEventUserStatusByName, type EventUserStatusTransition } from 'src/utils/eventUserFlow';
import { membershipRoleKind } from 'src/utils/eventUserStatus';

interface ParticipantRow {
  id: number;
  name: string;
  email: string;
  initials: string;
  roleName: string;
  roleColor: string;
  masterRoleId: number | null;
  statusId: number | null;
  statusName: string;
  statusColor: string;
  prevStatusId: number | null;
  checkedIn: boolean;
  ticketName: string;
  ticketId: number | null;
  templateId: number | null;
  invoiceId: number | null;
}

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

const excelInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const roleFilterIds = ref<number[]>([]);
const statusFilterIds = ref<number[]>([]);
const isDetailOpen = ref(false);
const isFilterSheetOpen = ref(false);
const selected = ref<ParticipantRow | null>(null);
const isStatusSheetOpen = ref(false);
const sheetKind = ref<'status' | 'undo'>('status');
const transitioning = ref(false);
const isConfirmOpen = ref(false);
const confirmTitle = ref('Megerősítés');
const confirmMessage = ref('');
const confirmOkLabel = ref('Igen');
const confirmIsUndo = ref(false);
let confirmResolver: ((ok: boolean) => void) | null = null;

const eventId = computed(() => String(route.params.id));

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

const eventIsPublic = computed(() => {
  const e = dbEvent.value as Record<string, unknown> | null;
  if (!e) return true;
  return e.PublicFlg === 1 || e.publicFlg === 1 || e.PublicFlg === true || e.publicFlg === true;
});

function expandHex(color: string): string {
  let hex = color || '#38bdf8';
  if (hex.length === 4 && hex.startsWith('#')) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex;
}

function roleChipStyle(color: string) {
  const hex = expandHex(color);
  return { color: hex, backgroundColor: hex + '1A', borderColor: hex + '33' };
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
  return { color: hex, backgroundColor: hex + '1A', borderColor: hex + '33' };
}

function resolveMasterRoleId(eu: EventUser): number | null {
  const eventRole = (eventStore.roles || []).find(
    (er: any) => Number(er.id) === Number(eu.EventRoleID) || Number(er.ID) === Number(eu.EventRoleID)
  );
  return nullableNumericId(
    eventRole?.RoleID ?? eventRole?.RoleId ?? eu.RoleID ?? eu.RoleId ?? eu.EventRoleID
  );
}

function displayNameFromUser(row: Record<string, unknown>, isSelf: boolean): { name: string; email: string } {
  if (isSelf && authStore.user) {
    const last = String(authStore.user.LastName || '').trim();
    const first = String(authStore.user.FirstName || '').trim();
    const email = String(authStore.user.EmailAddress || authStore.user.Email || '').trim();
    const name = [last, first].filter(Boolean).join(' ') || email || 'Felhasználó';
    return { name, email };
  }
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const email = String(row.EmailAddress ?? row.Email ?? row.email ?? '').trim();
  const display = String(row.DisplayName ?? row.UserName ?? row.Name ?? '').trim();
  const name = [last, first].filter(Boolean).join(' ') || display || email || 'Ismeretlen';
  return { name, email };
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || '?').toUpperCase();
}

function resolveTicketTemplateId(ticket: Record<string, unknown> | null | undefined): number | null {
  if (!eventIsPublic.value) {
    return masterDataStore.getEventUserFlowTemplateIdByCode(EVENT_USER_FLOW_TEMPLATE_CODE.INVITE_ONLY);
  }
  const fromTicket = nullableNumericId(ticket?.TemplateID ?? ticket?.templateID ?? ticket?.TemplateId);
  if (fromTicket != null) return fromTicket;
  if (!ticket) return null;
  const price = Number(ticket.Price ?? ticket.price);
  const isFree = !Number.isFinite(price) || price === 0;
  return masterDataStore.getDefaultEventUserFlowTemplateId(true, isFree);
}

function mapParticipant(eu: EventUser): ParticipantRow {
  const selfId = nullableNumericId(authStore.user?.id ?? authStore.user?.ID);
  const userId = nullableNumericId(eu.UserID ?? eu.userID ?? eu.UserId);
  const isSelf = selfId != null && userId != null && selfId === userId;
  const { name, email } = displayNameFromUser(eu as Record<string, unknown>, isSelf);
  const masterRoleId = resolveMasterRoleId(eu);
  const statusId = eu.EventUserStatusID;
  const statusObj = statusId != null
    ? (masterDataStore.eventUserStatuses || []).find((s: any) => Number(s.id) === Number(statusId))
    : null;
  const statusName = statusObj
    ? String(statusObj.StatusName || statusObj.Name || '')
    : statusId != null
      ? masterDataStore.getEventUserStatusName(statusId)
      : '';
  const statusColor = String(statusObj?.ColorCode || statusObj?.ColorHex || '');
  const statusLower = statusName.toLowerCase();
  const checkedIn = statusLower.includes('belép');
  const ticket = (eventStore.tickets || []).find(
    (t: any) => Number(t.id) === Number(eu.EventTicketID) || Number(t.ID) === Number(eu.EventTicketID)
  ) as Record<string, unknown> | undefined;
  const roleTypeId = masterRoleId != null ? masterDataStore.getRoleTypeIdByRoleId(masterRoleId) : null;
  const templateId =
    roleTypeId === ORGANIZER_ROLE_TYPE_ID ? null : resolveTicketTemplateId(ticket || null);

  return {
    id: eu.id,
    name,
    email,
    initials: initialsOf(name),
    roleName: masterRoleId != null ? masterDataStore.getRoleNameById(masterRoleId) : '',
    roleColor: masterRoleId != null ? masterDataStore.getRoleColorById(masterRoleId) : '#38bdf8',
    masterRoleId,
    statusId,
    statusName,
    statusColor,
    prevStatusId: eu.PrevEventUserStatusID ?? null,
    checkedIn,
    ticketName: ticket ? String(ticket.TicketName || ticket.Name || '') : '',
    ticketId: nullableNumericId(eu.EventTicketID),
    templateId,
    invoiceId: eu.InvoiceID ?? null,
  };
}

const participants = computed(() =>
  eventStore.getEventParticipantsForEvent(eventId.value).map(mapParticipant)
);

const forwardTransitions = computed(() => {
  if (!selected.value) return [];
  return masterDataStore.getAllowedEventUserStatusTransitions(
    selected.value.templateId,
    selected.value.statusId
  );
});

const canOpenStatusSheet = computed(() => forwardTransitions.value.length > 0);
const canUndo = computed(() => selected.value?.prevStatusId != null);
const sheetTransitions = computed(() => forwardTransitions.value);

const roleFilters = computed(() => {
  const seen = new Set<number>();
  const list: { id: number; name: string; color: string }[] = [];
  for (const row of participants.value) {
    if (row.masterRoleId == null || seen.has(row.masterRoleId)) continue;
    seen.add(row.masterRoleId);
    list.push({ id: row.masterRoleId, name: row.roleName, color: row.roleColor });
  }
  return list;
});

const statusFilters = computed(() => {
  const seen = new Set<number>();
  const list: { id: number; name: string; color: string }[] = [];
  for (const row of participants.value) {
    if (row.statusId == null || seen.has(row.statusId)) continue;
    seen.add(row.statusId);
    list.push({ id: row.statusId, name: row.statusName || 'Státusz', color: row.statusColor });
  }
  return list;
});

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string; kind: 'role' | 'status'; id: number; label: string }> = [];
  for (const id of roleFilterIds.value) {
    const role = roleFilters.value.find((r) => r.id === id);
    chips.push({
      key: 'role-' + id,
      kind: 'role',
      id,
      label: role?.name || 'Szerepkör',
    });
  }
  for (const id of statusFilterIds.value) {
    const status = statusFilters.value.find((s) => s.id === id);
    chips.push({
      key: 'status-' + id,
      kind: 'status',
      id,
      label: status?.name || 'Státusz',
    });
  }
  return chips;
});

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function toggleRoleFilter(id: number) {
  roleFilterIds.value = toggleId(roleFilterIds.value, id);
}

function toggleStatusFilter(id: number) {
  statusFilterIds.value = toggleId(statusFilterIds.value, id);
}

function clearRoleFilters() {
  roleFilterIds.value = [];
}

function clearStatusFilters() {
  statusFilterIds.value = [];
}

function clearFilterChip(kind: 'role' | 'status', id: number) {
  if (kind === 'role') roleFilterIds.value = roleFilterIds.value.filter((item) => item !== id);
  else statusFilterIds.value = statusFilterIds.value.filter((item) => item !== id);
}

const filteredParticipants = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const roles = roleFilterIds.value;
  const statuses = statusFilterIds.value;
  return participants.value.filter((row) => {
    if (roles.length > 0 && (row.masterRoleId == null || !roles.includes(row.masterRoleId))) return false;
    if (statuses.length > 0 && (row.statusId == null || !statuses.includes(row.statusId))) return false;
    if (!q) return true;
    return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
  });
});

const kpiRegistered = computed(() => String(participants.value.length));
const kpiCheckedIn = computed(() => String(participants.value.filter((row) => row.checkedIn).length));
const kpiCapacity = computed(() => {
  const cap = dbEvent.value?.Capacity ?? dbEvent.value?.capacity;
  if (cap == null || cap === '' || Number(cap) === 0) return '∞';
  const n = Number(cap);
  return Number.isFinite(n) ? String(n) : '∞';
});

/** TEMP: sorsolás előtt minden játékos Belépett — később töröljük */
function checkInEveryone() {
  const statusRow = findEventUserStatusByName(masterDataStore.eventUserStatuses, 'Belépett');
  const toId = nullableNumericId(statusRow?.id ?? statusRow?.ID ?? statusRow?.Id);
  if (toId == null) {
    $q.notify({
      message: 'Nincs „Belépett” státusz a masterben',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2200,
    });
    return;
  }

  const targets = participants.value.filter((row) => {
    if (row.checkedIn || row.statusId === toId) return false;
    return (
      membershipRoleKind({
        isOrganizer: masterDataStore.isOrganizerRole(row.masterRoleId),
        roleTypeName: masterDataStore.getRoleTypeNameByRoleId(row.masterRoleId),
        roleName: row.roleName,
      }) === 'participant'
    );
  });

  for (const row of targets) {
    eventStore.applyEventUserStatus(row.id, toId, row.statusId);
  }
  refreshSelected();
  $q.notify({
    message: targets.length
      ? `${targets.length} játékos belépett`
      : 'Nincs beléptethető játékos',
    color: 'dark',
    textColor: 'blue-4',
    position: 'top',
    timeout: 1800,
    classes: 'border border-blue-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}

function openExcelPicker() {
  excelInput.value?.click();
}

function onExcelSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  comingSoon(`Excel feltöltés (${file.name})`);
}

function openDetail(row: ParticipantRow) {
  selected.value = row;
  isDetailOpen.value = true;
}

function rowCanChangeStatus(row: ParticipantRow): boolean {
  return masterDataStore.getAllowedEventUserStatusTransitions(row.templateId, row.statusId).length > 0;
}

function openStatusForRow(row: ParticipantRow) {
  selected.value = row;
  if (!rowCanChangeStatus(row)) return;
  sheetKind.value = 'status';
  isStatusSheetOpen.value = true;
}

function refreshSelected() {
  if (!selected.value) return;
  const next = participants.value.find((row) => row.id === selected.value!.id);
  if (next) selected.value = next;
}

watch(
  () => eventStore.eventParticipants,
  () => refreshSelected(),
  { deep: true }
);

function askConfirm(opts: {
  title: string;
  message: string;
  okLabel: string;
  undo?: boolean;
}): Promise<boolean> {
  confirmTitle.value = opts.title;
  confirmMessage.value = opts.message;
  confirmOkLabel.value = opts.okLabel;
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

function onStatusClick() {
  if (!canOpenStatusSheet.value) return;
  sheetKind.value = 'status';
  isStatusSheetOpen.value = true;
}

async function onUndoClick() {
  if (!selected.value || selected.value.prevStatusId == null || transitioning.value) return;
  const prevId = selected.value.prevStatusId;
  const prevName = masterDataStore.getEventUserStatusName(prevId);
  const confirmed = await askConfirm({
    title: 'Visszavonás',
    message: `Visszavonod erre: ${prevName}?`,
    okLabel: 'Visszavonás',
    undo: true,
  });
  if (!confirmed) return;

  transitioning.value = true;
  try {
    eventStore.applyEventUserStatus(selected.value.id, prevId, null);
    refreshSelected();
    $q.notify({
      message: `Visszavonva: ${prevName}`,
      color: 'dark',
      textColor: 'blue-4',
      position: 'top',
      timeout: 1800,
      classes: 'border border-blue-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  } finally {
    transitioning.value = false;
  }
}

async function onSelectTransition(item: EventUserStatusTransition) {
  if (transitioning.value || !selected.value) return;

  transitioning.value = true;
  try {
    const prevToStore = item.canRecordPrev ? selected.value.statusId : null;
    eventStore.applyEventUserStatus(selected.value.id, item.toStatusId, prevToStore);
    isStatusSheetOpen.value = false;
    refreshSelected();
    $q.notify({
      message: `Státusz: ${item.toStatusName}`,
      color: 'dark',
      textColor: 'blue-4',
      position: 'top',
      timeout: 1800,
      classes: 'border border-blue-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  } finally {
    transitioning.value = false;
  }
}

function goBack() {
  router.push({ path: `/event/${eventId.value}/manage`, query: route.query });
}

async function loadDataSheet() {
  const q = route.query.eventUserId;
  const fromQuery = q != null && q !== '' ? Number(q) : NaN;
  const fromCtx = eventStore.eventUserScreenContext?.requestEventUserId;
  const id = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : fromCtx;
  if (id == null) return;
  try {
    await eventStore.loadEventUserDataSheet(id);
  } catch (error) {
    $q.notify({
      message: error instanceof Error ? error.message : 'Résztvevők betöltése sikertelen',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2400,
      classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
  }
}

onMounted(() => {
  void loadDataSheet();
});

function comingSoon(label: string) {
  $q.notify({
    message: `${label} — hamarosan`,
    color: 'dark',
    textColor: 'blue-4',
    position: 'top',
    timeout: 1800,
    classes: 'border border-blue-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}
</script>

<style scoped>
.part-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-top: 4px;
}

.part-header__text {
  min-width: 0;
  flex: 1;
}

.part-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.part-header__event {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.part-excel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  margin-right: 10px;
  border: 1px solid rgba(56, 189, 248, 0.32);
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.14);
  color: #38bdf8;
  cursor: pointer;
}

.part-excel-btn:active {
  transform: scale(0.96);
}

.part-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.part-temp-checkin {
  display: block;
  width: 100%;
  margin: 0 0 12px;
  padding: 8px 12px;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.part-kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.part-kpi__value {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
}

.part-kpi__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.part-toolbar {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 12px;
  padding-left: 10px;
}

.part-toolbar.has-chips {
  margin-bottom: 8px;
}

.part-search {
  flex: 1;
  min-width: 0;
}

.part-search :deep(.q-field__control) {
  border-radius: 16px;
  background: rgba(11, 15, 25, 0.55);
  min-height: 48px;
}

.part-filter-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  flex-shrink: 0;
  margin-right: 10px;
  border: 1px solid rgba(167, 139, 250, 0.4);
  border-radius: 16px;
  background: rgba(167, 139, 250, 0.18);
  color: #c4b5fd;
  cursor: pointer;
}

.part-filter-btn.is-on {
  color: #ede9fe;
  background: rgba(139, 92, 246, 0.42);
  border-color: rgba(196, 181, 253, 0.7);
}

.part-filter-btn__badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #ede9fe;
  color: #5b21b6;
  font-size: 10px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
}

.part-active-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.part-active-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 12px;
  border-radius: 9999px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.part-active-chip.is-role {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.35);
}

.part-active-chip.is-status {
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.16);
  border-color: rgba(167, 139, 250, 0.38);
}

.part-filter-group {
  margin-bottom: 16px;
}

.part-filter-group:last-child {
  margin-bottom: 0;
}

.part-filter-group__label {
  margin: 0 4px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.part-filter-group__label.is-role {
  color: #38bdf8;
}

.part-filter-group__label.is-status {
  color: #c4b5fd;
}

.part-filter-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.part-filter-option.is-on.is-role {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.35);
}

.part-filter-option.is-on.is-status {
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.16);
  border-color: rgba(167, 139, 250, 0.38);
}

.part-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 36px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
}

.part-empty__title {
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 800;
}

.part-empty__hint {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  max-width: 260px;
}

.part-empty__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 16px;
  border-radius: 9999px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.part-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.part-card {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  padding: 10px 10px 10px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: inherit;
}

.part-card__main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.part-card__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.part-card__name {
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.part-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.part-card__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
  align-self: stretch;
  min-width: 118px;
  max-width: 42%;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  cursor: pointer;
}

.part-card__status.is-disabled {
  cursor: default;
  opacity: 0.85;
}

.part-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.part-avatar--lg {
  width: 48px;
  height: 48px;
  font-size: 14px;
}

.part-role {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.part-card__check {
  color: #4ade80;
  flex-shrink: 0;
}

.part-sheet {
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

.part-sheet__title {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #38bdf8;
}

.part-sheet__person {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.part-sheet__email {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.part-sheet__hint {
  margin: 0 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.part-sheet__hint strong {
  color: #f8fafc;
}

.part-sheet__status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.part-status-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.part-status-btn.is-disabled {
  cursor: default;
}

.part-undo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.part-undo-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.part-transition {
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

.part-transition:disabled {
  opacity: 0.45;
  cursor: default;
}

.part-transition.is-undo {
  border-color: rgba(148, 163, 184, 0.28);
}

.part-transition__icon {
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

.part-transition.is-undo .part-transition__icon {
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
}

.part-transition__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.part-transition__chip {
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

.part-transition__name {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}

.part-transition__meta {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.part-transition__chevron {
  margin-left: auto;
  color: #64748b;
}

.part-confirm {
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

.part-confirm__icon {
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

.part-confirm__icon.is-undo {
  background: rgba(148, 163, 184, 0.14);
  color: #cbd5e1;
}

.part-confirm__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: #38bdf8;
}

.part-confirm__icon.is-undo + .part-confirm__title {
  color: #cbd5e1;
}

.part-confirm__message {
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-align: center;
  color: #cbd5e1;
}

.part-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.part-confirm__btn {
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

.part-confirm__btn--ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.14);
  color: #cbd5e1;
}

.part-confirm__btn--primary {
  background: #38bdf8;
  color: #0f172a;
}

.part-sheet__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.part-sheet__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.part-sheet__row.is-btn {
  cursor: pointer;
}

.part-sheet__row.is-danger {
  color: #fb7185;
  border-color: rgba(244, 63, 94, 0.28);
}
</style>
