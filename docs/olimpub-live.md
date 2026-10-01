# Olimpub élő menet — backend szerződés

Dátum: 2026-09-28. Ez a helyszíni csapatépítő kör szerződése: állandó belépő QR, egy aktuális esemény, nickname-es device belépés, négy SignalR-csatorna, kérdésállapot, kliens verdikt, backend pont, újracsatlakozás.

A kérdésfeltöltés, a körgenerálás, a média és a pontozó képletek maradnak: [`olimpub-backend.md`](./olimpub-backend.md), [`olimpub-question-save.md`](./olimpub-question-save.md), [`olimpub.md`](./olimpub.md) §5–§8.

Ha ez a fájl ütközik a régebbi szöveggel, **ez a fájl az irányadó** az alábbiakon:

- `POST /auth/device-join` név mezői
- `Op.SubmitAnswer` osztályozása
- a gyorsasági `t` forrása
- **négy** SignalR csoport: `organizer`, `gamemaster`, `gamer`, `display` — nincs `contributor`, `participant`, `user_*`
- `Op.StartQuestion` **nem** megy a displayre (nem vetítés)
- a display **igen** kapja: CastDisplay / ShowLeaderboard, SubmitAnswer számláló, React; lobby Join/Leave: **vékony ping**, TV GET `/op/event`
- a játékmester csoport neve `gamemaster`

Élő hívás továbbra is `POST /op/game/change`, payload PascalCase `ID`.

---

## Nyitott pontok

Ezeket a lenti szöveg **javasolt zárolásként** tartalmazza. Ha más a szándék, a zárolás cserélendő, a többi szakasz nem.

1. **Csapat.** A belépés csapat nélkül sikerül. Ha az eseményen van kabala/`OP.Team`, válasz csak `Op.JoinTeam` után küldhető. Ha nincs egyetlen csapat sem, a válasz személyes (shadow), csapat-tabella ezt a játékost kihagyja.
2. **Folyamatban.** Az Indítás `active` állapot, akkor is, ha még nincs válasz. `AnswerCount > 0` külön bit: „már jött válasz”.
3. **Nickname oszlop.** Új `tblUser.Nickname`. Keresztnév, családnév, e-mail, telefon `NULL`. A nickname nem megy a `FirstName` mezőbe.
4. **Aktuális flag.** Az esemény szervezője kapcsolja. Bekapcsoláskor minden más Olimpub eseményről lekerül, egy tranzakcióban.
5. **Két játékmester.** Nincs kizárólagos kéz. Mindkettő ugyanazt a snapshotot látja. A vezérlő hívás vihet `ExpectedStateVersion`-t; eltérésnél 409, a másik fél frissít, és onnan viszi tovább.

---

## 1. Mi változatlan

A szervező a játék előtt feltölti és összeállítja a tartalmat. Ehhez nincs új tábla és nincs új action.

| Már megvan | Hol |
|---|---|
| Kvízkérdés mentés, csak `pending` | `POST /op/question/save` |
| Excel import, extra készlet külön | `POST /op/questions/import` |
| Kör + 8 kérdés | `POST /op/round/generate` |
| Média | [`olimpub-media.md`](./olimpub-media.md) |
| Képletek: `P_alap`, `M_gyors`, `M_csapat`, forduló `F`, shadow, extra | [`olimpub.md`](./olimpub.md) §8 |

A helyszíni körben **nincs előre feltöltött résztvevő**. Üres `EventUser` lista érvényes állapot. A játékosok a QR-rel jönnek létre.

A játékmester menü a szervezőn és a játékmesteren ugyanaz a vezérlő. A kérdésszerkesztő továbbra is csak a szervezőé.

---

## 2. Állandó belépő URL és egy aktuális esemény

A kinyomtatott QR **nem** tartalmaz `EventUID`-t és nem változik eseményenként.

Útvonal, a publikus app originjén:

`/olimpub/join`

Példa: `https://{app-host}/olimpub/join`. Query nélküli. Ezt lehet papírra tenni.

### 2.1 `CurrentFlg`

`OP.EventSettings.CurrentFlg` bit, default 0. Az Olimpub események között **legfeljebb egy** sor lehet 1.

`POST /op/game/change`

```json
{
  "EventID": 89,
  "Action": "Op.SetCurrent",
  "Payload": { "Current": true }
}
```

| Szabály | |
|---|---|
| Ki | az esemény szervezője |
| `Current: true` | egy tranzakció: minden más `OPFlg` esemény `CurrentFlg = 0`, ez `1` |
| `Current: false` | csak ezt a sort nullázza |
| Státusz | Szervezés től kapcsolható, hogy a QR a játék napja előtt is feloldjon |
| Hibák | nem OP esemény → 400 `Nem Olimpub esemény.` Más szerep → 403 |

