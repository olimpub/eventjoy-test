<template>
  <div class="pta-scope pta-glass rounded-[20px] p-5">
    <div v-if="!drawResults" class="text-center py-10">
      <q-icon name="emoji_events" size="56px" style="color: #94a3b8;" class="mb-3" />
      <div class="pta-body text-slate-400">Még nincs elérhető eredmény.</div>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-2">
          <q-icon name="emoji_events" size="18px" style="color: #f68b29;" />
          <span class="pta-display text-[13px] tracking-wider uppercase text-white">Eredmények</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- View mode toggle -->
          <div class="flex rounded-[10px] overflow-hidden border border-white/10">
            <button
              class="px-3 py-1.5 text-[11px] pta-display uppercase"
              :style="viewMode === 'individual' ? 'background:#f68b29;color:white;' : 'background:transparent;color:#94a3b8;'"
              @click="$emit('update:view-mode', 'individual')"
            >Egyéni</button>
            <button
              class="px-3 py-1.5 text-[11px] pta-display uppercase"
              :style="viewMode === 'team' ? 'background:#f68b29;color:white;' : 'background:transparent;color:#94a3b8;'"
              @click="$emit('update:view-mode', 'team')"
            >Csapat</button>
          </div>

          <!-- Round filter -->
          <q-select
            :model-value="roundFilter"
            :options="roundOptions"
            dense
            outlined
            dark
            bg-color="rgba(255,255,255,0.04)"
            emit-value
            map-options
            class="pta-body"
            style="min-width: 140px;"
            @update:model-value="$emit('update:round-filter', $event)"
          />

          <q-btn
            outline
            no-caps
            dense
            icon="cast"
            label="Kivetítés"
            class="pta-display text-[11px] rounded-[10px] px-3"
            style="color: #2aa9ff; border-color: #2aa9ff;"
          />
          <q-btn
            unelevated
            no-caps
            dense
            icon="celebration"
            label="Ceremónia indítása"
            class="pta-display text-[11px] rounded-[10px] px-3"
            style="background: linear-gradient(135deg, #f68b29, #ea580c); color: white;"
            @click="$emit('start-ceremony')"
          />
        </div>
      </div>

      <!-- Individual leaderboard -->
      <div v-if="viewMode === 'individual'" class="overflow-x-auto modern-scrollbar">
        <table class="w-full border-collapse min-w-[520px]">
          <thead>
            <tr class="text-left text-[10px] uppercase tracking-wider text-slate-400 pta-body">
              <th class="py-2 px-2 cursor-pointer" @click="sortBy('rank')">#</th>
              <th class="py-2 px-2 cursor-pointer" @click="sortBy('name')">Játékos</th>
              <th class="py-2 px-2">Csapat</th>
              <th class="py-2 px-2 text-right cursor-pointer" @click="sortBy('winnings')">Nyeremény</th>
              <th class="py-2 px-2 text-right cursor-pointer" @click="sortBy('trucks')">Kamion</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in sortedIndividualRows"
              :key="row.playerId"
              class="pta-glass-light"
              style="border-radius: 12px;"
            >
              <td class="py-2 px-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center pta-display text-[11px]"
                  :style="idx === 0 ? 'background:#f68b29;color:white;' : idx === 1 ? 'background:#94a3b8;color:white;' : idx === 2 ? 'background:#ea580c;color:white;' : 'background:rgba(255,255,255,0.08);color:#94a3b8;'">
                  {{ idx + 1 }}
                </div>
              </td>
              <td class="py-2 px-2 pta-body text-white text-[13px]">{{ row.name }}</td>
              <td class="py-2 px-2 text-slate-400 text-[12px]">{{ row.team }}</td>
              <td class="py-2 px-2 text-right pta-number text-[#f68b29] font-bold">{{ row.totalWinnings }}</td>
              <td class="py-2 px-2 text-right pta-number text-[#2aa9ff]">{{ row.totalTrucks }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Team leaderboard -->
      <div v-else class="overflow-x-auto modern-scrollbar">
        <table class="w-full border-collapse min-w-[480px]">
          <thead>
            <tr class="text-left text-[10px] uppercase tracking-wider text-slate-400 pta-body">
              <th class="py-2 px-2">#</th>
              <th class="py-2 px-2 cursor-pointer" @click="sortBy('name')">Csapat</th>
              <th class="py-2 px-2 text-right">Létszám</th>
              <th class="py-2 px-2 text-right cursor-pointer" @click="sortBy('winnings')">Össz. nyeremény</th>
              <th class="py-2 px-2 text-right cursor-pointer" @click="sortBy('trucks')">Össz. kamion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in sortedTeamRows" :key="row.team" class="pta-glass-light">
              <td class="py-2 px-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center pta-display text-[11px]"
                  :style="idx === 0 ? 'background:#f68b29;color:white;' : idx === 1 ? 'background:#94a3b8;color:white;' : idx === 2 ? 'background:#ea580c;color:white;' : 'background:rgba(255,255,255,0.08);color:#94a3b8;'">
                  {{ idx + 1 }}
                </div>
              </td>
              <td class="py-2 px-2 pta-body text-white text-[13px]">{{ row.team }}</td>
              <td class="py-2 px-2 text-right text-slate-400 text-[12px]">{{ row.playerCount }}</td>
              <td class="py-2 px-2 text-right pta-number text-[#f68b29] font-bold">{{ row.totalWinnings }}</td>
              <td class="py-2 px-2 text-right pta-number text-[#2aa9ff]">{{ row.totalTrucks }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Round } from '../types';

const props = defineProps<{
  drawResults: Round[] | null;
  viewMode: 'individual' | 'team';
  roundFilter: number;
}>();

defineEmits<{
  (e: 'update:view-mode', mode: 'individual' | 'team'): void;
  (e: 'update:round-filter', round: number): void;
  (e: 'start-ceremony'): void;
}>();

const sortField = ref<'rank' | 'name' | 'winnings' | 'trucks'>('winnings');
const sortDesc = ref(true);

function sortBy(field: typeof sortField.value) {
  if (sortField.value === field) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortField.value = field;
    sortDesc.value = true;
  }
}

