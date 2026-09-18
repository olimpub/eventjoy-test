import type { HelpArticleMeta, HelpAudience, HelpBlock } from './types';

function parseAudience(value: string): HelpAudience {
  const v = value.trim().toLowerCase();
  if (v === 'player' || v === 'jatekos' || v === 'játékos') return 'player';
  if (v === 'organizer' || v === 'szervezo' || v === 'szervező') return 'organizer';
  return 'all';
}

function parseRoutes(value: string): string[] {
  return value
    .split(/[,[\]]/)
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

export function parseFrontMatter(raw: string): { meta: HelpArticleMeta; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const map: Record<string, string> = {};
  let body = raw.trim();
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx < 1) continue;
      map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    body = match[2].trim();
  }
  const id = (map.id || '').trim();
  if (!id) throw new Error('A súgócikknek kell `id` a frontmatterben.');
  return {
    meta: {
      id,
      title: map.title || id,
      summary: map.summary || '',
      routes: parseRoutes(map.routes || ''),
      audience: parseAudience(map.audience || 'all'),
      order: Number(map.order) || 100,
    },
    body,
  };
}

function inlineText(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function parseHeading(line: string): { type: 'h2' | 'h3'; text: string; id: string } | null {
  const match = line.match(/^(#{2,3})\s+(.+)$/);
  if (!match) return null;
  let raw = match[2].trim();
  let id = '';
  const explicit = raw.match(/^(.*?)\s*\{#([a-z0-9-]+)\}\s*$/i);
  if (explicit) {
    raw = explicit[1];
    id = explicit[2].toLowerCase();
  }
  const text = inlineText(raw);
  return {
    type: match[1].length === 3 ? 'h3' : 'h2',
    text,
    id: id || text,
  };
}

export function parseHelpBody(body: string): HelpBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: HelpBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    const text = inlineText(paragraph.join(' '));
    paragraph = [];
    if (text) blocks.push({ type: 'p', text });
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: 'ul', items: list.map(inlineText) });
    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'figure', alt: image[1].trim(), file: image[2].trim() });
      continue;
    }
    const heading = parseHeading(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(heading);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
