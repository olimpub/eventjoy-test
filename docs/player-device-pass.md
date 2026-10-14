# Játékos belépő kód — személyes QR, eszközhöz kötött session

A szervező vagy a játékmester a résztvevő adatlapján egy **személyes QR-t** mutat. A játékos a **saját telefonjával** olvassa le. A telefon e-mail és OTP nélkül sessiont kap, és az eszköz ehhez a játékoshoz kötődik.

A frontend már ezt a szerződést hívja. Az útvonal és a mezőnevek ehhez igazodnak.

Ez **nem**:

| | Mit csinál | Miért nem ez |
|---|---|---|
| Jegy QR | `EventUserUID` → `EventUser.SetStatus` Belépett | nem ad JWT-t |
| Helyszíni QR | `EventUID` → login + `POST /event/join` | egy kód az egész teremnek, OTP kell |
| Meghívó | Invitation UID + OTP | e-mail, előre kitöltött azonosító |
| `POST /auth/device-join` | Olimpub, névvel **új** user, `TokenKind: OpDevice` | csak ha a bejelentkezés nyitva van, nem meglévő PTA-játékos |
| Walk-in | szervező gépel, meghívó mail | nincs vendég-QR |

A QR **HTTPS URL**, a kamera böngészőt nyit. A szerver a tokent adja, az URL-t a frontend rakja össze:

`https://{host}/join/pass/{PassToken}`

A token nem `EventUID` és nem `EventUserUID`. Kitalálhatatlan, legalább 32 bájt, URL-biztos. Ne kerüljön a falra.

---

## Két hívás

```
Szervező / JM adatlap  →  POST /auth/player-pass
                              │
                              └─ PassToken  →  QR

Játékos telefonja      →  /join/pass/{PassToken}
                              │
                              └─ POST /auth/player-device-join
                                    │
                                    ├─ CheckedIn true   →  játékos adatlap
                                    └─ CheckedIn false  →  várakozó képernyő
```

A várakozó képernyő kell, mert a játékos adatlap addig zárva van, amíg az esemény nincs bejelentkezésen **és** a játékos nincs Belépett.

---

## 1. `POST /auth/player-pass`

Auth: **Bearer**. A hívó az esemény aktív **szervezője vagy játékmestere**. A játékmester a résztvevőlistát csak olvassa, ezt a kódot ettől még kiadhatja. Más user → 403.

```json
{
  "EventID": 40,
  "EventUserID": 321,
  "Rotate": false
}
```

`Rotate` hiányzik vagy hamis: ha van még élő kód ehhez az EventUserhez, **ugyanazt** add vissza. Így a lap újranyitása nem cserél QR-t, és a már kötött telefon továbbra is belép.

`Rotate: true`: az előző kód azonnal érvénytelen, a `DeviceId` kötés törlődik, új token. Ezt a felület **Új kód** gombja küldi (elveszett telefon).

### Szabályok

1. `EventUser` az adott `EventID`-n van, aktív, és **játékos vagy játékmester**. Szervezői sorra 400 `Ez a kód csak játékosnak vagy játékmesternek adható.` A játékmesteri sor részletei lent, a „Játékmester” szakaszban.
2. A sornak van `UserID`. Nincs fiók → 400 `Ehhez a játékoshoz nincs fiók.`
3. Ne hozz létre usert, EventUsert, meghívót. **Ne küldj e-mailt.**
4. Lejárat: kiadástól 24 óra, vagy az esemény vége + 2 óra, amelyik későbbi. Lejárt kódot a következő `Rotate: false` hívás cseréljen újra, kötés nélkül.
5. Egyszerre egy élő kód egy EventUserre.

