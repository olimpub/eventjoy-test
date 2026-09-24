<template>
  <button type="button" class="op-pack" :class="{ 'is-icon': compact }" :disabled="busy" :aria-label="label" @click="download">
    <q-icon :name="busy ? 'sym_r_downloading' : 'sym_r_download_for_offline'" size="18px" />
    <span v-if="!compact">{{ label }}</span>
    <q-tooltip v-if="compact">{{ label }}</q-tooltip>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { fetchOpMediaManifest } from '../opMedia';
import { downloadOpMediaPack } from '../opMediaCache';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';

const props = defineProps<{
  eventId: number | string;
  compact?: boolean;
}>();

const $q = useQuasar();
const busy = ref(false);
const done = ref(0);
const total = ref(0);

const label = computed(() => {
  if (busy.value && total.value) return `Letöltés ${done.value}/${total.value}`;
  if (busy.value) return 'Lista…';
  return 'Média az eszközre';
});

async function download() {
  if (busy.value) return;
  busy.value = true;
  done.value = 0;
  total.value = 0;
  try {
    const items = await fetchOpMediaManifest(props.eventId);
    if (!items.length) {
      $q.notify({ type: 'info', message: 'Ehhez az estéhez nincs média.', position: 'top' });
      return;
    }
    const result = await downloadOpMediaPack(props.eventId, items, (next, all) => {
      done.value = next;
      total.value = all;
    });
    $q.notify({
      type: result.failed ? 'warning' : 'positive',
      message:
        result.failed > 0
          ? `${result.ok} fájl megvan, ${result.failed} nem jött le.`
          : `${result.ok} média az eszközön.`,
      position: 'top',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: readAxiosErrorMessage(error, 'A média letöltése sikertelen.'),
      position: 'top',
    });
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.op-pack {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(245, 185, 66, 0.4);
  background: rgba(245, 185, 66, 0.12);
  color: #f5b942;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.op-pack:disabled {
  opacity: 0.55;
  cursor: default;
}

.op-pack.is-icon {
  width: 40px;
  padding: 0;
  justify-content: center;
}
</style>
