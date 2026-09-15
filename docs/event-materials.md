# Esemény-anyagok — backend szerződés (v1)

FE scope: szervezői **Event manage → Anyagok**. Feltöltés + lista. Résztvevői megjelenítés / letöltő UI **nincs** ebben a körben.

Nincs sysadmin-only `/sysadmin/materials` hívás a szervezői JWT-vel. A szervező az **esemény** alatt dolgozik.

A fájl **közvetlenül Azure Storage-ba** megy SAS-szal. A Functions **nem** kapja a fájl byte-jait.

---

## Master data

`tblMaterialType` kerüljön a meglévő master payloadba (`GET /user/data` / master sync), mint a szerepkörök.

```json
{
  "MaterialTypeID": 1,
  "TypeName": "Játékszabályzat",
  "TypeCode": "RULES",
  "SortOrder": 1
}
```

A FE **nem** hardkódol ID-t (1=RULES stb.). Üres lista → ne lehessen feltölteni.

---

## Feltöltés (SAS)

### `GET /event/{eventId}/materials/upload-url`

Query: `fileName` (kötelező), opcionális `contentType`, `sizeInBytes`.

Szervező JWT, az `eventId`-n legyen joga (szervező / owner).

**200:** `{ "SasUrl": "https://...sas...", "BlobUrl": "https://.../materials/..." }`

- `SasUrl`: ide `PUT` a FE, **JWT nélkül**. Header: `x-ms-blob-type: BlockBlob`, `Content-Type` a fájl MIME-ja.
- `SasUrl` TTL: ~15 perc, csak write.
- `BlobUrl`: a végleges, SAS nélküli URL, ezt mentjük.

Ha a méret túl nagy: **400** + üzenet. (A FE első körben nem limitál kiterjesztést; a BE állítson abszolút plafont, pl. 100 MB.)

Azure Storage CORS: a FE origin (`localhost:9000`, teszt/prod SWA) `PUT` + a fenti headerek.

---

## Regisztrálás + bekötés (egy lépés)

Több fájl = több hívás, **ugyanazzal** a `MaterialTypeID` + `EventRoleIDs` + (opcionális) közös `PublicName` prefixszel. A FE fájlonként külön SAS + PUT + ezt a POST-ot.

### `POST /event/{eventId}/materials`

```json
{
  "FileName": "szabalyzat.pdf",
  "BlobUrl": "https://....blob.core.windows.net/materials/...",
  "ContentType": "application/pdf",
  "SizeInBytes": 204800,
  "PublicName": "OPTA 2026 Játékszabályzat v1.2",
  "MaterialTypeID": 1,
  "EventRoleIDs": [12, 15]
}
```

| Mező | Szabály |
|---|---|
| FileName, BlobUrl, ContentType, SizeInBytes | kötelező, a SAS/PUT után |
| PublicName | ha üres → `FileName` |
| MaterialTypeID | kötelező, létező típus |
| EventRoleIDs | opcionális. **Üres / hiányzik = minden szerepkör** az eseményen (nincs role-szűrés; később felvett szerep is látja). Ha ki van töltve: csak ezek az **`EventRoleID`**-k (nem a master `RoleID`) |

**200:** `{ "EventMaterialID": 1, "MaterialID": 45 }`

A `BlobUrl` ne legyen átírható idegen konténerre — csak a ti SAS-os konténeretek.

---

## Lista

### `GET /event/{eventId}/materials`

Szervező JWT. Rendezés: `CreatedAt DESC`.

```json
{
  "Data": [
    {
      "EventMaterialID": 1,
      "MaterialID": 45,
      "PublicName": "OPTA 2026 Játékszabályzat v1.2",
      "FileName": "szabalyzat.pdf",
      "ContentType": "application/pdf",
      "SizeInBytes": 204800,
      "MaterialTypeID": 1,
      "MaterialTypeName": "Játékszabályzat",
      "MaterialTypeCode": "RULES",
      "IsActive": true,
      "BlobUrl": "https://...",
      "CreatedAt": "2026-09-14T12:00:00Z",
      "Roles": [
        { "EventMaterialID": 1, "EventRoleID": 12, "RoleName": "Szervező" },
        { "EventMaterialID": 1, "EventRoleID": 15, "RoleName": "Játékos" }
      ]
    }
  ]
}
```

`Roles: []` (vagy hiányzik) = **minden szerepkör** (összhangban az üres `EventRoleIDs` binddel).

Envelope: ugyanaz, mint a többi event API (`ReturnValue`, `Data` / `Result2`).

---

## Letöltés (SAS)

A lista `BlobUrl`-je **SAS nélküli**, a konténer privát. A FE **nem** hívhatja JWT-vel az Azure-t (AuthorizationFailure), és SAS nélkül sem.

### `GET /event/{eventId}/materials/{eventMaterialId}/download-url`

Szervező JWT. Alternatíva: `GET /event/{eventId}/materials/download-url?eventMaterialId=`

**200:** `{ "SasUrl": "https://...sas..." }` (opcionális `BlobUrl`)

- `SasUrl`: read SAS, TTL ~15 perc, csak GET.
- A FE `fetch`/`GET` JWT **nélkül**. Ha a lista elemén már van read SAS (`sig=` + `sp` tartalmaz `r`-t), azt használja, nem kér újat.

Azure Storage CORS: a FE originre `GET` is kell (a PUT mellé).

Fallback, ha a download-url nincs: `GET /event/{eventId}/materials/{eventMaterialId}/file` — a Functions streameli a fájlt (JWT OK, ez nem Azure).

---

## v1-ben NEM kell

- Résztvevői GET / letöltő képernyő
- PATCH (név, típus, szerepek)
- DELETE / IsActive kapcsoló
- Fájlcsere
- Sysadmin külön repository (`POST /sysadmin/materials` + külön bind) — később, ha kell globális anyagkönyvtár

---

## Axios / SAS

A FE JWT interceptora **nem** teheti rá a `Authorization` headert a `SasUrl` PUT/GET-re. A BE-nek sem kell JWT-t várnia az Azure hívásokon.

---

## Példa (2 PDF, ugyanaz a típus + szerepkör)

1. `GET .../upload-url?fileName=a.pdf` → PUT `SasUrl`
2. `POST .../materials` `{ BlobUrl, MaterialTypeID, EventRoleIDs, FileName: "a.pdf" }`
3. ugyanez `b.pdf`-re
