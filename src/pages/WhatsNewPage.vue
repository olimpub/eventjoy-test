<template>
  <q-page class="whats-new bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col">
    <div class="whats-new__head">
      <q-btn
        flat
        round
        dense
        icon="arrow_back"
        class="text-sky-400 bg-white/5"
        @click="router.push({ name: 'profile' })"
      />
      <h2 class="page-kicker">
        <q-icon name="sym_r_new_releases" color="#38bdf8" size="16px" />
        <span class="page-kicker__label">Újdonságok</span>
      </h2>
    </div>

    <div v-if="loading" class="empty-state">
      <q-spinner color="sky-400" size="28px" />
      <p>Kiadások betöltése…</p>
    </div>
    <div v-else-if="loadError" class="empty-state">
      <q-icon name="sym_r_error" size="28px" class="text-rose-400 q-mb-xs" />
      <p>{{ loadError }}</p>
      <button type="button" class="retry-btn" @click="load">Újra</button>
    </div>
    <div v-else-if="!rows.length" class="empty-state">
      <q-icon name="sym_r_inbox" size="28px" class="text-slate-600 q-mb-xs" />
      <p>Még nincs megjelent kiadás.</p>
    </div>
    <div v-else class="version-list">
      <article v-for="row in rows" :key="row.versionId" class="version-card">
        <div class="version-card__top">
          <span class="version-card__id">{{ formatVersionLabel(row.versionNumber) }}</span>
          <span class="version-card__date">{{ formatReleaseDate(row.releaseDate) }}</span>
        </div>
        <p v-if="row.summary" class="version-card__summary">{{ row.summary }}</p>
        <ul v-if="row.items.length" class="version-card__items">
          <li v-for="(item, index) in row.items" :key="`${row.versionId}-${item.itemId}-${index}`">
            <span>{{ item.description }}</span>
            <a
              v-if="item.externalReference && isHttpUrl(item.externalReference)"
              class="version-card__link"
              :href="item.externalReference"
              target="_blank"
              rel="noopener noreferrer"
            >
              Részletek
            </a>
          </li>
        </ul>
      </article>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import {
  fetchAppVersions,
  formatReleaseDate,
  formatVersionLabel,
  isHttpUrl,
  type AppVersion,
} from 'src/utils/appVersions';

const router = useRouter();
const rows = ref<AppVersion[]>([]);
const loading = ref(false);
const loadError = ref('');

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    rows.value = await fetchAppVersions();
  } catch (error) {
    rows.value = [];
    loadError.value = readAxiosErrorMessage(error, 'A kiadások nem tölthetők.');
  } finally {
    loading.value = false;
  }
}

void load();
</script>

<style scoped lang="scss">
.whats-new {
  min-height: 0;
}
.whats-new__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 18px;
}
.page-kicker {
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.page-kicker__label {
  font-family: var(--font-sans);
  letter-spacing: 0.08em;
  text-transform: none;
}
.version-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 24px;
}
.version-card {
  padding: 16px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}
.version-card__top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.version-card__id {
  font-size: 16px;
  font-weight: 800;
  color: #7dd3fc;
}
.version-card__date {
  font-size: 12px;
  color: #94a3b8;
}
.version-card__summary {
  margin: 0 0 10px;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.version-card__items {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.45;
}
.version-card__link {
  display: inline-block;
  margin-left: 6px;
  color: #38bdf8;
  font-weight: 700;
  text-decoration: none;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: #94a3b8;
  text-align: center;
}
.retry-btn {
  margin-top: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 165, 233, 0.14);
  color: #7dd3fc;
  font-weight: 800;
  cursor: pointer;
}
</style>