### Válasz (200)

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "Belépő kész.",
  "PassToken": "…",
  "ExpiresAtUtc": "2026-10-14T18:00:00Z"
}
```

A mező neve **`PassToken`**. Ezen a válaszon ne legyen `Token`: azt a frontend a belépés JWT-jének olvassa.

---

## 2. `POST /auth/player-device-join`

Auth: **nincs**. A telefon nem küldi a szervező bent lévő tokenjét.

```json
{
  "PassToken": "…",
  "DeviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "DeviceName": "EventJoy WebApp"
}
```

`DeviceId` ugyanaz a GUID, amit a sima belépés is küld (`device_uuid`). Kis/nagybetű ne számítson. Üres vagy nem GUID → 400 `Hiányzik az eszköz.`

### Kötés

| Állapot | Teendő |
|---|---|
| Kód él, még nincs `DeviceId` | kösd ehhez az eszközhöz, adj JWT-t |
| Ugyanaz a `DeviceId` | adj **új** JWT-t. Számold újra a `CheckedIn`-t |
| Másik `DeviceId` | **409** `Ez a belépő már másik telefonhoz tartozik.` Sem státusz, sem token |
| Ismeretlen, inaktív vagy lejárt kód | **404** `A belépő kód nem érvényes.` |

A kötés csak erre a kódra szól. A játékos e-mail vagy telefon OTP-je másik telefonon továbbra is működik. Ne zárd a fiókot egy eszközre.

Ugyanaz a telefon, ugyanaz a kód, később újra: a lap frissítése után is belép. Ha közben az esemény bejelentkezésre váltott, a második hívás Belépteti.

### Beléptetés

Ugyanaz a „bejelentkezés vagy később” döntés, mint `eventStatusReachedCheckIn` (Bejelentkezés, sorsolás, játék, lezárás, eredmény).

| Esemény | EventUser státusz | `CheckedIn` |
|---|---|---|
| Még bejelentkezés előtt | **ne változzon** | `false` |
| Bejelentkezés vagy később, még nem Belépett | `SetStatus` → **Belépett** | `true` |
| Már Belépett | marad | `true` |

Ne hozz létre második EventUsert. Ne küldj mailt. Ne léptesd vissza a státuszt.

### JWT

A **játékos `UserID`-jához** tartozó rendes belépő token, ugyanaz a fajta, mint `POST /auth/verify-otp`.

- `TokenKind` **ne** legyen `OpDevice`.
- Ugyanaz a lejárat, mint az OTP-s tokennek.
- A boot (`fetchBootData`) és a játékos adatlap ezzel a tokennel menjen.
- Másik user sessionjét ne keverd bele.

### Válasz (200)

```json
{
  "ReturnValue": 1,
  "ReturnDescription": "Belépés kész.",
  "Token": "…",
  "EventID": 40,
  "EventUserID": 321,
  "CheckedIn": false
}
```

`CheckedIn` boolean. `Token`, `EventID`, `EventUserID` kötelező. Ha bármelyik hiányzik, a telefon nem nyit adatlapot.

`CheckedIn: true` → a frontend a játékos adatlapra visz (`/profitability/event/{EventID}` PTA-n). `false` → a belépő oldalon marad: a telefon ehhez a játékoshoz tartozik, az adatlap a bejelentkezéskor nyílik meg.

---

## Hibák

Siker: HTTP 200 és `ReturnValue >= 0`.

Üzleti hiba: HTTP 400 / 403 / 404 / 409, **és** `ReturnValue < 0`. A `ReturnDescription` megy ki a telefonra és a szervező lapjára, magyarul.

| HTTP | Mikor | `ReturnDescription` |
|---|---|---|
| 403 | a hívó nem szervező és nem játékmester ezen az eseményen | `Ehhez nincs jogosultságod.` |
| 400 | a sor se játékos, se játékmester (szervező) | `Ez a kód csak játékosnak vagy játékmesternek adható.` |
| 400 | nincs `UserID` | `Ehhez a játékoshoz nincs fiók.` |
| 400 | `DeviceId` hiányzik | `Hiányzik az eszköz.` |
| 404 | kód nincs / lejárt / rotálva lett | `A belépő kód nem érvényes.` |
| 409 | másik telefon már kötötte | `Ez a belépő már másik telefonhoz tartozik.` |

---

## Mit tárolj

Egy élő sor EventUserenként elég.

| Mező | |
|---|---|
| `EventID`, `EventUserID` | kinek a kódja |
| `PassToken` | egyedi, titok |
| `DeviceId` | null, amíg nincs első sikeres olvasás |
| `BoundAtUtc` | az első kötés |
| `ExpiresAtUtc` | lejárat |
| `ActiveFlg` | a rotálás 0-ra teszi a régit |
| `CreatedByUserID` | melyik szervező vagy játékmester adta ki |

---

## Játékmester — ezt módosítsd

Ugyanaz a két végpont. Új útvonal nem kell. A játékmesteri sorra ma `POST /auth/player-pass` 400-at ad: `Ez a kód csak játékosnak adható.` Ezt engedd el.

### `POST /auth/player-pass`

A cél `EventUser` lehet aktív **játékmester** is, nemcsak játékos. Szervezői sor továbbra is 400.

A hívó szabálya marad: az esemény szervezője vagy játékmestere. Egy játékmester kiadhat kódot egy másik játékmesternek.

Kötés, `Rotate`, lejárat, `PassToken` válasz: ugyanaz, mint a játékosnál. Ne hozz létre usert, és ne küldj e-mailt.

### `POST /auth/player-device-join`

A válasz mezői maradnak: `Token`, `EventID`, `EventUserID`, `CheckedIn`.

A JWT a játékmester `UserID`-jához tartozó rendes belépő token, ugyanaz, mint `POST /auth/verify-otp`. `TokenKind` ne legyen `OpDevice`.

A játékmester adatlapja **nem** a Belépett státusztól függ. Játékmesteri sornál **ne** hívd a `SetStatus` → Belépett (11) ágat, és a státuszt ne módosítsd.

| Esemény | Játékmester státusza | `CheckedIn` |
|---|---|---|
| Még bejelentkezés előtt | változatlan | `false` |
| Bejelentkezés vagy később | változatlan | `true` |

A „bejelentkezés vagy később” ugyanaz, mint a játékosnál (`eventStatusReachedCheckIn`).

`CheckedIn: true` → a telefon a játékmesteri adatlapot nyitja, nem a játékosét. `false` → ugyanaz a várakozó képernyő.

Az eszközkötés változatlan: első telefon köti, ugyanaz a telefon új JWT-t kap, másik telefon 409.

---

## Frontend, ami már kész

- Résztvevők adatlap, játékos és játékmester sor: **Belépő kód**. Szervező és játékmester is kiadhatja. A terems QR (`EventUID`) marad a fejlécen, csak a szervezőnek.
- A lap a `POST /auth/player-pass` választ rajzolja QR-be. **Új kód** → `Rotate: true`.
- Publikus oldal: `/join/pass/:token` → `POST /auth/player-device-join`.
- Amíg a végpont nincs kint, a szervező lapja ezt írja: `A belépő kódot a szerver még nem adja ki.`
