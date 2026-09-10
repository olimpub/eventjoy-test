# Helyszíni QR belépés — vendég `EventUID` alapján

A szervező **kivetít egy QR-t**. A vendég beolvassa, belép (e-mail / telefon OTP), ha kell megerősíti a nevét, majd **játékosként Belépett** lesz, és megnyílik az esemény adatlapja.

Ez **nem** a jegy-QR, **nem** a meghívó link, **nem** a szervező `+` walk-in.

---

## Három QR / UID — ne keverd

| | Mit kódol | Ki olvassa | Mi történik |
|---|---|---|---|
| **Jegy QR** | `EventUserUID` | szervező / játékmester a scan oldalon | `EventUser.SetStatus` → Belépett |
| **Meghívó** | Invitation UID | vendég a mailből | `GET /invite/:uid` + OTP a **előre kitöltött** azonosítóra |
| **Ez** | **`tblEvent.EventUID`** | vendég a telefonjával a kivetítőn | login + saját EventUser (Játékos, Belépett) |

A QR **HTTPS URL**, nem nyers GUID — a kamera megnyitja a böngészőt.

Példa: `https://testapp.eventjoy.hu/join/{EventUID}`

Útvonal: **`/join/:eventUid`**. (`quicklocalregistration` túl hosszú, a kamera és a kivetítő is rövidebbet bír.) Router: `history` mód, nincs `#`.

---

## Miért új végpont

Meglévő akciók **nem** fedik le:

| Végpont | Miért nem ez |
|---|---|
| `EventUser.Apply` | jegy-ID, `PublicFlg`, **flow start** státusz (Megerősítésre vár) — nem Belépett |
| `POST /event/invite/walkin` | **szervező** JWT, ő gépel, **mindig meghívó mail**, nincs vendég-session |
| `EventUser.SetStatus` + `EventUserUID` | már létező jegy; a vendégnek nincs EventUserUID-ja a zsebében |
| `GET /invite/:uid` | Invitation UID, előre kitöltött identity, nem EventUID |

Új: a vendég **saját JWT**-jével, **EventUID**-val belépteti magát.

---

## Vendég folyamat

```
Kivetítő QR  →  /join/{EventUID}
                    │
                    ├─ nincs session  →  /login?next=/join/{EventUID}
                    │                    (meglévő OTP: check-identity → request-otp → verify-otp)
                    │
                    └─ van session
                         │
                         ├─ FirstName vagy LastName üres  →  név popup  →  POST /user/save
                         │
                         └─ POST /event/join { EventUID }
                                │
                                └─ GET /event/userdata/:id  →  játékos adatlap
```

Login: **ugyanaz**, mint a sima belépés (e-mail vagy telefon + OTP; social a login képernyőn marad). A `/login` ma mindig `router.push('/')` — kell egy **`next`** query, amit a guard is tisztel (most belépett user `/login`-ra `/`-re megy, a `next`-et eldobná).

Név: telefonos OTP-s usernél gyakran üres (`tblUser.FirstName` / `LastName`). Popup **kötelező mindkét mező**. Meglévő nevet **ne** írjuk felül, csak erősítés / üres kitöltés.

Ezután az Event adatlap: PTA játékos `/profitability/event/:id`. A `playerEnterBlocked` ma Belépett státuszt vár — a join **Belépett**-et állít, ezért a kapu kinyílik.

---

## Szervező UI

Résztvevők lista header: **QR gomb a `+` mellett**, Excel előtt.

Látható, ha:

- nem read-only / nem játékmester (ugyanaz, mint a `+`)
- **és** az esemény státusza **legalább Bejelentkezés** (`eventStatusReachedCheckIn`)

Tervezés / Szervezés / Jelentkezés alatt **nincs** QR — ott a `+` walk-in Megerősítésre vár + meghívó mail.

Kattintás: teljes képernyős / projektor sheet: nagy QR, esemény címe, „Olvasd be a belépéshez”. A payload a fenti HTTPS URL. Az `EventUID` a GET event data `Events.EventUID` mezője (varázsló save már írja).

---

## API

### `GET /event/join/:eventUid` — publikus előnézet

Auth **nincs**. A landing / projektor ellenőrzi, hogy él-e a belépés.

Válasz:

```json
{
  "EventUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "EventID": 40,
  "Title": "Nyári kupa",
  "CheckInOpen": true,
  "EventStatusName": "Bejelentkezés"
}
```

| HTTP | Mikor |
|---|---|
| 404 | nincs ilyen EventUID / inaktív |
| 200 `CheckInOpen: false` | esemény Bejelentkezés **előtt** (vagy lezárva, ha úgy döntünk) — a FE szöveget mutat, nem beléptet |

Ne add ki a résztvevőlistát.

### `POST /event/join`

Auth: **Bearer, a vendég**. Nem szervező-ellenőrzés.

```json
{
  "EventUID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

A név **nem** innen jön — előtte `/user/save`, ha kellett. A join a JWT `UserID` + `tblUser` nevekkel dolgozik.

### Szabályok

1. EventUID → aktív esemény. Nincs → 404.
2. EventStatus **Bejelentkezés vagy később** (ugyanaz a logika, mint a walk-in Belépett ága / `eventStatusReachedCheckIn`). Előtte → 400 `A helyszíni belépés a bejelentkezéstől él.`
3. **PublicFlg nem kell** — az EventUID a „ajtón lévő kód”.
4. Kapacitás: **új** EventUser beszúrásnál ugyanaz, mint walk-in. Ha már van aktív sora, ne számold újra.
5. Szerep / jegy: mindig **Játékos** + játékos jegy (mint walk-in). Nincs játékos szerep → 400.
6. `tblUser.LastName` **és** `FirstName` nem üres. Üres → 400 `Add meg a neved.` (a FE popup ezt előzi meg).
7. **Mail / Invitation / Outbox: nincs.** A vendég ott áll, nem meghívó.
8. `EventUserUID`: új GUID, ha INSERT.

### Duplikátum (szándékosan más, mint a walk-in)

Walk-in: ugyanaz az e-mail/telefon → **409**, a szervező ne hozzon létre másodikat.

Join: a JWT user **saját** sora.

| Már van az eseményen | Teendő |
|---|---|
| aktív **Játékos** EventUser, még nem Belépett | `SetStatus` → **Belépett** (nem INSERT) |
| aktív Játékos, már Belépett | **200 idempotens** — FE adatlap |
| csak szervező / játékmester sor | **ne** hozz létre második játékos sort; 200 + a FE a meglévő szerep adatlapjára visz |
| nincs EventUser | INSERT Játékos, Belépett, `UserID` = JWT |

Ne hozz létre második játékos sort ugyanarra a UserID + EventID-re.

### Csoportosítás (PTA flag)

A `+` walk-in-nál a bekapcsolt Csapat / Szervezet / … **kötelező**, mert a szervező gépel.

A QR-nél a vendég a sorban áll. **v1: grouping nem kell** — üresen mehet, a szervező utólag állítja a listán. Később a név-popupba tehető, ha a flag be van.

### Válasz (200)

```json
{
  "ReturnValue": 0,
  "ReturnDescription": "Belépés kész.",
  "EventID": 40,
  "EventUserID": 321
}
```

SignalR: opcionális `event_{id}_organizer` (a lista frissül). A FE GET userdata-t hív.

---

## FE teendők (ha a szerződés ok)

1. Résztvevők: QR ikon a `+` mellett, csak `eventStatusReachedCheckIn`.
2. Projektor sheet (`qrcode` csomag már van, mint a jegy QR).
3. Publikus `/join/:eventUid` (bottom nav rejtve, mint `/invite`).
4. Login `next` query + guard.
5. Név-confirm dialog (Családnév / Keresztnév) → `/user/save`.
6. `POST /event/join` → játékos adatlap.

A FE login **csak OTP** (jelszó / „állíts be jelszót” nincs). A `/login?next=/join/{EventUID}` guard visszahozza a joinra. Ha a `POST /event/join` még nincs a szerveren, a vendég belép, de nem lesz EventUser — 400/404 a join oldalon.

A walk-in `+` **marad** — aki nem tud telefonnal belépni, azt a szervező viszi fel.

---

## Nem ebben a körben

- Jegyválasztó / fizetés
- Grouping mezők a QR flow-ban
- Meghívó e-mail a self-joinra
- EventUID nélküli régi esemény (ha a GET-ben nincs UID, a QR gomb rejtve)
