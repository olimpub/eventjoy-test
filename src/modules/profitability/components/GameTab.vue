<template>
  <div class="pta-scope flex flex-col gap-4">
    <div v-if="!drawResults" class="pta-glass rounded-[20px] p-8 text-center">
      <q-icon name="sports_esports" size="56px" style="color: #94a3b8;" class="mb-3" />
      <div class="pta-body text-slate-400">Előbb indítsd el a sorsolást a "Sorsolás" fülön.</div>
    </div>

    <template v-else>
      <!-- Round + Table selector -->
      <div class="pta-glass rounded-[16px] p-4 flex flex-wrap items-center gap-3">
        <span class="pta-display text-[11px] uppercase tracking-wide text-slate-400">Forduló:</span>
        <div class="flex gap-2">
          <q-btn
            v-for="round in drawResults"
            :key="round.round"
            unelevated
            no-caps
            dense
            class="pta-display text-[12px] rounded-[10px] px-4 py-2"
            :style="selectedRound === round.round
              ? 'background: linear-gradient(135deg, #f68b29, #ea580c); color: white;'
              : 'background: rgba(255,255,255,0.05); color: #94a3b8;'"
            @click="selectedRound = round.round"
          >
            {{ round.round }}. Forduló
            <q-badge rounded class="q-ml-xs" :style="{ background: roundStatusColor(round.status) }">&nbsp;</q-badge>
          </q-btn>
        </div>

        <q-space />

        <div v-if="currentRound" class="flex items-center gap-2">
          <q-btn
            v-if="currentRound.status === 'Kisorsolva'"
            unelevated
            no-caps
            dense
            icon="play_arrow"
            label="Forduló indítása"
            class="pta-display text-[12px] rounded-[10px] px-4"
            style="background: #28c76f; color: white;"
            @click="$emit('start-round', selectedRound)"
          />
          <q-btn
            v-if="currentRound.status === 'Folyamatban'"
            unelevated
            no-caps
            dense
            icon="lock"
            label="Forduló lezárása"
            class="pta-display text-[12px] rounded-[10px] px-4"
            style="background: #ef4444; color: white;"
            @click="$emit('close-round', selectedRound)"
          />
        </div>
      </div>

      <!-- Table selector -->
      <div class="flex gap-2 overflow-x-auto pb-1">
        <q-btn
          v-for="table in currentRound?.tables || []"
          :key="table.id"
          unelevated
          no-caps
          dense
          class="pta-display text-[11px] rounded-[10px] px-3 py-2 shrink-0"
          :style="selectedTableId === table.id
            ? 'background: rgba(246,139,41,0.2); color: #f68b29; border: 1px solid #f68b29;'
            : 'background: rgba(255,255,255,0.04); color: #94a3b8; border: 1px solid transparent;'"
          @click="selectedTableId = table.id"
        >
          {{ table.name }}
          <q-icon v-if="table.status === 'Kész'" name="check_circle" size="14px" class="q-ml-xs" style="color: #28c76f;" />
        </q-btn>
      </div>

      <!-- Selected table detail -->
      <div v-if="currentTable" class="pta-glass rounded-[20px] p-5">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div class="pta-display text-white text-lg uppercase">{{ currentTable.name }}</div>
            <div class="text-slate-400 text-[11px]">GM: {{ currentTable.gameMaster }}</div>
          </div>
          <div class="flex items-center gap-2">
            <q-btn
              outline
              no-caps
              dense
              icon="casino"
              label="Véletlen generálás"
              class="pta-display text-[11px] rounded-[10px] px-3"
              style="color: #2aa9ff; border-color: #2aa9ff;"
              @click="$emit('generate-random', selectedRound)"
            />
            <q-btn
              unelevated
              no-caps
              dense
              icon="lock"
              label="Asztal lezárása"
              class="pta-display text-[11px] rounded-[10px] px-3"
              style="background: #f68b29; color: white;"
              :disable="currentTable.status === 'Kész'"
              @click="$emit('close-table', selectedRound, currentTable!.id)"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="(p, idx) in currentTable.players"
            :key="p.id"
            class="pta-glass-light rounded-[14px] p-3 flex items-center gap-3 flex-wrap"
          >
            <div class="flex flex-col gap-0.5 shrink-0">
              <q-btn flat dense round size="xs" icon="keyboard_arrow_up" style="color: #94a3b8;" :disable="idx === 0" @click="$emit('move-order', selectedRound, currentTable!.id, idx, 'up')" />
              <q-btn flat dense round size="xs" icon="keyboard_arrow_down" style="color: #94a3b8;" :disable="idx === currentTable.players.length - 1" @click="$emit('move-order', selectedRound, currentTable!.id, idx, 'down')" />
            </div>

            <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: p.color }" />

            <div class="min-w-0 flex-1">
              <div class="pta-body text-white text-[13px] truncate">{{ p.name }}</div>
              <div class="text-slate-400 text-[10px] truncate">{{ p.team }}</div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex flex-col items-center">
                <span class="text-[9px] uppercase text-slate-400 pta-body">Nyeremény</span>
                <q-input
                  :model-value="p.winnings"
                  type="number"
                  dense
                  outlined
                  dark
                  bg-color="rgba(255,255,255,0.04)"
                  input-class="text-white pta-number text-center"
                  style="width: 70px;"
                  :min="0"
                  :max="80"
                  @update:model-value="onResultChange(currentTable!.id, p.id, $event, p.truckValue)"
                />
              </div>
              <div class="flex flex-col items-center">
                <span class="text-[9px] uppercase text-slate-400 pta-body">Kamion</span>
                <q-input
                  :model-value="p.truckValue"
                  type="number"
                  dense
                  outlined
                  dark
                  bg-color="rgba(255,255,255,0.04)"
                  input-class="text-white pta-number text-center"
                  style="width: 70px;"
                  :min="0"
                  :max="12"
                  @update:model-value="onResultChange(currentTable!.id, p.id, p.winnings, $event)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Round } from '../types';

