# EventJoy brand assets

Source: `EventJoy_Brand_Package_v2/eventjoy-brand`

## Layout

```
brand/
├── eventjoy/          → core SVG logos + favicon
├── modules/
│   ├── klubhub/
│   ├── summitpro/
│   ├── olimpub/
│   ├── teamcraft/
│   └── speedmeeting/
└── index.ts           → typed imports (EVENTJOY_BRAND, BRAND_MODULES)
```

## Per module files

| File | Use |
|------|-----|
| `*_logo_full_dark.png` | Wordmark on dark UI |
| `*_logo_full_light.png` | Wordmark on light UI |
| `*_logo_full_transparent.png` | Wordmark, transparent bg (KlubHub) |
| `*_icon_transparent.png` | Icon-only (cards, chips) |
| `*_icon_on_white.png` | Icon on white |
| `*_app_icon_gradient.png` | Store / large tile |
| `*_favicon.svg` | Vector favicon |

## Usage

```ts
import { BRAND_MODULES, EVENTJOY_BRAND } from 'src/assets/brand'

// Dark app header
<img :src="EVENTJOY_BRAND.logoDark" alt="EventJoy" />

// Module chip
<img :src="BRAND_MODULES.klubhub.icon" alt="KlubHub" width="32" />
```
