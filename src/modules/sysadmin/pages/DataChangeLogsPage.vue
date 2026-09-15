<template>
  <q-page class="sa-page-pad" :style-fn="pageStyle">
    <div class="sa-stack">
      <div class="sa-head">
        <h1>Adatmódosítások</h1>

        <div class="sa-tabs" role="tablist" aria-label="Időszak">
          <button
            v-for="item in datePresets"
            :key="item.id"
            type="button"
            class="sa-tab"
            :class="{ 'is-on': preset === item.id }"
            @click="setPreset(item.id)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="sa-actions">
          <button
            type="button"
            class="sa-tab"
            :class="{ 'is-on': filtersOpen }"
            @click="toggleFilters"
          >
            Szűrők
            <span v-if="extraFilterCount" class="sa-tab__badge">{{ extraFilterCount }}</span>
          </button>
          <button type="button" class="sa-run" :disabled="loading" @click="runQuery">
            <q-icon name="sym_r_play_arrow" size="18px" />
            Futtatás
          </button>
        </div>

        <div v-if="preset === 'custom'" class="sa-range">
          <div class="sa-range__pair">
            <span class="sa-range__label">Ettől</span>
            <div class="sa-range__fields">
              <q-input :model-value="fromDate" dense outlined dark readonly hide-bottom-space class="sa-dt-date">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="fromDate" dark color="amber-8" mask="YYYY-MM-DD">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup flat color="amber-8" label="Kész" />
                    </div>
                  </q-date>
                </q-popup-proxy>
                <template #append><q-icon name="event" /></template>
              </q-input>
              <q-input :model-value="fromTime" dense outlined dark readonly hide-bottom-space class="sa-dt-time">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time v-model="fromTime" dark color="amber-8" format24h mask="HH:mm" />
                </q-popup-proxy>
                <template #append><q-icon name="schedule" /></template>
              </q-input>
            </div>
          </div>
          <div class="sa-range__pair">
            <span class="sa-range__label">Eddig</span>
            <div class="sa-range__fields">
              <q-input :model-value="toDate" dense outlined dark readonly hide-bottom-space class="sa-dt-date">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="toDate" dark color="amber-8" mask="YYYY-MM-DD">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup flat color="amber-8" label="Kész" />
                    </div>
                  </q-date>
                </q-popup-proxy>
                <template #append><q-icon name="event" /></template>
              </q-input>
              <q-input :model-value="toTime" dense outlined dark readonly hide-bottom-space class="sa-dt-time">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time v-model="toTime" dark color="amber-8" format24h mask="HH:mm" />
                </q-popup-proxy>
                <template #append><q-icon name="schedule" /></template>
              </q-input>
            </div>
          </div>
        </div>

        <div v-if="filtersOpen" class="sa-extra">
          <div class="sa-filters">
            <q-select
              v-model="tableName"
              dense
              outlined
              dark
              clearable
              use-input
              hide-selected
              fill-input
              input-debounce="200"
              hide-bottom-space
              label="Tábla"
              placeholder="Tábla neve"
              class="sa-filter"
              :options="filteredTableOptions"
              emit-value
              map-options
              @filter="filterTables"
            >
              <template #prepend>
                <q-icon name="table_chart" />
              </template>
              <template #no-option>
                <div class="sa-muted q-pa-sm">Nincs találat</div>
              </template>
            </q-select>
            <q-select
              v-model="selectedUser"
              dense
              outlined
              dark
              use-input
              hide-selected
              fill-input
              input-debounce="300"
              clearable
              hide-bottom-space
              label="Felhasználó"
              placeholder="Név szerint"
              class="sa-filter"
              :options="userOptions"
              @filter="filterUsers"
            >
              <template #prepend>
                <q-icon name="person_search" />
              </template>
              <template #no-option>
                <div class="sa-muted q-pa-sm">Nincs találat</div>
              </template>
            </q-select>
          </div>
        </div>
      </div>

      <div v-if="isStale" class="sa-stale">A szűrők változtak — Futtatás a friss listához.</div>

      <div v-if="loading && !rows.length" class="sa-empty">
        <q-spinner color="amber" size="28px" />
      </div>
      <div v-else-if="!hasRun" class="sa-empty">
        Állítsd be az időszakot, majd nyomd meg a Futtatás gombot.
      </div>
      <div v-else-if="!rows.length" class="sa-empty">Nincs adatmódosítás a megadott szűrővel.</div>
      <div v-else class="sa-cards">
        <article
          v-for="row in rows"
          :key="row.id"
          class="sa-card"
          :class="{ 'is-open': expanded === row.id }"
          role="button"
          tabindex="0"
          @click="toggle(row.id)"
          @keyup.enter="toggle(row.id)"
        >
          <div class="sa-card__top">
            <span class="sa-card__id">#{{ row.recordId ?? row.id }}</span>
            <span class="sa-muted">{{ formatAdminDate(row.createdAt) }}</span>
          </div>
          <div class="sa-name">{{ tableDisplayName(row.tableName, dictionary) }}</div>
          <div class="sa-card__meta">
            <span class="sa-chip" :class="`is-action-${actionTone(row.actionType)}`">{{ actionLabel(row.actionType) }}</span>
            <span class="sa-chip is-user">{{ userLabel(row) }}</span>
          </div>
          <div v-if="expanded === row.id" class="sa-details" @click.stop>
            <div class="sa-pre-label">Változott mezők</div>
            <div v-if="diffsOf(row).length" class="sa-diffs">
              <div v-for="item in diffsOf(row)" :key="item.columnName" class="sa-diff">
                <div class="sa-diff__field">{{ item.label }}</div>
                <div
                  v-if="actionTone(row.actionType) !== 'insert'"
                  class="sa-diff__row"
                >
                  <span class="sa-diff__tag">From</span>
                  <span class="sa-diff__old">{{ item.oldValue || '∅' }}</span>
                </div>
                <div class="sa-diff__row">
                  <span class="sa-diff__tag is-to">To</span>
                  <span class="sa-diff__new">{{ item.newValue || '∅' }}</span>
                </div>
              </div>
            </div>
            <div v-else class="sa-muted">Nincs mezőváltozás a két JSON között.</div>
          </div>
        </article>
        <div v-if="totalCount > pagination.rowsPerPage" class="sa-pager">
          <q-pagination
            :model-value="pagination.page"
            dark
            color="amber-8"
            :max="pageCount"
            :max-pages="5"
            boundary-numbers
            direction-links
            @update:model-value="goPage"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  adminErrorMessage,
  fetchAuditDictionary,
  fetchSysadminDataChangeLogs,
  fetchSysadminUsers,
  formatAdminDate,
  formatSysadminUserName,
  sortDataChangeLogsNewestFirst,
} from '../api';
import { diffChangedFields, tableDisplayName } from '../dictionary';
import type {
  AuditDictionary,
  ErrorLogDatePreset,
  SysadminDataChangeLog,
  SysadminDataChangeLogQuery,
  SysadminUser,
} from '../types';

