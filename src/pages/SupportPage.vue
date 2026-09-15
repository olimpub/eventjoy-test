<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    <div class="relative z-10 q-mb-md mt-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="page-kicker">
          <q-icon name="sym_r_support_agent" color="#38bdf8" size="16px" />
          Támogatás
        </h2>
        <button type="button" class="new-btn" @click="openCreateSheet">
          <q-icon name="add" size="16px" />
          Új jegy
        </button>
      </div>
    </div>

    <div class="feed-seg q-mb-md" role="tablist" aria-label="Jegy szűrő">
      <span
        class="feed-seg__indicator"
        :class="tab === 'open' ? 'is-left' : 'is-right'"
        aria-hidden="true"
      />
      <button
        type="button"
        role="tab"
        class="feed-seg__btn"
        :class="{ 'is-active': tab === 'open' }"
        :aria-selected="tab === 'open'"
        @click="tab = 'open'"
      >
        <span>Nyitott</span>
        <span v-if="openTickets.length" class="feed-seg__count">{{ openTickets.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="feed-seg__btn"
        :class="{ 'is-active': tab === 'closed' }"
        :aria-selected="tab === 'closed'"
        @click="tab = 'closed'"
      >
        <span>Lezárt</span>
        <span v-if="closedTickets.length" class="feed-seg__count">{{ closedTickets.length }}</span>
      </button>
    </div>

    <div v-if="loading" class="empty-state relative z-10">
      <q-spinner color="sky-400" size="28px" />
      <p>Jegyek betöltése…</p>
    </div>
    <div v-else-if="loadError" class="empty-state relative z-10">
      <q-icon name="sym_r_error" size="28px" class="text-rose-400 q-mb-xs" />
      <p>{{ loadError }}</p>
      <button type="button" class="retry-btn" @click="loadTickets">Újra</button>
    </div>
    <div v-else-if="visibleTickets.length" class="ticket-list relative z-10">
      <button
        v-for="item in visibleTickets"
        :key="item.ticketId"
        type="button"
        class="ticket-card"
        @click="openTicket(item.ticketId)"
      >
        <div class="ticket-card__top">
          <span class="ticket-card__id">#{{ item.ticketId }}</span>
          <span class="ticket-card__time">{{ formatTicketDate(item.updatedAt || item.createdAt) }}</span>
        </div>
        <div class="ticket-card__title">{{ item.title }}</div>
        <div class="ticket-card__meta">
          <span class="ticket-chip">{{ item.typeName }}</span>
          <span class="ticket-status" :class="`is-${ticketStatusTone(item.statusName, item.isClosedState)}`">
            {{ item.statusName }}
          </span>
        </div>
      </button>
    </div>
    <div v-else class="empty-state relative z-10">
      <q-icon name="sym_r_inbox" size="28px" class="text-slate-600 q-mb-xs" />
      <p>{{ tab === 'open' ? 'Nincs nyitott jegyed' : 'Nincs lezárt jegyed' }}</p>
    </div>

    <q-dialog v-model="isCreateOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="create-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="create-sheet__title">Új jegy</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
          />
        </q-card-section>
        <q-card-section class="q-pt-md q-px-md pb-6">
          <div class="create-field">
            <label class="create-field__label">Típus</label>
            <q-select
              v-model="draftTypeId"
              :options="typeOptions"
              emit-value
              map-options
              dark
              outlined
              dense
              hide-bottom-space
              :disable="saving || !typeOptions.length"
              class="create-input"
            />
          </div>
          <div class="create-field">
            <label class="create-field__label">Cím</label>
            <q-input
              v-model="draftTitle"
              dark
              outlined
              dense
              hide-bottom-space
              maxlength="255"
              counter
              class="create-input"
              :disable="saving"
            />
          </div>
          <div class="create-field">
            <label class="create-field__label">Részletes leírás</label>
            <q-input
              v-model="draftDescription"
              dark
              outlined
              type="textarea"
              autogrow
              hide-bottom-space
              class="create-input"
              :disable="saving"
              placeholder="A hiba reprodukálásának lépései, vagy az igényelt funkció leírása"
            />
          </div>
          <button
            type="button"
            class="submit-btn"
            :disabled="saving || !canSubmit"
            @click="submitTicket"
          >
            {{ saving ? 'Beküldés…' : 'Beküldés' }}
          </button>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import {
  createSupportTicket,
  fetchSupportTicketMetadata,
  fetchSupportTickets,
  formatTicketDate,
  ticketStatusTone,
  type SupportTicketMetadata,
  type SupportTicketSummary,
} from 'src/utils/supportTickets';

const router = useRouter();
const $q = useQuasar();

const tab = ref<'open' | 'closed'>('open');
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const tickets = ref<SupportTicketSummary[]>([]);
const metadata = ref<SupportTicketMetadata | null>(null);
const isCreateOpen = ref(false);
const draftTypeId = ref<number | null>(null);
const draftTitle = ref('');
const draftDescription = ref('');

const openTickets = computed(() => tickets.value.filter((item) => !item.isClosedState));
const closedTickets = computed(() => tickets.value.filter((item) => item.isClosedState));
const visibleTickets = computed(() => (tab.value === 'open' ? openTickets.value : closedTickets.value));
const typeOptions = computed(() =>
  (metadata.value?.types || []).map((item) => ({
    label: item.name,
    value: item.ticketTypeId,
  }))
);
const canSubmit = computed(() => {
  const title = draftTitle.value.trim();
  return draftTypeId.value != null && title.length > 0 && title.length <= 255;
});

async function loadTickets() {
  loading.value = true;
  loadError.value = '';
  try {
    if (!metadata.value) {
      try {
        metadata.value = await fetchSupportTicketMetadata();
      } catch {
        metadata.value = null;
      }
    }
    tickets.value = await fetchSupportTickets(metadata.value);
  } catch (error) {
    loadError.value = readAxiosErrorMessage(error, 'A jegyeid nem tölthetők.');
  } finally {
    loading.value = false;
  }
}

async function openCreateSheet() {
  isCreateOpen.value = true;
  if (!metadata.value) {
    try {
      metadata.value = await fetchSupportTicketMetadata();
    } catch (error) {
      $q.notify({
        message: readAxiosErrorMessage(error, 'A jegy típusok nem tölthetők.'),
        color: 'dark',
        textColor: 'red-4',
        position: 'top',
      });
    }
  }
  if (draftTypeId.value == null && metadata.value?.types[0]) {
    draftTypeId.value = metadata.value.types[0].ticketTypeId;
  }
}

function resetDraft() {
  draftTitle.value = '';
  draftDescription.value = '';
  draftTypeId.value = metadata.value?.types[0]?.ticketTypeId ?? null;
}

function openTicket(ticketId: number) {
  void router.push({ name: 'support_ticket', params: { ticketId: String(ticketId) } });
}

async function submitTicket() {
  if (!canSubmit.value || saving.value || draftTypeId.value == null) return;
  saving.value = true;
  try {
    await createSupportTicket({
      ticketTypeId: draftTypeId.value,
      title: draftTitle.value.trim(),
      description: draftDescription.value.trim(),
    });
    isCreateOpen.value = false;
    resetDraft();
    $q.notify({
      message: 'A jegyedet sikeresen rögzítettük (Függőben). A rendszergazdák hamarosan megvizsgálják.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
      icon: 'check_circle',
    });
    tab.value = 'open';
    await loadTickets();
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A jegy rögzítése sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadTickets();
});
</script>

<style scoped lang="scss">
.page-kicker {
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 165, 233, 0.14);
  color: #7dd3fc;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.feed-seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.feed-seg__indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.95) 0%, rgba(20, 184, 166, 0.95) 100%);
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.35);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 0;

  &.is-left {
    transform: translateX(0);
  }

  &.is-right {
    transform: translateX(100%);
  }
}

