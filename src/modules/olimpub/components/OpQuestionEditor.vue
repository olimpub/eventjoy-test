<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="op-edit">
      <div class="op-edit__handle" aria-hidden="true" />
      <div class="op-edit__top">
        <button type="button" class="op-edit__type" :disabled="!canEdit">
          <q-icon :name="typeIcon" size="20px" />
          {{ typeLabel }}
          <q-icon name="expand_more" size="16px" />
          <q-menu class="op-edit-menu" dark anchor="bottom left" self="top left">
            <button
              v-for="row in typeOptions"
              :key="row.code"
              type="button"
              class="op-edit-menu__item"
              :class="{ 'is-on': draft.type === row.code }"
              @click="setType(row.code)"
            >
              <q-icon :name="typeIconOf(row.code)" size="18px" />
              {{ row.label }}
            </button>
          </q-menu>
        </button>
        <div class="op-edit__tools">
          <button type="button" class="op-edit__view" aria-label="Média" @click="openMedia">
            <q-icon name="sym_r_perm_media" size="18px" />
            <q-tooltip>Média</q-tooltip>
          </button>
          <button type="button" class="op-edit__view" aria-label="Kvízmester nézet" @click="openPreview('quizmaster')">
            <q-icon name="sym_r_sports_esports" size="18px" />
            <q-tooltip>Kvízmester nézet</q-tooltip>
          </button>
          <button type="button" class="op-edit__view" aria-label="Játékos nézet" @click="openPreview('player')">
            <q-icon name="sym_r_smartphone" size="18px" />
            <q-tooltip>Játékos nézet</q-tooltip>
          </button>
          <span v-if="question" class="op-edit__ord">{{ question.SortIndex }}. kérdés</span>
        </div>
      </div>

      <fieldset class="op-edit__fields" :disabled="!canEdit">
      <label class="op-edit__label">Kérdés</label>
      <textarea v-model="draft.prompt" class="op-edit__area" rows="3" />

      <label class="op-edit__label">Idő (mp)</label>
      <input v-model.number="draft.timeSec" type="number" min="5" max="180" class="op-edit__input" />

      <!-- single / multi -->
      <template v-if="draft.type === 'single' || draft.type === 'multi'">
        <label class="op-edit__label">Opciók — jelöld a helyeset</label>
        <div v-for="(_, i) in draft.answers" :key="`opt-${i}`" class="op-edit__opt">
          <button
            type="button"
            class="op-edit__flag"
            :class="{ 'is-on': draft.isCorrect[i] }"
            @click="toggleCorrect(i)"
          >
            <q-icon
              :name="draft.type === 'single' ? 'sym_r_radio_button_checked' : 'sym_r_check_box'"
              size="18px"
            />
          </button>
          <input v-model="draft.answers[i]" class="op-edit__input" :placeholder="`${i + 1}. opció`" />
        </div>
        <button v-if="draft.answers.length < 8" type="button" class="op-edit__add" @click="addAnswer">
          + opció
        </button>
      </template>

      <!-- order -->
      <template v-else-if="draft.type === 'order'">
        <label class="op-edit__label">Elemek a helyes sorrendben</label>
        <div v-for="(_, i) in draft.answers" :key="`ord-${i}`" class="op-edit__opt">
          <span class="op-edit__n">{{ i + 1 }}</span>
          <input v-model="draft.answers[i]" class="op-edit__input" :placeholder="`${i + 1}. elem`" />
          <button type="button" class="op-edit__move" :disabled="i === 0" @click="moveAnswer(i, -1)">↑</button>
          <button
            type="button"
            class="op-edit__move"
            :disabled="i === draft.answers.length - 1"
            @click="moveAnswer(i, 1)"
          >
            ↓
          </button>
        </div>
        <button v-if="draft.answers.length < 8" type="button" class="op-edit__add" @click="addAnswer">
          + elem
        </button>
      </template>

      <!-- match -->
      <template v-else-if="draft.type === 'match'">
        <label class="op-edit__label">Párok (bal = jobb)</label>
        <div v-for="(_, i) in pairCount" :key="`pair-${i}`" class="op-edit__pair">
          <input v-model="draft.answers[i]" class="op-edit__input" :placeholder="`Bal ${i + 1}`" />
          <span class="op-edit__eq">=</span>
          <input v-model="draft.matches[i]" class="op-edit__input" :placeholder="`Jobb ${i + 1}`" />
        </div>
        <button v-if="pairCount < 8" type="button" class="op-edit__add" @click="addPair">+ pár</button>
      </template>

      <!-- category -->
      <template v-else-if="draft.type === 'category'">
        <label class="op-edit__label">Kategóriák</label>
        <div v-for="(_, i) in draft.matches" :key="`cat-${i}`" class="op-edit__opt">
          <span class="op-edit__n">{{ i + 1 }}</span>
          <input v-model="draft.matches[i]" class="op-edit__input" :placeholder="`Kategória ${i + 1}`" />
        </div>
        <button v-if="draft.matches.length < 8" type="button" class="op-edit__add" @click="addMatch">
          + kategória
        </button>
        <label class="op-edit__label">Darabok</label>
        <div v-for="(_, i) in draft.answers" :key="`item-${i}`" class="op-edit__opt">
          <input v-model="draft.answers[i]" class="op-edit__input" :placeholder="`Darab ${i + 1}`" />
          <select v-model="draft.itemCats[i]" class="op-edit__select">
            <option value="">Kategória…</option>
            <option v-for="cat in filledCats" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <button v-if="draft.answers.length < 8" type="button" class="op-edit__add" @click="addAnswer">
          + darab
        </button>
      </template>

      <!-- freetext -->
      <template v-else>
        <label class="op-edit__label">Elfogadott válaszok</label>
        <div v-for="(_, i) in draft.synonyms" :key="`syn-${i}`" class="op-edit__opt">
          <span class="op-edit__n">{{ i + 1 }}</span>
          <input v-model="draft.synonyms[i]" class="op-edit__input" :placeholder="`szinonima ${i + 1}`" />
        </div>
        <button v-if="draft.synonyms.length < 8" type="button" class="op-edit__add" @click="addSynonym">
          + szinonima
        </button>
      </template>
      </fieldset>

      <p v-if="!canEdit" class="op-edit__note">
        Ez a kérdés már nem szerkeszthető ({{ statusLabel }}). Csak pending kérdés menthető.
      </p>
      <p v-else-if="saveError" class="op-edit__note is-err">{{ saveError }}</p>

      <div class="op-edit__actions">
        <button type="button" class="op-edit__btn" @click="close">Mégse</button>
        <button
          type="button"
          class="op-edit__btn is-gold"
          :disabled="saving || !canEdit"
          @click="save"
        >
          {{ saving ? 'Mentés…' : 'Mentés' }}
        </button>
      </div>
    </q-card>
  </q-dialog>
  <OpQuestionPreview v-model="previewOpen" :mode="previewMode" :question="previewModel" />
  <OpQuestionMediaSheet
    v-model="mediaOpen"
    :event-id="question?.EventID || 0"
    :question-id="question?.QuestionID || null"
    :can-edit="canEdit"
    :image-key="draftImageKey"
    :image-url="draftImageUrl"
    :audio-key="draftAudioKey"
    :audio-url="draftAudioUrl"
    @bound="onMediaBound"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';
