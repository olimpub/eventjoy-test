# PTA Display — eredmények kivetítése

Csak **PROFI-T-ABILITY** (`EventTypes.PTAFlg`). Nem Olimpub kvíz-Display (nincs kérdés, kerék, média).

Egy **vizuális** nézet, két belépés, ugyanaz a route: `/profitability/event/:id/display`.

| | A — Okos TV + PIN | B — Laptop megosztás |
|---|---|---|
| Hol fut | TV böngésző | szervező / kvízmester laptopja |
| Auth | 4 jegyű PIN → display-token | meglévő JWT (szerv/QM) |
| Adat | `GET /pta/display/:id` | ugyanaz a GET (JWT) + `PtaDisplayState` |
| Élő parancs | SignalR `event_{id}_display` | JWT + `includeDisplayGroup` |
| Státusz | **FE kész** (PIN, session, GET, ping) | **FE kész** (adatlap → Vetítés, csak szervező) |

A teremben ugyanaz a kép: 16:9, sötét PTA, helyezés + név + csoport a név alatt + összeg + kamion + `N e`. Nincs kereső, nincs bottom nav, nincs szerkesztés. PIN **soha** nem megy a kivetített képre.

---

## 0. Mit vetítünk

A fal = a játékos telefonos Eredménye: csak **publikált** forduló (`SName` ékezet nélkül `publikal` / `kozze`). Lezárt, nem publikált **nem** megy ki.

| Vezérlő | Érték | Default |
|---|---|---|
| `State` | `idle` \| `leaderboard` \| `seating` \| `ceremony` \| `roundstand` | PIN TV: `idle`, amíg nincs `Pta.ShowDisplay`. Laptop B: `leaderboard`, ha van publikált kör |
| `Scope` | `round` \| `total` | `total` |
| `RoundId` | `EventRound.EventRoundID` | tabella/dobogó: publikált; ülésrend / forduló állás: kisorsolt is |
| `GroupKey` | `null` (egyéni) vagy `team` / `organization` / `region` / `company` | `null`; ha a settingsben **Csapat** be van, default `team` |
| `Place` | 1–8, csak `ceremony` | Start: `min(8, N)` (N = publikált tabella sorok) |
| `Paused` | bit, csak `ceremony` | FE mindig `false`; a fal **nem** léptet időzítővel |

Helyezés a TV-n **mindig** látszik (`ShowUserPositionFlg` csak a játékos telefonra).

Pont: `EventSettings.Point1…4` (alap 8 / 4 / 2 / 0). A FE `buildStandings` / `aggregateStandings` — **a hubon nincs Rows**.

Egyéni lista: név alatt a bekapcsolt grouping (`TeamName · OrganizationName`, üres/`Nincs megadva` kihagyva). Aggregát: `n fő`.

Ha nem fér ki: 1 vagy 2 oszlop; ha még mindig kevés a hely, 8 mp-es lapozás. Ez FE, a GET a **teljes** publikált tabellát adja.

**Dobogó (`ceremony`):** ugyanaz a publikált tabella, a fal **egyszerre egy** sort mutat, 8. helytől 1.-ig. PIN-es TV-n nincs gomb — a szervező **Vetítés** oldalán **Dobogó / Előző / Következő / Újra**. Nincs automata léptetés, csak Control. URL nem változik.

**Forduló állás (`roundstand`):** élő kör, pont nélkül. Fal: `lezárt / összes` nagy szám, sáv, két lista (Függő / Lezárt). Lezárt = asztal `SName` Lezárt/Lejátszott **vagy** van rögzített schedule pont. Nincs Amount / kamion / e a falon.

Üres / nincs publikált kör: „Még nincs publikált eredmény.”
PIN TV, még nincs `ShowDisplay`: idle — „Várakozás a kivetítésre.”

---

## 1. Mi kész (B)

- Route: `/profitability/event/:id/display`, **nincs** MainLayout, bottom nav rejtve.
- Guard: PIN query vagy sessionStorage display-token → public (nem `/login`). Laptop JWT.
- Eredmények: tabella. **Vetítés** a szervezői adatlap menüje (`/profitability/event/:id/vetites`): **Ezen a gépen** (új ablak, Control marad) + **Okos TV** (PIN, QR, Új PIN). Játékmester / játékos nem látja.
- Display: 16:9 board, grouping a név alatt, több oszlop + lapozás. TV: idle, amíg `Pta.ShowDisplay`. Dobogó: 8.→1., 3–2–1 Bronz / Ezüst / Arany. Forduló állás: 3/5 + függő/lezárt.