.feed-seg__btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 9px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &.is-active {
    color: #ffffff;
  }
}

.feed-seg__count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 120px;
}

.ticket-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ticket-card__top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.ticket-card__id {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #38bdf8;
}

.ticket-card__time {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.ticket-card__title {
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
}

.ticket-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ticket-chip {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 999px;
  padding: 3px 8px;
}

.ticket-status {
  font-size: 11px;
  font-weight: 800;
  border-radius: 999px;
  padding: 3px 8px;

  &.is-pending {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
  }
  &.is-progress,
  &.is-open {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.12);
  }
  &.is-scheduled {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.14);
  }
  &.is-released {
    color: #34d399;
    background: rgba(52, 211, 153, 0.12);
  }
  &.is-rejected {
    color: #fb7185;
    background: rgba(244, 63, 94, 0.12);
  }
  &.is-withdrawn,
  &.is-closed {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.1);
  }
}

.empty-state {
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px 16px;
  text-align: center;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.retry-btn,
.submit-btn {
  margin-top: 12px;
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.submit-btn {
  width: 100%;
  margin-top: 18px;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}

.create-sheet {
  width: 100%;
  max-width: 560px;
  background: #0f172a;
  color: #fff;
  border-radius: 24px 24px 0 0;
}

.create-sheet__title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e2e8f0;
}

.create-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.create-field__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  padding-left: 4px;
}

.create-input {
  :deep(.q-field__control) {
    background: rgba(11, 15, 25, 0.7);
    border-radius: 12px;
  }
}
</style>
