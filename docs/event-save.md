# POST `/event/save` → `spSaveEvent(@Json)`

Frontend szerződés a varázsló + Pinia alapján. A C# a request body-t `@Json nvarchar(max)`-ként adja a procnak. Egy tranzakció, `OPENJSON`, upsert. Mentés után a kliens `GET /event/data`-t hív, ezért az új `id`-knek (Event, EventRole, EventTicket, Location, Label) benne kell lenniük a GET-ben.

- **URL:** `POST /api/event/save`
- **Body:** nyers JSON objektum (nem `{ "json": "..." }` string)
- **Auth:** Bearer JWT
- **Outbox / MailerSend:** nem kell ehhez a végponthoz (az az `invite/import`)

---

## 1. Gyökér

| Mező | Típus | Create | Edit |
|---|---|---|---|
| `EventID` | `number \| null` | `null` | meglévő `tblEvent.id` |
| `Event` | objektum | kötelező | kötelező, teljes snapshot |
| `Location` | objektum vagy `null` | lásd alább | lásd alább |
| `Labels` | tömb | lehet `[]` | teljes lista |
| `Roles` | tömb | legalább 1 | teljes lista |
| `Tickets` | tömb | legalább 1 | teljes lista |
| `RoleTickets` | tömb | jegy↔szerepkör | teljes lista |
| `PtaSettings` | objektum vagy `null` | PTA típusnál objektum, különben `null` | ugyanígy |
| `PtaPrizes` | tömb | PTA extra díj, különben `[]` | replace |

**Edit = teljes csere-snapshot**, nem patch. Amit a varázslóban töröltek, az **nincs** a tömbben → SQL `ActiveFlg = 0` (ne hard-delete, ha van EventUser / Invitation).

---

## 2. `TempId` — Roles / Tickets / RoleTickets

A varázslóban a jegyek `roleTempIds` GUID-okkal hivatkoznak a szerepekre. Commitkor ez `RoleTickets[]` lesz.

| Mód | `Roles[].TempId` / `Tickets[].TempId` |
|---|---|
| **Create** | kliens UUID, pl. `"c3f1a8e0-…"` |
| **Edit** | meglévő DB `id` **stringként**, pl. `"118"` — a hydrate így tölti |

SQL:

```
ha TempId számként értelmezhető ÉS létezik az EventID alatt → UPDATE
különben → INSERT, új id
```

`RoleTickets`: `RoleTempId` + `TicketTempId` → a fenti mapből `EventRoleID` + `EventTicketID`. A proc **törölje és írja újra** az adott esemény `tblEventRoleTicket` sorait.

---

## 3. `Location` — 3 alak

| Varázsló | JSON |
|---|---|
| Online | `Location: null`, `Event.OnlineFlg: true`, `Event.OnlineURL: "…"`, `Event.EventLocationID: null` |
| Meglévő helyszín | `Location: { "id": 5 }`, `Event.EventLocationID: 5` |
| Új helyszín | `Location: { LocationName, PostalCode, City, AddressLine1, CountryCode }`, `Event.EventLocationID: null` → INSERT location, az új id-t tedd `Event.EventLocationID`-re |

---

## 4. `Labels`

Pinia: `eventLabels` = `{ EventID, LabelID }`, master `labels`.

```json
"Labels": [
  { "id": 3, "Name": "Networking" },
  { "id": null, "Name": "új címke" }
]
```

- `id != null` → létező `tblLabel`, csak link
- `id == null` → INSERT label név szerint (vagy keresd ütközéskor), aztán link
- ami nincs a tömbben → vedd le az EventLabel linket

---

## 5. PTA mezőnevek (GET ≠ POST)

A GET / Pinia elírásokat hoz. A **save JSON a helyes neveket** küldi:

| Save JSON (ezt parseold) | GET / Pinia ma |
|---|---|
| `ChampionshipID`, `ChampionshipFlg` | `ChampinshipID` |
| `PhotoUploadMandatoryFlg` | `PhotoUploadMadatoryFlg` |

