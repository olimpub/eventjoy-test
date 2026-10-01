# Olimpub — játékos váróterem (csapat után)

Dátum: 2026-09-29. Termék: [`olimpub.md`](./olimpub.md). Élő menet: [`olimpub-live.md`](./olimpub-live.md). HTTP: [`olimpub-backend.md`](./olimpub-backend.md).

A játékos a csapatválasztás után **egy állandó váróteremben** marad a kvíz végéig. Kérdésfelület csak `OpLive` active kérdésnél. Kérdés után vissza ide.

## 1. Kliens állapot

| Állapot | UI |
|---|---|
| Nincs `OP.tblTeamMember` | kabalaválasztó |
| Van tagság, nincs active kérdés | váróterem |
| Active kérdés / extra kérdés | játékos kérdés-UI |
| EventStatus lezárt / díjátadó | záró képernyő, nem a váró |

Váró tartalom: esemény neve, kabala `full` kép (`profile` fallback), csapatnév, létszám (`MemberCount` / `MaxTeamSize`), csapattársak **csak Nickname**, csere-ikon, szöveg: `Figyelj a Kvízmesterre! :-)`.

Nincs online-presence. A lista a `GET /op/event/:id` `OpTeamMembers` + `OpTeams.MemberCount`. Poll 8 mp, plusz `Op.*` SignalR ping → GET.

Üres csapat: a játékos egyedül, `1 / MaxTeamSize`, a saját nickneve.

## 2. `GET /op/event/:id` — játékos

Változatlan datasetek. Kötelező a váróhoz:

| Dataset | Mező |
|---|---|
| `OpTeams` | `id`, `KabalaID`, `Name`, `MemberCount` |
| `OpTeamMembers` | játékosnak **a saját csapata, minden tag**: `TeamID`, `EventUserID`, `Nickname`. Nem presence / nem csak a saját sor. Üres `[]` mellett a `OpTeams[].Members` is jó |
| `OpLive` | `ActiveEventQuestionID`, `QuestionStatus` |

`Nickname` = `tblUser.Nickname` (device usernél a FirstName üres). Üres név → a FE `Játékos`. A kliens a saját session nickjét magának kitölti.

`GET /op/master` kabala `Assets`: `Slot=full` a váró nagy képe, `profile` a választó.

## 3. `Op.LeaveTeam` — új, külön hívás

Nem `SwitchTeam`. Csere = Leave, utána a kliens `Op.JoinTeam`.

`POST /op/game/change`

```json
{
  "EventID": 89,
  "Action": "Op.LeaveTeam",
  "Payload": {}
}
```

| Szabály | |
|---|---|
| Ki | saját EventUser / `OpDevice` (claim EventID) |
| Hatás | saját aktív `OP.tblTeamMember` `ActiveFlg = 0` |
| Nincs tagság | 200, idempotens |
| Active kérdés / extra run | 400 `A kérdés alatt nem válthatsz csapatot.` |
| Egyébként | szabad **az egész játék alatt** (Bejelentkezés+), kérdések *között* is |
| Utána | GET. `Op.SubmitAnswer` 400 `Válassz csapatot.` amíg újra Join |

`Op.JoinTeam` `{ "TeamID": 12 }` **változatlan**: más csapatban → 409 `Már egy csapatban vagy.` Tele → 409. Leave után Join OK.

Device JWT path-lista: `Op.LeaveTeam` ugyanott, ahol `Op.JoinTeam`.

## 4. SignalR

Kicsi ping, nincs névlista a hubon.

```json
{ "Action": "Op.LeaveTeam", "EventID": 89, "TeamID": 12 }
```

`TeamID` = a csapat, ahonnan kilépett (ha volt). Join után:

```json
{ "Action": "Op.JoinTeam", "EventID": 89, "TeamID": 12 }
```

| Csoport | Join / Leave |
|---|---|
| `event_{id}_gamer` | igen |
| `gamemaster` / `organizer` | igen |
| `display` | **igen, ha face `lobby`** — vékony ping; TV GET `/op/event` |
| saját `user_*` | **nincs ilyen csoport** |

A FE a meglévő `Op.*` ping → `GET /op/event` úton megy. Nincs presence.

## 5. FE hívások

| Action | Mikor |
|---|---|
| `Op.JoinTeam` | kabala választása |
| `Op.LeaveTeam` | váró csere-ikon, ha nincs active kérdés |
| GET `/op/event` | 8 mp + ping |
