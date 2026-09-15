<template>
  <q-page class="sa-page-pad" :style-fn="pageStyle">
    <div class="sa-stack">
      <div class="sa-head">
        <h1>Verziók</h1>
        <button type="button" class="sa-run" @click="openCreate">
          <q-icon name="sym_r_add" size="18px" />
          Új verzió
        </button>
      </div>

      <div v-if="loading && !rows.length" class="sa-empty">
        <q-spinner color="amber" size="28px" />
      </div>
      <div v-else-if="loadError" class="sa-empty">
        <p>{{ loadError }}</p>
        <q-btn unelevated color="amber-8" text-color="dark" label="Újra" @click="load" />
      </div>
      <div v-else-if="!rows.length" class="sa-empty">Még nincs rögzített kiadás.</div>

      <div v-else class="sa-list">
        <q-expansion-item
          v-for="row in rows"
          :key="row.versionId"
          dark
          switch-toggle-side
          expand-separator
          class="sa-exp"
          :class="{ 'is-inactive': !row.activeFlg }"
        >
          <template #header>
            <div class="sa-exp__head">
              <div class="sa-exp__titles">
                <div class="sa-name">{{ formatVersionLabel(row.versionNumber) }}</div>
                <div class="sa-muted">{{ formatReleaseDate(row.releaseDate) }}</div>
              </div>
              <div class="sa-exp__meta">
                <span v-if="!row.activeFlg" class="sa-chip is-off">Inaktív</span>
                <span class="sa-chip">{{ row.items.length }} tétel</span>
                <button
                  type="button"
                  class="sa-icon-btn"
                  aria-label="Szerkesztés"
                  @click.stop="openEdit(row)"
                >
                  <q-icon name="sym_r_edit" size="18px" />
                </button>
              </div>
            </div>
          </template>

          <div class="sa-exp__body">
            <p v-if="row.summary" class="sa-summary">{{ row.summary }}</p>
            <p v-else class="sa-muted">Nincs összefoglaló.</p>

            <div v-if="!row.items.length" class="sa-muted">Nincs tétel ebben a kiadásban.</div>
            <ul v-else class="sa-items">
              <li
                v-for="(item, itemIndex) in row.items"
                :key="`${row.versionId}-${item.itemId}-${itemIndex}`"
                class="sa-item"
                :class="{ 'is-inactive': !item.activeFlg }"
              >
                <div class="sa-item__top">
                  <span v-if="!item.activeFlg" class="sa-chip is-off">Inaktív</span>
                  <router-link
                    v-if="item.ticketId"
                    class="sa-link"
                    :to="{ name: 'sysadmin-ticket', params: { ticketId: item.ticketId } }"
                    @click.stop
                  >
                    Jegy #{{ item.ticketId }}
                  </router-link>
                  <span v-if="item.internalReference" class="sa-chip">{{ item.internalReference }}</span>
                  <a
                    v-if="item.externalReference && isHttpUrl(item.externalReference)"
                    class="sa-link"
                    :href="item.externalReference"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                  >
                    {{ item.externalReference }}
                  </a>
                  <span v-else-if="item.externalReference" class="sa-muted">{{ item.externalReference }}</span>
                </div>
                <p class="sa-item__desc">{{ item.description || '—' }}</p>
              </li>
            </ul>
          </div>
        </q-expansion-item>
      </div>
    </div>

    <q-dialog
      v-model="editorOpen"
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
          <div class="sa-sheet__title">{{ form.versionId ? 'Verzió szerkesztése' : 'Új verzió' }}</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
            :disable="saving"
            @click="editorOpen = false"
          />
        </q-card-section>

        <q-card-section class="q-pt-md q-px-md pb-2 sa-sheet__scroll">
          <div class="sa-field">
            <label class="sa-field__label">Verziószám</label>
            <q-input
              v-model="form.versionNumber"
              dark
              outlined
              dense
              hide-bottom-space
              class="sa-field__input"
              placeholder="pl. 1.0.1"
            />
          </div>
          <div class="sa-field">
            <label class="sa-field__label">Kiadás dátuma</label>
            <q-input
              :model-value="form.releaseDate"
              dense
              outlined
              dark
              readonly
              hide-bottom-space
              class="sa-field__input"
            >
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="form.releaseDate" dark color="amber-8" mask="YYYY-MM-DD">
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup flat color="amber-8" label="Kész" />
                  </div>
                </q-date>
              </q-popup-proxy>
              <template #append>
                <q-icon name="event" />
              </template>
            </q-input>
          </div>
          <div class="sa-field">
            <label class="sa-field__label">Összefoglaló</label>
            <q-input
              v-model="form.summary"
              dark
              outlined
              type="textarea"
              autogrow
              hide-bottom-space
              class="sa-field__input"
            />
          </div>
          <div class="sa-toggle">
            <span class="sa-field__label">Aktív</span>
            <q-toggle v-model="form.activeFlg" color="amber" dense />
          </div>

          <div class="sa-items-head">
            <span class="sa-field__label">Tételek</span>
            <button type="button" class="sa-add-item" @click="addItem">
              <q-icon name="sym_r_add" size="16px" />
              Új tétel
            </button>
          </div>

          <div v-if="!form.items.length" class="sa-muted q-mb-md">Még nincs tétel. Adj hozzá egyet.</div>
          <article v-for="(item, index) in form.items" :key="item.localId" class="sa-item-form">
            <div class="sa-item-form__top">
              <span class="sa-item-form__n">{{ index + 1 }}. tétel</span>
              <button type="button" class="sa-icon-btn is-rose" aria-label="Tétel törlése" @click="removeItem(index)">
                <q-icon name="sym_r_delete" size="18px" />
              </button>
            </div>
            <div class="sa-field">
              <label class="sa-field__label">Leírás</label>
              <q-input
                v-model="item.description"
                dark
                outlined
                type="textarea"
                autogrow
                hide-bottom-space
                class="sa-field__input"
              />
            </div>
            <div class="sa-item-form__grid">
              <div class="sa-field">
                <label class="sa-field__label">Jegy ID</label>
                <q-input
                  v-model="item.ticketId"
                  dark
                  outlined
                  dense
                  hide-bottom-space
                  type="number"
                  class="sa-field__input"
                  placeholder="opcionális"
                />
              </div>
              <div class="sa-field">
                <label class="sa-field__label">Belső hivatkozás</label>
                <q-input
                  v-model="item.internalReference"
                  dark
                  outlined
                  dense
                  hide-bottom-space
                  class="sa-field__input"
                  placeholder="TASK-100"
                />
              </div>
            </div>
            <div class="sa-field">
              <label class="sa-field__label">Külső hivatkozás</label>
              <q-input
                v-model="item.externalReference"
                dark
                outlined
                dense
                hide-bottom-space
                class="sa-field__input"
                placeholder="https://…"
              />
            </div>
            <div class="sa-toggle">
              <span class="sa-field__label">Aktív</span>
              <q-toggle v-model="item.activeFlg" color="amber" dense />
            </div>
          </article>
        </q-card-section>

        <div class="sa-sheet__actions">
          <button type="button" class="sa-sheet__btn sa-sheet__btn--ghost" :disabled="saving" @click="editorOpen = false">
            Mégse
          </button>
          <button type="button" class="sa-sheet__btn sa-sheet__btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { nullableNumericId } from 'src/utils/apiPayload';
