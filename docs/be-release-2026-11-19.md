# Backend teendők — PTA release (2026-11-19)

A frontend `test` és `main` ága ezt a verziót viszi. A teszt felület `https://apptest.eventjoy.hu`, az éles `https://app.eventjoy.hu`. Az API-nak a teszt (`apitest` / `eventjoy-apptest`) és az éles (`api` / `eventjoy-test`) adatbázison egyeznie kell ezzel.

A részletes szerződések a hivatkozott fájlokban vannak. Itt az van, amit ehhez a release-hez a szerveren el kell végezni.

## Már a teszt API-n van, élesre is kell

Ezek a teszt adatbázison lefutottak (005, 006, 007). Élesre ugyanez a csomag kell, C# újratelepítés nélkül, ha csak az eljárások és a táblák változtak.

1. **Négyes döntő** — `docs/pta-final-four-backend.md`. `Pta.SeatFinal`. A döntő pontja nem kerül az összesítésbe. Az 1–4. hely a döntő asztal sorrendje, pont nélkül.
2. **Különdíjak** — `docs/pta-special-prizes-backend.md`. `PtaSpecialPrizes` az esemény mentésén, `EventSpecialPrizes` a datasheet és a display GET-ben, `Pta.SetSpecialPrizeWinner`.
3. **Pontot kap** — `docs/pta-score-count-backend.md`. `PTA.tblEventPlayer.ScoreCountFlg` (BIT NOT NULL, default 1). `Pta.SetScoreCount`. A `PTA.spGetEventDisplayData` játékoslistájában legyen `ScoreCountFlg`. A `Pta.ReplaceDraw` örökítse a flaget. A `Pta.CloseRound` és a `Pta.PublishRound` a kikapcsolt játékos `FinalPoint`, `FinalTruckPoint`, `FinalPosition` mezőjét ürítse. Az aggregálás szerepkörre nem szűr: csak a flag és az, hogy van-e `tblEventPlayer` sor.

## Ehhez a release-hez még fel kell tenni, tesztre és élesre

### 1. Meghívó import

`docs/invite-import-role-backend.md`, eljárás: `EJ.spImportInvitations`.

A mostani „Már résztvevő” ellenőrzés az egész fájlt eldobja, ha az e-mailnek már van sora az eseményen. Ettől a régiót sem lehet utólag rátenni egy már bent lévő játékosra.

Elvárt viselkedés:

- Ugyanaz az e-mail, másik szerepkör: új `tblEventUser`, a fájl többi sora is megy.
- Ugyanaz az e-mail, ugyanaz az aktív szerepkör: nem hiba. A jegy frissül. A játékos `OrganizationName`, `TeamName`, `CompanyName`, `RegionName` értéke a fájlból felülíródik. Új meghívó e-mail nem megy. A `ValidationCode` és a lejárata a már bent lévő embernél nem cserélődik.
- Inaktív ugyanaz a szerepkör: a sor újra aktív, a csoportosítás frissül.
- A fájlon belül ugyanaz az e-mail ugyanabban a szerepkörben kétszer: a második sor `Már ebben a szerepkörben szerepel a fájlban`, és semmi nem mentődik.
- A játékos sor továbbra is csak `RoleTypeID = 3`.
- Kikapcsolt csoportosítás továbbra is nullázódik. A régió csak akkor íródik be, ha `RegionGrpFlg = 1`.

### 2. Kivetítő adatok lezárt fordulóra

Eljárás: `PTA.spGetEventDisplayData`, a `GameSchedules` eredményhalmaz.

A pontmezők (`Amount`, `OnTrack`, `Position`, `ResultPoint`, `FinalPoint`) jelenleg csak publikált fordulón (`EventRoundStatusID = 5`) mennek ki. A különdíj fal ettől publikálás előtt üres, és „A különdíj még nem hirdethető ki” szöveget mutat.

A lezárt forduló is adja a pontokat. A publikált feltétel marad a leaderboard parancsnál (`Pta.ShowDisplay`, státusz 5). Csak a display adatolvasás bővül:

```sql
CASE WHEN er.EventRoundStatusID IN (4, 5) THEN gs.Amount ELSE NULL END AS Amount,
CASE WHEN er.EventRoundStatusID IN (4, 5) THEN gs.OnTrack ELSE NULL END AS OnTrack,
CASE WHEN er.EventRoundStatusID IN (4, 5) THEN gs.Position ELSE NULL END AS Position,
CASE WHEN er.EventRoundStatusID IN (4, 5) THEN gs.ResultPoint ELSE NULL END AS ResultPoint,
CASE WHEN er.EventRoundStatusID IN (4, 5) THEN gs.FinalPoint ELSE NULL END AS FinalPoint,
```

A `4` a lezárt, az `5` a publikált forduló státusza.

## Frontend, amihez nincs új szervermunka

A felület ezeket már így csinálja, a fenti eljárások mellett:

- A forduló felirata a játéktípus `OrderIndex` és `RName` mezője, nem a `RoundID`.
- A Pontot kap kapcsoló csak a játékos szerkesztőlapján van.
- A különdíj a vetítés vezérlőn külön csoport. A sorsolás újrahúzható. A falon a nevek futnak, aztán a nyertesen állnak meg.
- A csoportvetítés egy összesített lista: csoport összpont, alatta a tagok saját pontja.
- A játékoslista a döntő után a négy döntőst elöl mutatja, pont nélkül.
