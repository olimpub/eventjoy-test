<template>
  <q-page class="sa-page-pad" :style-fn="pageStyle">
    <div class="sa-stack">
      <div class="sa-head">
        <h1>Támogatás</h1>
        <div class="sa-tabs">
          <button
            v-for="item in ticketStore.displayStatuses"
            :key="item.ticketStatusId"
            type="button"
            class="sa-tab"
            :class="{ 'is-on': statusId === item.ticketStatusId }"
            @click="setStatus(item.ticketStatusId)"
          >
            {{ item.statusName }}
            <span
              v-if="!item.isClosedState && ticketStore.statusCount(item.ticketStatusId)"
              class="sa-tab__badge"
            >
              {{ ticketStore.formatBadge(ticketStore.statusCount(item.ticketStatusId)) }}
            </span>
          </button>
        </div>
      </div>

      <div v-if="loading && !rows.length" class="sa-empty">
        <q-spinner color="amber" size="28px" />
      </div>
      <div v-else-if="!rows.length" class="sa-empty">Nincs jegy ebben a státuszban.</div>
      <template v-else>
        <div class="sa-cards sa-list--mobile">
          <button
            v-for="row in rows"
            :key="row.ticketId"
            type="button"
            class="sa-card"
            :class="{ 'is-closed': ticketStore.isClosed(row.statusId, row.isClosedState) }"
            @click="openTicket(row.ticketId)"
          >
            <div class="sa-card__top">
              <span class="sa-card__id">#{{ row.ticketId }}</span>
              <span class="sa-muted">{{ formatAdminDate(row.updatedAt || row.createdAt) }}</span>
            </div>
            <div class="sa-name">{{ row.title }}</div>
            <div class="sa-muted">{{ row.reporterName || row.reporterEmail || 'Felhasználó' }}</div>
            <div class="sa-card__meta">
              <span class="sa-chip">{{ row.category }}</span>
              <span
                class="sa-status"
                :class="`is-${ticketStatusTone(ticketStore.statusName(row.statusId, row.statusName), ticketStore.isClosed(row.statusId, row.isClosedState))}`"
              >
                {{ ticketStore.statusName(row.statusId, row.statusName) }}
              </span>
              <span v-if="row.targetVersion" class="sa-chip is-version">v{{ row.targetVersion.replace(/^v/i, '') }}</span>
            </div>
          </button>
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

        <q-table
          class="sa-table sa-list--desktop"
          dark
          flat
          dense
          row-key="ticketId"
          :rows="rows"
          :columns="columns"
          :loading="loading"
          v-model:pagination="pagination"
          :rows-number="totalCount"
          @request="onRequest"
          @row-click="(_e, row) => openTicket(row.ticketId)"
          :row-class="(row: SysadminTicketRow) => ticketStore.isClosed(row.statusId, row.isClosedState) ? 'is-closed' : ''"
        >
          <template #body-cell-title="props">
            <q-td :props="props">
              <div class="sa-name">{{ props.row.title }}</div>
              <div class="sa-muted">
                {{ props.row.reporterName || props.row.reporterEmail || 'Felhasználó' }}
              </div>
            </q-td>
          </template>
          <template #body-cell-statusName="props">
            <q-td :props="props">
              <span
                class="sa-status"
                :class="`is-${ticketStatusTone(ticketStore.statusName(props.row.statusId, props.row.statusName), ticketStore.isClosed(props.row.statusId, props.row.isClosedState))}`"
              >
                {{ ticketStore.statusName(props.row.statusId, props.row.statusName) }}
              </span>
            </q-td>
          </template>
          <template #no-data>
            <div class="sa-empty">Nincs jegy ebben a státuszban.</div>
          </template>
        </q-table>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import type { QTableProps } from 'quasar';
import { ticketStatusTone } from 'src/utils/supportTickets';
import { useTicketStore } from 'src/stores/ticket';
import { adminErrorMessage, fetchSysadminTickets, formatAdminDate } from '../api';
import type { SysadminTicketRow } from '../types';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const ticketStore = useTicketStore();

