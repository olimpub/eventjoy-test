# Olimpub V2 – Egységesített Játék- és Adatstruktúra Összefoglaló (FE számára)

## 1. Alapelv: Megszűntek a külön „Extra” katalógusok és táblák
A korábbi különálló extra-játék struktúra (`OpExtraCatalog`, `OpExtraPool`, `OpExtraRuns`, `OpExtraQuestions`, `OpExtraAnswers`, `OpExtraScores`) **teljesen megszűnt**.

Minden játékelem – legyen az fő kvíz forduló, párbaj, gyorsasági játék vagy kézi vezérlésű játék (Mozaik / Karaoke) – **ugyanabban az egységes Forduló (`OpRounds`) és Kérdés (`OpEventQuestions`) struktúrában** él, és **ugyanazokkal a parancsokkal** vezérelhető.

---

## 2. Fordulótípusok (`RoundTypeCode`) az `OpRounds`-ban
A `GET /op/event/{id}` válaszában az `OpRounds` tömb minden eleme kapott egy **`RoundTypeCode`** mezőt, amely meghatározza a forduló viselkedését és pontozását:

| `RoundTypeCode` | Megnevezés | Nyers pont (`RawsMode`) | `F` pont kiosztása (`FGivenMode`) | `F` pont skála (`FPointMode`) |
| :--- | :--- | :--- | :--- | :--- |
| **`main_quiz`** | Fő Kvíz | `team` (csapatátlag + sebesség) | `after_round` (`Op.CloseRound`-kor) | `dynamic` (`100..P_min` a résztvevő csapatok számától függően) |
| **`duel_speed`** | Párbaj | `fastest` (`100000 - ElapsedMs` a leggyorsabb helyes válaszoló csapattag alapján) | `after_question` (`Op.StopQuestion`-kor azonnal) | `fixed` (1. hely: `20`, 2. hely: `10`, 3. hely: `5` F pont) |
| **`fast_5`** | Gyorsasági | `fastest` (`100000 - ElapsedMs`) | `after_round` (`Op.CloseRound`-kor) | `fixed` (1–5. hely: `50, 40, 30, 20, 10` F pont) |
| **`manual_display`** | Kézi Vezérlés (Mozaik / Karaoke) | `none` | `none` (pontozás `Op.AdjustTeam`-mel megy) | `none` |

### Fontos változások a `GET /op/event/{id}` datasetekben:
* **Megszűnt datasetek:** `OpExtraCatalog`, `OpExtraPool`, `OpExtraRuns`, `OpExtraQuestions`, `OpExtraScores` már **nem** jönnek a válaszban.
* **`OpSettings`:** az `ExtraGameIds` mindig üres tömb (`[]`).
* **`OpRounds`:** minden fordulót tartalmaz (`main_quiz` és extra típusokat is). Mezők:
  * `id`, `EventID`, `TopicID`, `TopicName`, `Mode`, `StatusCode` (`pending` | `active` | `closed` | `published`), `SortIndex`, **`RoundTypeCode`**.
* **`OpEventQuestions`:** minden forduló kérdéseit tartalmazza (`RoundID` köti a megfelelő `OpRounds.id`-hoz).
  * A kijelző (`display`) soha nem kap helyes választ (`Correct` = `null`, `IsCorrect1..8` = `false`).
  * A `staff` (QM/Organizer) minden kérdéshez, a `gamer` pedig az `active` / `stopped` kérdésekhez megkapja a helyes választ a helyi kiértékeléshez.
* **`OpLive`:**
  * Az egykori `ExtraRunID`, `ExtraGameId`, `ActiveExtraQuestionID`, `ExtraQuestionStatus` mezők mindig `null` értékűek.
  * Helyettük **minden** fordulótípusnál az egységes `ActiveRoundID`, `RoundID`, `ActiveEventQuestionID`, `EventQuestionID`, `QuestionStatus` (`pending` | `active` | `stopped`) mezők használatosak!

---

## 3. Egységesített Játékvezérlés (`POST /op/game/change`)
Nincs szükség külön `Extra*` akciókra – minden forduló és kérdés ugyanazokkal az akciókkal működik:

1. **Forduló életciklus:**
   * `Op.StartRound` (`{ RoundID }`) – elindítja a fordulót (fő kvízt és extra fordulót egyaránt).
   * `Op.CloseRound` (`{ RoundID }`) – lezárja a fordulót, és `after_round` típusoknál (`main_quiz`, `fast_5`) kiszámolja a forduló `F` pontjait.
     * *Megjegyzés:* Dinamikus és fix `after_round` pontozásnál csak azok a csapatok számítanak résztvevőnek (`@N`), amelyek legalább 1 választ beküldtek a fordulóban. A nem válaszoló csapatok `F = 0` pontot és `@N + 1` helyezést kapnak.
   * `Op.PublishRound` (`{ RoundID }`) – publikálja a lezárt fordulót a játékosok felé.
   * `Op.ResetRound` (`{ RoundID }`) – törli a forduló válaszait/pontjait és visszaállítja `pending` státuszba.

