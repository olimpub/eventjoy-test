# Olimpub élő — csatornák, képernyők, események (mai állapot)

Dátum: 2026-10-20. A §0–§3 az átállás **előtti** frontend, kódból. Az átállás (helyi vetítés nélkül, minden képernyő a hubról) a §4-ben: mi készült el az FE-n, és mi kell a BE-től.

Kapcsolódó: [`olimpub-live.md`](./olimpub-live.md) §4 (csatornák), [`olimpub-live-be-osszefoglalo.md`](./olimpub-live-be-osszefoglalo.md) (ki mit kap).

---

## 0. Miért nem frissült

Három ok, mind a frontendben.

1. **A TV nem csatlakozik a SignalR-hez.** Az `olimpub-display` útvonalon a router kihagyja a csatlakozást (`router/index.ts`: `if (toDisplay) return;`), és a `DisplayPage.vue` sem hívja a `connectToEventLive`-ot. Nincs display token sem. A TV így csak két forrásból kap képet:
   - a kvízmester böngészőjéből, helyben (`BroadcastChannel` + `localStorage`, lásd 1. pont) — ez **csak ugyanazon a gépen, ugyanabban a böngészőben** működik;
   - betöltéskor egyszer a `GET /op/event` utolsó `DisplayCast`-jából.

   Külön gépen futó TV ezért az első kép után nem vált.
2. **A játékos „face” (váró / szünet) is helyi.** A kvízmester `idle` / `lobby` jelzése `localStorage`-be és `BroadcastChannel`-re megy (`writeOpPlayerFace`), plusz egy `Op.CastDisplay` szöveges `Face: idle|lobby`. A `CastDisplay` a BE szerint **nem megy a `gamer` csoportra**, így a telefon ezt csak a 8 mp-es pollból vagy egy későbbi GET-ből látja.
3. **A face-jelzés felülírja a TV utolsó képét.** A `castOpDisplay('idle' | 'lobby')` ugyanabba az `OP.DisplayCast` sorba ír, mint a valódi vetítés. Reconnect után a TV ezt olvassa vissza, és mivel az `idle` nem TV-face, nem mutat semmit az utolsó kép helyett.

---

## 1. Helyi vetítés, ami megszűnik

`src/modules/olimpub/opDisplayChannel.ts`

| Kulcs / csatorna | Ki írja | Ki olvassa | Mit visz |
|---|---|---|---|
| `localStorage opDisplayCommand:{eventId}` + `BroadcastChannel('opDisplayCommand')` | QM `publish()` (`OpQuizmasterHome.vue`) minden vetítéskor | TV (`DisplayPage.vue`: `readOpDisplay`, `onOpDisplay`), játékos (`PlayerPage.vue`: csak mozaik óra / tippelő) | a teljes `OpDisplayCommand` |
| `localStorage opPlayerFace:{eventId}` + `BroadcastChannel('opPlayerFace')` | QM watch (`writeOpPlayerFace`) | játékos (`readOpPlayerFace`, `onOpPlayerFace`) | `idle` \| `lobby` \| `results` |

A QM `publish()` minden hívásnál **kettőt** csinál: helyi `publishOpDisplay`, és ha élő az esemény, `Op.CastDisplay` a szerverre. Mintamódban (nincs élő esemény) csak helyi.

---

## 2. Csatornák és képernyők (mai)

### 2.1 Ki melyik csoportba lép

A csatlakozás a router `afterEach`-ben történik (`resolveEventLiveJoin`, `src/utils/eventEnter.ts`).

| Képernyő | Útvonal | Csoport(ok) |
|---|---|---|
| Szervező adatlap, Résztvevők, Quiz, Eredmények, Anyagok, Jegyolvasás | `/olimpub/event/:id/manage` stb. | `organizer` |
| Kvízmester vezérlő — kvízmester | `/olimpub/event/:id/quizmaster` | `gamemaster` |
| Kvízmester vezérlő — szervező | ugyanaz | `organizer` + `gamemaster` |
| Játékos (device vagy normál login) | `/olimpub/event/:id` | `gamer` |
| **TV** | `/olimpub/event/:id/display` | **semmi** (lásd 0.1) |
| Belépő (QR) | `/olimpub/join` | semmi (nincs még esemény) |

### 2.2 TV (`DisplayPage.vue`) — face → képernyő

