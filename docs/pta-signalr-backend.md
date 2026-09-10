# PTA SignalR — backend teendők (2026-09-04)

Rövid, implementálható delta a **jelenlegi** kimenethez képest. A teljes change-szerződés: [`event-change.md`](./event-change.md).

A kliens join (`POST /signalr/join`) **három** csoport:

| Csoport | Kik |
|---|---|
| `event_{EventID}_{role}` | `organizer` / `contributor` / `participant` |
| `event_{EventID}_gamer` | **minden** élő kliens (szervező, JM, játékos) |
| `event_{EventID}_user_{EventUserID}` | privát |

A kliens **nem** csatlakozik `group_{ID}`-re. JM = `contributor`, játékos = `participant`.

Két réteg küld ma: `tblEventActionRule` (fallback, általában a teljes `@Json`) + a proc végén lévő egyedi blokkok. A három teendő mindkét réteget érinti: **ahol az egyedi blokk a gazda, a szabálytábla ne küldjön újra**.

---

## 1. `Pta.ReplaceDraw` és `Pta.Reset` — menjen a `gamer` csoportra is

**Ma:** csak fallback RoleType: `organizer`, `contributor`, `participant`. **Nincs** `gamer`.

**Probléma:** ha a JM nincs a contributor csoportban, vagy a sorsolás JSON túl nagy és a hub eldobja, a Game képernyő megakad. A kliens a `gamer`-t mindig joinolja.

**Cél:**

| Action | Csatornák | Payload |
|---|---|---|
| `Pta.ReplaceDraw` | organizer, contributor, participant, **és `event_{id}_gamer`** | a sorsolás snapshot (Desks / Rounds / RoundDesks / Players / Schedules), mint eddig |
| `Pta.Reset` | ugyanaz + **`gamer`** | `ToStatusID` (draw törlés + esemény státusz) |

Ha a teljes ReplaceDraw JSON túl nagy a hubnak: a `gamer`-re elég egy **apró ping** (`Action` + `EventID`), a RoleType-okra mehet a nagy snapshot. A kliens a teljes snapshotot tudja alkalmazni; ping esetén GET-re esik vissza, ha később kötitek. Első körben: **ugyanaz a payload a gamerre is**, ha belefér.

A szabálytáblába vedd fel a `gamer` célt, vagy az egyedi blokk küldje a gamerre **úgy, hogy a fallback ne duplázza** ugyanazt a RoleType-ra.

---

## 2. Hagyd el a halott `group_{ID}` csatornákat

**Ma:**

| Action | Ma megy |
|---|---|
| `Pta.ClaimDesk` | organizer, contributor, **`group_{ID}`** |
| `Pta.SetDeskResults` fallback | organizer, contributor, **`group_{ID}`** |
| `Pta.SetDeskResults` egyedi | `user_{GameMasterID}` + az asztal játékosainak `user_{PlayerID}` |

A `group_{ID}` csoport **megszűnt**. A kliens nem joinolja, az üzenet elveszik.

**Cél:**

| Action | Csatornák | Payload |
|---|---|---|
| `Pta.ClaimDesk` | organizer, contributor | `EventRoundDeskID`, `GameMasterUserID` (`null` = leadás). **Nincs** `group_*`. Opcionális: ugyanaz a mini a `gamer`-re, ha a játékosnak is kell látnia a JM-váltást élőben. |
| `Pta.PatchDesk` | organizer, contributor | változatlan |
| `Pta.SetDeskResults` | organizer, contributor, **és** `user_{GameMasterID}` | `EventRoundDeskID` + `Seats[]`. **Nincs** `group_*`. **Nincs** játékos `user_{PlayerID}` — lásd 3. |

A JM a `contributor` **és** a saját `user_{GameMasterID}` csatornán kapja az asztal-eredményt (elég az egyik; a user-csatorna biztonsági háló, ha a role-csoport kimarad).

---

## 3. Forduló státusz: mini mindenkinek a gameren; eredmény csak Publish-nál, játékosonként

**Ma:** `SetRoundStatus` / `CloseRound` / `PublishRound` kétszer megy a staffnak (fallback **nagy** JSON RoleType-okra + egyedi **mini** a gamer + organizer + contributor csatornákra). Publish emellett személyes `Seat` + `Player` a játékos `user_*` csatornájára. `SetDeskResults` a játékos `user_*` csatornájára is kimegy (élő pontozás) — a kliens ezt **eldobja**; a játékos csak publikálás után lát pontot.