import {
  OP_QUESTION_TYPES,
  opQuestionStatusLabel,
  opTypeIcon,
  opTypeLabel,
  type OpQuestionTypeCode,
} from '../constants';
import { saveOpQuestion } from '../opApi';
import {
  extractOpFreetextSynonyms,
  extractOpQuestionOptions,
  isOpQuestionEditable,
  toOpQuestionSavePayload,
  type OpEventQuestion,
  type OpQuestionPreviewModel,
} from '../opData';
import OpQuestionPreview from './OpQuestionPreview.vue';
import OpQuestionMediaSheet from './OpQuestionMediaSheet.vue';

interface Draft {
  type: OpQuestionTypeCode | string;
  prompt: string;
  timeSec: number;
  answers: string[];
  matches: string[];
  itemCats: string[];
  isCorrect: boolean[];
  synonyms: string[];
}

const props = defineProps<{
  modelValue: boolean;
  question: OpEventQuestion | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [patch: Partial<OpEventQuestion>];
}>();

const $q = useQuasar();
const saving = ref(false);
const saveError = ref('');
const previewOpen = ref(false);
const mediaOpen = ref(false);
const previewMode = ref<'quizmaster' | 'player'>('player');
const draftImageKey = ref<string | null>(null);
const draftImageUrl = ref<string | null>(null);
const draftAudioKey = ref<string | null>(null);
const draftAudioUrl = ref<string | null>(null);
const canEdit = computed(() => isOpQuestionEditable(props.question?.StatusCode || ''));
const statusLabel = computed(() => opQuestionStatusLabel(props.question?.StatusCode || ''));
const draft = reactive<Draft>({
  type: 'single',
  prompt: '',
  timeSec: 20,
  answers: ['', '', '', ''],
  matches: ['', ''],
  itemCats: ['', '', '', ''],
  isCorrect: [false, false, false, false],
  synonyms: ['', ''],
});