| Face | Komponens | Mikor küldi a QM |
|---|---|---|
| nincs parancs | „Kivetítő — várakozás a kvízmesterre” | amíg semmi nem jött |
| `join` | `OpJoinSplash` (QR + esemény neve) | **Belépés** gomb |
| `topics` | csempék: nyitott körök | **Vetítés** (témák) gomb |
| `draw` | sorsoló pörgetés (a TV pörget helyben) | **Sorsolás** gomb |
| `lobby` | `OpWaitingRoom` (csapatdobozok, tagok) | kör megnyitása (`enter`), **Indítás** (`onBegin`), **Következő** (`onAdvance`); csapatlista változásakor újraküldi, ha a lobby van kint |
| `question` | `OpDisplayQuestion` (kérdés, óra, számláló, emoji, helyes válasz) | óra fázisváltás (`read` / `play` / `paused` / `done`); **Helyes válasz**; mozaik óra / tippelő |
| `results` | lista / Állás animáció / finálé / ceremónia | **Állás**, **Ceremónia** + léptetés, forduló eredmény, játék-állás |

### 2.3 Játékos (`PlayerPage.vue`) — állapot → képernyő

Felülről lefelé az első igaz nyer.

| Képernyő | Komponens | Feltétel |
|---|---|---|
| Mozaik tipp | `OpPlayerMosaic` | aktív kérdés, `ExtraGameId = EG2`, a csapat nincs kiesve |
| Kérdés | `OpPlayerStage` | a fókuszált kérdés `active`, a csapat nincs kiesve |
| Szünet kérdések között | `OpPlayerBreak` | van csapat, fut kör vagy extra, nincs aktív kérdés, a face **nem** `idle` |
| Váróterem | `OpPlayerWaitingRoom` | van csapat, nincs aktív kérdés, és a face `idle` vagy nem fut kör (vagy mozaikban kiesett) |
| Kabalaválasztó | `OpPlayerLobby` | nincs csapat, vagy az esemény még nem Játék |

A face forrása: `live.PlayerFace` (GET `DisplayCast` face-éből), különben a helyi `opPlayerFace`.

### 2.4 Kvízmester (`OpQuizmasterHome` + `OpQuizmasterStage`)

Nem kap vetítést, ő küldi. A hubról a kérdésállapotot, a számlálót, az emojit, a mozaik tippet és a csapatváltozást olvassa.

---

## 3. Esemény → csatorna → mit frissít (mai)

A hub minden `Op.*` üzenete a `useOlimpubStore().notePing`-be fut. Ez beírja a ping mezőit (számláló, óra, tippelő, face), majd **220 ms után** `GET /op/event/:id`-t hív. Kivétel, amikor nincs GET: `React`, `MosaicBuzz`, `MosaicJudge` (rossz), és `CastDisplay` óra-tartás / `paused` / `play` fázissal.

Csatorna oszlop: a BE mai szabálya (`olimpub-live.md` §4.1). Az utolsó oszlopok azt mutatják, mit csinál vele a FE.

| Esemény | Ki hívja | gamer | gamemaster / organizer | display | Játékos FE | QM FE | TV FE |
|---|---|---|---|---|---|---|---|
| `Op.SetCurrent` | szervező | – | ✓ | – | – | GET | – |
| `Op.JoinTeam` / `Op.LeaveTeam` | játékos | ✓ | ✓ | ✓ ha lobby | GET, kabala / váró | csapatlista újratöltés; ha lobby van kint, **újra Castol lobbyt** | nem kapja |
| `Op.StartRound` | QM | ✓ | ✓ | – | GET | GET | – |
| `Op.StartQuestion` | QM | ✓ | ✓ | – | GET → Kérdés képernyő, óra áll (olvasási idő) | csatolás az élő kérdéshez | – |
| `Op.StartClock` | QM | ✓ | ✓ | – | GET, óra indul | – | – |
| `Op.PauseQuestion` | QM | ✓ | ✓ | – | óra áll / megy, nincs GET | csatolás | – |
| `Op.StopQuestion` | QM | ✓ | ✓ | – | GET → Szünet vagy Váró | – | – |
| `Op.ReopenQuestion` / `Op.NextQuestion` | QM | ✓ | ✓ | – | GET → Kérdés | csatolás | – |
| `Op.CloseRound` / `Op.ResetRound` / `Op.PublishRound` | QM / szervező | ✓ | ✓ | – | GET | GET | – |
| `Op.SubmitAnswer` | játékos | – | ✓ | ✓ számláló | – | **minden válasznál újra Castolja a kérdést** | számláló nő (ha kapná) |
| `Op.React` | játékos | – | ✓ | ✓ emoji | – | lebegő emoji; **újra Castolja a kérdést emojival** | emoji (ha kapná) |
| `Op.CastDisplay` | QM | – | ✓ | ✓ | csak GET útján: face, mozaik óra | – | face csere; `question` prompt nélkül = csak óra |
| `Op.ShowLeaderboard` | QM | – | ✓ | ✓ | – | – | `results`, sorok GET leaderboardból |
| `Op.AdjustTeam` / `Op.Penalty` | QM | – | ✓ | – | – | csapatpont frissül | – |
| `Op.StartExtra` / `Op.StopExtra` / `Op.ResetExtra` | QM | ✓ | ✓ | – | GET, mozaik nullázás | GET | – |
| `Op.StartExtraQuestion` / `Op.StopExtraQuestion` | QM | ✓ | ✓ | – | GET | csatolás | – |
| `Op.MosaicBuzz` | játékos | ✓ | ✓ | – | óra áll, tippelő csapat | tippelő, zene áll | – |
| `Op.MosaicJudge` | QM | ✓ | ✓ | – | jó: új kérdés; rossz: csapat kiesik, óra megy | – | – |

