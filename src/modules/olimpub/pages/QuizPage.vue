<template>
  <OpSubpage title="Quiz">
    <template #actions>
      <OpMediaPackButton :event-id="eventId" compact />
      <button type="button" class="op-icon-btn is-gold" aria-label="Excel feltöltés" @click="isImportOpen = true">
        <q-icon name="sym_r_upload_file" size="20px" />
        <q-tooltip>Excel feltöltés</q-tooltip>
      </button>
    </template>

    <div v-if="loading && !hasContent" class="op-empty">
      <q-spinner color="amber-5" size="22px" />
      <p>Betöltés…</p>
    </div>
    <div v-else-if="loadError" class="op-empty">
      <p>{{ loadError }}</p>
      <button type="button" class="op-btn" @click="reload">Újra</button>
    </div>

    <template v-else>
      <section class="op-block">
        <div class="op-block__head">
          <h2>Fordulók</h2>
          <span>{{ rounds.length }}</span>
        </div>
        <article v-for="round in rounds" :key="round.id" class="op-acc">
          <button type="button" class="op-acc__head" @click="toggleRound(round.id)">
            <span class="op-idx">{{ round.SortIndex }}</span>
            <span class="min-w-0 flex-1">
              <span class="op-row__title">{{ roundTitle(round) }}</span>
              <span class="op-row__meta">
                {{ questionsOf(round.id).length }} kérdés · {{ statusLabel(round.StatusCode) }}
              </span>
            </span>
            <q-icon :name="openRoundId === round.id ? 'expand_less' : 'expand_more'" size="18px" />
          </button>
          <ol v-if="openRoundId === round.id" class="op-qlist">
            <li v-for="row in questionsOf(round.id)" :key="row.id">
              <button type="button" class="op-qrow" @click="openEditor(row)">
                <span class="op-idx">{{ row.SortIndex }}</span>
                <q-icon :name="typeIcon(row.TypeCode)" size="18px" class="op-qrow__icon">
                  <q-tooltip>{{ typeLabel(row.TypeCode) }}</q-tooltip>
                </q-icon>
                <span class="op-qrow__prompt">{{ row.Prompt || typeLabel(row.TypeCode) }}</span>
                <span class="op-qrow__flags">
                  <q-icon v-if="row.ImageKey || opQuestionImageUrl(row)" name="sym_r_image" size="16px" />
                  <q-icon v-if="opQuestionHasAudio(row)" name="sym_r_music_note" size="16px" />
                </span>
                <q-icon name="chevron_right" size="18px" class="op-qrow__go" />
              </button>
            </li>
          </ol>
        </article>
        <div v-if="!rounds.length && !extraGroups.length" class="op-empty op-empty--tight">
          <p>Töltsd fel az Excelt — abból lesz a forduló és a játék készlet.</p>
          <button type="button" class="op-btn is-gold" @click="isImportOpen = true">Excel feltöltés</button>
        </div>
        <p v-else-if="liveExtraOnly" class="op-empty op-empty--tight">
          Van élő Párbaj-futam, de a feltöltött játék-kérdések nem jöttek le a szerkesztőbe. Az Excel ExtraGameId
          készletét kellene itt látni — ha üres, a backend nem adja a QuestionID-s extra sort.
        </p>
      </section>

      <section v-if="extraGroups.length" class="op-block">
        <div class="op-block__head">
          <h2>Játékok</h2>
          <span>{{ extraGroups.length }}</span>
        </div>
        <article v-for="group in extraGroups" :key="group.id" class="op-acc">
          <button type="button" class="op-acc__head" @click="toggleExtra(group.id)">
            <span class="op-idx">{{ group.id.replace('EG', '') }}</span>
            <span class="min-w-0 flex-1">
              <span class="op-row__title">{{ group.title }}</span>
              <span class="op-row__meta">{{ group.rows.length }} kérdés · extra készlet</span>
            </span>
            <q-icon :name="openExtraId === group.id ? 'expand_less' : 'expand_more'" size="18px" />
          </button>
          <ol v-if="openExtraId === group.id" class="op-qlist">
            <li v-for="row in group.rows" :key="row.id">
              <button type="button" class="op-qrow" @click="openExtraEditor(row)">
                <span class="op-idx">{{ row.SortIndex }}</span>
                <q-icon :name="typeIcon(row.TypeCode)" size="18px" class="op-qrow__icon">
                  <q-tooltip>{{ typeLabel(row.TypeCode) }}</q-tooltip>
                </q-icon>
                <span class="op-qrow__prompt">{{ row.Prompt || typeLabel(row.TypeCode) }}</span>
                <span class="op-qrow__flags">
                  <q-icon v-if="row.ImageKey || row.ImageUrl || extraHasImage(row)" name="sym_r_image" size="16px" />
                  <q-icon v-if="extraHasAudio(row)" name="sym_r_music_note" size="16px" />
                </span>
                <q-icon name="chevron_right" size="18px" class="op-qrow__go" />
              </button>
            </li>
          </ol>
        </article>
      </section>
    </template>

    <OpQuestionImport
      v-model="isImportOpen"
      :event-id="eventId"
      :event-name="eventName"
      @imported="onQuestionsImported"
    />
    <OpQuestionEditor v-model="isEditorOpen" :question="editing" @saved="onQuestionSaved" />
  </OpSubpage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useEventStore } from 'src/stores/event';
