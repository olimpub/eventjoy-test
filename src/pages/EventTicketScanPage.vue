<template>
  <q-page class="scan-page bg-brand-dark text-white">
    <header class="scan-header">
      <q-btn
        icon="arrow_back"
        flat
        round
        dense
        class="text-slate-400 hover:text-white bg-white/5"
        aria-label="Vissza"
        @click="goBack"
      />
      <div class="scan-header__text">
        <h1 class="scan-header__title">Jegykezelés</h1>
        <p class="scan-header__event">{{ eventName }}</p>
      </div>
    </header>

    <div class="scan-stage">
      <video ref="videoEl" class="scan-video" playsinline muted autoplay></video>
      <canvas ref="canvasEl" class="scan-canvas"></canvas>
      <div class="scan-reticle" :class="{ 'is-ok': resultKind === 'ok', 'is-bad': resultKind === 'invalid' || resultKind === 'unknown' || resultKind === 'wrong_event' }" />
      <p v-if="cameraError" class="scan-error">{{ cameraError }}</p>
      <p v-else-if="paused" class="scan-hint">Olvasás szünetel</p>
      <p v-else class="scan-hint">Irányítsd a kamerát a jegy QR-kódjára</p>
    </div>

    <q-dialog v-model="isResultOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="scanResult" class="scan-sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-px-md pb-8">
          <div class="scan-result" :class="'is-' + scanResult.kind">
            <q-icon :name="resultIcon" size="28px" />
            <div>
              <div class="scan-result__title">{{ resultTitle }}</div>
              <div class="scan-result__sub">{{ resultSubtitle }}</div>
            </div>
          </div>

          <div v-if="scanResult.kind === 'ok' && scanResult.row" class="scan-person">
            <div class="scan-person__name">{{ scanResult.row.name }}</div>
            <div class="scan-person__meta">
              <span v-if="scanResult.row.roleName">{{ scanResult.row.roleName }}</span>
              <span v-if="scanResult.row.ticketName">{{ scanResult.row.ticketName }}</span>
              <span v-if="scanResult.row.statusName">{{ scanResult.row.statusName }}</span>
            </div>
          </div>

          <button type="button" class="scan-next" @click="resumeScan">
            Következő jegy
          </button>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import jsQR from 'jsqr';
import { useEventStore, type EventUser } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { nullableNumericId, readAxiosErrorMessage } from 'src/utils/apiPayload';
import { normalizeEventUserUid } from 'src/utils/eventUserQr';
import { eventOrganizerManagePath, isEventUserCheckedInName } from 'src/utils/eventRoleNav';
import { findEventUserStatusByName } from 'src/utils/eventUserFlow';
import { setEventUserStatus } from 'src/utils/eventChange';

type ScanKind = 'ok' | 'unknown' | 'wrong_event' | 'invalid';

interface ScanRow {
  name: string;
  roleName: string;
  ticketName: string;
  statusName: string;
}

interface ScanResult {
  kind: ScanKind;
  uid: string | null;
  row: ScanRow | null;
}

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();

const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const cameraError = ref('');
const paused = ref(false);
const isResultOpen = ref(false);
const scanResult = ref<ScanResult | null>(null);
const lastRaw = ref('');

const eventId = computed(() => String(route.params.id));

const dbEvent = computed(() => {
  const targetId = eventId.value;
  return (
    eventStore.events?.find((e: any) => String(e.id) === targetId) ||
    eventStore.myEvents?.find((e: any) => String(e.id) === targetId) ||
    null
  );
});

const eventName = computed(() => {
  const e = dbEvent.value;
  if (!e) return 'Esemény';
  return e.Title || e.EventName || e.Name || 'Esemény';
});

const resultKind = computed(() => scanResult.value?.kind || null);

const resultIcon = computed(() => {
  if (scanResult.value?.kind === 'ok') return 'sym_r_check_circle';
  return 'sym_r_error';
});

