<template>
  <div class="wizard-step wizard-step--center">
    <div v-if="selectionChip" class="wizard-step__chip-row">
      <span class="wizard-chip">
        <img
          v-if="chipResolved.kind === 'img'"
          :src="chipResolved.value"
          alt=""
          style="width: 16px; height: 16px; object-fit: contain;"
        />
        <q-icon v-else :name="chipResolved.value" size="16px" />
        {{ selectionChip }}
      </span>
    </div>

    <div class="wizard-placeholder">
      <div class="wizard-placeholder__icon">
        <q-icon :name="icon || 'sym_r_event'" size="40px" />
      </div>
      <h3 class="wizard-placeholder__title">{{ title }}</h3>
      <p class="wizard-placeholder__text">{{ description }}</p>
    </div>

    <div class="wizard-placeholder__nav">
      <button type="button" class="wizard-btn wizard-btn--ghost" @click="$emit('back')">
        Vissza
      </button>
      <button type="button" class="wizard-btn wizard-btn--primary" @click="$emit('next')">
        Tovább
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { resolveTypeIcon } from '../groupIcons';

const props = defineProps<{
  title: string;
  description: string;
  icon?: string;
  selectionChip?: string;
  typeIcon?: string;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'next'): void;
}>();

const chipResolved = computed(() => resolveTypeIcon(props.typeIcon));
</script>
