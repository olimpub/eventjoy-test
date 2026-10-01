<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="true"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="mode === 'player'" class="op-prev-full">
      <button type="button" class="op-prev-full__close" aria-label="Bezárás" @click="emit('update:modelValue', false)">
        <q-icon name="close" size="22px" />
      </button>
      <div class="op-prev-face" role="tablist" aria-label="Kvíz vagy játék">
        <button type="button" :class="{ 'is-on': playerFace === 'quiz' }" @click="setFace('quiz')">Kvíz</button>
        <button type="button" :class="{ 'is-on': playerFace === 'game' }" @click="setFace('game')">Játék</button>
      </div>
      <OpPlayerStage
        v-if="modelValue"
        :key="`${question?.prompt}|${question?.timeSec}|${playerFace}`"
        :question="question"
        :media-url="question?.mediaUrl"
        :remaining-ratio="demoRatio"
        :remaining-sec="demoSec"
        :face="playerFace"
        :question-no="questionNo"
        :question-total="playerFace === 'game' ? 5 : 8"
        phase="play"
        @ready="startDemo"
      />
    </div>
    <div v-else-if="mode === 'quizmaster'" class="op-prev-full">
      <OpQuizmasterHome
        :key="String(modelValue)"
        :prompt="question?.prompt || ''"
        :correct="correctText"
        :time-sec="question?.timeSec || 20"
        :topic="question?.topic || ''"
        :media-url="question?.mediaUrl"
        :audio-url="question?.audioUrl"
        :event-id="eventId"
        @close="emit('update:modelValue', false)"
      />
    </div>
    <div v-else class="op-prev-full">
      <div class="op-wall__switch" role="tablist" aria-label="Vetítés">
        <button type="button" :class="{ 'is-on': wallFace === 'lobby' }" @click="wallFace = 'lobby'">
          Váróterem
        </button>
        <button type="button" :class="{ 'is-on': wallFace === 'question' }" @click="wallFace = 'question'">
          Kérdés
        </button>
        <button type="button" :class="{ 'is-on': wallFace === 'results' }" @click="wallFace = 'results'">
          Eredmény
        </button>
      </div>
      <button type="button" class="op-prev-full__close" aria-label="Bezárás" @click="emit('update:modelValue', false)">
        <q-icon name="close" size="22px" />
      </button>
      <OpWaitingRoom v-if="wallFace === 'lobby'" :topic="question?.topic || ''" :face="playerFace" />
      <OpResultsBoard v-else-if="wallFace === 'results'" round-over :topic="question?.topic || ''" :face="playerFace" />
      <OpDisplayQuestion
        v-else
        :prompt="question?.prompt || ''"
        :sort-label="sortLabel"
        :topic="question?.topic || ''"
        :face="playerFace"
        :time-sec="question?.timeSec || 20"
        :media-url="question?.mediaUrl"
        :type="question?.type"
        :answers="question?.answers"
        :matches="question?.matches"
        :categories="question?.categories"
      />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { OpQuestionPreviewModel } from '../opData';
import OpPlayerStage from './OpPlayerStage.vue';
import OpQuizmasterHome from './OpQuizmasterHome.vue';
import OpDisplayQuestion from './OpDisplayQuestion.vue';
import OpResultsBoard from './OpResultsBoard.vue';
import OpWaitingRoom from './OpWaitingRoom.vue';

const props = defineProps<{
  modelValue: boolean;
  mode: 'quizmaster' | 'player' | 'display';
  question: OpQuestionPreviewModel | null;
  eventId?: number | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const sortLabel = computed(() =>
  props.question?.sortIndex ? `${props.question.sortIndex}. kérdés` : 'Kérdés'
);
const questionNo = computed(() => {
  const sort = props.question?.sortIndex || 1;
  return playerFace.value === 'game' ? Math.min(sort, 5) : sort;
});
const wallFace = ref<'lobby' | 'question' | 'results'>('lobby');
const playerFace = ref<'quiz' | 'game'>('quiz');
const demoSec = ref(20);
const demoRatio = ref(1);
let demoTick: number | null = null;

function demoLength() {
  return playerFace.value === 'game' ? 10 : props.question?.timeSec || 20;
}

function stopDemo() {
  if (demoTick != null) {
    window.clearInterval(demoTick);
    demoTick = null;
  }
}

function startDemo() {
  stopDemo();
  const total = demoLength();
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

function setFace(next: 'quiz' | 'game') {
  playerFace.value = next;
  if (props.modelValue && props.mode === 'player') startDemo();
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
  height: 100%;
  min-height: 100vh;
  overflow: auto;
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

.op-prev-face {
  position: absolute;
  right: 12px;
  bottom: 16px;
  z-index: 40;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.45);
}

.op-prev-face button {
  min-height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #fff8f2;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.op-prev-face button.is-on {
  background: #f5b942;
  color: #1a1408;
}

.op-wall__switch {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 40;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.45);
}

.op-wall__switch button {
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #fff8f2;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.op-wall__switch button.is-on {
  background: #f5b942;
  color: #1a1408;
}
</style>
