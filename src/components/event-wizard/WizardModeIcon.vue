<template>
  <span
    class="wizard-chip wizard-chip--mode"
    :class="mode === 'edit' ? 'is-edit' : 'is-create'"
    :title="mode === 'edit' ? 'Meglévő esemény szerkesztése' : 'Új esemény felvitele'"
  >
    <q-icon :name="mode === 'edit' ? 'sym_r_edit_square' : 'sym_r_add_box'" size="18px" />
  </span>
</template>

<script setup lang="ts">
import type { WizardMode } from '../types';

withDefaults(
  defineProps<{
    mode?: WizardMode;
  }>(),
  { mode: 'create' }
);
</script>
