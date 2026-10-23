<template>
  <div v-if="info" class="op-rs" :class="{ 'is-card': card }">
    <button type="button" class="op-rs__chip" :aria-expanded="open" @click.stop="open = !open">
      <q-icon name="sym_r_calculate" size="16px" />
      <b>{{ typeName }}</b>
      <span>Pontozás</span>
      <q-icon :name="open ? 'sym_r_expand_less' : 'sym_r_expand_more'" size="18px" />
    </button>
    <div v-if="open" class="op-rs__body" @click.stop>
      <p class="op-rs__sum">{{ info.summary }}</p>
      <dl>
        <template v-for="row in info.rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.text }}</dd>
        </template>
      </dl>
      <p v-if="info.note" class="op-rs__note">{{ info.note }}</p>
      <small class="op-rs__code">RoundTypeCode: {{ code }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { normalizeRoundTypeCode, roundScoringInfo, roundTypeTitle } from '../constants';

const props = withDefaults(
  defineProps<{
    code?: string;
    /** Nyitott állapotból indul, kártyaként jelenik meg. */
    card?: boolean;
  }>(),
  { code: '', card: false }
);

const open = ref(props.card);
const info = computed(() => roundScoringInfo(props.code));
const typeName = computed(() => roundTypeTitle(normalizeRoundTypeCode(props.code)));
</script>

<style scoped>
.op-rs {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-width: 100%;
  text-align: left;
}

.op-rs__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(245, 185, 66, 0.35);
  border-radius: 999px;
  background: rgba(245, 185, 66, 0.12);
  color: #f5b942;
  font-size: 12px;
  cursor: pointer;
}

.op-rs__chip b {
  font-weight: 800;
}

.op-rs__chip span {
  color: #fde7b0;
}

.op-rs__body {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 248, 242, 0.08);
  color: #fff8f2;
  font-size: 13px;
  line-height: 1.4;
}

.op-rs__sum {
  margin: 0 0 8px;
  font-weight: 800;
}

.op-rs__body dl {
  display: grid;
  grid-template-columns: minmax(96px, auto) 1fr;
  gap: 4px 12px;
  margin: 0;
}

.op-rs__body dt {
  color: #94a3b8;
}

.op-rs__body dd {
  margin: 0;
}

.op-rs__note {
  margin: 10px 0 0;
  color: #f5b942;
}

.op-rs__code {
  display: block;
  margin-top: 8px;
  color: #64748b;
}
</style>
