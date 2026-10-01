import { api } from 'src/boot/axios';
import {
  hasDatasetKey,
  nullableNumericId,
  pickDataset,
  pickFilledDataset,
  throwIfApiFailed,
  unwrapApiPayload,
} from 'src/utils/apiPayload';
import {
  normalizeOpCatalog,
  withKabalaAssets,
  normalizeOpEventQuestions,
  normalizeOpExtraPool,
  mergeOpExtraPool,
  extraCatalogFromRepo,
  enrichOpExtraMedia,
  filterOpLeaderboardRows,
  normalizeOpLeaderboardRows,
  normalizeOpLive,
  normalizeOpRepoQuestions,
  normalizeOpRounds,
  normalizeOpSettings,
  collectOpTeamMemberRows,
  enrichOpTeamMembers,
  normalizeOpPenalties,
  normalizeOpTeamMembers,
  normalizeOpTeams,
  uniqueOpExtraGameIds,
  type OpCatalogItem,
  type OpEventQuestion,
  type OpEventSettings,
  type OpLeaderboardBoard,
  type OpLeaderboardRow,
  type OpExtraPoolItem,
  type OpLiveState,
  type OpRepoQuestion,
  type OpRound,
  type OpPenalty,
  type OpTeam,
  type OpTeamMember,
} from './opData';

export interface OpMasterCatalog {
  kabalas: OpCatalogItem[];
  topics: OpCatalogItem[];
}

export interface OpEventPayload {
  settings: OpEventSettings[];
  rounds: OpRound[];
  questions: OpEventQuestion[];
  extraPool: OpExtraPoolItem[];
  extraCatalog: OpExtraPoolItem[];
  repoQuestions: OpRepoQuestion[];
  teams: OpTeam[];
  teamMembers: OpTeamMember[];
  penalties: OpPenalty[];
  hasPenaltiesDataset: boolean;
  live: OpLiveState;
  displayCast: Record<string, unknown> | null;
}

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** A Result2–ResultN objektumokat felhozza, hogy a named datasetek meglegyenek. */
function expandOpPayload(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const [key, val] of Object.entries(data)) {
    if (!/^result\d+$/i.test(key)) continue;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, val as Record<string, unknown>);
    }
  }
  return out;
}

function pickFirstMatchingArray(
  data: Record<string, unknown>,
  test: (value: unknown) => boolean
): unknown[] {
  for (const val of Object.values(data)) {
    if (!Array.isArray(val) || !val.length) continue;
    if (val.some(test)) return val;
  }
  return [];
}

function looksLikeKabalaAssetRow(value: unknown): boolean {
  const row = asRow(value);
  if (!row) return false;
  const slot = String(row.Slot ?? row.slot ?? '').trim();
  const url = String(row.BlobUrl ?? row.blobUrl ?? row.ImageUrl ?? '').trim();
  return Boolean((slot || url) && (row.KabalaID != null || row.KabalaId != null || slot));
}

function looksLikeTeamRow(value: unknown): boolean {
  const row = asRow(value);
  if (!row) return false;
  if (row.EventUserID != null || row.eventUserID != null) return false;
  return (
    row.KabalaID != null ||
    row.kabalaID != null ||
    row.KabalaId != null ||
    row.TeamID != null ||
    row.TeamId != null
  );
}

function looksLikeTeamMemberRow(value: unknown): boolean {
  const row = asRow(value);
  if (!row) return false;
  const hasUser = row.EventUserID != null || row.eventUserID != null || row.EventUserId != null;
  const hasTeam = row.TeamID != null || row.TeamId != null || row.teamId != null;
  return Boolean(hasUser && hasTeam);
}

function pickOpKabalaRows(data: Record<string, unknown>): unknown[] {
  return pickFilledDataset(data, 'OpKabalas', 'opKabalas', 'Kabalas', 'kabalas');
}

function pickOpKabalaAssetRows(data: Record<string, unknown>): unknown[] {
  const named = pickFilledDataset(
    data,
    'OpKabalaAssets',
    'opKabalaAssets',
    'KabalaAssets',
    'kabalaAssets'
  );
  return named.length ? named : pickFirstMatchingArray(data, looksLikeKabalaAssetRow);
}

function pickOpTeamRows(data: Record<string, unknown>): unknown[] {
  const named = pickFilledDataset(data, 'OpTeams', 'opTeams', 'Teams', 'tblTeam');
  return named.length ? named : pickFirstMatchingArray(data, looksLikeTeamRow);
}

