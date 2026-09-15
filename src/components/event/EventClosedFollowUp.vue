<template>
  <section v-if="showRating || showCertificate" class="closed-followup">
    <button
      v-if="showRating"
      type="button"
      class="closed-followup__btn"
      :class="{ 'is-open': ratingOpen, 'has-rating': hasSubmitted }"
      @click="togglePanel"
    >
      <q-icon name="star" size="20px" class="closed-followup__lead" />
      <span class="closed-followup__label">
        <template v-if="hasSubmitted">Értékelésed</template>
        <template v-else>Értékelési lehetőség</template>
        <span v-if="hasSubmitted && storedRating" class="closed-followup__score">
          {{ storedRating }}/5
        </span>
      </span>
      <q-icon :name="ratingOpen ? 'expand_less' : 'expand_more'" size="20px" class="closed-followup__chevron" />
    </button>

    <div v-if="showRating && ratingOpen" class="closed-followup__form">
      <template v-if="hasSubmitted && !editing">
        <div class="closed-followup__stars" role="img" :aria-label="`${storedRating} csillag`">
          <span
            v-for="star in 5"
            :key="'v-' + star"
            class="closed-followup__star is-static"
            :class="{ 'is-on': star <= storedRating }"
          >
            <q-icon :name="star <= storedRating ? 'star' : 'star_border'" size="28px" />
          </span>
        </div>
        <p v-if="storedComment" class="closed-followup__text">{{ storedComment }}</p>
        <p v-else class="closed-followup__text is-muted">Nincs szöveges értékelés.</p>
        <div class="closed-followup__actions is-split">
          <button type="button" class="closed-followup__save" :disabled="busy" @click="startEdit">
            Szerkesztés
          </button>
          <button type="button" class="closed-followup__ghost is-danger" :disabled="busy" @click="confirmDelete">
            Törlés
          </button>
        </div>
      </template>

      <template v-else>
        <div class="closed-followup__stars" role="group" aria-label="Értékelés 1-től 5-ig">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            class="closed-followup__star"
            :class="{ 'is-on': star <= (hoverRating || rating) }"
            :aria-label="`${star} csillag`"
            :disabled="busy"
            @mouseenter="hoverRating = star"
            @mouseleave="hoverRating = 0"
            @click="rating = star"
          >
            <q-icon :name="star <= (hoverRating || rating) ? 'star' : 'star_border'" size="28px" />
          </button>
        </div>
        <q-input
          v-model="comment"
          type="textarea"
          outlined
          dark
          autogrow
          :disable="busy"
          color="orange"
          placeholder="Szöveges értékelés (opcionális)"
          class="closed-followup__comment"
        />
        <div class="closed-followup__actions" :class="{ 'is-split': hasSubmitted }">
          <button
            type="button"
            class="closed-followup__save"
            :disabled="busy || rating < 1 || !isDirty"
            @click="saveRating"
          >
            {{ busy ? 'Mentés…' : hasSubmitted ? 'Mentés' : 'Értékelés leadása' }}
          </button>
          <button
            v-if="hasSubmitted"
            type="button"
            class="closed-followup__ghost"
            :disabled="busy"
            @click="cancelEdit"
          >
            Mégse
          </button>
        </div>
      </template>
    </div>

    <button
      v-if="showCertificate"
      type="button"
      class="closed-followup__btn closed-followup__btn--cert"
      :disabled="certBusy"
      @click="downloadCertificate"
    >
      <q-spinner v-if="certBusy" size="20px" color="amber-4" class="closed-followup__lead" />
      <q-icon v-else name="workspace_premium" size="20px" class="closed-followup__lead" />
      <span class="closed-followup__label">{{ certBusy ? 'Oklevél készül…' : 'Oklevél letöltése' }}</span>
      <span class="closed-followup__chevron" aria-hidden="true" />
    </button>
  </section>

  <AppConfirmDialog
    v-model="isConfirmOpen"
    title="Értékelés törlése"
    message="Törlöd a leadott értékelést? Később újra leadhatod."
    ok-label="Törlés"
    variant="danger"
    icon="sym_r_delete"
    @confirm="confirmDeleteOk"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useMasterDataStore, ORGANIZER_ROLE_TYPE_ID } from 'src/stores/masterData';
