<template>
  <div
    class="op-play"
    :class="[`is-${phase}`, { 'is-hot': shownRatio < 0.22, 'is-intro': !!intro }]"
    :style="{ '--c': frameColor, '--p': shownRatio }"
  >
    <div class="op-play__mesh" aria-hidden="true" />
    <div
      v-if="!intro"
      class="op-play__frame"
      :style="{ '--p': shownRatio, '--c': frameColor }"
      aria-hidden="true"
    />

    <header v-if="!intro && !verdict && phase !== 'wait'" class="op-play__top">
      <button
        type="button"
        class="op-play__send"
        :class="{ 'is-ready': canSend && !locked, 'is-done': locked }"
        :disabled="locked || !canSend"
        @click="send"
      >
        {{ locked ? 'Bent van' : 'Küldés' }}
      </button>
      <div class="op-play__meta">
        <span class="op-play__kind">{{ typeLabel }}</span>
      </div>
    </header>

    <section v-if="phase === 'wait'" class="op-play__wait">
      <p>Várj a kvízmesterre</p>
      <small>A kérdés akkor jön, amikor elindítja.</small>
    </section>

    <section v-else-if="intro === 'read'" class="op-play__hero">
      <p class="op-play__prompt is-hero">{{ question?.prompt }}</p>
    </section>

    <section
      v-else-if="verdict"
      class="op-play__result"
      :class="verdict === 'ok' ? 'is-ok' : 'is-bad'"
    >
      <div class="op-play__burst" aria-hidden="true">
        <i v-for="n in 14" :key="n" :style="{ '--i': n }" />
      </div>
      <div class="op-play__stamp">
        <q-icon :name="verdict === 'ok' ? 'sym_r_check_circle' : 'sym_r_cancel'" size="84px" />
      </div>
      <p>{{ verdict === 'ok' ? 'Helyes!' : 'Rossz válasz' }}</p>
      <small>{{ verdict === 'ok' ? 'Szép volt — várj a következőre.' : 'Most nem jött össze.' }}</small>
      <div v-if="showReacts" class="op-play__reacts">
        <button
          v-for="row in reacts"
          :key="row.id"
          type="button"
          class="op-play__react"
          :class="{ 'is-on': reaction === row.id, 'is-dim': reaction && reaction !== row.id }"
          :disabled="!!reaction"
          :aria-label="row.label"
          @click="pickReact(row.id)"
        >
          {{ row.glyph }}
        </button>
      </div>
    </section>

    <template v-else>
      <div class="op-play__stage">
        <div class="op-play__answers">
          <p class="op-play__prompt">{{ question?.prompt }}</p>
          <div v-if="type === 'freetext'" class="op-play__free">
            <input
              ref="freeInput"
              v-model="freeText"
              type="text"
              inputmode="text"
              autocomplete="off"
              enterkeyhint="send"
              placeholder="Írd ide…"
              :disabled="locked"
              @keydown.enter.prevent="send"
            />
          </div>
          <div v-else-if="type === 'match'" class="op-play__match">
            <div class="op-play__col">
              <button
                v-for="row in options"
                :key="`l-${row.i}`"
                type="button"
                class="op-play__opt"
                :class="[`c-${row.i % 4}`, { 'is-on': pickLeft === row.i, 'is-pair': matchBind[row.i] != null }]"
                :disabled="locked"
                @click="tapLeft(row.i)"
              >
                {{ row.text }}
              </button>
            </div>
            <div class="op-play__col">
              <button
                v-for="(right, i) in rights"
                :key="`r-${i}`"
                type="button"
                class="op-play__opt"
                :class="rightClass(i)"
                :disabled="locked"
                @click="tapRight(i)"
              >
                {{ right }}
              </button>
            </div>
          </div>
          <div v-else-if="type === 'category'" class="op-play__cats">
            <div class="op-play__catrow">
              <button
                v-for="(cat, n) in cats"
                :key="`cat-${cat}-${n}`"
                type="button"
                class="op-play__cat"
                :class="[`k-${n % 2}`, { 'is-on': pickCat === cat }]"
                :disabled="locked"
                @click="tapCat(cat)"
              >
                {{ cat }}
              </button>
            </div>
            <div class="op-play__split" aria-hidden="true" />
            <div class="op-play__catlist">
              <button
                v-for="(row, n) in catItems"
                :key="`it-${row.i}`"
                type="button"
                class="op-play__opt"
                :class="[`c-${n % 6}`, { 'is-on': !!itemCat[row.i] }]"
                :disabled="locked"
                @click="tapCatItem(row.i)"
              >
                <span class="op-play__opt-text">{{ row.text }}</span>
                <span v-if="itemCat[row.i]" class="op-play__opt-chip">{{ itemCat[row.i] }}</span>
              </button>
            </div>
          </div>
          <div v-else-if="type === 'order'" class="op-play__order">
            <button
              v-for="row in orderRows"
              :key="`ord-${row.i}`"
              type="button"
              class="op-play__opt"
              :class="[`c-${orderColor(row.i)}`, { 'is-on': isPicked(row.i) }]"
              :disabled="locked"
              @click="tapOption(row.i)"
            >
              <span class="op-play__opt-text">{{ row.text }}</span>
              <span v-if="orderOf(row.i)" class="op-play__opt-chip is-num">{{ orderOf(row.i) }}</span>
            </button>
          </div>
          <div v-else class="op-play__grid" :class="{ 'is-wide': options.length > 4 }">
            <button
              v-for="(row, n) in options"
              :key="`o-${row.i}`"
              type="button"
              class="op-play__opt"
              :class="[`c-${n % 4}`, { 'is-on': isPicked(row.i) }]"
              :disabled="locked"
              @click="tapOption(row.i)"
            >
              {{ row.text }}
            </button>
          </div>
        </div>

        <div class="op-play__media" :class="{ 'is-logo': !hasQuestionMedia }">
          <img :src="mediaSrc" alt="" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import { normalizeOpTypeCode, opTypeLabel } from '../constants';
