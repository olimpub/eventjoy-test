# Olimpub kabala törzs — sysadmin szerződés

A termék: [`olimpub.md`](./olimpub.md) §4.1. Az esti kiosztás (`KabalaIds` → `OP.tblTeam`) marad a `POST /event/save`. Ez a dokumentum a **globális törzs** felvitelét írja le: név, aktív jelölő, és a kabala fájljai.

Felület: Sysadmin → Adatok → Mester adatok → **Kabalák** (`/admin/olimpub/kabalas`).

Auth minden híváson: **sysadmin JWT**. Más user → `403`.

A `GET /op/master` `OpKabalas` listája csak `ActiveFlg = 1` kabala. Az inaktív sor csak a sysadmin GET-en jön. A master sor `Assets` tömbje az aktív fájlok (legalább `profile` és `full`, ha van). A játékos lobbi a `profile` `BlobUrl`-jét mutatja.

A fájl **nem** `OP.Kabala` oszlop és **nem** `OP.Media` (az estés kérdésmédia). Tábla: `OP.KabalaAsset`.

---

## 0. `OP.KabalaAsset`

| Oszlop | |
|---|---|
| `id` | PK |
| `KabalaID` | `OP.Kabala.id` |
| `Slot` | `nvarchar(32)`. Most: `profile`, `full`. Későbbi animáció új kód (`idle`, `win`, …), séma nélkül |
| `Kind` | `image` \| `animation` |
| `BlobUrl` | publikus blob URL. Aktív soron kitöltött |
| `Mime` | opcionális |
| `SizeInBytes` | opcionális |
| `ContentHash` | opcionális, SHA256 hex. v1 a FE nem küldi; a helyszíni cache később használhatja |
| `ActiveFlg` | |

Egyedi: egy aktív sor / `(KabalaID, Slot)`.

| Slot | Kind most | Hol |
|---|---|---|
| `profile` | `image` | lista, csapatválasztó |
| `full` | `image` | nagy megjelenés |

`profile` és `full` Kindje `image`. Más slot v1-ben `400` `Ismeretlen kabala fájl.` Az animáció akkor nyílik, amikor a slot felkerül az engedélyezett listára; a tábla addig is tárolja.

---

## 1. `GET /sysadmin/olimpub/kabalas`

Teljes katalógus, inaktív kabalával együtt. Nincs lapozás. Rendezés: `Name`. Az `Assets` csak az aktív fájlokat tartalmazza.

**200:**

```json
{
  "ReturnValue": 1,
  "Data": [
    {
      "id": 10,
      "Name": "Róka",
      "ActiveFlg": true,
      "TeamCount": 2,
      "Assets": [
        {
          "id": 41,
          "Slot": "profile",
          "Kind": "image",
          "BlobUrl": "https://….blob.core.windows.net/op-media/kabala/profile/a3f1.webp",
          "Mime": "image/webp",
          "SizeInBytes": 84000
        },
        {
          "id": 42,
          "Slot": "full",
          "Kind": "image",
          "BlobUrl": "https://….blob.core.windows.net/op-media/kabala/full/b91c.webp",
          "Mime": "image/webp",
          "SizeInBytes": 240000
        }
      ]
    }
  ]
}
```

| Mező | |
|---|---|
| `id` | `OP.Kabala.id` |
| `Name` | a csapat megjelenített neve |
| `ActiveFlg` | inaktív kabala is jöjjön |
| `TeamCount` | aktív `OP.tblTeam` sorok száma (hány estén van kiosztva) |
| `Assets` | tömb, lehet `[]` |

A tárolt eljárás két result setet ad (kabala, majd asset). A HTTP válasz a fenti egymásba ágyazott forma. A FE a kabala sor `Assets` tömbjét olvassa; ha a fájlok külön `OpKabalaAssets` datasetben jönnek (`KabalaID`-vel), azt is össze tudja kötni.

Üres katalógus: `Data: []` (200).

Magyar szöveg: ugyanaz az UTF-8 út, mint a [`app-versions.md`](./app-versions.md) „Magyar karakterek” blokkja. `Name` **nvarchar**. Nincs `ImageUrl` oszlop.

---

## 2. Fájl — `GET /sysadmin/olimpub/kabalas/upload-url`

A fájl nem megy a Functions body-n. Ugyanaz a write-SAS minta, mint `GET /op/media/upload-url`, de **nincs EventID**, és **nem** ír `OP.Media` sort. A PUT után nincs külön regisztráló POST: a `BlobUrl` a kabala mentés `Assets` elemébe kerül.

