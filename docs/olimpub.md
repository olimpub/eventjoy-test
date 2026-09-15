# Olimpub kvíz (OP modul) — termék spec

**Backend szerződés (tábla, JSON, hibák, Outbox):** [`olimpub-backend.md`](./olimpub-backend.md). Ha eltérés van, a backend fájl a gazda.

EventType **43**. Flag: `EventTypes.OPFlg` (ugyanaz a minta, mint a PTA `PTAFlg` a 46-on). A PTA motor, asztal-sorsolás, `Pta.*` actionök **nem** keverednek ide.

v1 = teljes kör: 6 kérdéstípus, 8 extra játék, 4 tabella, display, kabala-csapatok, helyszíni DeviceId belépés.

---

## 0. Szókincs

| UI / OP | Master / DB | Megjegyzés |
|---|---|---|
| Kvíz | EventStatus **Játék** | a flow neve nem változik |
| Kvízmester | Játékmester szerep (`contributor`) | nincs jegy |
| Kabala | OP törzs | a kabala **neve = csapatnév** |
| Csapat | `OP.Team` (`TeamId`) | 1 csapat = 1 kabala; asztal csak ülés-hint |
| Kérdéskör | 8 kérdés egy témakörben | lásd §5 |
| Quiz | szervezői kérdés + média menedzsment | |
| Quizmester | élő vezérlő | szervező **ugyanazt** kapja |

Plüss szót **ne** használd.

---

## 1. Illeszkedés az EventJoy-hoz

### 1.1 Típus és flow

- `EventTypes.id = 43`, `OPFlg = 1`, `CanEnterFlg = 1`.
- Flow: **Tervezés → Szervezés → Jelentkezés → Bejelentkezés → Játék → Vége**.
- Nincs külön OP-flow, nincs „Sorsolás” státusz (az PTA).

### 1.2 Séma

Minden OP-tábla a **`OP`** SQL sémában. `dbo` csak a közös EventJoy (`tblEvent`, `tblEventUser`, `tblUser`, SignalR Outbox, …).

### 1.3 Szerepek és jegy

| Szerep | Jegy | Játszhat | Belépés |
|---|---|---|---|
| Szervező | nem kvíz-jegy | **nem** | organizer adatlap + Quiz + Quizmester |
| Kvízmester | **nincs jegy** | nem | csak vezérlő (+ ami a szerephez kell) |
| Játékos | játékos jegy | igen | játékos kliens |

Több kvízmester lehet. A szervező **admin**: minden kvízmester-funkció az övé is.

### 1.4 Csapatmodell

- Mindenki **csapatban** játszik. Az egyéni pont csak **shadow különdíj** (§8.4).
- `TeamId` + egyedi kabala. Kabala.Name = csapat megjelenített neve.
- A kiosztott kabalák száma = csapatok száma. `asztalok_szama` a varázslóban **hint** (hova üljön); lehet `null`. Céges random ülésrend: van kabala/csapat, nincs asztal.
- 1 asztal (ha van) = 1 csapat. Asztal a játékmenetben nem pontoz.

---

## 2. Mentés / varázsló

`POST /event/save` kap `OpSettings` objektumot, ha `OPFlg`. Különben `null`.

```json
{
  "OpSettings": {
    "DeskCountHint": 8,
    "MaxTeamSize": 6,
    "PlannedDurationMin": 90,
    "ShadowAwardFlg": true,
    "TopicIds": [1, 2, 5],
    "ExtraGameIds": ["EG1", "EG2", "EG3", "EG4", "EG5", "EG6", "EG7", "EG8"],
    "KabalaIds": [10, 11, 12]
  }
}
```

