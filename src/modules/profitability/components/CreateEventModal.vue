<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:model-value', $event)" persistent>
    <q-card class="pta-scope pta-glass" style="width: 520px; max-width: 95vw; border-radius: 20px;">
      <div class="p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <q-icon name="add_circle" size="20px" style="color: #f68b29;" />
            <span class="pta-display text-white text-[16px] uppercase tracking-wide">Új PROFI-T-ABILITY esemény</span>
          </div>
          <q-btn flat dense round icon="close" style="color: #94a3b8;" @click="close" />
        </div>

        <!-- Step indicator -->
        <div class="flex items-center gap-2 mb-5">
          <div v-for="s in 3" :key="s" class="flex-1 h-1 rounded-full" :style="s <= step ? 'background:#f68b29;' : 'background:rgba(255,255,255,0.1);'" />
        </div>

        <!-- Step 1: Basic info -->
        <div v-if="step === 1" class="flex flex-col gap-4">
          <q-input v-model="form.name" dense outlined dark bg-color="rgba(255,255,255,0.04)" label="Esemény neve" input-class="text-white" />
          <q-select v-model="form.type" dense outlined dark bg-color="rgba(255,255,255,0.04)" :options="typeOptions" emit-value map-options label="Esemény típusa" />
        </div>

        <!-- Step 2: Date and Location -->
        <div v-else-if="step === 2" class="flex flex-col gap-4">
          <q-input v-model="form.date" dense outlined dark bg-color="rgba(255,255,255,0.04)" label="Időpont (pl. 2026.11.01 10:00 - 16:00)" input-class="text-white" />
          <q-input v-model="form.location" dense outlined dark bg-color="rgba(255,255,255,0.04)" label="Helyszín" input-class="text-white" />
        </div>

        <!-- Step 3: Confirm -->
        <div v-else class="flex flex-col gap-3">
          <div class="pta-glass-light rounded-[12px] p-3">
            <div class="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Esemény neve</div>
            <div class="pta-display text-white">{{ form.name || '—' }}</div>
          </div>
          <div class="pta-glass-light rounded-[12px] p-3">
            <div class="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Típus</div>
            <div class="pta-body text-white">{{ typeLabel(form.type) }}</div>
          </div>
          <div class="pta-glass-light rounded-[12px] p-3">
            <div class="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Időpont / Helyszín</div>
            <div class="pta-body text-white">{{ form.date || '—' }} · {{ form.location || '—' }}</div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-6">
          <q-btn
            v-if="step > 1"
            flat
            no-caps
            label="Vissza"
            class="pta-display text-[12px]"
            style="color: #94a3b8;"
            @click="step--"
          />
          <div v-else />

          <q-btn
            v-if="step < 3"
            unelevated
            no-caps
            label="Tovább"
            class="pta-display text-[12px] rounded-[10px] px-5"
            style="background: linear-gradient(135deg, #f68b29, #ea580c); color: white;"
            @click="step++"
          />
          <q-btn
            v-else
            unelevated
            no-caps
            label="Esemény létrehozása"
            class="pta-display text-[12px] rounded-[10px] px-5"
            style="background: linear-gradient(135deg, #f68b29, #ea580c); color: white;"
            @click="submit"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { EventType } from '../types';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:model-value', val: boolean): void;
  (e: 'create', payload: { name: string; type: EventType; date: string; location: string }): void;
}>();

const step = ref(1);
const form = reactive({
  name: '',
  type: 'b2c' as EventType,
  date: '',
  location: ''
});

const typeOptions = [
  { label: 'B2C — Lakossági esemény', value: 'b2c' },
  { label: 'B2B — Vállalati esemény', value: 'b2b' },
  { label: 'Oktatási esemény', value: 'education' },
  { label: 'Közösségi esemény', value: 'community' }
];

function typeLabel(type: EventType): string {
  return typeOptions.find(o => o.value === type)?.label || type;
}

function close() {
  emit('update:model-value', false);
  resetForm();
}

function resetForm() {
  step.value = 1;
  form.name = '';
  form.type = 'b2c';
  form.date = '';
  form.location = '';
}

function submit() {
  emit('create', { name: form.name, type: form.type, date: form.date, location: form.location });
  emit('update:model-value', false);
  resetForm();
}
</script>