import { useOlimpubStore } from 'src/stores/olimpub';
import { matchOpExtraGame, opRoundStatusLabel, opTypeIcon, opTypeLabel } from '../constants';
import {
  extraPoolToQuestion,
  enrichOpExtraMedia,
  opLooksAudioMedia,
  opQuestionHasAudio,
  opQuestionImageUrl,
  uniqueOpExtraGameIds,
  type OpEventQuestion,
  type OpExtraPoolItem,
  type OpRound,
} from '../opData';
import OpMediaPackButton from '../components/OpMediaPackButton.vue';
import OpQuestionEditor from '../components/OpQuestionEditor.vue';
import OpQuestionImport from '../components/OpQuestionImport.vue';
import OpSubpage from './OpSubpage.vue';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';

const route = useRoute();
const eventStore = useEventStore();
const store = useOlimpubStore();
const eventId = computed(() => String(route.params.id));
const isImportOpen = ref(false);
const isEditorOpen = ref(false);
const editing = ref<OpEventQuestion | null>(null);
const loading = ref(false);
const loadError = ref('');

const eventName = computed(() => {
  const ev =
    eventStore.events?.find((e: { id?: number | string }) => String(e.id) === eventId.value) ||
    eventStore.myEvents?.find((e: { id?: number | string }) => String(e.id) === eventId.value);
  return ev?.Title || ev?.EventName || ev?.Name || 'Esemény';
});
const openRoundId = ref<number | null>(null);
const openExtraId = ref<string | null>(null);

const game = computed(() => store.getGame(eventId.value));
const rounds = computed(() => game.value.rounds);
const extraGroups = computed(() => {
  const ids = uniqueOpExtraGameIds(
    game.value.extraCatalog.map((row) => row.ExtraGameId),
    game.value.questions.map((row) => row.ExtraGameId || '')
  );
  return ids
    .map((id) => {
      const named = matchOpExtraGame(id);
      const seen = new Set<number>();
      const rows = game.value.extraCatalog
        .filter((row) => row.ExtraGameId === id)
        .slice()
        .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id)
        .filter((row) => {
          const key = row.QuestionID ?? row.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      return { id, title: named?.title || id, rows };
    })
    .filter((group) => group.rows.length);
});
const liveExtraOnly = computed(
  () => !extraGroups.value.length && game.value.extraPool.some((row) => row.ExtraGameId)
);
const hasContent = computed(() => rounds.value.length > 0 || extraGroups.value.length > 0);

function questionsOf(roundId: number) {
  return game.value.questions
    .filter((q) => q.RoundID === roundId && !q.ExtraGameId)
    .slice()
    .sort((a, b) => a.SortIndex - b.SortIndex);
}

function statusLabel(code: string) {
  return opRoundStatusLabel(code);
}

function typeLabel(code: string) {
  return opTypeLabel(code);
}

function typeIcon(code: string) {
  return opTypeIcon(code);
}

function openEditor(row: OpEventQuestion) {
  editing.value = row;
  isEditorOpen.value = true;
}

function onQuestionSaved(patch: Partial<OpEventQuestion>) {
  if (!editing.value) return;
  store.patchEventQuestion(eventId.value, editing.value.id, patch);
}

function roundTopic(round: OpRound): string {
  if (round.TopicName) return round.TopicName;
  const fromMaster = store.topics.find((topic) => topic.id === round.TopicID);
  if (fromMaster?.Name) return fromMaster.Name;
  const fromQuestion = questionsOf(round.id).find((row) => row.TopicName)?.TopicName;
  return fromQuestion || '';
}

function roundTitle(round: OpRound): string {
  const topic = roundTopic(round);
  return topic || `${round.SortIndex}. forduló`;
}

function extraWithMedia(row: OpExtraPoolItem): OpExtraPoolItem {
  const copy: OpExtraPoolItem = {
    ...row,
    Answers: [...(row.Answers || [])],
    IsCorrect: [...(row.IsCorrect || [])],
  };
  enrichOpExtraMedia([copy], game.value.extraCatalog);
  enrichOpExtraMedia([copy], game.value.extraPool);
  const repo =
    row.QuestionID != null ? game.value.repoQuestions.find((item) => item.id === row.QuestionID) : undefined;
  if (repo) {
    copy.AudioKey = copy.AudioKey || repo.AudioKey;
    copy.AudioUrl = copy.AudioUrl || repo.AudioUrl;
    copy.ImageKey = copy.ImageKey || repo.ImageKey;
    copy.ImageUrl = copy.ImageUrl || repo.ImageUrl;
    copy.MediaUrl = copy.MediaUrl || repo.MediaUrl;
  }
  return copy;
}

function extraHasImage(row: OpExtraPoolItem) {
  const media = extraWithMedia(row);
  if (media.ImageKey || media.ImageUrl) return true;
  if (!media.MediaUrl || opLooksAudioMedia(media.MediaUrl)) return false;
  return true;
}

function extraHasAudio(row: OpExtraPoolItem) {
  return opQuestionHasAudio(extraWithMedia(row));
}

function openExtraEditor(row: OpExtraPoolItem) {
  editing.value = { ...extraPoolToQuestion(extraWithMedia(row)), StatusCode: 'pending' };
  isEditorOpen.value = true;
}

function toggleExtra(id: string) {
  openExtraId.value = openExtraId.value === id ? null : id;
}

function toggleRound(id: number) {
  openRoundId.value = openRoundId.value === id ? null : id;
}

async function reload() {
  loading.value = true;
  loadError.value = '';
  try {
    await store.loadMaster(true);
    await store.loadGame(eventId.value);
    await store.loadRepoQuestions(eventId.value);
    if (openRoundId.value == null && rounds.value[0]) {
      openRoundId.value = rounds.value[0].id;
    }
  } catch (error) {
    loadError.value = readAxiosErrorMessage(error, 'A Quiz adatainak betöltése sikertelen.');
  } finally {
    loading.value = false;
  }
}

async function onQuestionsImported(payload?: { roundIds?: number[] }) {
  await reload();
  const importedId = payload?.roundIds?.at(-1);
  const match = importedId != null ? rounds.value.find((row) => row.id === importedId) : null;
  openRoundId.value = match?.id ?? rounds.value.at(-1)?.id ?? null;
}

onMounted(() => {
  void reload();
});
</script>

<style scoped>
.op-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(245, 185, 66, 0.4);
  background: rgba(245, 185, 66, 0.12);
  color: var(--op-gold);
  cursor: pointer;
}

