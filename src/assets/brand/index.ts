/**
 * EventJoy brand assets — core + module logos
 * Source: EventJoy_Brand_Package_v2
 */

import eventjoyLogoFull from './eventjoy/eventjoy_logo_full.svg';
import eventjoyLogoFullDark from './eventjoy/eventjoy_logo_full_dark.svg';
import eventjoyIcon from './eventjoy/eventjoy_icon.svg';
import eventjoyFavicon from './eventjoy/eventjoy_favicon.svg';

import klubhubLogoDark from './modules/klubhub/klubhub_logo_full_dark.png';
import klubhubLogoLight from './modules/klubhub/klubhub_logo_full_light.png';
import klubhubLogoTransparent from './modules/klubhub/klubhub_logo_full_transparent.png';
import klubhubIconTransparent from './modules/klubhub/klubhub_icon_transparent.png';
import klubhubIconOnWhite from './modules/klubhub/klubhub_icon_on_white.png';
import klubhubAppIcon from './modules/klubhub/klubhub_app_icon_gradient.png';
import klubhubFavicon from './modules/klubhub/klubhub_favicon.svg';

import summitproLogoDark from './modules/summitpro/summitpro_logo_full_dark.png';
import summitproLogoLight from './modules/summitpro/summitpro_logo_full_light.png';
import summitproIconTransparent from './modules/summitpro/summitpro_icon_transparent.png';
import summitproIconOnWhite from './modules/summitpro/summitpro_icon_on_white.png';
import summitproAppIcon from './modules/summitpro/summitpro_app_icon_gradient.png';
import summitproFavicon from './modules/summitpro/summitpro_favicon.svg';

import olimpubLogoDark from './modules/olimpub/olimpub_logo_full_dark.png';
import olimpubLogoLight from './modules/olimpub/olimpub_logo_full_light.png';
import olimpubIconTransparent from './modules/olimpub/olimpub_icon_transparent.png';
import olimpubIconOnWhite from './modules/olimpub/olimpub_icon_on_white.png';
import olimpubAppIcon from './modules/olimpub/olimpub_app_icon_gradient.png';
import olimpubFavicon from './modules/olimpub/olimpub_favicon.svg';

import teamcraftLogoDark from './modules/teamcraft/teamcraft_logo_full_dark.png';
import teamcraftLogoLight from './modules/teamcraft/teamcraft_logo_full_light.png';
import teamcraftIconTransparent from './modules/teamcraft/teamcraft_icon_transparent.png';
import teamcraftIconOnWhite from './modules/teamcraft/teamcraft_icon_on_white.png';
import teamcraftAppIcon from './modules/teamcraft/teamcraft_app_icon_gradient.png';
import teamcraftFavicon from './modules/teamcraft/teamcraft_favicon.svg';

import speedmeetingLogoDark from './modules/speedmeeting/speedmeeting_logo_full_dark.png';
import speedmeetingLogoLight from './modules/speedmeeting/speedmeeting_logo_full_light.png';
import speedmeetingIconTransparent from './modules/speedmeeting/speedmeeting_icon_transparent.png';
import speedmeetingIconOnWhite from './modules/speedmeeting/speedmeeting_icon_on_white.png';
import speedmeetingAppIcon from './modules/speedmeeting/speedmeeting_app_icon_gradient.png';
import speedmeetingFavicon from './modules/speedmeeting/speedmeeting_favicon.svg';

export type BrandModuleId =
  | 'eventjoy'
  | 'klubhub'
  | 'summitpro'
  | 'olimpub'
  | 'teamcraft'
  | 'speedmeeting';

export interface BrandModuleAssets {
  id: BrandModuleId;
  name: string;
  tagline: string;
  /** Full wordmark for dark UI backgrounds */
  logoDark: string;
  /** Full wordmark for light UI backgrounds */
  logoLight: string;
  /** Wordmark with transparent bg (dark-UI ready), if available */
  logoTransparent?: string;
  /** Standalone icon (transparent) — cards, chips */
  icon: string;
  /** Icon on white square */
  iconOnWhite: string;
  /** App-store style gradient icon */
  appIcon: string;
  favicon: string;
  /** Brand accent hex from package */
  primary: string;
}

export const EVENTJOY_BRAND = {
  id: 'eventjoy' as const,
  name: 'EventJoy',
  tagline: 'Mulass jól! :-)',
  logoLight: eventjoyLogoFull,
  logoDark: eventjoyLogoFullDark,
  icon: eventjoyIcon,
  favicon: eventjoyFavicon,
  primary: '#0EA5E9',
  gradient: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #14B8A6 100%)',
};

export const BRAND_MODULES: Record<Exclude<BrandModuleId, 'eventjoy'>, BrandModuleAssets> = {
  klubhub: {
    id: 'klubhub',
    name: 'KlubHub',
    tagline: 'Klubok, edzések, közösség.',
    logoDark: klubhubLogoDark,
    logoLight: klubhubLogoLight,
    logoTransparent: klubhubLogoTransparent,
    icon: klubhubIconTransparent,
    iconOnWhite: klubhubIconOnWhite,
    appIcon: klubhubAppIcon,
    favicon: klubhubFavicon,
    primary: '#F97316',
  },
  summitpro: {
    id: 'summitpro',
    name: 'SummitPro',
    tagline: 'Konferenciák, prémium.',
    logoDark: summitproLogoDark,
    logoLight: summitproLogoLight,
    icon: summitproIconTransparent,
    iconOnWhite: summitproIconOnWhite,
    appIcon: summitproAppIcon,
    favicon: summitproFavicon,
    primary: '#6366F1',
  },
  olimpub: {
    id: 'olimpub',
    name: 'Olimpub',
    tagline: 'Pubkvíz, verseny.',
    logoDark: olimpubLogoDark,
    logoLight: olimpubLogoLight,
    icon: olimpubIconTransparent,
    iconOnWhite: olimpubIconOnWhite,
    appIcon: olimpubAppIcon,
    favicon: olimpubFavicon,
    primary: '#F59E0B',
  },
  teamcraft: {
    id: 'teamcraft',
    name: 'TeamCraft',
    tagline: 'Csapatépítők.',
    logoDark: teamcraftLogoDark,
    logoLight: teamcraftLogoLight,
    icon: teamcraftIconTransparent,
    iconOnWhite: teamcraftIconOnWhite,
    appIcon: teamcraftAppIcon,
    favicon: teamcraftFavicon,
    primary: '#10B981',
  },
  speedmeeting: {
    id: 'speedmeeting',
    name: 'SpeedMeeting',
    tagline: 'B2B networking.',
    logoDark: speedmeetingLogoDark,
    logoLight: speedmeetingLogoLight,
    icon: speedmeetingIconTransparent,
    iconOnWhite: speedmeetingIconOnWhite,
    appIcon: speedmeetingAppIcon,
    favicon: speedmeetingFavicon,
    primary: '#8B5CF6',
  },
};

export function getBrandModule(id: BrandModuleId): BrandModuleAssets | typeof EVENTJOY_BRAND {
  if (id === 'eventjoy') return EVENTJOY_BRAND;
  return BRAND_MODULES[id];
}

export const BRAND_MODULE_LIST = Object.values(BRAND_MODULES);
