<template>
  <nav class="ej-bottom-nav" aria-label="Fő navigáció">
    <router-link
      class="ej-bottom-nav__item"
      to="/"
      active-class=""
      exact-active-class="ej-bottom-nav__item--on"
    >
      <q-icon name="dashboard" size="22px" />
      <span>Főoldal</span>
    </router-link>
    <router-link
      class="ej-bottom-nav__item"
      to="/my-events"
      exact-active-class="ej-bottom-nav__item--on"
    >
      <q-icon name="emoji_events" size="22px" />
      <span>Eseményeim</span>
    </router-link>
    <router-link
      class="ej-bottom-nav__item"
      to="/klubhub"
      exact-active-class="ej-bottom-nav__item--on"
    >
      <img :src="klubhubIcon" alt="" class="ej-bottom-nav__klub" />
      <span>KlubHub</span>
    </router-link>
    <router-link
      class="ej-bottom-nav__item"
      to="/profile"
      :class="{ 'ej-bottom-nav__item--on': isProfileSection }"
    >
      <q-icon name="person" size="22px" />
      <span>Profil</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { KLUBHUB_BRAND } from 'src/assets/brand/klubhub'

const route = useRoute()
const klubhubIcon = KLUBHUB_BRAND.icon
const isProfileSection = computed(() => {
  const name = String(route.name || '')
  return name === 'profile' || name === 'support' || name === 'support_ticket' || name === 'whats-new' || name === 'help' || name === 'help-article'
})
</script>
