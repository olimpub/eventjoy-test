import { api } from 'src/boot/axios';
import {
  nullableNumericId,
  pickDataset,
  pickFilledDataset,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';
import {
  normalizeOpCatalog,
  normalizeOpEventQuestions,
  normalizeOpLive,
  normalizeOpRepoQuestions,
  normalizeOpRounds,
  normalizeOpSettings,
  normalizeOpTeams,
  type OpCatalogItem,
  type OpEventQuestion,
  type OpEventSettings,
  type OpLiveState,
  type OpRepoQuestion,
  type OpRound,
  type OpTeam,
} from './opData';

export interface OpMasterCatalog {
  kabalas: OpCatalogItem[];
  topics: OpCatalogItem[];
}

export interface OpEventPayload {
  settings: OpEventSettings[];
  rounds: OpRound[];
  questions: OpEventQuestion[];
  repoQuestions: OpRepoQuestion[];
  teams: OpTeam[];
  live: OpLiveState;
}

function pickOpQuestionRows(data: unknown): unknown[] {
  return pickFilledDataset(
    data,
    'OpQuestions',
    'opQuestions',
    'OpRepoQuestions',
    'Questions',
    'tblQuestion',
    'Result2',
    'result2',
    'Result3',
    'result3'
  );
}

export async function fetchOpMaster(): Promise<OpMasterCatalog> {
  const response = await api.get('/op/master');
  const data = unwrapApiPayload(response.data);
  return {
    kabalas: normalizeOpCatalog(pickDataset(data, 'OpKabalas', 'opKabalas', 'Kabalas')),
    topics: normalizeOpCatalog(pickDataset(data, 'OpTopics', 'opTopics', 'Topics')),
  };
}

export async function fetchOpEvent(eventId: number | string): Promise<OpEventPayload> {
  const response = await api.get(`/op/event/${eventId}`);
  const data = unwrapApiPayload(response.data);
  throwIfApiFailed(data, 'Az Olimpub esemény betöltése sikertelen.');
  const questionRows = pickDataset(data, 'OpEventQuestions', 'opEventQuestions', 'EventQuestions');
  return {
    settings: normalizeOpSettings(pickDataset(data, 'OpSettings', 'opSettings'), eventId),
    rounds: normalizeOpRounds(pickDataset(data, 'OpRounds', 'opRounds', 'Rounds'), eventId),
    questions: normalizeOpEventQuestions(questionRows, eventId),
    repoQuestions: normalizeOpRepoQuestions(
      pickFilledDataset(data, 'OpQuestions', 'opQuestions', 'OpRepoQuestions', 'tblQuestion')
    ),
    teams: normalizeOpTeams(pickDataset(data, 'OpTeams', 'opTeams', 'Teams'), eventId),
    live: normalizeOpLive(pickDataset(data, 'OpLive', 'opLive')),
  };
}

export async function fetchOpQuestions(eventId: number | string): Promise<OpRepoQuestion[]> {
  const response = await api.get(`/op/questions/${eventId}`);
  if (Array.isArray(response.data)) return normalizeOpRepoQuestions(response.data);
  const data = unwrapApiPayload(response.data);
  throwIfApiFailed(data, 'A kérdések betöltése sikertelen.');
  return normalizeOpRepoQuestions(pickOpQuestionRows(data));
}

function readImportRoundIds(data: Record<string, unknown>): number[] {
  const ids: number[] = [];
  const push = (value: unknown) => {
    const id = nullableNumericId(value);
    if (id != null && !ids.includes(id)) ids.push(id);
  };
  push(data.RoundID ?? data.roundID ?? data.RoundId);
  const listed = data.RoundIDs ?? data.roundIDs ?? data.RoundIds;
  if (Array.isArray(listed)) listed.forEach(push);
  else push(listed);
  for (const raw of pickDataset(data, 'OpRounds', 'opRounds', 'Rounds')) {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    if (row) push(row.id ?? row.ID ?? row.RoundID);
  }
  return ids;
}

export async function importOpQuestions(body: {
  EventID: number;
  Questions: Record<string, unknown>[];
}): Promise<{ inserted: number; rows: OpRepoQuestion[]; roundIds: number[] }> {
  const response = await api.post('/op/questions/import', body);
  throwIfApiFailed(response.data, 'A kérdések importja sikertelen.');
  const data = unwrapApiPayload(response.data) as Record<string, unknown>;
  const inserted = Number(data?.Inserted ?? data?.inserted ?? body.Questions.length);
  return {
    inserted: Number.isFinite(inserted) ? inserted : body.Questions.length,
    rows: normalizeOpRepoQuestions(pickOpQuestionRows(data)),
    roundIds: readImportRoundIds(data),
  };
}

export async function postOpGameChange(body: {
  EventID: number;
  Action: string;
  Payload?: Record<string, unknown>;
}): Promise<unknown> {
  const response = await api.post('/op/game/change', {
    EventID: body.EventID,
    Action: body.Action,
    Payload: body.Payload ?? {},
  });
  throwIfApiFailed(response.data, 'Az Olimpub művelet sikertelen.');
  return unwrapApiPayload(response.data);
}

export async function saveOpQuestion(body: Record<string, unknown>): Promise<unknown> {
  const response = await api.post('/op/question/save', body);
  throwIfApiFailed(response.data, 'A kérdés mentése sikertelen.');
  return unwrapApiPayload(response.data);
}

export async function generateOpRound(body: {
  EventID: number;
  TopicID: number;
  Mode?: string;
  RoundSortIndex?: number;
}): Promise<unknown> {
  const response = await api.post('/op/round/generate', {
    EventID: body.EventID,
    TopicID: body.TopicID,
    Mode: body.Mode ?? 'mixed',
    RoundSortIndex: body.RoundSortIndex ?? 1,
  });
  throwIfApiFailed(response.data, 'A forduló generálása sikertelen.');
  return unwrapApiPayload(response.data);
}
