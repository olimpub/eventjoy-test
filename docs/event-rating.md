# EventUser értékelés — `EventUser.SetRating`

Rövid szerződés a **`POST /event/change`** bővítéséhez. **Nem** külön `/event/rating`. **Nem** `PTA.Feedbacks`.

A UI már megvan: lezárt eseményen a nem-szervező adatlap (`EventClosedFollowUp`) — 1–5 csillag + opcionális szöveg. Ma a Mentés nem hív API-t.

A teljes change-boríték: [`event-change.md`](./event-change.md).

---

## 1. Tábla

`EJ.tblEventUser` — két új oszlop:

| Oszlop | Típus | |
|---|---|---|
| `Rating` | `TINYINT NULL` | 1–5, vagy `NULL` = még nincs értékelés |
| `RatingComment` | `NVARCHAR(2000) NULL` | opcionális szöveg; üres → `NULL` |

```sql
ALTER TABLE [EJ].[tblEventUser]
ADD [Rating] TINYINT NULL,
    [RatingComment] NVARCHAR(2000) NULL;

ALTER TABLE [EJ].[tblEventUser]
ADD CONSTRAINT [CK_tblEventUser_Rating]
CHECK ([Rating] IS NULL OR ([Rating] BETWEEN 1 AND 5));
```

GET-ek — **ugyanaz a két kulcs** az EventUser-soron:

| Végpont | Dataset |
|---|---|
| `GET /event/data` | `EventUsers[].Rating`, `EventUsers[].RatingComment` |
| `GET /event/userdata/{eventUserId}` | `EventUsers[]` és `EventParticpants[]` (vagy `eu.*`) — `Rating`, `RatingComment` |

`NULL` = még nincs értékelés. A FE 1–5-öt vár, mást eldob.

---

## 2. Action

Mentés / szerkesztés:

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

Törlés — **nincs új action**. `Rating: null` mindkét oszlopot üríti:

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

| Payload | Típus | |
|---|---|---|
| `EventUserID` | `number` | igen — a **belépett** szerep sora |
| `Rating` | `number \| null` | igen — **1..5** = upsert, **`null`** = törlés (Rating + RatingComment → NULL) |
| `RatingComment` | `string \| null` | nem — üres / hiányzó → `NULL`. Törlésnél ignore / NULL |

JSON `null` ≠ hiányzó kulcs: a `Rating` kulcs **mindig** menjen. SQL: `OPENJSON` / JSON null, ne `JSON_VALUE` stringként (`"null"`).

**Upsert:** 1–5 felülírja a két mezőt. **Törlés:** `Rating: null` → `SET Rating = NULL, RatingComment = NULL`. Üres sor törlése is OK (idempotens).

Outbox / SignalR / MailerSend: **nincs**.

Siker: `ReturnValue >= 0`. Mentés: `Értékelés mentve.` Törlés: `Értékelés törölve.`

```
-- Rating 1..5
UPDATE tblEventUser
SET Rating = @Rating,
    RatingComment = @RatingComment
WHERE id = @EventUserID AND EventID = @EventID;

-- Rating JSON null
UPDATE tblEventUser
SET Rating = NULL,
    RatingComment = NULL
WHERE id = @EventUserID AND EventID = @EventID;
```

---

## 3. Validáció

1. Token `UserID` = az `EventUser.UserID`. Más user sorát ne írd (szervező sem írja másét).
2. `EventUser.EventID` = gyökér `EventID`, `ActiveFlg = 1`.
3. Az esemény **lezárt** (`ClosedFlg` vagy státusznév: Lezárt / Vége / Befejezve — FE: `eventPlayPhase === 'ended'`). Előtte hiba.
4. **Szervező** EventUser (RoleType szervező / Owner) **nem** értékelhet. Játékos, JM, közreműködő igen.
5. `Rating` **JSON null** → törlés (mindkét oszlop NULL). `Rating` 1–5 → upsert. Egyéb (0, 6, hiányzó kulcs, `"null"` string) → hiba.
6. `RatingComment` trim, max 2000; hosszabb → hiba. Törlésnél a kommentet dobd el.

Nem kell „már értékelt” hiba: felülírás OK.

Több szerep ugyanazon a useren (játékos + JM): **soronként** külön értékelés, a kliens a aktuális `EventUserID`-t küldi.

---

## 4. Amit ne csinálj

- Ne új HTTP végpont (`/event/rating`).
- Ne keverd `EventUser.SetStatus`-szal (státusz nem változik).
- Ne `PTA.Feedbacks`.
- Ne küldj SignalR-t ebben a körben.

---

## 5. Később (nem most)

Szervezői **Értékelések** csempe: lista a GET EventUsers `Rating IS NOT NULL` soraiból. Új GET nem kell, ha a userdata / event data már hozza a mezőket.