import {
  adminErrorMessage,
  fetchSysadminVersions,
  formatReleaseDate,
  formatVersionLabel,
  isHttpUrl,
  saveSysadminVersion,
} from '../api';
import type { SysadminAppVersion, SysadminAppVersionItem } from '../types';

interface DraftItem {
  localId: string;
  itemId: number;
  ticketId: string;
  internalReference: string;
  externalReference: string;
  description: string;
  activeFlg: boolean;
}

function pageStyle() {
  return { minHeight: '0' };
}

function todayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function datePart(value: string | null | undefined) {
  if (!value) return todayDate();
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return todayDate();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

function newLocalId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankItem(): DraftItem {
  return {
    localId: newLocalId(),
    itemId: 0,
    ticketId: '',
    internalReference: '',
    externalReference: '',
    description: '',
    activeFlg: true,
  };
}

function itemFromRow(item: SysadminAppVersionItem): DraftItem {
  return {
    localId: newLocalId(),
    itemId: item.itemId,
    ticketId: item.ticketId != null ? String(item.ticketId) : '',
    internalReference: item.internalReference,
    externalReference: item.externalReference,
    description: item.description,
    activeFlg: item.activeFlg,
  };
}

const $q = useQuasar();
const rows = ref<SysadminAppVersion[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const editorOpen = ref(false);
const form = reactive({
  versionId: 0,
  versionNumber: '',
  releaseDate: todayDate(),
  summary: '',
  activeFlg: true,
  items: [] as DraftItem[],
});

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await fetchSysadminVersions();
  } catch (error) {
    rows.value = [];
    loadError.value = adminErrorMessage(error, 'A verziók nem tölthetők.');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.versionId = 0;
  form.versionNumber = '';
  form.releaseDate = todayDate();
  form.summary = '';
  form.activeFlg = true;
  form.items = [blankItem()];
}

function openCreate() {
  resetForm();
  editorOpen.value = true;
}

function openEdit(row: SysadminAppVersion) {
  form.versionId = row.versionId;
  form.versionNumber = row.versionNumber;
  form.releaseDate = datePart(row.releaseDate);
  form.summary = row.summary;
  form.activeFlg = row.activeFlg;
  form.items = row.items.length ? row.items.map(itemFromRow) : [blankItem()];
  editorOpen.value = true;
}

function addItem() {
  form.items.push(blankItem());
}

function removeItem(index: number) {
  form.items.splice(index, 1);
}

function draftToItem(item: DraftItem): SysadminAppVersionItem | null {
  const description = item.description.trim();
  const internalReference = item.internalReference.trim();
  const externalReference = item.externalReference.trim();
  const ticketId = nullableNumericId(item.ticketId);
  if (!description && !internalReference && !externalReference && ticketId == null) return null;
  return {
    itemId: item.itemId > 0 ? item.itemId : 0,
    versionId: form.versionId || null,
    ticketId: ticketId != null && ticketId > 0 ? ticketId : null,
    internalReference,
    externalReference,
    description,
    activeFlg: item.activeFlg,
  };
}

async function save() {
  const versionNumber = form.versionNumber.trim();
  if (!versionNumber) {
    $q.notify({ message: 'A verziószám kötelező.', color: 'dark', textColor: 'orange-4', position: 'top' });
    return;
  }
  const items = form.items.map(draftToItem).filter((item): item is SysadminAppVersionItem => item != null);
  const missingDescription = items.find((item) => !item.description.trim());
  if (missingDescription) {
    $q.notify({
      message: 'Minden tételnél kell leírás, vagy hagyd üresen a sort.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    return;
  }
  saving.value = true;
  try {
    await saveSysadminVersion({
      versionId: form.versionId,
      versionNumber,
      releaseDate: form.releaseDate ? `${form.releaseDate}T12:00:00.000Z` : null,
      summary: form.summary,
      activeFlg: form.activeFlg,
      items,
    });
    editorOpen.value = false;
    $q.notify({ message: 'Verzió mentve.', color: 'dark', textColor: 'amber-4', position: 'top' });
    await load();
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A verzió mentése sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    saving.value = false;
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
  gap: 12px;
}
.sa-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
}
.sa-run {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.16);
  color: #fde68a;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.sa-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sa-exp {
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.14);
  background: #111827;
  overflow: hidden;
  &.is-inactive {
    opacity: 0.72;
  }
  :deep(.q-expansion-item__container) {
    background: transparent;
  }
  :deep(.q-item) {
    padding: 12px 12px 12px 4px;
    min-height: 64px;
  }
}
.sa-exp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
}
.sa-exp__titles {
  min-width: 0;
}
.sa-exp__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.sa-exp__body {
  padding: 0 14px 14px;
}
.sa-summary {
  margin: 0 0 12px;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.sa-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sa-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  &.is-inactive {
    opacity: 0.7;
  }
}
.sa-item__top {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.sa-item__desc {
  margin: 0;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.sa-name {
  font-weight: 800;
  overflow-wrap: anywhere;
}
.sa-muted {
  color: #94a3b8;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.sa-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.14);
  &.is-off {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.14);
  }
}
.sa-link {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  overflow-wrap: anywhere;
}
.sa-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.1);
  color: #fde68a;
  cursor: pointer;
  &.is-rose {
    border-color: rgba(251, 113, 133, 0.28);
    background: rgba(244, 63, 94, 0.1);
    color: #fb7185;
  }
}
.sa-empty {
  padding: 24px;
  color: #94a3b8;
  text-align: center;
}
.sa-sheet {
  width: 100%;
  max-width: 640px;
  max-height: min(92vh, 860px);
  background: rgba(15, 23, 42, 0.96);
  color: #fff;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(245, 158, 11, 0.28);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
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
.sa-sheet__scroll {
  overflow-y: auto;
  min-height: 0;
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
  margin-bottom: 12px;
  border-radius: 14px;
  background: rgba(11, 15, 25, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.sa-items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 10px;
}
.sa-add-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.1);
  color: #fde68a;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.sa-item-form {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.14);
  background: rgba(11, 15, 25, 0.55);
}
.sa-item-form__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sa-item-form__n {
  font-size: 12px;
  font-weight: 800;
  color: #fde68a;
}
.sa-item-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 520px) {
  .sa-item-form__grid {
    grid-template-columns: 1fr;
  }
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
