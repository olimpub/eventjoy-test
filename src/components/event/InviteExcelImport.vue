<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
    @hide="resetPreview"
  >
    <q-card class="invite-import" :class="{ 'is-pta': variant === 'pta' }">
      <div class="invite-import__handle" aria-hidden="true" />
      <div class="invite-import__icon">
        <q-icon name="sym_r_upload_file" size="22px" />
      </div>
      <h2 class="invite-import__title">Résztvevők feltöltése</h2>
      <p class="invite-import__event">{{ eventName }}</p>
      <p class="invite-import__hint">
        Töltsd le a sablont, a szerepkört és a jegyet név szerint írd be, majd töltsd fel. A meghívók e-mailben
        mennek ki.
        <template v-if="groupingAttrs.length">
          A csoportosítás oszlopai a játékosoknál kötelezőek.
        </template>
      </p>

      <div v-if="roleNames.length" class="invite-import__roles">
        <span class="invite-import__roles-label">Szerepkörök</span>
        <div class="invite-import__chips">
          <span v-for="name in roleNames" :key="'r-' + name" class="invite-import__chip">{{ name }}</span>
        </div>
      </div>
      <div v-if="ticketNames.length" class="invite-import__roles">
        <span class="invite-import__roles-label">Jegyek</span>
        <div class="invite-import__chips">
          <span v-for="name in ticketNames" :key="'t-' + name" class="invite-import__chip">{{ name }}</span>
        </div>
      </div>
      <div v-for="attr in groupingAttrs" :key="'g-' + attr.key" class="invite-import__roles">
        <span class="invite-import__roles-label">{{ attr.label }}</span>
        <div class="invite-import__chips">
          <span
            v-for="name in groupingValueNames[attr.key] || []"
            :key="'gv-' + attr.key + '-' + name"
            class="invite-import__chip"
          >
            {{ name }}
          </span>
          <span v-if="!(groupingValueNames[attr.key] || []).length" class="invite-import__chip invite-import__chip--hint">
            játékosoknál kötelező
          </span>
        </div>
      </div>
      <p v-if="!roleNames.length && !ticketNames.length" class="invite-import__warn">
        Ehhez az eseményhez még nincs szerepkör vagy jegy. A sablonba a neveket szövegesen írd be.
      </p>

      <div class="invite-import__actions">
        <button type="button" class="invite-import__btn invite-import__btn--ghost" :disabled="busy" @click="downloadXlsx">
          <q-icon name="sym_r_download" size="18px" />
          Sablon (.xlsx)
        </button>
        <button type="button" class="invite-import__btn invite-import__btn--primary" :disabled="busy" @click="openPicker">
          <q-icon name="sym_r_arrow_upward" size="18px" />
          Feltöltés
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        class="hidden"
        @change="onFilePicked"
      />

      <p v-if="fileName" class="invite-import__file">
        {{ fileName }}{{ parsed ? ` · ${parsed.length} sor` : '' }}
      </p>

      <div v-if="successMessage" class="invite-import__success">
        <q-icon name="sym_r_check_circle" size="18px" />
        <p>{{ successMessage }}</p>
      </div>

      <div v-if="errorMessage" class="invite-import__error">
        <q-icon name="sym_r_error" size="18px" />
        <p>{{ errorMessage }}</p>
      </div>

      <div v-if="errorRows.length" class="invite-import__fails">
        <article v-for="row in errorRows" :key="`${row.RowID}-${row.Email}`" class="invite-import__fail">
          <div class="invite-import__fail-top">
            <span v-if="row.RowID" class="invite-import__fail-row">{{ row.RowID }}. sor</span>
            <span class="invite-import__fail-name">{{ displayName(row) }}</span>
          </div>
          <p v-if="row.Email" class="invite-import__fail-email">{{ row.Email }}</p>
          <p class="invite-import__fail-msg">{{ row.ResultMsg }}</p>
        </article>
      </div>

      <button
        v-if="!importDone"
        type="button"
        class="invite-import__submit"
        :class="{ 'is-ready': pulseImport }"
        :disabled="busy || !parsed?.length"
        @click="submitImport"
      >
        {{ busy ? 'Importálás…' : 'Importálás' }}
      </button>
      <button
        v-else
        type="button"
        class="invite-import__close"
        :disabled="busy"
        @click="closeSheet"
      >
        Bezárás
      </button>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { listEnabledGroupingAttrs } from 'src/modules/profitability/ptaData';