function pickOpKabalaIdsFromKids(data: Record<string, unknown>): number[] {
  return pickDataset(data, 'OpSettingKabalas', 'opSettingKabalas', 'EventKabalas')
    .map((raw) => {
      if (typeof raw === 'number' || typeof raw === 'string') return nullableNumericId(raw);
      const rec = asRow(raw);
      if (!rec) return null;
      return nullableNumericId(rec.KabalaID ?? rec.KabalaId ?? rec.kabalaId ?? rec.id ?? rec.ID);
    })
    .filter((id): id is number => id != null);
}

function uniqueIds(...lists: number[][]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const list of lists) {
    for (const id of list || []) {
      if (id == null || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function pickOpExtraLiveRows(data: unknown): unknown[] {
  const named = pickFilledDataset(data, 'OpExtra', 'opExtra', 'OpExtraRun', 'opExtraRun');
  const out: unknown[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const rec = asRow(value);
    if (!rec) return;
    const kids = rec.Questions ?? rec.questions ?? rec.ExtraQuestions ?? rec.ExtraPool;
    if (Array.isArray(kids) && kids.length) {
      kids.forEach(push);
      return;
    }
    out.push(rec);
  };
  named.forEach(push);
  if (!data || typeof data !== 'object') return out;
  const rec = asRow((data as Record<string, unknown>).OpExtra ?? (data as Record<string, unknown>).opExtra);
  if (rec) push(rec);
  return out;
}

function overlayExtraMediaRows(base: unknown[], media: unknown[]): unknown[] {
  if (!base.length) return media;
  if (!media.length) return base;
  const byQuestion = new Map<number, Record<string, unknown>>();
  for (const raw of media) {
    const row = asRow(raw);
    if (!row) continue;
    const qid = nullableNumericId(row.QuestionID ?? row.questionID ?? row.id ?? row.ID);
    if (qid != null) byQuestion.set(qid, row);
  }
  return base.map((raw) => {
    const row = asRow(raw);
    if (!row) return raw;
    const qid = nullableNumericId(row.QuestionID ?? row.questionID ?? row.id ?? row.ID);
    const extra = qid != null ? byQuestion.get(qid) : undefined;
    if (!extra) return raw;
    return {
      ...row,
      AudioKey: row.AudioKey ?? row.audioKey ?? extra.AudioKey ?? extra.audioKey,
      AudioUrl: row.AudioUrl ?? row.audioUrl ?? extra.AudioUrl ?? extra.audioUrl,
      ImageKey: row.ImageKey ?? row.imageKey ?? extra.ImageKey ?? extra.imageKey,
      ImageUrl: row.ImageUrl ?? row.imageUrl ?? extra.ImageUrl ?? extra.imageUrl,
      MediaUrl: row.MediaUrl ?? row.mediaUrl ?? extra.MediaUrl ?? extra.mediaUrl,
    };
  });
}

function pickOpExtraCatalogRows(data: unknown): unknown[] {
  const catalog = pickFilledDataset(data, 'OpExtraCatalog', 'opExtraCatalog');
  const pointers = pickFilledDataset(
    data,
    'EventExtraQuestions',
    'OpEventExtraQuestions',
    'tblEventExtraQuestion'
  );
  if (catalog.length) return overlayExtraMediaRows(pointers, catalog);
  if (pointers.length) return pointers;
  const pool = pickDataset(data as Record<string, unknown>, 'OpExtraPool', 'opExtraPool');
  return pool.filter((raw) => {
    const row = asRow(raw);
    if (!row) return false;
    return (
      row.QuestionID != null ||
      row.questionID != null ||
      row.EventExtraQuestionID != null ||
      row.eventExtraQuestionID != null
    );
  });
}

function pickOpExtraPoolRows(data: unknown): unknown[] {
  const named = pickFilledDataset(
    data,
    'OpExtraPool',
    'opExtraPool',
    'OpExtraQuestions',
    'EventExtraQuestions',
    'OpEventExtraQuestions',
    'tblEventExtraQuestion'
  );
  if (named.length) return named;
  if (!data || typeof data !== 'object') return [];
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(val) || !val.length) continue;
    if (/^opextra$/i.test(key)) continue;
    if (/extrapool|extraquestion/i.test(key.replace(/[^a-z]/gi, ''))) return val;
  }
  return [];
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
  const response = await api.get('/op/master', { skipErrorNotify: true });
  const data = expandOpPayload(unwrapApiPayload(response.data));
  const topicRows = pickFilledDataset(data, 'OpTopics', 'opTopics', 'Topics');
  return {
    kabalas: normalizeOpCatalog(withKabalaAssets(pickOpKabalaRows(data), pickOpKabalaAssetRows(data))),
    topics: normalizeOpCatalog(topicRows.length ? topicRows : pickDataset(data, 'OpTopics', 'opTopics', 'Topics')),
  };
}

export async function fetchOpEvent(eventId: number | string): Promise<OpEventPayload> {
  const response = await api.get(`/op/event/${eventId}`, { skipErrorNotify: true });
  const data = expandOpPayload(unwrapApiPayload(response.data));
  throwIfApiFailed(data, 'Az Olimpub esemény betöltése sikertelen.');
  const questionRows = pickDataset(data, 'OpEventQuestions', 'opEventQuestions', 'EventQuestions');
  const questions = normalizeOpEventQuestions(questionRows, eventId);
  const extraPool = mergeOpExtraPool(
    normalizeOpExtraPool(pickOpExtraPoolRows(data), eventId),
    normalizeOpExtraPool(pickOpExtraLiveRows(data), eventId),
    questions
  );
  const repoQuestions = normalizeOpRepoQuestions(
    pickFilledDataset(data, 'OpQuestions', 'opQuestions', 'OpRepoQuestions', 'tblQuestion')
  );
  const extraCatalog = mergeOpExtraPool(
    normalizeOpExtraPool(pickOpExtraCatalogRows(data), eventId),
    extraCatalogFromRepo(repoQuestions, eventId),
    questions
  );
  enrichOpExtraMedia(extraCatalog, extraPool);
  enrichOpExtraMedia(extraPool, extraCatalog);
  const settings = normalizeOpSettings(pickDataset(data, 'OpSettings', 'opSettings'), eventId);
  const extraFromKids = uniqueOpExtraGameIds(
    pickDataset(data, 'OpExtraGames', 'OpSettingExtras', 'ExtraGames', 'OpSettingExtraGames').map((raw) => {
      if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
      if (!raw || typeof raw !== 'object') return '';
      const rec = raw as Record<string, unknown>;
      return String(
        rec.ExtraGameId ?? rec.extraGameId ?? rec.ExtraGameID ?? rec.Code ?? rec.Name ?? rec.name ?? rec.Id ?? rec.id ?? ''
      );
    })
  );
  const extraFromPool = extraPool.map((row) => row.ExtraGameId);
  const kabalaFromKids = pickOpKabalaIdsFromKids(data);
  if (settings.length) {
    settings[0] = {
      ...settings[0],
      ExtraGameIds: uniqueOpExtraGameIds(
        settings[0].ExtraGameIds,
        extraFromKids,
        extraFromPool,
        extraCatalog.map((row) => row.ExtraGameId)
      ),
      KabalaIds: uniqueIds(settings[0].KabalaIds, kabalaFromKids),
    };
  }
  return {
    settings,
    rounds: normalizeOpRounds(pickDataset(data, 'OpRounds', 'opRounds', 'Rounds'), eventId),
    questions,
    extraPool,
    extraCatalog,
    repoQuestions,
    teams: normalizeOpTeams(pickOpTeamRows(data), eventId),
    penalties: normalizeOpPenalties(
      pickDataset(data, 'OpPenalties', 'opPenalties', 'Penalties', 'tblPenalty')
    ),
    hasPenaltiesDataset: hasDatasetKey(data, 'OpPenalties', 'opPenalties', 'Penalties', 'tblPenalty'),
    teamMembers: (() => {
      const teamRows = pickOpTeamRows(data);
      const named = pickFilledDataset(
        data,
        'OpTeamMembers',
        'opTeamMembers',
        'TeamMembers',
        'tblTeamMember',
        'EventTeamMembers',
        'OpTeamMember'
      );
      const collected = collectOpTeamMemberRows(teamRows, named);
      return enrichOpTeamMembers(
        normalizeOpTeamMembers(
          collected.length ? collected : pickFirstMatchingArray(data, looksLikeTeamMemberRow)
        ),
        pickFilledDataset(
          data,
          'Users',
          'OpUsers',
          'tblUser',
          'EventUsers',
          'EventParticpants',
          'OpEventUsers'
        )
      );
    })(),
    live: normalizeOpLive(
      pickDataset(data, 'OpLive', 'opLive'),
      pickDataset(data, 'OpDisplayCast', 'DisplayCast', 'opDisplayCast')
    ),
    displayCast:
      (pickDataset(data, 'OpDisplayCast', 'DisplayCast', 'opDisplayCast')[0] as Record<string, unknown> | undefined) ||
      null,
  };
}

function pickLeaderboardRows(data: Record<string, unknown>): unknown[] {
  const direct = data.Rows ?? data.rows ?? data.Result2 ?? data.result2;
  if (Array.isArray(direct)) return direct;
  return pickFilledDataset(
    data,
    'Rows',
    'rows',
    'OpLeaderboard',
    'opLeaderboard',
    'Leaderboard',
    'LeaderboardRows'
  );
}

export async function fetchOpLeaderboard(
  eventId: number | string,
  board: OpLeaderboardBoard,
  opts?: { roundId?: number | null; extraGameId?: string | null }
): Promise<OpLeaderboardRow[]> {
  const raw = board === 'raw';
  const extraGameId = String(opts?.extraGameId || '').trim().toUpperCase() || undefined;
  const roundId = extraGameId ? undefined : opts?.roundId != null && opts.roundId > 0 ? opts.roundId : undefined;
  const params: Record<string, string | number> = extraGameId
    ? { board: 'games', ExtraGameId: extraGameId }
    : roundId != null
      ? { board: raw ? 'raw' : 'quiz', RoundId: roundId }
      : { board: raw ? 'quiz' : board };
  const pointMode: 'f' | 'raw' | 'extra' | 'points' = raw
    ? 'raw'
    : extraGameId || board === 'games'
      ? 'extra'
      : board === 'main'
        ? 'points'
        : 'f';
  const response = await api.get(`/op/leaderboard/${eventId}`, { params });
  const rows = Array.isArray(response.data)
    ? normalizeOpLeaderboardRows(response.data, pointMode)
    : (() => {
        const data = unwrapApiPayload(response.data);
        throwIfApiFailed(data, 'Az eredmények betöltése sikertelen.');
        return normalizeOpLeaderboardRows(pickLeaderboardRows(data), pointMode);
      })();
  return filterOpLeaderboardRows(rows, { extraGameId, roundId });
}

export async function showOpLeaderboard(
  eventId: number,
  board: OpLeaderboardBoard,
  opts?: { roundId?: number | null; extraGameId?: string | null }
): Promise<unknown> {
  const extraGameId = String(opts?.extraGameId || '').trim().toUpperCase() || undefined;
  const roundId = extraGameId ? undefined : opts?.roundId != null && opts.roundId > 0 ? opts.roundId : undefined;
  const raw = board === 'raw';
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.ShowLeaderboard',
    Payload: extraGameId
      ? { Board: 'games', ExtraGameId: extraGameId }
      : roundId != null
        ? { Board: raw ? 'raw' : 'quiz', RoundId: roundId }
        : { Board: raw ? 'quiz' : board },
  });
}