---

## 2. PIN-es folyamat (A)

Előfeltétel: PTA esemény, legalább Bejelentkezés / Játék. Tabella csak publikálás után. A TV eléri a testappot **és** a testapi-t.

```
Szervező telefon/laptop (JWT)
  Adatlap → Vetítés
    POST /pta/display-token { EventID }
    oldal: URL + QR + PIN + Új PIN
    parancs → POST /event/change Pta.ShowDisplay

TV böngésző (nincs EventJoy user)
  /profitability/event/40/display?pin=4821
    meta.public — NEM /login
    POST /pta/display-session { EventID, Pin }
    token → sessionStorage (`ptaDisplayToken:{eventId}`)
    URL-ből a `pin` query le (replaceState) — a címsor ne mutassa a PIN-t
    GET /pta/display/40  (X-Pta-Display-Token)
    POST /signalr/join  ugyanazzal a headerrel, groupNames: ["event_40_display"]
    kép: idle VAGY stored PtaDisplayState
    SignalR Pta.ShowDisplay → újra GET → leaderboard
```

A PIN csak a szervező Vetítés oldalán és a TV **belépő** URL-jén van. A falon, a captionben, a QR utáni címsorban **nem**.

HDMI laptop (B) és PIN-es TV (A) **párhuzamosan** mehet. Ugyanaz a `ShowDisplay` mindkettőt viszi, ha a laptop is bent van a `display` csoportban.

---

## 3. Frontend — A-hoz még

### 3.1 Route / auth

| | |
|---|---|
| Path | `/profitability/event/:id/display` |
| Public | `pin` query **vagy** `sessionStorage` display-token ehhez az `id`-hez |
| Különben | JWT + szerv/QM, különben `/login` (mai B) |
| Játékos JWT | Displayről vissza az Eredményekre (mai viselkedés) |

Axios a Display GET/join/session hívásokon: **ne** a user JWT-t kényszerítsd, ha van display-token. Header: `X-Pta-Display-Token: {token}`. Opció: `Authorization: Bearer {token}` ugyanarra a tokenre (a GET mindkettőt fogadja).

### 3.2 Vetítés oldal (szervező)

Route: `/profitability/event/:id/vetites`. Csak szervező; más szerep visszairányít az adatlapjára.

**Ezen a gépen:** új ablak (`window.open`, név: `ptaDisplay:{id}`), a Control a Vetítés oldalon marad. HDMI / Cast a második ablakot viszi. A Control parancs `localStorage` + `BroadcastChannel('ptaDisplayCommand')` — így a fal ugyanúgy léptethető, mint a PIN-es TV. Popup blokk: toast, ne navigálj el.

Új blokk **TV**:

1. Oldal nyitásakor: `POST /pta/display-token`.
2. Mutasd: 4 jegyű PIN (nagy), HTTPS URL, QR ugyanarra az URL-re, lejárat.
3. **Új PIN** → újra `display-token` (a régi TV session 403 lesz).
4. Mód gomb (Játékosok / Csoportok / Ülésrend / Dobogó / Forduló állás / Várakozás) → `Pta.ShowDisplay`. Tabella/dobogó + nem publikált: toast „Előbb publikáld a fordulót.” Ülésrend / forduló állás: kisorsolt kör elég.
5. Hint: a TV-n nyisd meg a QR-t / URL-t. A PIN ne menjen a HDMI képre.

URL a sheetben:

`{origin}/profitability/event/{id}/display?pin={PIN}`

History router, nincs `#`.

### 3.3 TV Display állapotok

| Állapot | Kép |
|---|---|
| Session 403 / hiányzó PIN | „Érvénytelen vagy lejárt PIN.” + 4 mezős PIN újra (kézi), **nem** EventJoy login |
| Token lejárt GET/SignalR közben | „A kivetítés lejárt.” Szervező: Új PIN |
| `State=idle` | logó + esemény címe + „Várakozás a kivetítésre.” |
| `State=leaderboard`, van publikált | a mai board (oszlop + lapozás) |
| `State=ceremony` | egy kártya, 8.→1.; csak Control léptet; 3–2–1 Bronz / Ezüst / Arany |
| `State=roundstand` | `N / M` lezárt asztal, sáv, Függő / Lezárt lista; pont nincs |
| `State=seating` | ABC ülésrend |
| Nincs publikált kör | „Még nincs publikált eredmény.” |