Ha a SQL oszlop a elírt név, a proc fordítsa. A FE a save-ben **nem** küld `ChampinshipID`-t.

- `PtaSettings: null` ha az `EventType.PTAFlg` hamis
- `PtaPrizes`: `[{ "PrizeID": 2 }]` — az esemény extra díjai, **replace**

---

## 6. Create minta — PTA, új helyszín, 2 szerep, 2 jegy

Ezt küldi a varázsló `mode: "create"` + `isPta: true` esetén:

```json
{
  "EventID": null,
  "Event": {
    "Title": "PTA Budapest Open",
    "Description": "Egyestés verseny.",
    "EventTypeID": 46,
    "EventStatusID": 1,
    "EventUID": "7f3c2a1b-9e44-4c10-8d2a-11b0c4e6f901",
    "StartAtUtc": "2026-09-12T08:00:00.000Z",
    "EndAtUtc": "2026-09-12T16:00:00.000Z",
    "OnlineFlg": false,
    "OnlineURL": null,
    "EventLocationID": null,
    "Capacity": 40,
    "PublicFlg": false,
    "ActiveFlg": true,
    "EventImageUrl": null,
    "ContactOrganizerID": null,
    "ContactName": "Kovács Anna",
    "ContactEmail": "anna@eventjoy.hu",
    "ContactPhone": "+36301234567"
  },
  "Location": {
    "LocationName": "Corvin Pláza – 4. emelet",
    "PostalCode": "1082",
    "City": "Budapest",
    "AddressLine1": "Futó utca 37-45.",
    "CountryCode": "HU"
  },
  "Labels": [
    { "id": 3, "Name": "Verseny" },
    { "id": null, "Name": "Club night" }
  ],
  "Roles": [
    { "TempId": "r-org", "RoleID": 1, "ActiveFlg": true },
    { "TempId": "r-player", "RoleID": 3, "ActiveFlg": true }
  ],
  "Tickets": [
    {
      "TempId": "t-free",
      "Code": "EV-7F3C2A1B-T1-A91C",
      "TicketName": "Játékos",
      "Description": "",
      "Price": 0,
      "CurrencyCode": "HUF",
      "Capacity": 32,
      "RegistrationStartAtUtc": "2026-08-01T00:00:00.000Z",
      "RegistrationEndAtUtc": "2026-09-12T07:00:00.000Z",
      "TemplateID": 2,
      "ActiveFlg": true
    },
    {
      "TempId": "t-gm",
      "Code": "EV-7F3C2A1B-T2-B02D",
      "TicketName": "Játékmester",
      "Description": "",
      "Price": 0,
      "CurrencyCode": "HUF",
      "Capacity": 8,
      "RegistrationStartAtUtc": "2026-08-01T00:00:00.000Z",
      "RegistrationEndAtUtc": "2026-09-12T07:00:00.000Z",
      "TemplateID": 2,
      "ActiveFlg": true
    }
  ],
  "RoleTickets": [
    { "RoleTempId": "r-player", "TicketTempId": "t-free" },
    { "RoleTempId": "r-org", "TicketTempId": "t-gm" }
  ],
  "PtaSettings": {
    "GameTypeID": 1,
    "PairModeID": 1,
    "ChampionshipID": null,
    "ChampionshipFlg": false,
    "Category": 1,
    "Point1": 10,
    "Point2": 7,
    "Point3": 5,
    "Point4": 3,
    "MaxParticipants": 32,
    "OrganizationGrpFlg": false,
    "TeamGrpFlg": true,
    "RegionGrpFlg": false,
    "CompanyGrpFlg": false,
    "PhotoUploadMandatoryFlg": false,
    "ExtraPrizeFlg": true,
    "ShowUserPositionFlg": true
  },
  "PtaPrizes": [
    { "PrizeID": 2 }
  ]
}
```

Megjegyzések:

