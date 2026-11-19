# PTA pontszámítás — backend teendők (2026-11-18)

Egy játékos leülhet és játszhat úgy, hogy a pontja nem kerül az állásba. Ehhez a `PTA.tblEventPlayer` táblára kell egy szerkeszthető flag. Új szerep nem kell.

A flag neve: **Pontot kap** (`ScoreCountFlg`). Alapértéke igaz. A meglévő játékosok viselkedése ettől nem változik.

Az asztali eredmény megmarad: ülés, összeg, kamion, helyezés, `ResultPoint`. Ezek kellenek a többi játékos asztali sorrendjéhez. A flag csak az összesítést kapcsolja ki.

## Szabály

1. `ScoreCountFlg = 1`: a játékos szerepel a fordulóállásban, az összesített állásban, a csoportállásban, a dobogón, a döntőbe jutásban és a különdíjakban. A pontja hozzáadódik az egyéni és a csoportos összeghez.
2. `ScoreCountFlg = 0`: ugyanezeken a listákon nincs rajta, és a pontja nem adódik hozzá. Az asztali lapján és a saját játékoslapján az ülés és a fordulós eredmény megmarad.
3. A publikált mezők nála üresek: `FinalPoint`, `FinalTruckPoint`, `FinalPosition` mind `NULL`.
4. A `GET` továbbra is visszaadja a játékost és a `tblGameSchedule` sorait. A lista szűrése a frontenden történik, a flag alapján. A szerver nem hagyja ki a játékost az `EventPlayers` és a `GameSchedules` eredményből.

---

## 1. Oszlop

```sql
ALTER TABLE [PTA].[tblEventPlayer]
ADD [ScoreCountFlg] BIT NOT NULL
    CONSTRAINT [DF_tblEventPlayer_ScoreCountFlg] DEFAULT (1);
```

A meglévő sorok a default miatt `1` értéket kapnak.

## 2. Olvasás

`EJ.spGetEventUserDataSheet` az `EventPlayers` halmazt `SELECT *` lekérdezéssel adja. Az új oszlop ettől megjelenik, a result listát nem kell bővíteni.

`PTA.spGetEventDisplayData` az `EventPlayers` halmazt oszloplistával adja (`EventPlayerID`, `EventID`, `EventUserID`, `NickName AS Name`, csoportnevek, `FirstName`, `LastName`). Ide be kell tenni a `ep.ScoreCountFlg` mezőt. A kivetítő állása különben nem tudja kihagyni a játékost.

## 3. Új akció: `Pta.SetScoreCount`

Helye: `EJ.spChangeEvent`.

A frontend ezt küldi:

```json
{
  "EventID": 123,
  "Action": "Pta.SetScoreCount",
  "Payload": {
    "EventPlayerID": 456,
    "ScoreCountFlg": false
  }
}
```

Szabályok:

- Csak az esemény szervezője hívhatja (`RoleTypeID = 1`).
- Az `EventPlayerID` ehhez az `EventID`-hoz tartozik, és `ActiveFlg = 1`.
- `ScoreCountFlg` kötelező bit.
- Frissítés: `ScoreCountFlg`, `updatedAt`, `LastUpdatedUserID`.
- Az ülést, a `tblGameSchedule` sorokat és a többi játékost nem módosítja.
- Ha a flag `0` lesz, ugyanebben az akcióban a játékos `FinalPoint`, `FinalTruckPoint` és `FinalPosition` értéke `NULL`. Ha `1` lesz, ezeket az akció nem számolja újra; a következő `Pta.CloseRound` vagy `Pta.PublishRound` tölti vissza.

SignalR: a `event_{id}_gamer` csoport kapjon pinget, hogy az állás és a kivetítő újratöltse a játékosokat.

## 4. `Pta.ReplaceDraw` vigye tovább a flaget

A `ReplaceDraw` törli az esemény `tblEventPlayer` sorait, majd újra beszúrja őket. A beszúrás most nem olvas `ScoreCountFlg` mezőt.

A törlés előtt mentsd el a régi értéket `EventUserID` szerint. Beszúráskor:

1. Ha a `$.Payload.Players[]` elemben van `ScoreCountFlg`, az az érték kerül be.
2. Ha nincs a payloadban, a törlés előtti érték marad ennél az `EventUserID`-nál.
3. Ha nincs régi sor sem, az érték `1`.

A payload mező bit. A frontend a játékos objektumon `ScoreCountFlg` néven küldi, a többi játékosmező mellett (`EventUserID`, `Name`, `TeamName`, `CompanyName`, `OrganizationName`, `RegionName`, `ActiveFlg`).

## 5. `Pta.CloseRound` és `Pta.PublishRound`

A mostani aggregáció minden aktív játékos `ResultPoint` és `Amount` összegét beírja a `FinalPoint` és `FinalTruckPoint` mezőbe. Döntős játéktípusnál a döntő forduló továbbra is kimarad ebből az összegből, a négy döntős publikált pontja `NULL`, a `FinalPosition` az asztali helyezés.

Egészítsd ki mindkét ágat:

- `ScoreCountFlg = 0` játékosnál `FinalPoint = NULL`, `FinalTruckPoint = NULL`, `FinalPosition = NULL`.
- A döntős ág se írjon nekik `FinalPosition` értéket, akkor sem, ha a döntő asztalon ülnek.
- `ScoreCountFlg = 1` játékosnál a mostani összegzés marad.

A `tblGameSchedule` sorait ez az ág ne törölje és ne módosítsa.

## 6. Elfogadás

- Új és régi játékos `ScoreCountFlg` értéke `1`, amíg a szervező nem kapcsolja ki.
- `Pta.SetScoreCount` hamisra állítja a flaget, a játékos ülése és asztali eredménye megmarad, a három publikált mező `NULL`.
- Újrasorsolás után ugyanannál az `EventUserID`-nál a flag a kikapcsolt értéken marad.
- `CloseRound` és `PublishRound` a kikapcsolt játékosnak nem ír vissza összpontot vagy helyezést.
- Az `EventPlayers` és a `GameSchedules` halmaz továbbra is tartalmazza a játékost. A display halmazban ott a `ScoreCountFlg`.
- Másik esemény játékosai érintetlenek.
