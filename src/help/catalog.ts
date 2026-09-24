import { parseFrontMatter, parseHelpBody } from './parseArticle';
import type { HelpArticle } from './types';

import homeRaw from './articles/home.md?raw';
import myEventsRaw from './articles/my-events.md?raw';
import eventSheetRaw from './articles/event-sheet.md?raw';
import organizeRaw from './articles/organize.md?raw';
import participantsRaw from './articles/participants.md?raw';
import ptaPlayRaw from './articles/pta-play.md?raw';
import vetitesRaw from './articles/vetites.md?raw';
import checkInRaw from './articles/check-in.md?raw';
import materialsRaw from './articles/materials.md?raw';
import profileRaw from './articles/profile.md?raw';

function readRaw(mod: unknown): string {
  if (typeof mod === 'string') return mod;
  if (mod && typeof mod === 'object' && 'default' in mod) {
    const value = (mod as { default: unknown }).default;
    if (typeof value === 'string') return value;
  }
  return '';
}

function articleFromRaw(raw: string): HelpArticle | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    const { meta, body } = parseFrontMatter(text);
    return { ...meta, body, blocks: parseHelpBody(body) };
  } catch (error) {
    console.warn('[help] cikk parse hiba', error);
    return null;
  }
}

const globModules = import.meta.glob('./articles/*.md', {
  eager: true,
  as: 'raw',
}) as Record<string, unknown>;

const explicitModules: unknown[] = [
  homeRaw,
  myEventsRaw,
  eventSheetRaw,
  organizeRaw,
  participantsRaw,
  ptaPlayRaw,
  vetitesRaw,
  checkInRaw,
  materialsRaw,
  profileRaw,
];

const byId = new Map<string, HelpArticle>();

for (const mod of Object.values(globModules)) {
  const article = articleFromRaw(readRaw(mod));
  if (article) byId.set(article.id, article);
}

for (const mod of explicitModules) {
  const article = articleFromRaw(readRaw(mod));
  if (article) byId.set(article.id, article);
}

export const helpArticles: HelpArticle[] = [...byId.values()].sort(
  (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'hu')
);

export function getHelpArticle(id: string | null | undefined): HelpArticle | null {
  if (!id) return null;
  return helpArticles.find((item) => item.id === id) || null;
}

export function helpArticleForRoute(routeName: string | null | undefined): HelpArticle | null {
  const names = String(routeName || '')
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const name of names) {
    const found = helpArticles.find((item) => item.routes.includes(name));
    if (found) return found;
  }
  return null;
}

function articleIdFromPath(path: string): string | null {
  const p = String(path || '')
    .split('?')[0]
    .replace(/\/+$/, '')
    .toLowerCase();
  if (p.endsWith('/participants') || p.includes('/participants/')) return 'participants';
  if (p.includes('/olimpub/event/')) return 'organize';
  if (p.endsWith('/vetites') || p.includes('/vetites/')) return 'vetites';
  if (p.endsWith('/manage/materials') || p.includes('/manage/materials/')) return 'materials';
  if (p.endsWith('/manage/scan') || p.includes('/manage/scan/')) return 'check-in';
  if (/\/event\/[^/]+\/game$/.test(p)) return 'pta-play';
  if (/\/event\/[^/]+\/results$/.test(p)) return 'pta-play';
  return null;
}

const ROUTE_SECTIONS: Record<string, string> = {
  event_ticket_scan: 'ticket-qr',
  'profitability-game': 'game',
  'profitability-results': 'results',
};

export function helpTargetForRoute(
  routeName: string | null | undefined,
  routePath?: string | null
): { articleId: string; section?: string } | null {
  const name = String(routeName || '').trim();
  const path = String(routePath || '').trim();
  const byName = helpArticleForRoute(name);
  const byPath = getHelpArticle(articleIdFromPath(path));
  const article = byName || byPath;
  if (!article) return null;
  const firstName = name.split(/[,\s]+/).find(Boolean) || '';
  return {
    articleId: article.id,
    section: ROUTE_SECTIONS[firstName],
  };
}

export function audienceLabel(audience: HelpArticle['audience']): string {
  if (audience === 'player') return 'Játékos';
  if (audience === 'organizer') return 'Szervező';
  return 'Mindenki';
}