import { matchOpFreetext } from '../freetextMatch';
import type { OpQuestionPreviewModel } from '../opData';
import olimpubWordmark from 'src/assets/brand/modules/olimpub/olimpub_logo_full_knockout.png';

const props = withDefaults(
  defineProps<{
    question: OpQuestionPreviewModel | null;
    mediaUrl?: string | null;
    remainingRatio?: number;
    remainingSec?: number;
    phase?: 'wait' | 'play';
    demo?: boolean;
  }>(),
  {
    mediaUrl: null,
    remainingRatio: 1,
    remainingSec: 0,
    phase: 'play',
    demo: false,
  }
);

const emit = defineEmits<{
  submitted: [payload: Record<string, unknown>];
  ready: [];
  reacted: [id: string];
}>();

const reacts = [
  { id: 'heart', glyph: '❤️', label: 'Szív' },
  { id: 'laugh', glyph: '😂', label: 'Röhög' },
  { id: 'fire', glyph: '🔥', label: 'Tűz' },
  { id: 'sad', glyph: '😢', label: 'Szomorú' },
  { id: 'poop', glyph: '💩', label: 'Kaki' },
] as const;

const intro = ref<'read' | null>(null);
const verdict = ref<'ok' | 'bad' | null>(null);
const reaction = ref<string | null>(null);
const reactArmed = ref(false);
let introTimer: number | null = null;
const locked = ref(false);
const pickLeft = ref<number | null>(null);
const pickCat = ref('');
const freeText = ref('');
const freeInput = ref<HTMLInputElement | null>(null);
const picked = ref<number[]>([]);
const itemCat = reactive<Record<number, string>>({});
const matchBind = reactive<Record<number, number>>({});

const type = computed(
  () => normalizeOpTypeCode(String(props.question?.type || '')) || String(props.question?.type || 'single')
);
const typeLabel = computed(() => opTypeLabel(type.value));
const hasQuestionMedia = computed(() => Boolean(props.mediaUrl));
const mediaSrc = computed(() => props.mediaUrl || olimpubWordmark);
const remainingRatio = computed(() => Math.max(0, Math.min(1, props.remainingRatio)));
const leftSec = computed(() =>
  props.remainingSec != null
    ? props.remainingSec
    : remainingRatio.value * (props.question?.timeSec || 0)
);
const showReacts = computed(() => Boolean(verdict.value) && reactArmed.value);
const shownRatio = computed(() => (intro.value ? 1 : remainingRatio.value));
const frameColor = computed(() => {
  if (shownRatio.value > 0.45) return '#f5b942';
  if (shownRatio.value > 0.22) return '#ff8a2d';
  return '#ff2d6a';
});

function readHoldMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3000, Math.ceil(words / 2.5) * 1000);
}

function stopIntro() {
  if (introTimer != null) {
    window.clearTimeout(introTimer);
    introTimer = null;
  }
}

