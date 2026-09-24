<template>
  <div class="wizard-step">
    <div class="wizard-step__chip-row">
      <WizardModeIcon :mode="mode" />
      <span class="wizard-chip">
        <img
          v-if="typeIconResolved.kind === 'img'"
          :src="typeIconResolved.value"
          alt=""
          style="width: 16px; height: 16px; object-fit: contain;"
        />
        <q-icon v-else :name="typeIconResolved.value" size="16px" />
        {{ typeName }}
      </span>
      <span v-if="modelValue.title" class="wizard-chip wizard-chip--title">
        <q-icon name="sym_r_edit_calendar" size="16px" />
        {{ modelValue.title }}
      </span>
    </div>

    <p class="wizard-step__hint">Olimpub kvízbeállítások</p>

    <div class="wizard-form-card">
      <label class="wizard-field-label">Témakörök</label>
      <q-select
        :model-value="modelValue.opTopicIds"
        :options="topicOptions"
        multiple
        emit-value
        map-options
        use-chips
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        :disable="!topicOptions.length"
        hint="Opcionális. Üres = később adod hozzá a témaköröket."
        @update:model-value="(v) => patch({ opTopicIds: toIds(v) })"
      />

      <label class="wizard-field-label">Kabalák / csapatok</label>
      <q-select
        :model-value="modelValue.opKabalaIds"
        :options="kabalaOptions"
        multiple
        emit-value
        map-options
        use-chips
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        :disable="!kabalaOptions.length"
        hint="Opcionális. Üres = később osztod ki a csapatokat."
        @update:model-value="(v) => patch({ opKabalaIds: toIds(v) })"
      />

      <label class="wizard-field-label">Tervezett időtartam</label>
      <q-select
        :model-value="modelValue.opPlannedDurationMin"
        :options="durationOptions"
        emit-value
        map-options
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        @update:model-value="(v) => patch({ opPlannedDurationMin: toInt(v, 90) })"
      />

      <label class="wizard-field-label">Max. csapatlétszám</label>
      <q-input
        :model-value="modelValue.opMaxTeamSize"
        type="number"
        min="1"
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        hint="Társbehívás plafonja"
        @update:model-value="(v) => patch({ opMaxTeamSize: Math.max(1, toInt(v, 6)) })"
      />

      <label class="wizard-field-label">Asztalok száma (hint)</label>
      <q-input
        :model-value="deskHintDisplay"
        type="number"
        min="1"
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        hint="Nem kapacitás, csak ülés-hint. Üresen hagyható."
        clearable
        @update:model-value="onDeskHint"
      />

      <div class="wizard-toggle-row">
        <q-toggle
          :model-value="modelValue.opShadowAwardFlg"
          label="Egyéni különdíj a végén"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ opShadowAwardFlg: !!v })"
        />
      </div>
    </div>

    <div class="wizard-step-nav">
      <button type="button" class="wizard-btn wizard-btn--ghost" @click="$emit('back')">Vissza</button>
      <button type="button" class="wizard-btn wizard-btn--primary" @click="submit">Tovább</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useOlimpubStore } from 'src/stores/olimpub';
import { OP_DURATION_MINUTES } from 'src/modules/olimpub/constants';
import { resolveTypeIcon } from '../groupIcons';
import WizardModeIcon from '../WizardModeIcon.vue';
import { isOpSettingsComplete, type WizardBasics, type WizardMode } from '../types';

const props = defineProps<{
  modelValue: WizardBasics;
  typeName: string;
  typeIcon?: string;
  mode?: WizardMode;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: WizardBasics): void;
  (e: 'back'): void;
  (e: 'next'): void;
}>();

const $q = useQuasar();
const olimpubStore = useOlimpubStore();
const typeIconResolved = computed(() => resolveTypeIcon(props.typeIcon));

const topicOptions = computed(() =>
  (olimpubStore.topics || []).map((row) => ({ label: row.Name, value: row.id }))
);
const kabalaOptions = computed(() =>
  (olimpubStore.kabalas || []).map((row) => ({ label: row.Name, value: row.id }))
);
const durationOptions = OP_DURATION_MINUTES.map((min) => ({
  label: `${min} perc`,
  value: min,
}));

const deskHintDisplay = computed(() =>
  props.modelValue.opDeskCountHint == null ? '' : props.modelValue.opDeskCountHint
);

function toInt(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function onDeskHint(value: unknown) {
  if (value == null || value === '') {
    patch({ opDeskCountHint: null });
    return;
  }
  const n = Number(value);
  patch({ opDeskCountHint: Number.isFinite(n) && n > 0 ? n : null });
}

function patch(partial: Partial<WizardBasics>) {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}

function submit() {
  if (!isOpSettingsComplete(props.modelValue)) {
    $q.notify({
      message: 'Add meg a csapatlétszámot és a tervezett időtartamot.',
      color: 'warning',
      position: 'top',
    });
    return;
  }
  emit('next');
}

onMounted(() => {
  void olimpubStore.loadMaster().catch(() => {
    $q.notify({
      message: 'A kabala / témakör lista nem tölthető.',
      color: 'warning',
      position: 'top',
    });
  });
});
</script>
