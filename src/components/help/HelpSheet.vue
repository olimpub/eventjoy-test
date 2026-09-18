<template>
  <q-dialog
    :model-value="helpStore.sheetOpen"
    position="bottom"
    @update:model-value="onToggle"
  >
    <q-card class="help-sheet">
      <div class="help-sheet__handle-wrap">
        <div class="help-sheet__handle" />
      </div>
      <q-card-section class="help-sheet__head">
        <div class="help-sheet__kicker">Súgó</div>
        <div class="help-sheet__title">{{ article?.title || 'Erről a képernyőről' }}</div>
        <q-btn
          icon="close"
          flat
          round
          dense
          class="text-slate-400"
          aria-label="Bezárás"
          @click="helpStore.closeSheet()"
        />
      </q-card-section>
      <q-card-section class="help-sheet__body" ref="bodyRef">
        <HelpArticleBody v-if="article" :article="article" />
        <p v-else class="help-sheet__empty">
          Ehhez a képernyőhöz még nincs külön cikk. A Súgóban az összes téma megtalálható.
        </p>
      </q-card-section>
      <div class="help-sheet__actions">
        <button type="button" class="help-sheet__btn" @click="goHelp">Összes téma</button>
        <button type="button" class="help-sheet__btn help-sheet__btn--ghost" @click="goSupport">
          Támogatás
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getHelpArticle } from 'src/help/catalog';
import { useHelpStore } from 'src/stores/help';
import HelpArticleBody from './HelpArticleBody.vue';

const router = useRouter();
const helpStore = useHelpStore();
const article = computed(() => getHelpArticle(helpStore.articleId));
const bodyRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);

function bodyEl(): HTMLElement | null {
  const raw = bodyRef.value as { $el?: HTMLElement } | HTMLElement | null;
  if (!raw) return null;
  return raw instanceof HTMLElement ? raw : raw.$el || null;
}

watch(
  () => [helpStore.sheetOpen, helpStore.articleId, helpStore.articleSection] as const,
  async ([open, , section]) => {
    if (!open || !section) return;
    await nextTick();
    window.setTimeout(() => {
      const root = bodyEl();
      const target = root?.querySelector(`[data-help-section="${section}"]`);
      target?.scrollIntoView({ block: 'start' });
    }, 80);
  }
);

function onToggle(open: boolean) {
  if (!open) helpStore.closeSheet();
}

function goHelp() {
  helpStore.closeSheet();
  void router.push({ name: 'help' });
}

function goSupport() {
  helpStore.closeSheet();
  void router.push({ name: 'support' });
}
</script>

<style scoped lang="scss">
.help-sheet {
  width: 100%;
  max-width: 560px;
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.97);
  color: #fff;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(56, 189, 248, 0.28);
}
.help-sheet__handle-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 0 0;
}
.help-sheet__handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}
.help-sheet__head {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-items: start;
  padding-bottom: 4px;
}
.help-sheet__kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #38bdf8;
}
.help-sheet__title {
  grid-column: 1;
  font-size: 18px;
  font-weight: 800;
}
.help-sheet__head .q-btn {
  grid-column: 2;
  grid-row: 1 / span 2;
}
.help-sheet__body {
  overflow-y: auto;
  min-height: 0;
  padding-top: 0;
}
.help-sheet__empty {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.5;
}
.help-sheet__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px 16px calc(14px + env(safe-area-inset-bottom, 0px));
}
.help-sheet__btn {
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 165, 233, 0.16);
  color: #7dd3fc;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.help-sheet__btn--ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  color: #94a3b8;
}
</style>
