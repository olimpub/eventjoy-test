# Excel meghívó import — csoportosítás (backend)

Rövid szerződés a `POST /event/invite/import` bővítéséhez. A sablont **a frontend generálja**; a procnak nem kell xlsx-et adnia.

A mag (minden esemény, PTA is) változatlan: `Vezetéknév`, `Keresztnév`, `Email-cím`, `Telefonszám`, `Szerepkör`, `Jegy`. Extra oszlopok **csak PTA-n**, a `tblEventSettings` négy flagje szerint.

---

## Extra mezők

| Flag | Excel fejléc | JSON a `Invitations[]` soron |
|---|---|---|
| `OrganizationGrpFlg` | Szervezet | `OrganizationName` |
| `TeamGrpFlg` | Csapat | `TeamName` |
| `RegionGrpFlg` | Régió | `RegionName` |
| `CompanyGrpFlg` | Cég | `CompanyName` |

Kikapcsolt flag → **nincs oszlop** a sablonban, a JSON-ban sem kell. 0–4 extra mező.

`OrganizationName` **szabad szöveg**. Nincs `tblOrganization` lookup, nincs `OrganizationID`.

---

## `POST /event/invite/import`

Body mint eddig: `{ EventID, Invitations[] }`. A core kulcsok magyarok maradnak. A grouping kulcsok angolok (fenti tábla). HU alias a groupingre opcionális (`Szervezet` → `OrganizationName`).

1. Olvasd az `EventID` EventSettings négy flagjét.
2. Bekapcsolt flag + üres / hiányzó érték → **csak játékos** sornál **400-as hibasor** (`Szerepkör` vagy `Jegy` = Játékos). `ResultMsg` pl. `Hiányzó Csapat`. Játékmester és Szervező soron a grouping mezőket **ne követeled** (nincs csapatuk) — akkor se, ha a másik oszlopban játékos jegy/szerep szerepel.
3. Kikapcsolt flag: a mezőt **dobd el**, akkor se mentsd, ha a kliens elküldte.
4. Mentés: szöveg az `EventUser` és/vagy `EventPlayer` mezőkre. A GET `/event/userdata` már ezeket olvassa: `TeamName`, `CompanyName`, `OrganizationName`, `RegionName`.
5. Válasz: sikeres count / 400 soronkénti hiba — mint most.

A frontend parse-olja a fejléc **neve** alapján (nem oszlopindex). Ismeretlen extra oszlopot figyelmen kívül hagy. Hiányzó grouping-oszlop a fájlban **nem** blokkolja a feltöltést. Üres / hiányzó Csapat/Szervezet/Régió/Cég cellát **csak játékos** sornál jelez (Szerepkör vagy Jegy = Játékos); szervező és játékmester soron nem. A backend ugyanígy validáljon.

Ha a szervező később kapcsol be egy flaget: új sablon, új import. A régi sorokon az új mező üres, amíg nem importálnak újra.