const roundOptions = computed(() => {
  const opts = (props.drawResults || []).map(r => ({ label: `${r.round}. Forduló`, value: r.round }));
  opts.push({ label: 'Összesített', value: 0 });
  return opts;
});

const relevantRounds = computed(() => {
  if (!props.drawResults) return [];
  if (props.roundFilter === 0) return props.drawResults;
  return props.drawResults.filter(r => r.round === props.roundFilter);
});

const individualRows = computed(() => {
  const map = new Map<number, { playerId: number; name: string; team: string; totalWinnings: number; totalTrucks: number }>();
  relevantRounds.value.forEach(round => {
    round.tables.forEach(table => {
      table.players.forEach(p => {
        if (!map.has(p.id)) {
          map.set(p.id, { playerId: p.id, name: p.name, team: p.team, totalWinnings: 0, totalTrucks: 0 });
        }
        const row = map.get(p.id)!;
        row.totalWinnings += p.winnings || 0;
        row.totalTrucks += p.truckValue || 0;
      });
    });
  });
  return Array.from(map.values());
});

const teamRows = computed(() => {
  const map = new Map<string, { team: string; totalWinnings: number; totalTrucks: number; playerIds: Set<number> }>();
  relevantRounds.value.forEach(round => {
    round.tables.forEach(table => {
      table.players.forEach(p => {
        if (!map.has(p.team)) {
          map.set(p.team, { team: p.team, totalWinnings: 0, totalTrucks: 0, playerIds: new Set() });
        }
        const row = map.get(p.team)!;
        row.totalWinnings += p.winnings || 0;
        row.totalTrucks += p.truckValue || 0;
        row.playerIds.add(p.id);
      });
    });
  });
  return Array.from(map.values()).map(r => ({
    team: r.team,
    totalWinnings: r.totalWinnings,
    totalTrucks: r.totalTrucks,
    playerCount: r.playerIds.size
  }));
});

function applySort<T extends { name?: string; team?: string; totalWinnings: number; totalTrucks: number }>(rows: T[]): T[] {
  const arr = [...rows];
  arr.sort((a, b) => {
    let diff = 0;
    if (sortField.value === 'name') {
      diff = (a.name || a.team || '').localeCompare(b.name || b.team || '');
    } else if (sortField.value === 'trucks') {
      diff = a.totalTrucks - b.totalTrucks;
    } else {
      diff = a.totalWinnings - b.totalWinnings;
    }
    return sortDesc.value ? -diff : diff;
  });
  return arr;
}

const sortedIndividualRows = computed(() => applySort(individualRows.value));
const sortedTeamRows = computed(() => applySort(teamRows.value));
</script>
