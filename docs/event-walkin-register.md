# Helyszíni / kézi felvétel — `POST /event/invite/walkin`

A Résztvevők lista **+** gombja. Szervező visz fel egy **játékost**. **Meghívó e-mail mindig kimegy** (Outbox / MailerSend, mint az Excel import).

A frontend már ezt a szerződést hívja. Siker után GET `/event/userdata/:id`.

---

## Excel import vs walk-in

| | Excel import | Walk-in (`+`) |
|---|---|---|
| Szerepkör / jegy | Excel oszlop | backend: **Játékos** + játékos jegy |
| Mail | igen | **igen** (kötelező e-mail) |
| Invitation | igen | **igen** |
| Csoportosítás | játékosnál kötelező, flag szerint | **ugyanaz** (walk-in mindig játékos) |
| EventUser státusz | flow start (Meghívott / Megerősítésre vár) | **esemény státuszától függ** (lásd alább) |

Ne hívd az import procot egyelemű tömbbel — a státusz-szabály más. A mailer / Invitation / grouping mintája **lehet közös**.

---

## EventUser státusz

Az **esemény** `EventStatus` dönt, nem a kliens. **Ne** fogadj `ToStatusID`-t a body-ból.

| Esemény státusz | EventUser státusz |
|---|---|
| Tervezés, Szervezés, Jelentkezés (Bejelentkezés **előtt**) | **Megerősítésre vár** — ugyanaz, mint az Excel import startja (`NeedUserApproval` / név: Megerősítésre vár). Alias oké, ha a törzsben Meghívott a start és a NeedUserApprovalFlg be van. A FE a chipen a GET nevét mutatja. |
| Bejelentkezés **vagy később** (sorsolás, játék, lezárás, …) | **Belépett** (alias: Bejelentkezett / Check-in) |

Szabály: ha az EventStatus a folyamatban **Bejelentkezés vagy utána** van → Belépett; különben Megerősítésre vár. Névtöredék: `bejelentkez`, plusz a flow sorrend (ugyanaz a logika, mint `eventStatusReachedCheckIn` a FE-n). **Ne** hardkódold a státusz id-t.

`PrevEventUserStatusID = null`.

---

## `POST /event/invite/walkin`

Auth: Bearer, **szervező** az `EventID`-n. Játékmester **403**.

```json
{
  "EventID": 40,
  "LastName": "Kovács",
  "FirstName": "Anna",
  "Email": "anna@example.com",
  "Phone": "+36301234567",
  "OrganizationName": "EventJoy",
  "TeamName": "Alfa",
  "RegionName": "Nyugat",
  "CompanyName": "Acme Kft."
}
```

HU alias: `Vezetéknév` / `Családnév` → `LastName`, `Keresztnév` → `FirstName`, `Email-cím` → `Email`, `Telefonszám` → `Phone`, `Szervezet` → `OrganizationName`, `Csapat` → `TeamName`, `Régió` → `RegionName`, `Cég` → `CompanyName`.

Üres string = nincs. A FE trimeli, telefonból kiszedi a szóközt.

Kikapcsolt grouping-flag mezőjét **dobd el**. Bekapcsolt flag mezője a JSON-ban kötelező.

### Validáció

1. `EventID` létezik, `ActiveFlg = 1`.
2. `LastName`, `FirstName` nem üres.
3. **`Email` kötelező**, érvényes e-mail. 400 `Add meg az e-mail címet.` / `Érvénytelen e-mail cím.`
4. `Phone` opcionális. Ha ki van töltve: HU szám (`+36` / `06`). 400 `Érvénytelen telefonszám.`
5. EventSettings négy flagje. Bekapcsolt flag + üres érték → 400 `Hiányzó Csapat` (stb.), mint az import **játékos** sora. Walk-in mindig játékos, nincs JM/szervező kivétel.
6. Kapacitás: `Capacity > 0` és az aktív (nem elutasított / lemondott) létszám `>= Capacity` → 400 `A létszám betelt.`
7. Duplikátum ugyanazon az eseményen, aktív soron:
   - normalizált **e-mail** egyezik, **vagy**
   - kitöltött telefon egyezik
   → 409 `Ez a résztvevő már szerepel a listán.` Opcionális `EventUserID`. Ne hozz létre másodikat.

### Mentés

1. **UserID:** User az e-mailre, különben telefonra, különben `null`. **Ne** hozz létre új `tblUser`-t, **ne** küldj OTP-t.
2. **EventRoleID:** az esemény Játékos szerepe. Ha nincs → 400 `Nincs játékos szerepkör az eseményen.`
3. **EventTicketID:** ehhez a szerephez tartozó jegy (díjmentes előnyben). Nincs jegy → `null`.
4. **EventUserStatusID:** fenti tábla (Megerősítésre vár vs Belépett).
5. **EventUserUID:** új GUID.
6. Nevek / e-mail / telefon: `LastName`, `FirstName`, `EmailAddress`, `PhoneNumber` az EventUser / EventParticpants GET-re.
7. **Invitation:** hozz létre (mailerhez), ActiveFlg = 1.
8. **Outbox / MailerSend:** **mindig** küldj meghívót, akkor is, ha a státusz Belépett (helyszíni: kapja a jegy/QR infót).
9. PTA grouping: mentés EventUser és/vagy EventPlayer szövegmezőkre, mint az import. Bekapcsolt flag értéke kötelező.
10. Invoice: nincs. Fizetős jegy is felvehető walk-innel.

### Válasz (200)

```json
{
  "ReturnValue": 0,
  "ReturnDescription": "Résztvevő felvéve, meghívó elküldve.",
  "EventUserID": 321
}
```

### Hibák

| HTTP | Mikor |
|---|---|
| 400 | validáció / grouping / nincs játékos szerep / betelt |
| 403 | nem szervező |
| 409 | már a listán |

### SignalR

Opcionális `event_{id}_organizer`. A hívó FE GET-el.

---

## Nem ebben a körben

- Jegy- vagy szerepválasztó (mindig játékos)
- Vendég → User fiók merge
- Fizetés / számla