const typeOptions = OP_QUESTION_TYPES;
const typeIcon = computed(() => opTypeIcon(draft.type));
const typeLabel = computed(() => opTypeLabel(String(draft.type)));
const pairCount = computed(() => Math.max(draft.answers.length, draft.matches.length, 2));
const filledCats = computed(() => draft.matches.map((item) => item.trim()).filter(Boolean));

function typeIconOf(code: string) {
  return opTypeIcon(code);
}

const previewModel = computed<OpQuestionPreviewModel>(() => ({
  type: String(draft.type),
  prompt: draft.prompt,
  timeSec: Number(draft.timeSec) || 20,
  sortIndex: props.question?.SortIndex,
  answers: draft.type === 'freetext' ? [] : draft.answers,
  matches: draft.type === 'category' ? draft.itemCats : draft.matches,
  categories:
    draft.type === 'category'
      ? draft.matches.map((item, i) => String(item || '').trim() || `Kategória ${i + 1}`)
      : [],
  isCorrect: draft.isCorrect,
  synonyms: draft.synonyms,
  mediaUrl: draftImageUrl.value,
}));

function openPreview(mode: 'quizmaster' | 'player') {
  previewMode.value = mode;
  previewOpen.value = true;
}

function openMedia() {
  mediaOpen.value = true;
}

function onMediaBound(patch: {
  imageKey?: string | null;
  imageUrl?: string | null;
  audioKey?: string | null;
  audioUrl?: string | null;
}) {
  if (patch.imageKey !== undefined) draftImageKey.value = patch.imageKey;
  if (patch.imageUrl !== undefined) draftImageUrl.value = patch.imageUrl;
  if (patch.audioKey !== undefined) draftAudioKey.value = patch.audioKey;
  if (patch.audioUrl !== undefined) draftAudioUrl.value = patch.audioUrl;
}

function setType(code: OpQuestionTypeCode) {
  if (draft.type === code) return;
  draft.type = code;
  if (code === 'single') {
    const first = draft.isCorrect.findIndex(Boolean);
    draft.isCorrect = draft.answers.map((_, i) => i === Math.max(0, first));
  }
  if (code === 'match' || code === 'category') {
    draft.answers = pad(draft.answers, 2);
    draft.matches = pad(draft.matches, 2);
    draft.itemCats = pad(draft.itemCats.length ? draft.itemCats : draft.matches, draft.answers.length);
  } else {
    draft.answers = pad(draft.answers, 4);
    draft.isCorrect = padFlags(draft.isCorrect, draft.answers.length);
    draft.itemCats = pad(draft.itemCats, draft.answers.length);
  }
  if (code === 'freetext') draft.synonyms = pad(draft.synonyms, 2);
}

function pad(list: string[], min: number): string[] {
  const next = list.slice();
  while (next.length < min) next.push('');
  return next.length > 8 ? next.slice(0, 8) : next;
}

