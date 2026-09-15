<template>
  <q-page class="ticket-page bg-brand-dark text-white flex flex-col">
    <div class="ticket-head">
      <q-btn
        flat
        round
        dense
        icon="arrow_back"
        class="text-sky-400 bg-white/5"
        @click="router.push({ name: 'support' })"
      />
      <div class="ticket-head__main">
        <div class="ticket-head__id">#{{ ticketId }}</div>
        <h1 class="ticket-head__title">{{ ticket?.title || 'Jegy' }}</h1>
        <div class="ticket-head__meta">
          <span
            v-if="ticket"
            class="ticket-status"
            :class="`is-${ticketStatusTone(ticket.statusName, ticket.isClosedState)}`"
          >
            {{ ticket.statusName }}
          </span>
          <span v-if="ticket?.targetVersion" class="ticket-version">
            Kiadás: v{{ ticket.targetVersion.replace(/^v/i, '') }}
          </span>
        </div>
      </div>
      <q-btn
        v-if="ticket?.canWithdraw && !ticket.isClosedState"
        flat
        dense
        no-caps
        label="Visszavonás"
        class="withdraw-btn"
        :disable="busy"
        @click="isWithdrawOpen = true"
      />
    </div>

    <div v-if="loading" class="ticket-empty">
      <q-spinner color="sky-400" size="28px" />
      <p>Jegy betöltése…</p>
    </div>
    <div v-else-if="loadError" class="ticket-empty">
      <p>{{ loadError }}</p>
      <button type="button" class="retry-btn" @click="loadDetail">Újra</button>
    </div>
    <template v-else-if="ticket">
      <div class="ticket-scroll">
        <section class="ticket-desc">
          <div class="ticket-desc__label">Eredeti leírás</div>
          <p class="ticket-desc__text">{{ ticket.description || 'Nincs részletes leírás.' }}</p>
        </section>

        <div class="ticket-thread">
          <div v-if="!ticket.comments.length" class="ticket-thread__empty">
            Még nincs hozzászólás.
          </div>
          <article
            v-for="comment in ticket.comments"
            :key="comment.commentId"
            class="bubble"
            :class="`is-${comment.authorKind}`"
          >
            <div class="bubble__meta">
              <span>{{ commentAuthorLabel(comment) }}</span>
              <span>{{ formatTicketDate(comment.createdAt) }}</span>
            </div>
            <p class="bubble__text">{{ comment.body }}</p>
          </article>
        </div>

        <form class="ticket-reply" @submit.prevent="sendComment">
          <div class="ticket-reply__label">Üzenet a támogatásnak</div>
          <q-input
            v-model="draftComment"
            dark
            outlined
            type="textarea"
            autogrow
            hide-bottom-space
            :disable="busy"
            placeholder="Írd ide az üzeneted…"
            class="ticket-reply__input"
          />
          <button
            type="submit"
            class="ticket-reply__btn"
            :disabled="busy"
          >
            {{ busy ? 'Küldés…' : 'Üzenet küldése' }}
          </button>
        </form>
      </div>
    </template>

    <AppConfirmDialog
      v-model="isWithdrawOpen"
      title="Igény visszavonása"
      message="Biztosan visszavonod ezt az igényt? A jegy lezárásra kerül, és a rendszergazdák már nem vizsgálják tovább."
      ok-label="Igen, visszavonom"
      variant="danger"
      icon="sym_r_undo"
      :busy="busy"
      @confirm="confirmWithdraw"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { useAuthStore } from 'src/stores/auth';
import AppConfirmDialog from 'src/components/ui/AppConfirmDialog.vue';
import {
  currentUserId,
  fetchSupportTicket,
  fetchSupportTicketMetadata,
  formatTicketDate,
  postSupportTicketComment,
  ticketStatusTone,
  withdrawSupportTicket,
  type SupportTicketComment,
  type SupportTicketDetail,
  type SupportTicketMetadata,
} from 'src/utils/supportTickets';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const loading = ref(false);
const busy = ref(false);
const loadError = ref('');
const ticket = ref<SupportTicketDetail | null>(null);
const metadata = ref<SupportTicketMetadata | null>(null);
const draftComment = ref('');
const isWithdrawOpen = ref(false);

