export type HelpAudience = 'all' | 'player' | 'organizer';

export interface HelpArticleMeta {
  id: string;
  title: string;
  summary: string;
  routes: string[];
  audience: HelpAudience;
  order: number;
}

export type HelpBlock =
  | { type: 'h2' | 'h3'; text: string; id?: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'figure'; file: string; alt: string };

export interface HelpArticle extends HelpArticleMeta {
  body: string;
  blocks: HelpBlock[];
}
