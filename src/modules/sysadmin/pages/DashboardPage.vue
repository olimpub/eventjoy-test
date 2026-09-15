<template>
  <q-page class="sa-dash">
    <div class="sa-dash__head">
      <div>
        <div class="sa-kicker">Admin</div>
        <h1>Dashboard</h1>
      </div>
      <q-select
        v-model="period"
        :options="DASHBOARD_PERIODS"
        emit-value
        map-options
        dense
        outlined
        dark
        class="sa-period"
        @update:model-value="load"
      />
    </div>

    <div v-if="loading" class="sa-empty">
      <q-spinner color="amber" size="28px" />
      <p>Metrikák betöltése…</p>
    </div>
    <div v-else-if="error" class="sa-empty">
      <p>{{ error }}</p>
      <q-btn unelevated color="amber-8" text-color="dark" label="Újra" @click="load" />
    </div>
    <div v-else class="sa-cards">
      <button
        v-for="card in cards"
        :key="card.key"
        type="button"
        class="sa-card"
        :disabled="!card.to"
        @click="card.to && router.push(card.to)"
      >
        <div class="sa-card__label">{{ card.label }}</div>
        <div class="sa-card__value">{{ card.value }}</div>
      </button>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminErrorMessage, fetchSysadminDashboard } from '../api';
import { DASHBOARD_PERIODS, type DashboardPeriod, type SysadminDashboard } from '../types';

const router = useRouter();
const period = ref<DashboardPeriod>(7);
const loading = ref(false);
const error = ref('');
const data = ref<SysadminDashboard | null>(null);

const cards = computed(() => {
  const row = data.value;
  if (!row) return [];
  return [
    { key: 'errors', label: 'Rendszerhibák', value: row.errorLogCount, to: '/admin/logs/error' },
    { key: 'changes', label: 'Adatmódosítások', value: row.dataChangeLogCount, to: '/admin/logs/data-change' },
    { key: 'open', label: 'Nyitott jegyek', value: row.openTicketsCount, to: '/admin/tickets?statusId=1' },
    { key: 'progress', label: 'Folyamatban lévő jegyek', value: row.inProgressTicketsCount, to: '/admin/tickets?statusId=2' },
    { key: 'newEvents', label: 'Új események', value: row.newEventsCount, to: '' },
    { key: 'activeEvents', label: 'Aktív események', value: row.totalActiveEventsCount, to: '' },
    { key: 'newUsers', label: 'Új regisztrálók', value: row.newUsersCount, to: '/admin/users' },
    { key: 'users', label: 'Összes felhasználó', value: row.totalUsersCount, to: '/admin/users' },
    { key: 'mailOk', label: 'Sikeres e-mailek', value: row.emailsSentSuccessfully, to: '' },
    { key: 'mailFail', label: 'Sikertelen e-mailek', value: row.emailsFailed, to: '' },
  ];
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    data.value = await fetchSysadminDashboard(period.value);
  } catch (err) {
    data.value = null;
    error.value = adminErrorMessage(err, 'A dashboard nem tölthető.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.sa-dash {
  padding: 12px 16px 24px;
}

.sa-dash__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.sa-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fbbf24;
}

h1 {
  margin: 2px 0 0;
  font-size: 24px;
  font-weight: 800;
}

.sa-period {
  min-width: 180px;
}

.sa-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.sa-card {
  text-align: left;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.16);
  background: #111827;
  color: inherit;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.92;
  }
}

.sa-card__label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}

.sa-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
  color: #fde68a;
}

.sa-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 16px;
  color: #94a3b8;
}
</style>
