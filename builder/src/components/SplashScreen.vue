<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-dark overflow-hidden"
    >
      <div class="relative w-48 h-48 mb-8 animate-pulse-slow">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F63f0f74a9e2d44888ec29c2efcf85788%2F6ee21380f7fd46cda013ce002104beb0?format=webp&width=800&height=1200"
          alt="EventJoy Logo"
          class="w-full h-full object-contain"
        />
      </div>
      <h1 class="text-brand-yellow text-4xl font-bold tracking-wider animate-fade-in">
        EventJoy
      </h1>
      <p class="text-brand-cyan mt-2 text-sm uppercase tracking-widest animate-fade-in-delayed">
        Eseménykezelő Rendszer
      </p>

      <div class="absolute bottom-12 flex flex-col items-center">
        <div class="w-12 h-1 bg-brand-yellow/30 rounded-full overflow-hidden">
          <div class="w-full h-full bg-brand-yellow origin-left animate-loading-bar"></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
}>()
</script>

<style scoped>
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.animate-fade-in {
  animation: fadeIn 1s ease-out forwards;
}

.animate-fade-in-delayed {
  animation: fadeIn 1s ease-out 0.5s forwards;
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-loading-bar {
  animation: loading 2.5s ease-in-out infinite;
}

@keyframes loading {
  0% {
    transform: scaleX(0);
    transform-origin: left;
  }
  45% {
    transform: scaleX(1);
    transform-origin: left;
  }
  55% {
    transform: scaleX(1);
    transform-origin: right;
  }
  100% {
    transform: scaleX(0);
    transform-origin: right;
  }
}

.fade-leave-active {
  transition: opacity 0.8s ease-in-out;
}

.fade-leave-to {
  opacity: 0;
}
</style>
