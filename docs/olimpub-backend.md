# Olimpub — backend szerződés

A termék összefoglaló: [`olimpub.md`](./olimpub.md). **Implementálandó API / SQL:** [`olimpub-backend.md`](./olimpub-backend.md). A FE route-ok oda nem tartoznak.

EventType **43**. `EventTypes.OPFlg` (bit, mint `PTAFlg`). `Pta.*` és PTA táblák **tiltva**. Séma: **`OP`**. Közös EventJoy (`tblEvent`, `tblEventUser`, `tblUser`, Outbox) marad `dbo`.

Siker `/op/change`-en: **`ReturnValue = 1`**, mint `/event/change`. Hiba: `ReturnValue < 0`, `ReturnDescription` a toastba. Import: lásd §7 (invite-szerű sorhibák).

Ne hardkódold a státusz / Role / identifier **id**-t. Névtöredék + flag (`OPFlg`, RoleType, EventStatus „jatek” / „bejelentkez”).

---

## 0. Master / save delta

### 0.1 `EventTypes.OPFlg`

Új bit. A 43-as soron `1`. GET `/user/data` EventTypes-ban add vissza (a FE `PTAFlg` mintájára).

### 0.2 Jegy — kvízmesternek tilos

Típus 43: a Játékmester `EventRole`-hoz **ne** legyen `EventRoleTicket` / jegy. Ha a save küld, **dobd el**. Játékosnak kell jegy (díjmentes oké). Szervező jegye nem játszik — ne hozz létre játékos EventUser-t szervező UserID-re OP-n.

### 0.3 `POST /event/save` — `OpSettings`

Ha `OPFlg` hamis → `OpSettings: null`. Ha igaz → objektum, különben 400.

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

| Mező | Típus | Szabály |
|---|---|---|
| `DeskCountHint` | int \| null | hint, nem FK, nem kapacitás |
| `MaxTeamSize` | int | ≥ 1, default 8 ha hiányzik |
| `PlannedDurationMin` | int | 60 + 30k, k ∈ ℕ₀. Más → 400 |
| `ShadowAwardFlg` | bit | default 1. Shadow **mindig** számolódik |
| `TopicIds` | int[] | létező `OP.Topic`, ActiveFlg=1. Üres tilos 400 `Válassz témakört.` |
| `ExtraGameIds` | string[] | csak `EG1`…`EG8`. Ismeretlen → 400. Üres = nincs extra az estén |
| `KabalaIds` | int[] | `OP.Kabala` Active. Duplikátum → 400. Létrehozza / szinkronizálja `OP.Team`-et |

**Team szinkron save-kor:** `KabalaIds`-ben lévő → `OP.Team` ActiveFlg=1 (insert ha nincs). Amit kivesztek és **nincs** `TeamMember` → ActiveFlg=0. Van tag → 400 `A csapatnak van játékosa.` (ne töröld).

GET userdata / GET `/op/event/:id` dataset: `OpSettings` (1 sor, TopicIds/ExtraGameIds/KabalaIds JSON vagy child dataset `OpSettingTopics` stb. — ha child, a FE mindkettőt tudja; **preferált:** egy sor + JSON oszlopok `nvarchar(max)`).

`PtaSettings` típus 43-on **null**.

---

## 1. Táblák (`OP`)

Minden táblán `id int IDENTITY PK`, `ActiveFlg bit NOT NULL DEFAULT 1`, hacsak jelezve.

