import { api } from 'src/boot/axios';
import { displayAuthHeaders } from 'src/modules/profitability/ptaDisplayApi';
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
  type OpCatalogItem,
  type OpEventQuestion,
  type OpEventSettings,
  type OpLeaderboardBoard,
  type OpLeaderboardRow,
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
  repoQuestions: OpRepoQuestion[];
  teams: OpTeam[];
  teamMembers: OpTeamMember[];
  penalties: OpPenalty[];
  hasPenaltiesDataset: boolean;
  /** Hamis, ha a válasz nem hozta az `OpEventQuestions` datasetet (könnyű, csak állapotot adó betöltés). */
  hasQuestionsDataset: boolean;
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

/** PIN-es TV: nincs JWT, a kivetítő token visz. */
function kioskHeaders(eventId: number | string): Record<string, string> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('token')) return {};
  return displayAuthHeaders(eventId);
}

/**
 * `live: true` → `?scope=live`: a BE-től csak az állapotot (hol tartunk, következő…) kérjük, kérdések nélkül.
 * Ha a BE nem ismeri a paramétert, a teljes választ adja, amit az FE ugyanúgy feldolgoz.
 */
export async function fetchOpEvent(
  eventId: number | string,
  opts?: { live?: boolean }
): Promise<OpEventPayload> {
  const response = await api.get(`/op/event/${eventId}`, {
    skipErrorNotify: true,
    headers: kioskHeaders(eventId),
    ...(opts?.live ? { params: { scope: 'live' } } : {}),
  });
  const data = expandOpPayload(unwrapApiPayload(response.data));
  throwIfApiFailed(data, 'Az Olimpub esemény betöltése sikertelen.');
  const questionRows = pickDataset(data, 'OpEventQuestions', 'opEventQuestions', 'EventQuestions');
  const questions = normalizeOpEventQuestions(questionRows, eventId);
  const repoQuestions = normalizeOpRepoQuestions(
    pickFilledDataset(data, 'OpQuestions', 'opQuestions', 'OpRepoQuestions', 'tblQuestion')
  );
  const settings = normalizeOpSettings(pickDataset(data, 'OpSettings', 'opSettings'), eventId);
  const kabalaFromKids = pickOpKabalaIdsFromKids(data);
  if (settings.length) {
    settings[0] = {
      ...settings[0],
      KabalaIds: uniqueIds(settings[0].KabalaIds, kabalaFromKids),
    };
  }
  return {
    settings,
    rounds: normalizeOpRounds(pickDataset(data, 'OpRounds', 'opRounds', 'Rounds'), eventId),
    questions,
    repoQuestions,
    teams: normalizeOpTeams(pickOpTeamRows(data), eventId),
    penalties: normalizeOpPenalties(
      pickDataset(data, 'OpPenalties', 'opPenalties', 'Penalties', 'tblPenalty')
    ),
    hasPenaltiesDataset: hasDatasetKey(data, 'OpPenalties', 'opPenalties', 'Penalties', 'tblPenalty'),
    hasQuestionsDataset: hasDatasetKey(data, 'OpEventQuestions', 'opEventQuestions', 'EventQuestions'),
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
  const roundId = opts?.roundId != null && opts.roundId > 0 ? opts.roundId : undefined;
  const games = board === 'games';
  const params: Record<string, string | number> =
    games && roundId != null
      ? { board: 'games', RoundID: roundId, RoundId: roundId }
      : roundId != null
        ? { board: raw ? 'raw' : 'quiz', RoundId: roundId }
        : { board: raw ? 'quiz' : board };
  const pointMode: 'f' | 'raw' | 'extra' | 'points' = raw
    ? 'raw'
    : games
      ? 'extra'
      : board === 'main'
        ? 'points'
        : 'f';
  const response = await api.get(`/op/leaderboard/${eventId}`, { params, headers: kioskHeaders(eventId) });
  const rows = Array.isArray(response.data)
    ? normalizeOpLeaderboardRows(response.data, pointMode)
    : (() => {
        const data = unwrapApiPayload(response.data);
        throwIfApiFailed(data, 'Az eredmények betöltése sikertelen.');
        return normalizeOpLeaderboardRows(pickLeaderboardRows(data), pointMode);
      })();
  return filterOpLeaderboardRows(rows, { roundId });
}

export async function showOpLeaderboard(
  eventId: number,
  board: OpLeaderboardBoard,
  opts?: { roundId?: number | null; extraGameId?: string | null }
): Promise<unknown> {
  const roundId = opts?.roundId != null && opts.roundId > 0 ? opts.roundId : undefined;
  const raw = board === 'raw';
  const games = board === 'games';
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.ShowLeaderboard',
    Payload:
      games && roundId != null
        ? { Board: 'games', RoundID: roundId, RoundId: roundId }
        : roundId != null
          ? { Board: raw ? 'raw' : 'quiz', RoundId: roundId }
          : { Board: raw ? 'quiz' : board },
  });
}

export async function showOpScreen(
  eventId: number,
  action: 'Op.ShowLobby' | 'Op.ShowTopics' | 'Op.ShowDraw',
  payload: Record<string, unknown>
): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: action,
    Payload: payload,
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