2. **Kérdés életciklus:**
   * `Op.StartQuestion` (`{ EventQuestionID }`) – elindítja a kérdést felolvasási fázisban (`ClockPaused = 1`, `AnswerStartedAtUtc = null`). *(Backward-kompatibilitásból az `Op.StartExtraQuestion` is ugyanezt csinálja `EventQuestionID` alapján.)*
   * `Op.StartClock` (`{ EventQuestionID }`) – elindítja a válaszadási órát (`ClockPaused = 0`, `AnswerStartedAtUtc = <most>`).
   * `Op.PauseClock` / `Op.PauseQuestion` (`{ EventQuestionID, Hold: true|false, ClockLeftMs }`) – megállítja vagy folytatja az órát.
   * `Op.StopQuestion` (`{ EventQuestionID }`) – lezárja a kérdést, kiszámolja a `RawS` pontokat (és `duel_speed` esetén azonnal jóváírja a fix `F` pontokat is a `tblRoundScore`-ban).
   * `Op.NextQuestion` (`{ RoundID }`) – a forduló következő `pending` kérdését indítja el.
   * `Op.ReopenQuestion` (`{ EventQuestionID }`) – törli az adott kérdésre adott válaszokat/pontokat és újraindítja a kérdést.

3. **Válaszbeküldés (`Op.SubmitAnswer`):**
   * Payload: `{ EventQuestionID, ElapsedMs, Correct, Ratio, Items: [...] }`.
   * Minden fordulótípusnál (`main_quiz`, `duel_speed`, `fast_5`) ugyanúgy az `EventQuestionID`-ra küldi be a választ.

4. **Kézi pontozás / Mozaik / Karaoke (`Op.AdjustTeam`):**
   * Payload: `{ TeamID, PenaltyTypeCode, Points, Direction }`.
   * Támogatott `PenaltyTypeCode` értékek a szótárból:
     * `'mozaik_correct'` (+10 pont)
     * `'karaoke_pro'` (+20 pont)
     * `'cheat'` (-10 pont)
     * `'manual_plus'` (+10 pont)
     * `'manual_minus'` (-10 pont)

---

## 4. Kérdés Import és Szerkesztés
* **`POST /op/questions/import`:**
  * A `Questions` tömb elemei támogatják a **`RoundTypeCode`** mezőt (`'main_quiz'`, `'duel_speed'`, `'fast_5'`, `'manual_display'`). Ha nincs megadva, alapértelmezetten `'main_quiz'` lesz.
  * Az import a `TopicName + RoundTypeCode` párosok alapján automatikusan létrehozza a megfelelő típusú `OpRounds` sorokat és beköti alájuk az `OpEventQuestions` kérdéseket.
* **`POST /op/question/save`:**
  * Minden kérdés szerkesztése egységesen `EventQuestionID` + `QuestionID` alapján történik.

---

## 5. Tabellák (`GET /op/leaderboard/{id}` és `Op.ShowLeaderboard`)
* Minden csapat-tabella (`main`, `quiz`, `raw`, `games`) **csak azokat az aktív csapatokat adja vissza, amelyekben van legalább 1 belépett csapattag (`tblTeamMember`)**.
* A `Board` típusok jelentése az új struktúrában:
  * **`main`**: Összesített tabella = összes lezárt/publikált forduló (`main_quiz` + `duel_speed` + `fast_5`) `F` pontjainak összege + büntetések/bónuszok (`OpPenalties`, pl. Mozaik/Karaoke pontok).
  * **`quiz`**: Csak a `RoundTypeCode = 'main_quiz'` fordulók `F` pontjai (opcionálisan `@RoundID`-ra szűrve).
  * **`games`**: Csak az extra fordulók (`RoundTypeCode != 'main_quiz'`, azaz `duel_speed`, `fast_5`) `F` pontjai (opcionálisan `@RoundID`-ra szűrve).
  * **`raw`**: Nyers (`RawS`) pontok. Ha `RoundID` meg van adva (`?board=raw&RoundId=25` vagy `Op.ShowLeaderboard` `{ Board: 'raw', RoundID: 25 }`), akkor **kizárólag az adott forduló** nyers pontjait adja vissza, és az előző állást (`PreviousPoints`) is fordulónként (`raw:r25`) követi.
  * **`shadow`**: Egyéni játékos ranglista (`tblShadowRoundScore` `F` pontok összege).