import {
  buildInviteTemplateXlsx,
  downloadBinaryFile,
  importEventInvites,
  listInviteGroupingNames,
  listInviteGroupingCellErrors,
  listInviteRoleNames,
  listInviteTicketNames,
  parseInviteFile,
  readInviteImportHttpError,
  toInviteImportPayload,
  type InviteImportErrorRow,
  type InviteImportRow,
} from 'src/utils/inviteImport';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    eventId: string | number | null;
    eventName?: string;
    variant?: 'eventjoy' | 'pta';
  }>(),
  {
    eventName: 'Esemény',
    variant: 'eventjoy',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  imported: [count: number];
}>();

const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const fileInput = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const fileName = ref('');
const parsed = ref<InviteImportRow[] | null>(null);
const errorMessage = ref('');
const errorRows = ref<InviteImportErrorRow[]>([]);
const successMessage = ref('');
const importDone = ref(false);
const pulseImport = ref(false);

const roleNames = computed(() => {
  if (props.eventId == null || props.eventId === '') return [];
  const fromEvent = listInviteRoleNames(props.eventId, eventStore.roles || [], (roleId) =>
    masterDataStore.getRoleNameById(roleId)
  );
  if (fromEvent.length) return fromEvent;
  const names: string[] = [];
  for (const row of eventStore.eventParticipants || []) {
    if (String(row.EventID) !== String(props.eventId)) continue;
    const masterRoleId = nullableNumericId(row.RoleID ?? row.RoleId);
    const name =
      String(row.RoleName ?? row.roleName ?? '').trim() ||
      (masterRoleId != null ? masterDataStore.getRoleNameById(masterRoleId) : '');
    if (name) names.push(name);
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'hu'));
});

const ticketNames = computed(() => {
  if (props.eventId == null || props.eventId === '') return [];
  return listInviteTicketNames(props.eventId, eventStore.tickets || []);
});

const groupingAttrs = computed(() => {
  if (props.eventId == null || props.eventId === '') return [];
  return listEnabledGroupingAttrs(eventStore.getPtaSettingsForEvent(props.eventId));
});

const groupingValueNames = computed(() => {
  if (props.eventId == null || props.eventId === '' || !groupingAttrs.value.length) return {};
  return listInviteGroupingNames(props.eventId, groupingAttrs.value, [
    ...eventStore.getPtaPlayersForEvent(props.eventId),
    ...(eventStore.eventParticipants || []),
  ]);
});

const hints = computed(() => ({
  roles: roleNames.value,
  tickets: ticketNames.value,
  grouping: groupingAttrs.value,
  groupingValues: groupingValueNames.value,
}));

function displayName(row: InviteImportErrorRow): string {
  const name = [row.FirstName, row.LastName].filter(Boolean).join(' ').trim();
  return name || 'Ismeretlen';
}