.op-icon-btn.is-gold {
  background: var(--op-gold);
  color: #1a1408;
  border-color: transparent;
}

.op-icon-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.op-qrow {
  display: grid;
  grid-template-columns: 24px 22px 1fr auto 18px;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 2px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.op-qrow:hover,
.op-qrow:focus-visible {
  background: rgba(245, 185, 66, 0.08);
}

.op-block {
  margin-bottom: 18px;
}

.op-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.op-block__head h2 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--op-muted);
}

.op-block__head span {
  font-size: 11px;
  font-weight: 700;
  color: var(--op-gold);
}

.op-gen {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.op-gen .op-field {
  flex: 1;
  min-width: 0;
}

.op-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(245, 185, 66, 0.25);
  background: rgba(12, 16, 28, 0.86);
  color: var(--op-cream);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.op-btn.is-gold {
  background: var(--op-gold);
  color: #1a1408;
  border-color: transparent;
  min-width: 96px;
}

.op-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.op-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--op-muted);
}

.op-hint--pad {
  padding: 0 2px 10px;
}

.op-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 20px 14px;
  border-radius: 16px;
  border: 1px solid rgba(245, 185, 66, 0.12);
  background: rgba(12, 16, 28, 0.78);
}

.op-empty p {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--op-muted);
}

.op-empty--tight {
  padding: 16px 12px;
}

.op-acc {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 14px;
  border: 1px solid rgba(245, 185, 66, 0.12);
  background: rgba(12, 16, 28, 0.78);
}

.op-acc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.op-idx {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 185, 66, 0.16);
  color: var(--op-gold);
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}

.op-row__title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}

.op-row__meta {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--op-muted);
}

.op-qlist {
  list-style: none;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px solid rgba(245, 185, 66, 0.1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.op-qlist li {
  margin: 0;
}

.op-qrow__icon {
  color: var(--op-gold);
}

.op-qrow__go {
  color: var(--op-muted);
}

.op-qrow__flags {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--op-muted);
}

.op-qrow__prompt {
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.op-field :deep(.q-field__control) {
  min-height: 36px;
  border-radius: 12px;
  background: rgba(7, 10, 20, 0.65);
}

.op-field :deep(.q-field__native),
.op-field :deep(.q-field__input) {
  font-size: 13px;
}
</style>
