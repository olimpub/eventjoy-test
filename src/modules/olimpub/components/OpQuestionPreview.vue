<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="isPlayer"
    :position="isPlayer ? undefined : 'bottom'"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="isPlayer" class="op-prev-full">
      <button type="button" class="op-prev-full__close" aria-label="Bezárás" @click="emit('update:modelValue', false)">
        <q-icon name="close" size="22px" />
      </button>
      <OpPlayerStage
        v-if="modelValue"
        :key="`${question?.prompt}|${question?.timeSec}`"
        :question="question"
        :media-url="question?.mediaUrl"
        :remaining-ratio="demoRatio"
        :remaining-sec="demoSec"
        phase="play"
        @ready="startDemo"
      />
    </div>
    <q-card v-else class="op-prev">
      <div class="op-prev__handle" aria-hidden="true" />
      <div class="op-prev__bar">
        <span class="op-prev__chip">
          <q-icon name="sym_r_sports_esports" size="16px" />
          Kvízmester nézet
        </span>
        <span v-if="question?.sortIndex" class="op-prev__ord">{{ question.sortIndex }}. kérdés</span>
      </div>

      <p class="op-prev__kicker">Élő kérdés</p>
      <h2 class="op-prev__prompt">{{ question?.prompt || '—' }}</h2>

      <p class="op-prev__correct">Helyes: {{ correctText }}</p>
      <div class="op-prev__timer">
        <span>{{ question?.timeSec || 20 }} mp</span>
        <span>{{ typeLabel }}</span>
      </div>

      <div v-if="type === 'freetext'" class="op-prev__free">
        <input disabled :value="isPlayer ? '' : synonyms.join(' | ')" :placeholder="isPlayer ? 'Írd ide a választ…' : ''" />
      </div>
      <div v-else-if="type === 'match'" class="op-prev__pairs">
        <div v-for="row in options" :key="`m-${row.i}`" class="op-prev__pair">
          <span>{{ row.text }}</span>
          <span class="op-prev__eq">=</span>
          <span>{{ row.match || '…' }}</span>
        </div>
      </div>
      <div v-else-if="type === 'category'" class="op-prev__opts">
        <button
          v-for="row in options"
          :key="`c-${row.i}`"
          type="button"
          class="op-prev__opt"
          :class="{ 'is-ok': !isPlayer && row.match }"
        >
          <span>{{ row.text }}</span>
          <small v-if="row.match">{{ row.match }}</small>
        </button>
      </div>
      <div v-else class="op-prev__opts">
        <button
          v-for="(row, n) in options"
          :key="`o-${row.i}`"
          type="button"
          class="op-prev__opt"
          :class="{ 'is-ok': !isPlayer && row.on }"
        >
          <span v-if="type === 'order'" class="op-prev__n">{{ n + 1 }}</span>
          {{ row.text }}
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { opTypeLabel } from '../constants';
import type { OpQuestionPreviewModel } from '../opData';
import OpPlayerStage from './OpPlayerStage.vue';

const props = defineProps<{
  modelValue: boolean;
  mode: 'quizmaster' | 'player';
  question: OpQuestionPreviewModel | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isPlayer = computed(() => props.mode === 'player');
const demoSec = ref(20);
const demoRatio = ref(1);
let demoTick: number | null = null;

function stopDemo() {
  if (demoTick != null) {
    window.clearInterval(demoTick);
    demoTick = null;
  }
}

function startDemo() {
  stopDemo();
  const total = props.question?.timeSec || 20;
  demoSec.value = total;
  demoRatio.value = 1;
  const started = Date.now();
  demoTick = window.setInterval(() => {
    const left = Math.max(0, total - (Date.now() - started) / 1000);
    demoSec.value = left;
    demoRatio.value = left / total;
    if (left <= 0) startDemo();
  }, 200);
}

watch(
  () => [props.modelValue, props.mode] as const,
  ([open, mode]) => {
    if (open && mode === 'player') {
      demoSec.value = props.question?.timeSec || 20;
      demoRatio.value = 1;
    } else {
      stopDemo();
    }
  }
);

onUnmounted(stopDemo);
const type = computed(() => String(props.question?.type || 'single'));
const typeLabel = computed(() => opTypeLabel(type.value));
const options = computed(() =>
  (props.question?.answers || [])
    .map((item, i) => ({
      i,
      text: String(item || '').trim(),
      match: String(props.question?.matches?.[i] || '').trim(),
      on: Boolean(props.question?.isCorrect?.[i]),
    }))
    .filter((row) => row.text)
);
const synonyms = computed(() => (props.question?.synonyms || []).map((item) => item.trim()).filter(Boolean));

const correctText = computed(() => {
  if (type.value === 'freetext') return synonyms.value.join(', ') || '—';
  if (type.value === 'single' || type.value === 'multi') {
    return options.value.filter((row) => row.on).map((row) => row.text).join(', ') || '—';
  }
  if (type.value === 'order') return options.value.map((row) => row.text).join(' → ') || '—';
  if (type.value === 'match' || type.value === 'category') {
    return options.value
      .map((row) => (row.match ? `${row.text} → ${row.match}` : ''))
      .filter(Boolean)
      .join(', ') || '—';
  }
  return '—';
});
</script>

<style scoped>
.op-prev-full {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: #07030f;
}

.op-prev-full :deep(.op-play) {
  min-height: 100vh;
  border-radius: 0;
}

.op-prev-full :deep(.op-play__meta) {
  margin-right: 44px;
}

.op-prev-full__close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 40;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff8f2;
  cursor: pointer;
}

.op-prev {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: rgba(11, 16, 32, 0.98);
  border-top: 1px solid rgba(245, 185, 66, 0.35);
  color: #fff6e8;
  padding: 8px 20px 28px;
}

.op-prev.is-phone {
  max-width: 390px;
  padding-bottom: 12px;
}

.op-prev__stage {
  min-height: 560px;
  margin-top: 10px;
}

.op-prev__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 14px;
}

.op-prev__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.op-prev__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #f5b942;
  font-size: 12px;
  font-weight: 800;
}

.op-prev__ord {
  font-size: 11px;
  font-weight: 700;
  color: #c4b8a0;
}

.op-prev__kicker {
  margin: 18px 0 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-prev__prompt {
  margin: 6px 0 0;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.op-prev__correct {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: #86efac;
}

.op-prev__timer {
  display: flex;
  justify-content: space-between;
  margin: 12px 0 16px;
  font-size: 12px;
  font-weight: 700;
  color: #c4b8a0;
}

.op-prev__opts,
.op-prev__pairs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.op-prev__opt,
.op-prev__pair,
.op-prev__free input {
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #fff6e8;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.op-prev__opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
}

.op-prev__opt.is-ok {
  border-color: rgba(245, 185, 66, 0.55);
  background: rgba(245, 185, 66, 0.14);
  color: #f5b942;
}

.op-prev__opt small {
  font-size: 11px;
  font-weight: 700;
  color: #c4b8a0;
}

.op-prev__n {
  width: 22px;
  color: #f5b942;
}

.op-prev__pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.op-prev__eq {
  color: #f5b942;
}

.op-prev__free input {
  padding: 10px 12px;
}
</style>