function focusFreeInput() {
  if (type.value !== 'freetext' || locked.value || props.phase === 'wait' || intro.value || verdict.value) return;
  void nextTick(() => {
    const el = freeInput.value;
    if (!el || el.disabled) return;
    el.focus({ preventScroll: true });
  });
}

function finishIntro() {
  stopIntro();
  intro.value = null;
  emit('ready');
  focusFreeInput();
}

function startIntro() {
  stopIntro();
  if (props.phase === 'wait' || !props.question?.prompt) {
    intro.value = null;
    return;
  }
  intro.value = 'read';
  introTimer = window.setTimeout(finishIntro, readHoldMs(props.question?.prompt || ''));
}

const options = computed(() =>
  (props.question?.answers || [])
    .map((item, i) => ({
      i,
      text: String(item || '').trim(),
      match: String(props.question?.matches?.[i] || '').trim(),
    }))
    .filter((row) => row.text)
);

const rights = computed(() => {
  const fromMatch = options.value.map((row) => row.match).filter(Boolean);
  if (fromMatch.length) return fromMatch;
  return options.value.map((row) => row.text);
});

const cats = computed(() => {
  const listed = (props.question?.categories || []).map((item) => String(item || '').trim()).filter(Boolean);
  if (listed.length) return [...new Set(listed)].slice(0, 2);
  const named = options.value.map((row) => row.match).filter(Boolean);
  return [...new Set(named)].slice(0, 2);
});

const catItems = computed(() => options.value.slice(0, 6));
const orderItems = computed(() => options.value.slice(0, 5));
const orderRows = computed(() => {
  const list = orderItems.value;
  const chosen = new Set(picked.value);
  const top = picked.value
    .map((index) => list.find((row) => row.i === index))
    .filter((row): row is (typeof list)[number] => Boolean(row));
  return [...top, ...list.filter((row) => !chosen.has(row.i))];
});

const canSend = computed(() => {
  if (type.value === 'freetext') return Boolean(freeText.value.trim());
  if (type.value === 'category') {
    return options.value.length > 0 && options.value.every((row) => itemCat[row.i]);
  }
  if (type.value === 'match') {
    return options.value.length > 0 && options.value.every((row) => matchBind[row.i] != null);
  }
  if (type.value === 'order') {
    return orderItems.value.length > 0 && picked.value.length === orderItems.value.length;
  }
  return picked.value.length > 0;
});

function judgeLocal() {
  const flags = props.question?.isCorrect || [];
  if (type.value === 'single') return Boolean(flags[picked.value[0]]);
  if (type.value === 'multi') {
    const want = flags.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    const got = [...picked.value].sort((a, b) => a - b);
    return want.length > 0 && want.length === got.length && want.every((i, n) => i === got[n]);
  }
  if (type.value === 'order') {
    return picked.value.length > 0 && picked.value.every((index, n) => index === n);
  }
  if (type.value === 'freetext') {
    return matchOpFreetext(freeText.value, props.question?.synonyms || []);
  }
  if (type.value === 'category') {
    return options.value.length > 0 && options.value.every((row) => itemCat[row.i] && itemCat[row.i] === row.match);
  }
  if (type.value === 'match') {
    return (
      options.value.length > 0 &&
      options.value.every((row) => {
        const right = matchBind[row.i];
        return right != null && rights.value[right] === row.match;
      })
    );
  }
  return false;
}

function send() {
  if (locked.value || !canSend.value) return;
  locked.value = true;
  verdict.value = judgeLocal() ? 'ok' : 'bad';
  reactArmed.value = leftSec.value >= 3;
  emit('submitted', {
    TypeCode: type.value,
    Indexes: picked.value.slice(),
    Text: freeText.value.trim(),
    Buckets: { ...itemCat },
    Correct: verdict.value === 'ok',
  });
}

function pickReact(id: string) {
  if (reaction.value) return;
  reaction.value = id;
  emit('reacted', id);
}

function isPicked(index: number) {
  return picked.value.includes(index);
}

function orderOf(index: number) {
  const at = picked.value.indexOf(index);
  return at >= 0 ? String(at + 1) : '';
}

function orderColor(index: number) {
  const at = orderItems.value.findIndex((row) => row.i === index);
  return (at >= 0 ? at : index) % 5;
}

