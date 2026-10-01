import { matchOpExtraGame, OP_EXTRA_GAMES } from './constants';
import {
  extraPoolToQuestion,
  formatOpQuestionCorrect,
  opQuestionTopic,
  uniqueOpExtraGameIds,
  type OpEventQuestion,
  type OpExtraPoolItem,
  type OpLiveState,
  type OpRound,
} from './opData';

export type QmItemStatus = 'wait' | 'live' | 'closed';

export interface QmCatalogItem {
  id: string;
  kind: 'quiz' | 'game';
  title: string;
  total: number | null;
  index: number;
  status: QmItemStatus;
  prompt: string;
  correct: string;
  roundId?: number;
  extraGameId?: string;
  eventQuestionId?: number;
  extraQuestionId?: number;
}

function firstCorrect(row: OpEventQuestion): string {
  return formatOpQuestionCorrect(row);
}

function questionsOf(game: { questions: OpEventQuestion[] }, roundId: number): OpEventQuestion[] {
  return game.questions.filter((row) => row.RoundID === roundId).sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
}

function statusOf(row: { StatusCode?: string }) {
  return String(row.StatusCode || '').toLowerCase();
}

function roundPointer(
  round: OpRound,
  qs: OpEventQuestion[],
  live: OpLiveState
): Pick<QmCatalogItem, 'status' | 'index' | 'prompt' | 'correct' | 'eventQuestionId'> {
  const total = qs.length;
  const byId = (id: number | null | undefined) =>
    id != null ? qs.find((row) => row.id === id) : undefined;
  const active =
    qs.find((row) => statusOf(row) === 'active') ||
    (live.ActiveRoundID === round.id ? byId(live.ActiveEventQuestionID) : undefined);
  const focused = live.ActiveRoundID === round.id ? byId(live.FocusedEventQuestionID) : undefined;
  const closedCodes = new Set(['stopped', 'closed', 'complete', 'completed', 'done', 'finished']);
  const done = qs.filter((row) => closedCodes.has(statusOf(row)));
  const last = qs[qs.length - 1];
  const nextPending =
    qs.find((row) => {
      const st = statusOf(row);
      return st === 'pending' || st === 'wait';
    }) || qs.find((row) => !closedCodes.has(statusOf(row)));
  const lastStopped = last != null && closedCodes.has(statusOf(last));
  const wrapping =
    lastStopped && nextPending != null && nextPending.SortIndex < last.SortIndex;
  const allDone = total > 0 && done.length >= total;
  const st = String(round.StatusCode || '').toLowerCase();
  const roundClosed = st === 'closed' || st === 'published' || st === 'lezárt' || st === 'lezart';
  if (roundClosed || allDone || wrapping) {
    return {
      status: roundClosed ? 'closed' : 'live',
      index: total || last?.SortIndex || 0,
      prompt: last?.Prompt || '',
      correct: last ? firstCorrect(last) : '',
      eventQuestionId: last?.id,
    };
  }

  const inThisRound =
    live.ActiveRoundID === round.id ||
    Boolean(active) ||
    Boolean(focused) ||
    done.length > 0;
  const row = active || (String(live.QuestionStatus || '').toLowerCase() === 'stopped' ? focused : undefined) || nextPending || last || qs[0];
  const index = Math.min(total || 1, Math.max(1, row?.SortIndex || done.length + 1 || 1));
  if (inThisRound) {
    return {
      status: 'live',
      index,
      prompt: row?.Prompt || '',
      correct: row ? firstCorrect(row) : '',
      eventQuestionId: row?.id,
    };
  }

  return {
    status: 'wait',
    index: nextPending?.SortIndex || 1,
    prompt: nextPending?.Prompt || '',
    correct: nextPending ? firstCorrect(nextPending) : '',
    eventQuestionId: nextPending?.id,
  };
}

function extraFromQuestions(qs: OpEventQuestion[]) {
  const tagged = qs.filter((row) => row.ExtraGameId);
  if (!tagged.length) return null;
  if (qs.length && tagged.length * 2 < qs.length) return null;
  return (
    matchOpExtraGame(tagged[0].ExtraGameId) || {
      id: tagged[0].ExtraGameId as string,
      title: tagged[0].TopicName || 'Játék',
      total: tagged.length || null,
    }
  );
}

