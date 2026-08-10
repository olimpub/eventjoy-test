<template>
  <SplashScreen :show="isSplashVisible" />
  <router-view v-if="!isSplashVisible" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SplashScreen from 'components/SplashScreen.vue'

const isSplashVisible = ref(true)

onMounted(() => {
  setTimeout(() => {
    isSplashVisible.value = false
  }, 3000)
})
</script>
