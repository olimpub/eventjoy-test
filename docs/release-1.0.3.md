# EventJoy Kiadási Jegyzék — v1.0.3

**Kiadás dátuma:** 2026-10-14  
**Verziószám:** `1.0.3`  
**Összefoglaló:** PTA sorsolás és pontozás optimalizálása, személyes QR belépő kódok és eszközkötés (játékos és játékmester), Olimpub egyszerűsített fordulók, valamint kivetítés és fejléc fejlesztések.

---

## 1. PTA sorsolás
- Ha az asztalszám nem stimmel a belépett játékosokkal, a véglegesítés le van tiltva, és kiírja, hány asztal kellene.
- Későbbi mentés nem törli a játékosok szervezetnevét.

## 2. Olimpub
- A forduló típusa egyszerűsödött: Fő kvíz, Párbaj, Gyorsasági, Színpad.

## 3. Kivetítés és teljes képernyő
- Lezárt forduló is kivetíthető, nem csak a publikált. A játékos telefonja továbbra is csak a publikált eredményt látja.
- A vetítésválasztó üresen indul. Játékosok, Csoportok és Dobogó csak választott, lezárt vagy publikált fordulóra megy. Ha nincs ilyen forduló, a három gomb nem él.
- Ha nem az utolsó lezárt fordulót választják, figyelmeztetés jön. Dobogónál akkor is, ha nincs minden forduló lezárva.
- Ülésrend és Forduló állás továbbra is a nyitott fordulót veszi.
- A személyzet HDMI-fala a lezárt forduló pontjait is mutatja.
- Új teljes képernyő gomb a fejlécben.

## 4. Belépő kód (eszközkötés)
- A résztvevő adatlapján, játékos és játékmester sornál, személyes QR van. A saját telefon bejelentkezik, e-mail és kód nélkül, és ehhez az eszközhöz kötődik.
- Ha az esemény már bejelentkezésen vagy azon túl van, megnyílik az adatlap. Játékosnál ez Belépett státuszt is jelent. Játékmesternél a státusz nem változik. Előtte várakozó képernyő.
- Másik telefon ugyanazzal a kóddal nem lép be. Elveszett telefonhoz az Új kód ad másikat.

## 5. Pontozás
- Üres asztalt a mentés a pontozó játékmesterhez köti. Más játékmester asztalát is lehet pontozni, és a mentés után az asztal az övé lesz.
- A fordulót csak a szervező lépteti Folyamatban állapotba. A játékmester mentése ezt nem teszi meg.
- Lezárt vagy lejátszott asztalt a játékmester nem ír át. A szervező igen.

## 6. Fejléc
- A hírfolyam, az értesítés és a chat ikon ideiglenesen rejtve van, hogy mobilon elférjen a logó, a súgó és a teljes képernyő.

## 7. Backend (BE) fejlesztések
- **Résztvevők adatlap és e-mail integráció:** Az `spGetEventUserDataSheet` eljárás tartalmazza a szervezet nevét (`OrganizationName`), valamint az `spImportInvitations` és `spGetPendingEmailsBulk` eljárások kezelik az `EmailSendingEnabled` beállítást.
- **Social Bónusz és PTA mentés:** Social bónusz végpontok bevezetése és automatikus pontjóváírás, valamint camelCase és PascalCase kulcsok támogatása esemény játékosok mentésekor (`EJ.spChangeEvent`).
- **Személyes QR belépő és eszközkötés végpontok:** `POST /auth/player-pass` és `POST /auth/player-device-join` végpontok JWT generálással, `EJ.tblPlayerDevicePass` tábla, `EJ.spCreateOrGetPlayerPass` és `EJ.spJoinPlayerDevicePass` tárolt eljárások.
- **Rugalmas asztali pontozás:** Az `EJ.spChangeEvent` eljárásban bármely játékmester vagy szervező pontozhat bármely nyitott asztalt; a mentés automatikusan hozzárendeli az asztalt a pontozó játékmesterhez.

---

## 8. Még nem commitolt (helyi módosítások)

A tesztkörnyezetben jelenleg az alábbi tételek élnek még helyi (uncommitted) állapotban:

### Backend (`EventJoy.Api`):
- `SQL/Procedures/EJ.spChangeEvent.sql`: Játékmesteri jogosultság és asztal hozzárendelés mentéskor (`Pta.SetDeskResults`).
- `SQL/Tables/EJ.tblPlayerDevicePass.sql`: Belépő kódok és telefonos eszközkötések táblája.
- `SQL/Procedures/EJ.spCreateOrGetPlayerPass.sql`: Személyes belépő kód generálás és rotálás játékosoknak és játékmestereknek.
- `SQL/Procedures/EJ.spJoinPlayerDevicePass.sql`: Eszközkötés (`DeviceId`), státuszkezelés és eseményfázis ellenőrzés.
- `PlayerPassEndpoints.cs`: Belépő kód és telefonos csatlakozási végpontok (`POST /auth/player-pass`, `POST /auth/player-device-join`).

### Frontend (`eventjoy-test`):
- `src/components/event/PlayerPassSheet.vue`: QR kód megjelenítő és rotáló lap a résztvevői adatlapon.
- `src/pages/PlayerPassPage.vue`: Publikus eszközcsatlakozási oldal (`/join/pass/:token`).
- `src/utils/playerDevicePass.ts`: Eszköz UUID generálás/tárolás és belépési API hívás.
- `src/modules/profitability/pages/DisplayControlPage.vue` & `DisplayPage.vue`: Kivetítés vezérlés és lezárt fordulók kivetítése.
- `src/modules/profitability/pages/GamePage.vue`: Játékmesteri pontozási szabályok és asztalvédelem.
- `src/layouts/MainLayout.vue`: Fejléc optimalizálás mobilon és teljes képernyő gomb.
- `package.json` & `src-capacitor/package.json`: Verziószám frissítés `1.0.3`-ra.
