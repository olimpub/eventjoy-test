<template>
  <div class="op-mosaic" :class="{ 'is-hold': paused }">
    <div class="op-mosaic__mesh" aria-hidden="true" />
    <p class="op-mosaic__live">
      <b>Játék</b>
      <span>{{ topic || 'Mozaik' }}</span>
      <em v-if="sortLabel">{{ sortLabel }}</em>
    </p>
    <p class="op-mosaic__hint">{{ hint }}</p>
    <button
      v-if="canTip && !paused && !busy"
      type="button"
      class="op-mosaic__tip"
      @click="emit('tip')"
    >
      Tippelj
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    topic?: string;
    sortLabel?: string;
    paused?: boolean;
    mine?: boolean;
    canTip?: boolean;
    busy?: boolean;
  }>(),
  {
    topic: '',
    sortLabel: '',
    paused: false,
    mine: false,
    canTip: false,
    busy: false,
  }
);

const emit = defineEmits<{
  tip: [];
}>();

const hint = computed(() => {
  if (props.mine) return 'A kvízmester dönt — Jó vagy Rossz.';
  if (props.paused) return 'Valaki tippel. Várj.';
  return 'Hallgasd a zenét. Ha tudod, nyomj Tippelj-t.';
});
</script>

<style scoped>
.op-mosaic {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px 20px 40px;
  overflow: hidden;
  color: #e0f7fa;
  background: #06141c;
}

.op-mosaic__mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(34, 211, 238, 0.45), transparent 36%),
    radial-gradient(circle at 88% 18%, rgba(99, 102, 241, 0.4), transparent 32%),
    radial-gradient(circle at 70% 92%, rgba(16, 185, 129, 0.28), transparent 34%);
  pointer-events: none;
}

.op-mosaic__live {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
}

.op-mosaic__live b {
  padding: 6px 10px;
  border-radius: 999px;
  background: #22d3ee;
  color: #042433;
  font-weight: 900;
}

.op-mosaic__live em {
  font-style: normal;
  font-weight: 800;
  color: #67e8f9;
}

.op-mosaic__hint {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: 22rem;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
}

.op-mosaic__tip {
  position: relative;
  z-index: 1;
  min-width: min(86vw, 280px);
  min-height: 88px;
  border: 0;
  border-radius: 28px;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
  color: #042433;
  font-size: 1.6rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(34, 211, 238, 0.35);
}
</style>