### 2.2 `GET /op/current`

Nincs JWT.

200, ha van aktuális:

```json
{
  "ReturnValue": 1,
  "EventID": 89,
  "EventUID": "…",
  "Title": "…",
  "JoinOpen": true
}
```

`JoinOpen` akkor igaz, ha a státusz Bejelentkezés vagy későbbi. Nincs aktuális esemény → 404 `Nincs aktuális Olimpub esemény.`

A QR oldal ezt hívja. Ha `JoinOpen` hamis, a felület megmutatja az esemény címét, és a belépés gomb nem hív device-joint.

---

## 3. Nickname és device belépés

`POST /auth/device-join`. Nincs JWT. Nincs OTP, nincs e-mail, nincs SMS.

```json
{
  "DeviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "DeviceName": "EventJoy WebApp",
  "Nickname": "Béla"
}
```

`EventUID` nincs a nyomtatott QR-ben. Ha a body-ban mégis jön, azt az eseményt használd (teszt). Ha nincs, a `CurrentFlg = 1` esemény az cél. Nincs ilyen → 404, ugyanaz a szöveg, mint a `GET /op/current`-nél.

| Mező | Szabály |
|---|---|
| `DeviceId` | GUID. Identifier típus **Device**, `Value` = lower(guid). Unique (Type, Value) ahol ActiveFlg=1 |
| `Nickname` | első belépéskor kötelező, trim, 2–24. **Üres / hiányzik = visszalépés** (lásd alább) |
| `FirstName`, `LastName`, `Email`, `Phone` | mind `NULL`. A nickname **nem** a FirstName |
| `TeamId` | ezen a híváson nincs. Csapat később, `Op.JoinTeam` |

Lépések:

1. Cél esemény: body `EventUID`, különben a current. Active, `OPFlg`. Státusz Bejelentkezés előtt → 400 `A helyszíni belépés a bejelentkezéstől él.`
2. Device identifier. Van User → az. Nincs **és van Nickname** → `INSERT tblUser` (`Nickname`, a négy név/elérhetőség mező `NULL`) + identifier. Ne küldj levelet. Nincs User **és nincs Nickname** → 404 `Nincs belépés ezen az eszközön.` Ne hozz létre usert.
3. **Visszalépés (QR újraolvasás, app bezárás):** `Nickname` üres / hiányzik. Ha a DeviceId-hez van User, és azon a cél eseményen van aktív Játékos `EventUser` (Belépett vagy bármely aktív játékos sor) → **200**, új JWT, a **tárolt** Nickname. Ne kérj becenevet, ne hozz új usert / EventUser-t. Ha nincs ilyen EventUser ezen az eseményen → 404 `Nincs belépés ezen az eszközön.` (a FE ekkor mutatja a becenév mezőt).
4. Ismételt belépés **becenévvel**, ugyanazzal a DeviceId-vel: van már EventUser → ne duplikáld, JWT újra. Még nincs válasz ezen az eseményen → `Nickname` frissül. Van már válasza → a tárolt nickname marad.
5. `EventUser`: Játékos szerep, státusz **Belépett**, ugyanaz a minta, mint a helyszíni beléptetés (nincs meghívó levél).
6. JWT: `TokenKind: "OpDevice"`, `EventID`, `EventUserID`. Más eseményre a token 403. Lejárat 12 óra elég. A path-lista: saját event GET, `Op.SubmitAnswer`, `Op.React`, `Op.JoinTeam`, `Op.LeaveTeam`, `Op.MosaicBuzz`, `POST /signalr/join`.

A 200 válaszban a `JwtToken` / `Token` mellett add vissza a `Nickname`-et is, hogy a FE ne kérje újra.

