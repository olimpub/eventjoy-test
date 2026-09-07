<template>
  <SplashScreen :show="isSplashVisible" />
  <div v-if="!isSplashVisible" class="ej-app">
    <div class="ej-app__main">
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
  return path !== '/login' && !path.startsWith('/invite')
})

onMounted(() => {
  setTimeout(() => {
    isSplashVisible.value = false
  }, 3000)
})
</script>
