<template>
  <q-page :class="pageClass">
    <div v-if="isOpTheme" class="op-glow" aria-hidden="true" />
    <div class="relative z-10 px-5 sm:px-6 pt-6 pb-24 max-w-2xl mx-auto w-full">
      <header class="mat-header">
        <q-btn
          icon="arrow_back"
          flat
          round
          dense
          class="text-slate-400 hover:text-white bg-white/5"
          aria-label="Vissza"
          @click="goBack"
        />
        <div class="mat-header__text">
          <h1 class="mat-header__title">Anyagok</h1>
          <p class="mat-header__event">{{ eventName }}</p>
        </div>
        <button type="button" class="mat-add-btn" aria-label="Feltöltés" @click="openUpload">
          <q-icon name="sym_r_add" size="28px" />
        </button>
      </header>

      <div v-if="loading && !rows.length" class="mat-empty">
        <q-spinner :color="isOpTheme ? 'amber-5' : 'sky-400'" size="28px" />
        <p class="mat-empty__hint">Anyagok betöltése…</p>
      </div>
      <div v-else-if="loadError" class="mat-empty">
        <q-icon name="sym_r_error" size="28px" class="text-rose-400" />
        <p class="mat-empty__title">{{ loadError }}</p>
        <button type="button" class="mat-empty__btn" @click="loadList">Újra</button>
      </div>
      <div v-else-if="!rows.length" class="mat-empty">
        <q-icon name="sym_r_folder" size="32px" class="text-slate-500" />
        <p class="mat-empty__title">Még nincs feltöltött anyag</p>
        <p class="mat-empty__hint">PDF, kép vagy bármilyen fájl — a típus és a láthatóság együtt beállítható.</p>
        <button type="button" class="mat-empty__btn" @click="openUpload">
          <q-icon name="sym_r_upload_file" size="18px" />
          Feltöltés
        </button>
      </div>
      <div v-else class="mat-list">
        <article v-for="item in rows" :key="item.eventMaterialId" class="mat-card">
          <div class="mat-card__body">
            <div class="mat-card__name">{{ item.publicName }}</div>
            <div class="mat-card__meta">
              <span v-if="item.materialTypeName" class="mat-chip">{{ item.materialTypeName }}</span>
              <span class="mat-chip is-role">{{ materialRolesLabel(item) }}</span>
            </div>
            <div class="mat-card__sub">
              <span>{{ item.fileName }}</span>
              <span v-if="formatFileSize(item.sizeInBytes)">· {{ formatFileSize(item.sizeInBytes) }}</span>
            </div>
          </div>
          <button
            type="button"
            class="mat-download"
            :disabled="downloadingId === item.eventMaterialId"
            @click="downloadItem(item)"
          >
            <q-spinner v-if="downloadingId === item.eventMaterialId" size="16px" :color="isOpTheme ? 'amber-4' : 'sky-300'" />
            <q-icon v-else name="sym_r_download" size="18px" />
            Letöltés
          </button>
        </article>
      </div>
    </div>

    <q-dialog v-model="uploadOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="mat-sheet" :class="{ 'op-scope': isOpTheme }">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="mat-sheet__title">Feltöltés</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
            :disable="uploading"
            @click="uploadOpen = false"
          />
        </q-card-section>
        <q-card-section class="q-pt-md q-px-md pb-2">
          <q-file
            v-model="files"
            dark
            outlined
            dense
            multiple
            counter
            color="brand-primary"
            label="Fájlok"
            class="mat-field"
            :disable="uploading"
          >
            <template #prepend>
              <q-icon name="sym_r_attach_file" />
            </template>
          </q-file>
          <q-input
            v-model="publicName"
            dark
            outlined
            dense
            color="brand-primary"
            label="Megjelenő név (opcionális)"
            hint="Üresen a fájlnév marad. Több fájlnál mindegyikre ez megy."
            hide-bottom-space
            class="mat-field q-mt-md"
            :disable="uploading"
          />
          <q-select
            v-model="materialTypeId"
            :options="typeOptions"
            emit-value
            map-options
            dark
            outlined
            dense
            color="brand-primary"
            label="Kategória"
            class="mat-field q-mt-md"
            :disable="uploading || !typeOptions.length"
            :hint="typeOptions.length ? '' : 'Nincs anyagtípus a törzsben.'"
          />
          <div class="mat-roles">
            <button
              type="button"
              class="mat-role"
              :class="{ 'is-on': everyone }"
              :disabled="uploading"
              @click="everyone = true"
            >
              Mindenki
            </button>
            <button
              v-for="role in eventRoles"
              :key="role.eventRoleId"
              type="button"
              class="mat-role"
              :class="{ 'is-on': !everyone && selectedRoleIds.includes(role.eventRoleId) }"
              :disabled="uploading"
              @click="toggleRole(role.eventRoleId)"
            >
              {{ role.name }}
            </button>
          </div>
        </q-card-section>
        <q-card-section class="mat-sheet__actions">
          <button type="button" class="mat-sheet__btn mat-sheet__btn--ghost" :disabled="uploading" @click="uploadOpen = false">
            Mégse
          </button>
          <button type="button" class="mat-sheet__btn mat-sheet__btn--primary" :disabled="!canUpload" @click="submitUpload">
            <q-spinner v-if="uploading" size="16px" color="white" class="q-mr-xs" />
            {{ uploading ? `Feltöltés ${uploadIndex}/${selectedFiles.length}` : 'Feltöltés' }}
          </button>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { eventOrganizerManagePath } from 'src/utils/eventRoleNav';
