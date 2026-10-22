/**
 * Az alkalmazás `html` / `body` eleme `overflow: hidden`, a görgetés a `.ej-app__main` konténerben
 * (és az oldalak saját görgetőiben) történik. A vue-router `scrollBehavior` csak az ablakot görgeti,
 * ezért oldalváltáskor ezeket külön a tetejére állítjuk.
 */
const MAIN_SELECTOR = '.ej-app__main';

function scrollToTop(el: Element | null | undefined) {
  if (!el) return;
  if (el.scrollTop !== 0) el.scrollTop = 0;
  if (el.scrollLeft !== 0) el.scrollLeft = 0;
}

function resetNow() {
  scrollToTop(document.scrollingElement);
  const main = document.querySelector<HTMLElement>(MAIN_SELECTOR);
  scrollToTop(main);
  if (!main) return;
  /* Ugyanaz a komponens újrahasznosul (pl. más :id), ilyenkor a belső görgetők is megtartanák a pozíciót. */
  main.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (node.scrollTop > 0 && node.scrollHeight > node.clientHeight) node.scrollTop = 0;
  });
}

/** Oldalváltás után: azonnal, majd a következő két képkockán (az új oldal DOM-ja ekkorra áll fel). */
export function resetAppScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  resetNow();
  window.requestAnimationFrame(() => {
    resetNow();
    window.requestAnimationFrame(resetNow);
  });
}