const ticketId = computed(() => nullableNumericId(route.params.ticketId));
const selfUserId = computed(() => currentUserId(authStore.user));

function commentAuthorLabel(comment: SupportTicketComment) {
  if (comment.authorKind === 'self') return 'Te';
  if (comment.authorKind === 'ai') return 'AI';
  if (comment.authorKind === 'sysadmin') return comment.authorName || 'Támogatás';
  return comment.authorName;
}

async function loadDetail() {
  const id = ticketId.value;
  if (id == null) {
    loadError.value = 'Érvénytelen jegy.';
    return;
  }
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
    ticket.value = await fetchSupportTicket(id, selfUserId.value, metadata.value);
  } catch (error) {
    ticket.value = null;
    loadError.value = readAxiosErrorMessage(error, 'A jegy nem tölthető.');
  } finally {
    loading.value = false;
  }
}

async function sendComment() {
  const id = ticketId.value;
  const body = draftComment.value.trim();
  if (id == null || busy.value) return;
  if (!body) {
    $q.notify({
      message: 'Írj egy üzenetet a küldéshez.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    return;
  }
  busy.value = true;
  try {
    await postSupportTicketComment(id, body);
    draftComment.value = '';
    await loadDetail();
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A hozzászólás nem menthető.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    busy.value = false;
  }
}

async function confirmWithdraw() {
  const id = ticketId.value;
  if (id == null || busy.value) return;
  busy.value = true;
  try {
    await withdrawSupportTicket(id);
    isWithdrawOpen.value = false;
    $q.notify({
      message: 'Az igényt visszavontuk.',
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    await loadDetail();
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A visszavonás sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
    });
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void loadDetail();
});

watch(ticketId, () => {
  void loadDetail();
});
</script>

<style scoped lang="scss">
.ticket-page {
  min-height: 100%;
}

.ticket-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ticket-head__main {
  min-width: 0;
  flex: 1;
}

.ticket-head__id {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #38bdf8;
}

.ticket-head__title {
  margin: 2px 0 8px;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}

.ticket-head__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ticket-version {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}

.withdraw-btn {
  color: #94a3b8 !important;
  font-size: 11px;
  font-weight: 800;
}

.ticket-scroll {
  flex: 1;
  padding: 16px 16px 120px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ticket-desc {
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ticket-desc__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 8px;
}

.ticket-desc__text {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  color: #e2e8f0;
}

.ticket-thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-thread__empty,
.ticket-empty {
  text-align: center;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  padding: 24px 8px;
}

.ticket-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bubble {
  max-width: 88%;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.is-self {
    align-self: flex-end;
  }

  &.is-sysadmin,
  &.is-ai,
  &.is-other {
    align-self: flex-start;
  }
}

.bubble__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.bubble__text {
  margin: 0;
  padding: 12px 14px;
  border-radius: 18px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.45;
}

.bubble.is-self .bubble__text {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #fff;
  border-bottom-right-radius: 6px;
}

.bubble.is-sysadmin .bubble__text {
  background: #1e293b;
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: #fff;
  border-bottom-left-radius: 6px;
}

.bubble.is-ai .bubble__text {
  background: rgba(148, 163, 184, 0.1);
  border: 1px dashed rgba(148, 163, 184, 0.28);
  color: #cbd5e1;
  border-bottom-left-radius: 6px;
}

.bubble.is-other .bubble__text {
  background: #1e293b;
  color: #fff;
  border-bottom-left-radius: 6px;
}

.ticket-reply {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 16px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.28);
}

.ticket-reply__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #38bdf8;
}

.ticket-reply__input {
  :deep(.q-field__control) {
    background: rgba(11, 15, 25, 0.7);
    border-radius: 12px;
  }
}

.ticket-reply__btn {
  width: 100%;
  min-height: 46px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}

.retry-btn {
  margin-top: 12px;
  border: none;
  border-radius: 14px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
  color: #fff;
  font-weight: 800;
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
</style>
