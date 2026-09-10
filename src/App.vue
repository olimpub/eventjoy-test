<template>
  <SplashScreen :show="isSplashVisible" />
  <div v-if="!isSplashVisible" class="ej-app">
    <div class="ej-app__main" :class="{ 'ej-app__main--flush': !showBottomNav && route.path.includes('/display') }">
      <router-view />
    </div>
    <AppBottomNav v-if="showBottomNav" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SplashScreen from 'components/SplashScreen.vue'
import AppBottomNav from 'src/components/layout/AppBottomNav.vue'

const route = useRoute()
const isSplashVisible = ref(true)

const showBottomNav = computed(() => {
  const path = route.path || ''
  return (
    path !== '/login' &&
    !path.startsWith('/invite') &&
    !path.startsWith('/join') &&
    !path.includes('/display')
  )
})

onMounted(() => {
  setTimeout(() => {
    isSplashVisible.value = false
  }, 3000)
})
</script>