const props = defineProps<{
  drawResults: Round[] | null;
}>();

const emit = defineEmits<{
  (e: 'start-round', roundNum: number): void;
  (e: 'close-round', roundNum: number): void;
  (e: 'close-table', roundNum: number, tableId: number): void;
  (e: 'generate-random', roundNum: number): void;
  (e: 'move-order', roundNum: number, tableId: number, index: number, direction: 'up' | 'down'): void;
  (e: 'update-result', roundNum: number, tableId: number, playerId: number, winnings: number | null, truckValue: number | null): void;
}>();

const selectedRound = ref(1);
const selectedTableId = ref<number | null>(null);

const currentRound = computed(() => props.drawResults?.find(r => r.round === selectedRound.value) || null);
const currentTable = computed(() => currentRound.value?.tables.find(t => t.id === selectedTableId.value) || currentRound.value?.tables[0] || null);

watch(currentRound, (round) => {
  if (round && (!selectedTableId.value || !round.tables.find(t => t.id === selectedTableId.value))) {
    selectedTableId.value = round.tables[0]?.id ?? null;
  }
}, { immediate: true });

function roundStatusColor(status: string): string {
  const map: Record<string, string> = {
    'Kisorsolva': '#94a3b8',
    'Folyamatban': '#f68b29',
    'Lezárt': '#28c76f'
  };
  return map[status] || '#94a3b8';
}

function onResultChange(tableId: number, playerId: number, winnings: any, truckValue: any) {
  const w = winnings === '' || winnings === null || winnings === undefined ? null : Number(winnings);
  const t = truckValue === '' || truckValue === null || truckValue === undefined ? null : Number(truckValue);
  emit('update-result', selectedRound.value, tableId, playerId, w, t);
}
</script>
