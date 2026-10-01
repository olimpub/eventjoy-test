# Olimpub élő — rövid BE összefoglaló

Dátum: 2026-09-29. Részletek: [`olimpub-live.md`](./olimpub-live.md), csapatcsere: [`olimpub-player-lobby.md`](./olimpub-player-lobby.md). HTTP actionök: [`olimpub-backend.md`](./olimpub-backend.md) (a §10 SignalR **ne** ezt kövesd).

Minden élő hívás: `POST /op/game/change`, PascalCase `ID`.

---

## Cél

A telefon és a TV **ne GET-eljen** minden frissítéskor. A hub viszi az állapotot. `GET /op/event/:id` csak belépés, reconnect, vagy `StateVersion` lyuk.

SQL kell: válasz mentés, StopQuestion pontozás, DisplayCast / DisplayBoard, Join/Leave tag. Ami ms: Submit számláló, React, CastDisplay. Lobby Join/Leave: vékony ping + egy GET.

---

## Négy csoport — csak ezek

`event_{EventID}_{szerep}`

| Szerep | Join |
|---|---|
| Szervező (manage) | `organizer` |
| Szervező a kvízmester képernyőn | `organizer` + `gamemaster` |
| Kvízmester | `gamemaster` |
| Játékos / device | `gamer` |
| TV | `display` (JWT **vagy** display token) |

Nincs `contributor`, `participant`, `user_*`. `POST /signalr/join` más nevet elutasít.

Device JWT path: saját GET, `Op.SubmitAnswer`, `Op.React`, `Op.JoinTeam`, `Op.LeaveTeam`, `Op.MosaicBuzz`, `/signalr/join`.

---

## Ki mit kap

| Action | gamer | gamemaster | organizer | display |
|---|---|---|---|---|
| Start / Stop / Next / Reopen / CloseRound / Pause | igen | igen | igen | **nem** |
| StartExtra / StopExtra / StartExtraQuestion / StopExtraQuestion / MosaicBuzz / MosaicJudge | igen | igen | igen | **nem** |
| SubmitAnswer | nem | igen | igen | **igen** — `AnswerCount`, `RosterCount` (nincs válasz, nincs Correct) |
| React | nem | igen | igen | **igen** — `Glyph`, nincs név, nincs DB |
| CastDisplay / ShowLeaderboard | nem | igen | igen | **igen** — teljes face |
| JoinTeam / LeaveTeam | igen | igen | igen | **igen, ha lobby** — vékony ping; TV GET `/op/event` |
| SetCurrent / Penalty | nem | igen | igen | nem |

`Op.StartQuestion` **nem** vetítés. A TV akkor vált, ha a QM `Op.CastDisplay` (vagy `ShowLeaderboard`).

Ráülés a kint lévő képre (Face nem cserélődik):

- `question` ← Submit + React
- `lobby` ← Join / Leave
- `results` ← következő állás az **előző kint lévő** pontokból animál

---

## Új / módosított actionök

**`Op.React`** `{ Glyph: heart|laugh|fire|sad|poop }`  
Csak `active` kérdés, csak Submit után. Egy react / kérdés / játékos. Nincs tábla, nincs `StateVersion++`. Szakadás után az emoji elvész.

**`Op.LeaveTeam`** `{}`  
Kérdés *között* szabad, active alatt 400. Utána Join.

**`Op.CastDisplay`** — minden vetítés. Face:

| Face | QM | Payload |
|---|---|---|
| `join` | Belépés | `JoinUrl` = `{origin}/olimpub/join`, `Title` = esemény. QR-t a TV rajzolja |
| `topics` | Vetítés | nyitott körök `{ Id, Title }[]` |
| `draw` | Sorsolás | ugyanaz a lista; pörgés a TV-n, ne küldj frame-et |
| `lobby` | kör megnyitása, Indítás előtt | `Teams[]`: TeamID, Name, KabalaID, **ImageUrl** (full), Members[].Nickname |
| `question` | Indítás / kövi / órafázis | Prompt, SortLabel, Title=téma, Kind quiz\|game, Type, Options/Matches/Categories **Correct nélkül**, MediaUrl **csak kép** (hang nincs a TV-n). Clock* |
| `results` | Állás, Ceremónia, forduló vége | `Board`, Rows a **szerver** leaderboardból + `PreviousPoints` |

Óra: `ClockPhase` = `ready` \| `read` \| `play` \| `paused` \| `done`. `ClockHold` = a 3 mp „csak a kérdés”. Cast **fázisváltáskor**, nem 100 ms-enként. A TV `ClockEndsAt`-ból ketyeg.

