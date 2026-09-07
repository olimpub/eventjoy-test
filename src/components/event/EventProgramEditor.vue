<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="prog-sheet" :class="{ 'is-pta': accent === 'pta' }">
      <div class="w-full flex justify-center pt-3 pb-1">
        <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
      </div>
      <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
        <div class="w-10" />
        <div class="prog-sheet__title">Programok</div>
        <q-btn
          icon="close"
          flat
          round
          dense
          class="text-slate-400 hover:text-white bg-slate-800/50"
          size="sm"
          :disable="saving"
          @click="emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="q-pt-md q-px-md pb-6">
        <p class="prog-sheet__hint">Dátum, időpont és a program neve. Mentéskor időrendbe kerül.</p>

        <div class="prog-sheet__list">
          <div v-for="row in drafts" :key="row.key" class="prog-row">
            <div class="prog-row__when">
              <q-input
                :model-value="row.date"
                dark
                outlined
                dense
                readonly
                class="prog-field"
                :color="fieldColor"
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date
                        :model-value="row.date"
                        dark
                        :color="fieldColor"
                        mask="YYYY-MM-DD"
                        @update:model-value="(v) => patchRow(row.key, { date: String(v || '') })"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Kész" :color="fieldColor" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <q-input
                :model-value="row.time"
                dark
                outlined
                dense
                readonly
                class="prog-field"
                :color="fieldColor"
              >
                <template #append>
                  <q-icon name="schedule" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-time
                        :model-value="row.time"
                        dark
                        :color="fieldColor"
                        format24h
                        @update:model-value="(v) => patchRow(row.key, { time: String(v || '') })"
                      >
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Kész" :color="fieldColor" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="prog-row__name">
              <q-input
                :model-value="row.name"
                dark
                outlined
                dense
                maxlength="255"
                placeholder="Program neve"
                class="prog-field"
                :color="fieldColor"
                @update:model-value="(v) => patchRow(row.key, { name: String(v ?? '') })"
              />
              <q-btn
                icon="sym_r_delete"
                flat
                round
                dense
                class="text-slate-400 hover:text-rose-400"
                :disable="saving"
                aria-label="Törlés"
                @click="removeRow(row.key)"
              />
            </div>
          </div>
        </div>

        <button type="button" class="prog-add" :disabled="saving" @click="addRow">
          <q-icon name="sym_r_add" size="18px" />
          Program hozzáadása
        </button>

        <button type="button" class="prog-save" :disabled="saving" @click="onSave">
          {{ saving ? 'Mentés…' : 'Mentés' }}
        </button>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { buildEventContentSavePayload, saveEventContent } from 'src/utils/eventContent';
import {
  draftsFromPrograms,
  emptyProgramDraft,
  eventLocalDateRange,
  type EventProgramDraft,
} from 'src/utils/eventProgram';
import { nullableNumericId } from 'src/utils/apiPayload';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    eventId: string | number;
    accent?: 'eventjoy' | 'pta';
  }>(),
  { accent: 'eventjoy' }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const $q = useQuasar();
const eventStore = useEventStore();
const drafts = ref<EventProgramDraft[]>([]);
const saving = ref(false);

const fieldColor = computed(() => (props.accent === 'pta' ? 'orange-8' : 'brand-primary'));

function eventRecord() {
  const target = String(props.eventId);
  return (
    eventStore.events?.find((e: { id?: number | string }) => String(e.id) === target) ||
    eventStore.myEvents?.find((e: { id?: number | string }) => String(e.id) === target) ||
    null
  );
}

function fallbackDate(): string {
  return eventLocalDateRange(eventRecord() as Record<string, unknown> | null).startDate;
}

function hydrate() {
  drafts.value = draftsFromPrograms(
    eventStore.getProgramsForEvent(props.eventId),
    fallbackDate()
  );
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) hydrate();
  }
);

function patchRow(key: string, partial: Partial<EventProgramDraft>) {
  drafts.value = drafts.value.map((row) => (row.key === key ? { ...row, ...partial } : row));
}

function addRow() {
  drafts.value = [...drafts.value, emptyProgramDraft(fallbackDate())];
}

function removeRow(key: string) {
  const next = drafts.value.filter((row) => row.key !== key);
  drafts.value = next.length ? next : [emptyProgramDraft(fallbackDate())];
}

function notifyError(message: string) {
  $q.notify({
    message,
    color: 'dark',
    textColor: 'red-4',
    position: 'top',
    timeout: 2800,
    classes: 'border border-red-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}

async function onSave() {
  if (saving.value) return;
  const eventId = nullableNumericId(props.eventId);
  if (eventId == null) {
    notifyError('Hiányzik az esemény.');
    return;
  }
  saving.value = true;
  try {
    const payload = buildEventContentSavePayload(eventId, drafts.value);
    await saveEventContent(payload);
    await eventStore.refreshEventData();
    $q.notify({
      message: 'Programok mentve',
      color: 'dark',
      textColor: 'green-4',
      position: 'top',
      timeout: 1800,
      classes: 'border border-emerald-500/30 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
      style: 'background: rgba(11, 15, 25, 0.85);',
    });
    emit('saved');
    emit('update:modelValue', false);
  } catch (error) {
    notifyError(error instanceof Error ? error.message : 'A programok mentése sikertelen.');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.prog-sheet {
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

.prog-sheet.is-pta {
  border-top-color: rgba(246, 139, 41, 0.45);
}

.prog-sheet__title {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #38bdf8;
}

.prog-sheet.is-pta .prog-sheet__title {
  color: #f68b29;
}

.prog-sheet__hint {
  margin: 0 4px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.prog-sheet__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(52vh, 420px);
  overflow-y: auto;
  padding-right: 2px;
}

.prog-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.55);
}

.prog-row__when,
.prog-row__name {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.prog-row__when .prog-field,
.prog-row__name .prog-field {
  flex: 1;
}

.prog-field :deep(.q-field__control) {
  border-radius: 12px;
}

.prog-add,
.prog-save {
  width: 100%;
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.prog-add {
  border: 1px dashed rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #cbd5e1;
}

.prog-add:disabled,
.prog-save:disabled {
  opacity: 0.5;
  cursor: default;
}

.prog-save {
  border: 0;
  background: linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%);
  color: #fff;
}

.prog-sheet.is-pta .prog-save {
  background: linear-gradient(90deg, #f68b29 0%, #ea580c 100%);
}
</style>