import { useEventStore, type EnterableEventRole, type EventUser } from 'src/stores/event';
import { useAuthStore } from 'src/stores/auth';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { setEventUserRating } from 'src/utils/eventChange';
import { downloadEventCertificatePdf } from 'src/utils/eventCertificate';
import { eventDatasheetKind } from 'src/utils/eventRoleNav';
import { findPtaPlayerForEventUser, ptaEventPlayerId, ptaEventRoundId } from 'src/modules/profitability/ptaData';
import {
  catalogHasPublishedStatus,
  computePublishedPlayerFinals,
} from 'src/modules/profitability/standings';
import AppConfirmDialog from 'src/components/ui/AppConfirmDialog.vue';

const props = defineProps<{
  eventId: string | number;
  eventEnded: boolean;
  currentRole: EnterableEventRole | null;
  roles: EnterableEventRole[];
}>();

const $q = useQuasar();
const masterDataStore = useMasterDataStore();
const eventStore = useEventStore();
const authStore = useAuthStore();
const ratingOpen = ref(false);
const isConfirmOpen = ref(false);
const editing = ref(false);
const busy = ref(false);
const certBusy = ref(false);
const rating = ref(0);
const hoverRating = ref(0);
const comment = ref('');

function eventUserById(id: number | null | undefined): EventUser | null {
  if (id == null) return null;
  const match = (row: EventUser) => Number(row.id) === Number(id);
  return eventStore.eventParticipants.find(match) || eventStore.eventUsers.find(match) || null;
}

const storedEventUser = computed(() => eventUserById(props.currentRole?.eventUserId ?? null));
const storedRating = computed(() => storedEventUser.value?.Rating ?? 0);
const storedComment = computed(() => storedEventUser.value?.RatingComment ?? '');
const hasSubmitted = computed(() => storedRating.value >= 1);

const isDirty = computed(() => {
  return rating.value !== storedRating.value || comment.value.trim() !== storedComment.value;
});

watch(
  storedEventUser,
  (row) => {
    if (editing.value || busy.value) return;
    rating.value = row?.Rating ?? 0;
    comment.value = row?.RatingComment ?? '';
  },
  { immediate: true }
);

const isOrganizerType = computed(() => {
  const role = props.currentRole;
  if (!role) return true;
  if (role.isOrganizer) return true;
  return masterDataStore.getRoleTypeIdByRoleId(role.masterRoleId) === ORGANIZER_ROLE_TYPE_ID;
});

const showRating = computed(() => props.eventEnded && !isOrganizerType.value);

const showCertificate = computed(() => {
  if (!props.eventEnded || isOrganizerType.value) return false;
  return props.roles.some((role) => {
    const kind = eventDatasheetKind(role, props.eventId);
    return kind === 'player' || kind === 'gamemaster';
  });
});

const certificateEvent = computed(() => {
  const id = String(props.eventId);
  return (
    eventStore.events?.find((row: { id?: number }) => String(row.id) === id) ||
    eventStore.myEvents?.find((row: { id?: number }) => String(row.id) === id) ||
    null
  );
});

const certificatePersonName = computed(() => {
  const eu = storedEventUser.value as
    | (EventUser & { FirstName?: string; LastName?: string; DisplayName?: string })
    | null;
  const last = String(eu?.LastName ?? '').trim();
  const first = String(eu?.FirstName ?? '').trim();
  const composed = `${last} ${first}`.trim();
  const display = String(eu?.DisplayName ?? '').trim();
  return composed || display || authStore.currentUserDisplayName;
});

