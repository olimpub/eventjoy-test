<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="op-media">
      <div class="op-media__handle" aria-hidden="true" />
      <h2 class="op-media__title">Média</h2>
      <p class="op-media__hint">Kép a játékosnak, MP3 a játékmester gépére.</p>

      <article class="op-media__card">
        <div class="op-media__card-top">
          <q-icon name="sym_r_image" size="20px" />
          <div>
            <h3>Kérdéskép</h3>
            <p>{{ imageLabel }}</p>
          </div>
        </div>
        <div v-if="imageSrc" class="op-media__preview">
          <img :src="imageSrc" alt="" />
        </div>
        <div class="op-media__row">
          <button type="button" class="op-media__btn is-gold" :disabled="!canEdit || busy" @click="pick('image')">
            {{ imageKey ? 'Csere' : 'Feltöltés' }}
          </button>
          <button type="button" class="op-media__btn" :disabled="!canEdit || !imageKey || busy" @click="clear('image')">
            Eltávolítás
          </button>
        </div>
      </article>

      <article class="op-media__card">
        <div class="op-media__card-top">
          <q-icon name="sym_r_music_note" size="20px" />
          <div>
            <h3>Hang a játékmesternek</h3>
            <p>{{ audioLabel }}</p>
          </div>
        </div>
        <audio v-if="audioSrc" class="op-media__audio" :src="audioSrc" controls preload="metadata" />
        <div class="op-media__row">
          <button type="button" class="op-media__btn is-gold" :disabled="!canEdit || busy" @click="pick('audio')">
            {{ audioKey ? 'Csere' : 'Feltöltés' }}
          </button>
          <button type="button" class="op-media__btn" :disabled="!canEdit || !audioKey || busy" @click="clear('audio')">
            Eltávolítás
          </button>
        </div>
      </article>

      <p v-if="error" class="op-media__err">{{ error }}</p>
      <input ref="imageInput" type="file" class="hidden" :accept="OP_IMAGE_ACCEPT" @change="onFile('image', $event)" />
      <input ref="audioInput" type="file" class="hidden" :accept="OP_AUDIO_ACCEPT" @change="onFile('audio', $event)" />
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { OP_AUDIO_ACCEPT, OP_IMAGE_ACCEPT, uploadOpMedia, type OpMediaKind } from '../opMedia';
import { putLocalMedia } from '../opMediaCache';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';

const props = defineProps<{
  modelValue: boolean;
  eventId: number;
  questionId: number | null;
  canEdit: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  audioKey: string | null;
  audioUrl: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  bound: [patch: { imageKey?: string | null; imageUrl?: string | null; audioKey?: string | null; audioUrl?: string | null }];
}>();

const imageInput = ref<HTMLInputElement | null>(null);
const audioInput = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const error = ref('');
const imageSrc = ref<string | null>(null);
const audioSrc = ref<string | null>(null);

const imageLabel = computed(() => {
  if (busy.value) return 'Feltöltés…';
  if (props.imageKey) return props.imageKey;
  return 'Nincs kép — a játékos a logót látja.';
});
const audioLabel = computed(() => {
  if (busy.value) return 'Feltöltés…';
  if (props.audioKey) return props.audioKey;
  return 'Nincs MP3. Csak .mp3, max 20 MB.';
});

function revoke(url: string | null) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

watch(
  () => [props.modelValue, props.imageUrl, props.audioUrl] as const,
  ([open, image, audio]) => {
    if (!open) return;
    error.value = '';
    if (imageSrc.value !== image) {
      revoke(imageSrc.value);
      imageSrc.value = image;
    }
    if (audioSrc.value !== audio) {
      revoke(audioSrc.value);
      audioSrc.value = audio;
    }
  }
);

onUnmounted(() => {
  revoke(imageSrc.value);
  revoke(audioSrc.value);
});

function pick(kind: OpMediaKind) {
  if (!props.canEdit) return;
  (kind === 'image' ? imageInput.value : audioInput.value)?.click();
}

async function onFile(kind: OpMediaKind, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !props.canEdit) return;
  busy.value = true;
  error.value = '';
  try {
    const item = await uploadOpMedia({
      eventId: props.eventId,
      file,
      kind,
      questionId: props.questionId,
    });
    await putLocalMedia(props.eventId, item, file);
    const local = URL.createObjectURL(file);
    if (kind === 'image') {
      revoke(imageSrc.value);
      imageSrc.value = local;
      emit('bound', { imageKey: item.MediaKey, imageUrl: item.BlobUrl || local });
    } else {
      revoke(audioSrc.value);
      audioSrc.value = local;
      emit('bound', { audioKey: item.MediaKey, audioUrl: item.BlobUrl || local });
    }
  } catch (err) {
    error.value = readAxiosErrorMessage(err, 'A feltöltés sikertelen.');
  } finally {
    busy.value = false;
  }
}

function clear(kind: OpMediaKind) {
  if (!props.canEdit) return;
  if (kind === 'image') {
    revoke(imageSrc.value);
    imageSrc.value = null;
    emit('bound', { imageKey: null, imageUrl: null });
    return;
  }
  revoke(audioSrc.value);
  audioSrc.value = null;
  emit('bound', { audioKey: null, audioUrl: null });
}
</script>

<style scoped>
.op-media {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: rgba(11, 16, 32, 0.98);
  border-top: 1px solid rgba(245, 185, 66, 0.35);
  color: #fff6e8;
  padding: 8px 20px 24px;
}

.op-media__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 16px;
}

.op-media__title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 800;
}

.op-media__hint {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #c4b8a0;
}

.op-media__card {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(245, 185, 66, 0.2);
  background: rgba(7, 10, 20, 0.7);
}

.op-media__card-top {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  color: #f5b942;
}

.op-media__card-top h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #fff6e8;
}

.op-media__card-top p {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #c4b8a0;
  word-break: break-all;
}

.op-media__preview {
  margin: 12px 0 0;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  max-height: 160px;
}

.op-media__preview img {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: contain;
}

.op-media__audio {
  width: 100%;
  margin-top: 12px;
}

.op-media__row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.op-media__btn {
  flex: 1;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #fff6e8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.op-media__btn.is-gold {
  border-color: rgba(245, 185, 66, 0.45);
  background: rgba(245, 185, 66, 0.16);
  color: #f5b942;
}

.op-media__btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.op-media__err {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: #fb7185;
}

.hidden {
  display: none;
}
</style>