import { isOlimpubRouteName } from 'src/modules/olimpub/constants';
import 'src/modules/olimpub/theme.css';
import {
  downloadEventMaterialFile,
  fetchEventMaterials,
  formatFileSize,
  materialDownloadErrorMessage,
  materialRolesLabel,
  materialUploadErrorMessage,
  uploadEventMaterial,
  type EventMaterial,
} from 'src/utils/eventMaterials';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

const eventId = computed(() => String(route.params.id || ''));
const isOpTheme = computed(() => isOlimpubRouteName(route.name));
const pageClass = computed(() =>
  isOpTheme.value
    ? 'op-scope relative min-h-full overflow-x-hidden'
    : 'bg-brand-dark text-white relative min-h-full overflow-x-hidden'
);
const numericEventId = computed(() => Number(eventId.value));
const eventName = computed(() => {
  const rec =
    eventStore.events?.find((row: { id?: number }) => String(row.id) === eventId.value) ||
    eventStore.myEvents?.find((row: { id?: number }) => String(row.id) === eventId.value);
  return String((rec as { EventName?: string; Name?: string } | undefined)?.EventName || (rec as { Name?: string } | undefined)?.Name || 'Esemény');
});

const rows = ref<EventMaterial[]>([]);
const loading = ref(false);
const loadError = ref('');
const downloadingId = ref<number | null>(null);
const uploadOpen = ref(false);
const uploading = ref(false);
const uploadIndex = ref(0);
const files = ref<File[] | File | null>(null);
const publicName = ref('');
const materialTypeId = ref<number | null>(null);
const everyone = ref(true);
const selectedRoleIds = ref<number[]>([]);

const selectedFiles = computed(() => {
  if (!files.value) return [] as File[];
  return Array.isArray(files.value) ? files.value : [files.value];
});

const typeOptions = computed(() =>
  (masterDataStore.materialTypes || []).map((item) => ({
    label: item.TypeName || item.TypeCode || `Típus #${item.id}`,
    value: item.id,
  }))
);

const eventRoles = computed(() =>
  (eventStore.roles || [])
    .filter((row: Record<string, unknown>) => String(row.EventID ?? row.eventID ?? row.EventId) === eventId.value)
    .map((row: Record<string, unknown>) => {
      const eventRoleId = Number(row.id ?? row.ID ?? row.EventRoleID);
      const masterRoleId = Number(row.RoleID ?? row.roleID ?? row.RoleId);
      const name = Number.isFinite(masterRoleId)
        ? masterDataStore.getRoleNameById(masterRoleId)
        : String(row.RoleName || row.EventRoleName || '');
      return { eventRoleId, name: name || `Szerep #${eventRoleId}` };
    })
    .filter((row) => Number.isFinite(row.eventRoleId) && row.eventRoleId > 0)
);

const canUpload = computed(() => {
  if (uploading.value) return false;
  if (!selectedFiles.value.length) return false;
  if (materialTypeId.value == null) return false;
  if (!everyone.value && !selectedRoleIds.value.length) return false;
  return true;
});