Reconnect: van sessionStorage token → ne kérj PIN-t újra; GET; ha a state már `leaderboard`, azt tedd ki.

### 3.4 Laptop a display csoporton (B, ha a BE megvan)

A `/display` JWT úton joinolhatja `event_{id}_display`-t **a szokásos role/gamer/user mellé**. `Pta.ShowDisplay` a laptop falát is átállítja. Addig a B a query + Pinia szerint megy, ShowDisplay nélkül.

---

## 4. Backend

Nem `OP.*`. Nem `spChangeEvent` a tokenre. C# + SQL, mint az invite. PTA `dbo`.

### 4.1 `dbo.EventDisplayToken`

```sql
EventID        int            NOT NULL,
Module         nvarchar(16)   NOT NULL,  -- 'pta'
Pin            char(4)        NOT NULL,
Token          nvarchar(80)   NOT NULL,
ExpiresAtUtc   datetimeoffset NOT NULL,
ActiveFlg      bit            NOT NULL CONSTRAINT DF_EventDisplayToken_Active DEFAULT (1),
CreatedAtUtc   datetimeoffset NOT NULL CONSTRAINT DF_EventDisplayToken_Created DEFAULT (SYSUTCDATETIME())
```

- Egy élő sor EventID+Module-on: `ActiveFlg=1` és `ExpiresAtUtc > now`.
- Új `display-token`: a korábbi élőt `ActiveFlg=0`.
- PIN: 4 számjegy, **nem** `0000`, kriptó RNG. Ütközés ugyanazon az eseményen: újragenerálás.
- Token: ≥32 byte hex (vagy URL-safe), nem a PIN.
- Lejárat: `max(Event.EndAtUtc + 4 óra, now + 12 óra)`. Nincs `EndAtUtc`: `now + 12 óra`.

Index: `(EventID, Module, ActiveFlg)`; `Token` unique.

### 4.2 `dbo.PtaDisplayState`

Egy sor EventID-re.

```sql
EventID        int            NOT NULL PRIMARY KEY,
State          nvarchar(16)   NOT NULL,  -- idle | leaderboard | seating | ceremony | roundstand
Scope          nvarchar(16)   NOT NULL,  -- round | total
RoundId        int            NULL,      -- EventRound.EventRoundID
GroupKey       nvarchar(32)   NULL,      -- null | team | organization | region | company
Place          tinyint        NULL,      -- 1–8, csak ceremony
Paused         bit            NOT NULL CONSTRAINT DF_PtaDisplayState_Paused DEFAULT (0),
UpdatedAtUtc   datetimeoffset NOT NULL
```

### 4.3 `POST /pta/display-token`

Auth: Bearer JWT. **Szervező vagy kvízmester** (contributor) az EventID-n. Játékos → **403**. Nem PTA → 403/400.

Body:

```json
{ "EventID": 40 }
```

200:

```json
{
  "ReturnValue": 1,
  "EventID": 40,
  "Pin": "4821",
  "Token": "a1b2c3…",
  "ExpiresAtUtc": "2026-09-10T02:00:00.000Z",
  "Url": "/profitability/event/40/display"
}
```

A `Url` **relatív, PIN nélkül**. A FE rakja ki az origint és a `?pin=`. A válasz `Token` mezője opcionális a sheetnek (a TV a sessionből kap tokent).

Idempotens: minden hívás **új** PIN (invalidálja a TV-t). Nincs „add vissza a régit”.

### 4.4 `POST /pta/display-session`

**Nincs JWT.** Rate limit: pl. 10 rossz PIN / EventID / 10 perc → 429.

Body — az egyik azonosító kötelező:

```json
{ "EventID": 40, "Pin": "4821" }
```

vagy

```json
{ "EventUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Pin": "4821" }
```

Élő token, PIN egyezik, esemény PTA és Active → 200:

```json
{
  "ReturnValue": 1,
  "EventID": 40,
  "Token": "a1b2c3…",
  "ExpiresAtUtc": "2026-09-10T02:00:00.000Z"
}
```

Különben **403**, egy üzenet: `Érvénytelen vagy lejárt PIN.` Ne áruld el, hogy a PIN rossz vagy lejárt.

### 4.5 `GET /pta/display/:eventId`

Auth, **egyik**:

