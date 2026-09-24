<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
    @hide="resetPreview"
  >
    <q-card class="op-import">
      <div class="op-import__handle" aria-hidden="true" />
      <div class="op-import__icon">
        <q-icon name="sym_r_upload_file" size="22px" />
      </div>
      <h2 class="op-import__title">Kérdések feltöltése</h2>
      <p class="op-import__event">{{ eventName }}</p>
      <p class="op-import__hint">
        Töltsd le a sablont, töltsd ki a <strong>Minták</strong> lap szerint, majd töltsd fel.
        A feltöltésből forduló is készül. A <strong>Típus</strong> oszlopba a kód kell:
        single, multi, order, match, category, freetext.
      </p>

      <div class="op-import__actions">
        <button type="button" class="op-import__btn op-import__btn--ghost" :disabled="busy" @click="downloadXlsx">
          <q-icon name="sym_r_download" size="18px" />
          Sablon (.xlsx)
        </button>
        <button type="button" class="op-import__btn op-import__btn--primary" :disabled="busy" @click="openPicker">
          <q-icon name="sym_r_arrow_upward" size="18px" />
          Feltöltés
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        class="hidden"
        @change="onFilePicked"
      />

      <p v-if="fileName" class="op-import__file">
        {{ fileName }}{{ parsed ? ` · ${parsed.length} kérdés` : '' }}
        <template v-if="sequencedCount"> · {{ sequencedCount }} sorszámozott</template>
      </p>

      <div v-if="successMessage" class="op-import__success">
        <q-icon name="sym_r_check_circle" size="18px" />
        <p>{{ successMessage }}</p>
      </div>

      <div v-if="errorMessage" class="op-import__error">
        <q-icon name="sym_r_error" size="18px" />
        <p>{{ errorMessage }}</p>
      </div>

      <div v-if="errorRows.length" class="op-import__fails">
        <article v-for="row in errorRows" :key="`${row.RowID}-${row.Prompt}`" class="op-import__fail">
          <div class="op-import__fail-top">
            <span v-if="row.RowID" class="op-import__fail-row">{{ row.RowID }}. sor</span>
            <span v-if="row.Prompt" class="op-import__fail-name">{{ row.Prompt }}</span>
          </div>
          <p class="op-import__fail-msg">{{ row.ResultMsg }}</p>
        </article>
      </div>

      <button
        v-if="!importDone"
        type="button"
        class="op-import__submit"
        :class="{ 'is-ready': pulseImport }"
        :disabled="busy || !parsed?.length"
        @click="submitImport"
      >
        {{ busy ? 'Importálás…' : 'Importálás' }}
      </button>
      <button
        v-else
        type="button"
        class="op-import__close"
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
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { importOpQuestions } from '../opApi';
import {
  downloadOpQuestionTemplate,
  parseOpQuestionFile,
  readOpImportHttpError,
  toOpImportPayload,
  type OpImportErrorRow,
  type OpImportQuestion,
} from '../questionImport';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    eventId: string | number | null;
    eventName?: string;
  }>(),
  {
    eventName: 'Esemény',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  imported: [payload: { count: number; rows: OpImportQuestion[]; roundIds: number[] }];
}>();

const $q = useQuasar();
const fileInput = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const fileName = ref('');
const parsed = ref<OpImportQuestion[] | null>(null);
const errorMessage = ref('');
const errorRows = ref<OpImportErrorRow[]>([]);
const successMessage = ref('');
const importDone = ref(false);
const pulseImport = ref(false);

const sequencedCount = computed(
  () => parsed.value?.filter((row) => row.SortIndex != null).length || 0
);

function notify(message: string, ok = true) {
  $q.notify({
    message,
    color: 'dark',
    textColor: ok ? 'amber-4' : 'red-4',
    position: 'top',
    timeout: 2400,
    classes: `border rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4 ${
      ok ? 'border-amber-500/30' : 'border-red-500/30'
    }`,
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}

function resetImportResult() {
  errorMessage.value = '';
  errorRows.value = [];
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

function downloadXlsx() {
  downloadOpQuestionTemplate();
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
    parsed.value = await parseOpQuestionFile(file);
    pulseImport.value = parsed.value.length > 0;
    if (!parsed.value.length) {
      errorMessage.value = 'A fájlban nincs importálható kérdés.';
    }
  } catch (error) {
    const message = readAxiosErrorMessage(error, 'A fájl nem olvasható.');
    errorMessage.value = message;
    notify(message, false);
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
  try {
    const result = await importOpQuestions(toOpImportPayload(eventId, parsed.value));
    importDone.value = true;
    successMessage.value = `${result.inserted} kérdés importálva.`;
    emit('imported', {
      count: parsed.value.length,
      rows: result.rows.length ? result.rows : parsed.value,
      roundIds: result.roundIds,
    });
  } catch (error) {
    importDone.value = true;
    const importError = readOpImportHttpError(error);
    if (importError) {
      errorMessage.value = importError.message;
      errorRows.value = importError.rows;
      return;
    }
    errorMessage.value = readAxiosErrorMessage(error, 'A kérdések importja sikertelen.');
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.op-import {
  width: 100%;
  max-width: 640px;
  max-height: min(88vh, 720px);
  overflow-y: auto;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: rgba(11, 16, 32, 0.98);
  border-top: 1px solid rgba(245, 185, 66, 0.35);
  color: var(--op-cream, #fff6e8);
  padding: 8px 20px 24px;
}

.op-import__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 16px;
}

.op-import__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  background: rgba(245, 185, 66, 0.16);
  color: #f5b942;
}

.op-import__title {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}

.op-import__event,
.op-import__hint,
.op-import__file {
  margin: 6px 0 0;
  text-align: center;
  color: #c4b8a0;
  font-size: 13px;
  line-height: 1.45;
}

.op-import__error {
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

.op-import__error p,
.op-import__success p {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.op-import__success {
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

.op-import__fails {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: min(40vh, 320px);
  overflow-y: auto;
}

.op-import__fail {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(244, 63, 94, 0.22);
  background: rgba(7, 10, 20, 0.55);
}

.op-import__fail-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.op-import__fail-row {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
}

.op-import__fail-name {
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.op-import__fail-msg {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  color: #fda4af;
  overflow-wrap: anywhere;
}

.op-import__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
}

.op-import__btn {
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

.op-import__btn:disabled,
.op-import__submit:disabled,
.op-import__close:disabled {
  opacity: 0.45;
  cursor: default;
}

.op-import__btn--primary {
  border: 1px solid rgba(245, 185, 66, 0.45);
  background: #f5b942;
  color: #1a1408;
}

.op-import__submit {
  width: 100%;
  margin-top: 16px;
  min-height: 48px;
  border: none;
  border-radius: 14px;
  background: #f5b942;
  color: #1a1408;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.op-import__submit.is-ready {
  animation: op-import-pulse 1.2s ease-in-out infinite;
}

@keyframes op-import-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.55);
    filter: brightness(1);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(245, 185, 66, 0);
    filter: brightness(1.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .op-import__submit.is-ready {
    animation: none;
    filter: brightness(1.12);
  }
}

.op-import__close {
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
