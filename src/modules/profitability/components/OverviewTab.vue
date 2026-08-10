<template>
  <div class="pta-scope grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Alapadatok -->
    <div class="lg:col-span-2 pta-glass rounded-[20px] p-5">
      <div class="flex items-center gap-2 mb-4">
        <q-icon name="info" size="18px" style="color: #f68b29;" />
        <span class="pta-display text-[13px] tracking-wider uppercase text-white">Alapadatok</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="pta-glass-light rounded-[12px] p-3">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 pta-body mb-1">Esemény neve</div>
          <div class="pta-display text-white text-[15px]">{{ event.name }}</div>
        </div>
        <div class="pta-glass-light rounded-[12px] p-3">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 pta-body mb-1">Típus</div>
          <div class="pta-display text-white text-[15px]">{{ typeLabel }}</div>
        </div>
        <div class="pta-glass-light rounded-[12px] p-3">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 pta-body mb-1">Időpont</div>
          <div class="pta-body text-white text-[14px]">{{ event.date }}</div>
        </div>
        <div class="pta-glass-light rounded-[12px] p-3">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 pta-body mb-1">Helyszín</div>
          <div class="pta-body text-white text-[14px]">{{ event.location }}</div>
        </div>
      </div>

      <!-- Regisztrációs QR / Link -->
      <div class="mt-4 pta-glass-light rounded-[12px] p-4 flex items-center gap-4 flex-wrap">
        <div class="w-20 h-20 bg-white rounded-[12px] flex items-center justify-center shrink-0">
          <q-icon name="qr_code_2" size="56px" style="color: #2c2e32;" />
        </div>
        <div class="flex-1 min-w-[180px]">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 pta-body mb-1">Regisztrációs link</div>
          <div class="pta-number text-[#f68b29] text-[13px] break-all">https://eventjoy.app/pta/{{ event.id }}/reg</div>
        </div>
        <q-btn
          unelevated
          no-caps
          dense
          icon="content_copy"
          label="Másolás"
          class="rounded-[10px] pta-display text-[11px] px-3"
          style="background: rgba(246, 139, 41, 0.15); color: #f68b29;"
          @click="copyLink"
        />
      </div>
    </div>

    <!-- Szervezők + Játékmesterek -->
    <div class="pta-glass rounded-[20px] p-5">
      <div class="flex items-center gap-2 mb-3">
        <q-icon name="groups" size="18px" style="color: #f68b29;" />
        <span class="pta-display text-[13px] tracking-wider uppercase text-white">Szervezők</span>
      </div>
      <div class="flex flex-col gap-2 mb-5">
        <div v-for="org in event.organizers" :key="org.id" class="flex items-center gap-3 pta-glass-light rounded-[12px] p-2">
          <q-avatar size="32px" style="background: #f68b29; color: white;" class="pta-display text-xs">
            {{ initials(org.name) }}
          </q-avatar>
          <div class="min-w-0">
            <div class="pta-body text-white text-[13px] truncate">{{ org.name }}</div>
            <div class="text-slate-400 text-[10px] uppercase tracking-wide">{{ org.role }}</div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mb-3">
        <q-icon name="sports_esports" size="18px" style="color: #f68b29;" />
        <span class="pta-display text-[13px] tracking-wider uppercase text-white">Játékmesterek</span>
        <q-badge rounded class="pta-number" style="background: rgba(246,139,41,0.2); color: #f68b29;">{{ event.gameMasters.length }}</q-badge>
      </div>
      <div class="flex flex-col gap-2 max-h-[220px] overflow-y-auto modern-scrollbar pr-1">
        <div v-for="gm in event.gameMasters" :key="gm.id" class="flex items-center gap-3 pta-glass-light rounded-[12px] p-2">
          <q-avatar size="32px" style="background: #2aa9ff; color: white;" class="pta-display text-xs">
            {{ initials(gm.name) }}
          </q-avatar>
          <div class="min-w-0">
            <div class="pta-body text-white text-[13px] truncate">{{ gm.name }}</div>
            <div class="text-slate-400 text-[10px] uppercase tracking-wide">{{ gm.role }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gyors statisztika sáv -->
    <div class="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="pta-glass rounded-[16px] p-4 text-center">
        <div class="pta-display text-2xl text-white">{{ event.players.length }}</div>
        <div class="text-[10px] uppercase tracking-wider text-slate-400">Regisztrált</div>
      </div>
      <div class="pta-glass rounded-[16px] p-4 text-center">
        <div class="pta-display text-2xl" style="color: #28c76f;">{{ checkedInCount }}</div>
        <div class="text-[10px] uppercase tracking-wider text-slate-400">Bejelentkezett</div>
      </div>
      <div class="pta-glass rounded-[16px] p-4 text-center">
        <div class="pta-display text-2xl" style="color: #2aa9ff;">{{ event.gameMasters.length }}</div>
        <div class="text-[10px] uppercase tracking-wider text-slate-400">Játékmester</div>
      </div>
      <div class="pta-glass rounded-[16px] p-4 text-center">
        <div class="pta-display text-2xl" style="color: #f68b29;">{{ tableCount }}</div>
        <div class="text-[10px] uppercase tracking-wider text-slate-400">Asztal</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { ProfitabilityEvent } from '../types';

const props = defineProps<{
  event: ProfitabilityEvent;
}>();

const $q = useQuasar();

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    b2c: 'B2C — Lakossági esemény',
    b2b: 'B2B — Vállalati esemény',
    education: 'Oktatási esemény',
    community: 'Közösségi esemény'
  };
  return map[props.event.type] || props.event.type;
});

const checkedInCount = computed(() => {
  return props.event.players.filter(p => p.status === 'Bejelentkezett' || p.status === 'Játszik').length;
});

const tableCount = computed(() => {
  if (props.event.drawResults && props.event.drawResults.length > 0) {
    return props.event.drawResults[0].tables.length;
  }
  return Math.floor(checkedInCount.value / 4);
});

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function copyLink() {
  const link = `https://eventjoy.app/pta/${props.event.id}/reg`;
  navigator.clipboard?.writeText(link);
  $q.notify({
    message: 'Regisztrációs link vágólapra másolva!',
    color: 'positive',
    position: 'top',
    timeout: 1500
  });
}
</script>
