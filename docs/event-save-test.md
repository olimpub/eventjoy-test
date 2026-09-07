# Tesztlista — `POST /event/save`

Végigmegyős checklist a varázsló mentésre. A `POST /event/change` **nincs** bekötve — státuszléptetés, meghívó Elfogadom, scan Belépett, PTA sorsolás most dummy, azt ne keverd bele.

---

## Előkészület

- [x] Belépés (JWT kell)
- [x] Network: `POST /event/save` → `GET /event/data` → adatlap
- [x] Válaszban legyen `EventID` (`ReturnValue: 1`, `EventID: …`)

---

## 1. Eseményeim (`/my-events`)

Új esemény gomb → varázsló.

Létrehozás után:

- [x] A varázsló bezár
- [x] Nem a publikus `/event/:id` kártyán landolsz, hanem a **szervezői adatlapon**
  - sima: `/event/{id}/manage`
  - PTA: `/profitability/event/{id}/manage`
- [x] Az új esemény megjelenik az Eseményeim listán (GET után)

---



## 2. Varázsló — sima típus (nem PTA)


| Lépés            | Mit nézz                                                                                      | OK  |
| ---------------- | --------------------------------------------------------------------------------------------- | --- |
| **Típus**        | Kategória + típus kiválasztás                                                                 | [ ] |
| **Alapadatok**   | Cím, dátum/idő, helyszín *vagy* online URL. Többnapos: záró dátum                             | [ ] |
| **Korlátozások** | Legalább 1 szerepkör (nem szervező is kell jegyhez). Publikus/privát, létszám, kapcsolattartó | [ ] |
| **Jegyek**       | Új jegy: **reg. kezdet = most**, **reg. vége = esemény záró dátum+idő**. Legalább 1 kész jegy | [ ] |
| **Adatlap**      | Csak ha a típusnak van extra sheet — placeholder OK                                           | [ ] |


Kész:

- [x] Toast: „Esemény létrehozva”
- [x] Hiba: toast a `ReturnDescription`-nel, varázsló nyitva marad

---



## 3. Varázsló — PTA

Ugyanaz, plusz:


| Lépés            | Mit nézz                                                                                                                                 | OK  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **Típus**        | PTA típus                                                                                                                                | [ ] |
| **Korlátozások** | Automatikusan **Játékos, Játékmester, Szervező**                                                                                         | [ ] |
| **Beállítások**  | Játéktípus, párosítás, pontok, extra díj ha be van kapcsolva                                                                             | [ ] |
| **Jegyek**       | Automatikusan 2 díjmentes: **Játékos → Játékos**, **Játékmester → Játékmester**. Szervezőhöz nincs jegy. Reg. ablak: most → esemény vége | [ ] |


Kész:

- [x] PTA szervezői adatlap (`/profitability/event/{id}/manage`)
- [x] Cím, dátum, szerepek, jegyek stimmelnek

---



## 4. Szervezői adatlap — sima (`/event/:id/manage`)

- [x] Create után ez a landolás, kitöltött fejléccel
- [ ] **Szerkesztés** → varázsló `edit`, típus/dátum/jegyek betöltve
- [ ] Mentés: státusz **nem** megy vissza Tervezésre
- [ ] Maradsz az adatlapon, adatok frissülnek (nem új create)
- [ ] **Résztvevők** / **Jegykezelés** (scan) — EventUser/jegy a GET-ből jön

---



## 5. Szervezői adatlap — PTA (`/profitability/event/:id/manage`)

Ugyanaz, plusz PTA beállítások a szerkesztőben.

- [ ] Szerkesztés nem törli / nem duplázza a 3 szerepet és a 2 jegyet

---



## 6. Résztvevők

- sima: `/event/:id/manage/participants`
- PTA: `/profitability/event/:id/participants`

- [ ] A szervező ott van (save utáni EventUser)
- [ ] Excel meghívó (ha az import végpont él): sablon + feltöltés + toast a backend szövegével

---



## 7. Közös felületek (save után, új EventID-vel)


| Képernyő                           | Mit nézz                                                         | OK  |
| ---------------------------------- | ---------------------------------------------------------------- | --- |
| **Főoldal / feed**                 | Az esemény megjelenik, ha publikus                               | [ ] |
| **Eseményeim**                     | Szerepel a listán, kártyáról vissza az adatlapra                 | [ ] |
| **Esemény részletek** `/event/:id` | Cím, dátum, helyszín; szervezőként a jegy/QR ha van EventUserUID | [ ] |
| **Profil / kijelentkezés–belépés** | Az esemény megmarad (nem csak Pinia)                             | [ ] |


---



## 8. Hibák / szélek

- [ ] Token nélkül: 401, nem „mentve” toast
- [ ] Hiányzó kötelező mező: a varázsló nem enged tovább
- [ ] Online esemény: `Location: null`, URL megvan
- [ ] Új helyszín: a GET-ben ott a location, az adatlapon a cím
- [ ] Jegy reg. kezdete nem az esemény napja 00:00

---



## Most ne ezt

- Eseménystátusz léptetés
- Meghívó Elfogadom / Elutasítom
- Scan → Belépett
- PTA sorsolás / pontozás / asztalfoglalás

Ezek a `POST /event/change` kör. Még dummy.

---



## Ajánlott sorrend

1. Sima create → adatlap → szerkesztés
2. PTA create ugyanígy
3. Résztvevők + közös felületek
4. Hibák / szélek

