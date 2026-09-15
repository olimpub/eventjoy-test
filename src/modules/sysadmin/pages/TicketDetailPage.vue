<template>
  <q-page class="sa-ticket" :style-fn="pageStyle">
    <div class="sa-ticket__head">
      <div class="sa-kicker">#{{ ticketId }} · {{ ticket?.category }}</div>
      <h1>{{ ticket?.title || 'Jegy' }}</h1>
      <div class="sa-muted">
        {{ ticket?.reporterName || ticket?.reporterEmail || 'Felhasználó' }}
      </div>
    </div>

    <div v-if="loading" class="sa-empty"><q-spinner color="amber" /></div>
    <div v-else-if="loadError" class="sa-empty">
      <p>{{ loadError }}</p>
      <q-btn unelevated color="amber-8" text-color="dark" label="Újra" @click="load" />
    </div>
    <template v-else-if="ticket">
      <div class="sa-panel">
        <div class="sa-panel__label">Státusz</div>
        <div class="sa-status-row">
          <span
            class="sa-status is-current"
            :class="`is-${ticketStatusTone(ticketStore.statusName(ticket.statusId, ticket.statusName), ticketStore.isClosed(ticket.statusId, ticket.isClosedState))}`"
          >
            {{ ticketStore.statusName(ticket.statusId, ticket.statusName) }}
          </span>
          <button
            v-for="item in nextStatuses"
            :key="item.ticketStatusId"
            type="button"
            class="sa-status-btn"
            :disabled="busy"
            @click="changeStatus(item.ticketStatusId)"
          >
            {{ item.statusName }}
          </button>
          <span v-if="!nextStatuses.length" class="sa-muted">Nincs további átmenet.</span>
        </div>

        <div class="sa-field">
          <label class="sa-panel__label">Célverzió</label>
          <div class="sa-version-row">
            <q-select
              :model-value="targetVersion"
              :options="filteredVersionOptions"
              emit-value
              map-options
              use-input
              fill-input
              hide-selected
              input-debounce="0"
              new-value-mode="add"
              dark
              outlined
              dense
              hide-bottom-space
              clearable
              :disable="busy"
              placeholder="pl. 1.2.0"
              class="sa-version-input"
              @update:model-value="onTargetVersionChange"
              @filter="filterVersionOptions"
              @new-value="onNewVersion"
            />
            <button
              type="button"
              class="sa-save-btn"
              :disabled="busy || !versionDirty"
              @click="saveVersion"
            >
              Mentés
            </button>
          </div>
        </div>
      </div>

      <section v-if="ticket.description" class="sa-panel">
        <div class="sa-panel__label">Leírás</div>
        <p class="sa-desc">{{ ticket.description }}</p>
      </section>

      <div class="sa-thread">
        <article
          v-for="comment in ticket.comments"
          :key="comment.commentId"
          class="sa-bubble"
          :class="{
            'is-sysadmin': comment.authorIsSysadmin,
            'is-system': comment.isSystemMessage,
          }"
        >
          <div class="sa-bubble__meta">
            <span>{{ comment.authorName }}{{ comment.authorIsSysadmin ? ' · Sysadmin' : '' }}</span>
            <span>{{ formatAdminDate(comment.createdAt) }}</span>
          </div>
          <p>{{ comment.body }}</p>
        </article>
        <div v-if="!ticket.comments.length" class="sa-muted">Még nincs hozzászólás.</div>
      </div>

      <form class="sa-reply" @submit.prevent="sendComment">
        <q-input
          v-model="draft"
          dark
          outlined
          type="textarea"
          autogrow
          hide-bottom-space
          :disable="busy"
          placeholder="Válasz a felhasználónak…"
        />
        <q-btn
          type="submit"
          unelevated
          color="amber-8"
          text-color="dark"
          :label="busy ? 'Küldés…' : 'Üzenet küldése'"
          :disable="busy"
        />
      </form>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { nullableNumericId } from 'src/utils/apiPayload';
import { ticketStatusTone } from 'src/utils/supportTickets';
import { useTicketStore } from 'src/stores/ticket';
import {
  adminErrorMessage,
  fetchSysadminTicket,
  fetchSysadminVersions,
  formatAdminDate,
  postSysadminTicketComment,
  updateSysadminTicketStatus,
  versionSelectOptions,
} from '../api';
import type { SysadminTicketDetail } from '../types';

const route = useRoute();
const $q = useQuasar();
const ticketStore = useTicketStore();

function pageStyle() {
  return { minHeight: '0' };
}

const ticket = ref<SysadminTicketDetail | null>(null);
const loading = ref(false);
const busy = ref(false);
const loadError = ref('');
const draft = ref('');
const targetVersion = ref('');
const versionOptions = ref<{ label: string; value: string }[]>([]);
const filteredVersionOptions = ref<{ label: string; value: string }[]>([]);
const ticketId = computed(() => nullableNumericId(route.params.ticketId));
const nextStatuses = computed(() => ticketStore.nextStatuses(ticket.value?.statusId));
const versionDirty = computed(
  () => (ticket.value?.targetVersion || '').trim() !== targetVersion.value.trim()
);

function onTargetVersionChange(value: unknown) {
  targetVersion.value = String(value ?? '').trim();
}

