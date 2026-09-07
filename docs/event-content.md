# POST `/event/content/save` → `spSaveEventContent(@Json)`

Esemény **programlista** mentése. Később ugyanide jön a borítókép (`EventImageUrl`) — **most még ne parseold**, a FE nem küldi.

- **URL:** `POST /api/event/content/save`
- **Body:** nyers JSON objektum (nem `{ "json": "..." }` string)
- **Auth:** Bearer JWT — szervező kell az `EventID`-re
- Mentés után a kliens `GET /event/data`-t hív

Nem a varázsló `POST /event/save`.

---

## 1. Gyökér (most)

| Mező | Típus | Kötelező |
|---|---|---|
| `EventID` | `number` | igen — `tblEvent.id` |
| `Programs` | tömb | igen — lehet `[]` |

**Teljes csere-snapshot.** Ami nincs a tömbben → `tblEventProgram.ActiveFlg = 0` (ne hard-delete). A tömbben lévők `ActiveFlg = 1`.

```json
{
  "EventID": 31,
  "Programs": [
    {
      "id": null,
      "ProgramDateTime": "2026-09-12T08:00:00.000Z",
      "ProgramName": "Regisztráció"
    },
    {
      "id": 4,
      "ProgramDateTime": "2026-09-12T09:00:00.000Z",
      "ProgramName": "Megnyitó"
    }
  ]
}
```

`Programs: []` → minden programja az eseménynek inaktív.

---

## 2. `Programs[]`

| Mező | Típus | Create | Edit |
|---|---|---|---|
| `id` | `number \| null` | `null` → INSERT | meglévő `tblEventProgram.id` → UPDATE |
| `ProgramDateTime` | ISO UTC string | `datetimeoffset` | ugyanígy |
| `ProgramName` | string | max 255 | ugyanígy |

A FE **datetime szerint rendezi** a listát megjelenítéskor; a SQL-nek nem kell a tömb sorrendjére támaszkodnia. GET-ben `ORDER BY ProgramDateTime ASC` a kényelmes.

`LastUpdatedUserID` / `updatedAt`: token user, `sysdatetimeoffset()`. FE nem küld.

---

## 3. Load — `GET /event/data` és `GET /event/userdata/:id`

JSON key: **`EventPrograms`**

`SELECT` `ActiveFlg = 1` (vagy küldd mindet, a FE szűr). Oszlopnevek:

`id`, `EventID`, `ProgramDateTime`, `ProgramName`, `ActiveFlg`

---

## 4. Válasz

Ugyanaz a minta mint `/event/save`:

```sql
SELECT 1 AS ReturnValue, N'OK' AS ReturnDescription, @EventID AS EventID;
```

Hiba: `ReturnValue < 0`, `ReturnDescription` szöveg.

---

## 5. OPENJSON

```sql
DECLARE @EventID bigint = JSON_VALUE(@Json, '$.EventID');

SELECT *
FROM OPENJSON(@Json, '$.Programs')
WITH (
  id bigint '$.id',
  ProgramDateTime datetimeoffset(7) '$.ProgramDateTime',
  ProgramName nvarchar(255) '$.ProgramName'
);
```

---

## 6. Később (ne most)

Ugyanez a végpont kapja az `EventImageUrl`-t (string vagy `null`). A mai FE payloadban **nincs** ilyen mező.
