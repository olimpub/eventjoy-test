# Olimpub — kérdés mentés

A szervező a Quiz fordulóban szerkeszt **egy** kérdést. Import (`POST /op/questions/import`) ettől külön. Nincs `generate`.

GET-szerződés: [`olimpub-question-get.md`](olimpub-question-get.md).

---

## 1. Végpont

**`POST /op/question/save`**

Nem REST PUT (`/op/event/:eventId/question/:questionId`). Az OP élő API mind `POST` + PascalCase ID a body-ban (`/op/questions/import`, `/op/game/change`). Maradjon ez.

Auth: **szervező**. QM / játékos / display → `403`.

Siker: `200` `{ "ReturnValue": 1 }`.  
Hiba: `400` / `403` + `{ "ReturnValue": -1, "ReturnDescription": "…" }`. Ne commitolj.

---

## 2. Payload = a GET lapos sora

Igen: **ugyanaz a kivasalt alak**, amit a `GET /op/event/:id` → `OpEventQuestions` ad, plusz `EventID` a tetején.

Nincs `Options` / `Correct` / `Correct.Synonyms` objektum. A BE a lapos mezőkből írja az `OptionsJson` / `CorrectJson` oszlopot (mint importnál).

```json
{
  "EventID": 89,
  "EventQuestionID": 1201,
  "QuestionID": 440,
  "TypeCode": "single",
  "Prompt": "Ki énekelte a Take On Me-t?",
  "TimeSec": 20,
  "SortIndex": 1,
  "Answer1": "A-ha",
  "Answer2": "Queen",
  "Answer3": "ABBA",
  "Answer4": "The Beatles",
  "IsCorrect1": true,
  "IsCorrect2": false,
  "IsCorrect3": false,
  "IsCorrect4": false,
  "ImageKey": "a3f1c0e2-img.jpg",
  "AudioKey": "b91-aud.mp3"
}
```

`Type` alias oké. `COALESCE(TypeCode, Type)`. A `TypeCode` **változhat** (a szerkesztő bal felső típusváltója).

Írd:

- `OP.tblQuestion` a `QuestionID`-n: `TypeCode`, `Prompt`, `TimeSec`, `OptionsJson`, `CorrectJson` (a lapos mezőkből). `ImageKey` / `AudioKey`: kulcs hiányzik → ne nyúlj; `null` → levétel. Részlet: [`olimpub-media.md`](./olimpub-media.md).
- `OP.tblEventQuestion` a `EventQuestionID`-n: `TimeSec` (másolat, ez megy a timerbe). `SortIndex` csak ha a body-ban benne van.

`StatusCode` / `StartedAtUtc` / `StoppedAtUtc` a body-ban **ignore**.

---

## 3. Típusonként (lapos)

| TypeCode | Answer* | Match* | IsCorrect* |
|---|---|---|---|
| `single` | 2–8 opció | — | pontosan egy `true` |
| `multi` | 2–8 opció | — | legalább egy `true` |
| `order` | helyes sorrend | — | — |
| `match` | bal | jobb, ugyanaz az index = pár | — |
| `category` | darab | **ennek** a darabnak a kategóriája | — |
| `freetext` | `Answer1`: `"8\|nyolc"` | — | — |

`IsCorrect*`: boolean / bit, nem `"x"`.

Üres slot: kulcs hiányzik vagy `null`. Ne küldj üres stringet 8-ig.

---

## 4. Védelem — v1: csak `pending`

**Csak `StatusCode = pending`.** Sem `active`, sem `stopped`.

| Állapot | Mentés | |
|---|---|---|
| `pending` | igen | még nincs válasz, pontozás nem sérül |
| `active` | **nem** | a kérdés él, a játékosok ezt látják |
| `stopped` | **nem** (v1) | van Answer + QuestionScore. Újrapontozás = külön feature |

`400` `A kérdés már lement, nem szerkeszthető.` (vagy `…már fut.` ha `active`).

Nem pontozunk újra `stopped`-on. Az újrapontozás később jöhet (`Op.RescoreQuestion`), ha kell QM-javítás leállítás után — v1-ben szétcsúszna a leaderboard / published F.

Kör `closed` / `published`: a kérdések már `stopped` → ugyanaz a tiltás.

---

## 5. Amit a FE nem csinál

- Nem hív `generate`-et.
- Import külön marad.
- `stopped` / `active` kérdésen a Mentés gomb disabled.