- `RoleID` = **master** `tblRole.id` (1 Szervező, 3 Játékos, …)
- `TemplateID` = **master** `tblEventUserFlowTemplate.id` (meghívós / nyilvános / fizetős flow)
- Dátumok: **UTC ISO**, `datetimeoffset`. A FE a helyi dátum+időből `toISOString()`-et csinál
- Ingyenes jegy: `Price: 0` (nem `null`)
- `EventStatusID: 1` = Tervezés. Editnél a FE a **jelenlegi** státuszt küldi, ne írd vissza 1-re

---

## 7. Edit minta — meglévő helyszín, nem PTA

```json
{
  "EventID": 31,
  "Event": {
    "Title": "Meetup",
    "Description": "",
    "EventTypeID": 12,
    "EventStatusID": 3,
    "EventUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "StartAtUtc": "2026-10-01T16:00:00.000Z",
    "EndAtUtc": "2026-10-01T20:00:00.000Z",
    "OnlineFlg": false,
    "OnlineURL": null,
    "EventLocationID": 5,
    "Capacity": null,
    "PublicFlg": true,
    "ActiveFlg": true,
    "EventImageUrl": null,
    "ContactOrganizerID": 8,
    "ContactName": "",
    "ContactEmail": "org@eventjoy.hu",
    "ContactPhone": ""
  },
  "Location": { "id": 5 },
  "Labels": [{ "id": 3, "Name": "Networking" }],
  "Roles": [
    { "TempId": "118", "RoleID": 1, "ActiveFlg": true },
    { "TempId": "119", "RoleID": 8, "ActiveFlg": true }
  ],
  "Tickets": [
    {
      "TempId": "55",
      "Code": "EV-A1B2C3D4-T1-F9E2",
      "TicketName": "Vendég",
      "Description": "",
      "Price": 0,
      "CurrencyCode": "HUF",
      "Capacity": 80,
      "RegistrationStartAtUtc": "2026-09-01T00:00:00.000Z",
      "RegistrationEndAtUtc": "2026-10-01T16:00:00.000Z",
      "TemplateID": 1,
      "ActiveFlg": true
    }
  ],
  "RoleTickets": [
    { "RoleTempId": "119", "TicketTempId": "55" }
  ],
  "PtaSettings": null,
  "PtaPrizes": []
}
```

Kapcsolattartó:

- `ContactOrganizerID` kitöltve = **szervezet** (`tblOrganization.id`)
- `ContactOrganizerID: null` + `ContactName` = **személy**

`EventImageUrl`: a FE létrehozza a mezőt, **nem tölti** (create: `null`; edit: a GET-ből jött érték változatlanul, vagy `null`).

---

## 8. Pinia ↔ tábla (mentés után a GET ezt hozza)

`GET /event/data` datasetek, amiket a store beolvas:

| JSON key | Store | Tábla (kb.) |
|---|---|---|
| `Events` | `events` | `tblEvent` (`id`, `EventTypeID`, `EventStatusID`, `EventUID`, `StartAtUtc`, `EndAtUtc`, `OnlineFlg`, `OnlineURL`, `EventLocationID`, `Capacity`, `PublicFlg`, `ActiveFlg`, `EventImageUrl`, `ContactOrganizerID`, `ContactName`, `ContactEmail`, `ContactPhone`) |
| `Locations` | `locations` | helyszín |
| `Labels` | `labels` | `tblLabel` |
| `EventLabels` | `eventLabels` | `{ EventID, LabelID }` |
| `Roles` | `roles` | **EventRole** `{ id, EventID, RoleID, ActiveFlg }` |
| `Tickets` | `tickets` | EventTicket `{ id, EventID, Code, TicketName, Price, Capacity, TemplateID, RegistrationStartAtUtc, RegistrationEndAtUtc, ActiveFlg }` |
| `RoleTickets` | `roleTickets` | `{ EventRoleID, EventTicketID }` |
| `EventUsers` | `eventUsers` | létrehozáskor a **szervező** sora kell |
| `EventPrograms` | `eventPrograms` | `tblEventProgram` — lásd `docs/event-content.md` |

PTA userdata: `EventSettings`, `EventPrizes`.

**Create plusz:** INSERT `EventUser` a JWT userre, szervező `EventRole` (master RoleID szervező), kezdő EventUserStatus a jegy `TemplateID` flowja szerint. Enélkül a FE nem találja az adatlapot.