| Mező | Szabály |
|---|---|
| `DeskCountHint` | integer vagy `null`. Nem kapacitás, nem Team szám. |
| `MaxTeamSize` | integer ≥ 1. Csapatlétszám plafon (társbehívás). |
| `PlannedDurationMin` | 60, 90, 120, … 30 perc lépés. |
| `ShadowAwardFlg` | különdíj UI a végén. A shadow **mindig számolódik**. |
| `TopicIds` | az estére **engedélyezett** témakörök a repositoryból. Forduló csak ezekből. |
| `ExtraGameIds` | v1-ben a 8 mind mehet; a lista az estére bekapcsoltak. |
| `KabalaIds` | kiosztott kabalák → ennyi `OP.Team` jön létre. **Nem** lehet több kabala, mint amennyi a törzsben van. Üres lista = még nincs csapat (később kiosztás). |

Csapatjáték **mindig on**. Nincs XOR egyéni/csapat mód.

Hydrate: GET userdata `OpSettings` + `OpTeams` + `OpKabalas`.

---

## 3. FE felületek

Prefix: `/olimpub/event/:id/…` (PTA: `/profitability/…`). `eventRolePath` OPFlg-nél ide visz.

| Route | Ki | Mi |
|---|---|---|
| `…/manage` | szervező | PTA-szerű adatlap: státusz, KPI, csempék |
| `…/participants` | szervező | résztvevők + walk-in `+` + EventUID QR (Bejelentkezéstől) |
| `…/quiz` | szervező | **Quiz:** kérdések, Excel, témakör, média feltöltés + **egy kattintásos helyi letöltés** |
| `…/quizmaster` | szervező **és** kvízmester | **Quizmester** élő vezérlő |
| `…/` | játékos | kliens (aktuális kérdés, társbehívás QR) |
| `…/display` | TV | publikus *vagy* JWT; `meta.public`; nincs bottom nav |
| `…/results` | szervező / kvízmester | 4 tabella |

Szervezői csempék: Résztvevők, **Quiz**, **Kvízmester**, Eredmények, (Display link).  
Kvízmester adatlapján egy csempe: **Kvízmester** → `…/quizmaster`. A kérdésszerkesztő **nincs** a kvízmesternél.

Játékos **nem** látja a következő kérdést. Akkor kapja az aktuálisat, amikor a vezérlő **Kérdés indítása**.

Wizard: `StepOpSettings` típus 43-nál (PTA `StepPtaSettings` mintájára).

---

## 4. Kabala, csapat, belépés

### 4.1 Törzs — `OP.Kabala`

| Oszlop | |
|---|---|
| `id` | PK |
| `Name` | csapatnév, ha kiosztják |
| `ImageUrl` | opcionális |
| `ActiveFlg` | |

Eseményen: `OP.Team (EventID, KabalaID, TeamId, …)` — egy kabala **egyszer** / esemény.

### 4.2 Helyszíni EventUID QR

Ugyanaz, mint [`event-join-checkin.md`](./event-join-checkin.md): `/join/{EventUID}`, Bejelentkezéstől. OP-n a Belépés után, ha a QR-ben **nincs** `team`, a kliens kérhet kabalát — **kivéve** társ/csapat QR (lent).

### 4.3 Csapat / társ QR

URL: `/join/{EventUID}?team={TeamId}`

Folyamat = EventUID join, de `TeamId` előre kötve: **nincs** kabala-választó. `MaxTeamSize` tele → 400 `A csapat betelt.`

A kapitány (már a csapatban lévő játékos) **Társak behívása** ezt a QR-t mutatja.

### 4.4 DeviceId vendég-session (app nélküli csapatépítő)

A mai `DeviceId` csak session-gép, nem identitás. OP helyszínen:

`POST /auth/device-join`

```json
{
  "DeviceId": "uuid",
  "DeviceName": "EventJoy WebApp",
  "EventUID": "…",
  "TeamId": 12,
  "LastName": "Kovács",
  "FirstName": "Anna"
}
```

- Név kötelező. E-mail / telefon / OTP **nincs**.
- User placeholder: identifier `device:{DeviceId}`. JWT **erre az EventID-re zárt** (más esemény, chat, globális lista: 403).
- EventUser: Játékos, **Belépett**, `TeamId`.
- Ugyanaz a DeviceId + EventID → ugyanaz a User, visszalép.
- Kioszk: **Új játékos ezen a telefonon** → új `device_uuid`, ne keverje az előzőt.
- Később OTP e-mail/telefon → rendes fiók, User merge. Nem v1-kötelező, a join éljen nélküle.

