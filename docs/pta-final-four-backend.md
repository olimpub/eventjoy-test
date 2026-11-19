# PTA négyes döntő — backend teendők (2026-11-18)

Új játéktípus: **3 közös forduló + egy 4 fős döntő**. A frontend elkészült. A meglévő játéktípusok viselkedése nem változik. Döntő csak akkor van, ha a törzsadatban egy forduló `FinalRoundFlg` értéke igaz.

A sorsolást továbbra is a frontend számolja, és a `Pta.ReplaceDraw` menti. A döntő leültetése **nem** mehet `ReplaceDraw`-val: az az akció letörli a lejátszott fordulókat és az eredményeket.

## Szabály, amit a frontend már követ

1. Az első sorsolás csak a közös fordulókat ülteti le. A döntő forduló egy üres asztallal jön létre, játékos nélkül.
2. Ha az előző fordulók minden asztala le van zárva, a szervező a Játék oldalon elindítja a döntő sorsolását. A TOP 4 a frontend eldöntő lánca szerint ül le. A szerver a négy kapott játékost menti, a sorrendet nem számolja újra.
3. Színek a helyezés szerint: 1. piros, 2. kék, 3. sárga, 4. zöld.
4. A döntő asztal pontozása ugyanaz, mint egy rendes asztalé (összeg, kamion, helyezési pont).
5. A végeredményen az 1–4. hely a döntő asztal sorrendje, **pont, összeg és kamion nélkül**. Az 5. helytől a három forduló állása látszik, pontokkal. A döntő pontja se az egyéni, se a csoportos összesítésbe nem számít bele.

A „Döntő sorsolása” gomb a `Pta.SeatFinal` akciót hívja. Amíg ez nincs az API-n, a gomb hibát jelez, és nem hagy bent helyi ülést.

---

## 1. Törzsadat

Nincs séma-változás. Az oszlopok megvannak: `PTA.tblGameType`, `PTA.tblGameTypeRounds` (`QualifyToNextRound`, `FinalRoundFlg`).

Új játéktípus, négy forduló:

| OrderIndex | RName | QualifyToNextRound | FinalRoundFlg |
|---|---|---|---|
| 1 | 1. forduló | NULL | 0 |
| 2 | 2. forduló | NULL | 0 |
| 3 | 3. forduló | 4 | 0 |
| 4 | Döntő | NULL | 1 |

A `RoundID` marad a kapcsolat az esemény fordulója (`PTA.tblEventRound.RoundID`) és a sablon között. Az eseményforduló táblára nem kell `FinalRoundFlg` oszlop.

---

## 2. Új akció: `Pta.SeatFinal`

Helye: `EJ.spChangeEvent`, a `Pta.ReplaceDraw` mellett.

A frontend ezt küldi:

```json
{
  "EventID": 40,
  "Action": "Pta.SeatFinal",
  "Payload": {
    "EventRoundID": 12,
    "EventRoundDeskID": 80,
    "Seats": [
      { "PlayerID": 101, "ColorHex": "#FF6060", "ColorIndex": 0, "SeatNo": 1 },
      { "PlayerID": 102, "ColorHex": "#2AA9FF", "ColorIndex": 2, "SeatNo": 2 },
      { "PlayerID": 103, "ColorHex": "#F2E74B", "ColorIndex": 3, "SeatNo": 3 },
      { "PlayerID": 104, "ColorHex": "#28C76F", "ColorIndex": 1, "SeatNo": 4 }
    ]
  }
}
```

A `PlayerID` az `EventPlayerID`. A `ColorIndex` a meglévő színsorrend indexe, nem a megjelenítési sorrend:

| ColorIndex | Szín | ColorHex |
|---|---|---|
| 0 | piros | `#FF6060` |
| 1 | zöld | `#28C76F` |
| 2 | kék | `#2AA9FF` |
| 3 | sárga | `#F2E74B` |

A `SeatNo` 1–4, a döntő helyezési sorrendje ültetéskor (1. piros … 4. zöld). Az eredményfelvitel később felülírhatja a `Position` mezőt.

### Elfogadás

- A `EventRoundID` ehhez az `EventID`-hez tartozik, és a sablonja (`RoundID` → `tblGameTypeRounds`) `FinalRoundFlg = 1`.
- Az `EventRoundDeskID` ehhez a fordulóhoz tartozik.
- Az asztalon még nincs ülés és nincs eredmény.
- Pontosan 4 különböző `EventPlayerID` érkezik, mind az esemény játékosa.
- Az előző fordulók le vannak zárva.

Ha bármelyik feltétel nem áll, a megszokott change-hiba menjen vissza, és ne legyen részleges insert.

### Mentés

Négy sor a `PTA.tblGameSchedule` táblába:

- `EventRoundDeskID`, `PlayerID`, `PlayColorHex` = `ColorHex`, `SeatNo`, `ActiveFlg = 1`
- `Amount`, `OnTrack`, `Position`, `ResultPoint` maradjon üres

Mást ne töröljön és ne írjon felül. A lejátszott fordulók, asztalok és eredmények maradjanak.

### SignalR

Sikeres mentés után a `Pta.SeatFinal` menjen ki az `event_{EventID}_gamer` csoportra. Elég egy ping (`Action` + `EventID`): a kliens ettől újratölti az adatlapot. Ha snapshotot küld, a négy új schedule sor legyen benne. A szabálytábla ne küldje ki még egyszer ugyanazt.

---

## 3. `Pta.CloseRound` és `Pta.PublishRound`

Ma mindkét akció minden ülés `ResultPoint`ját összeadja a `FinalPoint`ba, az `Amount`ot a `FinalTruckPoint`ba, és a `FinalPosition`t nem írja.

Ezen a játéktípuson (van `FinalRoundFlg = 1` forduló az eseményen) másképp kell:

- A döntő forduló `ResultPoint`ja **senkinek** nem adódik hozzá a `FinalPoint`hoz. A `FinalTruckPoint` se a döntő összegéből vagy kamionjából álljon.
- Ha a döntő még nincs publikálva, a többiek `FinalPoint`ja csak az elődöntő fordulók pontja. A `FinalPosition`t a frontend számolja, a szervernek nem kell.
- Ha a döntő publikálva van, és mind a négy ülésnek van `Position` értéke:
  - a négy döntős `FinalPoint` és `FinalTruckPoint` értéke `NULL`;
  - a `FinalPosition` az asztali `Position` (1–4);
  - a kiesettek `FinalPoint`ja csak az első három forduló pontja. A `FinalPosition` 5-től a frontend állása. Ezt a szervernek nem kell újraszámolnia.

A privát `PublishRound` üzenet (játékos `event_{id}_user_{EventUserID}` csatornája) a döntősnél ezt küldje:

```json
{
  "EventID": 40,
  "Action": "Pta.PublishRound",
  "Payload": {
    "EventRoundID": 12,
    "ToStatusID": 5,
    "Seat": {
      "PlayerID": 101,
      "EventRoundDeskID": 80,
      "Amount": 42,
      "OnTrack": 3,
      "Position": 1,
      "ResultPoint": 50
    },
    "Player": {
      "EventPlayerID": 101,
      "FinalPoint": null,
      "FinalTruckPoint": null,
      "FinalPosition": 1
    }
  }
}
```

A `Seat` a döntő asztal saját sora marad (a játékmester ezt látja). A bajnoki szám a `Player`: döntősnél nincs pont, csak helyezés.

A másik játéktípusokon az aggregálás maradjon a mostani: minden forduló pontja összeadódik.