```sql
CREATE SCHEMA OP;

-- Törzs
CREATE TABLE OP.Kabala (
  id int IDENTITY PRIMARY KEY,
  Name nvarchar(80) NOT NULL,
  ImageUrl nvarchar(500) NULL,
  ActiveFlg bit NOT NULL DEFAULT 1
);

CREATE TABLE OP.Topic (
  id int IDENTITY PRIMARY KEY,
  Name nvarchar(120) NOT NULL,
  ActiveFlg bit NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX UX_OP_Topic_Name ON OP.Topic (Name) WHERE ActiveFlg = 1;

CREATE TABLE OP.Question (
  id int IDENTITY PRIMARY KEY,
  TopicID int NOT NULL REFERENCES OP.Topic(id),
  TypeCode nvarchar(16) NOT NULL, -- single|multi|order|match|category|freetext
  Prompt nvarchar(max) NOT NULL,
  OptionsJson nvarchar(max) NULL,   -- §2
  CorrectJson nvarchar(max) NOT NULL, -- §2
  TimeSec int NOT NULL,
  MediaKey nvarchar(200) NULL,
  ActiveFlg bit NOT NULL DEFAULT 1,
  CreatedAtUtc datetimeoffset NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE TABLE OP.EventSettings (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL UNIQUE, -- dbo.tblEvent.id
  DeskCountHint int NULL,
  MaxTeamSize int NOT NULL,
  PlannedDurationMin int NOT NULL,
  ShadowAwardFlg bit NOT NULL DEFAULT 1,
  TopicIdsJson nvarchar(max) NOT NULL,      -- [1,2,5]
  ExtraGameIdsJson nvarchar(max) NOT NULL,  -- ["EG1"]
  KabalaIdsJson nvarchar(max) NOT NULL
);

CREATE TABLE OP.Team (
  id int IDENTITY PRIMARY KEY,           -- ez a TeamId a JSON-ban
  EventID int NOT NULL,
  KabalaID int NOT NULL REFERENCES OP.Kabala(id),
  ActiveFlg bit NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX UX_OP_Team_EventKabala ON OP.Team (EventID, KabalaID) WHERE ActiveFlg = 1;

CREATE TABLE OP.TeamMember (
  id int IDENTITY PRIMARY KEY,
  TeamID int NOT NULL REFERENCES OP.Team(id),
  EventUserID int NOT NULL, -- dbo.tblEventUser.id
  ActiveFlg bit NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX UX_OP_TeamMember ON OP.TeamMember (TeamID, EventUserID) WHERE ActiveFlg = 1;

CREATE TABLE OP.Round (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL,
  TopicID int NULL REFERENCES OP.Topic(id),
  Mode nvarchar(16) NOT NULL, -- fixed|pick|wheel
  StatusCode nvarchar(16) NOT NULL, -- pending|active|closed|published
  Picker nvarchar(8) NULL, -- first|last, csak pick
  SortIndex int NOT NULL,
  ActiveFlg bit NOT NULL DEFAULT 1
);

CREATE TABLE OP.EventQuestion (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL,
  RoundID int NOT NULL REFERENCES OP.Round(id),
  QuestionID int NOT NULL REFERENCES OP.Question(id),
  SortIndex tinyint NOT NULL, -- 1..8
  StatusCode nvarchar(16) NOT NULL, -- pending|active|stopped
  StartedAtUtc datetimeoffset NULL,
  StoppedAtUtc datetimeoffset NULL,
  TimeSec int NOT NULL, -- másolat, a kérdésé vagy override
  ActiveFlg bit NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX UX_OP_EQ_RoundSort ON OP.EventQuestion (RoundID, SortIndex) WHERE ActiveFlg = 1;

CREATE TABLE OP.Answer (
  id int IDENTITY PRIMARY KEY,
  EventQuestionID int NOT NULL REFERENCES OP.EventQuestion(id),
  EventUserID int NOT NULL,
  AnswerJson nvarchar(max) NOT NULL,
  ReceivedAtUtc datetimeoffset NOT NULL,
  ActiveFlg bit NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX UX_OP_Answer ON OP.Answer (EventQuestionID, EventUserID) WHERE ActiveFlg = 1;

CREATE TABLE OP.QuestionScore (
  EventQuestionID int NOT NULL,
  TeamID int NOT NULL,
  RawS decimal(12,4) NOT NULL,
  C int NOT NULL,
  W int NOT NULL,
  SpeedT decimal(8,3) NULL, -- első helyes t, mp
  PRIMARY KEY (EventQuestionID, TeamID)
);

CREATE TABLE OP.ShadowScore (
  EventQuestionID int NOT NULL,
  EventUserID int NOT NULL,
  S decimal(12,4) NOT NULL,
  PRIMARY KEY (EventQuestionID, EventUserID)
);

CREATE TABLE OP.RoundScore (
  RoundID int NOT NULL,
  TeamID int NOT NULL,
  RawSSum decimal(12,4) NOT NULL,
  Place int NOT NULL,
  F int NOT NULL,
  PRIMARY KEY (RoundID, TeamID)
);

CREATE TABLE OP.ExtraRun (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL,
  ExtraGameId nvarchar(8) NOT NULL,
  StatusCode nvarchar(16) NOT NULL, -- active|closed
  StartedAtUtc datetimeoffset NOT NULL,
  ClosedAtUtc datetimeoffset NULL
);

CREATE TABLE OP.ExtraQuestion (
  id int IDENTITY PRIMARY KEY,
  ExtraRunID int NOT NULL REFERENCES OP.ExtraRun(id),
  SortIndex tinyint NOT NULL,
  TypeCode nvarchar(16) NOT NULL,
  Prompt nvarchar(max) NOT NULL,
  OptionsJson nvarchar(max) NULL,
  CorrectJson nvarchar(max) NOT NULL,
  TimeSec int NOT NULL,
  MediaKey nvarchar(200) NULL,
  StatusCode nvarchar(16) NOT NULL, -- pending|active|stopped
  StartedAtUtc datetimeoffset NULL,
  StoppedAtUtc datetimeoffset NULL
);

CREATE TABLE OP.ExtraAnswer (
  ExtraQuestionID int NOT NULL,
  EventUserID int NOT NULL,
  AnswerJson nvarchar(max) NOT NULL,
  ReceivedAtUtc datetimeoffset NOT NULL,
  PRIMARY KEY (ExtraQuestionID, EventUserID)
);

CREATE TABLE OP.ExtraScore (
  ExtraRunID int NOT NULL,
  TeamID int NOT NULL,
  Points int NOT NULL,
  PRIMARY KEY (ExtraRunID, TeamID)
);

CREATE TABLE OP.Penalty (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL,
  TeamID int NOT NULL,
  Points int NOT NULL, -- mindig negatív vagy a GET abszolut + előjel; lock: tárold előjelesen, pl. -10
  UndoOfID int NULL,
  CreatedAtUtc datetimeoffset NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  ActiveFlg bit NOT NULL DEFAULT 1
);

CREATE TABLE OP.Media (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL,
  MediaKey nvarchar(200) NOT NULL,
  BlobUrl nvarchar(1000) NOT NULL,
  ContentHash nvarchar(64) NOT NULL, -- SHA256 hex
  Mime nvarchar(80) NOT NULL,
  ActiveFlg bit NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX UX_OP_Media ON OP.Media (EventID, MediaKey) WHERE ActiveFlg = 1;

CREATE TABLE OP.DisplayToken (
  id int IDENTITY PRIMARY KEY,
  EventID int NOT NULL,
  Pin char(4) NOT NULL,
  Token nvarchar(80) NOT NULL, -- random
  ExpiresAtUtc datetimeoffset NOT NULL,
  ActiveFlg bit NOT NULL DEFAULT 1
);
```