const resultTitle = computed(() => {
  switch (scanResult.value?.kind) {
    case 'ok':
      return 'Érvényes jegy';
    case 'wrong_event':
      return 'Másik esemény';
    case 'unknown':
      return 'Ismeretlen jegy';
    default:
      return 'Érvénytelen QR';
  }
});

const resultSubtitle = computed(() => {
  switch (scanResult.value?.kind) {
    case 'ok':
      return 'Belépett — a jegy érvényes ezen az eseményen.';
    case 'wrong_event':
      return 'A kód létezik, de nem ehhez az eseményhez tartozik.';
    case 'unknown':
      return 'Nincs ilyen EventUserUID a betöltött résztvevők között.';
    default:
      return 'A kód nem EventUserUID.';
  }
});

let stream: MediaStream | null = null;
let rafId = 0;
let running = false;

function displayName(row: EventUser): string {
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const email = String(row.EmailAddress ?? row.emailAddress ?? '').trim();
  return [last, first].filter(Boolean).join(' ') || email || 'Résztvevő';
}

function mapRow(eu: EventUser): ScanRow {
  const eventRole = (eventStore.roles || []).find(
    (er: any) => Number(er.id) === Number(eu.EventRoleID) || Number(er.ID) === Number(eu.EventRoleID)
  );
  const masterRoleId = nullableNumericId(
    eventRole?.RoleID ?? eventRole?.RoleId ?? eu.RoleID ?? eu.RoleId
  );
  const ticket = (eventStore.tickets || []).find(
    (t: any) => Number(t.id) === Number(eu.EventTicketID) || Number(t.ID) === Number(eu.EventTicketID)
  );
  const statusId = eu.EventUserStatusID;
  return {
    name: displayName(eu),
    roleName: masterRoleId != null ? masterDataStore.getRoleNameById(masterRoleId) : '',
    ticketName: ticket ? String(ticket.TicketName || ticket.Name || '') : '',
    statusName: statusId != null ? masterDataStore.getEventUserStatusName(statusId) : '',
  };
}

function validatePayload(raw: string): ScanResult {
  const uid = normalizeEventUserUid(raw);
  if (!uid) return { kind: 'invalid', uid: null, row: null };

  const hit = eventStore.findEventUserByUid(uid);
  if (!hit) return { kind: 'unknown', uid, row: null };

  const sameEvent =
    Number(hit.EventID) === Number(eventId.value) || String(hit.EventID) === eventId.value;
  if (!sameEvent) return { kind: 'wrong_event', uid, row: mapRow(hit) };

  return { kind: 'ok', uid, row: mapRow(hit) };
}

async function checkInFromScan(uid: string) {
  const hit = eventStore.findEventUserByUid(uid);
  const numericEventId = nullableNumericId(eventId.value);
  if (!hit || numericEventId == null) return;

  const currentName =
    hit.EventUserStatusID != null ? masterDataStore.getEventUserStatusName(hit.EventUserStatusID) : '';
  if (isEventUserCheckedInName(currentName)) {
    if (scanResult.value?.kind === 'ok') scanResult.value.row = mapRow(hit);
    return;
  }

  const entered = findEventUserStatusByName(masterDataStore.eventUserStatuses, 'Belépett');
  const toId = nullableNumericId(entered?.id ?? entered?.ID ?? entered?.Id);
  if (toId == null) return;

  const prevId = nullableNumericId(hit.EventUserStatusID);
  try {
    await setEventUserStatus({
      eventId: numericEventId,
      eventUserUid: uid,
      eventUserId: nullableNumericId(hit.id),
      toStatusId: toId,
      prevStatusId: prevId,
    });
    eventStore.applyEventUserStatus(hit.id, toId, prevId);
    const updated = eventStore.findEventUserByUid(uid) || hit;
    if (scanResult.value?.kind === 'ok') scanResult.value.row = mapRow(updated);
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A beléptetés sikertelen.'),
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
      timeout: 2400,
    });
  }
}

