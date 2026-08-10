<template>
  <div class="pta-scope pta-glass rounded-[20px] p-4 md:p-5 shadow-2xl">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <q-icon name="timeline" size="18px" style="color: #f68b29;" />
        <span class="pta-display text-[13px] tracking-wider uppercase text-white">
          Eseményállapot Timeline
        </span>
      </div>
      <div class="flex items-center gap-1">
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="chevron_left"
          class="text-slate-400 hover:text-[#f68b29]"
          :disable="currentIndex <= 0"
          @click="stepStage(-1)"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="chevron_right"
          class="text-slate-400 hover:text-[#f68b29]"
          :disable="currentIndex >= stages.length - 1"
          @click="stepStage(1)"
        />
      </div>
    </div>

    <!-- Timeline Stepper -->
    <div class="relative flex items-center justify-between w-full overflow-x-auto py-2 gap-1">
      <div
        v-for="(stg, idx) in stages"
        :key="stg.key"
        class="flex flex-col items-center cursor-pointer group flex-1 min-w-[76px]"
        @click="selectStage(stg.key)"
      >
        <div class="relative flex items-center justify-center w-full">
          <div
            v-if="idx > 0"
            class="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] w-1/2 transition-colors duration-300"
            :class="idx <= currentIndex ? 'bg-[#f68b29]' : 'bg-white/10'"
          />
          <div
            v-if="idx < stages.length - 1"
            class="absolute right-0 top-1/2 -translate-y-1/2 h-[3px] w-1/2 transition-colors duration-300"
            :class="idx < currentIndex ? 'bg-[#f68b29]' : 'bg-white/10'"
          />

          <div
            class="relative z-10 w-9 h-9 rounded-full flex items-center justify-center pta-number font-bold text-sm transition-all duration-300"
            :class="[
              idx === currentIndex
                ? 'bg-[#f68b29] text-white ring-4 ring-[#f68b29]/30 scale-110 shadow-[0_0_15px_rgba(246,139,41,0.6)]'
                : idx < currentIndex
                ? 'bg-[#28C76F] text-white'
                : 'bg-[#2c2e32] border-2 border-white/15 text-slate-400 group-hover:border-[#f68b29]/50'
            ]"
          >
            <q-icon v-if="idx < currentIndex" name="check" size="16px" />
            <span v-else>{{ idx + 1 }}</span>
          </div>
        </div>

        <span
          class="mt-2 text-center text-[11px] pta-display uppercase tracking-wide transition-colors duration-300"
          :class="[
            idx === currentIndex ? 'text-[#f68b29]' : idx < currentIndex ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-300'
          ]"
        >
          {{ stg.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { EventStage } from '../types';

const props = defineProps<{
  currentStage: EventStage;
}>();

const emit = defineEmits<{
  (e: 'change-stage', stage: EventStage): void;
}>();

const stages: { key: EventStage; label: string }[] = [
  { key: 'design', label: 'Tervezés' },
  { key: 'organization', label: 'Szervezés' },
  { key: 'checkin', label: 'Bejelentkezés' },
  { key: 'draw', label: 'Sorsolás' },
  { key: 'game', label: 'Játék' },
  { key: 'ceremony', label: 'Ceremónia' },
  { key: 'closed', label: 'Lezárt' }
];

const currentIndex = computed(() => {
  const idx = stages.findIndex(s => s.key === props.currentStage);
  return idx >= 0 ? idx : 0;
});

function selectStage(stage: EventStage) {
  emit('change-stage', stage);
}

function stepStage(dir: number) {
  const target = currentIndex.value + dir;
  if (target >= 0 && target < stages.length) {
    emit('change-stage', stages[target].key);
  }
}
</script>
