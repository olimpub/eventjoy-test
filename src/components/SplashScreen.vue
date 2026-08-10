<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="splash-container"
    >
      <!-- Layered Foreground Logo centered on solid background -->
      <div class="logo-wrapper animate-zoom-in">
        <img
          src="~assets/eventjoy_splash_foreground_1024.png"
          alt="EventJoy Logo"
          class="logo-image"
        />
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
/* Bulletproof plain CSS to guarantee correct display even if Tailwind fails/delays loading */
.splash-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  background-color: #0F172A;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

.logo-wrapper {
  position: relative;
  width: 256px;
  height: 256px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fade-leave-active {
  transition: opacity 0.5s ease-in-out;
}

.fade-leave-to {
  opacity: 0;
}

@keyframes zoom-in {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-zoom-in {
  animation: zoom-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