- `Authorization: Bearer {user JWT}` és szerv/QM az eseményen
- `Authorization: Bearer {DisplayToken}`
- header `X-Pta-Display-Token: {DisplayToken}`

Token lejárt / inaktív / más EventID → **401** `A kivetítés lejárt.`
Játékos JWT → **403**.
Nem PTA → 403.

Payload: annyi, hogy a FE `buildStandings` + grouping fusson. **Csak publikált** körök. Nincs e-mail, telefon.

Ugyanaz a JSON JWT-vel és display-tokennel (A és B ugyanazt mutatja). A staff **Eredmények** oldal továbbra is a userdata-t használja (Lezárt is); ez a GET nem.

Result set nevek = userdata, hogy a FE `pickDataset` menjen:

```json
{
  "ReturnValue": 1,
  "EventID": 40,
  "Events": [
    {
      "id": 40,
      "Title": "PROFI-T-ABILITY — teszt",
      "EventUID": "…",
      "EventStatusID": 5,
      "EventTypeID": 12
    }
  ],
  "EventSettings": [
    {
      "EventID": 40,
      "Point1": 8,
      "Point2": 4,
      "Point3": 2,
      "Point4": 0,
      "OrganizationGrpFlg": false,
      "TeamGrpFlg": true,
      "RegionGrpFlg": false,
      "CompanyGrpFlg": false,
      "ShowUserPositionFlg": true
    }
  ],
  "EventRounds": [
    {
      "id": 3,
      "EventID": 40,
      "OrderIndex": 1,
      "RName": "1. forduló",
      "EventRoundStatusID": 4,
      "SName": "Publikált"
    }
  ],
  "EventRoundDesks": [],
  "GameSchedules": [],
  "EventPlayers": [
    {
      "EventPlayerID": 101,
      "EventID": 40,
      "EventUserID": 55,
      "FirstName": "Anna",
      "LastName": "Kovács",
      "Name": "Kovács Anna",
      "TeamName": "Alfa",
      "OrganizationName": null,
      "RegionName": null,
      "CompanyName": null
    }
  ],
  "PtaDisplayState": {
    "EventID": 40,
    "State": "idle",
    "Scope": "total",
    "RoundId": null,
    "GroupKey": null,
    "UpdatedAtUtc": "2026-09-09T12:00:00.000Z"
  }
}
```

`EventRoundDesks` / `GameSchedules`: **publikált** körök mindig. Ha `PtaDisplayState.State` = `seating` **vagy** `roundstand`, **plusz** a `RoundId` köre akkor is, ha még nincs publikálva. Mezők: `EventRoundID`, `EventRoundDeskID`, asztal `DName` / `DeskNo`, `SName` (Lezárt). `roundstand` fal nem mutat pontot: `Amount` / `OnTrack` / `ResultPoint` elhagyható a nem publikált körön.

`EventPlayers`: név + grouping. **Tiltott:** `EmailAddress`, `PhoneNumber`. `UserID` nem kell.

Nincs publikált kör: üres tömbök, `PtaDisplayState` akkor is.

### 4.6 `Pta.ShowDisplay` — `POST /event/change`

Ugyanaz a keret, mint a többi `Pta.*` (`EventID`, `Action`, `Payload`). `spChangeEvent` ismerje.

```json
{
  "EventID": 40,
  "Action": "Pta.ShowDisplay",
  "Payload": {
    "State": "leaderboard",
    "Scope": "total",
    "RoundId": 3,
    "GroupKey": "team"
  }
}
```

| Payload | |
|---|---|
| `State` | `idle` \| `leaderboard` \| `seating` \| `ceremony` \| `roundstand` |
| `View` | ugyanaz, mint `State`. FE fallback: `State: leaderboard` + `View: ceremony` / `seating`; `roundstand` fallback: `State: seating` + `View: roundstand`. `View` nyer. Alias: `progress` → `roundstand`, `podium` → `ceremony` |
| `Scope` | `round` \| `total` (`leaderboard` / `ceremony`). `seating` / `roundstand`: `round` |
| `RoundId` / `EventRoundID` | ugyanaz a szám: `EventRound.EventRoundID`. Tabella/dobogó: **publikált**. Ülésrend / forduló állás: kisorsolt is. `idle`-nál opcionális |
| `GroupKey` | JSON `null` / hiány = egyéni. `team` \| `organization` \| `region` \| `company` csak ha a settings flag 1. `"player"` → `null`. `seating` / `roundstand` / `idle`: null |
| `Place` | `ceremony`: 1–8. Más state: null / ignore |
| `Paused` | `ceremony`: ignore a falon (FE nem léptet). Más state: ignore |