**Pollok a hub mellett:**

| Hol | Mit | Milyen sűrűn |
|---|---|---|
| Játékos | `refreshLobby` (join preview + GET), ha nincs kérdés kint | 8 mp |
| Játékos, mozaik alatt | `GET /op/event` | **280 ms** |
| Játékos, minden ping után (kivéve Buzz, Pause, Judge, Cast, React) | `refreshLobby` | pingenként |

---

## 4. Teljes SignalR — FE kész, BE teendő

### 4.1 FE (megvan)

1. **TV a hubon.** `DisplayPage.vue` belép az `event_{id}_display` csoportba: staff JWT-vel, `?pin=`-nel (`/pta/display-session`, `Module: 'op'`), vagy a sessionStorage-ben tárolt kivetítő tokennel. PIN-es TV-n a `GET /op/event` és a `GET /op/leaderboard` `X-Pta-Display-Token` fejlécet visz.
2. **Nincs helyi vetítés.** `opDisplayChannel.ts`-ből kikerült a localStorage / BroadcastChannel rész. A QM csak `Op.CastDisplay`-t hív. Mintamódban (nincs élő esemény) a TV nem kap semmit.
3. **GET minden join után.** `onEventLiveJoined` (signalrService) minden sikeres csoport-joinkor szól: első belépés, reconnect, ébredés, watchdog. `useOpLiveResync` erre `GET /op/event`-et hív a TV-n, a játékoson és a QM-en.
4. **StateVersion rés.** `notePing`: ha a ping `StateVersion` > ismert + 1, kimaradt üzenet volt → `loadGame` akkor is, ha az akció egyébként nem töltene újra (React, MosaicBuzz, óra-Cast).
5. **Pollok helyett tartalék.** A játékos 8 mp-es és 280 ms-os pollja megszűnt. `useOpLiveResync` 10 mp-enként néz rá: ha a hub nincs bent az eseményben → GET (legfeljebb 10 mp-enként); ha 30 mp óta se ping, se GET nem jött → GET. Rejtett lapon nem kérdez.
6. **Nincs QM újra-Cast** `SubmitAnswer`-re és `React`-re. A TV a saját `display` pingjéből frissíti a számlálót és az emojit.
7. **Játékos face külön.** QM: `Op.SetPlayerFace { Face: 'idle' | 'lobby' | 'results' }`. A játékos csak az `OpLive.PlayerFace`-t és ezt a pinget nézi; a TV `DisplayCast` face-e már nem számít.
8. **Esemény státusz.** A játékos `refreshLobby`-t hív, ha az esemény `EventStatusID`-ja változik (`Event.SetStatus` ping).

### 4.2 BE (kell hozzá)

