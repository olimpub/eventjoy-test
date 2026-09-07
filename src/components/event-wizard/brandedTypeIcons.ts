import { EVENTJOY_BRAND } from 'src/assets/brand/eventjoy';
import { OLIMPUB_BRAND } from 'src/assets/brand/olimpub';
import { TEAMCRAFT_BRAND } from 'src/assets/brand/teamcraft';
import { SPEEDMEETING_BRAND } from 'src/assets/brand/speedmeeting';
import { eventTypeHasPtaFlag } from 'src/modules/profitability/ptaData';
import { PTA_EVENT_TYPE_ID } from 'src/modules/profitability/constants';
import ptaLogo from 'src/assets/PTA.png';
import { GROUP_ICON_MAP, resolveTypeIcon, type ResolvedIcon } from './groupIcons';

type IconSource = {
  id?: number | string;
  IconName?: string;
  iconName?: string;
  TypeName?: string;
  typeName?: string;
  Name?: string;
  GroupName?: string;
  groupName?: string;
  Code?: string;
  code?: string;
  EventTypeGroupID?: number | string;
  eventTypeGroupId?: number | string;
  GroupID?: number | string;
  PTAFlg?: unknown;
  PtaFlg?: unknown;
  ptaFlg?: unknown;
};

const EXCLUSIVE_GROUP_ID = 99;

function displayName(row: IconSource | null | undefined): string {
  if (!row) return '';
  return String(row.TypeName || row.typeName || row.GroupName || row.groupName || row.Name || '');
}

function displayCode(row: IconSource | null | undefined): string {
  if (!row) return '';
  return String(row.Code || row.code || '');
}

function blob(row: IconSource | null | undefined): string {
  return `${displayName(row)} ${displayCode(row)}`.toLowerCase();
}

function typeGroupId(row: IconSource | null | undefined): number {
  if (!row) return 0;
  return Number(row.EventTypeGroupID ?? row.eventTypeGroupId ?? row.GroupID ?? 0);
}

export function isPtaEventType(type: IconSource | null | undefined): boolean {
  if (!type) return false;
  if (eventTypeHasPtaFlag(type as Record<string, unknown>)) return true;
  const id = Number(type.id);
  if (Number.isFinite(id) && id === PTA_EVENT_TYPE_ID) return true;
  return /profi.?t.?ability|profitability/.test(blob(type)) || /^pta$/.test(displayCode(type).toLowerCase());
}

export function isOlimpubEventType(type: IconSource | null | undefined): boolean {
  if (!type) return false;
  return /olimpub|olimp.?pub/.test(blob(type));
}

export function isTeamcraftEventType(type: IconSource | null | undefined): boolean {
  if (!type) return false;
  return /teamcraft|team.?craft/.test(blob(type));
}

export function isSpeedmeetingEventType(type: IconSource | null | undefined): boolean {
  if (!type) return false;
  return /speedmeeting|speed.?meeting/.test(blob(type));
}

export function isExclusiveGroup(group: IconSource | null | undefined): boolean {
  if (!group) return false;
  if (Number(group.id) === EXCLUSIVE_GROUP_ID) return true;
  return /exkluzív|exclusive/.test(blob(group));
}

export function isExclusiveEventType(type: IconSource | null | undefined): boolean {
  if (!type) return false;
  if (typeGroupId(type) === EXCLUSIVE_GROUP_ID) return true;
  return /exkluzív|exclusive/.test(blob(type));
}

function brandedModuleIcon(row: IconSource | null | undefined): string | null {
  if (isOlimpubEventType(row)) return OLIMPUB_BRAND.icon;
  if (isTeamcraftEventType(row)) return TEAMCRAFT_BRAND.icon;
  if (isSpeedmeetingEventType(row)) return SPEEDMEETING_BRAND.icon;
  return null;
}

/**
 * PTA → PTA logo; Olimpub / TeamCraft / SpeedMeeting → saját ikon;
 * EventJoy Exkluzív → EventJoy ikon; egyébként DB IconName.
 */
export function resolveEventTypeIcon(type?: IconSource | null): ResolvedIcon {
  if (!type) return resolveTypeIcon(null);
  if (isPtaEventType(type)) return { kind: 'img', value: ptaLogo };
  const moduleIcon = brandedModuleIcon(type);
  if (moduleIcon) return { kind: 'img', value: moduleIcon };
  if (isExclusiveEventType(type)) return { kind: 'img', value: EVENTJOY_BRAND.icon };
  return resolveTypeIcon(type.IconName || type.iconName);
}

export function resolveEventGroupIcon(
  group?: IconSource | null,
  typesInGroup: IconSource[] = []
): ResolvedIcon {
  if (isExclusiveGroup(group)) return { kind: 'img', value: EVENTJOY_BRAND.icon };
  if (typesInGroup.some((t) => isPtaEventType(t))) return { kind: 'img', value: ptaLogo };
  const fromGroupName = brandedModuleIcon(group);
  if (fromGroupName) return { kind: 'img', value: fromGroupName };
  const fromType = typesInGroup.map((t) => brandedModuleIcon(t)).find(Boolean);
  if (fromType) return { kind: 'img', value: fromType };
  const fromApi = group?.IconName || group?.iconName;
  if (fromApi) return resolveTypeIcon(fromApi);
  const id = Number(group?.id);
  return { kind: 'icon', value: GROUP_ICON_MAP[id] || 'sym_r_category' };
}

/** Wizard chip / selection.typeIcon: img:url vagy Material név. */
export function typeIconToken(type?: IconSource | null): string {
  const resolved = resolveEventTypeIcon(type);
  return resolved.kind === 'img' ? `img:${resolved.value}` : resolved.value;
}
