# Olimpub — média (BE szerződés)

Kétféle média egy kérdésen. **Nem** egy `MediaKey`.

| Slot | Hol látszik / szól | Formátum | Ki tölti | Ki tölti le helyben |
|---|---|---|---|---|
| **Kép** | játékos kérdés alja (logó helyett), display | jpeg / png / webp | szervező | szerv + QM (opcionális; a player URL-t is ehet) |
| **Hang** | csak QM / szervező gép (PA) | **csak MP3** | szervező | szerv + QM, **kötelező a helyszínen** |

A játékos telefonján **nincs hang**. A display **nem** játszik MP3-at.

**Helyi cache (FE ügy, a BE ezt szolgálja ki):** az estéhez tartozó összes média **egyszer** lejön `OP/{EventID}/media/{MediaKey}` alá (PWA: OPFS / Cache API). Lejátszás / `<img>` **először helyben**, hash egyezés. Hiány / más hash → blob, aztán cache. Lefedettség ne öljön zenét. A QM vezérlő: helyben / hiányzik / letöltés.

Ne keverjük az `EventMaterials` SAS-os szabályzat-feltöltéssel. OP saját `/op/media*`.

Az élő API tetején a „V1 nincs: media OP endpoint” **hamis** — ez a kör benne van.

---

## 1. Séma

`OP.Media` — esteszintű katalógus, nem kérdésenként blob-duplikátum.

| Oszlop | |
|---|---|
| `EventID` | |
| `MediaKey` | filename-safe `[a-zA-Z0-9._-]+`, unique `(EventID, MediaKey)` ActiveFlg=1 |
| `Kind` | `image` \| `audio` |
| `BlobUrl` | a ti konténeretek, nem idegen host |
| `ContentHash` | SHA256 hex — a FE ettől tudja, hogy a helyi fájl stimmel |
| `Mime` | |
| `SizeInBytes` | |
| `FileName` | eredeti feltöltött név (UI) |
| `ActiveFlg` | |

`OP.tblQuestion` (repository) **két** kulcs:

| Oszlop | |
|---|---|
| `ImageKey` | `OP.Media.MediaKey` vagy null |
| `AudioKey` | ugyanez, hang |

A régi egy mezős `MediaKey` **ne** legyen a hang. Ha megmarad kompatnak: alias a **képre**. Import `MediaUrl` / `MediaKey` oszlop → `ImageKey`.

`tblEventQuestion` nem tárol külön kulcsot — a `QuestionID` repository sorát olvassuk.

---

## 2. Feltöltés — SAS (mint Anyagok)

A fájl **ne** menjen a Functions body-n (MP3). Ugyanaz a minta, mint `GET /event/{id}/materials/upload-url`.

### `GET /op/media/upload-url`

Query: `eventId` (vagy path), `fileName`, `kind` (`image`\|`audio`), opcionális `contentType`, `sizeInBytes`.

Auth: **szervező**. QM → `403`.

| Kind | Accept | plafon |
|---|---|---|
| `image` | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| `audio` | **csak** `audio/mpeg` (`.mp3`) | 20 MB |

Más → `400`. Túl nagy → `400`.

**200:**

```json
{
  "MediaKey": "a3f1c0e2-img.jpg",
  "SasUrl": "https://…sas…",
  "BlobUrl": "https://….blob.core.windows.net/op-media/…"
}
```

- `SasUrl`: FE `PUT`, JWT nélkül. Header: `x-ms-blob-type: BlockBlob`, `Content-Type` a MIME.
- `SasUrl` TTL ~15 perc, csak write.
- `MediaKey`-t a **BE** adja (ne a kliens találja ki).
- Azure CORS: FE origin `PUT` + fenti headerek.

### `POST /op/media`

Regisztrálás a PUT után. Auth: **szervező**.

```json
{
  "EventID": 89,
  "MediaKey": "a3f1c0e2-img.jpg",
  "Kind": "image",
  "BlobUrl": "https://….blob.core.windows.net/op-media/…",
  "ContentHash": "…sha256 hex…",
  "Mime": "image/jpeg",
  "SizeInBytes": 184320,
  "FileName": "kerdes-foto.jpg",
  "QuestionID": 440,
  "Slot": "image"
}
```

| Mező | |
|---|---|
| `EventID`, `MediaKey`, `Kind`, `BlobUrl`, `Mime`, `SizeInBytes` | kötelező |
| `ContentHash` | kötelező, SHA256 hex. A FE számolja a fájlból **feltöltés előtt** |
| `FileName` | ha üres → `MediaKey` |
| `QuestionID` + `Slot` | opcionális azonnali kötés. `Slot`: `image` \| `audio`. Kell, hogy a `Kind` stimmeljen (`audio` + `Slot=image` → 400) |

`BlobUrl` csak a ti SAS-os konténeretek. UPSERT `OP.Media` (`EventID`+`MediaKey`).

Ha van `QuestionID`+`Slot`: írd `tblQuestion.ImageKey` / `AudioKey`. Csak szervező, kérdés az eseményen. Pending kérdés — ugyanaz a tiltás, mint a save (`active`/`stopped` → 400).