function extraOfRound(
  round: OpRound,
  qs: OpEventQuestion[],
  extraPool: OpExtraPoolItem[],
  roundCounts: number[]
) {
  const named = matchOpExtraGame(round.ExtraGameId, round.Kind, round.Mode);
  if (named) return named;
  const fromQuestions = extraFromQuestions(qs);
  if (fromQuestions) return fromQuestions;

  const extraPrompts = new Set(
    extraPool.map((row) => String(row.Prompt || '').trim().toLowerCase()).filter(Boolean)
  );
  if (
    qs.length &&
    extraPrompts.size &&
    qs.every((row) => extraPrompts.has(String(row.Prompt || '').trim().toLowerCase()))
  ) {
    const poolHit = extraPool.find(
      (row) => String(row.Prompt || '').trim().toLowerCase() === String(qs[0].Prompt || '').trim().toLowerCase()
    );
    return (
      matchOpExtraGame(poolHit?.ExtraGameId) || {
        id: poolHit?.ExtraGameId || round.ExtraGameId || `R${round.id}`,
        title: round.TopicName || 'Játék',
        total: qs.length || null,
      }
    );
  }

  const kind = String(round.Kind || '').toLowerCase();
  const mode = String(round.Mode || '').toLowerCase();
  if (kind === 'extra' || kind === 'game' || kind === 'jatek' || mode === 'extra' || mode === 'game' || round.ExtraGameId) {
    return (
      matchOpExtraGame(round.ExtraGameId, round.TopicName) || {
        id: round.ExtraGameId || `R${round.id}`,
        title: round.TopicName || 'Játék',
        total: qs.length || null,
      }
    );
  }

  const n = qs.length;
  const hasEight = roundCounts.some((count) => count === 8);
  const looksExtra =
    n === 6 ||
    (n === 5 && (hasEight || roundCounts.every((count) => count === 5 || count === 6 || count === 0))) ||
    (n === 0 && Boolean(matchOpExtraGame(round.TopicName)));
  if (!looksExtra) return null;
  const titled = matchOpExtraGame(round.TopicName, round.ExtraGameId);
  if (n === 0) return titled;
  if (n === 6) return titled || matchOpExtraGame('EG2') || OP_EXTRA_GAMES[1];
  return (
    titled || {
      id: round.ExtraGameId || `R${round.id}`,
      title: round.TopicName || 'Játék',
      total: 5,
    }
  );
}

function extraQuestionRows(pool: OpExtraPoolItem[], extraId: string) {
  const key = matchOpExtraGame(extraId)?.id || extraId;
  const seen = new Set<number>();
  return pool
    .filter((row) => (matchOpExtraGame(row.ExtraGameId)?.id || row.ExtraGameId) === key)
    .sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id)
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
}

function extraPlayableRows(
  extraId: string,
  extraPool: OpExtraPoolItem[],
  extraCatalog: OpExtraPoolItem[]
) {
  const live = extraQuestionRows(extraPool, extraId);
  return live.length ? live : extraQuestionRows(extraCatalog, extraId);
}

/** Keret (Párbaj 5) csak akkor, ha még nincs feltöltött/élő sor. Amúgy a készlet hossza. */
function extraPlayableTotal(namedTotal: number | null | undefined, rows: OpExtraPoolItem[]) {
  if (namedTotal == null && !rows.length) return null;
  if (rows.length) return rows.length;
  return namedTotal ?? null;
}

function extraPointerIndex(rows: OpExtraPoolItem[], shown?: OpExtraPoolItem | null) {
  if (!rows.length) return 1;
  if (!shown) return 1;
  const at = rows.findIndex((row) => row.id === shown.id);
  if (at >= 0) return at + 1;
  return Math.min(rows.length, Math.max(1, shown.SortIndex || 1));
}

