<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="pass-sheet">
      <div class="pass-sheet__handle" aria-hidden="true" />
      <h2 class="pass-sheet__title">Belépő kód</h2>
      <p class="pass-sheet__name">{{ playerName }}</p>
      <p class="pass-sheet__hint">A saját telefonjával olvassa le. Ez a kód az ő adatlapját nyitja.</p>

      <div v-if="loading" class="pass-sheet__state">
        <q-spinner color="orange-5" size="32px" />
      </div>
      <p v-else-if="errorMessage" class="pass-sheet__error">{{ errorMessage }}</p>
      <div v-else-if="qrUrl" class="pass-frame">
        <span class="pass-frame__mark pass-frame__mark--tl" aria-hidden="true" />
        <span class="pass-frame__mark pass-frame__mark--tr" aria-hidden="true" />
        <span class="pass-frame__mark pass-frame__mark--bl" aria-hidden="true" />
        <span class="pass-frame__mark pass-frame__mark--br" aria-hidden="true" />
        <div class="pass-frame__plate">
          <img :src="qrUrl" alt="Belépő QR-kód" />
        </div>
      </div>

      <button type="button" class="pass-sheet__btn" :disabled="loading || eventUserId == null" @click="loadPass(true)">
        Új kód
      </button>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import QRCode from 'qrcode';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import { playerPassAbsoluteUrl, requestPlayerDevicePass } from 'src/utils/playerDevicePass';

const props = defineProps<{
  modelValue: boolean;
  eventId: number | null;
  eventUserId: number | null;
  playerName: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const loading = ref(false);
const errorMessage = ref('');
const qrUrl = ref('');

async function loadPass(rotate = false) {
  if (props.eventId == null || props.eventUserId == null) return;
  loading.value = true;
  errorMessage.value = '';
  qrUrl.value = '';
  try {
    const pass = await requestPlayerDevicePass({
      eventId: props.eventId,
      eventUserId: props.eventUserId,
      rotate,
    });
    qrUrl.value = await QRCode.toDataURL(playerPassAbsoluteUrl(pass.passToken), {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (error) {
    errorMessage.value = readAxiosErrorMessage(
      error,
      'A belépő kódot a szerver még nem adja ki.'
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.modelValue, props.eventUserId] as const,
  ([open]) => {
    if (!open) return;
    void loadPass(false);
  }
);
</script>

<style scoped>
.pass-sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 8px 20px 28px;
  border-radius: 28px 28px 0 0;
  background: #14181f;
  color: #fff;
  text-align: center;
}

.pass-sheet__handle {
  width: 48px;
  height: 6px;
  margin: 8px auto 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}

.pass-sheet__title,
.pass-sheet__name,
.pass-sheet__hint,
.pass-sheet__error {
  width: 100%;
}

.pass-sheet__title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f68b29;
}

.pass-sheet__name {
  margin: 8px 0 0;
  font-size: 20px;
  font-weight: 800;
}

.pass-sheet__hint {
  margin: 8px 0 18px;
  font-size: 13px;
  line-height: 1.45;
  color: #94a3b8;
}

.pass-frame {
  position: relative;
  width: min(78vw, 300px);
  margin: 0 auto;
  padding: 22px;
  border-radius: 28px;
  background: #1c222b;
  border: 1px solid rgba(246, 139, 41, 0.45);
  box-shadow:
    0 0 0 6px rgba(246, 139, 41, 0.08),
    0 18px 40px rgba(0, 0, 0, 0.35);
}

.pass-frame__mark {
  position: absolute;
  width: 18px;
  height: 18px;
  border-style: solid;
  border-color: #f68b29;
  border-width: 0;
}

.pass-frame__mark--tl {
  top: 10px;
  left: 10px;
  border-top-width: 3px;
  border-left-width: 3px;
  border-top-left-radius: 8px;
}

.pass-frame__mark--tr {
  top: 10px;
  right: 10px;
  border-top-width: 3px;
  border-right-width: 3px;
  border-top-right-radius: 8px;
}

.pass-frame__mark--bl {
  bottom: 10px;
  left: 10px;
  border-bottom-width: 3px;
  border-left-width: 3px;
  border-bottom-left-radius: 8px;
}

.pass-frame__mark--br {
  right: 10px;
  bottom: 10px;
  border-bottom-width: 3px;
  border-right-width: 3px;
  border-bottom-right-radius: 8px;
}

.pass-frame__plate {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border-radius: 18px;
  background: #fff;
}

.pass-frame__plate img {
  display: block;
  width: 100%;
  height: auto;
}

.pass-sheet__state {
  padding: 28px 0;
}

.pass-sheet__error {
  margin: 0 0 12px;
  color: #fb7185;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.pass-sheet__btn {
  align-self: center;
  margin-top: 18px;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pass-sheet__btn:disabled {
  opacity: 0.45;
}
</style>