function formatCertificateDate(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const date = new Date(String(raw));
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

const certificateResult = computed(() => {
  const eventUserId = props.currentRole?.eventUserId;
  if (eventUserId == null) return { place: null as number | null, score: null as number | null };
  const userId = nullableNumericId(
    eventStore.eventUsers.find((row) => Number(row.id) === Number(eventUserId))?.UserID
  );
  const player = findPtaPlayerForEventUser(
    eventStore.ptaEventPlayers,
    props.eventId,
    eventUserId,
    userId
  );
  const playerId = ptaEventPlayerId(player);
  const rounds = eventStore.getPtaRoundsForEvent(props.eventId).map((row, index) => {
    const id = ptaEventRoundId(row) ?? nullableNumericId(row.id) ?? index + 1;
    const statusId = nullableNumericId(row.EventRoundStatusID);
    const fromMaster =
      statusId != null ? masterDataStore.getPtaEventRoundStatusById(statusId)?.SName : '';
    return { id, status: String(fromMaster || row.SName || '') };
  });
  const fromBoard =
    playerId == null
      ? null
      : computePublishedPlayerFinals({
          rounds,
          roundDesks: eventStore.getPtaRoundDesksForEvent(props.eventId),
          schedules: eventStore.getPtaSchedulesForEvent(props.eventId),
          catalogHasPublished: catalogHasPublishedStatus(masterDataStore.ptaEventRoundStatuses),
        }).find((row) => row.playerId === playerId);
  const placeRaw = fromBoard?.FinalPosition ?? (player ? Number(player.FinalPosition ?? 0) : 0);
  const scoreRaw = fromBoard?.FinalPoint ?? (player && player.FinalPoint != null ? Number(player.FinalPoint) : null);
  const place = placeRaw >= 1 && placeRaw <= 8 ? placeRaw : null;
  const score = scoreRaw != null && Number.isFinite(scoreRaw) ? scoreRaw : null;
  return { place, score };
});

async function downloadCertificate() {
  if (certBusy.value) return;
  certBusy.value = true;
  try {
    const rec = (certificateEvent.value || {}) as Record<string, unknown>;
    await downloadEventCertificatePdf({
      personName: certificatePersonName.value,
      eventName: String(rec.EventName ?? rec.Name ?? rec.Title ?? rec.eventName ?? 'Esemény'),
      eventDateLabel: formatCertificateDate(rec.StartAtUtc ?? rec.startAtUtc ?? rec.StartAt ?? rec.date),
      roleName: props.currentRole?.name || '',
      place: certificateResult.value.place,
      score: certificateResult.value.score,
    });
  } catch (error) {
    notify(readAxiosErrorMessage(error, 'Az oklevél letöltése sikertelen.'), false);
  } finally {
    certBusy.value = false;
  }
}

function notify(message: string, ok = true) {
  $q.notify({
    message,
    color: 'dark',
    textColor: ok ? 'orange-4' : 'red-4',
    position: 'top',
    timeout: 2200,
    classes: `border rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4 ${
      ok ? 'border-orange-500/30' : 'border-red-500/30'
    }`,
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
}

function togglePanel() {
  ratingOpen.value = !ratingOpen.value;
  if (!ratingOpen.value) cancelEdit();
}

function startEdit() {
  rating.value = storedRating.value;
  comment.value = storedComment.value;
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  hoverRating.value = 0;
  rating.value = storedRating.value;
  comment.value = storedComment.value;
}

async function saveRating() {
  if (busy.value || rating.value < 1 || !isDirty.value) return;
  const eventId = nullableNumericId(props.eventId);
  const eventUserId = props.currentRole?.eventUserId ?? null;
  if (eventId == null || eventUserId == null) {
    notify('Hiányzik az esemény vagy a szerep.', false);
    return;
  }
  busy.value = true;
  const wasSubmitted = hasSubmitted.value;
  try {
    await setEventUserRating({
      eventId,
      eventUserId,
      rating: rating.value,
      ratingComment: comment.value,
    });
    editing.value = false;
    notify(wasSubmitted ? 'Értékelés frissítve.' : 'Értékelés elküldve.');
  } catch (error) {
    notify(readAxiosErrorMessage(error, 'Az értékelés mentése sikertelen.'), false);
  } finally {
    busy.value = false;
  }
}

function confirmDelete() {
  if (busy.value || !hasSubmitted.value) return;
  isConfirmOpen.value = true;
}

function confirmDeleteOk() {
  isConfirmOpen.value = false;
  void deleteRating();
}

async function deleteRating() {
  const eventId = nullableNumericId(props.eventId);
  const eventUserId = props.currentRole?.eventUserId ?? null;
  if (eventId == null || eventUserId == null) {
    notify('Hiányzik az esemény vagy a szerep.', false);
    return;
  }
  busy.value = true;
  try {
    await setEventUserRating({
      eventId,
      eventUserId,
      rating: null,
      ratingComment: null,
    });
    editing.value = false;
    rating.value = 0;
    comment.value = '';
    notify('Értékelés törölve.');
  } catch (error) {
    notify(readAxiosErrorMessage(error, 'Az értékelés törlése sikertelen.'), false);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.closed-followup {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.closed-followup__btn {
  display: grid;
  grid-template-columns: 24px 1fr 24px;
  align-items: center;
  column-gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(246, 139, 41, 0.4);
  background: rgba(246, 139, 41, 0.12);
  color: #fdba74;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.closed-followup__btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.closed-followup__lead,
.closed-followup__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.closed-followup__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.closed-followup__score {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f2e74b;
}

.closed-followup__btn.is-open,
.closed-followup__btn.has-rating {
  border-color: rgba(246, 139, 41, 0.7);
  background: rgba(246, 139, 41, 0.2);
}

.closed-followup__btn--cert {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

.closed-followup__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 11, 12, 0.55);
}

.closed-followup__stars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.closed-followup__star {
  display: inline-flex;
  padding: 4px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

.closed-followup__star.is-static {
  cursor: default;
}

.closed-followup__star:disabled {
  cursor: default;
}

.closed-followup__star.is-on {
  color: #f2e74b;
}

.closed-followup__text {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: #e2e8f0;
  overflow-wrap: anywhere;
}

.closed-followup__text.is-muted {
  color: #94a3b8;
  font-weight: 600;
}

.closed-followup__comment :deep(.q-field__control) {
  border-radius: 12px;
}

.closed-followup__actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.closed-followup__actions.is-split {
  grid-template-columns: 1fr 1fr;
}

.closed-followup__save,
.closed-followup__ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.closed-followup__save {
  border: 1px solid rgba(246, 139, 41, 0.55);
  background: rgba(246, 139, 41, 0.22);
  color: #fdba74;
}

.closed-followup__ghost {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.closed-followup__ghost.is-danger {
  border-color: rgba(244, 63, 94, 0.35);
  background: rgba(244, 63, 94, 0.1);
  color: #fda4af;
}

.closed-followup__save:disabled,
.closed-followup__ghost:disabled {
  opacity: 0.45;
  cursor: default;
}

.rating-confirm {
  width: min(100%, 360px);
  margin: 16px;
  padding: 22px 20px 18px;
  border-radius: 24px;
  background: rgba(12, 13, 14, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(246, 139, 41, 0.22);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;
}

.rating-confirm__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: rgba(255, 96, 96, 0.16);
  color: #ff6060;
}

.rating-confirm__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: #ff6060;
}

.rating-confirm__message {
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-align: center;
  color: #cbd5e1;
}

.rating-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rating-confirm__btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.rating-confirm__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.rating-confirm__btn--danger {
  background: rgba(255, 96, 96, 0.18);
  border-color: rgba(255, 96, 96, 0.35);
  color: #ff6060;
}
</style>