function tapOption(index: number) {
  if (type.value === 'single') {
    picked.value = [index];
    return;
  }
  if (type.value === 'multi') {
    picked.value = picked.value.includes(index)
      ? picked.value.filter((item) => item !== index)
      : [...picked.value, index];
    return;
  }
  if (type.value === 'order') {
    picked.value = picked.value.includes(index)
      ? picked.value.filter((item) => item !== index)
      : [...picked.value, index];
  }
}

function leftOfRight(rightIndex: number) {
  const found = Object.entries(matchBind).find(([, right]) => right === rightIndex);
  return found ? Number(found[0]) : null;
}

function rightClass(rightIndex: number) {
  const left = leftOfRight(rightIndex);
  if (left == null) return ['c-ghost'];
  return [`c-${left % 4}`, 'is-pair'];
}

function unpairLeft(leftIndex: number) {
  delete matchBind[leftIndex];
  if (pickLeft.value === leftIndex) pickLeft.value = null;
}

function tapLeft(index: number) {
  if (locked.value) return;
  if (matchBind[index] != null) {
    unpairLeft(index);
    return;
  }
  pickLeft.value = pickLeft.value === index ? null : index;
}

function tapRight(rightIndex: number) {
  if (locked.value) return;
  const owner = leftOfRight(rightIndex);
  if (owner != null) {
    unpairLeft(owner);
    return;
  }
  if (pickLeft.value == null) return;
  matchBind[pickLeft.value] = rightIndex;
  pickLeft.value = null;
}

function tapCat(cat: string) {
  if (locked.value) return;
  pickCat.value = pickCat.value === cat ? '' : cat;
}

function tapCatItem(index: number) {
  if (locked.value) return;
  if (itemCat[index]) {
    delete itemCat[index];
    return;
  }
  if (!pickCat.value) return;
  itemCat[index] = pickCat.value;
}

watch(
  () => [props.phase, props.question?.prompt] as const,
  () => {
    locked.value = false;
    verdict.value = null;
    reaction.value = null;
    reactArmed.value = false;
    picked.value = [];
    pickLeft.value = null;
    pickCat.value = cats.value[0] || '';
    freeText.value = '';
    Object.keys(itemCat).forEach((key) => delete itemCat[Number(key)]);
    Object.keys(matchBind).forEach((key) => delete matchBind[Number(key)]);
    startIntro();
    if (!intro.value) focusFreeInput();
  },
  { immediate: true }
);

onUnmounted(stopIntro);
</script>

<style scoped>
.op-play {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-height: 560px;
  height: 100%;
  overflow: hidden;
  border-radius: 24px;
  background: #07030f;
  color: #fff8f2;
}

.op-play__mesh {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% -10%, rgba(255, 45, 106, 0.35), transparent 55%),
    radial-gradient(ellipse 70% 40% at 100% 10%, rgba(45, 226, 255, 0.22), transparent 50%),
    radial-gradient(ellipse 60% 40% at 50% 110%, rgba(245, 185, 66, 0.18), transparent 50%);
}

.op-play.is-hot .op-play__mesh {
  background:
    radial-gradient(ellipse 90% 55% at 50% -10%, rgba(255, 45, 106, 0.5), transparent 58%),
    radial-gradient(ellipse 70% 40% at 100% 20%, rgba(255, 138, 45, 0.25), transparent 50%);
}

.op-play__frame {
  position: absolute;
  inset: 5px;
  z-index: 5;
  pointer-events: none;
  border-radius: 20px;
  padding: 5px;
  background: conic-gradient(from -90deg, var(--c) calc(var(--p) * 100%), transparent 0);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  filter: drop-shadow(0 0 10px var(--c));
}

.op-play__top,
.op-play__stage,
.op-play__wait,
.op-play__hero,
.op-play__result {
  position: relative;
  z-index: 8;
}

.op-play__hero {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 28px 32px 48px;
}

.op-play__prompt.is-hero {
  margin: 0;
  max-width: min(34rem, 92vw);
  font-size: clamp(28px, 6.4vw, 46px);
  line-height: 1.2;
  text-wrap: balance;
  animation: op-hero-in 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes op-hero-in {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.9);
    filter: blur(10px);
  }
  55% {
    filter: blur(0);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

.op-play__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 0;
}

.op-play__send {
  min-width: 168px;
  min-height: 68px;
  padding: 0 22px;
  border: 0;
  border-radius: 20px;
  background: rgba(255, 248, 242, 0.12);
  color: rgba(255, 248, 242, 0.35);
  font-size: 22px;
  font-weight: 900;
}

.op-play__send.is-ghost {
  visibility: hidden;
}

