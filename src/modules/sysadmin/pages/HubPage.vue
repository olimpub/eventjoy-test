<template>
  <q-page class="sa-hub">
    <div class="sa-hub__head">
      <div class="sa-kicker">Sysadmin</div>
      <h1>Sysadmin</h1>
    </div>
    <div class="manage-grid">
      <button
        v-for="item in items"
        :key="item.to"
        type="button"
        class="manage-tile"
        @click="router.push(item.to)"
      >
        <span class="manage-tile__icon">
          <q-icon :name="item.icon" size="26px" />
          <span v-if="item.badge" class="manage-tile__badge">{{ item.badge }}</span>
        </span>
        <span class="manage-tile__label">{{ item.label }}</span>
      </button>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTicketStore } from 'src/stores/ticket';

const router = useRouter();
const ticketStore = useTicketStore();

const items = computed(() => [
  { label: 'Felhasználók', icon: 'sym_r_group', to: '/admin/users', badge: '' },
  {
    label: 'Támogatás',
    icon: 'sym_r_support_agent',
    to: '/admin/tickets',
    badge: ticketStore.formatBadge(ticketStore.openTicketCount),
  },
  { label: 'Rendszerhibák', icon: 'sym_r_bug_report', to: '/admin/logs/error', badge: '' },
  { label: 'Adatmódosítások', icon: 'sym_r_history', to: '/admin/logs/data-change', badge: '' },
  { label: 'Verziók', icon: 'sym_r_new_releases', to: '/admin/versions', badge: '' },
]);

onMounted(() => {
  void ticketStore.refreshCounts();
});
</script>

<style scoped lang="scss">
.sa-hub {
  padding: 12px 16px 24px;
  max-width: 42rem;
  margin: 0 auto;
}

.sa-hub__head {
  margin-bottom: 10px;
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

.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.manage-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 108px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: inherit;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.manage-tile:active {
  transform: scale(0.98);
}

.manage-tile:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(245, 158, 11, 0.28);
}

.manage-tile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.14);
  color: #fbbf24;
  position: relative;
}

.manage-tile__badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #f59e0b;
  color: #111827;
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  box-shadow: 0 0 0 2px #0f172a;
}

.manage-tile__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
}
</style>
