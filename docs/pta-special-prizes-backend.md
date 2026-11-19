# PTA különdíjak — backend teendők (2026-11-18)

Két eseményhez kötött különdíj: **meglepetés** (`surprise`) és **súlyozott sorsolás** (`weighted`). A számítás és a fal a frontenden kész. A díj **neve az eseményé**, nem a közös katalógusé.

A `PTA.tblExtraPrize` egy globális lista (`PrizeID`, `PName`). A `PTA.tblEventPrize` csak `EventID` + `PrizeID`. A mentés ezt a táblát minden alkalommal törli és újraírja, és az audit trigger is erre a párosra van kötve. Ide nem kerül név és nyertes.

## Amit a frontend már küld és olvas

Az esemény mentése (`POST /event/save`) a meglévő `PtaPrizes` mellett ezt is küldi. Üres név kimarad, az a díj az eseményen nincs bekapcsolva.

```json
"PtaSpecialPrizes": [
  { "PrizeKind": "surprise", "PrizeName": "A mezőny meglepetése" },
  { "PrizeKind": "weighted", "PrizeName": "Esélydíj" }
]
```

A `EJ.spSaveEvent` most csak a `$.PtaPrizes[].PrizeID` mezőt olvassa. A `PtaSpecialPrizes` kulcsot a jelenlegi eljárás eldobja, a név nem marad meg.

A fal és a varázsló a `EventSpecialPrizes` nevű eredményhalmazt várja, ezekkel az oszlopokkal: `EventID`, `PrizeKind`, `PrizeName`, `WinnerEventPlayerID`.

Kihirdetéskor, a falra küldés előtt, a frontend ezt hívja:

```json
{
  "EventID": 123,
  "Action": "Pta.SetSpecialPrizeWinner",
  "Payload": {
    "PrizeKind": "weighted",
    "WinnerEventPlayerID": 456
  }
}
```

Amíg az akció nincs a `EJ.spChangeEvent`-ben, a falra a nyertes így is kimehet, a vezérlő pedig jelzi, hogy a nyertes nem került be az eseménybe. Újratöltés után a kalap üres, amíg a nyertes nincs lementve.

---

## 1. Új tábla: `PTA.tblEventSpecialPrize`

Egy eseményen kindonként egy sor. A név és a kihirdetett nyertes ugyanebben a sorban van, így a vetítés újratöltés után ugyanazt a nevet és ugyanazt a játékost mutatja.

```sql
CREATE TABLE [PTA].[tblEventSpecialPrize] (
    [EventSpecialPrizeID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [EventID] INT NOT NULL,
    [PrizeKind] NVARCHAR(16) NOT NULL,
    [PrizeName] NVARCHAR(150) NOT NULL,
    [WinnerEventPlayerID] INT NULL,
    [LastUpdatedUserID] BIGINT NULL,
    [createdAt] DATETIMEOFFSET(0) NOT NULL CONSTRAINT [DF_tblEventSpecialPrize_createdAt] DEFAULT (SYSDATETIMEOFFSET()),
    [updatedAt] DATETIMEOFFSET(0) NOT NULL CONSTRAINT [DF_tblEventSpecialPrize_updatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    CONSTRAINT [UQ_tblEventSpecialPrize_Event_Kind] UNIQUE ([EventID], [PrizeKind]),
    CONSTRAINT [CK_tblEventSpecialPrize_Kind] CHECK ([PrizeKind] IN (N'surprise', N'weighted'))
);
```

`WinnerEventPlayerID` a `PTA.tblEventPlayer.EventPlayerID`. A játékos `EventID`-ja egyezzen a sor `EventID`-jával. Üres `PrizeName` nem kerül be: az a kind az eseményen ki van kapcsolva.

## 2. Mentés: `EJ.spSaveEvent`

A PTA ágban, a `tblEventPrize` újraírása mellett, a neveket merge-ölni kell. A nyertes a mentéstől megmarad.

1. Olvasd a `$.PtaSpecialPrizes` tömböt: `PrizeKind`, `PrizeName`.
2. Csak `surprise` és `weighted` kind, levágott név, üres név kimarad.
3. Meglévő sor, ami a payloadban is benne van: `PrizeName` és `updatedAt` frissül, `WinnerEventPlayerID` marad.
4. Payloadban lévő, táblában hiányzó kind: új sor, `WinnerEventPlayerID` NULL.
5. Táblában lévő kind, ami a payloadból hiányzik: a sor törlődik (a díjat levették az eseményről).

A `PTA.tblEventPrize` katalógus-kapcsolata változatlan marad.

## 3. Olvasás

`EJ.spGetEventUserDataSheet`: új eredmény a listában, neve `EventSpecialPrizes`.

```sql
SELECT EventID, PrizeKind, PrizeName, WinnerEventPlayerID
FROM [PTA].[tblEventSpecialPrize]
WHERE EventID = @EventID;
```

A mostani lista 11-es tétele az `EventPrizes`. Az új halmaz mehet a 11-es után. A szervezői és a játékos adatlap is kapja meg, a fal szervezői vezérlője innen tölti a neveket.

`PTA.spGetEventDisplayData` (ezt hívja a `GET /pta/display/{eventId}`): ugyanilyen `EventSpecialPrizes` halmaz. A kivetítő innen írja ki a díj nevét. A halmaz sorszámát vedd fel a `@Results` listába is, a többi named dataset mellé.

## 4. Akció: `Pta.SetSpecialPrizeWinner`

Helye: `EJ.spChangeEvent`.

- `PrizeKind` csak `surprise` vagy `weighted`.
- A sor már létezzen ennél az eseménynél. Név nélküli díjra nem lehet nyertest írni.
- `WinnerEventPlayerID` ennek az eseménynek aktív játékosa legyen.
- Frissítés: `WinnerEventPlayerID`, `updatedAt`, `LastUpdatedUserID`.
- A nyertes felülírható, ha a szervező újra kihirdet. A frontend a már tárolt sorsolás-nyertest újra kihirdeti, új kártyát nem húz.

SignalR: a fal a nyertest a meglévő `Pta.ShowDisplay` állapotból kapja (`State = prize`, `GroupKey = surprise|weighted`, `RoundId = WinnerEventPlayerID`). Ehhez az akcióhoz elég, ha a szervezői adatlap a következő betöltéskor látja a sort. Ha ping megy, az a `event_{id}_gamer` csoport legyen, a `Pta.SeatFinal` mintájára. A 898. sor körüli visszhang-listába ez az akció nem kötelező.

## 5. Elfogadás

- Az esemény mentése után a két név visszajön az adatlapon, és a varázsló a mezőkbe tölti.
- Üresen hagyott kind sora nincs, a vetítés vezérlőjén az a gomb nem látszik.
- Kihirdetés / húzás után `WinnerEventPlayerID` ki van töltve. A vezérlő újratöltése ugyanazt a játékost teszi ki, új sorsolás nélkül.
- Másik esemény nevei és nyertesei érintetlenek.
- A `PTA.tblExtraPrize` / `PTA.tblEventPrize` tartalma ettől a két mezőtől független marad.