**Szándék:** Publish **igen**, küldje a játékosnak az eredményt. **Minden más** forduló-action csak státuszváltás.

**Cél — Outbox:**

| Action | Cél | Payload |
|---|---|---|
| `Pta.SetRoundStatus` | **csak** `event_{id}_gamer` | mini: `EventRoundID` + `ToStatusID` |
| `Pta.CloseRound` | **csak** `event_{id}_gamer` | ugyanaz a mini. **Nincs** Seat / Player / Final* / Seats |
| `Pta.PublishRound` | `event_{id}_gamer` | ugyanaz a mini (chip: Publikált). **Nincs** Seat |
| `Pta.PublishRound` | minden érintett `event_{id}_user_{EventUserID}` | **plusz** saját `Seat` + `Player` (lásd lent) |
| `Pta.SetDeskResults` | organizer + contributor + `user_{GameMasterID}` | `Seats[]`. **Ne** a játékos `user_*` csatornájára |

A szervező és a JM bent van a `gamer`-ben: **ne** küldj külön RoleType-mini-t organizer/contributorra.

**Szabálytábla:** ezekre a három round-actionre **ne** legyen fallback RoleType (`organizer` / `contributor` / `participant`). Ha bent marad, újra kimegy a teljes `@Json`, és újra duplázódik. Az egyedi blokk a gazda.

**Gamer mini** (ne a teljes `@Json` dump):

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

`SetRoundStatus` / `PublishRound` gamer üzenete ugyanilyen, csak más `Action` / `ToStatusID`.

**Publish — személyes** (csak a saját sor; a szomszédok ülése **ne** menjen):

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

`PlayerID` / `EventPlayerID` = `tblEventPlayer`. `Seat` = annak a játékosnak a `GameSchedule` sora **ebben** a fordulóban.

CloseRound: a DB-ben meglehet az aggregáció, de SignalR-en / játékos GET-en **ne** add ki a `Seat` / `Final*` mezőket. Ranglista a **PublishRound** után frissül.

Lezárt / Publikált célra a FE `CloseRound` / `PublishRound`-ot hív, **ne** `SetRoundStatus`-t.

---

## 4. PTA Display (eredmény-kivetítő)

Teljes szerződés (PIN token, GET payload, join kivétel): [`pta-display.md`](./pta-display.md).

Új csoport: `event_{EventID}_display`. `Pta.ShowDisplay` mini **csak** ide (State, View, Scope, RoundId, GroupKey, Place). Nincs Rows. `State` fogadja: `idle` \| `leaderboard` \| `seating` \| `ceremony` \| `roundstand`.

`Pta.PatchDesk` / `Pta.SetDeskResults`: ha a Display `roundstand` vagy `seating` és a desk a `RoundId` köre, **ugyanilyen mini ShowDisplay** a `display` csoportra — a PIN-es TV GET-el. Részlet: [`pta-display.md`](./pta-display.md) §4.6.2.

`POST /signalr/join` display-tokennel (`X-Pta-Display-Token`): `groupNames` **csak** `event_{id}_display`. Ez a § eleji „három csoport + eventUserId” szabály **alól kivétel**. JWT `/display`: a három csoport **plusz** `display`, szerv/QM. PIN-es TV nem joinol `gamer` / `participant` / role / `user_*` csoportot.

---

## Ellenőrzőlista

- [ ] `ReplaceDraw` + `Reset` Outbox: van `event_{id}_gamer` (nagy snapshot vagy ping)
- [ ] Sehol nincs `group_{ID}` cél `ClaimDesk` / `SetDeskResults` (és máshol sem)
- [ ] `SetRoundStatus` / `CloseRound` / `PublishRound`: `tblEventActionRule` fallback RoleType **ki**
- [ ] Ugyanez a három: egy mini a `gamer`-re, nincs Seat a gameren
- [ ] `PublishRound`: ciklus az aktív üléseken → `user_{EventUserID}` saját `Seat` + `Player`
- [ ] `SetDeskResults` **nem** megy játékos `user_*` csatornára
- [ ] Join továbbra is elfogadja a `gamer` csoportnevet
- [ ] Display-token join: csak `event_{id}_display`; gamer/role/user kérés 403
- [ ] `Pta.ShowDisplay` Outbox csak a `display` csoportra, mini, nincs Rows
- [ ] `PatchDesk` Lezárt + Display `roundstand` → mini ShowDisplay a `display` csoportra