`dbo` kiegészítés device-joinhoz: `tblLoginIdentifier` új típus **Device** (név / Code `device`, ne id-t hardkódolj). `Value` = DeviceId GUID, lower. Unique (Type, Value) ActiveFlg=1.

---

## 2. `OptionsJson` / `CorrectJson` / `AnswerJson`

`TypeCode` szerint. Más shape → 400 `Érvénytelen válaszforma.`

| Type | OptionsJson | CorrectJson | AnswerJson |
|---|---|---|---|
| `single` | `["A","B","C","D"]` | `{ "Index": 0 }` | `{ "Index": 0 }` |
| `multi` | string[] | `{ "Indexes": [0, 2] }` | `{ "Indexes": [0, 2] }` |
| `order` | string[] (kiinduló sorrend) | `{ "Order": ["B","A","C"] }` | `{ "Order": ["B","A","C"] }` |
| `match` | `{ "Left": [...], "Right": [...] }` | `{ "Pairs": [{ "L": "x", "R": "y" }] }` | ugyanaz Pairs |
| `category` | `{ "Items": [...], "Cats": [...] }` | `{ "Buckets": { "Cat1": ["a"], "Cat2": ["b"] } }` | ugyanaz Buckets |
| `freetext` | `null` | `{ "Synonyms": ["valasz egy", "masik"] }` | `{ "Text": "Valasz Egy" }` |

Értékelés (szerver, Stop-kor és extra Stop-kor):

- `single`: Index egyezik → 100%, különben 0.
- `multi`: `hit = |A∩C| / |C|`, `false = |A\C|`. **tökéletes** ha A=C. **0%** ha hit=0. Rész = `hit * (1 ha false=0, különben hit*|C| / (|C|+|A\C|))` — lock: `ratio = |A∩C| / max(|A∪C|,1)` (Jaccard). 1.0 = tökéletes, 0 = üres metszet.
- `order`: `ratio = helyes_pozíció / n`
- `match` / `category`: `ratio = helyes_elem / n`
- `freetext`: 1.0 vagy 0 (§8.2 a termékben). Normalizál: lower, NFD ékezet strip, whitespace collapse. Találat ha szinonima exact **vagy** Levenshtein ≤ 1 **vagy** similarity ≥ 0.80 **vagy** a Text egy szinonima whitespace-tokenje (név).

