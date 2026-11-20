# Játékos csoportosítás szerkesztése

A szervező a Résztvevők listán, a játékos **Adatok szerkesztése** lapján átírja a bekapcsolt csoportosítást (Szervezet, Csapat, Régió, Cég). A mezők a `PTA.tblEventPlayer` soron vannak.

Új akció: `EJ.spChangeEvent`, `Pta.SetPlayerGrouping`.

```json
{
  "EventID": 123,
  "Action": "Pta.SetPlayerGrouping",
  "Payload": {
    "EventUserID": 456,
    "RegionName": "Budapest"
  }
}
```

A frontend csak a bekapcsolt mezőket küldi: `OrganizationName`, `TeamName`, `RegionName`, `CompanyName`.

Szabályok:

- Csak a szervező hívhatja.
- A cél aktív játékos (`RoleTypeID = 3`) ezen az eseményen. Szervező és játékmester nem kap csoportot.
- A `PTA.tblEventSettings` flagjei döntenek. Kikapcsolt mező `NULL` lesz. Bekapcsolt mező kötelező, üresen `Hiányzó …`.
- Ha a játékosnak már van `tblEventPlayer` sora, az frissül, az ülése és a pontja megmarad.
- Ha még nincs sora, új sor jön létre `ScoreCountFlg = 1` értékkel. Második sor ugyanarra az `EventUserID`-ra nem keletkezik.
- SignalR: a meglévő `event_{id}` csoportok kapják a payloadot, hogy a lista és a kivetítő frissüljön.