---

## 9. SQL váz (egy tran)

```sql
CREATE PROC dbo.spSaveEvent @Json nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRAN;

    DECLARE @EventID int = JSON_VALUE(@Json, '$.EventID');
    -- Event + Location upsert
    -- Labels sync
    -- Roles: TempId → EventRoleID map (#RoleMap)
    -- Tickets: TempId → EventTicketID map (#TicketMap)
    -- RoleTickets: törlés + insert a mapből
    -- ha PtaSettings nem null: PTA.tblEventSettings upsert
    -- PtaPrizes replace
    -- ha @EventID új: EventUser szervező

    COMMIT;

    SELECT 1 AS ReturnValue, N'OK' AS ReturnDescription, @EventID AS EventID;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    SELECT -1 AS ReturnValue, ERROR_MESSAGE() AS ReturnDescription, NULL AS EventID;
  END CATCH
END
```

### OPENJSON példák

```sql
SELECT *
FROM OPENJSON(@Json, '$.Roles')
WITH (
  TempId nvarchar(64) '$.TempId',
  RoleID int '$.RoleID',
  ActiveFlg bit '$.ActiveFlg'
);

SELECT *
FROM OPENJSON(@Json, '$.PtaSettings')
WITH (
  GameTypeID int,
  PairModeID int,
  ChampionshipID int,
  ChampionshipFlg bit,
  Category int,
  Point1 decimal(9,2),
  Point2 decimal(9,2),
  Point3 decimal(9,2),
  Point4 decimal(9,2),
  MaxParticipants int,
  OrganizationGrpFlg bit,
  TeamGrpFlg bit,
  RegionGrpFlg bit,
  CompanyGrpFlg bit,
  PhotoUploadMandatoryFlg bit,
  ExtraPrizeFlg bit,
  ShowUserPositionFlg bit
);
```

Location:

```sql
-- meglévő
SELECT CAST(JSON_VALUE(@Json, '$.Location.id') AS int);

-- új
SELECT *
FROM OPENJSON(@Json, '$.Location')
WITH (
  LocationName nvarchar(200),
  PostalCode nvarchar(16),
  City nvarchar(100),
  AddressLine1 nvarchar(300),
  CountryCode nvarchar(8)
);
```

- `$.Location` null / hiányzik → nincs helyszín-írás (online)
- `$.Location.id` van → használd
- Név mezők vannak, `id` nincs → INSERT

---

## 10. API válasz (amit a FE olvas)

Siker:

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "OK",
  "EventID": 31
}
```

vagy `ReturnValue` = az új `EventID`, ha `> 1`.

Hiba: **`ReturnValue < 0`**, `ReturnDescription` megy a toastba.

C#:

```csharp
[HttpPost("event/save")]
public async Task<IActionResult> Save([FromBody] JsonElement body)
  => Ok(await db.QueryAsync("spSaveEvent", new { Json = body.GetRawText() }));
```

Ne wrappeld `{ json: "..." }` stringbe — a FE a **nyers objektumot** POST-olja.

---

## 11. Sorrend a procban

1. Location (ha új)
2. Event insert/update → `@EventID`
3. Labels
4. Roles + `#RoleMap`
5. Tickets + `#TicketMap`
6. RoleTickets rebuild
7. PtaSettings / PtaPrizes
8. Create: szervező EventUser
9. `SELECT ReturnValue, ReturnDescription, EventID`

---

## 12. FE forrás

- Payload: `src/utils/eventSave.ts` (`buildEventSavePayload`, `saveEvent`)
- Varázsló: `src/components/event-wizard/CreateEventWizard.vue` (`onFinish`)
- Típusok: `src/components/event-wizard/types.ts`
- Edit hydrate: `src/components/event-wizard/hydrateFromEvent.ts`
- Pinia: `src/stores/event.ts` (`setEventData`, `refreshEventData`)
- PTA GET shape: `src/modules/profitability/ptaData.ts` (`PtaEventSettings`)