**C / W (csapat, kvízkérdés):** tag EventUser, van Answer a kérdésre.

- tökéletes (ratio=1) → C
- ratio=0 → W
- 0 < ratio < 1 → se C, se W
- nincs Answer → se C, se W

---

## 3. Jogosultság

| Szerep | Teszt |
|---|---|
| Szervező | EventUser RoleType szervező **vagy** EventTypeOwner, Active |
| Kvízmester (QM) | EventUser játékmester RoleType, Active, **nincs** jegy-elvárás |
| Játékos | EventUser játékos, státusz Belépett (névtöredék belep/bejelentkez/checkin), Active |
| Display | `OP.DisplayToken` Token+EventID, nem járt le, ActiveFlg=1 |
| Device JWT | claim `TokenKind=OpDevice` + `EventID` |

Szervező **minden** QM actiont hívhat. Import / media / save OpSettings: **csak szervező** (QM 403).

Device JWT engedélyezett path:

- `GET /op/event/{EventID}` (claim egyezik)
- `POST /op/change` csak `Op.SubmitAnswer`, `Op.MosaicBuzz`, `Op.JoinTeam`
- `POST /signalr/join`
- `GET /event/userdata/{saját EventUserID}`
- `GET /user/data`

Minden más 403 `Ez a belépés csak erre az eseményre érvényes.`

---

## 4. Belépés

### 4.1 `POST /event/join` — OTP-s user (már spec: join-checkin)

Bővítés:

```json
{ "EventUID": "…", "TeamId": 12 }
```

`TeamId` opcionális. Ha van: `OP.Team` az Eventen, Active, létszám `< MaxTeamSize` → `OP.TeamMember` insert. Ha tele → 409 `A csapat betelt.` Ha nincs TeamId: EventUser létrejön **csapat nélkül**. A kliens `Op.JoinTeam`-et hív.

Minden más join-szabály marad (Bejelentkezés+, Játékos, Belépett, nincs mail).

### 4.2 `POST /auth/device-join`

Nincs OTP. Body:

```json
{
  "DeviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "DeviceName": "EventJoy WebApp",
  "EventUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "TeamId": 12,
  "LastName": "Kovács",
  "FirstName": "Anna"
}
```

`TeamId` opcionális (mint join). Név kötelező.

**Lépések**

1. EventUID → Event, Active, `OPFlg`, státusz Bejelentkezés+. Különben 404/400 `A helyszíni belépés a bejelentkezéstől él.`
2. DeviceId GUID. Identifier Type=Device, Value=lower(DeviceId).
3. Ha van User → azt használd. Ha nincs → INSERT `tblUser` (LastName, FirstName, Email null, Phone null) + identifier. **Ne** küldj mailt.
4. EventUser: mint join (Játékos, Belépett, UserID, új EventUserUID ha INSERT). Ugyanaz a User+Event aktív játékos → ne duplikáld, Belépett-re léptesd, JWT újra.
5. TeamId ha van → TeamMember, MaxTeamSize, 409 ha tele.
6. JWT: szokásos mezők + `TokenKind: "OpDevice"` + `EventID` + `EventUserID`. Rövid lejárat oké (pl. 12 óra), refresh nem kötelező v1.

