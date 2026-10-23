<template>
  <div class="op-conn">
    <div class="op-conn__totals">
      <div class="op-conn__total">
        <strong>{{ data?.playersOnline ?? 0 }}</strong>
        <span>játékos online</span>
        <small>{{ data?.playersInTeams ?? 0 }} csapatban</small>
      </div>
      <div class="op-conn__total">
        <strong>{{ data?.displaysOnline ?? 0 }}</strong>
        <span>kijelző online</span>
        <small>{{ data?.displays.length ?? 0 }} munkamenet</small>
      </div>
    </div>

    <p v-if="loading && !data" class="op-conn__note">Kapcsolatok betöltése…</p>
    <p v-else-if="error" class="op-conn__note is-error">{{ error }}</p>
    <p v-else-if="data && !players.length && !displays.length" class="op-conn__note">
      Egyetlen kapcsolatot sem látunk. A szerver csak azt a telefont és kijelzőt tartja nyilván, amelyik a
      frissítés óta csatlakozott, ezért az már nyitott eszközökön egy oldalfrissítés kell.
    </p>

    <section class="op-conn__block">
      <header>
        <h3>Játékosok</h3>
        <button
          type="button"
          class="op-conn__bulk"
          :disabled="busy || !players.length"
          @click="confirm = { kind: 'players' }"
        >
          <q-icon name="sym_r_group_remove" size="18px" />
          Mindenki
        </button>
      </header>
      <p v-if="data && !players.length" class="op-conn__empty">Nincs csatlakozott játékos.</p>
      <ul v-else>
        <li v-for="row in players" :key="row.eventUserId" :class="{ 'is-off': !row.online }">
          <i class="op-conn__dot" :class="{ 'is-on': row.online }" aria-hidden="true" />
          <span class="op-conn__who">
            <b>{{ row.nickname || `Játékos ${row.eventUserId}` }}</b>
            <small>
              {{ row.teamName || 'Nincs csapata' }}
              <template v-if="row.deviceCount > 1"> · {{ row.deviceCount }} eszköz</template>
              <template v-if="seen(row.lastSeenUtc)"> · {{ seen(row.lastSeenUtc) }}</template>
            </small>
          </span>
          <button
            type="button"
            class="op-conn__kick"
            :disabled="busy"
            @click="confirm = { kind: 'player', row }"
          >
            Leválaszt
          </button>
        </li>
      </ul>
    </section>

    <section class="op-conn__block">
      <header>
        <h3>Kijelzők</h3>
        <button
          type="button"
          class="op-conn__bulk"
          :disabled="busy || !displays.length"
          @click="confirm = { kind: 'displays' }"
        >
          <q-icon name="sym_r_tv_off" size="18px" />
          Mindegyik
        </button>
      </header>
      <p v-if="data && !displays.length" class="op-conn__empty">Nincs csatlakozott kijelző.</p>
      <ul v-else>
        <li v-for="row in displays" :key="row.displayId" :class="{ 'is-off': !row.online }">
          <i class="op-conn__dot" :class="{ 'is-on': row.online }" aria-hidden="true" />
          <span class="op-conn__who">
            <b>{{ row.label }}</b>
            <small>
              Csatlakozott: {{ seen(row.connectedAtUtc) || '—' }}
              <template v-if="row.connectionCount > 1"> · {{ row.connectionCount }} kapcsolat</template>
            </small>
          </span>
          <button
            type="button"
            class="op-conn__kick"
            :disabled="busy"
            @click="confirm = { kind: 'display', row }"
          >
            Leválaszt
          </button>
        </li>
      </ul>
      <p class="op-conn__hint">
        A leválasztott kijelző nem csatlakozik vissza magától. Új PIN-t kell megadni rajta.
      </p>
    </section>

    <AppConfirmDialog
      :model-value="confirm != null"
      variant="warning"
      :title="confirmTitle"
      :message="confirmMessage"
      ok-label="Leválasztás"
      @update:model-value="(open: boolean) => { if (!open) confirm = null; }"
      @confirm="runConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import AppConfirmDialog from 'src/components/ui/AppConfirmDialog.vue';
import { readAxiosErrorMessage, readAxiosHttpStatus } from 'src/utils/apiPayload';
import { useOlimpubStore } from 'src/stores/olimpub';
import {
  clearOpTeamMembers,
  disconnectOpDisplays,
  fetchOpConnections,
  type OpConnectedDisplay,
  type OpConnectedPlayer,
  type OpConnections,
} from '../opApi';
import { parseOpUtcMs } from '../opData';

const props = defineProps<{ eventId: number }>();

type Confirm =
  | { kind: 'players' }
  | { kind: 'player'; row: OpConnectedPlayer }
  | { kind: 'displays' }
  | { kind: 'display'; row: OpConnectedDisplay };

const $q = useQuasar();
const store = useOlimpubStore();
const data = ref<OpConnections | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const confirm = ref<Confirm | null>(null);
const now = ref(Date.now());
let tickTimer = 0;
let pollTimer = 0;
let inFlight = false;
let again = false;

