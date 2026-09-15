# Sysadmin error log — backend szerződés

A FE **nem** tölti le és **nem** cache-eli a teljes `[LOG].[tblErrorLog]` táblát (nincs Pinia store a logokra). A lista csak **Futtatás** gombra hívja a backendet, utána csak a kért oldal (`skip` / `take`) van memóriában.

A szűrést **szerveroldalon** kell elvégezni. A FE egy oldalt kér, a `TotalCount` a szűrt találatok száma.

---

## `GET /sysadmin/logs/error`

Sysadmin JWT. Query paraméterek (camelCase, ahogy a többi sysadmin lista):

| Paraméter | Típus | Kötelező | Jelentés |
|---|---|---|---|
| `from` | ISO-8601 datetime UTC | igen* | `CreatedAt >= from` (zárt) |
| `to` | ISO-8601 datetime UTC | igen* | `CreatedAt <= to` (zárt) |
| `source` | string | nem | `Frontend` vagy `Backend`. Üres / hiányzik = mindkettő |
| `search` | string | nem | **csak** `ErrorMessage` tartalmazza (case-insensitive). Nem UserID, nem stack, nem URL |
| `userId` | int | nem | pontos `UserID` egyezés. A FE név alapján a `GET /sysadmin/users?search=` listából választ, és az ID-t küldi |
| `skip` | int | igen | offset, alap 0 |
| `take` | int | igen | oldalméret, FE: 50, max 100 |

\*A FE mindig küld `from` + `to`. Gyorsszűrők (Futtatás pillanatában számolva):

- Elmúlt 1 óra: `from = utcNow - 1h`, `to = utcNow`
- Elmúlt 1 nap / hét / hónap: ugyanez 24h / 7 nap / 1 naptári hónap
- Egyéni: a sysadmin által választott helyi dátum+idő, ISO-ra konvertálva

Ha `from` / `to` hiányzik: **400**, ne add vissza a teljes táblát.

Lapozáskor ugyanaz a `from`/`to` megy újra (a FE nem számolja újra az „elmúlt 1 órát” page 2-n).

---

## Szűrési szabályok

1. **Idő:** `CreatedAt` a `from`–`to` zárt intervallumban. Index: `CreatedAt` (DESC).
2. **Source**
   - `Frontend` → `Source = 'Frontend'` (pontos, vagy `LIKE` prefix)
   - `Backend` → `Source IN ('Backend', 'API')` (a FE a kettőt egynek tekinti)
3. **search:** `ErrorMessage LIKE '%' + search + '%'`. Üres string = nincs üzenetszűrő.
4. **userId:** `UserID = @userId`. A vendég/null UserID-s sorok **nem** jönnek, ha van `userId`.
5. A szűrők **ÉS** kapcsolatban vannak.
6. **Rendezés (kötelező):** `CreatedAt DESC`, azonos időnél `ErrorID DESC`. A FE nem kéri le a teljes halmazt rendezéshez.

`TotalCount` = a szűrt halmaz elemszáma (ne a szűrés nélküli táblaméret).

---

## Válasz (200)

```json
{
  "Data": [
    {
      "ErrorID": 1,
      "UserID": 4,
      "UserName": "Kovács János",
      "Source": "Frontend",
      "Severity": "Error",
      "UrlOrAction": "/events/123",
      "ErrorMessage": "TypeError: Cannot read property 'id'",
      "StackTrace": "at Home.vue:42",
      "ContextPayload_JSON": "{\"Context\":{}}",
      "CreatedAt": "2026-09-14T08:12:00Z"
    }
  ],
  "TotalCount": 12
}
```

| Mező | Kell |
|---|---|
| meglévő ErrorID, UserID, Source, Severity, UrlOrAction, ErrorMessage, StackTrace, ContextPayload_JSON, CreatedAt | igen |
| **`UserName`** (új) | igen: `tblUser.LastName + ' ' + FirstName`, trim. Ha nincs user: `null` vagy `""` |

A FE a kártyán a nevet mutatja, nem a nyers ID-t. Ha `UserName` üres, `#UserID` fallback.

---

## Amit a BE-nek tilos / nem kell

- Teljes tábla visszaadása `take` nélkül vagy óriás `take`-kel.
- FE-re bízni a dátum/source/user szűrést.
- `search` ne keverje a felhasználónevet — arra `userId` van.
- Új Pinia / session cache a BE-n sem kell; minden Futtatás friss query.

---

## Ajánlott index

```sql
-- tblErrorLog
INDEX IX_ErrorLog_CreatedAt ON CreatedAt DESC, ErrorID DESC
-- opcionális, ha source+idő gyakran együtt megy:
INDEX IX_ErrorLog_CreatedAt_Source ON CreatedAt DESC, Source, ErrorID DESC
```

`userId` + idő szűrőhöz: `(UserID, CreatedAt DESC)`.

---

## Felhasználónév a szűrőben

A névkeresés **nem** az error log endpoint feladata.

1. FE: `GET /sysadmin/users?search={név}&skip=0&take=20`
2. Sysadmin kiválaszt egy sort
3. FE: `GET /sysadmin/logs/error?...&userId={id}`

A users `search` maradjon név / e-mail, ahogy ma. Error logra **nem** kell `userName` query param (opcionális később).

---

## Példa

Elmúlt 1 óra, csak frontend, üzenetben `TypeError`:

```
GET /sysadmin/logs/error
  ?from=2026-09-14T07:47:00.000Z
  &to=2026-09-14T08:47:00.000Z
  &source=Frontend
  &search=TypeError
  &skip=0
  &take=50
```
