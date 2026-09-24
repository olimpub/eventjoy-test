<template>
  <q-page class="op-player-page">
    <OpPlayerStage
      :question="stageQuestion"
      :media-url="activeQuestion ? opQuestionImageUrl(activeQuestion) : null"
      :remaining-ratio="remainingRatio"
      :remaining-sec="remainingSec"
      :phase="activeQuestion ? 'play' : 'wait'"
      @ready="onStageReady"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useOlimpubStore } from 'src/stores/olimpub';
import { opQuestionImageUrl, previewModelFromQuestion } from '../opData';
import OpPlayerStage from '../components/OpPlayerStage.vue';
import '../theme.css';

const route = useRoute();
const store = useOlimpubStore();
const eventId = computed(() => String(route.params.id));
const nowMs = ref(Date.now());
const clockAt = ref<number | null>(null);
let tick: number | null = null;

const game = computed(() => store.getGame(eventId.value));
const activeQuestion = computed(() => {
  const liveId = game.value.live.ActiveEventQuestionID;
  return (
    game.value.questions.find((row) => row.StatusCode === 'active') ||
    (liveId != null ? game.value.questions.find((row) => row.id === liveId) : null) ||
    null
  );
});

const stageQuestion = computed(() =>
  activeQuestion.value ? previewModelFromQuestion(activeQuestion.value) : null
);

const remainingSec = computed(() => {
  const q = activeQuestion.value;
  if (!q) return 0;
  if (clockAt.value == null) return q.TimeSec;
  return Math.max(0, q.TimeSec - (nowMs.value - clockAt.value) / 1000);
});

function onStageReady() {
  clockAt.value = Date.now();
}

watch(
  () => activeQuestion.value?.id ?? null,
  () => {
    clockAt.value = null;
  }
);

const remainingRatio = computed(() => {
  const total = activeQuestion.value?.TimeSec || 1;
  return Math.max(0, Math.min(1, remainingSec.value / total));
});

watch(
  () => store.pingAt,
  () => {
    if (store.lastPingEventId != null && String(store.lastPingEventId) !== eventId.value) return;
    void store.loadGame(eventId.value);
  }
);

onMounted(() => {
  void store.loadGame(eventId.value);
  tick = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 200);
});

onUnmounted(() => {
  if (tick != null) window.clearInterval(tick);
});
</script>

<style scoped>
.op-player-page {
  padding: 0;
  min-height: 100vh;
  background: #07030f;
}

.op-player-page :deep(.op-play) {
  min-height: 100vh;
  border-radius: 0;
}
</style>
