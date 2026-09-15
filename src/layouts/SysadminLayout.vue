<template>
  <q-layout view="hHh lpR fFf" container class="sa-shell fit">
    <q-header class="sa-header" elevated>
      <q-toolbar class="sa-toolbar">
        <img
          :src="headerLogo"
          alt="EventJoy"
          class="sa-logo"
          @click="router.push({ name: 'sysadmin-dashboard' })"
        />
        <div class="sa-brand" @click="router.push({ name: 'sysadmin-hub' })">
          <span class="sa-brand__chip">Sysadmin</span>
        </div>
        <q-space />
        <RestoreAdminButton />
        <q-btn
          round
          dense
          unelevated
          icon="sym_r_apps"
          class="sa-app-btn"
          aria-label="Normál app"
          @click="router.push({ path: '/', query: { app: '1' } })"
        >
          <q-tooltip>Normál app</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container class="sa-page">
      <div v-if="showBackToHub" class="sa-back-row">
        <button type="button" class="sa-back" @click="router.push({ name: 'sysadmin-hub' })">
          <q-icon name="sym_r_arrow_back" size="22px" />
          <span>Sysadmin</span>
        </button>
      </div>
      <div v-if="showSubnav" class="sa-subnav">
        <div class="manage-grid">
          <button
            v-for="item in sectionItems"
            :key="item.to"
            type="button"
            class="manage-tile"
            :class="{ 'is-on': isActive(item) }"
            @click="router.push(item.to)"
          >
            <span class="manage-tile__icon">
              <q-icon :name="item.icon" size="26px" />
            </span>
            <span class="manage-tile__label">{{ item.label }}</span>
          </button>
        </div>
      </div>
      <router-view />
    </q-page-container>

    <q-footer class="sa-footer">
      <nav class="sa-tabs" aria-label="Sysadmin főmenü">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="sa-tabs__item"
          :class="{ 'is-on': activeSection === tab.id }"
          @click="goSection(tab.id)"
        >
          <q-icon :name="tab.icon" size="20px" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { EVENTJOY_BRAND } from 'src/assets/brand/eventjoy';
import RestoreAdminButton from 'src/components/layout/RestoreAdminButton.vue';

type SectionId = 'data' | 'flows' | 'comm' | 'sysadmin';

const route = useRoute();
const router = useRouter();
const headerLogo = EVENTJOY_BRAND.logoDark;

const tabs: { id: SectionId; label: string; icon: string }[] = [
  { id: 'data', label: 'Adatok', icon: 'dataset' },
  { id: 'flows', label: 'Folyamatok', icon: 'account_tree' },
  { id: 'comm', label: 'Kommunikáció', icon: 'forum' },
  { id: 'sysadmin', label: 'Sysadmin', icon: 'admin_panel_settings' },
];

const menus: Record<SectionId, { label: string; icon: string; to: string }[]> = {
  data: [
    { label: 'Események', icon: 'sym_r_emoji_events', to: '/admin/soon/data' },
    { label: 'Mester adatok', icon: 'sym_r_hub', to: '/admin/soon/data' },
    { label: 'Szervezetek', icon: 'sym_r_apartment', to: '/admin/soon/data' },
  ],
  flows: [{ label: 'Folyamatok', icon: 'sym_r_account_tree', to: '/admin/soon/flows' }],
  comm: [{ label: 'Kommunikáció', icon: 'sym_r_forum', to: '/admin/soon/comm' }],
  sysadmin: [
    { label: 'Felhasználók', icon: 'sym_r_group', to: '/admin/users' },
    { label: 'Támogatás', icon: 'sym_r_support_agent', to: '/admin/tickets' },
    { label: 'Rendszerhibák', icon: 'sym_r_bug_report', to: '/admin/logs/error' },
    { label: 'Adatmódosítások', icon: 'sym_r_history', to: '/admin/logs/data-change' },
    { label: 'Verziók', icon: 'sym_r_new_releases', to: '/admin/versions' },
  ],
};

const activeSection = computed<SectionId | null>(() => {
  const path = route.path;
  if (path.startsWith('/admin/soon/data') || path.startsWith('/admin/data')) return 'data';
  if (path.startsWith('/admin/soon/flows') || path.startsWith('/admin/flows')) return 'flows';
  if (path.startsWith('/admin/soon/comm') || path.startsWith('/admin/comm')) return 'comm';
  if (path === '/admin' || path === '/admin/') return null;
  return 'sysadmin';
});

const sectionItems = computed(() => (activeSection.value ? menus[activeSection.value] : []));
const showSubnav = computed(() => String(route.name || '') === 'sysadmin-soon');
const showBackToHub = computed(() => {
  const name = String(route.name || '');
  return (
    name === 'sysadmin-users' ||
    name === 'sysadmin-tickets' ||
    name === 'sysadmin-ticket' ||
    name === 'sysadmin-logs-error' ||
    name === 'sysadmin-logs-data-change' ||
    name === 'sysadmin-versions'
  );
});

function isActive(item: { to: string }) {
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

function goSection(id: SectionId) {
  if (id === 'sysadmin') {
    void router.push({ name: 'sysadmin-hub' });
    return;
  }
  const first = menus[id][0];
  if (first) void router.push(first.to);
}
</script>

<style scoped lang="scss">
.sa-shell {
  background: #070b14;
  color: #e2e8f0;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100%;
}

.sa-header {
  background: #111827 !important;
  border-bottom: 1px solid rgba(245, 158, 11, 0.28);
}

.sa-toolbar {
  min-height: 58px;
}

.sa-logo {
  height: 24px;
  width: auto;
  cursor: pointer;
  object-fit: contain;
}

.sa-brand {
  margin-left: 10px;
  cursor: pointer;
}

.sa-brand__chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sa-app-btn {
  width: 40px;
  height: 40px;
  background: rgba(245, 158, 11, 0.12) !important;
  color: #fbbf24 !important;
  border: 1px solid rgba(245, 158, 11, 0.28);
}

.sa-page {
  background: #070b14;
  height: 100%;
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  :deep(.q-page) {
    min-height: 0 !important;
    height: auto;
    display: block;
  }
}

.sa-back-row {
  padding: 10px 16px 0;
}

.sa-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 14px;
  border: 1px solid rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.16);
  color: #fde68a;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.sa-subnav {
  padding: 16px 16px 0;
  max-width: 42rem;
  margin: 0 auto;
}

.manage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 4px;
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

.manage-tile.is-on {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.1);
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
}

.manage-tile.is-on .manage-tile__icon {
  background: rgba(245, 158, 11, 0.22);
}

.manage-tile__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fafc;
}

.sa-footer {
  background: #111827;
  border-top: 2px solid #f59e0b;
}

.sa-tabs {
  display: flex;
  min-height: 64px;
  padding: 6px 8px calc(8px + env(safe-area-inset-bottom, 0px));
}

.sa-tabs__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;

  &.is-on {
    color: #fbbf24;
  }
}
</style>