Ez **nem** globális EventJoy-login.

Walk-in `+` (szervező gépel) **marad** — nincs telefonos vendég.

---

## 5. Kérdésbank és kérdéskör

### 5.1 Repository + esemény

A feltöltés **eseményhez** kötött, de a sor **bemásolódik** a globális repositoryba (`OP.Question` + `TopicID` + `TypeID`). Új kvíz tud **generálni** feltöltés nélkül a repositoryból (engedélyezett témakörök, típus-szabály).

Excel: **csak szervező**, `POST /op/questions/import`.

Média **nincs** az Excelben. Opcionális `MediaKey` (fájlnév), később a Quiz nézetben Azure-ra kötjük.

### 5.2 Típusok (mind v1)

| Code | Név | `P_alap` |
|---|---|---|
| `single` | Egyválasztós | 80 |
| `multi` | Többválasztós | 90 |
| `order` | Sorrendezés | 100 |
| `match` | Párosítás | 100 |
| `category` | Kategorizálás | 110 |
| `freetext` | Szabad szöveg | 120 |

### 5.3 Alapértelmezett válaszidő (ha az Excel üres)

Javaslat, amíg nincs más szám:

| Típus | mp |
|---|---|
| `single` | 20 |
| `multi` | 25 |
| `order` / `match` / `category` | 30 |
| `freetext` | 40 |

`M_gyors` a **kérdés saját** `TimeSec` értékével számol, nem fix 30-cal:  
`1 + 0.3 * ((T - t) / T)`, `t` clamp `[0, T]`. `t` = szerveres beérkezés a kérdés `StartedAtUtc`-tól.

### 5.4 Kérdéskör = 8 kérdés

Egy témakör egy körben **mindig 8** kérdés:

| Sorszám | Típus |
|---|---|
| 1, 3, 5, 7 | mindig `single` |
| 2, 4, 6, 8 | a másik öt típusból **négy különböző** (egy kimarad) |

Generáláskor a repositoryból, az estére engedélyezett témakörön belül.

### 5.5 Témakör a fordulóra

Forduló beállítás (`Op.SetRoundTopic`):

| Mód | Viselkedés |
|---|---|
| `fixed` | a körhöz már hozzárendelt témakör megy |
| `pick` | egy csapat választ: **első** vagy **utolsó** a Fő Tabellán (forduló előtt) |
| `wheel` | szerencsekerék a display-en |

A választóban / keréken **csak** az eseményen engedélyezett **és** még **egyetlen fordulóhoz sem kötött** témakör.

### 5.6 Excel oszlopok (`POST /op/questions/import`)

| Oszlop | Kötelező | |
|---|---|---|
| `Témakör` | igen | repository topic, upsert név alapján |
| `Típus` | igen | `single` / `multi` / `order` / `match` / `category` / `freetext` (HU alias oké) |
| `Kérdés` | igen | |
| `Opciók` | típusfüggő | `|` vagy külön oszlopok |
| `Helyes` | igen | index(ek), sorrend, párok, kategória-map, szinonimák `\|` |
| `IdőMp` | nem | üres → típus-default |
| `MediaKey` | nem | későbbi blob-kötés |

Csak szervező. 403 kvízmesternek.

---

## 6. Média (Azure + helyi cache)

1. Szervező a **Quiz** nézetben tölti az Azure Blobra (kérdés / extra játék / zene). Excelből **nem**.
2. **Egy kattintás: Letöltés az eszközre** — kvízmester és szervező gépén (ők játsszák a hangot: Bluetooth / kábel a PA-ra).
3. Lejátszás **először helyi** fájl, ha nincs meg → Blob. Lefedettség ne öljön zenét/képet.
4. v1: **játékos kliensen nincs média**. Display kaphat képet (kérdés / mozaik állókép), hangot a kvízmester/szervező eszköze viszi.