function notify(message: string, ok = true) {
  const isPta = props.variant === 'pta';
  $q.notify({
    message,
    color: 'dark',
    textColor: ok ? (isPta ? 'orange-4' : 'blue-4') : 'red-4',
    position: 'top',
    timeout: 2400,
    classes: `border rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4 ${
      ok
        ? isPta
          ? 'border-orange-500/30'
          : 'border-blue-500/30'
        : 'border-red-500/30'
    }`,
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}

function clearImportError() {
  errorMessage.value = '';
  errorRows.value = [];
}

function resetImportResult() {
  clearImportError();
  successMessage.value = '';
  importDone.value = false;
}

function resetPreview() {
  fileName.value = '';
  parsed.value = null;
  pulseImport.value = false;
  resetImportResult();
  if (fileInput.value) fileInput.value.value = '';
}

function closeSheet() {
  emit('update:modelValue', false);
}

function safeFileBase() {
  const id = String(props.eventId ?? 'esemeny');
  return `eventjoy-meghivottak-${id}`;
}

function downloadXlsx() {
  const data = buildInviteTemplateXlsx(hints.value, props.eventName);
  downloadBinaryFile(`${safeFileBase()}.xlsx`, data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function openPicker() {
  fileInput.value?.click();
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  fileName.value = file.name;
  parsed.value = null;
  pulseImport.value = false;
  resetImportResult();
  try {
    parsed.value = await parseInviteFile(file, groupingAttrs.value);
    pulseImport.value = parsed.value.length > 0;
  } catch (error) {
    notify(readAxiosErrorMessage(error, 'A fájl nem olvasható.'), false);
  }
}

async function submitImport() {
  if (busy.value || !parsed.value?.length) return;
  const eventId = nullableNumericId(props.eventId);
  if (eventId == null) {
    notify('Hiányzik az esemény.', false);
    return;
  }
  pulseImport.value = false;
  busy.value = true;
  resetImportResult();
  const groupingErrors = listInviteGroupingCellErrors(parsed.value, groupingAttrs.value);
  if (groupingErrors.length) {
    importDone.value = true;
    errorMessage.value = 'A bekapcsolt csoportosítás a játékos sorokban kötelező.';
    errorRows.value = groupingErrors;
    busy.value = false;
    return;
  }
  try {
    const message = await importEventInvites(
      toInviteImportPayload(eventId, parsed.value, groupingAttrs.value)
    );
    importDone.value = true;
    successMessage.value = message;
    emit('imported', parsed.value.length);
  } catch (error) {
    importDone.value = true;
    const importError = readInviteImportHttpError(error);
    if (importError) {
      errorMessage.value = importError.message;
      errorRows.value = importError.rows;
      return;
    }
    errorMessage.value = readAxiosErrorMessage(error, 'A meghívók feltöltése sikertelen.');
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.invite-import {
  width: 100%;
  max-width: 640px;
  max-height: min(88vh, 720px);
  overflow-y: auto;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: #0f172a;
  color: #fff;
  padding: 8px 20px 24px;
}

.invite-import.is-pta {
  background: #121416;
}

.invite-import__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 16px;
}

.invite-import__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
}

.invite-import.is-pta .invite-import__icon {
  background: rgba(246, 139, 41, 0.16);
  color: #f68b29;
}

.invite-import__title {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}

.invite-import__event,
.invite-import__hint,
.invite-import__file,
.invite-import__warn {
  margin: 6px 0 0;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.45;
}

.invite-import__error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(244, 63, 94, 0.35);
  background: rgba(244, 63, 94, 0.12);
  color: #fda4af;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.invite-import__error p {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.invite-import__success {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(52, 211, 153, 0.35);
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.invite-import__success p {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.invite-import__fails {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: min(40vh, 320px);
  overflow-y: auto;
}

.invite-import__fail {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(244, 63, 94, 0.22);
  background: rgba(15, 23, 42, 0.55);
}

.invite-import__fail-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.invite-import__fail-row {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
}

.invite-import__fail-name {
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  overflow-wrap: anywhere;
}

.invite-import__fail-email {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  overflow-wrap: anywhere;
}

.invite-import__fail-msg {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  color: #fda4af;
  overflow-wrap: anywhere;
}

.invite-import__warn {
  color: #fbbf24;
}

.invite-import__roles {
  margin-top: 14px;
}

.invite-import__roles-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 8px;
}

.invite-import__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.invite-import__chip {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.1);
  color: #7dd3fc;
}

.invite-import.is-pta .invite-import__chip {
  border-color: rgba(246, 139, 41, 0.28);
  background: rgba(246, 139, 41, 0.1);
  color: #fdba74;
}

.invite-import__chip--hint {
  opacity: 0.7;
  font-weight: 700;
  font-style: italic;
}

.invite-import__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
}

.invite-import__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 42px;
  padding: 8px 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.invite-import__btn:disabled,
.invite-import__submit:disabled,
.invite-import__close:disabled {
  opacity: 0.45;
  cursor: default;
}

.invite-import__btn--primary {
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: #38bdf8;
  color: #0f172a;
}

.invite-import.is-pta .invite-import__btn--primary {
  border-color: rgba(246, 139, 41, 0.5);
  background: #f68b29;
  color: #121416;
}

.invite-import__submit {
  width: 100%;
  margin-top: 16px;
  min-height: 48px;
  border: none;
  border-radius: 14px;
  background: #38bdf8;
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.invite-import.is-pta .invite-import__submit {
  background: #f68b29;
  color: #121416;
}

.invite-import__submit.is-ready {
  animation: invite-import-pulse 1.2s ease-in-out infinite;
}

.invite-import.is-pta .invite-import__submit.is-ready {
  animation-name: invite-import-pulse-pta;
}

@keyframes invite-import-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.55);
    filter: brightness(1);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(56, 189, 248, 0);
    filter: brightness(1.18);
  }
}

@keyframes invite-import-pulse-pta {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(246, 139, 41, 0.55);
    filter: brightness(1);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(246, 139, 41, 0);
    filter: brightness(1.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .invite-import__submit.is-ready {
    animation: none;
    filter: brightness(1.12);
  }
}

.invite-import__close {
  width: 100%;
  margin-top: 16px;
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}
</style>