function padFlags(list: boolean[], min: number): boolean[] {
  const next = list.slice();
  while (next.length < min) next.push(false);
  return next.length > 8 ? next.slice(0, 8) : next;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hydrate(row: OpEventQuestion) {
  draft.type = row.TypeCode || 'single';
  draft.prompt = row.Prompt || '';
  draft.timeSec = row.TimeSec || 20;
  draftImageKey.value = row.ImageKey;
  draftImageUrl.value = row.ImageUrl || (row.MediaUrl && /^https?:\/\//i.test(row.MediaUrl) ? row.MediaUrl : null);
  draftAudioKey.value = row.AudioKey;
  draftAudioUrl.value = row.AudioUrl;
  const extracted = extractOpQuestionOptions(row as unknown as Record<string, unknown>);
  const answers = (Array.isArray(row.Answers) && row.Answers.some(Boolean) ? row.Answers : extracted.answers).map(
    (item) => String(item ?? '')
  );
  const matches = (Array.isArray(row.Matches) && row.Matches.some(Boolean) ? row.Matches : extracted.matches).map(
    (item) => String(item ?? '')
  );
  draft.answers = pad(answers, draft.type === 'match' || draft.type === 'category' ? 2 : 4);
  draft.matches = pad(matches, draft.type === 'match' || draft.type === 'category' ? 2 : 0);
  draft.isCorrect = draft.answers.map((_, i) => Boolean(row.IsCorrect?.[i]));
  draft.itemCats = draft.answers.map(() => '');
  draft.synonyms = ['', ''];

  const correct = parseJson(row.CorrectJson);
  const corr = asRecord(correct);
  if (draft.type === 'freetext') {
    draft.synonyms = pad(
      extractOpFreetextSynonyms({
        ...(row as unknown as Record<string, unknown>),
        Answers: answers,
        Correct: correct ?? row.CorrectJson,
      }),
      2
    );
  } else if (draft.type === 'single' && !draft.isCorrect.some(Boolean) && corr && corr.Index != null) {
    const index = Number(corr.Index);
    const i = index > 0 && index >= draft.answers.length ? index - 1 : index;
    draft.isCorrect = draft.answers.map((_, idx) => idx === i);
  } else if (draft.type === 'multi' && !draft.isCorrect.some(Boolean) && corr && Array.isArray(corr.Indexes)) {
    const set = new Set(
      (corr.Indexes as unknown[]).map((item) => {
        const n = Number(item);
        return n > 0 && n >= draft.answers.length ? n - 1 : n;
      })
    );
    draft.isCorrect = draft.answers.map((_, idx) => set.has(idx));
  } else if (draft.type === 'category') {
    if (corr?.Buckets && typeof corr.Buckets === 'object') {
      const buckets = corr.Buckets as Record<string, unknown>;
      draft.itemCats = draft.answers.map((item) => {
        const text = item.trim();
        for (const [cat, list] of Object.entries(buckets)) {
          if (Array.isArray(list) && list.map((entry) => String(entry)).includes(text)) return cat;
        }
        return '';
      });
      draft.matches = pad(
        Object.keys(buckets).filter(Boolean).length ? Object.keys(buckets) : matches,
        2
      );
    } else {
      draft.itemCats = draft.answers.map((_, i) => String(matches[i] || '').trim());
      const unique = [...new Set(draft.itemCats.filter(Boolean))];
      draft.matches = pad(unique.length ? unique : matches, 2);
    }
  }
}

function toggleCorrect(index: number) {
  if (draft.type === 'single') {
    draft.isCorrect = draft.isCorrect.map((_, i) => i === index);
    return;
  }
  draft.isCorrect[index] = !draft.isCorrect[index];
}

function addAnswer() {
  if (draft.answers.length >= 8) return;
  draft.answers.push('');
  draft.isCorrect.push(false);
  draft.itemCats.push('');
}

function addMatch() {
  if (draft.matches.length >= 8) return;
  draft.matches.push('');
}

function addPair() {
  addAnswer();
  addMatch();
}

function addSynonym() {
  if (draft.synonyms.length >= 8) return;
  draft.synonyms.push('');
}

function moveAnswer(index: number, dir: number) {
  const next = index + dir;
  if (next < 0 || next >= draft.answers.length) return;
  const answers = draft.answers.splice(index, 1)[0];
  draft.answers.splice(next, 0, answers);
}

function filled(list: string[]): string[] {
  return list.map((item) => item.trim()).filter(Boolean);
}

function buildOptions(): unknown {
  if (draft.type === 'freetext') return null;
  if (draft.type === 'match') return { Left: filled(draft.answers), Right: filled(draft.matches) };
  if (draft.type === 'category') return { Items: filled(draft.answers), Cats: filled(draft.matches) };
  return filled(draft.answers);
}

function buildCorrect(): unknown {
  if (draft.type === 'freetext') return { Synonyms: filled(draft.synonyms) };
  if (draft.type === 'single') return { Index: Math.max(0, draft.isCorrect.findIndex(Boolean)) };
  if (draft.type === 'multi') {
    return { Indexes: draft.isCorrect.map((on, i) => (on ? i : -1)).filter((i) => i >= 0) };
  }
  if (draft.type === 'order') return { Order: filled(draft.answers) };
  if (draft.type === 'match') {
    return {
      Pairs: draft.answers
        .map((left, i) => ({ L: left.trim(), R: String(draft.matches[i] || '').trim() }))
        .filter((pair) => pair.L && pair.R),
    };
  }
  const buckets: Record<string, string[]> = {};
  draft.answers.forEach((item, i) => {
    const text = item.trim();
    const cat = String(draft.itemCats[i] || '').trim();
    if (!text || !cat) return;
    if (!buckets[cat]) buckets[cat] = [];
    buckets[cat].push(text);
  });
  return { Buckets: buckets };
}

function close() {
  emit('update:modelValue', false);
}

function validate(): string {
  if (!draft.prompt.trim()) return 'A kérdés szövege hiányzik.';
  const time = Number(draft.timeSec);
  if (!Number.isFinite(time) || time < 5 || time > 180) return 'Az idő 5–180 mp legyen.';
  if (draft.type === 'freetext') {
    return filled(draft.synonyms).length ? '' : 'Legalább egy elfogadott válasz kell.';
  }
  const answers = filled(draft.answers);
  if (draft.type === 'single') {
    if (answers.length < 2) return 'Legalább két opció kell.';
    if (draft.answers.filter((_, i) => draft.isCorrect[i] && draft.answers[i]?.trim()).length !== 1) {
      return 'Pontosan egy helyes opció kell.';
    }
    return '';
  }
  if (draft.type === 'multi') {
    if (answers.length < 2) return 'Legalább két opció kell.';
    if (!draft.answers.some((item, i) => draft.isCorrect[i] && item.trim())) {
      return 'Legalább egy helyes opció kell.';
    }
    return '';
  }
  if (draft.type === 'order') {
    return answers.length >= 2 ? '' : 'Legalább két elem kell.';
  }
  if (draft.type === 'match') {
    const pairs = draft.answers.filter((left, i) => left.trim() && String(draft.matches[i] || '').trim());
    return pairs.length >= 2 ? '' : 'Legalább két pár kell.';
  }
  const items = draft.answers.filter((item, i) => item.trim() && String(draft.itemCats[i] || '').trim());
  return items.length >= 2 ? '' : 'Legalább két darab, kategóriával.';
}

function localPatch(row: OpEventQuestion): Partial<OpEventQuestion> {
  const answers =
    draft.type === 'freetext' ? [filled(draft.synonyms).join('|')].filter(Boolean) : filled(draft.answers);
  const matches =
    draft.type === 'category'
      ? draft.answers.map((_, i) => String(draft.itemCats[i] || '').trim())
      : filled(draft.matches);
  return {
    TypeCode: String(draft.type),
    Prompt: draft.prompt.trim(),
    TimeSec: Number(draft.timeSec) || row.TimeSec,
    OptionsJson: JSON.stringify(buildOptions()),
    CorrectJson: JSON.stringify(buildCorrect()),
    Answers: answers,
    Matches: matches,
    Categories: draft.type === 'category' ? filledCats.value.slice() : [],
    IsCorrect: draft.isCorrect.slice(),
    ImageKey: draftImageKey.value,
    ImageUrl: draftImageUrl.value,
    AudioKey: draftAudioKey.value,
    AudioUrl: draftAudioUrl.value,
    MediaUrl: draftImageUrl.value,
  };
}

async function save() {
  if (!props.question || saving.value || !canEdit.value) return;
  const message = validate();
  if (message) {
    saveError.value = message;
    return;
  }
  saving.value = true;
  saveError.value = '';
  try {
    await saveOpQuestion(
      toOpQuestionSavePayload(props.question, {
        ...draft,
        imageKey: draftImageKey.value,
        audioKey: draftAudioKey.value,
      })
    );
    emit('saved', localPatch(props.question));
    $q.notify({ type: 'positive', message: 'Kérdés mentve.', position: 'top' });
    close();
  } catch (error) {
    saveError.value = readAxiosErrorMessage(error, 'A kérdés mentése sikertelen.');
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.modelValue, props.question] as const,
  ([open, row]) => {
    if (open && row) {
      saveError.value = '';
      hydrate(row);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.op-edit {
  width: 100%;
  max-width: 640px;
  max-height: min(90vh, 760px);
  overflow-y: auto;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: rgba(11, 16, 32, 0.98);
  border-top: 1px solid rgba(245, 185, 66, 0.35);
  color: var(--op-cream, #fff6e8);
  padding: 8px 20px 24px;
}

.op-edit__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 16px;
}

.op-edit__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.op-edit__type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 10px 6px 8px;
  border-radius: 12px;
  border: 1px solid rgba(245, 185, 66, 0.35);
  background: rgba(245, 185, 66, 0.1);
  color: #f5b942;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.op-edit__type:disabled {
  opacity: 0.5;
  cursor: default;
}

.op-edit__tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.op-edit__view {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #f5b942;
  cursor: pointer;
}

.op-edit__view:hover,
.op-edit__view:focus-visible {
  background: rgba(245, 185, 66, 0.14);
}

.op-edit__view:disabled {
  opacity: 0.4;
  cursor: default;
}

.op-edit__ord {
  margin-left: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #c4b8a0;
}

.op-edit__label {
  display: block;
  margin: 16px 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #c4b8a0;
}

.op-edit__input,
.op-edit__area,
.op-edit__select {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(245, 185, 66, 0.2);
  background: rgba(7, 10, 20, 0.7);
  color: #fff6e8;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 12px;
}

.op-edit__area {
  resize: vertical;
  min-height: 72px;
  line-height: 1.4;
}

.op-edit__select {
  max-width: 42%;
}

.op-edit__opt,
.op-edit__pair {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.op-edit__eq {
  flex-shrink: 0;
  color: #f5b942;
  font-weight: 800;
}

.op-edit__flag,
.op-edit__n,
.op-edit__move {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #c4b8a0;
}

.op-edit__flag,
.op-edit__move {
  cursor: pointer;
}

.op-edit__move:disabled {
  opacity: 0.35;
  cursor: default;
}

.op-edit__flag.is-on {
  border-color: rgba(245, 185, 66, 0.55);
  background: rgba(245, 185, 66, 0.18);
  color: #f5b942;
}

.op-edit__add {
  margin-top: 4px;
  border: none;
  background: transparent;
  color: #f5b942;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.op-edit__fields {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.op-edit__fields:disabled {
  opacity: 0.55;
}

.op-edit__note {
  margin: 16px 0 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #94a3b8;
}

.op-edit__note.is-err {
  color: #fca5a5;
}

.op-edit__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 18px;
}

.op-edit__btn {
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.op-edit__btn.is-gold {
  border-color: transparent;
  background: #f5b942;
  color: #1a1408;
}

.op-edit__btn:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>

<style>
.op-edit-menu {
  background: #0b1020 !important;
  border: 1px solid rgba(245, 185, 66, 0.35);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.op-edit-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #fff6e8;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.op-edit-menu__item.is-on,
.op-edit-menu__item:hover {
  background: rgba(245, 185, 66, 0.16);
  color: #f5b942;
}
</style>
