<template>
  <q-dialog :model-value="modelValue" position="bottom" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="invite-sheet">
      <div class="invite-sheet__handle" aria-hidden="true" />
      <div class="invite-sheet__icon">
        <q-icon name="sym_r_mark_email_unread" size="22px" />
      </div>
      <h2 class="invite-sheet__title">Meghívó megerősítése</h2>
      <p class="invite-sheet__event">{{ eventName }}</p>
      <p class="invite-sheet__hint">Elfogadod a meghívást erre az eseményre?</p>
      <div class="invite-sheet__actions">
        <button type="button" class="invite-sheet__btn invite-sheet__btn--ghost" :disabled="busy" @click="onReject">
          Elutasítom
        </button>
        <button type="button" class="invite-sheet__btn invite-sheet__btn--primary" :disabled="busy" @click="onAccept">
          Elfogadom
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { findEventUserStatusByName } from 'src/utils/eventUserFlow';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { setEventUserStatus } from 'src/utils/eventChange';

const props = defineProps<{
  modelValue: boolean;
  eventId: string | number | null;
  eventName: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  decided: [];
}>();

const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const busy = ref(false);

function close() {
  emit('update:modelValue', false);
}

function notify(message: string, ok = true) {
  $q.notify({
    message,
    color: 'dark',
    textColor: ok ? 'blue-4' : 'amber-4',
    position: 'top',
    timeout: 2200,
    classes: 'ej-notify',
  });
}

function resolveEventUserId(): number | null {
  if (props.eventId == null) return null;
  return eventStore.getMyEventUserStatus(props.eventId)?.eventUserId ?? null;
}

async function persistStatus(eventUserId: number, toId: number, prevId: number | null): Promise<boolean> {
  eventStore.applyEventUserStatus(eventUserId, toId, prevId);
  const eventId = nullableNumericId(props.eventId);
  if (eventId == null) return true;
  try {
    await setEventUserStatus({
      eventId,
      eventUserId,
      toStatusId: toId,
      prevStatusId: prevId,
    });
    await eventStore.refreshEventData().catch(() => undefined);
    return true;
  } catch (error) {
    notify(readAxiosErrorMessage(error, 'A státusz a szerveren nem frissült.'), false);
    return false;
  }
}

async function onAccept() {
  if (busy.value) return;
  const eventUserId = resolveEventUserId();
  const current = props.eventId != null ? eventStore.getMyEventUserStatus(props.eventId) : null;
  if (eventUserId == null || !current) {
    notify('Nem található a meghívó.', false);
    return;
  }

  const confirmed = findEventUserStatusByName(masterDataStore.eventUserStatuses, 'Megerősítve');
  const toId = nullableNumericId(confirmed?.id);
  if (toId == null) {
    notify('Nincs „Megerősítve” státusz a masterben.', false);
    return;
  }

  busy.value = true;
  try {
    const saved = await persistStatus(eventUserId, toId, current.statusId);
    if (saved) notify('Meghívó elfogadva');
    emit('decided');
    close();
  } finally {
    busy.value = false;
  }
}

async function onReject() {
  if (busy.value) return;
  const eventUserId = resolveEventUserId();
  const current = props.eventId != null ? eventStore.getMyEventUserStatus(props.eventId) : null;
  if (eventUserId == null || !current) {
    notify('Nem található a meghívó.', false);
    return;
  }

  const declined =
    findEventUserStatusByName(masterDataStore.eventUserStatuses, 'Elutasítva') ||
    findEventUserStatusByName(masterDataStore.eventUserStatuses, 'Lemondva');
  const toId = nullableNumericId(declined?.id);

  busy.value = true;
  try {
    if (toId != null) {
      const saved = await persistStatus(eventUserId, toId, current.statusId);
      if (saved) notify('Meghívó elutasítva');
    } else {
      const eu = eventStore.eventUsers.find((row) => Number(row.id) === eventUserId);
      if (eu) eu.ActiveFlg = 0;
      notify('Meghívó elutasítva');
    }
    emit('decided');
    close();
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.invite-sheet {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: #141516;
  color: #e2e8f0;
  padding: 12px 20px 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: none;
}

.invite-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 4px auto 16px;
}

.invite-sheet__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
}

.invite-sheet__title {
  margin: 0 0 6px;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.invite-sheet__event {
  margin: 0 0 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #cbd5e1;
}

.invite-sheet__hint {
  margin: 0 0 20px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}

.invite-sheet__actions {
  display: flex;
  gap: 10px;
}

.invite-sheet__btn {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.invite-sheet__btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.invite-sheet__btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.invite-sheet__btn--primary {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: #0f172a;
}
</style>
