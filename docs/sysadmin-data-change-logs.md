# Sysadmin adatmódosítás log — backend szerződés

A FE **nem** tölti le és **nem** cache-eli a teljes `[LOG].[tblDataChangeLog]` táblát (nincs Pinia store a logokra). A lista csak **Futtatás** gombra hívja a backendet, utána csak a kért oldal (`skip` / `take`) van memóriában.

A szűrést **szerveroldalon** kell elvégezni. A mező-diff (From / To) a FE-n készül: `OldData_JSON` vs `NewData_JSON` összehasonlítás. A BE-nek **nem** kell előre kiszámolt diffet küldenie.

A mai `GET /sysadmin/logs/data-change` csak `tableName`, `userId`, `skip`, `take` — **ez kevés**. Dátum nélkül a teljes tábla jönne, azt a FE nem kéri le.

---

## `GET /sysadmin/logs/data-change`

Sysadmin JWT. Query paraméterek (camelCase):

| Paraméter | Típus | Kötelező | Jelentés |
|---|---|---|---|
| `from` | ISO-8601 datetime UTC | igen | `CreatedAt >= from` (zárt) |
| `to` | ISO-8601 datetime UTC | igen | `CreatedAt <= to` (zárt) |
| `tableName` | string | nem | pontos `TableName` egyezés (pl. `EJ.tblUser`). Üres = minden tábla |
| `userId` | int | nem | pontos `UserID` (a módosítást **végrehajtó** user). A FE név alapján `GET /sysadmin/users?search=`-ből választ |
| `skip` | int | igen | offset, alap 0 |
| `take` | int | igen | oldalméret, FE: 50, max 100 |

A FE mindig küld `from` + `to`. Gyorsszűrők a Futtatás pillanatában:

- Elmúlt 1 óra / 1 nap / 1 hét / 1 hónap
- Egyéni dátum+idő

Ha `from` / `to` hiányzik: **400**, ne add vissza a teljes táblát.

Lapozáskor ugyanaz a `from`/`to` megy újra (page 2-n nem számítódik újra az „elmúlt 1 óra”).

---

## Szűrési szabályok

1. **Idő:** `CreatedAt` a `from`–`to` zárt intervallumban.
2. **tableName:** `TableName = @tableName`, ha ki van töltve.
3. **userId:** `UserID = @userId`, ha ki van töltve.
4. Szűrők **ÉS** kapcsolatban.
5. **Rendezés (kötelező):** `CreatedAt DESC`, azonos időnél `LogID DESC`.
6. `TotalCount` = a **szűrt** találatok száma.

---

## Válasz (200)

```json
{
  "Data": [
    {
      "LogID": 1,
      "TableName": "EJ.tblUser",
      "RecordID": 4,
      "ActionType": "UPDATE",
      "OldData_JSON": "{\"StatusID\":1,\"FirstName\":\"Dan\"}",
      "NewData_JSON": "{\"StatusID\":2,\"FirstName\":\"Dániel\"}",
      "UserID": 3,
      "UserName": "Szabó Anna",
      "CreatedAt": "2026-09-14T08:12:00Z"
    }
  ],
  "TotalCount": 12
}
```

| Mező | Kell |
|---|---|
| LogID, TableName, RecordID, ActionType, OldData_JSON, NewData_JSON, UserID, CreatedAt | igen (ahogy ma) |
| **`UserName`** (új) | igen: a módosító user `LastName + ' ' + FirstName`. Ha nincs user: `null` / `""` |

A FE a kártyán: **RecordID** (esemény/rekord azonosító), dátum, felhasználónév, tábla. Kattintásra a két JSON kulcsait összeveti, és csak a változott mezőket mutatja **From** / **To** értékkel. A szótár (`GET /sysadmin/dictionaries`) a magyar mezőnevekhez kell — ez már megvan.

---

## Amit a BE-nek tilos / nem kell

- Teljes tábla `from`/`to` nélkül.
- Előre számolt diff / változott-mező lista (a FE csinálja on the fly).
- `userName` query param — a névszűrő a users listán megy, ide `userId` kell.
- JSON parse a BE-n a listához.

---

## Ajánlott index

```sql
INDEX IX_DataChangeLog_CreatedAt ON CreatedAt DESC, LogID DESC
-- ha gyakran megy user + idő:
INDEX IX_DataChangeLog_User_CreatedAt ON UserID, CreatedAt DESC
-- ha gyakran megy tábla + idő:
INDEX IX_DataChangeLog_Table_CreatedAt ON TableName, CreatedAt DESC
```

---

## Felhasználónév / tábla a szűrőben

- **Név:** `GET /sysadmin/users?search={név}` → kiválasztott `userId` megy a log endpointra.
- **Tábla:** `GET /sysadmin/dictionaries` → `Tables[]` a dropdownhoz. A log query `tableName` a szótár `TableName` értéke.

---

## Példa

Elmúlt 1 óra, csak `EJ.tblUser`, user 3:

```
GET /sysadmin/logs/data-change
  ?from=2026-09-14T07:47:00.000Z
  &to=2026-09-14T08:47:00.000Z
  &tableName=EJ.tblUser
  &userId=3
  &skip=0
  &take=50
```