Validáció:

- `leaderboard` / `ceremony` + nem publikált `RoundId` → hiba, ne no-op.
- `seating` / `roundstand` + kisorsolt (nem publikált) `RoundId` → **OK**.
- `roundstand` + nincs ilyen kör / nem ehhez az EventID-hez → hiba.
- Jog: szerv vagy QM. Játékos **403**.

Mentés: `PtaDisplayState` upsert (`Place`, `Paused` is).

200: `{ "ReturnValue": 1, "Action": "Pta.ShowDisplay", "EventID": 40 }`.

### 4.6.1 Dobogó — BE checklist

A FE kész. A TV PIN-es fal a GET tabellából veszi a 8 sort; a hubon **nincs Rows**.

1. `State` / `View` fogadja: `ceremony` (alias: `podium`).
2. Mentés + GET `PtaDisplayState`: `Place` (1–8), `Paused` (bit).
3. SignalR mini ugyanaz: `State`, `View`, `Scope`, `RoundId`, `GroupKey`, `Place`, `Paused`.
4. `ceremony` RoundId = publikált `EventRoundID` (mint leaderboard). A GET továbbra a **teljes publikált** `EventRoundDesks` + `GameSchedules` (a fal számol helyezést).
5. `Place` hiány / 0: a FE `min(8, N)`-nel indul. Ne dobd el a parancsot.
6. Amíg a BE nem ismeri a `ceremony`-t, a FE retry: `State: leaderboard`, `View: ceremony`, `Place`, `Paused` — ezt is parse-old `ceremony`-nek (`View` nyer).

### 4.6.2 Forduló állás — BE checklist (FE kész)

Új tábla / új hub / Rows a pingben: **nincs**. A Fal a meglévő `EventRoundDesks.SName` (+ opcionális schedule pont) alapján számol `N / M`-et.

1. `State` / `View` fogadja: `roundstand` (alias: `progress`). Mentés: `PtaDisplayState.State = roundstand`.
2. `RoundId` = `EventRound.EventRoundID`, **kisorsolt / folyamatban is OK** (mint `seating`). Nem publikált ≠ hiba.
3. `Scope` = `round`. `GroupKey` / `Place` / `Paused` ignore.
4. SignalR mini **csak** `event_{EventID}_display`, **nincs Rows**:

```json
{
  "Action": "Pta.ShowDisplay",
  "EventID": 40,
  "State": "roundstand",
  "View": "roundstand",
  "Scope": "round",
  "RoundId": 12,
  "GroupKey": null
}
```

5. **GET `/pta/display/:id`:** ha `State` = `roundstand` (vagy `seating`), a `RoundId` kör `EventRounds` + `EventRoundDesks` sorai menjenek ki **akkor is, ha a kör nincs publikálva**. Kötelező mező: `EventRoundID`, `EventRoundDeskID`, `DName` / `DeskNo`, `SName`. Email / telefon tilos. Nem publikált körön `Amount` / `OnTrack` / `ResultPoint` **ne** menjen (a Fal nem mutatja).
6. **Asztallezárás ping — ez a hiányzó darab.** `Pta.PatchDesk` `SName` Lezárt / Lejátszott, **és** `Pta.SetDeskResults`, ha `PtaDisplayState.State` ∈ {`roundstand`, `seating`} **és** a desk `EventRoundID` = `PtaDisplayState.RoundId`: küldj **ugyanilyen mini `Pta.ShowDisplay`-t** a `display` csoportra (aktuális State + RoundId). A TV GET-el, a Fal újraszámol. Ma a `PatchDesk` csak organizer + contributor — a PIN-es TV abban nincs.
7. Fallback, ha a BE még nem ismeri a `roundstand`-et: FE retry `State: seating`, `View: roundstand`. Parse: `View` nyer → `roundstand`. A GET 5. pontja `seating`-nél is kell, különben a PIN üres.

### 4.7 SignalR

**Nincs új hub.** Új **csoportnév:** `event_{EventID}_display`.

#### Join

Mai body: `{ "connectionId", "groupNames" }`.

TV:

```http
POST /signalr/join
X-Pta-Display-Token: a1b2c3…
Content-Type: application/json

{
  "connectionId": "…",
  "groupNames": ["event_40_display"]
}
```

