<template>
  <q-page class="sa-page-pad" :style-fn="pageStyle">
    <div class="sa-stack">
      <div class="sa-head">
        <h1>Kabalák</h1>
        <button type="button" class="sa-run" @click="openCreate">
          <q-icon name="sym_r_add" size="18px" />
          Új kabala
        </button>
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        dark
        debounce="200"
        placeholder="Keresés név szerint"
        class="sa-search"
        hide-bottom-space
        clearable
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <div v-if="loading && !rows.length" class="sa-empty">
        <q-spinner color="amber" size="28px" />
      </div>
      <div v-else-if="loadError" class="sa-empty">
        <p>{{ loadError }}</p>
        <q-btn unelevated color="amber-8" text-color="dark" label="Újra" @click="load" />
      </div>
      <div v-else-if="!filtered.length" class="sa-empty">
        {{ rows.length ? 'Nincs találat.' : 'Még nincs kabala.' }}
      </div>

      <div v-else class="sa-list">
        <article
          v-for="row in filtered"
          :key="row.id"
          class="sa-row"
          :class="{ 'is-inactive': !row.activeFlg }"
        >
          <span class="sa-thumb">
            <img v-if="profileUrl(row)" :src="profileUrl(row)" alt="" />
            <span v-else>{{ initialOf(row.name) }}</span>
          </span>
          <div class="sa-row__text">
            <div class="sa-name">{{ row.name }}</div>
            <div class="sa-muted">
              <span v-if="!row.activeFlg">Inaktív · </span>
              {{ teamLabel(row.teamCount) }}
            </div>
          </div>
          <button type="button" class="sa-icon-btn" aria-label="Szerkesztés" @click="openEdit(row)">
            <q-icon name="sym_r_edit" size="18px" />
          </button>
        </article>
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
          <div class="sa-sheet__title">{{ form.id ? 'Kabala szerkesztése' : 'Új kabala' }}</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
            :disable="saving || !!uploadingSlot"
            @click="editorOpen = false"
          />
        </q-card-section>

        <q-card-section class="q-pt-md q-px-md pb-2 sa-sheet__scroll">
          <div class="sa-field">
            <label class="sa-field__label">Név</label>
            <q-input
              v-model="form.name"
              dark
              outlined
              dense
              maxlength="80"
              hide-bottom-space
              class="sa-field__input"
              placeholder="A csapat neve"
            />
          </div>

          <div v-for="slot in assetSlots" :key="slot.id" class="sa-field">
            <label class="sa-field__label">{{ slot.label }}</label>
            <div class="sa-image">
              <span class="sa-thumb sa-thumb--lg">
                <q-spinner v-if="uploadingSlot === slot.id" color="amber" size="22px" />
                <img v-else-if="form[slot.id].blobUrl" :src="form[slot.id].blobUrl" alt="" />
                <span v-else>{{ initialOf(form.name) }}</span>
              </span>
              <div class="sa-image__actions">
                <button type="button" class="sa-add-item" :disabled="!!uploadingSlot || saving" @click="pickImage(slot.id)">
                  <q-icon name="sym_r_upload" size="16px" />
                  {{ form[slot.id].blobUrl ? 'Kép csere' : 'Kép feltöltése' }}
                </button>
                <button
                  v-if="form[slot.id].blobUrl"
                  type="button"
                  class="sa-add-item is-rose"
                  :disabled="!!uploadingSlot || saving"
                  @click="clearSlot(slot.id)"
                >
                  Kép törlése
                </button>
                <p class="sa-muted">{{ slot.hint }}</p>
              </div>
            </div>
          </div>
          <input
            ref="fileInput"
            class="sa-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="onImage"
          />

          <div class="sa-toggle">
            <span class="sa-field__label">Aktív</span>
            <q-toggle v-model="form.activeFlg" color="amber" dense />
          </div>
          <p v-if="!form.activeFlg && form.teamCount > 0" class="sa-note">
            {{ teamLabel(form.teamCount) }} már ki van osztva. A csapat megmarad, új estre nem választható.
          </p>
        </q-card-section>

        <div class="sa-sheet__actions">
          <button type="button" class="sa-sheet__btn sa-sheet__btn--ghost" :disabled="saving" @click="editorOpen = false">
            Mégse
          </button>
          <button type="button" class="sa-sheet__btn sa-sheet__btn--primary" :disabled="saving || !!uploadingSlot" @click="save">
            {{ saving ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  adminErrorMessage,
  fetchSysadminKabalas,
  saveSysadminKabala,
  uploadSysadminKabalaImage,
} from '../api';
import type { KabalaAssetSlot, SysadminKabala, SysadminKabalaAsset } from '../types';

const assetSlots: { id: KabalaAssetSlot; label: string; hint: string }[] = [
  { id: 'profile', label: 'Profilkép', hint: 'Lista és csapatválasztó. JPEG, PNG vagy WebP, max 5 MB.' },
  { id: 'full', label: 'Teljes kép', hint: 'Nagy megjelenés. JPEG, PNG vagy WebP, max 5 MB.' },
];

const $q = useQuasar();
const rows = ref<SysadminKabala[]>([]);
const loading = ref(false);
const loadError = ref('');
const search = ref('');
const editorOpen = ref(false);
const saving = ref(false);
const uploadingSlot = ref<KabalaAssetSlot | ''>('');
const pendingSlot = ref<KabalaAssetSlot>('profile');
const fileInput = ref<HTMLInputElement | null>(null);

function blankAsset(slot: KabalaAssetSlot): SysadminKabalaAsset {
  return { slot, kind: 'image', blobUrl: null, mime: null, sizeInBytes: null };
}

const form = reactive({
  id: 0,
  name: '',
  activeFlg: true,
  teamCount: 0,
  profile: blankAsset('profile'),
  full: blankAsset('full'),
});

const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('hu');
  if (!term) return rows.value;
  return rows.value.filter((row) => row.name.toLocaleLowerCase('hu').includes(term));
});

