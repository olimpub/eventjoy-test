/**
 * EventJoy brand — csak az EventJoy core kerül a barrelbe.
 * Modul-assetek: importáld közvetlenül (klubhub.ts, olimpub.ts),
 * vagy loadBrandModule()-lal, különben minden PNG a fő csomagba kerül.
 */

export type { BrandModuleId } from './types';
export { EVENTJOY_BRAND } from './eventjoy';

import type { BrandModuleId } from './types';

type LoadedBrand =
  | typeof import('./eventjoy').EVENTJOY_BRAND
  | typeof import('./klubhub').KLUBHUB_BRAND
  | typeof import('./olimpub').OLIMPUB_BRAND
  | typeof import('./teamcraft').TEAMCRAFT_BRAND
  | typeof import('./speedmeeting').SPEEDMEETING_BRAND;

export async function loadBrandModule(
  id: Exclude<BrandModuleId, 'eventjoy'>
): Promise<LoadedBrand | null> {
  switch (id) {
    case 'klubhub':
      return (await import('./klubhub')).KLUBHUB_BRAND;
    case 'olimpub':
      return (await import('./olimpub')).OLIMPUB_BRAND;
    case 'teamcraft':
      return (await import('./teamcraft')).TEAMCRAFT_BRAND;
    case 'speedmeeting':
      return (await import('./speedmeeting')).SPEEDMEETING_BRAND;
    default:
      return null;
  }
}