| # | Mit | Miért |
|---|-----|-------|
| 1 | `POST /op/game/change` `Action: 'Op.SetPlayerFace'`, `Payload: { Face }`. Mentés: új `OpLive.PlayerFace` oszlop. Ping: `gamer` + `organizer` + `gamemaster` (nem `display`). `GET /op/event` `OpLive` sorában `PlayerFace`. | Enélkül a QM hívása hibát kap (csendben elnyeljük), a face `''` marad: élő körben szünet (`OpPlayerBreak`), kör nélkül váró. |
| 2 | `/signalr/join` fogadja el az `X-Pta-Display-Token`-t Olimpub eseményre is (`event_{id}_display`), és `/pta/display-session` adjon tokent `Module: 'op'`-ra. A `GET /op/event` és `/op/leaderboard` is fogadja a tokent. | PIN-es, bejelentkezés nélküli TV. Staff JWT-vel már most megy. |
| 3 | Minden `Op.*` ping `Payload`-jában `StateVersion` (az `OpLive` mentés utáni értéke). | Rés-felismerés; amíg nincs, csak a join utáni GET és a 30 mp-es tartalék véd. |
| 4 | Jelenlét: lásd 4.3. | A csapatban maradt, de nem csatlakozott tagok szürkén látszanak, nem online-ként. |

### 4.3 Jelenlét (presence) — BE

A csapattagság az `Op.LeaveTeam`-ig megmarad, akkor is, ha a játékos rég bezárta a telefont. A TV és a QM ezért a csatlakozott és a nem csatlakozott tagot külön jelöli.

**Adat.** Új oszlop a csapattag-sorban: `LastSeenUtc datetime2 NULL`. Új tábla nem kell.

**Írás.** A `/signalr/join`-ban, ha a kért csoport `event_{id}_gamer` és a JWT-ből van `EventUserID`. A kliens joinol első belépéskor, reconnectkor, ébredéskor és kb. 2 percenként (watchdog). Egy feltételes `UPDATE`, ami 60 mp-en belül nem ír újra:

```sql
UPDATE OP.TeamMember
SET LastSeenUtc = SYSUTCDATETIME()
WHERE EventID = @EventID AND EventUserID = @EventUserID
  AND (LastSeenUtc IS NULL OR LastSeenUtc < DATEADD(SECOND, -60, SYSUTCDATETIME()));
```

100 játékosnál ez kb. 100 írás 2 percenként (1/mp alatt), mindegyik egy sor az elsődleges kulcson.

**Olvasás.** A `GET /op/event` csapattag-sorai (`OpTeamMembers`) kapják meg a `LastSeenUtc`-t (UTC, ISO), vagy egy kész `Online` bitet (`LastSeenUtc` ≥ most − 3 perc). A FE mindkettőt érti; az `Online` az erősebb. Ha egyik sincs, a FE mindenkit online-nak vesz (mai viselkedés).

**Kilépés (nem kötelező).** Az Azure SignalR „disconnected” eseményére `LastSeenUtc = NULL`. Enélkül 3 perc után lesz offline.

**Ping.** Csak állapotváltáskor (offline → online az első joinnál, online → offline disconnectkor): `Op.Presence { EventUserID, TeamID, Online }` az `organizer` + `gamemaster` + `display` csoportnak. A QM erre újraküldi a lobby Castot, a TV így frissül. Ha a ping nincs, a változás a következő GET-tel jön.

**Figyelem.** Lezárt telefon nem joinol (rejtett lapon a watchdog nem fut), így 3 perc után offline-nak látszik, pedig játszik. Ezért a FE szürkén mutatja, nem rejti el.

---

## 5. BE átadás — a kérdés képernyője CastDisplay nélkül

A kérdés képernyője azért csúszik szét, mert egy hívás nem jut el mindenhova. A `StartQuestion` és a `StartClock` nem megy a `display` csoportba, a `CastDisplay` nem megy a `gamer` csoportba. Az órafázis emiatt egy második csatornán él. Az órafázis a parancs neve. A `CastDisplay` a kérdésképernyőn nem kell.

### 5.1 Szórás

Minden sikeres `POST /op/game/change` `Op.*` pingje mind a négy csoportba megy:

- `event_{id}_gamer`
- `event_{id}_gamemaster`
- `event_{id}_organizer`
- `event_{id}_display`

A mai akciónkénti szűrés megszűnik. A kliens maga dönti el, mit rajzol. Ugyanaz a kérdésazonosító nem jelent új kérdést.

Minden ping `Payload`-jában ott van a mentés utáni `StateVersion`.

A broadcast **nem** tartalmazza a helyes választ: se `IsCorrect`, se `CorrectJson`, se a jó opció szövegét. Azt csak a staff `GET /op/event` adja a kvízmesternek.

### 5.2 A parancs viszi a lapot

A FE a kérdésindításkor csak azonosítót küld (`EventQuestionID`, `RoundID`). A BE a kérdés sorából rárakja a lapot a pingre, és ugyanezt adja vissza a `GET /op/event` aktív kérdésén.

