<template>
  <section class="op-break">
    <p class="op-break__kicker">{{ topic || 'Forduló' }}</p>
    <h1>Következő kérdés</h1>
    <p class="op-break__type">{{ typeLabel }}</p>
    <p v-if="remaining > 0" class="op-break__left">
      Még <strong>{{ remaining }}</strong> kérdés van hátra
    </p>
    <p class="op-break__cue">Várj a kvízmesterre</p>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    typeLabel: string;
    remaining: number;
    topic?: string;
  }>(),
  { topic: '' }
);
</script>

<style scoped>
.op-break {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 70vh;
  padding: 24px 20px 80px;
  text-align: center;
  color: #fff8f2;
}

.op-break__kicker {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f5b942;
}

.op-break h1 {
  margin: 0;
  font-size: clamp(32px, 8vw, 52px);
  font-weight: 900;
  line-height: 0.95;
}

.op-break__type {
  margin: 8px 0 0;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 248, 242, 0.12);
  font-size: 20px;
  font-weight: 900;
}

.op-break__left {
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: rgba(255, 248, 242, 0.78);
}

.op-break__left strong {
  color: #f5b942;
  font-size: 28px;
}

.op-break__cue {
  margin: 18px 0 0;
  font-size: 16px;
  font-weight: 800;
  color: #7dd3fc;
}
</style>