Eredmény `Board`: `quiz` \| `games` \| `main` \| `shadow` (egyéni). `Rows[].Team` = csapatnév az egyéninél.

Lezárt kör Vetítés: `GET /op/leaderboard/:id?board=quiz&Scope=round&RoundID=` → **annak a körnek** az F-je (`RoundScore`), egész. `Scope=total` marad SUM(F). `ShowLeaderboard` ugyanaz: `{ Board: quiz, RoundID, Scope: round }`. `raw` + RoundID továbbra is RawS.

Reveal: `off` nyers lista, `auto` Állás (3 mp, `RevealStartedAt` + `RevealEveryMs`, hátulról), `ceremony` kézi pódium (`PodiumStep`, `RevealCount`).

Egy utolsó vetítés: `OP.DisplayCast`. Submit/React **nem** írja. Lobby Join/Leave: vékony ping, Face marad `lobby`; a TV GET-eli a Teams-t.

---

## DisplayBoard — előző állás

`OP.DisplayBoard` EventID + Board. A következő results-vetítés: új SQL sorok + `PreviousPoints` a **legutóbb ugyanerre a Boardra kint lévő** pontból (nincs / új csapat → 0). Utána mentsd az új sort. A kliens pontsorát eldobod.

---

## Játékos válasz

A kliens küldi: `Items`, `Correct`, `Ratio`, `ElapsedMs`, `Kind` `round`\|`extra`. Extra: `ExtraQuestionId`. A szerver **nem** osztályoz. Pont `Op.StopQuestion` / `Op.StopExtraQuestion`-kor. Gamer GET/ping: aktív kérdés **helyes válasszal**. Display **soha**.

---

## Extra — BE teendő (8-as)

A FE hívja ezeket. A régi [`olimpub-backend.md`](./olimpub-backend.md) §6.11 tábla / pontozás **marad**. Ami ott `contributor` / display a buzzra: **ne**. Csoportok: `gamer` + `gamemaster` + `organizer`. Display **nem**. `NextQuestion` extra ID-re **ne** implicit start.

### 1. GET `/op/event/:id` — enélkül a telefon vak

`OpLive` (aliasok OK: `ExtraRunId`, `ExtraQuestionID`):

| Mező | Mikor |
|---|---|
| `ExtraRunID` | futó ExtraRun, különben **null** |
| `ExtraGameId` | `EG1`…`EG8`, StopExtra után **null** |
| `ActiveExtraQuestionID` | extra kérdés ID (pool / ExtraQuestion.id). Stop után **marad** a lezárt kérdésen (mint kvíz fókusz). StopExtra után **null** |
| `ExtraQuestionStatus` | `pending` \| `active` \| `stopped`. Nincs extra kérdés (karaoke) → üres |
| `StartedAtUtc` / `TimeSec` | extra kérdés `active`-nál ugyanitt, UTC + Zóna |

Extra pool tömb (játékosnak is, ha a extra kérdés `active` vagy `stopped`): `id` (= ExtraQuestion.id), `QuestionID`, `ExtraGameId`, `SortIndex`, `StatusCode`, `TypeCode`, `Prompt`, `Answers` / `OptionsJson` + `IsCorrect` / `CorrectJson` a **központi** QuestionOption / QuestionCorrectAnswer-ből (StartExtra nem másolja az opciókat ExtraQuestionbe). `TimeSec`, `StartedAtUtc`, kép URL. Helyes kulcs a gamernek kell (helyi verdikt). Displaynek **nem**. Join **QuestionID**-n, ne ExtraGameId+SortIndex.

Kvíz `ActiveEventQuestionID` extra alatt maradhat a DB-ben. A FE extra módban nem olvassa.

### 2. Actionök — mind `POST /op/game/change`

Alias: `ExtraQuestionId` = `ExtraQuestionID` = `QuestionId`. `ExtraRunId` = `ExtraRunID`.