Query (camelCase): `slot`, `fileName`, `contentType`, `sizeInBytes`.

| Szabály | |
|---|---|
| `slot` | `profile` vagy `full` |
| `contentType` | `image/jpeg`, `image/png`, `image/webp` |
| `sizeInBytes` | 1 … 5 MB (5 × 1024 × 1024) |
| Egyéb | `400` |

**200:**

```json
{
  "ReturnValue": 1,
  "MediaKey": "a3f1.webp",
  "SasUrl": "https://…sas…",
  "BlobUrl": "https://….blob.core.windows.net/op-media/kabala/profile/a3f1.webp"
}
```

- `SasUrl`: a FE `PUT`, JWT nélkül. Header: `x-ms-blob-type: BlockBlob`, `Content-Type` a MIME.
- TTL ~15 perc, csak write.
- `MediaKey`-t a szerver adja. Blob útvonal: `kabala/{slot}/{MediaKey}` ugyanabban a konténerben, mint az OP kérdésmédia.
- `BlobUrl` **publikus olvasás**. Írás csak SAS-szal.
- v1 nem törli a lecserélt vagy félbehagyott blobot.

---

## 3. `POST /sysadmin/olimpub/kabalas`

Egy kabala insert vagy update, és a küldött slotok szinkronja. Nincs hard delete.

```json
{
  "id": 0,
  "Name": "Róka",
  "ActiveFlg": true,
  "Assets": [
    {
      "Slot": "profile",
      "Kind": "image",
      "BlobUrl": "https://….blob.core.windows.net/op-media/kabala/profile/a3f1.webp",
      "Mime": "image/webp",
      "SizeInBytes": 84000
    },
    {
      "Slot": "full",
      "Kind": "image",
      "BlobUrl": null,
      "Mime": null,
      "SizeInBytes": null
    }
  ]
}
```

| Mező | Szabály |
|---|---|
| `id` | `0` = insert. Pozitív = update. Ismeretlen id → `404` |
| `Name` | kötelező, trim, 1…80 karakter. Üres → `400` `Add meg a kabala nevét.` |
| `ActiveFlg` | kötelező bit |
| `Assets` | tömb. Hiányzó vagy `[]` = egyetlen slot sem változik |
| `Assets[].Slot` | v1: `profile` \| `full`. Duplikált slot a tömbben → `400` |
| `Assets[].Kind` | `profile` / `full` esetén `image` |
| `Assets[].BlobUrl` | `null` = a slot aktív sorát inaktiválja (a fájl lekerül). Kitöltve: saját konténer `https://` URL, max 500 karakter. Más host → `400` `A kép címe nem fogadható.` |
| `Mime`, `SizeInBytes` | opcionális. Ha a méret megvan és 5 MB fölött van → `400` |

A tömbben **nem** szereplő slot megmarad. Így egy későbbi animációs slotot nem töröl egy kliens, amely csak `profile` és `full` sort küld.

**Névütközés:** aktív kabalák között a név egyedi (a DB collation szerint). Ütközés → `400` `Már van ilyen nevű kabala.`

**Inaktiválás:** szabad akkor is, ha `TeamCount > 0`. A meglévő `OP.tblTeam` és a fájlok megmaradnak. Az inaktív kabala **nem** jön a `GET /op/master`-ben, tehát új estre nem választható.

**`POST /event/save` `KabalaIds`:** minden id létező `OP.Kabala`. Újonnan hozzáadott id csak `ActiveFlg = 1`. Ami ezen az eseményen már aktív csapat, az inaktív kabalával együtt is megmaradhat a listában. Duplikátum → `400`.

**200:** `{ "ReturnValue": 1, "id": 10 }`

Hiba: HTTP 400/404 + `{ "ReturnValue": -1, "ReturnDescription": "…" }`.

SQL: [`scripts/op-kabala-admin.sql`](../scripts/op-kabala-admin.sql) — `OP.spAdminListKabala`, `OP.spAdminSaveKabala`. A blob-host ellenőrzés az API rétegben van (konfigurált konténer prefix). Az eljárás a `https://` előtagot és a 500-as hosszt nézi. Ha a kabala táblán még ott az egyetlen `ImageUrl` oszlop, a script `profile` assetté másolja, majd eldobja az oszlopot.