function pageStyle() {
  return { minHeight: '0' };
}

function initialOf(name: string) {
  const letter = name.trim().charAt(0);
  return letter ? letter.toLocaleUpperCase('hu') : '?';
}

function profileUrl(row: SysadminKabala) {
  return row.assets.find((asset) => asset.slot === 'profile')?.blobUrl || '';
}

function copyAsset(slot: KabalaAssetSlot, source: SysadminKabalaAsset | undefined) {
  const target = form[slot];
  target.blobUrl = source?.blobUrl ?? null;
  target.mime = source?.mime ?? null;
  target.sizeInBytes = source?.sizeInBytes ?? null;
  target.kind = 'image';
}

function clearSlot(slot: KabalaAssetSlot) {
  form[slot].blobUrl = null;
  form[slot].mime = null;
  form[slot].sizeInBytes = null;
}

function teamLabel(count: number) {
  if (count <= 0) return 'Nincs kiosztva';
  return count === 1 ? '1 eseményen kiosztva' : `${count} eseményen kiosztva`;
}

function notify(message: string, error = false) {
  $q.notify({
    message,
    color: 'dark',
    textColor: error ? 'red-4' : 'amber-4',
    position: 'top',
  });
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await fetchSysadminKabalas();
  } catch (error) {
    loadError.value = adminErrorMessage(error, 'A kabalák nem tölthetők.');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.id = 0;
  form.name = '';
  form.activeFlg = true;
  form.teamCount = 0;
  clearSlot('profile');
  clearSlot('full');
  editorOpen.value = true;
}

function openEdit(row: SysadminKabala) {
  form.id = row.id;
  form.name = row.name;
  form.activeFlg = row.activeFlg;
  form.teamCount = row.teamCount;
  copyAsset('profile', row.assets.find((asset) => asset.slot === 'profile'));
  copyAsset('full', row.assets.find((asset) => asset.slot === 'full'));
  editorOpen.value = true;
}

function pickImage(slot: KabalaAssetSlot) {
  pendingSlot.value = slot;
  fileInput.value?.click();
}

async function onImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const slot = pendingSlot.value;
  input.value = '';
  if (!file) return;
  uploadingSlot.value = slot;
  try {
    const uploaded = await uploadSysadminKabalaImage(file, slot);
    form[slot].blobUrl = uploaded.blobUrl;
    form[slot].mime = uploaded.mime;
    form[slot].sizeInBytes = uploaded.sizeInBytes;
    form[slot].kind = 'image';
  } catch (error) {
    notify(adminErrorMessage(error, 'A kép feltöltése sikertelen.'), true);
  } finally {
    uploadingSlot.value = '';
  }
}

async function save() {
  const name = form.name.trim();
  if (!name) {
    notify('Add meg a kabala nevét.', true);
    return;
  }
  if (name.length > 80) {
    notify('A kabala neve legfeljebb 80 karakter.', true);
    return;
  }
  saving.value = true;
  try {
    await saveSysadminKabala({
      id: form.id,
      name,
      activeFlg: form.activeFlg,
      assets: [
        { ...form.profile, slot: 'profile', kind: 'image' },
        { ...form.full, slot: 'full', kind: 'image' },
      ],
    });
    editorOpen.value = false;
    notify('Kabala mentve.');
    await load();
  } catch (error) {
    notify(adminErrorMessage(error, 'A kabala mentése sikertelen.'), true);
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
  max-width: 42rem;
  margin: 0 auto;
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
.sa-search :deep(.q-field__control) {
  background: rgba(15, 23, 42, 0.7);
}
.sa-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sa-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.14);
  background: #111827;
  &.is-inactive {
    opacity: 0.72;
  }
}
.sa-row__text {
  min-width: 0;
  flex: 1;
}
.sa-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(245, 158, 11, 0.14);
  color: #fde68a;
  font-weight: 800;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.sa-thumb--lg {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  font-size: 22px;
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
.sa-field__input :deep(.q-field__control) {
  background: rgba(11, 15, 25, 0.7);
}
.sa-image {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sa-image__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.sa-file {
  display: none;
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
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
  &.is-rose {
    border-color: rgba(251, 113, 133, 0.28);
    background: rgba(244, 63, 94, 0.1);
    color: #fb7185;
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
.sa-note {
  margin: 0 0 8px;
  color: #fcd34d;
  font-size: 13px;
  line-height: 1.4;
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
  background: #f59e0b;
  color: #111827;
}
</style>