| Mező | Honnan |
|---|---|
| `EventQuestionID`, `RoundID`, `SortIndex`, `TopicName` | kérdés sor |
| `Prompt`, `TypeCode`, `TimeSec` | kérdés sor |
| `Answers`, `Matches`, `Categories` | kérdés sor, helyes jel nélkül |
| `ImageUrl` vagy `ImageKey`, `AudioUrl` vagy `AudioKey` | kérdés sor |

`NextQuestion`, `ReopenQuestion` és `StartExtraQuestion` ugyanezt a lapot viszi, az új kérdésről.

### 5.3 Óra

A 3 másodperces felolvasást a kvízmester számolja, és a végén ő hívja a `StartClock`-ot. A BE nem indít órát magától.

| Hívás | Mit ment | Mit jelent a kliensnek |
|---|---|---|
| `Op.StartQuestion` | `QuestionStatus = active`, `ActiveEventQuestionID`, `StartedAtUtc = most`, `AnswerStartedAtUtc = null`, `ClockPaused = 1`, `AnswerCount = 0`, `StateVersion++` | Felolvasás: csak a kérdés és a kép. Nincs opció, nincs visszaszámláló, a Küldés tiltva. |
| `Op.StartClock` | `AnswerStartedAtUtc = most`, `ClockPaused = 0`, `StateVersion++` | Válaszidő: opciók, visszaszámláló `TimeSec` másodperc az `AnswerStartedAtUtc`-től, Küldés engedélyezve, lájk mehet. |
| `Op.PauseQuestion` | `ClockPaused = 1`, `ClockLeftMs` a payloadból, `StateVersion++` | Az óra áll. Az opciók kint maradnak. A Küldés tiltva. |
| `Op.StopQuestion` | `QuestionStatus = stopped`, `StoppedAtUtc = most`, `StateVersion++` | A telefon lemegy a kérdésről. A kijelzőn az óra 0, a lap kint marad. |

`AnswerStartedAtUtc` új oszlop az `OpLive`-on (datetime2, NULL). A `GET /op/event` `OpLive` sora visszaadja: `StartedAtUtc`, `AnswerStartedAtUtc`, `TimeSec`, `ClockPaused`, `ClockLeftMs`, `AnswerCount`, `QuestionStatus`, `ActiveEventQuestionID`, `StateVersion`.

Későn csatlakozó kliens a GET-ből rajzol. `AnswerStartedAtUtc` üres: felolvasó kép. Ki van töltve: a hátralévő idő `TimeSec − (most − AnswerStartedAtUtc)`, szünetnél `ClockLeftMs`.

### 5.4 Tipp és lájk

| Hívás | Ki hívja | Ping, mind a négy csoportba |
|---|---|---|
| `Op.SubmitAnswer` | játékos | `EventQuestionID`, `AnswerCount`. A választott opció nem kell a többieknek. |
| `Op.React` | játékos | `Glyph` (`heart` / `laugh` / `fire` / `sad` / `poop` vagy a megfelelő emoji). |

Ezek után a kliens nem kér új `GET /op/event`-et. A számláló és az emoji a pingből jön.

### 5.5 Ami nem kérdéslap

Az állást a meglevő `Op.ShowLeaderboard` viszi, mind a négy csoportba.

A lobby, a nyitott körök és a sorsolás külön hívás, `CastDisplay` nélkül. A BE eltárolja az utolsó vetített lapot, és a `GET /op/event` visszaadja, hogy a későn jövő kijelző ugyanazt mutassa.

| Hívás | Payload | GET-en |
|---|---|---|
| `Op.ShowLobby` | `Teams[]`: név, szín, létszám, tagok (`Nickname`, `Online`) | `Screen = lobby` + a lista |
| `Op.ShowTopics` | `Kind` (`quiz` / `game`), `Topics[]`: cím | `Screen = topics` + a lista |
| `Op.ShowDraw` | `Kind`, `Topics[]` | `Screen = draw` + a lista |

`Screen` értékei: `question`, `lobby`, `topics`, `draw`, `results`, `idle`. A kérdésparancsok `question`-re teszik, a `ShowLeaderboard` `results`-ra, a `StopQuestion` nem törli a lapot.

### 5.6 `CastDisplay`

A kérdés órájához és lapjához a BE-nek nem kell `Op.CastDisplay`. A meglevő hívást elfogadhatja, amíg a régi kliens él, de az új óraállapotot nem ebből számolja: `StartQuestion`, `StartClock`, `PauseQuestion`, `StopQuestion`.