| Action | Ki | Payload (amit a FE küld) | Írás | Ping |
|---|---|---|---|---|
| `Op.StartExtra` | QM, szerv. | `{ ExtraGameId }` | ExtraRun `active`. Készletből ExtraQuestion sorok (EG3: 0 sor). Ha **ugyanez** a run már active → 200, ne másold. Másik extra active → 400 | `StateVersion++`, ExtraGameId |
| `Op.StartExtraQuestion` | QM, szerv. | `{ ExtraQuestionId }` | az a sor `active`, `StartedAtUtc=now`, AnswerCount=0. ExtraRun kell | mint StartQuestion: gamer+gm+org, **nem** display |
| `Op.StopExtraQuestion` | QM, szerv. | `{ ExtraQuestionId, Kind: extra }` | `stopped`. **Itt** EG1 +10 a leggyorsabb helyes csapatának (holtverseny: kisebb `t`, majd kisebb EventUserID). EG4–8 itt **még ne** ExtraScore. Idempotens: már stopped → ne pontozz újra | ugyanaz |
| `Op.StopExtra` | QM, szerv. | `{ ExtraRunID, ExtraGameId }` | ExtraRun `closed`. ExtraScore zárás: EG1 már megvan (max 50). EG2 Judge-okból. EG3 KaraokeSet×10 (ha nincs set: 0). EG4–8 Top5 50/40/30/20/10. GET Extra* **null** | ugyanaz |
| `Op.ResetExtra` | QM, szerv. | `{ ExtraRunID, ExtraGameId }` | ExtraRun + ExtraScore + ExtraAnswer törölve / pending. GET Extra* újra él. **Nincs** CloseRound / ResetRound extra ID-re | ugyanaz |
| `Op.SubmitAnswer` | játékos | `Kind: extra`, `ExtraQuestionId`, `Items`, `Correct`, `Ratio`, `ElapsedMs` | ExtraAnswer UPSERT. **Ne** osztályozz, **ne** pontozz. Extra kérdés `active`, csapat kell. `stopped` → 400 | gm+org+display számláló, ha első (mint kvíz). Gamernek nem |
| `Op.MosaicBuzz` | device | `{}` | TeamID a tagból. ExtraRun EG2 + extra kérdés `active`. Nincs pont. Nincs React-szerű tally. | gamer+gm+org: `TeamID`, `TeamName`, `Nickname`. **Nem** display. `StateVersion` nem kötelező |
| `Op.MosaicJudge` | QM, szerv. | `{ TeamID, CorrectFlg }` | false: 0 pont, ExtraRun marad. true: ExtraScore += 20 annak a csapatnak, **egy** nyertes / clip. A FE utána Startolja a kövit, vagy StopExtra | gamer+gm+org |
| `Op.KaraokeSet` | QM, szerv. | `{ TeamID, SingerCount }` | UPSERT. Pont csak StopExtra-kor. **v1 FE nem hívja** — fogadd, ne törjön |

`Op.NextQuestion` / `Op.ReopenQuestion` extra ID-re → 400. Extra Kövi = FE `StopExtraQuestion`, majd `StartExtraQuestion`.

`Op.PauseQuestion` extra / EG2 (`TimeSec=0`) → 400 vagy no-op.

### 3. Játékonként — csak ez a különbség

| | Indítás | Kérdés | Pont mikor |
|---|---|---|---|
| EG1 | StartExtra (5 single, ~10 s) | Start/Stop ExtraQuestion | StopExtraQuestion: 1 csapat +10 |
| EG2 | StartExtra (freetext, TimeSec 0) | Start ExtraQuestion, buzz, Judge | Judge true: +20. StopExtra összesít |
| EG3 | StartExtra, 0 kérdés | nincs | StopExtra: SingerCount×10 |
| EG4–8 | ugyanaz a Start/Stop ExtraQuestion | Submit mint kvíz | **StopExtra**: kvíz-S kérdésenként, Top5 |

Nincs elég készlet → StartExtra 400 `Nincs elég kérdés ehhez a játékhoz.` Kör bankjából ne pótolj.

### 4. Auth

Device JWT: `SubmitAnswer` (extra is), `MosaicBuzz`. QM/szerv.: Start/Stop Extra*.

### 5. Kész, ha

1. StartExtra EG1 után a GET-en van `ExtraRunID` + `ExtraGameId=EG1` + extra pool 5 sor.
2. StartExtraQuestion után a játékos GET-en látja a `Prompt` + opciókat, `ExtraQuestionStatus=active`, `StartedAtUtc`.
3. Submit `Kind=extra` 200, StopExtraQuestion után ExtraScore +10 a nyertes csapatnak.
4. StopExtra után Extra* null, `games` leaderboard nő.
5. EG2 buzz ping megérkezik a QM-re TeamID+névvel. Judge true +20.
6. EG3 StartExtra / StopExtra 200 kérdés nélkül.

---

## Reconnect

SignalR join + `GET /op/event/:id`. TV: DisplayCast; question → AnswerCount+RosterCount; lobby → Teams; results → Rows+PreviousPoints. Emoji nincs a GET-ben.

---

## Szándékosan nincs a hubon

Hang (QM telefon). Join diaforgató (TV kliens). Extra mozaik-buzz külön face (v1: játék = ugyanaz a lobby/kérdés/eredmény). `contributor` / `participant` / `user_*`.