.op-play__send.is-ready {
  background: #f5b942;
  color: #1a1408;
  animation: op-send-pulse 1s ease-in-out infinite;
}

.op-play__send.is-done {
  background: #b8ff3c;
  color: #101018;
  animation: none;
}

.op-play__send:disabled:not(.is-ready):not(.is-done) {
  cursor: default;
}

@keyframes op-send-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.55);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 10px rgba(245, 185, 66, 0);
  }
}

.op-play__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: right;
}

.op-play__kind {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 248, 242, 0.65);
}

.op-play__wait {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}

.op-play__wait p {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.op-play__wait small {
  margin-top: 8px;
  color: rgba(255, 248, 242, 0.6);
}

.op-play__stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 14px 16px;
}

.op-play__answers {
  flex: 0 1 auto;
}

.op-play__prompt {
  margin: 0 0 14px;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.op-play__media {
  flex: 1 1 0;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 248, 242, 0.16);
  box-shadow: inset 0 0 0 1px rgba(245, 185, 66, 0.12);
}

.op-play__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.op-play__media.is-logo {
  background: transparent;
  border-color: rgba(245, 185, 66, 0.18);
  box-shadow: none;
}

.op-play__media.is-logo img {
  width: auto;
  height: auto;
  max-width: 88%;
  max-height: 70%;
}

.op-play__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.op-play__grid.is-wide {
  grid-template-columns: 1fr 1fr;
}

