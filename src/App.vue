<template>
  <SplashScreen :show="isSplashVisible" />
  <div
    v-if="!isSplashVisible"
    class="ej-app"
    :class="{
      'ej-app--admin': isAdminRoute,
    }"
  >
    <div class="ej-app__main" :class="{ 'ej-app__main--flush': !showBottomNav && (route.path.includes('/display') || isAdminRoute) }">
      <router-view />
    </div>
    <AppBottomNav v-if="showBottomNav" />
    <HelpSheet />
    <NetworkStatusBanner />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SplashScreen from 'components/SplashScreen.vue'
import AppBottomNav from 'src/components/layout/AppBottomNav.vue'
import HelpSheet from 'src/components/help/HelpSheet.vue'
import NetworkStatusBanner from 'src/components/layout/NetworkStatusBanner.vue'

const route = useRoute()
const isSplashVisible = ref(true)

const isAdminRoute = computed(() => {
  const path = route.path || ''
  return path === '/admin' || path.startsWith('/admin/')
})

const showBottomNav = computed(() => {
  const path = route.path || ''
  return (
    path !== '/login' &&
    !path.startsWith('/invite') &&
    !path.startsWith('/join') &&
    !path.startsWith('/admin') &&
    !path.includes('/display')
  )
})

onMounted(() => {
  setTimeout(() => {
    isSplashVisible.value = false
  }, 3000)
})
</script>