export async function castOpDisplay(
  eventId: number,
  faceOrPayload: string | Record<string, unknown>
): Promise<unknown> {
  const payload =
    typeof faceOrPayload === 'string'
      ? { Face: faceOrPayload, face: faceOrPayload }
      : {
          Face: faceOrPayload.Face ?? faceOrPayload.face,
          face: faceOrPayload.Face ?? faceOrPayload.face,
          ...faceOrPayload,
        };
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.CastDisplay',
    Payload: payload,
  });
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

export async function setOpCurrent(eventId: number, current: boolean): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.SetCurrent',
    Payload: { Current: current },
  });
}

export async function leaveOpTeam(eventId: number): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.LeaveTeam',
    Payload: {},
  });
}

export async function pauseOpQuestion(
  eventId: number,
  input: { eventQuestionId?: number | null; extraQuestionId?: number | null; hold: boolean; leftMs: number }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.PauseQuestion',
    Payload: {
      EventQuestionID: input.eventQuestionId,
      QuestionId: input.eventQuestionId,
      QuestionID: input.eventQuestionId,
      ExtraQuestionID: input.extraQuestionId,
      ExtraQuestionId: input.extraQuestionId,
      Hold: input.hold,
      LeftMs: Math.max(0, Math.round(input.leftMs)),
    },
  });
}

