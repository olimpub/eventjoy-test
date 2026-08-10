<template>
  <div class="pta-scope">
    <!-- No draw yet -->
    <div v-if="!drawResults" class="pta-glass rounded-[20px] p-8 text-center">
      <q-icon name="casino" size="64px" style="color: #f68b29;" class="mb-4" />
      <div class="pta-display text-white text-xl mb-2 uppercase tracking-wide">Sorsolás előkészítése</div>
      <div class="text-slate-400 pta-body text-sm mb-6 max-w-md mx-auto">
        A sorsolás elindításához a bejelentkezett/játszó létszámnak 4-gyel oszthatónak kell lennie.
        Jelenlegi aktív létszám: <span class="pta-number text-white">{{ activeCount }}</span> fő.
      </div>
      <q-btn
        unelevated
        no-caps
        :loading="drawing"
        :disable="activeCount < 4 || activeCount % 4 !== 0"
        class="pta-display rounded-[16px] px-8 py-3 text-[15px] uppercase tracking-wide"
        style="background: linear-gradient(135deg, #f68b29 0%, #ea580c 100%); color: white;"
        @click="onDraw"
      >
        <q-icon name="shuffle" class="q-mr-sm" />
        Sorsolás indítása
        <template #loading>
          <q-spinner-dots color="white" size="24px" />
        </template>
      </q-btn>
    </div>

    <!-- Draw results -->
    <div v-else class="flex flex-col gap-4">
      <div class="pta-glass rounded-[16px] p-4 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <q-icon name="casino" size="18px" style="color: #f68b29;" />
          <span class="pta-display text-[13px] tracking-wider uppercase text-white">Sorsolási eredmény</span>
        </div>
        <q-btn
          flat
          dense
          no-caps
          icon="refresh"
          label="Újrasorsolás"
          class="pta-display text-[11px] rounded-[10px] px-3"
          style="color: #f68b29;"
          @click="onDraw"
        />
      </div>

      <div v-for="round in drawResults" :key="round.round" class="pta-glass rounded-[20px] p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full flex items-center justify-center pta-display text-xs" style="background: #f68b29; color: white;">
              {{ round.round }}
            </div>
            <span class="pta-display text-white text-[13px] uppercase tracking-wide">{{ round.round }}. Forduló</span>
          </div>
          <q-badge rounded class="pta-body text-[10px] px-2 py-1" :style="{ background: roundStatusColor(round.status) + '33', color: roundStatusColor(round.status) }">
            {{ round.status }}
          </q-badge>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="table in round.tables" :key="table.id" class="pta-glass-light rounded-[14px] p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="pta-display text-[12px] text-white uppercase">{{ table.name }}</span>
              <q-icon name="badge" size="14px" style="color: #94a3b8;" />
            </div>
            <div class="text-[10px] text-slate-400 mb-2 truncate">GM: {{ table.gameMaster }}</div>
            <div class="flex flex-col gap-1">
              <div v-for="p in table.players" :key="p.id" class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: p.color }" />
                <span class="text-[12px] pta-body text-white truncate">{{ p.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Player, Round } from '../types';

const props = defineProps<{
  players: Player[];
  drawResults: Round[] | null;
}>();

const emit = defineEmits<{
  (e: 'start-draw'): void;
}>();

const drawing = ref(false);

const activeCount = computed(() => {
  return props.players.filter(p => p.status === 'Bejelentkezett' || p.status === 'Játszik').length;
});

function onDraw() {
  drawing.value = true;
  setTimeout(() => {
    emit('start-draw');
    drawing.value = false;
  }, 1200);
}

function roundStatusColor(status: string): string {
  const map: Record<string, string> = {
    'Kisorsolva': '#94a3b8',
    'Folyamatban': '#f68b29',
    'Lezárt': '#28c76f'
  };
  return map[status] || '#94a3b8';
}
</script>