200:

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "Belépés kész.",
  "Token": "…",
  "EventID": 89,
  "EventUserID": 321,
  "Nickname": "Béla"
}
```

Ugyanaz a DeviceId másik Olimpub eseményen: ugyanaz a User, új EventUser, az új eseményre szóló JWT.

Megjelenített név minden tabellán és listán: `Nickname`. Ha üres (régi sor), essen vissza a FirstName + LastName-re.

### 3.1 Csapat utána

`Op.JoinTeam` `{ "TeamID": 12 }` változatlan szabály: tele csapat 409, már más csapatban 409.

Csapatcsere az **egész játék alatt**, kérdés *között*: külön `Op.LeaveTeam`, utána új `Op.JoinTeam`. Szerződés: [`olimpub-player-lobby.md`](./olimpub-player-lobby.md). Active kérdés alatt Leave → 400.

`Op.SubmitAnswer` csapat nélkül:

- van legalább egy `OP.Team` az eseményen → 400 `Válassz csapatot.`
- nincs csapat → a válasz elfogadható, pont csak shadow sorba megy, csapat `RawS`-be nem számít

---

## 4. Négy csatorna

Csak ezek léteznek. `POST /signalr/join` más csoportnevet elutasít.

A csoportnév `event_{EventID}_{szerep}`.

| Csatorna | Csoport | Ki csatlakozik | Mit kap |
|---|---|---|---|
| Organizer | `event_{id}_organizer` | szervező (manage) | élő vezérlő + szervezői actionök |
| Game Master | `event_{id}_gamemaster` | kvízmester; szervező **a QM képernyőn** | teljes vezérlő |
| Gamer | `event_{id}_gamer` | játékos / device | kérdésállapot, helyes az aktív kérdésen, Join/Leave |
| Display | `event_{id}_display` | TV (display token vagy staff JWT) | **minden vetítés** + kérdés közben a számláló és az emoji |

Nincs `contributor`, `participant`, `user_{EventUserID}`.

| Ki | Join |
|---|---|
| Szervező manage | `organizer` |
| Szervező a kvízmester képernyőn | `organizer` + `gamemaster` |
| Kvízmester | `gamemaster` |
| Játékos | `gamer` |
| TV | `display` |

A TV nem gamer. A játékos nem display.

### 4.1 Ki mit kap egy actionből

| Action | gamer | gamemaster | organizer | display |
|---|---|---|---|---|
| `Op.StartQuestion`, `StopQuestion`, `NextQuestion`, `ReopenQuestion`, `CloseRound`, `PauseQuestion` | igen | igen | igen | **nem** — a TV a kint lévő `CastDisplay`-en marad |
| `Op.StartExtra`, `StopExtra`, `StartExtraQuestion`, `StopExtraQuestion`, `MosaicBuzz`, `MosaicJudge` | igen | igen | igen | **nem** — a TV a kint lévő `CastDisplay`-en marad |
| `Op.SubmitAnswer` | nem | igen | igen | **igen** — csak `AnswerCount` + `RosterCount`, nincs válasz / Correct |
| `Op.React` | nem | igen (tally) | igen | **igen** — egy emoji, nincs név |
| `Op.CastDisplay`, `Op.ShowLeaderboard` | nem | igen | igen | **igen** — a teljes vetítés |
| `Op.SetCurrent`, `Op.Penalty` | nem | igen | igen | nem |
| `Op.JoinTeam`, `Op.LeaveTeam` | igen | igen | igen | **igen, ha face `lobby`** — v1: vékony ping (`Action`, `EventID`, `StateVersion`). A TV **egyszer** GET `/op/event` (ritka, nem ms-út) |

A kérdés **indítása nem vetítés**. A TV akkor vált képernyőt, ha a QM `Op.CastDisplay`-t (vagy `Op.ShowLeaderboard`-ot) hív. Ha a kint lévő face `question`, a Submit/React **ráül** erre a képre. Ha `lobby`, a Join/Leave **ráül** a váróra. Ha `results`, a következő állás-vetítés az **előző kint lévő sorokból** animál.

### 4.2 Ping és verzió

Minden állapotot módosító action növel egy `StateVersion` egész számot az eseményen ( indulás: 0 ).

A ping kicsi:

```json
{
  "Action": "Op.StartQuestion",
  "EventID": 89,
  "StateVersion": 14
}
```

Nincs benne a teljes kérdés és nincs benne az eredménytábla. A kliens, ha a saját `StateVersion` értéke kisebb, `GET /op/event/:id`-t hív. Két vezérlő így ugyanarra a snapshotra jut.

Vezérlő actionök payloadja kaphat `ExpectedStateVersion`-t. Ha a tárolt verzió nem egyezik → 409 `Az állás megváltozott.` A verzió nem nő, semmi nem íródik. A kliens GET-el, és a felhasználó újra kattint. Ha a mező hiányzik, a hívás az utolsó írás szabályával megy (a régi kliens nem törik el).

---

## 5. Kérdés és forduló állapota

Egy körben egy aktuális kérdés van. Ezt tárold, ne a kliens memóriája legyen a forrás.

`OpLive` egy sor, a `GET /op/event/:id` adja vissza minden szerepnek (a játékos a kérdés szövegét ettől még csak `active` státusznál látja):

| Mező | Jelentés |
|---|---|
| `StateVersion` | utolsó írás |
| `ActiveRoundID` | melyik forduló |
| `ActiveEventQuestionID` | melyik kérdés |
| `ActiveQuestionSortIndex` | hányas kérdés a körben |
| `QuestionStatus` | `pending` \| `active` \| `stopped` |
| `AnswerCount` | beérkezett válaszok száma erre a kérdésre |
| `StartedAtUtc` | Indítás, szerver óra |
| `TimeSec` | válaszablak |
| `StoppedAtUtc` | lezárás, különben null |

Állapotgép:

| Esemény | `QuestionStatus` | Válaszok |
|---|---|---|
| még nem indították | `pending` | nincs |
| `Op.StartQuestion` | `active`, `StartedAtUtc = now`, `AnswerCount = 0` | — |
| első és további `Op.SubmitAnswer` | marad `active` | `AnswerCount` nő az első INSERT-nél, ismételt POST ugyanattól a játékostól nem növeli |
| `Op.StopQuestion` | `stopped`, `StoppedAtUtc = now` | megmaradnak, itt készül a pont |
| `Op.NextQuestion` | csak ha a aktuális `stopped`. A következő `pending` kérdésre lép, **nem** indítja el | — |
| `Op.ReopenQuestion` | a cél vissza `active`, új `StartedAtUtc` | **törlődnek** |

`AnswerCount > 0` és `active` = már biztosan folyamatban, jött válasz. `active` és `AnswerCount = 0` = elindítva, válasz még nincs. `stopped` = a kérdésen túl vagyunk.

### 5.1 `Op.ReopenQuestion`

```json
"Payload": { "EventQuestionID": 88, "ExpectedStateVersion": 14 }
```

QM vagy szervező. A kérdés `stopped` vagy `active`.

Egy tranzakció:

- töröld a kérdés `OP.tblAnswer` sorait, a `QuestionScore` és a shadow sorait
- `AnswerCount = 0`, `QuestionStatus = active`, `StoppedAtUtc = null`, `StartedAtUtc = now`
- `StateVersion++`
- ping: gamer, gamemaster, organizer. Display nem

A játékosoknál a kérdés újra nyitva, üres válasszal, új órával.

### 5.2 Óra

A 3 másodperces „csak a kérdés” szünet a kliensé. A szerver nem vonja le. `StartedAtUtc` az Indítás pillanata. A válaszablak vége `StartedAtUtc + TimeSec`. Újracsatlakozáskor a kliens ebből számol hátralévőt.

### 5.3 `Op.PauseQuestion`

A Szünet / Folytatás **nem** csak a QM/TV órája. A telefon is megáll, különben a `StartedAtUtc` tovább ég.

```json
"Payload": { "EventQuestionID": 88, "Hold": true, "LeftMs": 12400 }
```

| | |
|---|---|
| Ki | QM, szervező |
| Mikor | kérdés `active` |
| `Hold: true` | mentsd `ClockPaused = 1`, `ClockLeftMs = LeftMs`. A GET hátralévője ez, nem a start+TimeSec |
| `Hold: false` | `ClockPaused = 0`. Állítsd `StartedAtUtc = now − (TimeSec − LeftMs/1000)`, hogy a hátralévő `LeftMs` maradjon. `ClockLeftMs` null |
| Ping | gamer + gamemaster + organizer, display **nem**. `{ Action, EventID, Hold, LeftMs, StateVersion }` |
| Submit szünet alatt | 400 `A kérdés szünetel.` |

A TV továbbra is a Cast `ClockPhase=paused` / `play` alapján áll. `StateVersion++`. `Stop` / `Reopen` / `Next` törli a pause bitet.

### 5.4 Extra játékok

Nem `EventQuestion` / `Round`. Saját extra pool ID, `ExtraRun`.

`GET /op/event/:id` `OpLive`:

| Mező | Jelentés |
|---|---|
| `ExtraRunID` | futó extra, különben null |
| `ExtraGameId` | `EG1` Párbaj, `EG2` Mozaik, `EG3` Karaoke |
| `ActiveExtraQuestionID` | extra pool sor ID |
| `ExtraQuestionStatus` | `pending` \| `active` \| `stopped` |

Ugyanitt az extra pool sorai (játékosnak is, ha a kérdés `active`): `id` (ExtraQuestion.id), `QuestionID`, `ExtraGameId`, `SortIndex`, `StatusCode`, `TypeCode`, `Prompt`, `Answers`/`OptionsJson` + `IsCorrect`/`CorrectJson` a központi QuestionOption táblából, `TimeSec`, `StartedAtUtc`, kép URL. Join QuestionID-n.

| Action | Payload | Szabály |
|---|---|---|
| `Op.StartExtra` | `{ ExtraGameId }` | QM, szervező. Idempotens, ha már ez a run |
| `Op.StartExtraQuestion` | `{ ExtraQuestionId }` | mint StartQuestion, extra ID |
| `Op.StopExtraQuestion` | `{ ExtraQuestionId, Kind: "extra" }` | pontozás itt, ha van |
| `Op.StopExtra` | `{ ExtraRunID, ExtraGameId }` | lezárja a run-t |
| `Op.ResetExtra` | `{ ExtraRunID, ExtraGameId }` | ExtraScore + ExtraRun törlése. Nem CloseRound / ResetRound |
| `Op.SubmitAnswer` | `Kind: "extra"`, `ExtraQuestionId` | ugyanaz a verdikt, mint kvíznél |
| `Op.MosaicBuzz` | `{}` | device. Ping: `TeamID`, `TeamName`, `Nickname` |
| `Op.MosaicJudge` | `{ TeamID, Correct }` | QM. Helyes után Kövi |
| `Op.KaraokeSet` | — | v1-ben nincs FE |

| Játék | Menet |
|---|---|
| `EG1` Párbaj | 5 kérdés, ~10 s, Kövi csak lejárt időnél. Csak a leggyorsabb helyes +10, max 50. `Reopen` nincs |
| `EG2` Mozaik | nincs óra. Csengő → QM bírál. `NextQuestion` nincs |
| `EG3` Karaoke | csak `StartExtra` / `StopExtra`, nincs kérdés |

`NextQuestion` / `ReopenQuestion` extra ID-re 400. Extra alatt a kvíz `FocusedEventQuestionID` nem megy a telefonra.

---

## 6. Mit küld a játékos

A gamer csatorna és a GET az **aktív** kérdés helyes megfejtését odaadja a telefonnak, hogy helyben el tudja dönteni. A display ezt továbbra sem kapja.

`Op.SubmitAnswer`:

```json
"Payload": {
  "Kind": "round",
  "EventQuestionID": 88,
  "Items": [],
  "Correct": true,
  "Ratio": 1,
  "ElapsedMs": 2400
}
```

| Mező | Szabály |
|---|---|
| `Items` | a kliens válasza, tárold. **Ne** vesd össze a helyes kulccsal |
| `Correct` | kötelező bool. A kliens verdiktje. A szerver nem számolja újra |
| `Ratio` | 0 és 1 között. Ha hiányzik: `Correct true → 1`, `false → 0` |
| `ElapsedMs` | a telefon mérte, attól a pillanattól, hogy nála a válaszfelület megjelent. Kötelező, egész, clamp `[0, TimeSec * 1000]` |
| `Kind` | `round` (alap) vagy `extra`. Extra: `ExtraQuestionId`, nincs `EventQuestionID` |

Tárold mellé a `ServerReceivedAtUtc` értéket is, auditnak. A képlet **nem** ezt használja.

Gyorsasági idő: `t = ElapsedMs / 1000`, másodperc, clamp `[0, TimeSec]`.

`C` / `W` a tárolt `Ratio`-ból, a régi szabállyal:

- `Ratio = 1` → C
- `Ratio = 0` → W
- közte → se C, se W, a shadow arányos `P_alap * Ratio * M_gyors`

A pont **nem** a SubmitAnswerben készül. `Op.StopQuestion` írja a `QuestionScore` és shadow sorokat, a már tárolt `Correct` / `Ratio` / `ElapsedMs` mezőkből. A képlet többi része (P_alap, M_gyors, M_csapat, F, extra) változatlan.

Utolsó POST ugyanattól a játékostól, amíg a kérdés `active`, felülírja a saját sorát. `stopped` kérdésre 400 `A kérdés lezárult.`

Device JWT: `EventUserID` a tokenből.

Első válasz (új EventUser a kérdésen) után ping **gamemaster + organizer + display**. Ismételt POST ugyanattól nem növeli az `AnswerCount`-ot, ping akkor sem kell.

```json
{
  "Action": "Op.SubmitAnswer",
  "EventID": 89,
  "StateVersion": 14,
  "AnswerCount": 12,
  "RosterCount": 24
}
```

`RosterCount` = hány játékos küldhet ezen a kérdésen (belépett, csapatos EventUser). A TV: „Beküldte 12 / 24”. Nincs `Items`, nincs `Correct`, nincs nickname.

### 6.1 `Op.React` — emoji a kivetítőre

Új. Nincs tábla, nincs `StateVersion++`. A TV-n a kérdés közben felúszik, a tally nő. Szakadás után az emoji **elvész** (nem GET).

`POST /op/game/change`

```json
{
  "EventID": 89,
  "Action": "Op.React",
  "Payload": { "Glyph": "heart" }
}
```

| | |
|---|---|
| Ki | device / játékos JWT, saját EventUser |
| Mikor | a kérdés `active`, a játékos **már** SubmitAnswer-t küldött ezen a kérdésen. Előtte 400 `Előbb küldd be a választ.` |
| `Glyph` | `heart` \| `laugh` \| `fire` \| `sad` \| `poop` (❤️ 😂 🔥 😢 💩). Más → 400 |
| Egy játékos / kérdés | **FE** tiltja a második gombot. A BE nem tárol reactet, nem 409-ez |
| Extra / váró | 400, csak kvíz/játék `active` EventQuestion |

Ping **display + gamemaster + organizer**, nem gamer:

```json
{ "Action": "Op.React", "EventID": 89, "Glyph": "heart" }
```

Nincs EventUserID a hubon.

---

## 7. Eredménylista

A kijelzőre kerülő pont **mindig** a backend összesítése. A kliens nem küld saját pontot.

Mielőtt a játékmester eredményt vetít:

1. `GET /op/leaderboard/:eventId?board=` — a szerver aggregál, a `Points` és a `Place` az övé
2. utána mehet a vetítés

`board`: `main` | `quiz` | `games` | `shadow`, a régi SQL szerint. A `Name` a nickname.

`Op.ShowLeaderboard` és a results `Op.CastDisplay` **nem számol újra**, és a kliens által küldött pontsort **eldobja**. A display ping és a mentett vetítés a szerver friss leaderboard sorait viszi. A ceremónia lépése (`PodiumStep`, `RevealCount`, `RevealMode`) a kliensé, a nevek és a pontok nem.

---

## 8. Vetítés

Minden, amit a QM „kivetít” gombbal küld, `Op.CastDisplay` (vagy állásra `Op.ShowLeaderboard`). A TV **csak** ebből vált face-t. QM vagy szervező.

```json
"Payload": {
  "Face": "question",
  "Kind": "quiz",
  "Title": "Albumok",
  "Prompt": "…",
  "SortLabel": "3. kérdés",
  "JoinUrl": null,
  "Topics": [],
  "ClockPhase": "play",
  "ClockTotalMs": 20000,
  "ClockEndsAt": 0,
  "ClockHold": false,
  "PodiumStep": -1,
  "RevealMode": "off",
  "RevealCount": 0,
  "RevealEveryMs": 0,
  "Board": null
}
```

`Kind`: `quiz` \| `game`. A kérdés vetítésén **nincs** helyes válasz, nincs CorrectJson.

**Join:** a QR-t a TV a `JoinUrl`-ből rajzolja (nem a szerver generál PNG-t). A belépő diaforgató (hogyan játszunk) **kliens**, nem ping.

**Óra:** `ClockPhase` = `ready` \| `read` \| `play` \| `paused` \| `done`. `ClockHold` = true a 3 mp „csak a kérdés” (`read`) alatt. A QM **fázisváltáskor** küld CastDisplay-t (Indítás, szünet, folytatás, read→play, lejárt). A TV a `ClockEndsAt` alapján ketyeg. **Tilos** 100 ms-enként Cast.

**Kérdés payload** (face `question`), Correct nélkül:

| Mező | |
|---|---|
| `Type` | `single` \| `multi` \| `order` \| `match` \| `category` \| `freetext` |
| `OptionsJson` / `MatchesJson` / `CategoriesJson` | a TV kirakja az opciókat |
| `MediaUrl` | **csak kép** (https). Hang **nincs** a TV-n (QM telefon / Bluetooth) |
| `SortLabel` | pl. `3 / 8` |
| `Title` | téma |

Számláló és emoji nem a Castból: `Op.SubmitAnswer`, `Op.React`.

**Eredmény `Board`:** `quiz` \| `games` \| `main` \| `shadow`. A QM „Kvíz / Játék” és „Csapat / Egyéni” = `quiz`/`games` vs `shadow`. `Rows[].Team` = csapatnév az egyéninél (a kis felirat). `RevealStartedAt` + `RevealEveryMs`: Állás auto, 3 mp, utolsó helytől. Ceremónia: `RevealMode=ceremony`, QM léptet (`PodiumStep`, `RevealCount`, Újra).

| `Face` | QM gomb | Tartalom |
|---|---|---|
| `join` | Belépés | logo + QR. `JoinUrl` = állandó `/olimpub/join` abszolút URL, `Title` = esemény |
| `topics` | nyitott körök Vetítés | `Topics`: `{ Id, Title }[]` |
| `draw` | Sorsolás | `Topics` a kerékhez. Pörgés + landolás **a TV-n**, a QM nem küld frame-enként. Újra megnyomható |
| `lobby` | kör megnyitása (Indítás előtt) | `Teams`: `{ TeamID, Name, KabalaID, ImageUrl, Members: [{ Nickname }] }[]`. `ImageUrl` = kabala `full`. Join/Leave **frissíti** |
| `question` | Indítás / kövi / óra fázis | fenti kérdésmezők + Clock*. Számláló: Submit. Emoji: React |
| `results` | Állás, Ceremónia, forduló Eredmények | `Board` + Rows `PreviousPoints`. RevealMode `off` (nyers lista) / `auto` (Állás) / `ceremony` (kézi pódium) |

Nincs külön face: üres TV (`idle` amíg nincs Cast), **minta** vízjel, extra mozaik-buzz overlay (v1-ben a Játék ugyanaz a question/lobby/results, mint a kvíz). Hangcsúszka nem vetítés.

`Op.ShowLeaderboard` `{ "Board": "quiz" }` = results, szerver sorok. A kliens pontsorát eldobod.

Egy eseménynek egy utolsó vetítése van. `OP.DisplayCast` (EventID PK, Face, PayloadJson, StateVersion, UpdatedAtUtc). Submit/React **nem** írja a DisplayCast-ot. Join/Leave **lobby face mellett** igen: a `Teams` a PayloadJson-ban frissül, a Face marad `lobby`.

### 8.1 Lobby élő lista

Ha `DisplayCast.Face = lobby` és jön `Op.JoinTeam` / `Op.LeaveTeam`:

A backend **vékony** pinget küld displayre: `{ Action, EventID, StateVersion }` — **nincs** teljes `Teams` a payloadban (SQL-összerakás minden belépéskor drága).

**Zárás v1:** a TV (és a telefonos váró) ezen a pingen **egyszer** hív `GET /op/event/:id`-t a friss `OpTeams` / `OpTeamMembers`ért. Ez ritka (csapatváltás), nem a kérdés-óra-submit ms-út.

Később, ha kell: opcionális vastag payload `{ Teams[] }`. Most nem.

Ha a face nem `lobby`, a display **nem** kapja a pinget.

### 8.2 Előző eredmény — animáció

A sáv / helyezés animációhoz kell a **legutóbb kivetített** pont, nem a telefon `sessionStorage`-a.

Tábla (vagy DisplayCast mellett): `OP.DisplayBoard` `EventID` + `Board` PK, `RowsJson`, `CastAtUtc`.

`Board`: `main` | `quiz` | `games` | `shadow` — külön előzmény, ne keverd a kvízt a játékkal.

`Op.CastDisplay` Face=`results` vagy `Op.ShowLeaderboard`:

1. Új `Rows` = aktuális `GET /op/leaderboard` (szerver számol).
2. Előző = ugyanazon EventID+Board `RowsJson`. Nincs sor / új csapat → `PreviousPoints = 0`.
3. Hub + DisplayCast:

```json
{
  "TeamId": 12,
  "Name": "Farkas",
  "Points": 30,
  "Place": 1,
  "PreviousPoints": 18
}
```

4. **Utána** mentsd az új `Rows`-t (csak `TeamId`, `Name`, `Points`, `Place`) a DisplayBoard-ba. A következő vetítés ebből animál.

A ceremónia (`RevealMode`, `PodiumStep`) a QM payloadja; a nevek/pontok/Previous a szerveré. A kliens küldött pontsort eldobod.

Ne CastDisplay-zz frame-enként. Egy vetítés = egy ping, a TV húzza a sávot `PreviousPoints` → `Points`.

Ping: `display` + `gamemaster` + `organizer`. A gamer nem kapja.

A TV szakadás után `GET /op/event/:id` (display token): utolsó `DisplayCast`. Face `question`: `AnswerCount` + `RosterCount`. Face `lobby`: aktuális `Teams`. Face `results`: `Rows` `PreviousPoints`-szel (a DisplayBoard szerint). Emoji tally nincs a GET-ben.

---

## 9. Újracsatlakozás

Minden kliens szakadás után:

1. SignalR újra, ugyanaz a `POST /signalr/join`
2. `GET /op/event/:id`
3. a kapott `StateVersion` az új alap. A nála régebbi pinget dobja el

| Szerep | Mit kap vissza a GET |
|---|---|
| Játékos | `OpLive`, és ha a kérdés `active`, a kérdés szövegét **helyes válasszal**, plusz `StartedAtUtc` + `TimeSec`. A saját már beküldött válasza, ha van |
| Játékmester és szervező | teljes körlista, kérdések helyes válasszal, `OpLive`, utolsó `DisplayCast`. Két nyitott játékmester képernyő ugyanaz |
| TV | utolsó `DisplayCast`. `question`: AnswerCount+RosterCount. `lobby`: Teams. `results`: Rows+PreviousPoints. Emoji nincs |

A játékmester saját szakadása ugyanígy gyógyul: a GET után a kör és a kérdésindex a szerveré, nem a telefoné. A szervező ugyanezt látja, `ExpectedStateVersion` nélkül is, a 409 csak az elavult kattintást fogja meg.

Mobilhálón a játékos a hátralévő időt a szerver `StartedAtUtc` + `TimeSec` alapján folytatja. Ha a kérdés időközben `stopped`, a GET szerint a válaszfelület zárva, a késő POST 400.

---

## 10. Új és módosított hívások

| Hívás | Új / módosított | Auth |
|---|---|---|
| `GET /op/current` | új | nincs |
| `POST /auth/device-join` | Nickname, EventUID nélkül a current esemény | nincs |
| `Op.SetCurrent` | új | szervező |
| `Op.ReopenQuestion` | új | QM, szervező |
| `Op.CastDisplay` | új — minden vetítés-face | QM, szervező |
| `Op.ShowLeaderboard` | display + QM + szerv. | QM, szervező |
| `Op.SubmitAnswer` | `Correct`, `Ratio`, `ElapsedMs`; ping displayre `AnswerCount`+`RosterCount` | játékos |
| `Op.React` | új, nincs DB; ping displayre | játékos, kérdés után |
| `Op.StartQuestion` | ping gamer + gamemaster + organizer, **display nélkül** | QM, szervező |
| `Op.PauseQuestion` | új — `Hold` + `LeftMs`; GET `ClockPaused` + `ClockLeftMs` | QM, szervező |
| `Op.StartExtra` / `StopExtra` | extra run | QM, szervező |
| `Op.StartExtraQuestion` / `StopExtraQuestion` | extra pool ID | QM, szervező |
| `Op.MosaicBuzz` | ping: TeamID, Nickname | játékos |
| `Op.MosaicJudge` | `{ TeamID, Correct }` | QM, szervező |
| `GET /op/event/:id` | DisplayCast + lobby Teams / results PreviousPoints / question count + extra pool / Extra* | §4 + display token |
| `GET /op/leaderboard/:id` | `Name` = Nickname. Eredményvetítés előtt kötelező | QM, szervező, display token |

Hibák: 400 validáció vagy rossz státusz, 403 szerep, 404 nincs current / nincs esemény, 409 csapat tele vagy `ExpectedStateVersion` eltérés.

---

## 11. Leszakadás és második vezérlő

Nincs presence. A csapatagság / kérdés / DisplayCast a szerveren marad. A socket szakadása **nem** LeaveTeam és **nem** StopQuestion.

### Játékos

1. A kliens újra `POST /signalr/join` → `gamer`.
2. `GET /op/event/:id`.
3. Ha a kérdés `active`: ugyanaz a kérdés, helyes kulcs, `StartedAtUtc` + `TimeSec` → hátralévő idő. Van már válasza → ne üres lap, a verdikt / react marad (reactet a FE helyben emlékszik; a TV tally a szakadt emoji-t nem hozza vissza).
4. Ha `stopped` / nincs active: **váróterem**, csapata megvan.
5. Device JWT lejárt → `/olimpub/join` resume (üres Nickname), új token, ugyanaz az EventUser.

Késő Submit `stopped`re → 400.

### Játékmester

1. Ugyanaz: join `gamemaster` + GET.
2. A körlista és az `OpLive` (ActiveRound, ActiveEventQuestion, QuestionStatus, AnswerCount) a szerveré. A telefon memóriája (fázis, 3 mp read) **elvész**.
3. Újra a **listán / várón** landol, nem középen egy fél órában. Onnan nyitja a futó kört a GET indexénél. Következő Indítás / Next a szerver állapotra megy.
4. A TV **nem** áll le: az utolsó DisplayCast + `ClockEndsAt` a TV-n ketyeg.

### Szervező a JM képernyőn

Join: `organizer` + `gamemaster`. **Ugyanazt** a pinget és GET-et kapja, mint a QM (Start/Stop/Next, Submit `AnswerCount`, CastDisplay, React, Join/Leave).

Átvétel: nincs „kézfogás”. A második telefon ugyanazokat a gombokat hívja (`Op.StartQuestion`, `Next`, `Stop`, `CastDisplay`). `ExpectedStateVersion` eltérés → 409, GET, újra kattint.

**Zene:** a hang a **nyomó telefonján** szól (helyi fájl / Bluetooth). A leszakadt QM zenéje ott marad / elhallgat — a szervező **a saját** eszközén indítja. A TV-n nincs hang.

Két nyitott JM UI: mindkettő a GET/`OpLive` szerint mutatja, melyik kérdés `active`. A FE a ping után `loadGame`-mel hozza a listát; a vezérlőlapot a futó `ActiveEventQuestionID`-re kell nyitni, ne helyi indexre.