export async function reactOp(eventId: number, glyph: string): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.React',
    Payload: { Glyph: glyph },
  });
}

export async function submitOpAnswer(
  eventId: number,
  input: {
    eventQuestionId: number;
    items: unknown;
    correct: boolean;
    ratio: number;
    elapsedMs: number;
    extra?: boolean;
  }
): Promise<unknown> {
  const ratio = Math.max(0, Math.min(1, input.ratio));
  const extra = Boolean(input.extra);
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.SubmitAnswer',
    Payload: {
      Kind: extra ? 'extra' : 'round',
      EventQuestionID: extra ? undefined : input.eventQuestionId,
      ExtraQuestionId: extra ? input.eventQuestionId : undefined,
      QuestionId: input.eventQuestionId,
      QuestionID: input.eventQuestionId,
      Items: input.items,
      Correct: input.correct,
      Ratio: ratio,
      ElapsedMs: Math.max(0, Math.round(input.elapsedMs)),
    },
  });
}

export async function joinOpTeam(
  eventId: number,
  teamId: number,
  kabalaId?: number | null
): Promise<unknown> {
  const payload: Record<string, number> = { TeamID: teamId };
  if (kabalaId != null) payload.KabalaID = kabalaId;
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.JoinTeam',
    Payload: payload,
  });
}

