<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="join-qr" :class="{ 'is-pta': variant === 'pta' }">
      <button type="button" class="join-qr__close" aria-label="Bezárás" @click="emit('update:modelValue', false)">
        <q-icon name="sym_r_close" size="26px" />
      </button>

      <p class="join-qr__kicker">Helyszíni belépés</p>
      <h2 class="join-qr__title">{{ eventName }}</h2>
      <p class="join-qr__hint">Olvasd be a QR-kódot a belépéshez.</p>

      <div v-if="qrUrl" class="join-qr__frame">
        <img :src="qrUrl" alt="Helyszíni belépés QR-kód" />
      </div>
      <p v-else class="join-qr__missing">{{ missingText }}</p>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import QRCode from 'qrcode';
import { pickEventUid, eventJoinAbsoluteUrl } from 'src/utils/eventJoin';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    event?: unknown;
    eventName?: string;
    variant?: 'default' | 'pta';
  }>(),
  {
    event: null,
    eventName: 'Esemény',
    variant: 'default',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const qrUrl = ref('');
const missingText = ref('A QR-kód nem érhető el.');

const eventUid = computed(() => pickEventUid(props.event));

watch(
  () => [props.modelValue, eventUid.value] as const,
  async ([open, uid]) => {
    if (!open) return;
    if (!uid) {
      qrUrl.value = '';
      missingText.value = 'Ehhez az eseményhez nincs EventUID — a QR nem jeleníthető meg.';
      return;
    }
    qrUrl.value = await QRCode.toDataURL(eventJoinAbsoluteUrl(uid), {
      width: 520,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  }
);
</script>

<style scoped>
.join-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  margin: 0;
  padding: 32px 24px 48px;
  background: #0f172a;
  color: #fff;
  box-shadow: none;
}

.join-qr.is-pta {
  background: #121416;
}

.join-qr__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  cursor: pointer;
}

.join-qr__kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #38bdf8;
}

.join-qr.is-pta .join-qr__kicker {
  color: #f68b29;
}

.join-qr__title {
  margin: 10px 0 0;
  max-width: 32rem;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.join-qr__hint {
  margin: 8px 0 24px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #94a3b8;
}

.join-qr__frame {
  width: min(78vw, 360px);
  padding: 16px;
  border-radius: 24px;
  background: #fff;
}

.join-qr__frame img {
  display: block;
  width: 100%;
  height: auto;
}

.join-qr__missing {
  max-width: 22rem;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #fbbf24;
}
</style>
