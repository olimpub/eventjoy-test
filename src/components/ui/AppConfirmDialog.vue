<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="onModel"
    @hide="emit('hide')"
  >
    <q-card class="app-confirm">
      <div class="app-confirm__icon" :class="`is-${variant}`">
        <q-icon :name="resolvedIcon" size="22px" />
      </div>
      <h2 class="app-confirm__title">{{ title }}</h2>
      <p class="app-confirm__message">{{ message }}</p>
      <div class="app-confirm__actions">
        <button
          type="button"
          class="app-confirm__btn app-confirm__btn--ghost"
          :disabled="busy"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="app-confirm__btn"
          :class="variant === 'danger' ? 'app-confirm__btn--danger' : 'app-confirm__btn--primary'"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ okLabel }}
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    message: string;
    okLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'undo' | 'danger';
    icon?: string;
    busy?: boolean;
  }>(),
  {
    okLabel: 'Igen',
    cancelLabel: 'Mégsem',
    variant: 'default',
    icon: '',
    busy: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
  hide: [];
}>();

const resolvedIcon = computed(() => {
  if (props.icon) return props.icon;
  if (props.variant === 'danger') return 'sym_r_cancel';
  if (props.variant === 'undo') return 'sym_r_undo';
  return 'help';
});

function onModel(value: boolean) {
  emit('update:modelValue', value);
}

function onCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
</script>

<style scoped lang="scss">
.app-confirm {
  width: min(100%, 360px);
  margin: 16px;
  padding: 22px 20px 18px;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;
}

.app-confirm__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;

  &.is-undo {
    background: rgba(148, 163, 184, 0.14);
    color: #cbd5e1;
  }

  &.is-danger {
    background: rgba(244, 63, 94, 0.14);
    color: #fb7185;
  }
}

.app-confirm__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: #38bdf8;
}

.app-confirm__icon.is-undo + .app-confirm__title {
  color: #cbd5e1;
}

.app-confirm__icon.is-danger + .app-confirm__title {
  color: #fb7185;
}

.app-confirm__message {
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-align: center;
  color: #cbd5e1;
}

.app-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.app-confirm__btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}

.app-confirm__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.app-confirm__btn--primary {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
}

.app-confirm__btn--danger {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.35);
  color: #fb7185;
}
</style>