const players = computed(() =>
  [...(data.value?.players || [])].sort(
    (a, b) => Number(b.online) - Number(a.online) || a.nickname.localeCompare(b.nickname, 'hu')
  )
);
const displays = computed(() =>
  [...(data.value?.displays || [])].sort((a, b) => Number(b.online) - Number(a.online) || a.displayId - b.displayId)
);

const confirmTitle = computed(() => {
  const item = confirm.value;
  if (!item) return '';
  if (item.kind === 'players') return 'Minden játékost leválasztasz?';
  if (item.kind === 'player') return `${item.row.nickname || 'A játékos'} leválasztása?`;
  if (item.kind === 'displays') return 'Minden kijelzőt leválasztasz?';
  return `${item.row.label} leválasztása?`;
});

const confirmMessage = computed(() => {
  const item = confirm.value;
  if (!item) return '';
  if (item.kind === 'players' || item.kind === 'player') {
    return 'Kikerül a csapatából, és újra csapatot kell választania. A pontok megmaradnak.';
  }
  return 'A kijelző nem csatlakozik vissza magától. Új PIN-t kell megadni rajta.';
});

function seen(iso: string): string {
  const at = parseOpUtcMs(iso);
  if (at == null || !Number.isFinite(at)) return '';
  const sec = Math.max(0, Math.round((now.value - at) / 1000));
  if (sec < 45) return 'most';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} perce`;
  return `${Math.round(min / 60)} órája`;
}

async function load() {
  if (inFlight) {
    again = true;
    return;
  }
  inFlight = true;
  loading.value = true;
  try {
    data.value = await fetchOpConnections(props.eventId);
    error.value = '';
  } catch (err) {
    const status = readAxiosHttpStatus(err);
    error.value =
      status === 403
        ? 'A kapcsolatokat csak a kvízmester vagy a szervező látja.'
        : readAxiosErrorMessage(err, 'A kapcsolatok betöltése nem sikerült.');
  } finally {
    inFlight = false;
    loading.value = false;
    if (again) {
      again = false;
      void load();
    }
  }
}

async function runConfirmed() {
  const item = confirm.value;
  confirm.value = null;
  if (!item || busy.value) return;
  busy.value = true;
  try {
    if (item.kind === 'players') {
      await clearOpTeamMembers(props.eventId);
      store.clearTeamMembers(props.eventId);
    } else if (item.kind === 'player') {
      await clearOpTeamMembers(props.eventId, item.row.eventUserId);
      store.dropOwnTeam(props.eventId, item.row.eventUserId);
    } else if (item.kind === 'displays') {
      await disconnectOpDisplays(props.eventId);
    } else {
      await disconnectOpDisplays(props.eventId, item.row.displayId);
    }
    $q.notify({ type: 'positive', message: 'Leválasztva.', position: 'top', timeout: 1600 });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: readAxiosErrorMessage(err, 'A leválasztást a szerver nem vette át.'),
      position: 'top',
    });
  } finally {
    busy.value = false;
    void load();
  }
}

/* A BE az Op.ConnectionsChanged pinget másodpercenként legfeljebb egyszer küldi, így elég rá újratölteni. */
watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId !== props.eventId) return;
    if (store.lastPingAction === 'Op.ConnectionsChanged' || store.lastPingAction === 'Op.ClearTeamMembers') {
      void load();
    }
  }
);

onMounted(() => {
  void load();
  tickTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 15_000);
  /* Tartalék: ha egy ping elveszne, a lista így is frissül. */
  pollTimer = window.setInterval(() => {
    if (document.visibilityState !== 'hidden') void load();
  }, 30_000);
});

onUnmounted(() => {
  window.clearInterval(tickTimer);
  window.clearInterval(pollTimer);
});
</script>

<style scoped>
.op-conn {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #fff8f2;
}

.op-conn__totals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.op-conn__total {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 18px;
  background: rgba(255, 248, 242, 0.12);
}

.op-conn__total strong {
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.op-conn__total span {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 800;
}

.op-conn__total small {
  font-size: 12px;
  opacity: 0.7;
}

.op-conn__note,
.op-conn__empty,
.op-conn__hint {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: rgba(255, 248, 242, 0.75);
}

.op-conn__note.is-error {
  color: #ffb4b4;
}

.op-conn__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.op-conn__block header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.op-conn__block h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.op-conn__block ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.op-conn__block li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 248, 242, 0.1);
}

.op-conn__block li.is-off {
  opacity: 0.55;
}

.op-conn__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 248, 242, 0.35);
}

.op-conn__dot.is-on {
  background: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
}

.op-conn__who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.op-conn__who b {
  overflow: hidden;
  font-size: 16px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.op-conn__who small {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.7;
}

.op-conn__kick,
.op-conn__bulk {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: 2px solid rgba(255, 77, 109, 0.7);
  border-radius: 12px;
  background: transparent;
  color: #ff9db0;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.op-conn__kick:disabled,
.op-conn__bulk:disabled {
  cursor: default;
  opacity: 0.45;
}
</style>