function toggleRole(id: number) {
  everyone.value = false;
  if (selectedRoleIds.value.includes(id)) {
    selectedRoleIds.value = selectedRoleIds.value.filter((item) => item !== id);
    return;
  }
  selectedRoleIds.value = [...selectedRoleIds.value, id];
}

function openUpload() {
  files.value = null;
  publicName.value = '';
  materialTypeId.value = typeOptions.value[0]?.value ?? null;
  everyone.value = true;
  selectedRoleIds.value = [];
  uploadOpen.value = true;
}

async function downloadItem(item: EventMaterial) {
  if (downloadingId.value != null) return;
  downloadingId.value = item.eventMaterialId;
  try {
    await downloadEventMaterialFile(numericEventId.value, item);
  } catch (error) {
    $q.notify({
      message: materialDownloadErrorMessage(error),
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
  } finally {
    downloadingId.value = null;
  }
}

async function loadList() {
  if (!Number.isFinite(numericEventId.value) || numericEventId.value <= 0) return;
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await fetchEventMaterials(numericEventId.value);
  } catch (error) {
    loadError.value = materialUploadErrorMessage(error);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function submitUpload() {
  if (!canUpload.value || materialTypeId.value == null) return;
  const roleIds = everyone.value ? [] : [...selectedRoleIds.value];
  const batch = [...selectedFiles.value];
  uploading.value = true;
  let ok = 0;
  let lastError = '';
  try {
    for (let i = 0; i < batch.length; i += 1) {
      uploadIndex.value = i + 1;
      try {
        await uploadEventMaterial({
          eventId: numericEventId.value,
          file: batch[i],
          publicName: publicName.value,
          materialTypeId: materialTypeId.value,
          eventRoleIds: roleIds,
        });
        ok += 1;
      } catch (error) {
        lastError = materialUploadErrorMessage(error);
      }
    }
    if (ok === batch.length) {
      $q.notify({
        message: ok === 1 ? 'Feltöltve.' : `${ok} fájl feltöltve.`,
        color: 'dark',
        textColor: 'green-4',
        position: 'top',
      });
      uploadOpen.value = false;
    } else {
      $q.notify({
        message: lastError || `${ok}/${batch.length} fájl került fel.`,
        color: 'dark',
        textColor: 'orange-4',
        position: 'top',
      });
    }
    await loadList();
  } finally {
    uploading.value = false;
    uploadIndex.value = 0;
  }
}

function goBack() {
  const { from, ...query } = route.query;
  const path =
    String(from || '') === 'pta'
      ? `/profitability/event/${eventId.value}/manage`
      : eventOrganizerManagePath(eventId.value);
  void router.push({ path, query });
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
    /* lista ettől még mehet */
  }
}

onMounted(() => {
  void loadDataSheet();
  void loadList();
});
</script>

<style scoped>
.mat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.mat-header__text {
  flex: 1;
  min-width: 0;
}
.mat-header__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}
.mat-header__event {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mat-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border: none;
  border-radius: 16px;
  background: #38bdf8;
  color: #0f172a;
  cursor: pointer;
}
.mat-add-btn:active {
  transform: scale(0.96);
}
.mat-empty {
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
.mat-empty__title {
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 800;
}
.mat-empty__hint {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  max-width: 280px;
}
.mat-empty__btn {
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
.mat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mat-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
}
.mat-card__body {
  flex: 1;
  min-width: 0;
}
.mat-card__name {
  font-size: 15px;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.mat-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.mat-chip {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 8px;
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.12);
}
.mat-chip.is-role {
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.14);
}
.mat-card__sub {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  overflow-wrap: anywhere;
}
.mat-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.1);
  color: #7dd3fc;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.mat-download:disabled {
  opacity: 0.55;
  cursor: default;
}
.mat-sheet {
  width: 100%;
  max-width: 560px;
  background: rgba(15, 23, 42, 0.96);
  color: #fff;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(56, 189, 248, 0.28);
}
.mat-sheet__title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7dd3fc;
}
.mat-field {
  width: 100%;
}
.mat-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.mat-role {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.mat-role.is-on {
  color: #0f172a;
  background: #38bdf8;
  border-color: #38bdf8;
}
.mat-sheet__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px));
}
.mat-sheet__btn {
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
.mat-sheet__btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.mat-sheet__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}
.mat-sheet__btn--primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #38bdf8;
  color: #0f172a;
}
</style>
