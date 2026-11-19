# Meghívó import — egy ember több szerepkörben (2026-11-19)

Az Excel-importnak ugyanazt az e-mail címet több szerepkörben is fel kell tudnia venni ugyanarra az eseményre. Példa: valaki már Résztvevő, és ugyanazzal a címmel Játékmesterként is importálni kell.

A frontend a fájlt változatlanul küldi a `POST /event/import` (vagy a meglévő import végpont) felé. Új mező nincs. A szerepkör továbbra is a sor `Szerepkör` mezője.

## Mostani hiba

`EJ.spImportInvitations` a mentés előtt minden sort elutasít, ha az e-mailnek már van bármilyen `EJ.tblEventUser` sora az eseményen:

```sql
UPDATE i
SET ResultMsg = CONCAT(ISNULL(i.ResultMsg + '; ', ''), N'Már résztvevő')
FROM #Invitations i
INNER JOIN [EJ].[tblUser] u ON LOWER(LTRIM(RTRIM(i.Email))) = LOWER(LTRIM(RTRIM(u.EmailAddress)))
INNER JOIN [EJ].[tblEventUser] eu ON eu.UserID = u.id AND eu.EventID = @EventID;
```

Ez a szerepkört nem nézi. Egy ilyen sor miatt az egész fájl `ReturnValue = -1` választ kap, a többi sor sem mentődik.

A lentebbi `MERGE` már szerepkörre illeszt (`EventID` + `UserID` + `EventRoleID`). Azt a feltételt nem kell megváltoztatni. Csak a felette lévő „Már résztvevő” ellenőrzést kell ugyanerre szűkíteni.

## Elvárt szabály

1. Ugyanaz az e-mail, másik szerepkör: új `tblEventUser` sor, a fájl többi sora is mehet.
2. Ugyanaz az e-mail, ugyanaz a szerepkör, és a meglévő sor `ActiveFlg = 1`: nem hiba. Nem keletkezik második `tblEventUser`. A meglévő `MERGE` `WHEN MATCHED` ága frissíti a jegyet. A `PTA.tblEventPlayer` `WHEN MATCHED` ága felülírja a csoportosítást: `OrganizationName`, `TeamName`, `CompanyName`, `RegionName`. Meghívó e-mail nem megy ki, a `ValidationCode` és a lejárata nem cserélődik.
3. Ugyanaz az e-mail, ugyanaz a szerepkör, de a meglévő sor inaktív: nem hiba. A `MERGE` aktiválja (`ActiveFlg = 1`), frissíti a jegyet és a csoportosítást.
4. A fájlban ugyanaz az e-mail ugyanabban a szerepkörben többször szerepel: az első sor mehet, a továbbiak hibásak, üzenet: `Már ebben a szerepkörben szerepel a fájlban`.
5. A szerepkör a sor feloldott `EventRoleID`-ja. Két különböző szerepnév két különböző `EventRoleID`.

A „Már résztvevő” és a „Már ebben a szerepkörben szerepel” ellenőrzés a már bent lévő aktív sorra kikerül. A fájlon belüli ismétlődés továbbra is megállítja a batch mentését. A kikapcsolt csoportosítás továbbra is nullázódik a mentés előtt (`RegionGrpFlg = 0` esetén a régió üres marad).

## Csere az eljárásban

A „Már résztvevő” `UPDATE` törlendő. Helyette csak a fájlon belüli ismétlődés marad, a szerepkör és a jegy feloldása után, a hibariport előtt:

```sql
;WITH RoleDup AS (
    SELECT
        RowID,
        ROW_NUMBER() OVER (PARTITION BY Email, EventRoleID ORDER BY RowID) AS rn
    FROM #Invitations
    WHERE Email IS NOT NULL
      AND EventRoleID IS NOT NULL
)
UPDATE i
SET ResultMsg = CONCAT(ISNULL(i.ResultMsg + '; ', ''), N'Már ebben a szerepkörben szerepel a fájlban')
FROM #Invitations i
INNER JOIN RoleDup d ON d.RowID = i.RowID
WHERE d.rn > 1;
```

A `ValidationCode` frissítés csak az újonnan beszúrt `tblEventUser` sorok felhasználóira fusson, ne a már bent lévőkre. A meghívó e-mail maradjon a mostani szabályon: csak `MERGE` `INSERT`.

A `PTA.tblEventPlayer` ág marad. Csak `RoleTypeID = 3` kap játékos sort. Ha a játékoslap már megvan ehhez az `EventUserID`-hoz, a `WHEN MATCHED` ág írja a régiót és a többi csoportosítást. A másik szerepkörös sor ettől nem írja felül a résztvevő játékoslapját.

## Elfogadás

1. Anna már Résztvevő. A fájlban Anna Játékmester. Az import sikerül, Anna két `tblEventUser` sort kap.
2. Anna már Résztvevő, a régiója üres. A fájlban Anna megint Résztvevő, Régió = Budapest, és a régió csoportosítás be van kapcsolva. Az import sikerül, Anna `tblEventPlayer.RegionName` értéke Budapest lesz. Második `tblEventUser` nem keletkezik, e-mail nem megy ki, a belépőkódja megmarad.
3. Anna Résztvevő sora inaktív. Ugyanebben a szerepkörben újraimportálva a sor aktív lesz, a csoportosítása frissül, új user nem keletkezik.
4. Egy fájlban Anna kétszer szerepel Játékmesterként. A második sor `Már ebben a szerepkörben szerepel a fájlban`.
5. Egy fájlban Anna Résztvevő és Játékmester is, és egyik sincs még az eseményen. Mindkét sor létrejön.
