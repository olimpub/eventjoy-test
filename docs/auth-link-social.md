# Social fiók csatolás — `POST /auth/link-social`

Rövid szerződés a **belépett** user Google / Facebook kötéséhez. A UI az Adataim **Csatolt fiókok** kártyáján van.

**Nem** `POST /auth/social-login`. Az beléptet / usert keres-vagy-létrehoz, és új tokent ad. Itt a JWT `UserID`-jéhez kötünk egy providert. A csatolás **belépési mód**, nem profilcsere.

**Két külön út — ne keverd:**

| Hol | Mikor | Végpont |
|---|---|---|
| Login képernyő | **első** (vagy bármely) belépés Google/FB-vel, még nincs session | meglévő `POST /auth/social-login` — find-or-create, új token, név/e-mail a providertől |
| Adataim → Csatolt fiókok | **már belépett** user köt hozzá Gmailt/FB-t | **ez a spec:** `link-social` |

Az első belépés **nem** `link-social`. Apple: **nem most**.

Outbox / SignalR / MailerSend: **nincs**.

---

## 0. Delta — ami változott a mostani `link-social`-hoz képest

A mostani viselkedés **mindig felülírja** a `tblUser` alap e-mailjét és a nemüres nevet. Ezt **vedd ki**.

| | Régi (amit most csináltok) | Új |
|---|---|---|
| Alap `EmailAddress` van | social e-mailre cserélitek, a régit identifierbe mentitek | **ne nyúlj hozzá** |
| Alap `EmailAddress` üres | social e-mail lesz az alap | változatlan — töltsd |
| `FirstName` / `LastName` van | felülírjátok a payloadból | **ne nyúlj hozzá** (mezőnként) |
| `FirstName` / `LastName` üres | töltitek | változatlan — töltsd, ha a payload nem üres |
| Social e-mail | identifier + alap cím | **csak** `tblLoginIdentifier` (type 1), ha még nincs — akkor is, ha az alap cím megmarad |

Google **és** Facebook egyszerre OK (max egy-egy). Unlink változatlan.

---

## 1. Miért külön végpont

| | `social-login` | `link-social` |
|---|---|---|
| Auth | nincs / DeviceId | **kötelező JWT** |
| User | find-or-create a `ProviderId` alapján | **mindig** a token `UserID` |
| Token | új session | **nem** cserél token |
| Profil | új user: név/e-mail a providertől | **csak üres** `tblUser` mezőt tölts; kitöltöttet ne írd felül |
| Ütközés | más useré a ProviderId → belépteti azt | **400**, nincs merge |

A kliens **soha** nem hív `social-login`-t belépve.

---

## 2. Tárolás

Használd **ugyanazt** a social-kötést, amit a `social-login` már ír (`Provider` + `ProviderId` → `UserID`). Ne második táblát.

Egy user × egy provider: max **egy** Google és **egy** Facebook sor. A kettő **egyszerre** élhet.

Üres mező: `NULL`, `''`, vagy csak whitespace. Összehasonlítás e-mailre: trim + case-insensitive.

`tblUser` (Adataim Személyes Adatok) — **fill-if-empty**:

| Oszlop | Van már érték | Üres |
|---|---|---|
| `FirstName` | ne módosítsd | payload `FirstName`, ha az sem üres |
| `LastName` | ne módosítsd | payload `LastName`, ha az sem üres |
| `EmailAddress` | ne módosítsd | payload `EmailAddress` (kötelező a bodyban) |

`tblLoginIdentifier` (Elérhetőségek, type **1 = email**):

A social `EmailAddress`-t **mindig** vedd fel erre a userre, ha még nincs ilyen aktív sora. Ez az alternatív belépési e-mail (OTP Gmailre/FB-mailre). Az alap `tblUser.EmailAddress` ettől független.

- Saját useré már az alap cím vagy azonosító → ne duplikáld.
- **Más** useré az alap cím vagy azonosító → **400** (`Ez az e-mail cím már másik fiókhoz tartozik.`).
- Ne másold az alap e-mailt identifierbe „csatoláskor” — nincs csere, nincs mit megmenteni.

Telefonszám, számlázás, szervezet: **ne nyúlj hozzá**.

Példa: bent van `Kiss Péter` / `peter@ceg.hu` → csatol `anna@gmail.com` (Anna Kovács) → név és alap e-mail **marad** Kiss Péter / peter@ceg.hu; `anna@gmail.com` bekerül az Elérhetőségekbe; SocialLogins-ban Google/FB.

Példa: üres név és e-mail (csak telefonos OTP) → csatol Google → töltsd a `tblUser` FirstName/LastName/EmailAddress-t a payloadból, és a Gmail azonosító is legyen meg.

---

## 3. `GET /user/data` — `SocialLogins`

Változatlan. Dataset: **`SocialLogins`**. Nincs kötés → `[]`.

```json
"SocialLogins": [
  {
    "Provider": "Google",
    "ProviderId": "1183…",
    "EmailAddress": "anna@gmail.com",
    "LinkedAt": "2026-09-04T16:02:11Z"
  }
]
```

