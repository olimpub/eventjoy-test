<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    transition-show="scale"
    transition-hide="scale"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="draw-summary">
      <div class="draw-summary__icon">
        <q-icon name="sym_r_casino" size="22px" />
      </div>
      <h2 class="draw-summary__title">Sorsolás eredménye</h2>
      <p class="draw-summary__meta">
        <strong>{{ summary?.deskCount ?? 0 }}</strong> asztal
        · <strong>{{ summary?.roundCount ?? 0 }}</strong> forduló
        · <strong>{{ summary?.playerCount ?? 0 }}</strong> játékos
        <template v-if="summary?.reserveCount">
          · <strong>{{ summary.reserveCount }}</strong> tartalék
        </template>
      </p>

      <div class="draw-summary__block">
        <div class="draw-summary__block-title">Duplikációk</div>
        <div class="draw-summary__row">
          <span>Játékos:</span>
          <strong>{{ summary?.playerRepeats ?? 0 }}</strong>
        </div>
        <div class="draw-summary__row">
          <span>Csoport:</span>
          <strong>{{ summary?.groupHits ?? 0 }}</strong>
        </div>
        <div class="draw-summary__row">
          <span>Asztal:</span>
          <strong>{{ summary?.deskRepeats ?? 0 }}</strong>
        </div>
        <div class="draw-summary__row">
          <span>Szín:</span>
          <strong>{{ summary?.colorRepeats ?? 0 }}</strong>
        </div>
      </div>

      <div class="draw-summary__actions">
        <button
          type="button"
          class="draw-summary__btn draw-summary__btn--ghost"
          :disabled="busy"
          @click="$emit('redraw')"
        >
          Újrasorsolás
        </button>
        <button
          type="button"
          class="draw-summary__btn draw-summary__btn--primary"
          :disabled="busy"
          @click="$emit('finalize')"
        >
          {{ busy ? 'Mentés…' : 'Véglegesítés' }}
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import type { PtaDrawQuality } from 'src/modules/profitability/drawQuality';

defineProps<{
  modelValue: boolean;
  summary: PtaDrawQuality | null;
  busy?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
  redraw: [];
  finalize: [];
}>();
</script>

<style scoped>
.draw-summary {
  width: min(calc(100vw - 32px), 380px);
  max-width: calc(100vw - 32px);
  margin: 16px;
  padding: 22px 20px 18px;
  box-sizing: border-box;
  border-radius: 24px;
  background: rgba(12, 13, 14, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(246, 139, 41, 0.22);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;
}

.draw-summary__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: rgba(246, 139, 41, 0.16);
  color: #f68b29;
}

.draw-summary__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
  color: #f8fafc;
}

.draw-summary__meta {
  margin: 0 0 16px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: #94a3b8;
  line-height: 1.45;
}

.draw-summary__meta strong {
  color: #f8fafc;
  font-weight: 800;
}

.draw-summary__block {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.draw-summary__block-title {
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.draw-summary__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 14px;
  font-weight: 700;
  color: #cbd5e1;
}

.draw-summary__row strong {
  font-size: 16px;
  font-weight: 800;
  color: #f8fafc;
}

.draw-summary__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.draw-summary__btn {
  flex: 1 1 8rem;
  min-height: 44px;
  max-width: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.draw-summary__btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.draw-summary__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.draw-summary__btn--primary {
  background: rgba(246, 139, 41, 0.2);
  border-color: rgba(246, 139, 41, 0.4);
  color: #f68b29;
}
</style>
