import { normalizeRoundTypeCode, roundTypeKind, roundTypeTitle } from './constants';
import {
  formatOpQuestionCorrect,
  opQuestionTopic,
  type OpEventQuestion,
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
  roundTypeCode?: string;
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

export function buildQmCatalog(
  game: {
    rounds: OpRound[];
    questions: OpEventQuestion[];
    live: OpLiveState;
  },
  topics: { id: number; Name: string }[]
): QmCatalogItem[] {
  const quiz: QmCatalogItem[] = [];
  const games: QmCatalogItem[] = [];
  for (const round of game.rounds) {
    const code = normalizeRoundTypeCode(round.RoundTypeCode) || 'main_quiz';
    const qs = questionsOf(game, round.id);
    const pointer = roundPointer(round, qs, game.live);
    const title =
      opQuestionTopic({ TopicName: round.TopicName, RoundID: round.id }, game, topics) ||
      roundTypeTitle(code);
    const item: QmCatalogItem = {
      id: `round:${round.id}`,
      kind: roundTypeKind(code),
      title,
      total: qs.length,
      roundId: round.id,
      roundTypeCode: code,
      ...pointer,
    };
    if (item.kind === 'game') games.push(item);
    else quiz.push(item);
  }
  return [...quiz, ...games];
}