function ensureVersionOption(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (versionOptions.value.some((item) => item.value.toLowerCase() === trimmed.toLowerCase())) return;
  versionOptions.value = [{ label: trimmed, value: trimmed }, ...versionOptions.value];
}

function filterVersionOptions(needle: string, update: (fn: () => void) => void) {
  update(() => {
    const q = needle.trim().toLowerCase();
    filteredVersionOptions.value = q
      ? versionOptions.value.filter(
          (item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
        )
      : versionOptions.value;
  });
}

function onNewVersion(value: string, done: (item?: { label: string; value: string }) => void) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    done();
    return;
  }
  ensureVersionOption(trimmed);
  done({ label: trimmed, value: trimmed });
}

async function load() {
  const id = ticketId.value;
  if (id == null) {
    loadError.value = 'Érvénytelen jegy.';
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    await ticketStore.ensureLoaded();
    const [detail, versions] = await Promise.all([
      fetchSysadminTicket(id),
      fetchSysadminVersions().catch(() => []),
    ]);
    ticket.value = detail;
    targetVersion.value = ticket.value.targetVersion || '';
    versionOptions.value = versionSelectOptions(versions);
    ensureVersionOption(targetVersion.value);
    filteredVersionOptions.value = versionOptions.value;
  } catch (error) {
    ticket.value = null;
    loadError.value = adminErrorMessage(error, 'A jegy nem tölthető.');
  } finally {
    loading.value = false;
  }
}

async function applyStatus(statusId: number, version = targetVersion.value.trim()) {
  const id = ticketId.value;
  if (id == null || busy.value || !ticket.value) return;
  busy.value = true;
  try {
    await updateSysadminTicketStatus(id, { statusId, targetVersion: version });
    await load();
    void ticketStore.refreshCounts();
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A mentés sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    busy.value = false;
  }
}

async function changeStatus(statusId: number) {
  if (ticketStore.isScheduledStatus(statusId) && !targetVersion.value.trim()) {
    $q.notify({
      message: 'Ütemezéshez add meg a target versiont.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    return;
  }
  await applyStatus(statusId);
}

async function saveVersion() {
  const current = ticket.value?.statusId;
  if (current == null) return;
  await applyStatus(current);
}

async function sendComment() {
  const id = ticketId.value;
  const body = draft.value.trim();
  if (id == null || busy.value) return;
  if (!body) {
    $q.notify({ message: 'Írj egy üzenetet a küldéshez.', color: 'dark', textColor: 'orange-4', position: 'top' });
    return;
  }
  busy.value = true;
  try {
    await postSysadminTicketComment(id, body);
    draft.value = '';
    await load();
  } catch (error) {
    $q.notify({
      message: adminErrorMessage(error, 'A hozzászólás nem menthető.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    busy.value = false;
  }
}

onMounted(load);
watch(ticketId, load);
</script>

<style scoped lang="scss">
.sa-ticket {
  padding: 8px 16px 24px;
  min-height: 0 !important;
  height: auto !important;
}
.sa-ticket__head { margin-bottom: 12px; }
.sa-kicker { font-size: 11px; font-weight: 800; color: #fbbf24; letter-spacing: 0.08em; }
h1 { margin: 2px 0 0; font-size: 22px; font-weight: 800; overflow-wrap: anywhere; }
.sa-muted { color: #94a3b8; font-size: 13px; }
.sa-panel {
  background: #111827;
  border: 1px solid rgba(245, 158, 11, 0.12);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
}
.sa-panel__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 8px;
}
.sa-status-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; }
.sa-status {
  font-size: 11px;
  font-weight: 800;
  border-radius: 999px;
  padding: 6px 12px;
  &.is-pending { color: #fbbf24; background: rgba(251, 191, 36, 0.12); }
  &.is-progress, &.is-open { color: #38bdf8; background: rgba(56, 189, 248, 0.12); }
  &.is-scheduled { color: #a78bfa; background: rgba(167, 139, 250, 0.14); }
  &.is-released { color: #34d399; background: rgba(52, 211, 153, 0.12); }
  &.is-rejected { color: #fb7185; background: rgba(244, 63, 94, 0.12); }
  &.is-withdrawn, &.is-closed { color: #94a3b8; background: rgba(148, 163, 184, 0.1); }
}
.sa-status-btn {
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.08);
  color: #fde68a;
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  &:disabled { opacity: 0.45; cursor: default; }
}
.sa-version-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.sa-version-input { flex: 1; min-width: 0; }
.sa-version-input :deep(.q-field__control) {
  background: rgba(11, 15, 25, 0.7);
}
.sa-save-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.16);
  color: #fde68a;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  &:disabled { opacity: 0.4; cursor: default; }
}
.sa-desc { margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.sa-reply, .sa-thread {
  background: #111827;
  border: 1px solid rgba(245, 158, 11, 0.12);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
}
.sa-bubble { margin-bottom: 12px; }
.sa-bubble__meta { display: flex; justify-content: space-between; gap: 8px; color: #94a3b8; font-size: 12px; margin-bottom: 4px; }
.sa-bubble.is-sysadmin p { color: #fde68a; }
.sa-bubble.is-system p { color: #94a3b8; font-style: italic; }
.sa-reply { display: flex; flex-direction: column; gap: 10px; }
.sa-empty { padding: 40px; text-align: center; color: #94a3b8; }
</style>
