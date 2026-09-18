import { defineStore } from 'pinia';
import { helpTargetForRoute } from 'src/help/catalog';

const STORAGE_KEY = 'ej_helpHeaderEnabled';

function readHeaderEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
  } catch {
    /* ignore */
  }
  return true;
}

export const useHelpStore = defineStore('help', {
  state: () => ({
    headerEnabled: readHeaderEnabled(),
    sheetOpen: false,
    articleId: null as string | null,
    articleSection: null as string | null,
  }),
  actions: {
    setHeaderEnabled(enabled: boolean) {
      this.headerEnabled = enabled;
      try {
        localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    openArticle(id: string | null, section?: string | null) {
      this.articleId = id;
      this.articleSection = section || null;
      this.sheetOpen = true;
    },
    openForRoute(routeName: string | null | undefined, routePath?: string | null) {
      const target = helpTargetForRoute(routeName, routePath);
      this.openArticle(target?.articleId ?? null, target?.section);
    },
    closeSheet() {
      this.sheetOpen = false;
      this.articleSection = null;
    },
  },
});