function liveControlPayload(input: {
  eventQuestionId?: number | null;
  roundId?: number | null;
  stateVersion?: number | null;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...input.extra };
  if (input.eventQuestionId != null) {
    payload.EventQuestionID = input.eventQuestionId;
    payload.QuestionId = input.eventQuestionId;
    payload.QuestionID = input.eventQuestionId;
  }
  if (input.roundId != null) {
    payload.RoundID = input.roundId;
    payload.RoundId = input.roundId;
  }
  if (input.stateVersion != null && input.stateVersion > 0) {
    payload.ExpectedStateVersion = input.stateVersion;
  }
  return payload;
}

export async function startOpQuestion(
  eventId: number,
  input: { eventQuestionId: number; roundId?: number | null; stateVersion?: number | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StartQuestion',
    Payload: liveControlPayload(input),
  });
}

export async function stopOpQuestion(
  eventId: number,
  input: { eventQuestionId: number; stateVersion?: number | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StopQuestion',
    Payload: liveControlPayload({ ...input, extra: { Kind: 'round' } }),
  });
}

export async function nextOpQuestion(
  eventId: number,
  input: { roundId: number; stateVersion?: number | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.NextQuestion',
    Payload: liveControlPayload(input),
  });
}

export async function reopenOpQuestion(
  eventId: number,
  input: { eventQuestionId: number; stateVersion?: number | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.ReopenQuestion',
    Payload: liveControlPayload(input),
  });
}

export async function closeOpRound(
  eventId: number,
  input: { roundId: number; stateVersion?: number | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.CloseRound',
    Payload: liveControlPayload(input),
  });
}

export async function resetOpRound(
  eventId: number,
  input: { roundId: number; stateVersion?: number | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.ResetRound',
    Payload: liveControlPayload(input),
  });
}

export async function resetOpExtra(
  eventId: number,
  input: { extraRunId?: number | null; extraGameId?: string | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.ResetExtra',
    Payload: {
      ExtraRunId: input.extraRunId,
      ExtraRunID: input.extraRunId,
      ExtraGameId: input.extraGameId,
    },
  });
}

export async function startOpExtra(eventId: number, extraGameId: string): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StartExtra',
    Payload: { ExtraGameId: extraGameId },
  });
}

export async function stopOpExtra(
  eventId: number,
  input: { extraRunId?: number | null; extraGameId?: string | null }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StopExtra',
    Payload: {
      ExtraRunId: input.extraRunId,
      ExtraRunID: input.extraRunId,
      ExtraGameId: input.extraGameId,
    },
  });
}

export async function startOpExtraQuestion(eventId: number, extraQuestionId: number): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StartExtraQuestion',
    Payload: { ExtraQuestionId: extraQuestionId, ExtraQuestionID: extraQuestionId },
  });
}

export async function stopOpExtraQuestion(eventId: number, extraQuestionId: number): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StopExtraQuestion',
    Payload: { ExtraQuestionId: extraQuestionId, ExtraQuestionID: extraQuestionId, Kind: 'extra' },
  });
}

export async function mosaicBuzzOp(
  eventId: number,
  extraQuestionId?: number | null,
  extra?: {
    leftMs?: number;
    teamId?: number | null;
    teamName?: string;
    nickname?: string;
    eventUserId?: number | null;
  }
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.MosaicBuzz',
    Payload: {
      ExtraQuestionID: extraQuestionId,
      ExtraQuestionId: extraQuestionId,
      Hold: true,
      LeftMs: extra?.leftMs != null ? Math.max(0, Math.round(extra.leftMs)) : undefined,
      TeamID: extra?.teamId,
      TeamName: extra?.teamName,
      Nickname: extra?.nickname,
      EventUserID: extra?.eventUserId,
    },
  });
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