- Display-token érvényes, `groupNames` **csak** `event_{EventID}_display` (az EventID a tokené).
- **Tiltott** a TV-nek: `event_{id}_gamer`, `event_{id}_organizer|contributor|participant`, `event_{id}_user_*`. Ha ilyet kér → 403, ne tedd be.
- Nincs `eventUserId` — a mai JWT join 3 csoportot követel; a display-tokenes join **kivétel**.

Laptop `/display` + JWT: a szokásos 3 csoport **plusz** `event_{id}_display`, ha a `groupNames`-ben kéri. Szerv/QM. Játékos ne tudja joinolni a displayt.

#### Outbox — `Pta.ShowDisplay`

Egyedi blokk, **csak** `event_{EventID}_display`. Nincs RoleType fallback, nincs teljes `@Json`.

```json
{
  "Action": "Pta.ShowDisplay",
  "EventID": 40,
  "State": "ceremony",
  "View": "ceremony",
  "Scope": "total",
  "RoundId": 3,
  "GroupKey": null,
  "Place": 8,
  "Paused": false
}
```

**Nincs Rows.** A TV / laptop GET `/pta/display/:id`.

`Pta.PublishRound` **nem** kötelező Displayt frissíteni. Ajánlott: ha `PtaDisplayState.RoundId` ez a kör és `State=leaderboard`, küldj egy ugyanolyan mini ShowDisplay-t a `display` csoportra (a TV újra GET-el). Különben a szervező megnyomja a Kivetítés a TV-re-t.

---

## 5. Hibák (összefoglaló)

| Hol | Kód | Üzenet / viselkedés |
|---|---|---|
| token, játékos | 403 | |
| session, rossz/lejárt PIN | 403 | `Érvénytelen vagy lejárt PIN.` |
| session, túl sok próba | 429 | |
| GET, lejárt token | 401 | `A kivetítés lejárt.` |
| ShowDisplay, nem publikált kör | `ReturnValue < 0` | toast |
| ShowDisplay, játékos | 403 | |
| join, TV gamer csoportot kér | 403 | |

---

## 6. Nem ebben a körben

- Olimpub kérdés / kerék / mozaik (`/op/display-token` külön termék)
- Élő pontozás a falon Publish előtt
- Játékos kliensen Display
- PIN a kivetített képen
- Több egyidejű élő PIN ugyanarra az EventID+`pta`-ra
- Audio
- Poll-only mint szerződés (ha a SignalR csúszik, a FE 10 mp-es GET-tel túlélhet, de a BE szerződés a csoport)

---

## 7. Tesztchecklist

- [ ] Szervező token: PIN 4 jegy, nem `0000`; második POST invalidálja az elsőt; a régi TV session 401/403
- [ ] QM token OK, játékos 403
- [ ] TV `?pin=` jó → nincs login, van tábla/idle
- [ ] TV rossz PIN → hiba a Displayen, **nem** `/login`
- [ ] Session után a címsorban nincs `pin=`
- [ ] GET-en nincs e-mail/telefon. Publikált körök mindig. `seating` / `roundstand`: a `RoundId` kisorsolt asztalai is
- [ ] Lezárt, nem publikált kör a staff Eredményeken látszik; tabella-TV-n nem, Forduló állás TV-n igen (asztalnév, pont nélkül)
- [ ] ShowDisplay Csapat aggregát: HDMI laptop (B, ha joinolt) és PIN TV ugyanaz a caption
- [ ] Publish után a fal új pontot akkor kap, ha ShowDisplay / GET lefut (vagy az ajánlott Publish ping)
- [ ] Lejárt token → TV „A kivetítés lejárt”; Új PIN a sheetből új session
- [ ] TV SignalR: csak `event_{id}_display`; Seat JSON nem jön
- [ ] ShowDisplay `ceremony` + publikált RoundId + Place 8 → TV 8. hely, ott marad Következőig
- [ ] Következő → Place−1; Előző → Place+1; Újra → min(8, N)
- [ ] ceremony + nem publikált RoundId → hiba (mint leaderboard)
- [ ] seating + nem publikált RoundId → OK, GET-ben a kisorsolt asztalok is
- [ ] ShowDisplay `roundstand` + kisorsolt RoundId → TV `N/M`, Függő/Lezárt
- [ ] `PatchDesk` SName Lezárt, State=roundstand, ugyanaz a RoundId → display mini ShowDisplay; TV GET után N nő
- [ ] roundstand + ismeretlen RoundId → hiba