const $q = useQuasar();
const PAGE_SIZE = 50;

const datePresets: { id: ErrorLogDatePreset; label: string }[] = [
  { id: '1h', label: 'Elmúlt 1 óra' },
  { id: '1d', label: 'Elmúlt 1 nap' },
  { id: '1w', label: 'Elmúlt 1 hét' },
  { id: '1m', label: 'Elmúlt 1 hónap' },
  { id: 'custom', label: 'Egyéni' },
];

const preset = ref<ErrorLogDatePreset>('1h');
const tableName = ref('');
const selectedUser = ref<{ label: string; value: number } | null>(null);
const fromDate = ref('');
const fromTime = ref('');
const toDate = ref('');
const toTime = ref('');
const filtersOpen = ref(false);
const hasRun = ref(false);
const appliedSignature = ref('');
const appliedFilters = ref<Pick<SysadminDataChangeLogQuery, 'tableName' | 'userId' | 'from' | 'to'> | null>(null);
const rows = ref<SysadminDataChangeLog[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const expanded = ref<number | null>(null);
const pagination = ref({ page: 1, rowsPerPage: PAGE_SIZE });
const dictionary = ref<AuditDictionary | null>(null);
const userById = ref<Record<number, SysadminUser>>({});
const userOptions = ref<{ label: string; value: number }[]>([]);
const tableFilter = ref('');

const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / pagination.value.rowsPerPage)));
const tableOptions = computed(() =>
  (dictionary.value?.tables || []).map((item) => ({
    label: item.displayName === item.tableName ? item.tableName : `${item.displayName} · ${item.tableName}`,
    value: item.tableName,
  }))
);
const filteredTableOptions = computed(() => {
  const needle = tableFilter.value.trim().toLowerCase();
  if (!needle) return tableOptions.value;
  return tableOptions.value.filter(
    (item) => item.label.toLowerCase().includes(needle) || item.value.toLowerCase().includes(needle)
  );
});
const extraFilterCount = computed(() => {
  let count = 0;
  if (tableName.value) count += 1;
  if (selectedUser.value) count += 1;
  return count;
});
const draftSignature = computed(() =>
  JSON.stringify({
    preset: preset.value,
    fromDate: fromDate.value,
    fromTime: fromTime.value,
    toDate: toDate.value,
    toTime: toTime.value,
    tableName: tableName.value,
    userId: selectedUser.value?.value ?? null,
  })
);
const isStale = computed(() => hasRun.value && appliedSignature.value !== draftSignature.value);