function extraCatalogItem(
  extraId: string,
  title: string,
  namedTotal: number | null,
  extraPool: OpExtraPoolItem[],
  extraCatalog: OpExtraPoolItem[],
  fromRound?: QmCatalogItem,
  live?: OpLiveState
): QmCatalogItem {
  const named = matchOpExtraGame(extraId, title);
  const rows = extraPlayableRows(extraId, extraPool, extraCatalog);
  const total = extraPlayableTotal(named?.total ?? namedTotal, rows);
  const liveHere = live?.ExtraGameId === (named?.id || extraId);
  if (fromRound) {
    const hit =
      rows.find((row) => row.id === fromRound.extraQuestionId) ||
      rows.find((row) => row.StatusCode === 'active') ||
      rows[Math.min(rows.length, Math.max(1, fromRound.index)) - 1] ||
      rows[0];
    const shown = liveHere ? hit : rows[0];
    return {
      ...fromRound,
      id: `extra:${named?.id || extraId}`,
      kind: 'game',
      title: named?.title || fromRound.title,
      total,
      index: extraPointerIndex(rows, shown) || 1,
      status: liveHere ? 'live' : 'wait',
      extraGameId: named?.id || extraId,
      extraQuestionId: shown?.id,
      roundId: undefined,
      prompt: shown?.Prompt || fromRound.prompt,
      correct: shown ? firstCorrect(extraPoolToQuestion(shown)) : '',
    };
  }
  const next = rows.find((row) => row.StatusCode === 'active') || rows[0];
  const liveRow =
    liveHere && live?.ActiveExtraQuestionID != null
      ? rows.find((row) => row.id === live.ActiveExtraQuestionID)
      : undefined;
  const shown = liveHere ? liveRow || next : rows[0];
  return {
    id: `extra:${named?.id || extraId}`,
    kind: 'game',
    title: named?.title || title || extraId,
    total,
    index: extraPointerIndex(rows, shown),
    status: liveHere ? 'live' : 'wait',
    prompt: shown?.Prompt || named?.title || title,
    correct: shown ? firstCorrect(extraPoolToQuestion(shown)) : '',
    extraGameId: named?.id || extraId,
    extraQuestionId: shown?.id,
  };
}

export function buildQmCatalog(
  game: {
    rounds: OpRound[];
    questions: OpEventQuestion[];
    live: OpLiveState;
    extraPool?: OpExtraPoolItem[];
    extraCatalog?: OpExtraPoolItem[];
  },
  extraGameIds: string[],
  topics: { id: number; Name: string }[]
): QmCatalogItem[] {
  const quiz: QmCatalogItem[] = [];
  const gamesById = new Map<string, QmCatalogItem>();
  const extraPool = game.extraPool || [];
  const extraCatalog = game.extraCatalog || [];
  const roundCounts = game.rounds.map((round) => questionsOf(game, round.id).length);

  for (const round of game.rounds) {
    const qs = questionsOf(game, round.id);
    const extra = extraOfRound(round, qs, extraPool, roundCounts);
    const pointer = roundPointer(round, qs, game.live);
    const title =
      extra?.title ||
      opQuestionTopic({ TopicName: round.TopicName, RoundID: round.id }, game, topics) ||
      `${round.SortIndex}. forduló`;
    const item: QmCatalogItem = {
      id: extra ? `extra:${extra.id}` : `round:${round.id}`,
      kind: extra ? 'game' : 'quiz',
      title,
      total: extra
        ? extraPlayableTotal(
            extra.total,
            extraPlayableRows(extra.id, extraPool, extraCatalog)
          )
        : qs.length || 8,
      roundId: extra ? undefined : round.id,
      extraGameId: extra?.id,
      ...pointer,
    };
    if (extra) {
      const key = matchOpExtraGame(extra.id)?.id || extra.id;
      gamesById.set(
        key,
        extraCatalogItem(key, title, extra.total, extraPool, extraCatalog, item, game.live)
      );
    } else quiz.push(item);
  }

  const enabled = uniqueOpExtraGameIds(
    extraGameIds,
    extraPool.map((row) => row.ExtraGameId),
    extraCatalog.map((row) => row.ExtraGameId),
    game.questions.map((row) => row.ExtraGameId || ''),
    [...gamesById.keys()]
  ).map((id) => matchOpExtraGame(id)?.id || id);

  for (const extraId of enabled) {
    if (gamesById.has(extraId)) continue;
    const named = matchOpExtraGame(extraId);
    const poolRows = extraPlayableRows(extraId, extraPool, extraCatalog);
    if (!named && !poolRows.length) continue;
    gamesById.set(
      extraId,
      extraCatalogItem(
        extraId,
        named?.title || extraId,
        named?.total ?? null,
        extraPool,
        extraCatalog,
        undefined,
        game.live
      )
    );
  }

  const games: QmCatalogItem[] = [];
  for (const row of OP_EXTRA_GAMES) {
    const hit = gamesById.get(row.id);
    if (hit) games.push(hit);
  }
  for (const item of gamesById.values()) {
    if (!games.includes(item)) games.push(item);
  }
  return [...quiz, ...games];
}
