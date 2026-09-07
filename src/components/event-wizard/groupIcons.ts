/** Client-side map — seedben nincs csoportikon. API IconName később felülírhatja. */
export const GROUP_ICON_MAP: Record<number, string> = {
  1: 'sym_r_business_center',
  2: 'sym_r_music_note',
  3: 'sym_r_diversity_3',
  4: 'sym_r_sports_soccer',
  5: 'sym_r_restaurant',
  6: 'sym_r_category',
  99: 'sym_r_workspace_premium',
};

export type ResolvedIcon = { kind: 'icon' | 'img'; value: string };

export function getGroupIcon(group: { id?: number | string; IconName?: string; iconName?: string } | null | undefined): string {
  if (!group) return 'sym_r_category';
  const fromApi = group.IconName || group.iconName;
  if (fromApi) return resolveIconName(fromApi);
  const id = Number(group.id);
  return GROUP_ICON_MAP[id] || 'sym_r_category';
}

/**
 * Legacy IconName aliasok — ha a API még régi értéket ad.
 * Forrás: /api/master/data → EventTypes[].IconName → Pinia masterData.eventTypes
 * (+ localStorage md_eventTypes cache login után frissül)
 */
const ICON_ALIASES: Record<string, string> = {
  presentation_app: 'sym_r_present_to_all',
  sym_r_presentation_app: 'sym_r_present_to_all',
};

function looksLikeImagePath(raw: string): boolean {
  if (raw.startsWith('img:')) return true;
  if (/^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/i.test(raw)) return true;
  if (raw.includes('/') || raw.includes('\\')) return true;
  if (/\.(svg|png|jpe?g|webp|gif)(\?.*)?$/i.test(raw)) return true;
  return false;
}

function imageSrc(raw: string): string {
  return raw.startsWith('img:') ? raw.slice(4) : raw;
}

/** Material Symbol név vagy képútvonal → render tip */
export function resolveTypeIcon(iconName?: string | null): ResolvedIcon {
  const raw = (iconName || '').trim();
  if (!raw) return { kind: 'icon', value: 'sym_r_event' };
  if (looksLikeImagePath(raw)) {
    const src = imageSrc(raw);
    return src ? { kind: 'img', value: src } : { kind: 'icon', value: 'sym_r_event' };
  }
  const aliased = ICON_ALIASES[raw] || ICON_ALIASES[raw.replace(/^sym_r_/, '')];
  const name = aliased || raw;
  if (!/^[a-z0-9_]+$/i.test(name)) {
    return { kind: 'icon', value: 'sym_r_event' };
  }
  return { kind: 'icon', value: name };
}

/** Plain icon name for q-icon :name (cards, lists). Képeknél generic fallback. */
export function resolveIconName(iconName?: string | null): string {
  const resolved = resolveTypeIcon(iconName);
  return resolved.kind === 'icon' ? resolved.value : 'sym_r_event';
}
