# Publikus kiadási jegyzetek — backend szerződés

A sysadmin `GET /sysadmin/versions` **nem** használható a normál appban: sysadmin JWT kell hozzá, és belső mezőket visz (`TicketID`, `InternalReference`, inaktív sorok).

A Profil → **Újdonságok** oldalhoz egy külön, user-szintű GET kell.

---

## `GET /app/versions`

- **Auth:** bármely érvényes user JWT (nem sysadmin).
- **Query:** nincs. A FE nem lapoz, a teljes *publikus* listát várja.
- **Írás:** nincs. Create/update marad `POST /sysadmin/versions`.

### Szűrés (szerver)

Csak az kerüljön a válaszba, amit a felhasználó láthat:

1. `tblAppVersion.ActiveFlg = 1`
2. `tblAppVersionItem.ActiveFlg = 1`
3. **Ne** küldd: `TicketID`, `InternalReference`
4. Rendezés: `ReleaseDate DESC`, azonos dátumnál `VersionID DESC`

Ha egy verziónak nincs aktív tétele, a verzió **akkor is** jöjjön (Summary önmagában elég).

### Válasz (200)

Ugyanaz a nested forma, mint a sysadmin GET, de publikus mezőkkel:

```json
{
  "Data": [
    {
      "VersionID": 1,
      "VersionNumber": "1.0.1",
      "ReleaseDate": "2026-09-15T12:00:00Z",
      "Summary": "Hibajavítások és gyorsabb belépés",
      "Items": [
        {
          "ItemID": 2,
          "Description": "Sysadmin portál javítása.",
          "ExternalReference": "https://github.com/..."
        }
      ]
    }
  ]
}
```

| Mező | Kötelező | Megjegyzés |
|---|---|---|
| `VersionID` | igen | FE key |
| `VersionNumber` | igen | pl. `1.0.1` — a `v` prefixet a FE rakja ki |
| `ReleaseDate` | igen | ISO-8601 UTC |
| `Summary` | nem | szabad szöveg, üres lehet |
| `Items` | igen | tömb, lehet `[]` |
| `Items[].ItemID` | igen | FE key |
| `Items[].Description` | igen | ezt látja a user mint fejlesztés |
| `Items[].ExternalReference` | nem | csak akkor, ha **http(s)** user-facing link. Egyébként `null` / hagyd ki |

`ActiveFlg` **nem kell** a publikus payloadban (már ki van szűrve). Ha mégis jön, a FE `false`-t elrejti.

Üres lista: `Data: []` (200), ne 404.

---

## Magyar karakterek (kötelező)

A FE **nem** tudja helyrehozni, ha a HTTP body-ban már elromlott a szöveg. A `GET /user/data` User.LastName UTF-8-asan megy; **ugyanazt a JSON írási utat** használd ide is.

### Elvárt

Tesztstring a `Summary` / `Description` mezőbe: **`Árvíztűrő tükörfúrógép`**

A nyers válaszban (F12 → Network → Response, ne Preview) **pontosan ezek** a betűk legyenek: `Á á é í ó ö ő ú ü ű`.

Rossz, ha ezt látod:

| Rossz | Jelentés |
|---|---|
| `ÃrvÃ­ztÅ±rÅ‘` | UTF-8 bájtok Latin-1/1250-ként olvastad / írtad ki |
| `Arvizturo tukorfurogep` / `?` | `varchar` vagy `CAST(... AS VARCHAR)` — az `ő`/`ű` elveszett |
| `&#337;` / `&otilde;` | XML/HTML escape; a FE sima szöveget vár |

### HTTP

```
Content-Type: application/json; charset=utf-8
```

A body UTF-8 bájtsor. .NET-en:

- `System.Text.Json` / `OkObjectResult` / `Results.Json` — ez a jó út
- **Ne** `Encoding.GetEncoding(1250)` / `1252` / `ISO-8859-1`
- **Ne** `new StringContent(json, Encoding.Default)`
- Ha SQL `FOR JSON` stringet adsz vissza: `WriteStringAsync(json, Encoding.UTF8)`, ne Latin-1 byte[]-ként

### SQL

- `Summary`, `Description`, `VersionNumber`, `InternalReference`, `ExternalReference`: **`nvarchar`**
- `POST /sysadmin/versions` body: **`@Json nvarchar(max)`** + `OPENJSON` (mint `spSaveEvent`)
- Tilos: `CAST(Summary AS varchar)`, `varchar` oszlop, `FOR XML PATH` a JSON helyett

### Mentés kör (ugyanaz a kódolás)

A `POST /sysadmin/versions` request UTF-8 JSON. Ha a GET elromlik, először nézd meg, a POST egyáltalán `nvarchar`-ba írja-e, vagy már a INSERT-nél `?` lesz belőle.

---

## Mit ne csinálj

- Ne add oda a `/sysadmin/versions` választ user JWT-re.
- Ne küldj inaktív verziót / tételt „majd a FE kiszűri”.
- Ne küldj belső ticket / TASK / BUG azonosítót a user felé.
- Ne kelljen `Futtatás` / dátumszűrő; ez nem audit log.

---

## FE használat (ebből a szerződésből)

- Profil menü: **Újdonságok**, jobb oldalon a legújabb `VersionNumber` (`v1.0.1`).
- Oldal: `/whats-new` — verziók csökkenő sorrendben, lenyitva Summary + `Items[].Description`.
- `ExternalReference` csak akkor link, ha `http://` vagy `https://`.
