# Olimpub — kérdés GET (szerkesztő)

`GET /op/event/:id` → `OpEventQuestions`. A szerver a memóriában **kivasalja** az opciókat. A kérdés objektumon **nincs** `Options` / `Correct` tömb.

A szerkesztő a lapos mezőkhöz bindol.

---

## Szervező / QM — egy sor

Identitás: `id` / `EventQuestionID`, `EventID`, `RoundID`, `QuestionID`, `SortIndex`, `StatusCode`, `TimeSec`, `Prompt`, `TypeCode`, `TopicName`.

Média (két slot, lásd [`olimpub-media.md`](./olimpub-media.md)): `ImageKey`, `ImageUrl`, `AudioKey`, `AudioUrl`. Játékos / display: `AudioKey` / `AudioUrl` mindig `null`. `MediaUrl` alias csak a képre.

Opciók — **laposan**, minden típusnál:

| Mező | |
|---|---|
| `Answer1…8` | opció / bal / darab / freetext pipe |
| `Match1…8` | match jobb oldal **vagy** category: a darab kategóriája (ugyanaz az index) |
| `IsCorrect1…8` | single / multi, **boolean** |

Üres slot: `null` / hiányzó kulcs. Ne küldj `Options` / `Correct` tömböt (a `[[[[]]]]` bug miatt ezek kikerültek).

`Type` alias a `TypeCode` mellett oké.

---

## Típusonként

### `single` / `multi`

`Answer1…N` = opciók. `IsCorrectK = true` a helyeseken (single: egy, multi: több).

### `order`

`Answer1…N` = **helyes sorrend**. Nincs `IsCorrect` / `Match`.

### `match`

`AnswerK` = bal, `MatchK` = jobb, ugyanaz az index = egy pár.

### `category`

`AnswerK` = darab, `MatchK` = **ennek** a darabnak a kategóriája (nem a kategória-nevek listája külön).  
Példa: `Answer1=Take On Me`, `Match1=pop`, `Answer2=Lithium`, `Match2=grunge`.

### `freetext`

`Answer1` = `"8|nyolc"`. Nincs `Correct.Synonyms` a GET-en.

---

## Példa

```json
{
  "id": 1201,
  "EventQuestionID": 1201,
  "EventID": 89,
  "RoundID": 15,
  "QuestionID": 440,
  "SortIndex": 1,
  "StatusCode": "pending",
  "TimeSec": 20,
  "Prompt": "Ki énekelte a Take On Me-t?",
  "TypeCode": "single",
  "TopicName": "80s pop",
  "Answer1": "A-ha",
  "Answer2": "Queen",
  "Answer3": "ABBA",
  "Answer4": "The Beatles",
  "IsCorrect1": true,
  "IsCorrect2": false,
  "IsCorrect3": false,
  "IsCorrect4": false
}
```

Játékos / display: a szerep-szabály marad (display: helyes válasz tilos; játékos: csak `active`).
