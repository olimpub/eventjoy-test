import klubhubIcon from './modules/klubhub/klubhub_icon_transparent.png';
import klubhubAppIcon from './modules/klubhub/klubhub_app_icon_gradient.png';

/** Csak a ténylegesen használt KlubHub assetek — a többi variant ne kerüljön a fő csomagba. */
export const KLUBHUB_BRAND = {
  id: 'klubhub' as const,
  name: 'KlubHub',
  tagline: 'Klubok, edzések, közösség.',
  icon: klubhubIcon,
  appIcon: klubhubAppIcon,
  primary: '#F97316',
};