200:

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "Belépés kész.",
  "Token": "…",
  "EventID": 40,
  "EventUserID": 321
}
```

Ugyanaz a DeviceId **más** Eventen: ugyanaz a User, új EventUser, új JWT az **új** EventID-re.

### 4.3 `POST /op/change` `Op.JoinTeam`

Játékos / device. Payload `{ "TeamId": 12 }`. Már van aktív tagság más csapatban → 409 `Már egy csapatban vagy.` Tele → 409. 200 + GET.

---

## 5. Display token

`POST /op/display-token`  Auth: szervező vagy QM. Body `{ "EventID": 40 }`.

- 4 jegyű PIN, nem `0000`. Token 32+ byte hex.
- `ExpiresAtUtc` = now+18h (vagy esemény EndAtUtc + 2h, amelyik későbbi).
- Előző Active token ugyanarra az EventID-re: ActiveFlg=0 (egyszerre egy élő PIN).

200: `{ "ReturnValue": 1, "Pin": "4821", "Token": "…", "ExpiresAtUtc": "…", "EventID": 40 }`

`POST /signalr/join`: Bearer JWT **vagy** header `X-Op-Display-Token` / body `DisplayToken`. Érvényes → csoport `event_{id}_display` (+ `gamer` nem kötelező a TV-nek).

---

## 6. `POST /op/change`

```json
{
  "EventID": 40,
  "Action": "Op.StartQuestion",
  "Payload": {}
}
```

Event nem 43 / nincs OP settings → 400 `Nem Olimpub esemény.` Élő kvíz actionök: EventStatus **Játék** (névtöredék `jatek`). Kivéve JoinTeam / Penalty (Bejelentkezés+).

### 6.1 `Op.SetRoundTopic`

```json
"Payload": {
  "Mode": "fixed",
  "TopicId": 2,
  "Picker": null
}
```

| Mode | Kötelező | |
|---|---|---|
| `fixed` | `TopicId` | a topic az EventSettings.TopicIds-ben, **nincs** másik Round TopicID-je Active |
| `pick` | `Picker`: `first` \| `last` | TopicId **tiltva**. A Fő Tabella (ha üres: TeamId ASC) első/utolsó csapata a kliensen választ; a FE utána `fixed`+TopicId-t hív **vagy** második hívás `TopicId` + Mode fixed. **Lock:** `pick` csak megjegyzi a Pickert, Status `pending`. Következő hívás `Op.SetRoundTopic` Mode=`fixed`+TopicId a választott. |
| `wheel` | — | display `draw_animation`. A FE a kerék után `fixed`+TopicId |

Új `OP.Round` SortIndex = max+1, Status `pending`, TopicID null amíg fixed be nem jön.

400 ha a topic már volt az estén vagy nincs az engedélyezett listán: `Ez a témakör nem választható.`

### 6.2 `Op.GenerateRound`

```json
"Payload": { "RoundId": 5 }
```

Round pending, TopicID **kitöltve**. Ha EventQuestion már van a Roundon → 400 `A kérdéskör már megvan.`

**Algoritmus** a repository `OP.Question` (TopicID, ActiveFlg=1), még **nincs** Active EventQuestion ugyanazon az EventID-n erre a QuestionID-re (ne ismételd az estén):

- SortIndex 1,3,5,7: `TypeCode=single` — 4 db, random
- 2,4,6,8: a `{multi,order,match,category,freetext}`-ből **4 különböző** típus, egy-egy kérdés, random melyik típus marad ki

Kevesebb mint kell → 400 `Nincs elég kérdés a témakörben.` TimeSec a Question.TimeSec (ha null/0: § típus default). Status `pending`. Round Status `active`.

Típus default TimeSec ha Question.TimeSec ≤ 0: single 20, multi 25, order/match/category 30, freetext 40.

### 6.3 `Op.StartQuestion`

```json
"Payload": { "RoundId": 5, "QuestionId": 88 }
```

`QuestionId` = `OP.EventQuestion.id`. Round active. Előző SortIndex a körben `stopped` (vagy SortIndex=1). Cél `pending`. → `active`, `StartedAtUtc=now`.

Idempotens: már active ugyanez → 200, ne másold az órát.

### 6.4 `Op.SubmitAnswer`

```json
"Payload": {
  "Kind": "round",
  "QuestionId": 88,
  "Answer": { "Index": 1 }
}
```

`Kind`: `round` | `extra`. Extra: `QuestionId` = ExtraQuestion.id.

- Játékos Belépett, csapat **kell** (TeamMember). Nincs csapat → 400 `Válassz csapatot.`
- Kérdés `active`. Különben 400 `A kérdés lezárult.`
- AnswerJson valid a TypeCode-ra.
- UPSERT `OP.Answer` / `ExtraAnswer`. **Utolsó POST nyer**, amíg active.
- **Ne** számolj S-t itt. 200 `{ ReturnValue:1, ReceivedAtUtc }`

Device JWT: EventUserID a tokenből, ne a body-ból.

### 6.5 `Op.StopQuestion`

```json
"Payload": { "Kind": "round", "QuestionId": 88 }
```

Csak active → `stopped`, `StoppedAtUtc=now`. Már stopped → 200, **ne** számolj újra (idempotens).

**Kvíz (`round`) pontozás — itt, egyszer:**

Minden Active Team az Eventen (még 0 válaszos is):

```
T = EventQuestion.TimeSec
P = P_alap(TypeCode)           -- 80/90/100/100/110/120
C, W = §2
ha C = 0 → RawS = 0
különben
  t = az első ratio=1 Answer ReceivedAtUtc - StartedAtUtc, mp, clamp [0,T]
  M_gyors = 1 + 0.3 * ((T - t) / T)
  M_csapat = 1 + (C - 1) * 0.03 - (W * 0.03)
  RawS = P * M_gyors * M_csapat