**200:** `{ "ReturnValue": 1, "MediaKey", "BlobUrl", "ContentHash", "Kind" }`

---

## 3. Manifest — egy kvíz, egy könyvtár

### `GET /op/media/manifest/:eventId`

Auth: **szervező + QM**. Játékos / display → `403`.

Az estéhez tartozó **összes** Active `OP.Media` (nem csak a bekötött — a FE a kérdés-kulcsokból szűr, ha kell). A letöltéshez **olvasó SAS** kell, ne nyilvános konténer a hangnak.

**200:**

```json
{
  "EventID": 89,
  "Items": [
    {
      "MediaKey": "a3f1c0e2-img.jpg",
      "Kind": "image",
      "FileName": "kerdes-foto.jpg",
      "Mime": "image/jpeg",
      "SizeInBytes": 184320,
      "ContentHash": "…",
      "BlobUrl": "https://…read-sas…"
    },
    {
      "MediaKey": "b91-aud.mp3",
      "Kind": "audio",
      "FileName": "intro.mp3",
      "Mime": "audio/mpeg",
      "SizeInBytes": 2400000,
      "ContentHash": "…",
      "BlobUrl": "https://…read-sas…"
    }
  ]
}
```

- `BlobUrl` = read SAS, TTL legalább **12 óra** (helyszíni letöltés / szünet után is).
- A FE a `ContentHash`-t hasonlítja a helyi fájlhoz. Egyezik → nem tölti újra.
- Üres este: `Items: []`, ne 500.

Nincs zip-endpoint v1-ben. A FE sorban (párhuzamosan, limitáltan) tölti az Itemeket.

---

## 4. Kötés a kérdésre

Elsődleges: **`POST /op/question/save`** lapos body + kulcsok.

```json
{
  "EventID": 89,
  "EventQuestionID": 1201,
  "QuestionID": 440,
  "ImageKey": "a3f1c0e2-img.jpg",
  "AudioKey": "b91-aud.mp3"
}
```

- Kulcs hiányzik → ne nyúlj a slothoz.
- `null` → levétel (a `OP.Media` sor **marad**, csak a kötés esik).
- A kulcs az esemény `OP.Media`-jában legyen, `Kind` stimmeljen. Idegen / rossz kind → 400.
- Ugyanaz a `MediaKey` több kérdésen oké (közös intro-kép).

Opcionális alias, ha a szerkesztő feltöltés után még nem save-el: a `POST /op/media` `QuestionID`+`Slot` (fent).

`Op.BindMedia` a `/op/game/change`-en **nem kell**, ha a save + register köti. Ha megmarad: `QuestionID`, `MediaKey`, `Slot` (`image`\|`audio`). `Kind: "repo"` elavult.

---

## 5. GET `/op/event/:id` — `OpEventQuestions`

Lapos mezők a meglévő Answer/Match mellett:

| Mező | Szerv / QM | Játékos | Display |
|---|---|---|---|
| `ImageKey` | igen | igen (vagy null) | igen |
| `ImageUrl` | read SAS vagy blob URL | **igen** — ebből lesz az `<img>` | igen |
| `AudioKey` | igen | **null** | **null** |
| `AudioUrl` | read SAS | **null soha** | **null soha** |

`MediaUrl` / `MediaKey` alias **csak a képre**, ha muszáj. Hangot ide tenni tilos (a player `<img>`-be tenné).

Játékos: csak `active` kérdés, kép URL-lel. Hang soha.
Display: kép igen, hang nem, helyes válasz tilos (marad).

`ImageUrl` / `AudioUrl` TTL: ugyanaz a rend, mint a manifest read SAS (GET-enként új SAS oké).

---

## 6. Törlés

### `POST /op/media/delete`

`{ "EventID": 89, "MediaKey": "b91-aud.mp3" }`

Auth: szervező.

- Ha bármely `tblQuestion` (az eseményen) `ImageKey` vagy `AudioKey` = ez → `400` `A média kérdéshez van kötve.` (előbb save `null`).
- Soft: `ActiveFlg=0`. Blob törlés v1-ben opcionális.

---

## 7. Amit a FE csinál / nem

**Csinál**

- Quiz szerkesztő: két kártya (kép + MP3), feltöltés = upload-url → PUT → register.
- `GET manifest` → egy gomb: letöltés az eszközre (QM + szerv).
- QM: hang **helyi fájl**, ha a hash stimmel; különben Blob, aztán cache.
- Játékos: `ImageUrl` (vagy helyi kép, ha véletlenül van). Nincs audio tag.

**Nem**

- Excelben nincs bináris. Opcionális `MediaKey` oszlop = későbbi kötés, nem feltöltés.
- EventMaterials endpointot nem hív.
- Nem számol hash-t a szerveren a FE helyett — a register `ContentHash`-t elvárja.

---

## 8. Hibák

Ugyanaz: `400`/`403` + `{ ReturnValue: -1, ReturnDescription }`. Siker: `ReturnValue = 1`.

Példák: `Csak MP3 tölthető fel hangnak.`, `A kép túl nagy (max 5 MB).`, `A média kérdéshez van kötve.`, `Érvénytelen média-kulcs.`
