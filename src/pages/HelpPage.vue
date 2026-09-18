<template>
  <q-page class="help-page bg-brand-dark text-white q-pa-md">
    <div class="help-page__head">
      <q-btn
        flat
        round
        dense
        icon="arrow_back"
        class="text-sky-400 bg-white/5"
        @click="goBack"
      />
      <h2 class="help-page__kicker">
        <q-icon name="sym_r_help" color="#38bdf8" size="16px" />
        Súgó
      </h2>
    </div>

    <template v-if="article">
      <p class="help-page__audience">{{ audienceLabel(article.audience) }}</p>
      <h1 class="help-page__title">{{ article.title }}</h1>
      <HelpArticleBody :article="article" show-summary />
    </template>
    <template v-else>
      <p class="help-page__intro">Rövid magyarázatok a képernyőkhöz. A fejléc kérdőjele ugyaninnen nyit.</p>
      <div class="help-page__list">
        <button
          v-for="item in helpArticles"
          :key="item.id"
          type="button"
          class="help-card"
          @click="router.push({ name: 'help-article', params: { articleId: item.id } })"
        >
          <div class="help-card__top">
            <span class="help-card__audience">{{ audienceLabel(item.audience) }}</span>
          </div>
          <div class="help-card__title">{{ item.title }}</div>
          <p class="help-card__sum">{{ item.summary }}</p>
        </button>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { audienceLabel, getHelpArticle, helpArticles } from 'src/help/catalog';
import HelpArticleBody from 'src/components/help/HelpArticleBody.vue';

const route = useRoute();
const router = useRouter();
const article = computed(() => getHelpArticle(String(route.params.articleId || '')));

function goBack() {
  if (article.value) {
    void router.push({ name: 'help' });
    return;
  }
  void router.push({ name: 'profile' });
}
</script>

<style scoped lang="scss">
.help-page {
  min-height: 0;
  max-width: 560px;
  margin: 0 auto;
  padding-bottom: 24px;
}
.help-page__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 16px;
}
.help-page__kicker {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.help-page__intro,
.help-page__audience {
  margin: 0 0 12px;
  color: #94a3b8;
  font-size: 13px;
}
.help-page__title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 800;
}
.help-page__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 24px;
}
.help-card {
  text-align: left;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.help-card:hover {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(14, 165, 233, 0.08);
}
.help-card__top {
  margin-bottom: 6px;
}
.help-card__audience {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #38bdf8;
}
.help-card__title {
  font-size: 16px;
  font-weight: 800;
  color: #f8fafc;
}
.help-card__sum {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.4;
}
</style>