```

Részleges csapattag: a csapat RawS-be a fenti C/W megy (rész nem C/W). **Nincs** külön rész-S a csapatnak a v1 lockban a képletben — a csapat S csak C≥1 tökéletesekből él. (A shadow arányos, lent.)

Írd `OP.QuestionScore`.

**Shadow** minden Answerre: `S = P * ratio * M_gyors_own` ahol `M_gyors_own` a saját `t`-je (nincs válasz → nincs shadow sor). `ratio` §2.

Extra `Kind=extra`: **ne** QuestionScore. EG1: lásd §9 (leggyorsabb helyes +10, Stop-kor kérdésenként). EG4–8: Stop-kor még nem ír ExtraScore-t; `Op.StopExtra` összesít.

### 6.6 `Op.NextQuestion`

```json
"Payload": { "RoundId": 5 }
```

Az aktuális active-t **előbb** stoppold (ha active: implicit Stop, majd next). Következő pending SortIndex StartQuestion. Nincs több → 400 `A kérdéskör véget ért.` A FE hívja CloseRound-ot.

### 6.7 `Op.CloseRound`

```json
"Payload": { "RoundId": 5 }
```

Mind a 8 EventQuestion `stopped`. Különben 400 `Még van nyitott kérdés.`

N = Active Team count (≥1). Team RawSSum = SUM(QuestionScore.RawS) a 8 kérdésre (nincs sor → 0).

Rangsor RawSSum DESC. Holtverseny: azonos Place = a **jobb** hely, a következő Place ugrik (két 2. → következő Place=4).

```
P_max=100
P_min = N<=5 ? 50 : N<=10 ? 40 : N<=20 ? 30 : 20
N=1 → F = P_max
F = ROUND(P_min + (P_max - P_min) * ((N - Place) / (N - 1)), 0)
```

`ROUND` matematikai (0.5 fel). Írd `OP.RoundScore`. Round Status `closed`.

### 6.8 `Op.PublishRound`

```json
"Payload": { "RoundId": 5 }
```

Status `published`. SignalR §10. A játékos GET-en innentől látja a kör F-jét.

### 6.9 `Op.ShowLeaderboard`

```json
"Payload": { "Board": "main" }
```

`Board`: `main` | `quiz` | `games` | `shadow` | `raw`. Nem számol újra F-et. SignalR display State=`leaderboard` + board kulcs. A TV GET-elhet.

### 6.10 `Op.Penalty`

```json
"Payload": { "TeamId": 12, "Points": -10, "UndoOfID": null }
```

`Points` ≠ 0, egész. Büntetés negatív. Undo: `UndoOfID` = előző Penalty.id, `Points` = ellentett, az eredeti ActiveFlg marad (a GET SUM ActiveFlg=1). Szervező+QM. Bejelentkezés+.

### 6.11 Extra

`Op.StartExtra` `{ "ExtraGameId": "EG1" }`

- ExtraGameId az EventSettings listában.
- Nincs másik ExtraRun `active`.
- INSERT ExtraRun + ExtraQuestion-ök:

| ID | Kérdések |
|---|---|
| EG1 | 5× `single` random a repositoryból, engedélyezett topic, TimeSec=10 |
| EG3 | **0 kérdés** (csak KaraokeSet) |
| EG2 | **0 kérdés** (buzz + judge) |
| EG4 | 5× `freetext` TimeSec=20 |
| EG5 | 5× `single` TimeSec=12 |
| EG6 | 5× `freetext` TimeSec=20, MediaKey ha van a kérdésen |
| EG7 | 5× `single` TimeSec=12 |
| EG8 | 5× `freetext` TimeSec=20 |

Nincs elég kérdés → 400.

`Op.StartExtraQuestion` `{ "ExtraQuestionId": n }` — mint StartQuestion.

`Op.StopExtraQuestion` `{ "ExtraQuestionId": n }` — EG1: a **legkisebb t** ratio=1 Answer; holtverseny kisebb EventUserID. Annak a **csapata** +10 (még ne ExtraScore összes, staging: `OP.ExtraScore` upsert +10 vagy külön `OP.ExtraTick` — **lock:** StopExtraQuestion EG1-nél UPSERT ExtraScore Points += 10 arra a TeamID-re, ExtraRun még active).

`Op.StopExtra` `{ "ExtraRunId": n }`

- EG1: ExtraScore már megvan (max 50). Status closed.
- EG2: ExtraScore a Judge-okból (lent).
- EG3: ExtraScore = SingerCount*10 a KaraokeSet utolsó állapotából — tárold `OP.KaraokeCount(ExtraRunID, TeamID, SingerCount)` KaraokeSet-kor.
- EG4–8: team Raw mint kvíz S **kérdésenként** ExtraAnswer-ből (C/W/M_gyors ugyanaz a képlet, P_alap a típusé), SUM → rangsor → Top5 pont 50/40/30/20/10, holtverseny mint F (két 2. kap 40, nincs 3., következő 4.=20). Többi csapat 0. Írd ExtraScore. Status closed.

`Op.MosaicBuzz` `{ }` — TeamId a tagból. ExtraRun EG2 active. SignalR contributor+display: `TeamId`, `BuzzAt`. Nem pontoz.

`Op.MosaicJudge` `{ "TeamId": 12, "CorrectFlg": true }`

- false: nincs pont, ExtraRun marad active (más buzz).
- true: ExtraScore += 20 annak a csapatnak, **egy** nyertes / „zeneszám”. Payload opcionális `ClipIndex`. Következő clip a FE Startolja; ha nincs több, FE StopExtra.

`Op.KaraokeSet` `{ "TeamId": 12, "SingerCount": 3 }` UPSERT, SingerCount ≥ 0. Pont csak StopExtra-kor.

---

## 7. Kérdésimport

`POST /op/questions/import`  Auth: **szervező**. A FE parse-olja az xlsx-et (mint invite). Nincs xlsx a procban.

```json
{
  "EventID": 40,
  "Questions": [
    {
      "Topic": "90-es évek",
      "Type": "single",
      "Prompt": "Ki énekelte?",
      "Options": ["A", "B", "C", "D"],
      "Correct": { "Index": 1 },
      "TimeSec": null,
      "MediaKey": null
    }
  ]
}
```

HU `Type` alias: Egyválasztós→single, Többválasztós→multi, Sorrendezés→order, Párosítás→match, Kategorizálás→category, Szabad szöveg→freetext.

Minden sor:

1. Topic upsert Name.
2. TypeCode valid.
3. CorrectJson a típus shape-je. Freetext: Correct.Synonyms a `Helyes` `|` split ha a FE még stringet küld — **fogadd el** `Correct: "a|b"` stringnek is, vedd szét.
4. INSERT `OP.Question` (repository).
5. TimeSec null → típus default.
6. Az eseményhez **nem** kell EventQuestion (az GenerateRound). A repository globális.

400 soronként, mint invite: `{ Rows: [{ Index, ResultMsg }] }` ha bármelyik rossz, **ne** commitolj (egy tranzakció).

200: `{ ReturnValue: 1, Inserted: 12 }`.

---

## 8. Média

`POST /op/media` szervező. `multipart/form-data`: `EventID`, `MediaKey` (filename-safe `[a-zA-Z0-9._-]+`), `file`.

Azure Blob (meglévő storage). Hash SHA256. UPSERT `OP.Media`. 200: `{ MediaKey, BlobUrl, ContentHash, Mime }`.

`GET /op/media/manifest/:eventId` szervező+QM: `[{ MediaKey, BlobUrl, ContentHash, Mime }]`. A helyi cache FE ügy.

Kérdés MediaKey kötés: `POST /op/change` `Op.BindMedia` `{ "QuestionId": 1, "MediaKey": "intro.mp3", "Kind": "repo" }` — `OP.Question.id` (repository). 403 játékos.

---

## 9. GET

### `GET /op/event/:id`

Auth: szerv / QM / játékos (saját event) / device JWT / display token.

Dataset nevek (Result set alias, mint userdata):

| Dataset | Ki mit kap |
|---|---|
| `OpSettings` | mind |
| `OpTeams` | id, EventID, KabalaID, Name (=Kabala.Name), MemberCount |
| `OpTeamMembers` | TeamID, EventUserID — játékos csak **saját** csapatát |
| `OpRounds` | |
| `OpEventQuestions` | QM/szerv: a kör összes + **CorrectJson**. Játékos/device: csak `StatusCode=active` + CorrectJson. Display token: active **CorrectJson nélkül** (Options+Prompt igen) |
| `OpLive` | 1 sor: DisplayState, ActiveRoundID, ActiveEventQuestionID, ActiveExtraRunID, ActiveExtraQuestionID |
| `OpExtra` | active run + questions ugyanaz a Correct szabály |
| `OpPenalties` | Active, QM/szerv/display; játékosnak elég a leaderboard |

Nincs kör → üres tömb, ne 500.

### `GET /op/leaderboard/:eventId?board=main`

| board | SQL |
|---|---|
| `main` | Team: SUM(RoundScore.F where Round published vagy closed — **lock: closed elég**, Publish csak SignalR) + SUM(ExtraScore ahol ExtraRun closed) + SUM(Penalty.Points Active) |
| `quiz` | SUM(F) |
| `games` | SUM(ExtraScore closed) |
| `raw` | SUM(QuestionScore.RawS) az eventen (élő, closed F nélkül) |
| `shadow` | EventUser: SUM(ShadowScore.S), név First+Last |

200: `{ Board, Rows: [{ TeamId, Name, Points, Place }] }` shadow: `{ EventUserID, Name, Points, Place }`. Place holtverseny ugyanaz a szabály. Display és QM hívja; játékos csak `published` körök F-jét a main-en — **lock:** játékos `main` = ugyanaz mint QM (F closed), Extra closed. `raw` **403** játékosnak.

### `GET /op/questions/:eventId`

Szervező. Repository kérdések, amik az Event TopicIds-hez tartoznak (szűrő), + az estén már EventQuestionben lévők jelölve.

---

## 10. SignalR Outbox

Új csoport: `event_{EventID}_display`.

Egyedi blokk a gazda. `tblEventActionRule` **ne** küldje újra a teljes `@Json`-t ezekre.

Mini közös: `{ "Action", "EventID", "State" }`  
`State`: `idle` | `question_active` | `media_playing` | `draw_animation` | `leaderboard`

| Action | Csoport | Extra mezők |
|---|---|---|
| `Op.StartQuestion` | `display` | State=`question_active`, EventQuestion **CorrectJson nélkül**, Prompt, OptionsJson, TimeSec, SortIndex |
| `Op.StartQuestion` | `participant` + `gamer` ping | **participant** user csatorna vagy role `participant`: Prompt, Options, TimeSec, **CorrectJson** (Pinia). Display-re Correct **tilos**. |
| `Op.StartQuestion` | `contributor` + `organizer` | teljes kérdés Correct-tel (vezérlő) |
| `Op.StopQuestion` | `display`, `gamer` | State marad vagy `idle`, QuestionId, Status=stopped. Nincs Score a participantnek |
| `Op.ShowLeaderboard` | `display`, `gamer` | State=`leaderboard`, Board. **Nincs** Rows a hubon ha nagy — TV GET-el |
| `Op.SetRoundTopic` wheel | `display` | State=`draw_animation`, allowed Topic[] {id,Name} |
| `Op.PublishRound` | `gamer` | RoundId, Status. Mini |
| `Op.MosaicBuzz` | `contributor`, `organizer`, `display` | TeamId, TeamName |
| `Op.StartExtra` / extra question start | mint StartQuestion, Kind=extra | |

Ha a participant payload túl nagy: participant=`user_{EventUserID}` kérdésenként. A gamerre elég ping `{ Action, EventID }` → FE GET `/op/event`.

---

## 11. HTTP összefoglaló

| Method | Path | Auth |
|---|---|---|
| POST | `/event/save` | JWT, `OpSettings` ha 43 |
| POST | `/event/join` | JWT, opcionális TeamId |
| POST | `/auth/device-join` | nincs JWT |
| POST | `/op/change` | JWT / device |
| POST | `/op/questions/import` | szervező |
| POST | `/op/media` | szervező |
| GET | `/op/media/manifest/:eventId` | szerv+QM |
| GET | `/op/event/:id` | §3 |
| GET | `/op/leaderboard/:id` | §9 |
| GET | `/op/questions/:eventId` | szervező |
| POST | `/op/display-token` | szerv+QM |

Hibák (change / join):

| HTTP | |
|---|---|
| 400 | validáció, rossz státusz, kevés kérdés, forma |
| 403 | szerep / device scope |
| 404 | EventUID / id |
| 409 | csapat tele, már tag, duplikált kabala save |

---

## 12. Nem ebben a körben

- Device → e-mail merge
- Játékos kliens média stream
- PTA draw
- `ToStatusID` a kliensről OP actionben
- Folyamatos leaderboard push minden SubmitAnswer-re
