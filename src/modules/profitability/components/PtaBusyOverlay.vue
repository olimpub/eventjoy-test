<template>
  <Teleport to="body">
    <Transition name="pta-busy">
      <div v-if="modelValue" class="pta-busy" role="status" aria-live="polite" aria-busy="true">
        <div class="pta-busy__card">
          <div class="pta-busy__orbit" aria-hidden="true">
            <span class="pta-busy__dot" style="--i: 0; --c: #ff6060" />
            <span class="pta-busy__dot" style="--i: 1; --c: #28c76f" />
            <span class="pta-busy__dot" style="--i: 2; --c: #2aa9ff" />
            <span class="pta-busy__dot" style="--i: 3; --c: #f2e74b" />
            <span class="pta-busy__core" />
          </div>
          <p class="pta-busy__label">{{ label }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
  }>(),
  { label: 'Dolgozom…' }
);
</script>

<style scoped>
.pta-busy {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 7, 8, 0.62);
  backdrop-filter: blur(10px);
  cursor: wait;
}

.pta-busy__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 168px;
  padding: 28px 32px 22px;
  border-radius: 28px;
  background: rgba(16, 17, 18, 0.92);
  border: 1px solid rgba(246, 139, 41, 0.28);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 24px 60px rgba(0, 0, 0, 0.5),
    0 0 48px rgba(246, 139, 41, 0.12);
}

.pta-busy__orbit {
  position: relative;
  width: 72px;
  height: 72px;
  animation: pta-busy-spin 1.15s linear infinite;
}

.pta-busy__dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  margin: -6px;
  border-radius: 999px;
  background: var(--c);
  box-shadow: 0 0 14px var(--c);
  transform: rotate(calc(var(--i) * 90deg)) translate(26px);
}

.pta-busy__core {
  position: absolute;
  inset: 24px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(246, 139, 41, 0.55), rgba(246, 139, 41, 0.08) 70%);
  animation: pta-busy-pulse 1.15s ease-in-out infinite;
}

.pta-busy__label {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f8fafc;
}

.pta-busy-enter-active,
.pta-busy-leave-active {
  transition: opacity 0.18s ease;
}

.pta-busy-enter-from,
.pta-busy-leave-to {
  opacity: 0;
}

@keyframes pta-busy-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pta-busy-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.86);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