function pageStyle() {
  return { minHeight: '0' };
}

const statusId = ref(Number(route.query.statusId) || 1);
const rows = ref<SysadminTicketRow[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 50, rowsNumber: 0 });
const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / pagination.value.rowsPerPage)));

const columns: QTableProps['columns'] = [
  { name: 'ticketId', label: '#', field: 'ticketId', align: 'left', style: 'width:70px' },
  { name: 'title', label: 'Tárgy', field: 'title', align: 'left' },
  { name: 'typeName', label: 'Kategória', field: 'category', align: 'left' },
  { name: 'statusName', label: 'Státusz', field: 'statusName', align: 'left' },
  { name: 'targetVersion', label: 'Verzió', field: 'targetVersion', align: 'left' },
  { name: 'updatedAt', label: 'Frissítve', field: (row: SysadminTicketRow) => formatAdminDate(row.updatedAt || row.createdAt), align: 'left' },
];

async function load(page = pagination.value.page, take = pagination.value.rowsPerPage) {
  loading.value = true;
  try {
    await ticketStore.ensureLoaded();
    const result = await fetchSysadminTickets({
      statusId: statusId.value,
      skip: (page - 1) * take,
      take,
    });
    rows.value = result.rows;
    totalCount.value = result.totalCount;
    ticketStore.setStatusCount(statusId.value, result.totalCount);
    pagination.value = { ...pagination.value, page, rowsPerPage: take, rowsNumber: result.totalCount };
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A jegyek nem tölthetők.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

function onRequest(payload: { pagination: { page: number; rowsPerPage: number } }) {
  void load(payload.pagination.page, payload.pagination.rowsPerPage);
}

function goPage(page: number) {
  void load(page, pagination.value.rowsPerPage);
}

function setStatus(id: number) {
  statusId.value = id;
  void router.replace({ path: '/admin/tickets', query: { statusId: String(id) } });
}

function openTicket(id: number) {
  void router.push({ name: 'sysadmin-ticket', params: { ticketId: id } });
}

onMounted(() => {
  void ticketStore.refreshCounts();
  void load();
});

watch(
  () => route.query.statusId,
  (value) => {
    const next = Number(value) || 1;
    statusId.value = next;
    void load(1);
  }
);
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
  &.is-closed {
    opacity: 0.62;
    .sa-name {
      text-decoration: line-through;
      color: #94a3b8;
    }
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
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 999px;
  padding: 3px 8px;
  &.is-version {
    color: #c4b5fd;
    background: rgba(167, 139, 250, 0.14);
  }
}
.sa-status {
  font-size: 11px;
  font-weight: 800;
  border-radius: 999px;
  padding: 3px 8px;
  &.is-pending { color: #fbbf24; background: rgba(251, 191, 36, 0.12); }
  &.is-progress, &.is-open { color: #38bdf8; background: rgba(56, 189, 248, 0.12); }
  &.is-scheduled { color: #a78bfa; background: rgba(167, 139, 250, 0.14); }
  &.is-released { color: #34d399; background: rgba(52, 211, 153, 0.12); }
  &.is-rejected { color: #fb7185; background: rgba(244, 63, 94, 0.12); }
  &.is-withdrawn, &.is-closed { color: #94a3b8; background: rgba(148, 163, 184, 0.1); }
}
.sa-list--desktop { display: none !important; }
@media (min-width: 1024px) {
  .sa-list--mobile { display: none !important; }
  .sa-list--desktop { display: flex !important; }
}
.sa-pager {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}
.sa-table {
  background: #111827;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.12);
  cursor: pointer;
  :deep(tr.is-closed) {
    opacity: 0.62;
    .sa-name { text-decoration: line-through; color: #94a3b8; }
  }
}
.sa-name { font-weight: 700; overflow-wrap: anywhere; }
.sa-muted { color: #94a3b8; font-size: 12px; overflow-wrap: anywhere; }
.sa-empty { padding: 24px; color: #94a3b8; }
</style>