Helyi tároló:

- Capacitor: `OP/{EventID}/media/{MediaKey}`
- PWA: Cache API / OPFS ugyanazzal a kulccsal

A vezérlő mutatja: helyben megvan / hiányzik / letöltés folyamatban.

---

## 7. Élő játékmenet és SignalR

### 7.1 Csoportok

Meglévő: `event_{id}_organizer` / `_contributor` / `_participant` / `_gamer` / `_user_{EventUserID}`.

**Új:** `event_{id}_display` — TV. A kvízmester parancsai ide mennek (mit mutasson).

Display auth **mindkettő**:

- szervező/kvízmester JWT (belépett TV-böngésző)
- display-token / PIN a `/display` queryben (kioszk, nincs teljes fiók)

Join: `POST /signalr/join` + `display` role, ha a token/JWT engedi.

### 7.2 Display állapotok

`idle` | `question_active` | `media_playing` | `draw_animation` (kerék) | `leaderboard`

### 7.3 Vezérlő (mobil)

- Következő kérdés / Kérdés indítása / Kérdés megállítása (idő lezár)
- Média play/pause/stop — **ezen az eszközön**, helyi fájl
- Büntető (csapat + pont) — szervező is
- Forduló lezárása → utána: eredmények a kliensekre + kivetítés a TV-re
- Extra játék UI (§10)

A kvízmester **látja** a kérdést + helyes választ a vezérlőn. A játékos csak az indított kérdést.

### 7.4 Kliens validáció vs szerver pont

Szándék: gyors UX, a tabella SQL.

1. **Kérdés indítása** → participant + display kapja a kérdést. A participant Pinia megkapja a **helyes megoldást** is (helyi értékeléshez). A *következő* kérdés nem megy ki.
2. Játékos **POST** `Op.SubmitAnswer` (csak a válasz + `QuestionId`). Nincs pont a body-ban.
3. Idő lejárt / megállítás → a kliens **helyben**: helyes / részben helyes / rossz.
4. Tabella: kvízmester/display **GET** ` /op/leaderboard/:eventId` → SQL aggregát. A szerver **újraértékeli** a POST-olt válaszokat. A kliens pontját **ne** hidd el.

Csalás (Pinia dump): a TV/tabella akkor is a SQL-t mutatja.

---

## 8. Pontozás

Mindig a szerver. `t` = másodperc a `StartedAtUtc`-tól a POST-ig.

### 8.1 Nyers kérdéspont — csapat

**S = P_alap × M_gyors × M_csapat**  (a csapat **egy** S-e a kérdésre)

- `M_gyors`: a csapat **első helyes** beküldőjének `t`-je. Ha nincs helyes: irreleváns, S = 0.
- `M_csapat` = `1 + (C - 1) * 0.03 - (W * 0.03)`
  - **C** = helyeset beküldő csapattagok
  - **W** = **rosszat** beküldők
  - **Nem válaszol** → se C, se W (nincs büntetés)
  - **C = 0** → S = 0 (senki nem talált, vagy senki nem küldött)

Egy telefon = egy EventUser. Ha az a telefon nem küld: nem W. Ha a csapatból senki nem küld: C=0 → 0.

Részben helyes (`multi` / `order` / `match` / `category`): C-be **nem** számít, W-be sem, hacsak a típus 0%-os. Részpont: `P_alap * (helyes_elemek / összes) * M_gyors`, `M_csapat` a teljesen helyes C / teljesen rossz W alapján. (Ha ez túl bonyolult implementálni v1-ben: részben helyes = W, 0 S — **ne**, a kliens „részben helyes”-t mutat; szerveren arányos P_alap, C csak 100%-nál.)

**Lock v1 részpont:** arányos `P_alap`, C csak tökéletes válasznál, W csak 0%-nál. Részben: nem C, nem W.

### 8.2 Szabad szöveg

Normalizálás: lower, ékezet strip (NFD), whitespace collapse.

Találat, ha **bármelyik** igaz:

- egyezés egy szinonimával
- Levenshtein ≤ 1 (egy karakter elírás)
- hasonlóság ≥ 0.80 a legjobb szinonimához
- **név:** a szinonima tokenjei (keresztnév / családnév) önmagukban is jók

Több elfogadott válasz az Excel `Helyes` mezőjében `|` szeparálva.

### 8.3 Fordulópont F

Nyers S összeg a 8 kérdésre → rangsor →

**F = round(P_min + (P_max - P_min) × ((N - R) / (N - 1)))**

| N csapat | P_max | P_min |
|---|---|---|
| ≤ 5 | 100 | 50 |
| 6–10 | 100 | 40 |
| 11–20 | 100 | 30 |
| ≥ 21 | 100 | 20 |

N = 1 → F = P_max.

Holtverseny: mind a **jobb** hely pontját kapja, a következő hely üres (két 2. → a következő **4.**). Extra Top5 **ugyanez**.

F a **forduló lezárásakor** számolódik, nem kérdésenként.

### 8.4 Shadow egyéni

Minden POST-nál: `S_egyeni = P_alap × M_gyors` (tökéletes / arányos P_alap, **nincs** M_csapat). A végén: „ki szerezte volna a legtöbbet egyéniben?”

Egy fős csapat: M_csapat a 8.1 képlettel (C=1,W=0 → 1.0).

### 8.5 Büntető

Szervező és kvízmester. Csapat + egész pont. Undo: ellentétes tétel. A **Fő Tabellából** jön le, élőben a következő leaderboard GET-kor (nincs külön „fordulózár”).

### 8.6 Extra pont

Az extra **játék lezárása** után (fordulózár mintára) adódik a Fő Tabellához. Nem kérdésenként.

---

## 9. Tabellák

SQL-ben (vagy indexed view), GET `/op/leaderboard/:eventId?board=`

| `board` | Képlet |
|---|---|
| `main` | `Sum(F) + Sum(Extra) - Penalty` — default TV + kliens |
| `quiz` | `Sum(F)` |
| `games` | `Sum(Extra)` |
| `shadow` | `Sum(S_egyeni)` játékosonként |

Nincs folyamatos push minden POST-ra. Display akkor frissül, ha a vezérlő **kivetítés** / leaderboard GET, vagy `Op.ShowLeaderboard` SignalR a `display` (+ opcionális `gamer` chip) csoportra.

---

## 10. Extra játékok (mind v1)

Csak az `OpSettings.ExtraGameIds`-ben lévők. Pont a játék **lezárása** után a main boardra.

| ID | UI | Pont |
|---|---|---|
| **EG1 Párbaj** | 5 rapid kérdés | kérdésenként csak a **leggyorsabb helyes** +10. Döntetlen nincs (szerver `t`, kisebb nyer; egyenlő `t` → kisebb EventUserID). Max 50. |
| **EG2 Mozaik** | játékos: nagy Megállít (SignalR a vezérlőnek / display kép stop). Hang a kvízmester/szervező gépén. | JM/szervező jóváhagyja a bemondást. Jó: **+20** annak a csapatnak, zenénként 1 nyertes, következő feladvány. |
| **EG3 Karaoke** | vezérlőn csapatlista, koppintásra létszám (0..n) | éneklőnként **+10** a csapatnak |
| **EG4 Reverse** | 5× freetext (cím/előadó) | Top5: 50/40/30/20/10, holtverseny §8.3 |
| **EG5 Generációk** | 10–15 mp single rapid | ugyanaz a Top5 |
| **EG6 Műsorvezető** | TV kép (display), telefon freetext + fuzzy | Top5 |
| **EG7 Filmguru** | single rapid | Top5 |
| **EG8 Ki beszél?** | single vagy freetext | Top5 |

v1 kliensen extra játéknál sem szól zene a telefonon, csak UI + display kép.

---

## 11. API — `POST /op/change`

Gyökér mint `/event/change`: `EventID`, `Action`, `Payload`. Auth JWT (szervező vagy kvízmester, actionenként). Device-join token csak `Op.SubmitAnswer` + társ QR kontextus.