function onDecoded(raw: string) {
  if (paused.value) return;
  if (raw === lastRaw.value) return;
  lastRaw.value = raw;
  paused.value = true;
  scanResult.value = validatePayload(raw);
  isResultOpen.value = true;
  if (scanResult.value.kind === 'ok' && scanResult.value.uid) {
    void checkInFromScan(scanResult.value.uid);
  }
}

function tick() {
  if (!running) return;
  const video = videoEl.value;
  const canvas = canvasEl.value;
  if (video && canvas && video.readyState >= 2 && !paused.value) {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w && h) {
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const image = ctx.getImageData(0, 0, w, h);
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code?.data) onDecoded(code.data);
      }
    }
  }
  rafId = window.requestAnimationFrame(tick);
}

async function startCamera() {
  cameraError.value = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    const video = videoEl.value;
    if (!video) return;
    video.srcObject = stream;
    await video.play();
    running = true;
    rafId = window.requestAnimationFrame(tick);
  } catch {
    cameraError.value = 'A kamera nem elérhető. Engedélyezd a hozzáférést, és próbáld újra.';
  }
}

function stopCamera() {
  running = false;
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  const video = videoEl.value;
  if (video) video.srcObject = null;
}

function resumeScan() {
  isResultOpen.value = false;
  scanResult.value = null;
  lastRaw.value = '';
  paused.value = false;
}

function goBack() {
  const { from, ...query } = route.query;
  const path =
    String(from || '') === 'pta'
      ? `/profitability/event/${eventId.value}/manage`
      : eventOrganizerManagePath(eventId.value);
  router.push({ path, query });
}

onMounted(() => {
  void startCamera();
  void loadDataSheet();
});

async function loadDataSheet() {
  const q = route.query.eventUserId;
  const fromQuery = q != null && q !== '' ? Number(q) : NaN;
  const fromCtx = eventStore.eventUserScreenContext?.requestEventUserId;
  const id = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : fromCtx;
  if (id == null) return;
  try {
    await eventStore.loadEventUserDataSheet(id);
  } catch {
    /* a kamera ettől még mehet; a validáció a betöltött listára támaszkodik */
  }
}

onUnmounted(() => {
  stopCamera();
});
</script>

<style scoped>
.scan-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.scan-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 12px;
}

.scan-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.scan-header__event {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.scan-stage {
  position: relative;
  flex: 1;
  margin: 0 16px 24px;
  min-height: 360px;
  overflow: hidden;
  border-radius: 24px;
  background: #0b0f19;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.scan-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-canvas {
  display: none;
}

.scan-reticle {
  position: absolute;
  inset: 18%;
  border: 2px solid rgba(56, 189, 248, 0.85);
  border-radius: 20px;
  box-shadow: 0 0 0 999px rgba(11, 15, 25, 0.35);
  pointer-events: none;
}

.scan-reticle.is-ok {
  border-color: #4ade80;
}

.scan-reticle.is-bad {
  border-color: #fb7185;
}

.scan-hint,
.scan-error {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
}

.scan-hint {
  color: #e2e8f0;
}

.scan-error {
  color: #fb7185;
}

.scan-sheet {
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(56, 189, 248, 0.3);
  color: #fff;
}

.scan-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 14px;
}

.scan-result.is-ok {
  border-color: rgba(74, 222, 128, 0.35);
  color: #4ade80;
}

.scan-result.is-unknown,
.scan-result.is-wrong_event,
.scan-result.is-invalid {
  border-color: rgba(251, 113, 133, 0.35);
  color: #fb7185;
}

.scan-result__title {
  font-size: 15px;
  font-weight: 800;
  color: #f8fafc;
}

.scan-result__sub {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.scan-person {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.scan-person__name {
  font-size: 16px;
  font-weight: 800;
}

.scan-person__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}

.scan-next {
  width: 100%;
  min-height: 48px;
  border-radius: 9999px;
  border: none;
  background: #38bdf8;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
</style>
