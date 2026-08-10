<template>
  <div class="pta-scope pta-glass rounded-[20px] p-5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2">
        <q-icon name="how_to_reg" size="18px" style="color: #f68b29;" />
        <span class="pta-display text-[13px] tracking-wider uppercase text-white">Bejelentkezés</span>
        <q-badge rounded class="pta-number" style="background: rgba(246,139,41,0.2); color: #f68b29;">{{ filteredPlayers.length }}</q-badge>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <q-input
          v-model="search"
          dense
          outlined
          placeholder="Keresés név alapján..."
          class="pta-body"
          style="min-width: 200px;"
          bg-color="rgba(255,255,255,0.04)"
          input-class="text-white"
          dark
        >
          <template #prepend>
            <q-icon name="search" style="color: #94a3b8;" />
          </template>
        </q-input>

        <q-select
          v-model="statusFilter"
          dense
          outlined
          dark
          bg-color="rgba(255,255,255,0.04)"
          :options="statusOptions"
          class="pta-body"
          style="min-width: 160px;"
        />
      </div>
    </div>

    <!-- Divisibility warning -->
    <div v-if="activeCount % 4 !== 0" class="mb-3 pta-glass-light rounded-[12px] p-3 flex items-center gap-2" style="border-color: rgba(239,68,68,0.4);">
      <q-icon name="warning" style="color: #ef4444;" size="20px" />
      <span class="text-[13px] pta-body text-red-300">
        Az aktív (Bejelentkezett/Játszik) létszám ({{ activeCount }} fő) nem osztható 4-gyel — a sorsolás indításához 4 fős asztalok szükségesek.
      </span>
    </div>
    <div v-else class="mb-3 pta-glass-light rounded-[12px] p-3 flex items-center gap-2" style="border-color: rgba(40,199,111,0.4);">
      <q-icon name="check_circle" style="color: #28c76f;" size="20px" />
      <span class="text-[13px] pta-body text-emerald-300">
        {{ activeCount }} aktív játékos — {{ activeCount / 4 }} asztal állítható össze (4 fő/asztal).
      </span>
    </div>

    <!-- Player list -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[520px] overflow-y-auto modern-scrollbar pr-1">
      <div
        v-for="player in filteredPlayers"
        :key="player.id"
        class="pta-glass-light rounded-[14px] p-3 flex items-center gap-3"
      >
        <q-avatar size="36px" :style="{ background: statusColor(player.status), color: 'white' }" class="pta-display text-xs shrink-0">
          {{ player.avatar }}
        </q-avatar>
        <div class="min-w-0 flex-1">
          <div class="pta-body text-white text-[13px] truncate">{{ player.name }}</div>
          <div class="text-slate-400 text-[10px] truncate">{{ player.team }}</div>
        </div>
        <q-badge rounded :style="{ background: statusColor(player.status) + '33', color: statusColor(player.status) }" class="pta-body text-[10px] px-2 py-1 shrink-0">
          {{ player.status }}
        </q-badge>
        <q-btn
          v-if="player.status !== 'Bejelentkezett' && player.status !== 'Játszik'"
          flat
          dense
          round
          size="sm"
          icon="login"
          class="shrink-0"
          style="color: #28c76f;"
          @click="$emit('check-in', player.id)"
        >
          <q-tooltip>Bejelentkeztetés</q-tooltip>
        </q-btn>
      </div>

      <div v-if="filteredPlayers.length === 0" class="col-span-full text-center py-10 text-slate-500 pta-body">
        Nincs a szűrésnek megfelelő játékos.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Player } from '../types';

const props = defineProps<{
  players: Player[];
}>();

defineEmits<{
  (e: 'check-in', playerId: number): void;
}>();

const search = ref('');
const statusFilter = ref('Összes');
const statusOptions = ['Összes', 'Regisztrált', 'Bejelentkezett', 'Játszik', 'Nem játszik', 'Várólistán', 'Csere'];

const filteredPlayers = computed(() => {
  return props.players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.value.toLowerCase()) ||
      p.team.toLowerCase().includes(search.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'Összes' || p.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const activeCount = computed(() => {
  return props.players.filter(p => p.status === 'Bejelentkezett' || p.status === 'Játszik').length;
});

function statusColor(status: string): string {
  const map: Record<string, string> = {
    'Regisztrált': '#94a3b8',
    'Bejelentkezett': '#28c76f',
    'Játszik': '#f68b29',
    'Nem játszik': '#ef4444',
    'Várólistán': '#f2e74b',
    'Csere': '#2aa9ff'
  };
  return map[status] || '#94a3b8';
}
</script>