function pageStyle() {
  return { minHeight: '0' };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function datePart(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timePart(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineLocal(date: string, time: string, endOfMinute = false): Date | null {
  if (!date) return null;
  const clock = time || (endOfMinute ? '23:59' : '00:00');
  const parsed = new Date(`${date}T${clock}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfMinute) parsed.setSeconds(59, 999);
  return parsed;
}

function rangeForPreset(id: Exclude<ErrorLogDatePreset, 'custom'>) {
  const to = new Date();
  const from = new Date(to);
  if (id === '1h') from.setTime(to.getTime() - 60 * 60 * 1000);
  if (id === '1d') from.setTime(to.getTime() - 24 * 60 * 60 * 1000);
  if (id === '1w') from.setTime(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (id === '1m') from.setMonth(from.getMonth() - 1);
  return { from, to };
}

function assignRange(from: Date, to: Date) {
  fromDate.value = datePart(from);
  fromTime.value = timePart(from);
  toDate.value = datePart(to);
  toTime.value = timePart(to);
}

function currentFilters(): Pick<SysadminDataChangeLogQuery, 'tableName' | 'userId' | 'from' | 'to'> {
  let from = combineLocal(fromDate.value, fromTime.value);
  let to = combineLocal(toDate.value, toTime.value, true);
  if (from && to && from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return {
    tableName: tableName.value || '',
    userId: selectedUser.value?.value ?? null,
    from: from?.toISOString() || null,
    to: to?.toISOString() || null,
  };
}

function rememberUsers(list: SysadminUser[]) {
  const next = { ...userById.value };
  for (const user of list) next[user.id] = user;
  userById.value = next;
}

function rememberFromLogs(list: SysadminDataChangeLog[]) {
  const next = { ...userById.value };
  for (const row of list) {
    if (row.userId == null || !row.userName || next[row.userId]) continue;
    next[row.userId] = {
      id: row.userId,
      firstName: '',
      lastName: row.userName,
      emailAddress: '',
      statusId: 0,
      isSysadmin: false,
      createdAt: null,
      updatedAt: null,
    };
  }
  userById.value = next;
}

function userLabel(row: SysadminDataChangeLog) {
  if (row.userName) return row.userName;
  if (row.userId == null) return '—';
  const user = userById.value[row.userId];
  if (user) return formatSysadminUserName(user);
  return `#${row.userId}`;
}

function actionLabel(value: string) {
  const key = value.trim().toUpperCase();
  if (key === 'INSERT') return 'Insert';
  if (key === 'UPDATE') return 'Update';
  if (key === 'DELETE') return 'Delete';
  return value || '—';
}

function actionTone(value: string) {
  const key = value.trim().toUpperCase();
  if (key === 'INSERT') return 'insert';
  if (key === 'DELETE') return 'delete';
  return 'update';
}

function diffsOf(row: SysadminDataChangeLog) {
  return diffChangedFields(row.oldDataJson, row.newDataJson, row.tableName, dictionary.value);
}

function toggle(id: number) {
  expanded.value = expanded.value === id ? null : id;
}

function setPreset(id: ErrorLogDatePreset) {
  preset.value = id;
  if (id !== 'custom') {
    const range = rangeForPreset(id);
    assignRange(range.from, range.to);
    return;
  }
  if (!fromDate.value || !toDate.value) {
    const range = rangeForPreset('1h');
    assignRange(range.from, range.to);
  }
}

function filterTables(val: string, update: (fn: () => void) => void) {
  update(() => {
    tableFilter.value = String(val || '');
  });
}

function filterUsers(val: string, update: (fn: () => void) => void) {
  const term = String(val || '').trim();
  void (async () => {
    try {
      const result = await fetchSysadminUsers({ search: term, skip: 0, take: 20 });
      rememberUsers(result.rows);
      update(() => {
        userOptions.value = result.rows.map((user) => ({
          label: `${formatSysadminUserName(user)}${user.emailAddress ? ` · ${user.emailAddress}` : ''}`,
          value: user.id,
        }));
      });
    } catch {
      update(() => {
        userOptions.value = [];
      });
    }
  })();
}

async function ensureDictionary() {
  if (dictionary.value) return;
  try {
    dictionary.value = await fetchAuditDictionary();
  } catch {
    dictionary.value = { tables: [], fields: [] };
  }
}

function toggleFilters() {
  filtersOpen.value = !filtersOpen.value;
  if (filtersOpen.value) void ensureDictionary();
}

async function load(page = pagination.value.page, take = pagination.value.rowsPerPage) {
  const filters = appliedFilters.value;
  if (!filters) return;
  loading.value = true;
  expanded.value = null;
  try {
    await ensureDictionary();
    const result = await fetchSysadminDataChangeLogs({
      ...filters,
      skip: (page - 1) * take,
      take,
    });
    rememberFromLogs(result.rows);
    rows.value = sortDataChangeLogsNewestFirst(result.rows);
    totalCount.value = result.totalCount;
    pagination.value = { ...pagination.value, page, rowsPerPage: take };
    hasRun.value = true;
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'Az adatmódosítási logok nem tölthetők.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

function goPage(page: number) {
  void load(page, pagination.value.rowsPerPage);
}

function runQuery() {
  if (preset.value !== 'custom') {
    const range = rangeForPreset(preset.value);
    assignRange(range.from, range.to);
  }
  appliedFilters.value = currentFilters();
  appliedSignature.value = draftSignature.value;
  void load(1, pagination.value.rowsPerPage);
}

onMounted(() => {
  const range = rangeForPreset('1h');
  assignRange(range.from, range.to);
});
</script>

<style scoped lang="scss">
.sa-page-pad {
  padding: 8px 16px 24px;
  min-height: 0 !important;
  height: auto !important;
  display: block !important;
}
.sa-stack {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 12px;
}
.sa-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
}
.sa-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sa-tab {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(245, 158, 11, 0.2);
  background: #111827;
  color: #94a3b8;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  &.is-on {
    color: #111827;
    background: #fbbf24;
    border-color: #fbbf24;
    .sa-tab__badge {
      background: #111827;
      color: #fde68a;
    }
  }
}
.sa-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 999px;
  background: #f59e0b;
  color: #111827;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}
.sa-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.sa-run {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #fbbf24;
  background: #fbbf24;
  color: #111827;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}
.sa-extra {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sa-stale {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
  color: #fde68a;
  font-size: 12px;
  font-weight: 700;
}
.sa-range {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
@media (min-width: 720px) {
  .sa-range {
    grid-template-columns: 1fr 1fr;
  }
}
.sa-range__pair {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sa-range__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  padding-left: 4px;
}
.sa-range__fields {
  display: flex;
  gap: 6px;
}
.sa-dt-date {
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
}
.sa-dt-time {
  width: 108px;
  flex: none;
  cursor: pointer;
}
.sa-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sa-filter {
  flex: 1 1 220px;
  min-width: 0;
}
.sa-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sa-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.14);
  background: #111827;
  color: inherit;
  text-align: left;
  cursor: pointer;
  &.is-open {
    border-color: rgba(245, 158, 11, 0.4);
  }
}
.sa-card__top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.sa-card__id {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #fbbf24;
}
.sa-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.sa-chip {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 8px;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  &.is-user {
    color: #e2e8f0;
  }
  &.is-action-insert {
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
  }
  &.is-action-update {
    color: #7dd3fc;
    background: rgba(56, 189, 248, 0.12);
  }
  &.is-action-delete {
    color: #fb7185;
    background: rgba(244, 63, 94, 0.12);
  }
}
.sa-details {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(245, 158, 11, 0.12);
}
.sa-diffs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.sa-diff {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.7);
}
.sa-diff__field {
  font-size: 12px;
  font-weight: 800;
  color: #fde68a;
}
.sa-diff__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.sa-diff__tag {
  flex: none;
  min-width: 42px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fb7185;
  &.is-to {
    color: #34d399;
  }
}
.sa-diff__old {
  color: #fda4af;
}
.sa-diff__new {
  color: #6ee7b7;
}
.sa-pager {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}
.sa-name {
  font-weight: 700;
  overflow-wrap: anywhere;
}
.sa-muted {
  color: #94a3b8;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.sa-empty {
  padding: 24px;
  color: #94a3b8;
}
.sa-pre-label {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 800;
  color: #fbbf24;
  text-transform: uppercase;
}
</style>