| Action | Ki | Payload |
|---|---|---|
| `Op.StartQuestion` | QM / szerv. | `RoundId`, `QuestionId` |
| `Op.StopQuestion` | QM / szerv. | `QuestionId` |
| `Op.NextQuestion` | QM / szerv. | `RoundId` |
| `Op.SubmitAnswer` | játékos | `QuestionId`, `Answer` (JSON típus szerint) |
| `Op.CloseRound` | QM / szerv. | `RoundId` — számolja F-et |
| `Op.PublishRound` | QM / szerv. | `RoundId` — kliens + opcionális display |
| `Op.ShowLeaderboard` | QM / szerv. | `Board` (`main`…) |
| `Op.SetRoundTopic` | QM / szerv. | `RoundId`, `Mode` (`fixed`/`pick`/`wheel`), `TopicId?`, `PickerTeamId?` (`first`/`last`) |
| `Op.Penalty` | QM / szerv. | `TeamId`, `Points` (negatív), `UndoId?` |
| `Op.StartExtra` | QM / szerv. | `ExtraGameId` |
| `Op.StopExtra` | QM / szerv. | `ExtraGameId` — extra pontok beírása |
| `Op.MosaicBuzz` | játékos | `TeamId` |
| `Op.MosaicJudge` | QM / szerv. | `TeamId`, `CorrectFlg` |
| `Op.KaraokeSet` | QM / szerv. | `TeamId`, `SingerCount` |

GET:

| | |
|---|---|
| `GET /op/event/:id` | settings, teams, round state, questions **vezérlőnek** teljes, játékosnak csak aktuális |
| `GET /op/leaderboard/:id` | lásd §9 |
| `GET /op/questions/:eventId` | szervező Quiz |
| `POST /op/questions/import` | Excel |
| `POST /op/media` | blob feltöltés |
| `GET /op/media/manifest/:eventId` | helyi letöltés listája (url + MediaKey + hash) |

SignalR mini a `display` + `gamer` felé: `Action`, `EventID`, display `State`, aktuális kérdés **helyes válasz nélkül** a display-en (a TV-n a kérdés szöveg/opció elég; a helyes mehet a vezérlő `contributor` csatornájára).

Participant `StartQuestion` payload: kérdés + **Correct** (Pinia). Display: kérdés **Correct nélkül**.

---

## 12. OP séma (táblák, váz)

- `OP.Kabala`
- `OP.EventSettings` (save snapshot)
- `OP.Team` (EventID, KabalaID)
- `OP.TeamMember` (TeamId, EventUserID)
- `OP.Topic` (repository)
- `OP.Question` (repository + Type, TimeSec, Correct JSON, MediaKey)
- `OP.EventQuestion` (EventID, QuestionID, RoundId nullable — az estére másolt/generált 8-asok)
- `OP.Round` (EventID, TopicID, Status, Mode)
- `OP.Answer` (EventUserID, EventQuestionID, Answer JSON, ReceivedAtUtc)
- `OP.RoundScore` (TeamId, RoundId, RawS, Place, F)
- `OP.ExtraScore` (TeamId, ExtraGameId, Points)
- `OP.Penalty`
- `OP.ShadowScore` (EventUserID, EventQuestionID, S)
- `OP.Media` (EventID, MediaKey, BlobUrl, Hash)

`tblEventUser` marad dbo. Team tag = EventUser játékos.

---

## 13. Nem v1

- Játékos kliensen hang/kép lejátszás (online kvíz később)
- Device-vendég merge e-mailre (a join éljen nélküle)
- PTA sorsolás / asztal-GM
- Szervező játékosként

---

## 14. Nyitott számok (nem blokkolják a szerződést)

- Pontos default `TimeSec` (§5.3) — fenti javaslat
- Display PIN hossza (4 szám)
- Mozaik zenék száma / honnan a media lista
- Párbaj 5 kérdés honnan (ugyanaz a repository, `single` rapid)

Ha ezekre van szám, egy soros delta a spechez elég.