.op-play__match {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.op-play__col,
.op-play__cats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.op-play__catrow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.op-play__cat {
  width: 100%;
  min-height: 56px;
  border: 0;
  border-radius: 16px;
  padding: 10px 14px;
  font-size: 16px;
  font-weight: 800;
  color: #fff8f2;
}

.op-play__cat.k-0 { background: #2a2140; }
.op-play__cat.k-1 { background: #16302c; }

.op-play__cat.is-on {
  outline: 4px solid #fff8f2;
  animation: op-opt-pick 0.38s cubic-bezier(0.18, 1.35, 0.32, 1);
}

.op-play__split {
  height: 1px;
  margin: 4px 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(245, 185, 66, 0.55),
    rgba(255, 248, 242, 0.35),
    rgba(245, 185, 66, 0.55),
    transparent
  );
}

.op-play__catlist,
.op-play__order {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.op-play__opt,
.op-play__free input {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 84px;
  border: 0;
  border-radius: 18px;
  padding: 16px 18px;
  font-size: 18px;
  font-weight: 800;
  color: #101018;
  text-align: left;
  cursor: pointer;
}

.op-play__opt-text {
  min-width: 0;
  flex: 1;
}

.op-play__opt-chip {
  flex-shrink: 0;
  margin-left: auto;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(16, 16, 24, 0.62);
  color: #fff8f2;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.1;
}

.op-play__opt-chip.is-num {
  min-width: 36px;
  padding: 8px 12px;
  font-size: 20px;
  text-align: center;
}

.op-play__opt.c-0 { background: #ff9ad6; }
.op-play__opt.c-1 { background: #b8ff3c; }
.op-play__opt.c-2 { background: #2de2ff; }
.op-play__opt.c-3 { background: #ff8a2d; }
.op-play__opt.c-4 { background: #ffe566; }
.op-play__opt.c-5 { background: #c9b6ff; }
.op-play__opt.c-ghost { background: rgba(255, 255, 255, 0.14); color: #fff8f2; }

.op-play__grid:has(.is-on) .op-play__opt:not(.is-on),
.op-play__cats:has(.is-on) .op-play__opt:not(.is-on) {
  opacity: 0.7;
}

.op-play__opt.is-pair {
  outline: 3px solid rgba(255, 248, 242, 0.55);
}

.op-play__opt.is-on {
  outline: 6px solid #fff8f2;
  outline-offset: 0;
  box-shadow: 0 0 0 3px rgba(7, 3, 15, 0.55), 0 0 22px rgba(255, 248, 242, 0.45);
  animation: op-opt-pick 0.38s cubic-bezier(0.18, 1.35, 0.32, 1);
  z-index: 1;
}

@keyframes op-opt-pick {
  0% {
    transform: scale(0.94);
  }
  55% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.op-play__n {
  display: inline-flex;
  width: 22px;
  margin-right: 6px;
}

.op-play__free input {
  width: 100%;
  background: #fff8f2;
}

.op-play__result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 28px;
  overflow: hidden;
}

.op-play__result p {
  margin: 12px 0 0;
  font-size: clamp(36px, 8vw, 56px);
  font-weight: 900;
  line-height: 1;
}

.op-play__result small {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 800;
  color: rgba(255, 248, 242, 0.7);
}

.op-play__reacts {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 28px;
  z-index: 2;
}

.op-play__react {
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 18px;
  background: rgba(255, 248, 242, 0.1);
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  animation: op-react-in 0.42s cubic-bezier(0.18, 1.4, 0.32, 1) both;
}

.op-play__react:nth-child(1) { animation-delay: 0.02s; }
.op-play__react:nth-child(2) { animation-delay: 0.07s; }
.op-play__react:nth-child(3) { animation-delay: 0.12s; }
.op-play__react:nth-child(4) { animation-delay: 0.17s; }
.op-play__react:nth-child(5) { animation-delay: 0.22s; }

.op-play__react.is-on {
  background: #f5b942;
  transform: scale(1.14);
  box-shadow: 0 0 0 4px rgba(245, 185, 66, 0.35);
}

.op-play__react.is-dim {
  opacity: 0.28;
  transform: scale(0.92);
}

.op-play__react:disabled {
  cursor: default;
}

@keyframes op-react-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.7);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.op-play__result.is-ok p {
  color: #b8ff3c;
}

.op-play__result.is-bad p {
  color: #ff2d6a;
}

.op-play__stamp {
  animation: op-stamp-in 0.55s cubic-bezier(0.18, 1.4, 0.32, 1) both;
}

.op-play__result.is-ok .op-play__stamp {
  color: #b8ff3c;
  filter: drop-shadow(0 0 22px rgba(184, 255, 60, 0.65));
}

.op-play__result.is-bad .op-play__stamp {
  color: #ff2d6a;
  filter: drop-shadow(0 0 22px rgba(255, 45, 106, 0.65));
  animation: op-stamp-in 0.45s cubic-bezier(0.18, 1.4, 0.32, 1) both, op-bad-shake 0.45s 0.2s ease-in-out;
}

.op-play__result.is-ok p {
  animation: op-hero-in 0.55s 0.08s both;
}

.op-play__result.is-bad p {
  animation: op-bad-shake 0.5s 0.12s both;
}

.op-play__burst {
  position: absolute;
  inset: 18%;
  pointer-events: none;
}

.op-play__burst i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f5b942;
  opacity: 0;
}

.op-play__result.is-ok .op-play__burst i {
  animation: op-burst 0.9s calc(var(--i) * 28ms) ease-out both;
}

.op-play__result.is-ok .op-play__burst i:nth-child(3n) { background: #b8ff3c; }
.op-play__result.is-ok .op-play__burst i:nth-child(3n + 1) { background: #2de2ff; }
.op-play__result.is-ok .op-play__burst i:nth-child(3n + 2) { background: #ff8a2d; }

.op-play__result.is-bad .op-play__burst i {
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: #ff2d6a;
  animation: op-burst 0.7s calc(var(--i) * 22ms) ease-out both;
}

@keyframes op-stamp-in {
  from {
    opacity: 0;
    transform: scale(0.3) rotate(-12deg);
  }
  60% {
    transform: scale(1.12) rotate(4deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes op-bad-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-10px);
  }
  40% {
    transform: translateX(10px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
}

.op-play__burst i:nth-child(1) { --x: 0px; --y: -130px; }
.op-play__burst i:nth-child(2) { --x: 70px; --y: -110px; }
.op-play__burst i:nth-child(3) { --x: 120px; --y: -50px; }
.op-play__burst i:nth-child(4) { --x: 130px; --y: 20px; }
.op-play__burst i:nth-child(5) { --x: 100px; --y: 90px; }
.op-play__burst i:nth-child(6) { --x: 40px; --y: 125px; }
.op-play__burst i:nth-child(7) { --x: -40px; --y: 125px; }
.op-play__burst i:nth-child(8) { --x: -100px; --y: 90px; }
.op-play__burst i:nth-child(9) { --x: -130px; --y: 20px; }
.op-play__burst i:nth-child(10) { --x: -120px; --y: -50px; }
.op-play__burst i:nth-child(11) { --x: -70px; --y: -110px; }
.op-play__burst i:nth-child(12) { --x: 20px; --y: -80px; }
.op-play__burst i:nth-child(13) { --x: 90px; --y: 40px; }
.op-play__burst i:nth-child(14) { --x: -90px; --y: 40px; }

@keyframes op-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.4);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.15);
  }
}

</style>
