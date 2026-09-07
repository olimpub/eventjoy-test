<template>
  <div
    ref="rootEl"
    class="catalog-pull"
    :class="{ 'is-pulling': pullPx > 0 || busy }"
    @pointerdown="onDown"
    @pointerup="finish"
    @pointercancel="finish"
    @lostpointercapture="onLostCapture"
  >
    <div
      class="catalog-pull__hint"
      :class="{ 'is-visible': hintVisible }"
      :style="{ opacity: hintOpacity, transform: `translate(-50%, ${Math.max(pullPx - 8, 0)}px)` }"
    >
      <q-spinner v-if="busy" color="cyan-4" size="22px" />
      <q-icon v-else name="sym_r_refresh" size="22px" color="cyan-4" />
    </div>
    <div class="catalog-pull__body" :style="{ transform: `translateY(${pullPx}px)` }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const ARM_PX = 72;
const MAX_PX = 112;

const emit = defineEmits(['refresh']);

const rootEl = ref<HTMLElement | null>(null);
const pullPx = ref(0);
const busy = ref(false);

const hintVisible = computed(() => busy.value || pullPx.value > 8);
const hintOpacity = computed(() => {
  if (busy.value) return 1;
  return Math.min(1, pullPx.value / ARM_PX);
});

let tracking = false;
let captured = false;
let pointerId: number | null = null;
let startY = 0;
let startX = 0;

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    'button, a, input, textarea, select, [role="button"], .q-btn, .new-event-btn'
  );
}

function getScrollTop(): number {
  let node: HTMLElement | null = rootEl.value;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      return node.scrollTop;
    }
    node = node.parentElement;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function onDown(event: PointerEvent) {
  if (busy.value || event.button !== 0) return;
  if (isIgnoredTarget(event.target)) return;
  if (getScrollTop() > 2) return;
  tracking = true;
  captured = false;
  pointerId = event.pointerId;
  startY = event.clientY;
  startX = event.clientX;
}

function onMove(event: PointerEvent) {
  if (!tracking || event.pointerId !== pointerId) return;
  const dy = event.clientY - startY;
  const dx = event.clientX - startX;
  if (!captured) {
    if (Math.abs(dx) > 10 && Math.abs(dx) >= Math.abs(dy)) {
      tracking = false;
      return;
    }
    if (dy < 10) return;
    captured = true;
    rootEl.value?.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  pullPx.value = Math.min(MAX_PX, Math.max(0, dy * 0.55));
}

function finish(event: PointerEvent) {
  if (!tracking || event.pointerId !== pointerId) return;
  const shouldRefresh = captured && pullPx.value >= ARM_PX && !busy.value;
  tracking = false;
  captured = false;
  pointerId = null;
  try {
    rootEl.value?.releasePointerCapture(event.pointerId);
  } catch {
    /* already released */
  }
  if (!shouldRefresh) {
    pullPx.value = 0;
    return;
  }
  busy.value = true;
  pullPx.value = 48;
  emit('refresh', () => {
    busy.value = false;
    pullPx.value = 0;
  });
}

function onLostCapture() {
  tracking = false;
  captured = false;
  pointerId = null;
  if (!busy.value) pullPx.value = 0;
}

onMounted(() => {
  const el = rootEl.value;
  if (!el) return;
  el.addEventListener('pointermove', onMove, { passive: false });
});

onBeforeUnmount(() => {
  rootEl.value?.removeEventListener('pointermove', onMove);
});
</script>

<style scoped>
.catalog-pull {
  position: relative;
  touch-action: pan-y;
}

.catalog-pull__hint {
  position: absolute;
  top: 4px;
  left: 50%;
  z-index: 5;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(34, 211, 238, 0.35);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
}

.catalog-pull__hint.is-visible {
  visibility: visible;
}

.catalog-pull.is-pulling,
.catalog-pull.is-pulling * {
  user-select: none;
}

.catalog-pull__body {
  will-change: transform;
}
</style>
