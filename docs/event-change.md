# POST `/event/change` → `spChangeEvent(@Json)`

Frontend szerződés a Pinia dummy írások (`applyEventStatus`, `applyEventUserStatus`, PTA sorsolás/pontozás) alapján. A C# a request body-t `@Json nvarchar(max)`-ként adja a procnak. Egy tranzakció, `OPENJSON`, `Action` switch.

Nem varázsló-snapshot (az a `POST /event/save`). Itt **egy élő művelet** megy be.

- **URL:** `POST /api/event/change`
- **Body:** nyers JSON objektum (nem `{ "json": "..." }` string)
- **Auth:** Bearer JWT — a proc a hívó `UserID`-jét a tokenből kapja (C# adja `@UserID`-ként, vagy a JSON-ba is teheted; a FE **nem** küld UserID-t)
- **Outbox / MailerSend:** csak ha az action email/SMS-t igényel (pl. elutasított meghívó). SignalR később ugyanitt Outbox `channel: signalr`
- Mentés után a kliens **újra GET-el**: listán `GET /event/data`, adatlapon `GET /event/userdata/:eventUserId`

SQL eltérések a procban (leaderboard, SetDeskResults, ClaimDesk, PatchDesk fotó) a P1 actionöknél.

PTA SignalR Outbox delta (három teendő): **[`pta-signalr-backend.md`](./pta-signalr-backend.md)**.

---

## Backend — PTA élő kimenet

Implementációs delta (három teendő, payload minták, checklist): **[`pta-signalr-backend.md`](./pta-signalr-backend.md)**.

A kliens join: `event_{id}_{role}` + `event_{id}_gamer` + `event_{id}_user_{EventUserID}`. **Nem** csatlakozik `group_{ID}`-re. JM → `contributor`, játékos → `participant`.

**Névillesztés:** ékezet nélkül, lower-case (`Játék` → `jatek`, `Lezárt` → `lezar`, `Folyamatban` → `folyamat`, `Publikált` → `publikal`).

Két réteg: `tblEventActionRule` fallback + a proc egyedi blokkjai. **Ha az egyedi blokk a gazda, a szabálytábla ne küldjön újra.**

### Cél-Outbox (ez a szerződés)

| Action | Cél | Payload |
|---|---|---|
| `Pta.ReplaceDraw` | organizer, contributor, participant, **`gamer`** | sorsolás snapshot (ha a hub kicsi: gamerre ping is elég) |
| `Pta.Reset` | organizer, contributor, participant, **`gamer`** | `ToStatusID` |
| `Pta.SetRoundStatus` | **csak** `gamer` | mini: `EventRoundID` + `ToStatusID`. Nincs Seat |
| `Pta.CloseRound` | **csak** `gamer` | mini. Nincs Seat / Player / Final* |
| `Pta.PublishRound` | `gamer` | mini (chip). Nincs Seat |
| `Pta.PublishRound` | minden érintett `user_{EventUserID}` | **saját** `Seat` + `Player` |
| `Pta.ClaimDesk` | organizer, contributor | **nincs** `group_{ID}` |
| `Pta.PatchDesk` | organizer, contributor; **plusz** mini `Pta.ShowDisplay` a `display` csoportra, ha a Display `roundstand`/`seating` és a desk a `RoundId` köre |
| `Pta.SetDeskResults` | organizer, contributor, `user_{GameMasterID}` | `Seats[]`. **Nincs** `group_{ID}`, **nincs** játékos `user_*` |
| `EventUser.SetStatus` / `Apply` / `Remove` | organizer + **`event_{id}_user_{EventUserID}`** (a célpont sora) | státusz; jegy-QR: Belépett |

`SetRoundStatus` / `CloseRound` / `PublishRound`: vedd ki a RoleType fallbacket (különben újra kimegy a nagy `@Json`). A staff hallja a `gamer`-t, ne kapjon külön mini-t organizer/contributorra.

`SetDeskResults` kapu: esemény = Játék; forduló Megnyitva / Kisorsolva / Folyamatban; hívó az asztal GM-je vagy szervező. Első rögzítés: forduló → Folyamatban (idempotens). Ne írj asztal `SName: Lejátszott`-at. Az első Folyamatban-váltás SignalR-je a `gamer` mini `Pta.SetRoundStatus`.

Lezárt / Publikált célra a FE `CloseRound` / `PublishRound`-ot hív, ne `SetRoundStatus`-t.

---


## 1. Gyökér

| Mező | Típus | Kötelező |
|---|---|---|
| `EventID` | `number` | igen — `tblEvent.id` |
| `Action` | `string` | igen — lásd §2 |
| `Payload` | objektum | igen — actionenként más, üres `{}` nem elég ha a táblázat mezőt kér |

```json
{
  "EventID": 40,
  "Action": "Event.SetStatus",
  "Payload": {
    "ToStatusID": 4,
    "PrevStatusID": 3
  }
}
```

Ismeretlen `Action` → `ReturnValue < 0`, `ReturnDescription` pl. `Ismeretlen Action`.

`EventID` nem létezik / a usernek nincs joga → hiba, ne csendben no-op.

---

## 2. Action lista

### P0 — ezt köti be a FE először (ma localStorage)

| `Action` | Payload | Ma hol dummy |
|---|---|---|
| `Event.SetStatus` | `ToStatusID`, `PrevStatusID` | szervező adatlap státusz + undo |
| `EventUser.SetStatus` | `EventUserID` **vagy** `EventUserUID`, opcionális `EventUserIDs`, `ToStatusID`, `PrevStatusID` | meghívó Elfogadom/Elutasítom, résztvevő státusz, undo, QR scan |
| `EventUser.SetRating` | `EventUserID`, `Rating` (1–5 **vagy `null` = törlés**), `RatingComment?` | lezárt esemény értékelés — [`event-rating.md`](./event-rating.md) |
| `EventUser.PatchContact` | `EventUserID`, `LastName`, `FirstName`, `Email`, `Phone?` | résztvevő név/email/telefon — import javítás |

### P1 — ugyanaz a proc, később a FE

| `Action` | Payload | Ma hol dummy |
|---|---|---|
| `EventUser.Apply` | `EventTicketID` | publikus jelentkezés — UI még nincs bekötve |
| `EventUser.Remove` | `EventUserID` | résztvevő eltávolítás — UI még nincs |
| `Pta.ReplaceDraw` | `Desks`, `Rounds`, `RoundDesks`, `Players`, `Schedules` | `runPtaDraw` teljes snapshot |
| `Pta.SetRoundStatus` | `EventRoundID`, `ToStatusID` | Megnyitva / Kisorsolva / Folyamatban — **nem** zárás. SignalR: `event_{id}_gamer` |
| `Pta.CloseRound` | `EventRoundID`, `ToStatusID` | forduló **Lezárt** — státusz mindenkinek a gamer csoportban; **eredmény / Seat nincs** |
| `Pta.PublishRound` | `EventRoundID`, `ToStatusID` | forduló **Publikált** — státusz a gamer csoportban; Seat/Player **csak** user-csatornán |
| `Pta.SetDeskResults` | `EventRoundDeskID`, `Seats[]` | GM pontozás: esemény **Játék** + forduló Megnyitva/Kisorsolva/Folyamatban |
| `Pta.ClaimDesk` | `EventRoundDeskID`, `GameMasterUserID` (`null` = leadás) | asztalfoglalás |
| `Pta.PatchDesk` | `EventRoundDeskID`, `PhotoUrl?`, `SName?` | fotó (`PhotoUrl` → `AzurePhotoUrl`). Ha Display `roundstand`/`seating` és a desk a `RoundId` köre: mini `Pta.ShowDisplay` a `display` csoportra — [`pta-display.md`](./pta-display.md) §4.6.2 |
| `Pta.Reset` | `ToStatusID` | helyi `resetLocalPtaEvent` — draw törlés + EventStatus |
| `Pta.ShowDisplay` | `State`, `View`, `Scope`, `RoundId`, `GroupKey`, `Place?`, `Paused?` | PTA kivetítő. `State`: idle \| leaderboard \| seating \| ceremony \| **roundstand** |

**Nem ide tartozik**

| Végpont | Miért külön |
|---|---|
| `POST /event/save` | varázsló create/update snapshot |
| `POST /event/invite/import` | Excel meghívó + Outbox/MailerSend — PTA grouping: [`event-invite-import.md`](./event-invite-import.md) |
| `POST /event/invite/walkin` | kézi felvétel + meghívó mail; státusz az esemény fázisától: [`event-walkin-register.md`](./event-walkin-register.md) |
| `GET /event/join/:eventUid` + `POST /event/join` | kivetített EventUID QR, vendég self-check-in: [`event-join-checkin.md`](./event-join-checkin.md) |
| `POST /pta/display-token` + `GET /pta/display/:id` | PTA TV/PIN kivetítő: [`pta-display.md`](./pta-display.md) |
| Olimpub (`EventType` 43, `OP` séma) | [`olimpub-backend.md`](./olimpub-backend.md) — `POST /op/change`, nem `Pta.*`. Termék: [`olimpub.md`](./olimpub.md) |
| `POST /user/save` | profil |

QR scan **nem** külön API: `EventUser.SetStatus` + `EventUserUID` + `ToStatusID` = Belépett.

Elfogadom / Elutasítom **nem** külön API: ugyanez, `ToStatusID` = Megerősítve / Elutasítva.

---

## 3. `Event.SetStatus`

Szervező (vagy a flowban engedélyezett szerep) lépteti az **esemény** státuszát.

Master: `tblEventFlow` → `tblEventFlowStatus` (From→To) → `tblEventFlowStatusRole` (ki kattinthat). A FE ezt már szűri; a SQL **újra ellenőrizze**.

| Payload | Típus | |
|---|---|---|
| `ToStatusID` | `number` | cél `tblEventStatus.id` |
| `PrevStatusID` | `number \| null` | lásd alább |

### Előrelépés

A FE a master `EventFlowStatus.CanUndoFlg` alapján küldi:

- ha a **lépés** `CanUndoFlg = true` → `PrevStatusID` = **jelenlegi** `Event.EventStatusID` (a GET `PrevEventStatusID` mezője ez lesz)
- ha `CanUndoFlg = false` → `PrevStatusID: null` (ne őrizd a régit; a FE undo gombja eltűnik)

SQL:

```
UPDATE tblEvent
SET EventStatusID = @ToStatusID,
    PrevEventStatusID = @PrevStatusID   -- null is érvényes
WHERE id = @EventID;
```

`CanCloseFlg` a FE-n confirm dialógus; a SQL-nek nem kell külön flag, de a To státusz `ClosedFlg` / `InProgressFlg` a GET-ben kell.

### Visszavonás (undo)

A FE `ToStatusID` = a GET-ben lévő `PrevEventStatusID`, és **`PrevStatusID: null`**.

Ez kitörli az undo stacket (egy lépés vissza). Nincs külön `Action`.

### Jóváhagyásos lépés

A FE ma **nem küld** ilyen SetStatus-t (`requiresApproval` → toast). GET mező: `Event.PendingApprovalID`.

Ha később kell: vagy a SetStatus `ApprovalID`-t állítja pendingre **státuszváltás nélkül**, vagy külön action. P0-ban **utasítsd el**, ha a `EventFlowStatus.ApprovalID` nem null.

### PTA sorsolás

Ha a cél státusz neve „Sorsolás” (vagy hasonló), a **FE külön** `Pta.ReplaceDraw`-t küld (P1). A SetStatus **ne** sorsoljon magától.

### Minta — előrelépés, undo-képes lépés

```json
{
  "EventID": 40,
  "Action": "Event.SetStatus",
  "Payload": {
    "ToStatusID": 4,
    "PrevStatusID": 3
  }
}
```

### Minta — undo

```json
{
  "EventID": 40,
  "Action": "Event.SetStatus",
  "Payload": {
    "ToStatusID": 3,
    "PrevStatusID": null
  }
}
```

---

## 4. `EventUser.SetStatus`

Résztvevő / saját meghívó / scan. Master: jegy `TemplateID` → `tblEventUserFlowTemplateStep` (From→To, `CanUndoFlg`).

| Payload | Típus | |
|---|---|---|
| `EventUserID` | `number` | `tblEventUser.id` — résztvevő lista, meghívó sheet |
| `EventUserUID` | `string` | `tblEventUser.EventUserUID` GUID — **QR**. Normalizáld: `{guid}`, `eventjoy:eu:`, URL `?uid=` |
| `EventUserIDs` | `number[]` | opcionális batch („Mindenki bejelentkezik”). Ha van, az ID/UID mezőt mellőzheted |
| `ToStatusID` | `number` | `tblEventUserStatus.id` |
| `PrevStatusID` | `number \| null` | ugyanaz a szabály, mint az Event: `CanUndoFlg` → tedd a jelenlegi státuszt, undo-nál `null` |

Pontosan **egy célsor-halmaz** kell:

1. `EventUserIDs` nem üres → azok a sorok
2. különben `EventUserID`
3. különben `EventUserUID` → keresd a GUID-ot

Minden sorra: `EventUser.EventID == gyökér EventID`. Eltérés → hiba, semmit se írj.

Jogosultság:

- **Saját sor** (JWT UserID = EventUser.UserID): meghívó Elfogadom/Elutasítom, saját flow-lépés
- **Szervező / GM** az eseményen: mások státusza, batch check-in, scan
- A step létezzen a jegy template-jében (scan: cél tipikusan „Belépett”)

SQL soronként:

```
UPDATE tblEventUser
SET EventUserStatusID = @ToStatusID,
    PrevEventUserStatusID = @PrevStatusID
WHERE id = @EventUserID AND EventID = @EventID;
```

### Elutasítás

Ha a cél státusz „Elutasítva” / „Lemondva”:

- státuszváltás mint fent
- kapcsolódó `Invitation.ActiveFlg = 0` (ha van Invitation az EventUserhöz)

### Batch — mindenki Belépett

A FE a résztvevő játékosokra (nem szervező) küldi, akik még nem Beléptek:

```json
{
  "EventID": 40,
  "Action": "EventUser.SetStatus",
  "Payload": {
    "EventUserIDs": [120, 121, 122],
    "ToStatusID": 8,
    "PrevStatusID": null
  }
}
```

Batch-nél `PrevStatusID` lehet `null` (a FE nem rekordol undo-t tömegesen), vagy soronként a régi státusz — ha `null`, ne írd felül a `PrevEventUserStatusID`-t mással, hagyd / nullázd konzisztensen. Javaslat: batch-nél `PrevEventUserStatusID = EventUserStatusID` (a váltás előtti), hogy egyenként undo-zhato maradjon.

### Minta — meghívó elfogadás

```json
{
  "EventID": 40,
  "Action": "EventUser.SetStatus",
  "Payload": {
    "EventUserID": 120,
    "ToStatusID": 3,
    "PrevStatusID": 2
  }
}
```

`ToStatusID` = master „Megerősítve”. `PrevStatusID` = jelenlegi (általában NeedUserApproval státusz).

### Minta — QR check-in

```json
{
  "EventID": 40,
  "Action": "EventUser.SetStatus",
  "Payload": {
    "EventUserUID": "c3f1a8e0-9e44-4c10-8d2a-11b0c4e6f901",
    "ToStatusID": 8,
    "PrevStatusID": 3
  }
}
```

A QR tartalma az EventUserUID (GUID). A scan oldal ezt a POST-ot küldi, cél státusz **Belépett**.

**SignalR (jegyolvasás):** a DB-írás után Outbox a **szervező** csoportra **és** a beléptetett sor `event_{EventID}_user_{EventUserID}` csoportjára. Payload: `Action`, `EventID`, `EventUserID`, `EventUserUID`, `ToStatusID`, `PrevStatusID`. A vendég az esemény adatlapján (`/event/:id`) már joinol erre a privát csoportra, toast + automatikus Belépés. Ha csak az organizer csoport megy ki, a vendég kártyája nem frissül, amíg GET `/event/data` le nem fut.

Ne `user_{UserID}`-re címezz (az nem a join név). A join: `event_{id}_user_{EventUserID}`.

---

## 4b. `EventUser.PatchContact`

Szervező javítja a résztvevő név / e-mail / telefon mezőit (Excel import elírás). **Nem** `POST /user/save`. A teszt API a globális `tblUser` fiókot és a login e-mailt is átírja; foglalt e-mail → **409**.

```json
{
  "EventID": 40,
  "Action": "EventUser.PatchContact",
  "Payload": {
    "EventUserID": 321,
    "LastName": "Kovács",
    "FirstName": "Anna",
    "Email": "anna@example.com",
    "Phone": "+36301234567"
  }
}
```

HU alias oké: `Családnév` → `LastName`, `Keresztnév` → `FirstName`, `Email-cím` → `Email`, `Telefonszám` → `Phone`. Üres `Phone` / `null` = törlés.

Auth: Bearer, **szervező** az EventID-n. Játékmester **403**.

### Validáció

1. `EventUserID` az EventID-hez tartozik, ActiveFlg = 1. Különben 404/400.
2. `LastName`, `FirstName` nem üres.
3. `Email` kötelező, érvényes e-mail. 400 `Add meg az e-mail címet.` / `Érvénytelen e-mail cím.`
4. `Phone` opcionális. Ha ki van töltve: HU szám. 400 `Érvénytelen telefonszám.`
5. Duplikátum ugyanazon az eseményen, **más** aktív EventUser, normalizált e-mail **vagy** kitöltött telefon egyezik → 409 `Ez a résztvevő már szerepel a listán.`

### Mentés

1. UPDATE EventUser / EventParticpants: `LastName`, `FirstName`, `EmailAddress`, `PhoneNumber`.
2. PTA: ha van `EventPlayer` erre az EventUserID-re, `Name` = `LastName + ' ' + FirstName` (és First/Last ha vannak oszlopok).
3. Invitation / Outbox: **ne** küldj új meghívót. A már kiment mailt nem kell visszavonni.
4. `tblUser` / login identifier: a **teszt API jelenleg felülírja** a globális fiókot és a login e-mailt. Foglalt e-mail → **409**. A FE lista újratölt + 409 üzenet. (Korábbi szerződés: ne nyúlj a `tblUser`-hez — a live BE ettől eltér.)

200: `{ "ReturnValue": 1, "ReturnDescription": "OK", "EventID": 40, "Action": "EventUser.PatchContact" }`

SignalR: opcionális `event_{id}_organizer`. A hívó FE GET userdata-t hív.

---


## 4a. `EventUser.SetRating`

Lezárt esemény értékelése a saját EventUser-sorra. Tábla + validáció: [`event-rating.md`](./event-rating.md). Nincs SignalR, nincs státuszváltás.

Mentés (1–5):

```json
{
  "EventID": 44,
  "Action": "EventUser.SetRating",
  "Payload": {
    "EventUserID": 318,
    "Rating": 4,
    "RatingComment": "Jó tempó, tiszta szabályok."
  }
}
```

Törlés — **ugyanaz az action**, `Rating: null` (mindkét oszlop NULL):

```json
{
  "EventID": 44,
  "Action": "EventUser.SetRating",
  "Payload": {
    "EventUserID": 318,
    "Rating": null,
    "RatingComment": null
  }
}
```

---

## 5. P1 actionök (rövid szerződés)

A FE ezeket **még localStorage-ba** írja. A proc ismerje a stringeket, implementálhatod P0 után.

### `EventUser.Apply`

Publikus esemény, JWT user jelentkezik egy jegyre.

```json
{
  "EventID": 40,
  "Action": "EventUser.Apply",
  "Payload": {
    "EventTicketID": 55
  }
}
```

INSERT `EventUser`: UserID = JWT, EventRole a RoleTicketből, Template a jegyből, kezdő EventUserStatus a flow első lépése, új `EventUserUID`. Kapacitás / regisztrációs ablak / PublicFlg ellenőrzés a SQL-ben.

### `EventUser.Remove`

```json
"Payload": { "EventUserID": 120 }
```

Ne hard-delete, ha van számla / PTA player: `ActiveFlg = 0`.

### `Pta.ReplaceDraw`

A FE kliens oldalon sorsol (`buildPtaDraw`), aztán **teljes csere** az EventID-re. A kliens `id` / `EventDeskID` értékei **helyi** számok lehetnek (max+1) — a SQL **ne** ezeket használja PK-nak.

Replace = az eseményhez tartozó `EventDesk`, `EventRound`, `EventRoundDesk`, `EventPlayer`, `GameSchedule` törlése/inaktiválása, majd INSERT a payloadból. Adj vissza a GET userdata-ban az **új** id-ket.

**SignalR:** organizer + contributor + participant + **`event_{id}_gamer`**. Ha a snapshot túl nagy a hubnak, a gamerre mehet apró ping (`Action` + `EventID`).

```json
{
  "EventID": 40,
  "Action": "Pta.ReplaceDraw",
  "Payload": {
    "Desks": [
      { "TempId": "d1", "DeskNo": 1, "DName": "1. asztal", "GameMasterUserID": 12, "ActiveFlg": true }
    ],
    "Rounds": [
      { "TempId": "r1", "RoundID": 2, "EventRoundStatusID": 1, "NoOfDesks": 2, "OrderIndex": 1, "RName": "1. forduló", "ActiveFlg": true }
    ],
    "RoundDesks": [
      { "TempId": "rd1", "DeskTempId": "d1", "RoundTempId": "r1", "GameMasterUserID": 12, "SName": "Kisorsolva", "ActiveFlg": true }
    ],
    "Players": [
      {
        "TempId": "p1",
        "EventUserID": 120,
        "UserID": 88,
        "ReserveFlg": false,
        "Name": "Kovács Anna",
        "TeamName": null,
        "CompanyName": null,
        "OrganizationName": null,
        "RegionName": null,
        "ActiveFlg": true
      }
    ],
    "Schedules": [
      {
        "TempId": "s1",
        "RoundDeskTempId": "rd1",
        "PlayerTempId": "p1",
        "ColorIndex": 0,
        "ColorHex": "#38bdf8",
        "SeatNo": 1,
        "ActiveFlg": true
      }
    ]
  }
}
```

`RoundID` = master `GameTypeRounds` id. `EventRoundStatusID` = master „Kisorsolva” / sorsolt státusz.

A mai Pinia snapshot mezőnevek (ha a FE id-vel küldi, ne TempId-vel): `EventDeskID`, `EventRoundID`, `EventRoundDeskID`, `EventPlayerID`, `GameScheduleID`, `PlayerID` (= EventPlayerID a schedule-ben). Elfogadhatod **vagy** TempId mapet, **vagy** replace-all + saját identity — de a GET-nek stabil FK-kat kell adnia.

### SignalR csoportok (élő esemény)

A belépés és az Outbox címzés: dokumentum eleje (**Backend — PTA élő kimenet**) + **[`pta-signalr-backend.md`](./pta-signalr-backend.md)**.

A kliens belépéskor (`POST /signalr/join`) ezekre csatlakozik:

| Csoport | Kik |
|---|---|
| `event_{EventID}_{role}` | `organizer` / `contributor` / `participant` — szerepkör szerinti üzenetek |
| `event_{EventID}_gamer` | **minden** élő kliens (szervező, JM, játékos) — forduló státusz, ReplaceDraw/Reset |
| `event_{EventID}_user_{EventUserID}` | privát: GM asztal-eredmény, publikált saját Seat/Player |

**Nincs** `group_{ID}`. A join **ne utasítsa el** a `gamer` nevet.

**Forduló státusz** (`Pta.SetRoundStatus`, `Pta.CloseRound`, `Pta.PublishRound` gamer-payload): **csak** `event_{EventID}_gamer`, `EventRoundID` + `ToStatusID`. Seat / Player / Final* **ne** menjen a gamerre. Nincs RoleType fallback (nagy `@Json`).

**Publikált eredmény:** a gamer mini mellett minden érintett játékosnak külön a user-csatornájára, saját `Seat` + `Player`. SetRoundStatus / CloseRound **nem** visz pontot.

### `Pta.SetRoundStatus`

Megnyitva / Kisorsolva / Folyamatban (és minden **nem** lezárt / **nem** publikált lépés). Nem zárja a fordulót.

A FE az **első eredményfelvitelkor** magától `ToStatusID` = Folyamatban-ra hívja, ha a forduló még nyitott. A SQL `Pta.SetDeskResults`-nál is állítsd Folyamatban-ra, ha a forduló még Megnyitva / Kisorsolva (idempotens).

```json
{
  "EventID": 40,
  "Action": "Pta.SetRoundStatus",
  "Payload": {
    "EventRoundID": 9,
    "ToStatusID": 2
  }
}
```

`EventRound.EventRoundStatusID = ToStatusID`. SignalR: **csak** `event_{EventID}_gamer`, mini JSON (`EventRoundID` + `ToStatusID`). Nincs Seat. Nincs RoleType fallback.

### `Pta.CloseRound` — forduló vége, játékos vakon

A fordulónak vége. Az asztalok eredménye a DB-ben megvan (`GameSchedule`), de a **játékos a pontokat még nem látja**. A **státusz chipet viszont igen** (Lezárt) — ezért megy a gamer csoportba.

```json
{
  "EventID": 40,
  "Action": "Pta.CloseRound",
  "Payload": {
    "EventRoundID": 9,
    "ToStatusID": 3
  }
}
```

`ToStatusID` = master `EventRoundStatuses` **Lezárt** (név: `lezar`). SQL: `EventRound.EventRoundStatusID = ToStatusID`. Leaderboard aggregáció **még ne** fusson a játékos `FinalPosition` közzétételéhez — vagy fusson a táblában, de SignalR-en / GET játékos-adatlapra ne küldd ki a `Seat` / `Final*` mezőket.

**SignalR:** `event_{EventID}_gamer`, payload = a fenti JSON (**nincs** Seat / Player). A játékos chip Lezárt, az ülés kártyán: *„Az eredmény a forduló publikálása után jelenik meg.”*

### `Pta.PublishRound` — játékosok megkapják az eredményt

Publikálás **is** lezárja a fordulót a játékos felé: innentől látszik az eredmény. A `ToStatusID` a master **Publikált** / Közzétett.

```json
{
  "EventID": 40,
  "Action": "Pta.PublishRound",
  "Payload": {
    "EventRoundID": 9,
    "ToStatusID": 4
  }
}
```

SQL: `EventRound.EventRoundStatusID = ToStatusID`. Itt aggregáld `tblEventPlayer.FinalPoint`, `FinalTruckPoint`, `FinalPosition` (publikált fordulók összege).

**SignalR:** `event_{EventID}_gamer` kapja a fenti JSON-t (nincs Seat). **Minden érintett játékosnak külön** a saját user-csatornájára, a saját sorával:

```json
{
  "EventID": 40,
  "Action": "Pta.PublishRound",
  "Payload": {
    "EventRoundID": 9,
    "ToStatusID": 4,
    "Seat": {
      "PlayerID": 101,
      "EventRoundDeskID": 15,
      "Amount": 42,
      "OnTrack": 3,
      "Position": 1,
      "ResultPoint": 52
    },
    "Player": {
      "EventPlayerID": 101,
      "FinalPoint": 52,
      "FinalTruckPoint": 3,
      "FinalPosition": 8
    }
  }
}
```

`PlayerID` / `EventPlayerID` = `tblEventPlayer`. `Seat` = annak a játékosnak a `GameSchedule` sora **ebben** a fordulóban. A 4 társ ülése **ne** menjen a játékosnak.

A játékos kliens innentől mutatja: összeg, kamion, pont. `Final*` csak esemény-vége fázisban a KPI-n / helyezésen.

**Ne** küldj `Pta.SetRoundStatus`-t Lezárt/Publikált célra — a FE `CloseRound` / `PublishRound`-ot hív.

### `Pta.SetDeskResults`

```json
{
  "EventID": 40,
  "Action": "Pta.SetDeskResults",
  "Payload": {
    "EventRoundDeskID": 15,
    "Seats": [
      { "PlayerID": 1, "Amount": 12000, "OnTrack": 0, "Position": 1, "ResultPoint": 10 }
    ]
  }
}
```

`PlayerID` = `EventPlayerID`. UPDATE csak `GameSchedule`: `Amount`, `OnTrack`, `Position`, `ResultPoint`.

**Kapu:** csak ha az esemény státusza **Játék**, és a forduló **Megnyitva** / **Kisorsolva** / **Folyamatban**. Lezárt / Publikált fordulóra utasítsd el. Jogosultság: játékmester (az asztal GM-je) vagy szervező.

**Első eredmény:** ha a forduló még nem Folyamatban, állítsd Folyamatban-ra (ugyanabban a tranban), és küldj `Pta.SetRoundStatus` **minit** a gamer csoportba. A FE is meghívja `Pta.SetRoundStatus`-t — idempotens legyen.

**SignalR:** organizer + contributor + az asztal GM `user_{GameMasterID}`. **Ne** `group_{ID}`, **ne** játékos `user_{PlayerID}` — a játékos a pontot `Pta.PublishRound` személyes JSON-ból kapja. Ha Display `roundstand`/`seating` és a desk a `RoundId` köre: plusz mini `Pta.ShowDisplay` a `display` csoportra (mint `PatchDesk`).

**Nem írja** a `tblEventRoundDesk` asztalmezőit. A FE küldhet `ManualOrderFlg` / `SName` mezőt, a backend **eldobja**. Asztal „Lezárva” / fotó: `Pta.PatchDesk`. Ranglista: nem itt frissül, hanem **`Pta.PublishRound` után**.

### `Pta.ClaimDesk`

```json
"Payload": { "EventRoundDeskID": 15, "GameMasterUserID": 12 }
```

Csak `EventRoundDeskID` — a fizikai `EventDesk` GM mezőjét a proc nem tölti. `GameMasterUserID: null` = leadás. UPDATE az adott `tblEventRoundDesk.GameMasterUserID`.

**SignalR:** organizer + contributor. **Ne** `group_{ID}`.

### `Pta.PatchDesk`

```json
"Payload": { "EventRoundDeskID": 15, "SName": "Lezárt", "PhotoUrl": "https://…" }
```

`PhotoUrl` a payloadban marad; a SQL `tblEventRoundDesk.AzurePhotoUrl`-be menti. GET-ben a FE `AzurePhotoUrl` (fallback: `PhotoUrl`) mezőt olvassa. `SName` opcionális asztalstátusz (pl. Lezárt), ha a proc támogatja.

**SignalR:** organizer + contributor. **Ha** `PtaDisplayState.State` = `roundstand` vagy `seating` **és** a desk `EventRoundID` = `PtaDisplayState.RoundId`: küldj **plusz** mini `Pta.ShowDisplay`-t (aktuális State, View, RoundId) **csak** `event_{EventID}_display`-re. Nincs Rows. Részlet: [`pta-display.md`](./pta-display.md) §4.6.2.

### `Pta.Reset`

Töröld/inaktiváld a draw táblákat az EventID-re, majd `Event.EventStatusID = Payload.ToStatusID` (FE: Szervezés / Tervezés id), `PrevEventStatusID = null`, `PendingApprovalID = null`.

**SignalR:** organizer + contributor + participant + **`event_{id}_gamer`**.

---

## 6. GET mezők, amiket a change után a FE olvas

`GET /event/data` és `GET /event/userdata/:id`:

| JSON key | Store | Change után kell |
|---|---|---|
| `Events[].EventStatusID` | `events` | `Event.SetStatus` |
| `Events[].PrevEventStatusID` | undo gomb | ha CanUndoFlg volt |
| `Events[].PendingApprovalID` | jóváhagyás lock | P1 |
| `EventUsers[]` / `EventParticpants[]` `.EventUserStatusID` | résztvevő, meghívó `!` | `EventUser.SetStatus` |
| ugyanaz `.PrevEventUserStatusID` | résztvevő undo | |
| ugyanaz `.Rating`, `.RatingComment` | lezárt adatlap értékelő | `EventUser.SetRating` |
| `EventUsers[].EventUserUID` | jegy QR | Apply / create |
| `EventDesks`, `EventRounds`, `EventRoundDesks`, `EventPlayers`, `GameSchedules` | PTA store | Pta.* |
| `EventPlayers[].FinalPoint`, `FinalTruckPoint`, `FinalPosition` | leaderboard / játékos KPI | **`Pta.PublishRound` után** (GET vagy a játékosnak szóló SignalR `Player`) |
| `EventRoundDesks[].AzurePhotoUrl` | asztal fotó | `Pta.PatchDesk` (`PhotoUrl` → ez az oszlop) |
| `EventRoundDesks[].GameMasterUserID` | asztalfoglalás | `Pta.ClaimDesk` (csak round-desk) |

Ha a GET nem hozza a Prev* mezőket, a FE undo gombja eltűnik.

---

## 7. SQL váz (egy tran)

```sql
CREATE PROC dbo.spChangeEvent
  @Json nvarchar(max),
  @UserID int
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRAN;

    DECLARE @EventID int = JSON_VALUE(@Json, '$.EventID');
    DECLARE @Action  nvarchar(64) = JSON_VALUE(@Json, '$.Action');

    IF @Action = N'Event.SetStatus'
    BEGIN
      DECLARE @ToStatusID int = JSON_VALUE(@Json, '$.Payload.ToStatusID');
      DECLARE @PrevStatusID int = JSON_VALUE(@Json, '$.Payload.PrevStatusID');
      -- jogosultság: EventFlowStatus + EventFlowStatusRole + @UserID EventUser szerepe
      -- UPDATE tblEvent
    END
    ELSE IF @Action = N'EventUser.SetStatus'
    BEGIN
      -- OPENJSON Payload.EventUserIDs VAGY EventUserID VAGY EventUserUID
      -- EventID egyezés, flow step, UPDATE tblEventUser
    END
    ELSE IF @Action = N'EventUser.SetRating'
    BEGIN
      -- Payload.EventUserID + Rating (1..5 vagy JSON null) + RatingComment
      -- saját sor, esemény lezárt, nem szervező
      -- null → Rating és RatingComment NULL; 1..5 → upsert
    END
    ELSE IF @Action = N'EventUser.PatchContact'
    BEGIN
      -- Payload.EventUserID + LastName + FirstName + Email + Phone
      -- szervező; EventUser/EventParticpants + opcionális EventPlayer.Name
      -- ne nyúlj tblUser-hez; ne küldj meghívót
    END
    ELSE IF @Action = N'EventUser.Apply'
    BEGIN
      -- INSERT EventUser
    END
    ELSE IF @Action = N'EventUser.Remove'
    BEGIN
      -- ActiveFlg = 0
    END
    ELSE IF @Action IN (N'Pta.ReplaceDraw', N'Pta.SetRoundStatus', N'Pta.CloseRound', N'Pta.PublishRound',
                        N'Pta.SetDeskResults', N'Pta.ClaimDesk', N'Pta.PatchDesk', N'Pta.Reset',
                        N'Pta.ShowDisplay')
    BEGIN
      -- P1
    END
    ELSE
      THROW 50001, N'Ismeretlen Action', 1;

    COMMIT;

    SELECT 1 AS ReturnValue, N'OK' AS ReturnDescription,
           @EventID AS EventID, @Action AS Action;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    SELECT -1 AS ReturnValue, ERROR_MESSAGE() AS ReturnDescription,
           NULL AS EventID, NULL AS Action;
  END CATCH
END
```

### OPENJSON — batch ID-k

```sql
SELECT CAST(value AS int) AS EventUserID
FROM OPENJSON(@Json, '$.Payload.EventUserIDs');
```

### OPENJSON — PTA ReplaceDraw Desks

```sql
SELECT *
FROM OPENJSON(@Json, '$.Payload.Desks')
WITH (
  TempId nvarchar(64) '$.TempId',
  DeskNo int,
  DName nvarchar(100),
  GameMasterUserID int,
  ActiveFlg bit
);
```

---

## 8. API válasz (amit a FE olvas)

Siker:

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "OK",
  "EventID": 40,
  "Action": "Event.SetStatus"
}
```

Hiba: **`ReturnValue < 0`**, `ReturnDescription` megy a toastba (ugyanaz, mint a save).

Opcionális, hasznos scanhez / Apply után:

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "OK",
  "EventID": 40,
  "Action": "EventUser.SetStatus",
  "EventUserID": 120
}
```

