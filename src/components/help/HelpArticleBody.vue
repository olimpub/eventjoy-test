<template>
  <div class="help-article">
    <p v-if="article.summary && showSummary" class="help-article__lead">{{ article.summary }}</p>
    <template v-for="(block, index) in article.blocks" :key="index">
      <h2
        v-if="block.type === 'h2'"
        class="help-article__h2"
        :data-help-section="block.id || undefined"
      >{{ block.text }}</h2>
      <h3
        v-else-if="block.type === 'h3'"
        class="help-article__h3"
        :data-help-section="block.id || undefined"
      >{{ block.text }}</h3>
      <p v-else-if="block.type === 'p'" class="help-article__p">{{ block.text }}</p>
      <ul v-else-if="block.type === 'ul'" class="help-article__ul">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { HelpArticle } from 'src/help/types';

withDefaults(
  defineProps<{
    article: HelpArticle;
    showSummary?: boolean;
  }>(),
  { showSummary: false }
);
</script>

<style scoped lang="scss">
.help-article {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.help-article__lead {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.45;
}
.help-article__h2,
.help-article__h3 {
  margin: 8px 0 0;
  color: #e2e8f0;
  font-weight: 800;
  scroll-margin-top: 8px;
}
.help-article__h2 {
  font-size: 16px;
}
.help-article__h3 {
  font-size: 14px;
  color: #7dd3fc;
}
.help-article__p {
  margin: 0;
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.55;
}
.help-article__ul {
  margin: 0;
  padding-left: 1.15rem;
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