/** Játékos képernyő: `idle` = QM a katalógusban (váró), `lobby` = kör nyitva (szünet), `results`. Nem TV-vetítés. */
export async function setOpPlayerFace(eventId: number, face: string): Promise<unknown> {
  const response = await api.post(
    '/op/game/change',
    { EventID: eventId, Action: 'Op.SetPlayerFace', Payload: { Face: face } },
    { skipErrorNotify: true }
  );
  throwIfApiFailed(response.data, 'A játékos képernyő nem váltott.');
  return unwrapApiPayload(response.data);
}

export async function leaveOpTeam(eventId: number): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.LeaveTeam',
    Payload: {},
  });
}

/** Kvízmester / szervező: csapattagság törlése. Játékos nélkül mindenkié, `eventUserId`-val csak az adott játékosé. */
export async function clearOpTeamMembers(eventId: number, eventUserId?: number | null): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.ClearTeamMembers',
    Payload: eventUserId != null ? { EventUserID: eventUserId } : {},
  });
}

/** Kvízmester / szervező: a kijelzők leválasztása. `displayId` nélkül mindegyiké. A BE érvényteleníti a tokent. */
export async function disconnectOpDisplays(eventId: number, displayId?: number | null): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.DisconnectDisplays',
    Payload: displayId != null ? { DisplayID: displayId } : {},
  });
}

export interface OpConnectedPlayer {
  eventUserId: number;
  nickname: string;
  teamId: number | null;
  teamName: string;
  online: boolean;
  deviceCount: number;
  lastSeenUtc: string;
}

export interface OpConnectedDisplay {
  displayId: number;
  label: string;
  online: boolean;
  connectionCount: number;
  connectedAtUtc: string;
  lastSeenUtc: string;
}

export interface OpConnections {
  players: OpConnectedPlayer[];
  displays: OpConnectedDisplay[];
  playersOnline: number;
  playersInTeams: number;
  displaysOnline: number;
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || String(value ?? '').toLowerCase() === 'true';
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** GET /op/connections/{eventId}: csak kvízmester / szervező. Játékosok EventUserID szerint, kijelzők DisplayID szerint. */
export async function fetchOpConnections(eventId: number): Promise<OpConnections> {
  const response = await api.get(`/op/connections/${eventId}`, { skipErrorNotify: true });
  const data = unwrapApiPayload(response.data);
  throwIfApiFailed(data, 'A kapcsolatok betöltése sikertelen.');
  /* Diagnosztika: üres lista esetén a Console-ban látszik, mit adott a szerver. */
  console.info('[op connections]', { eventId, status: response.status, keys: Object.keys(data), data: response.data });
  const players = pickDataset(data, 'Players', 'OpPlayers', 'Result1')
    .map(recordOf)
    .map((row) => ({
      eventUserId: nullableNumericId(row.EventUserID ?? row.eventUserID ?? row.EventUserId) ?? 0,
      nickname: String(row.Nickname ?? row.nickname ?? '').trim(),
      teamId: nullableNumericId(row.TeamID ?? row.teamID ?? row.TeamId),
      teamName: String(row.TeamName ?? row.teamName ?? '').trim(),
      online: flag(row.Online ?? row.online),
      deviceCount: Number(row.DeviceCount ?? row.deviceCount) || 0,
      lastSeenUtc: String(row.LastSeenUtc ?? row.lastSeenUtc ?? ''),
    }))
    .filter((row) => row.eventUserId > 0);
  const displays = pickDataset(data, 'Displays', 'OpDisplays', 'Result2')
    .map(recordOf)
    .map((row, index) => ({
      displayId: nullableNumericId(row.DisplayID ?? row.displayID ?? row.DisplayId) ?? 0,
      label: String(row.Label ?? row.label ?? '').trim() || `Kijelző ${index + 1}`,
      online: flag(row.Online ?? row.online),
      connectionCount: Number(row.ConnectionCount ?? row.connectionCount) || 0,
      connectedAtUtc: String(row.ConnectedAtUtc ?? row.connectedAtUtc ?? ''),
      lastSeenUtc: String(row.LastSeenUtc ?? row.lastSeenUtc ?? ''),
    }))
    .filter((row) => row.displayId > 0);
  const totals = recordOf(data.Totals ?? data.totals);
  return {
    players,
    displays,
    playersOnline: Number(totals.PlayersOnline ?? totals.playersOnline) || players.filter((row) => row.online).length,
    playersInTeams: Number(totals.PlayersInTeams ?? totals.playersInTeams) || players.filter((row) => row.teamId != null).length,
    displaysOnline: Number(totals.DisplaysOnline ?? totals.displaysOnline) || displays.filter((row) => row.online).length,
  };
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

export async function startOpRound(eventId: number, roundId: number): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StartRound',
    Payload: { RoundID: roundId, RoundId: roundId },
  });
}

export async function startOpClock(eventId: number, eventQuestionId: number): Promise<unknown> {
  return postOpGameChange({
    EventID: eventId,
    Action: 'Op.StartClock',
    Payload: { EventQuestionID: eventQuestionId, EventQuestionId: eventQuestionId },
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
