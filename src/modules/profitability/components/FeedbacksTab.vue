<template>
  <div class="pta-scope pta-glass rounded-[20px] p-5">
    <div class="flex items-center gap-2 mb-4">
      <q-icon name="reviews" size="18px" style="color: #f68b29;" />
      <span class="pta-display text-[13px] tracking-wider uppercase text-white">Visszajelzések</span>
      <q-badge rounded class="pta-number" style="background: rgba(246,139,41,0.2); color: #f68b29;">{{ feedbacks.length }}</q-badge>
      <q-space />
      <div class="flex items-center gap-1">
        <span class="pta-display text-lg text-white">{{ avgRating.toFixed(1) }}</span>
        <q-icon name="star" size="18px" style="color: #f2e74b;" />
      </div>
    </div>

    <div v-if="feedbacks.length === 0" class="text-center py-10">
      <q-icon name="chat_bubble_outline" size="56px" style="color: #94a3b8;" class="mb-3" />
      <div class="pta-body text-slate-400">Ehhez az eseményhez még nem érkezett visszajelzés.</div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div v-for="fb in feedbacks" :key="fb.id" class="pta-glass-light rounded-[16px] p-4">
        <div class="flex items-center gap-3 mb-2">
          <q-avatar size="36px" style="background: #f68b29; color: white;" class="pta-display text-xs">
            {{ fb.avatar }}
          </q-avatar>
          <div class="min-w-0 flex-1">
            <div class="pta-body text-white text-[13px] truncate">{{ fb.user }}</div>
            <div class="text-slate-500 text-[10px]">{{ fb.date }}</div>
          </div>
          <div class="flex items-center gap-0.5 shrink-0">
            <q-icon
              v-for="star in 5"
              :key="star"
              name="star"
              size="14px"
              :style="star <= fb.rating ? 'color: #f2e74b;' : 'color: rgba(255,255,255,0.15);'"
            />
          </div>
        </div>
        <p class="pta-body text-slate-300 text-[13px] leading-relaxed">{{ fb.comment }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Feedback } from '../types';

const props = defineProps<{
  feedbacks: Feedback[];
}>();

const avgRating = computed(() => {
  if (props.feedbacks.length === 0) return 0;
  return props.feedbacks.reduce((sum, f) => sum + f.rating, 0) / props.feedbacks.length;
});
</script>
