<template>
  <q-page class="sa-page-pad" :style-fn="pageStyle">
    <div class="sa-stack">
      <div class="sa-head">
        <h1>Felhasználók</h1>
        <q-input
          v-model="search"
          dense
          outlined
          dark
          debounce="400"
          placeholder="Keresés név / e-mail"
          class="sa-search"
          hide-bottom-space
          clearable
          @update:model-value="reloadFirst"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <div v-if="loading && !rows.length" class="sa-empty">
        <q-spinner color="amber" size="28px" />
      </div>
      <div v-else-if="!rows.length" class="sa-empty">Nincs találat.</div>
      <template v-else>
        <div class="sa-cards sa-list--mobile">
          <article v-for="user in rows" :key="user.id" class="sa-card">
            <div class="sa-card__top">
              <div class="sa-card__identity">
                <div class="sa-name">{{ user.lastName }} {{ user.firstName }}</div>
                <div class="sa-muted">{{ user.emailAddress || '—' }} · #{{ user.id }}</div>
              </div>
              <div class="sa-icon-btns">
                <button type="button" class="sa-icon-btn" aria-label="Szerkesztés" @click="openEdit(user)">
                  <q-icon name="sym_r_edit" size="20px" />
                </button>
                <button
                  type="button"
                  class="sa-icon-btn is-sky"
                  aria-label="Belépés mint…"
                  :disabled="user.id === authStore.currentUserId || busy"
                  @click="askImpersonate(user)"
                >
                  <q-icon name="sym_r_switch_account" size="20px" />
                </button>
                <button
                  type="button"
                  class="sa-icon-btn is-rose"
                  aria-label="Kijelentkeztetés"
                  :disabled="busy"
                  @click="askForceLogout(user)"
                >
                  <q-icon name="sym_r_logout" size="20px" />
                </button>
              </div>
            </div>
            <div class="sa-card__meta">
              <span class="sa-pill" :class="`is-status-${user.statusId}`">{{ userStatusLabel(user.statusId) }}</span>
              <span v-if="user.isSysadmin" class="sa-pill is-admin">Sysadmin</span>
              <span class="sa-muted sa-card__dates">{{ formatAdminDate(user.createdAt) }}</span>
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

        <q-table
          class="sa-table sa-list--desktop"
          dark
          flat
          dense
          row-key="id"
          :rows="rows"
          :columns="columns"
          :loading="loading"
          v-model:pagination="pagination"
          :rows-number="totalCount"
          binary-state-sort
          @request="onRequest"
        >
      <template #body-cell-name="props">
        <q-td :props="props">
          <div class="sa-name">{{ props.row.lastName }} {{ props.row.firstName }}</div>
          <div class="sa-muted">{{ props.row.emailAddress || '—' }}</div>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td :props="props">
          <span class="sa-pill" :class="`is-status-${props.row.statusId}`">
            {{ userStatusLabel(props.row.statusId) }}
          </span>
        </q-td>
      </template>
      <template #body-cell-admin="props">
        <q-td :props="props">
          <span v-if="props.row.isSysadmin" class="sa-pill is-admin">Sysadmin</span>
          <span v-else class="sa-muted">—</span>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props" class="sa-actions">
          <div class="sa-icon-btns">
            <button type="button" class="sa-icon-btn" aria-label="Szerkesztés" @click="openEdit(props.row)">
              <q-icon name="sym_r_edit" size="18px" />
              <q-tooltip>Szerkesztés</q-tooltip>
            </button>
            <button
              type="button"
              class="sa-icon-btn is-sky"
              aria-label="Belépés mint…"
              :disabled="props.row.id === authStore.currentUserId || busy"
              @click="askImpersonate(props.row)"
            >
              <q-icon name="sym_r_switch_account" size="18px" />
              <q-tooltip>Belépés mint…</q-tooltip>
            </button>
            <button
              type="button"
              class="sa-icon-btn is-rose"
              aria-label="Kijelentkeztetés"
              :disabled="busy"
              @click="askForceLogout(props.row)"
            >
              <q-icon name="sym_r_logout" size="18px" />
              <q-tooltip>Kijelentkeztetés</q-tooltip>
            </button>
          </div>
        </q-td>
      </template>
      <template #no-data>
        <div class="sa-empty">Nincs találat.</div>
      </template>
    </q-table>
      </template>
    </div>

    <q-dialog
      v-model="editOpen"
      persistent
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="sa-sheet">
        <div class="sa-sheet__handle-wrap">
          <div class="sa-sheet__handle" />
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="sa-sheet__title">Felhasználó szerkesztése</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
            :disable="busy"
            @click="editOpen = false"
          />
        </q-card-section>
        <q-card-section class="q-pt-md q-px-md pb-2">
          <div class="sa-field">
            <label class="sa-field__label">Vezetéknév</label>
            <q-input v-model="editForm.lastName" dark outlined dense hide-bottom-space class="sa-field__input" />
          </div>
          <div class="sa-field">
            <label class="sa-field__label">Keresztnév</label>
            <q-input v-model="editForm.firstName" dark outlined dense hide-bottom-space class="sa-field__input" />
          </div>
          <div class="sa-field">
            <label class="sa-field__label">Státusz</label>
            <q-select
              v-model="editForm.statusId"
              :options="statusOptions"
              emit-value
              map-options
              dark
              outlined
              dense
              hide-bottom-space
              class="sa-field__input"
            />
          </div>
          <div class="sa-toggle">
            <span class="sa-field__label">Rendszergazda</span>
            <q-toggle v-model="editForm.isSysadmin" color="amber" dense />
          </div>
        </q-card-section>
        <div class="sa-sheet__actions">
          <button type="button" class="sa-sheet__btn sa-sheet__btn--ghost" :disabled="busy" @click="editOpen = false">
            Mégsem
          </button>
          <button type="button" class="sa-sheet__btn sa-sheet__btn--primary" :disabled="busy" @click="saveEdit">
            {{ busy ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </q-card>
    </q-dialog>

    <AppConfirmDialog
      v-model="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :ok-label="confirmOk"
      :variant="confirmVariant"
      :busy="busy"
      @confirm="runConfirm"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import type { QTableProps } from 'quasar';
import AppConfirmDialog from 'src/components/ui/AppConfirmDialog.vue';
import { useAuthStore } from 'src/stores/auth';
import {
  adminErrorMessage,
  fetchSysadminUsers,
  forceLogoutSysadminUser,
  formatAdminDate,
  updateSysadminUser,
  userStatusLabel,
} from '../api';
import { USER_STATUS_OPTIONS, type SysadminUser } from '../types';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

function pageStyle() {
  return { minHeight: '0' };
}

const search = ref('');
const rows = ref<SysadminUser[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const busy = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 50, rowsNumber: 0 });
const pageCount = computed(() =>
  Math.max(1, Math.ceil(totalCount.value / pagination.value.rowsPerPage))
);

function goPage(page: number) {
  void load(page, pagination.value.rowsPerPage);
}

const editOpen = ref(false);
const editUserId = ref<number | null>(null);
const editForm = reactive({ firstName: '', lastName: '', statusId: 2, isSysadmin: false });
const statusOptions = USER_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }));

const confirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmOk = ref('Igen');
const confirmVariant = ref<'default' | 'danger'>('default');
let confirmAction: (() => Promise<void>) | null = null;

const columns: QTableProps['columns'] = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true, style: 'width:70px' },
  { name: 'name', label: 'Név / e-mail', field: 'emailAddress', align: 'left' },
  { name: 'status', label: 'Státusz', field: 'statusId', align: 'left' },
  { name: 'admin', label: 'Jog', field: 'isSysadmin', align: 'left' },
  { name: 'createdAt', label: 'Létrehozva', field: (row: SysadminUser) => formatAdminDate(row.createdAt), align: 'left' },
  { name: 'updatedAt', label: 'Módosítva', field: (row: SysadminUser) => formatAdminDate(row.updatedAt), align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
];

async function load(page = pagination.value.page, take = pagination.value.rowsPerPage) {
  loading.value = true;
  try {
    const result = await fetchSysadminUsers({
      search: search.value.trim(),
      skip: (page - 1) * take,
      take,
    });
    rows.value = result.rows;
    totalCount.value = result.totalCount;
    pagination.value = { ...pagination.value, page, rowsPerPage: take, rowsNumber: result.totalCount };
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A felhasználók nem tölthetők.'),
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

function reloadFirst() {
  void load(1, pagination.value.rowsPerPage);
}

function openEdit(user: SysadminUser) {
  editUserId.value = user.id;
  editForm.firstName = user.firstName;
  editForm.lastName = user.lastName;
  editForm.statusId = user.statusId || 2;
  editForm.isSysadmin = user.isSysadmin;
  editOpen.value = true;
}

async function saveEdit() {
  if (editUserId.value == null || busy.value) return;
  busy.value = true;
  try {
    await updateSysadminUser(editUserId.value, { ...editForm });
    editOpen.value = false;
    $q.notify({ message: 'Felhasználó elmentve.', color: 'positive', position: 'top' });
    await load();
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A mentés sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    busy.value = false;
  }
}

function askImpersonate(user: SysadminUser) {
  confirmTitle.value = 'Belépés mint…';
  confirmMessage.value = `Belépsz ${user.lastName} ${user.firstName} (ID: ${user.id}) nevében?`;
  confirmOk.value = 'Belépés';
  confirmVariant.value = 'default';
  confirmAction = async () => {
    const message = await authStore.impersonate(user.id);
    $q.notify({ message: message || 'Sikeres alias belépés.', color: 'warning', textColor: 'dark', position: 'top' });
    await router.replace('/');
  };
  confirmOpen.value = true;
}

function askForceLogout(user: SysadminUser) {
  confirmTitle.value = 'Kijelentkeztetés';
  confirmMessage.value = `Minden eszközről kijelentkezteted ${user.lastName} ${user.firstName} fiókját?`;
  confirmOk.value = 'Kijelentkeztetés';
  confirmVariant.value = 'danger';
  confirmAction = async () => {
    await forceLogoutSysadminUser(user.id);
    $q.notify({
      message: 'A felhasználó összes eszközéről sikeresen kijelentkeztetve.',
      color: 'positive',
      position: 'top',
    });
  };
  confirmOpen.value = true;
}

async function runConfirm() {
  if (!confirmAction || busy.value) return;
  busy.value = true;
  try {
    await confirmAction();
    confirmOpen.value = false;
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A művelet sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    busy.value = false;
    confirmAction = null;
  }
}

void load();
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
  align-items: stretch;
  gap: 12px;
}
.sa-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 8px;
  flex: none;
}
@media (max-width: 599px) {
  .sa-head {
    flex-direction: column;
    align-items: stretch;
  }
}
h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
}
.sa-search {
  flex: 1 1 220px;
  min-width: 0;
  max-width: 340px;
  width: 100%;
}
@media (max-width: 599px) {
  .sa-search {
    flex: none;
    max-width: none;
  }
}
.sa-list--desktop {
  display: none !important;
}
@media (min-width: 1024px) {
  .sa-list--mobile {
    display: none !important;
  }
  .sa-list--desktop {
    display: flex !important;
  }
}
.sa-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sa-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.14);
  background: #111827;
}
.sa-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.sa-card__identity {
  min-width: 0;
}
.sa-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}
.sa-card__dates {
  margin-left: auto;
}
.sa-icon-btns {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.sa-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.1);
  color: #fde68a;
  cursor: pointer;

  &.is-sky {
    border-color: rgba(56, 189, 248, 0.28);
    background: rgba(56, 189, 248, 0.1);
    color: #7dd3fc;
  }
  &.is-rose {
    border-color: rgba(251, 113, 133, 0.28);
    background: rgba(244, 63, 94, 0.1);
    color: #fb7185;
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:active:not(:disabled) {
    transform: scale(0.94);
  }
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
.sa-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(148, 163, 184, 0.16);
  &.is-status-1 { color: #fbbf24; }
  &.is-status-2 { color: #34d399; }
  &.is-status-3 { color: #fb7185; }
  &.is-admin { color: #fbbf24; background: rgba(245, 158, 11, 0.16); }
}
.sa-actions {
  white-space: nowrap;
}
.sa-empty {
  padding: 24px;
  color: #94a3b8;
}
.sa-sheet {
  width: 100%;
  max-width: 560px;
  background: rgba(15, 23, 42, 0.96);
  color: #fff;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(245, 158, 11, 0.28);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
}
.sa-sheet__handle-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}
.sa-sheet__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}
.sa-sheet__title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fde68a;
}
.sa-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.sa-field__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  padding-left: 4px;
}
.sa-field__input {
  :deep(.q-field__control) {
    background: rgba(11, 15, 25, 0.7);
  }
}
.sa-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 14px;
  background: rgba(11, 15, 25, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.sa-sheet__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px));
}
.sa-sheet__btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}
.sa-sheet__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}
.sa-sheet__btn--primary {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fde68a;
}
</style>