C#:

```csharp
[HttpPost("event/change")]
public async Task<IActionResult> Change([FromBody] JsonElement body)
  => Ok(await db.QueryAsync("spChangeEvent", new {
       Json = body.GetRawText(),
       UserID = currentUserId
     }));
```

Ne wrappeld `{ json: "..." }` stringbe — a FE a **nyers objektumot** POST-olja.

A C# **ne** hívjon MailerSend-et / SignalR-t közvetlenül. Ha kell üzenet: SQL Outbox insert a tranban.

---

## 9. Sorrend egy kérésben

1. Parse `EventID`, `Action`, `Payload`
2. Event létezik + Active
3. `@UserID` EventUser az eseményen (kivéve ha Apply — akkor létrehozod)
4. Action-specifikus validáció (flow step, UID, kapacitás)
5. UPDATE/INSERT
6. COMMIT
7. `SELECT ReturnValue, ReturnDescription, EventID, Action`

A FE utána GET-el. A proc **ne** adja vissza a teljes userdata snapshotot.

---

## 10. FE forrás (ma dummy)

| Action | Hol |
|---|---|
| `Event.SetStatus` | `EventManagePage.vue`, `OrganizerPage.vue` → `eventStore.applyEventStatus` |
| Undo event | ugyanott, `PrevEventStatusID` → `ToStatusID`, `PrevStatusID: null` |
| `EventUser.SetStatus` | `EventParticipantsPage.vue`, `ParticipantsPage.vue` (PTA), `InviteDecisionSheet.vue` → `applyEventUserStatus` |
| `EventUser.SetRating` | `EventClosedFollowUp.vue` — játékos / JM / közreműködő, lezárt esemény |
| `EventUser.PatchContact` | `ParticipantsPage.vue` (PTA), `EventParticipantsPage.vue` |
| QR UID | `EventTicketScanPage.vue` + `src/utils/eventUserQr.ts` — ma csak validál |
| PTA draw | `eventStore.runPtaDraw` / `OrganizerPage` sorsolás státusznál |
| PTA round / desk | `GamePage.vue` → eredmény csak Játék + nyitott/folyamatban forduló; első pontozás `Pta.SetRoundStatus` Folyamatban; `CloseRound` / `PublishRound` gamer csoport |
| Ranglista | Csak **publikált** forduló. `EventPlayers.Final*` GET-ből vagy `PublishRound` SignalR `Player`. Játékos a Lezárt fordulót nem látja |
| Local overlay | `ej_localEventStatus`, `ej_localEventUserStatus`, `ej_localPtaDraw` — élesben a GET felülírja, a change után le kell kapcsolni |

Pinia: `src/stores/event.ts`. Flow master: `src/utils/eventFlow.ts`, `src/utils/eventUserFlow.ts`.