A FE a `User` RS-t **nem** várja social-értékekre cserélve, ha a usernek már volt neve/e-mailje.

---

## 4. `POST /auth/link-social`

- **URL:** `POST /api/auth/link-social`
- **Auth:** Bearer JWT — `UserID` **csak** a tokenből.
- **Body:** nyers JSON. **Nincs** `DeviceId` / `DeviceName`.

```json
{
  "Provider": "Google",
  "ProviderId": "118312345678901234567",
  "EmailAddress": "anna@gmail.com",
  "FirstName": "Anna",
  "LastName": "Kovács"
}
```

Facebook: `Provider: "Facebook"`, `ProviderId` = FB `id`.

| Mező | Típus | |
|---|---|---|
| `Provider` | `string` | igen — `Google` vagy `Facebook`. `Apple` → 400 |
| `ProviderId` | `string` | igen — nem üres |
| `EmailAddress` | `string` | igen — érvényes e-mail. Üres → **400** (FB e-mail nélkül nem csatolható) |
| `FirstName` | `string` | nem — csak akkor írd a `tblUser`-re, ha ott üres **és** a payload nem üres |
| `LastName` | `string` | nem — ugyanígy |

Nincs `OverwriteProfile` flag. A szerver **soha** ne írja felül a kitöltött alap nevet/e-mailt, akkor se, ha a kliens küldi a social nevét.

### Sorrend egy tranzakcióban

1. Validáld Provider / ProviderId / EmailAddress.
2. **Ütközés — ProviderId:** `(Provider, ProviderId)` más `UserID`-hez kötve → 400. Ugyanaz a user + ugyanaz a ProviderId → idempotens (kötés megmarad, fill-if-empty + identifier).
3. **Ütközés — e-mail:** a social e-mail más user `EmailAddress`-e vagy más user aktív email-azonosítója → 400. Saját useré OK.
4. **Már van más `ProviderId`** ugyanezen a Provideren → 400: előbb `unlink-social`.
5. INSERT/UPDATE a social-kötést a token `UserID`-jére.
6. `tblUser`: **csak** az üres FirstName / LastName / EmailAddress mezőket töltsd. Kitöltött oszlopot ne tedd a `SET`-be.
7. Social e-mail → `tblLoginIdentifier` type 1, ha ezen a useren még nincs. `ActiveFlg = 1`. **Ne** cseréld az alap e-mailt, **ne** mentsd „a régit” identifierbe ettől a lépéstől.
8. Commit. Válasz: friss User + SocialLogins + LoginIdentifiers.

### Válasz

Siker: `ReturnValue >= 0`. `ReturnDescription`: `Fiók csatolva.` Új JWT **nincs**.

```json
{
  "Result1": { "ReturnValue": 1, "ReturnDescription": "Fiók csatolva." },
  "Result2": {
    "User": { },
    "SocialLogins": [ ],
    "LoginIdentifiers": [ ]
  }
}
```

---

## 5. `POST /auth/unlink-social`

Változatlan. Név és alap e-mail **nem** áll vissza (csatoláskor sem írtuk felül, ha volt adat). LoginIdentifier-eket **ne** töröld.

```json
{ "Provider": "Google" }
```

Utolsó belépési út → 400: `Legalább egy belépési módot hagyj meg (e-mail, telefon vagy másik fiók).`

---

## 6. Hibák

Ugyanaz a boríték: `Result1.ReturnDescription` → toast.

| Helyzet | `ReturnDescription` |
|---|---|
| `Provider` nem Google/Facebook | `Ismeretlen belépési mód.` |
| Hiányzó `ProviderId` | `Hiányzó fiókazonosító.` |
| Hiányzó / érvénytelen `EmailAddress` | `A fiókhoz nincs e-mail cím. Facebooknál engedélyezd az e-mailt.` |
| ProviderId más userhez kötve | `Ez a fiók már másik EventJoy-felhasználóhoz tartozik.` |
| E-mail más useré | `Ez az e-mail cím már másik fiókhoz tartozik.` |
| Már van más `ProviderId` ugyanezen a Provideren | `Már van csatolt Google-fiókod. Előbb válaszd le.` |
| Unlink: nincs kötés | `Nincs csatolt fiók.` |
| Unlink: utolsó belépési út | `Legalább egy belépési módot hagyj meg (e-mail, telefon vagy másik fiók).` |

HTTP: 400 üzleti hiba, 401 token nélkül.

---

## 7. Amit ne csinálj

- Ne hívd a `social-login` ágat ebből a kérésből.
- Ne hozz létre új `tblUser`-t, ne merge-elj.
- Ne adj új tokent, ne írj Device-sort.
- **Ne írd felül** a kitöltött `FirstName` / `LastName` / `EmailAddress` mezőt.
- Ne tedd az alap e-mailt identifierbe „megmentésként” — nincs csere.
- Ne `POST /user/save`.
- Apple: nem most.

---

## 8. `social-login` (nem ez a ticket)

A login képernyő első Google/FB belépése **marad**: find-or-create + név/e-mail a providertől. Ezt a fill-if-empty **ne** keverd oda, ha az egy új, üres user.
