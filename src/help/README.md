# Súgó tartalom

A felhasználói súgó **a kódban** él (nincs BE). Új cikk = új markdown.

## Fájlok

| Útvonal | Szerep |
|---|---|
| `src/help/articles/*.md` | Cikkek |
| `src/help/catalog.ts` | Betöltés, route → cikk |

## Cikk formátum

```md
---
id: home
title: Főoldal
summary: Egy mondat a listához.
routes: home, my_events
audience: all
order: 10
---

## Címsor

Szöveg **félkövérrel**.

- lista
```

- `id`: URL és key (`/help/home`)
- `routes`: Vue `route.name` értékek, vesszővel. Ezeken nyílik a fejléc `?`
- `audience`: `all` | `player` | `organizer`
- Fejezet ugrás: `### Cím {#section-id}` — almenünél a fejléc `?` ide görget

A csemperácson nincs külön súgógomb. Belépés egy almenübe (Résztvevők, Anyagok, Jegykezelés, Játék…) → a fejléc `?` az aktuális képernyő infóját nyitja.

A fejléc `?` csak a `MainLayout` oldalain él. Dialógusok (új esemény varázsló) takarják: a cikk akkor is a Súgó listából elérhető.
