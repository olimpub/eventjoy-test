/** RoleType alapján: szervező / közreműködő / résztvevő */

export type MembershipRoleKind = 'organizer' | 'contributor' | 'participant';

function foldLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function membershipRoleKind(role: {
  isOrganizer?: boolean;
  roleTypeName?: string | null;
  roleName?: string | null;
}): MembershipRoleKind {
  const hay = foldLabel(`${role.roleTypeName || ''} ${role.roleName || ''}`);
  if (role.isOrganizer || hay.includes('szervez') || hay.includes('organizer')) {
    return 'organizer';
  }
  if (hay.includes('reszvev') || hay.includes('jatekos') || hay.includes('participant')) {
    return 'participant';
  }
  return 'contributor';
}

/**
 * Lista-státusz: résztvevő előnyt élvez a közreműködővel szemben.
 * Csak szervezői szerepkörnél nincs megjeleníthető státusz.
 */
export function pickDisplayEventUser<T>(
  rows: T[],
  kindOf: (row: T) => MembershipRoleKind
): T | null {
  const list = rows || [];
  return (
    list.find((row) => kindOf(row) === 'participant') ||
    list.find((row) => kindOf(row) === 'contributor') ||
    null
  );
}
