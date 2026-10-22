export type OpDisplayFace = 'join' | 'topics' | 'draw' | 'lobby' | 'question' | 'results';

export type OpDisplayClockPhase = '' | 'ready' | 'read' | 'play' | 'paused' | 'done';

export type OpRevealMode = 'off' | 'auto' | 'finale' | 'ceremony';

export interface OpDisplayTopic {
  id: string;
  title: string;
}

export interface OpDisplayRow {
  name: string;
  team: string;
  points: number;
  previousPoints: number;
}

export interface OpDisplayLobbyMember {
  nickname: string;
  /** false = a BE szerint nincs csatlakozva (szürke). Hiányzik = online. */
  online?: boolean;
}

export interface OpDisplayLobbyTeam {
  id: number;
  name: string;
  imageUrl: string;
  members: OpDisplayLobbyMember[];
}

export interface OpDisplayCommand {
  face: OpDisplayFace;
  kind: 'quiz' | 'game';
  nonce: number;
  title: string;
  board: string;
  roundId: number | null;
  extraGameId: string;
  scoreScope: 'round' | 'game' | 'total';
  topics: OpDisplayTopic[];
  prompt: string;
  sortLabel: string;
  rows: OpDisplayRow[];
  sample: boolean;
  clockPhase: OpDisplayClockPhase;
  clockTotalMs: number;
  clockLeftMs: number;
  clockEndsAt: number;
  clockHold: boolean;
  podiumStep: number;
  revealMode: OpRevealMode;
  revealCount: number;
  revealEveryMs: number;
  revealStartedAt: number;
  type: string;
  answers: string[];
  matches: string[];
  categories: string[];
  mediaUrl: string;
  timeSec: number;
  teams: OpDisplayLobbyTeam[];
  answerCount: number | null;
  rosterCount: number | null;
  reactGlyph: string;
  reactAt: number;
  scoreDecimals: number;
  showCorrect: boolean;
  corrects: boolean[];
  correctText: string;
  tipName: string;
  tipTeam: string;
  mosaicOutTeamIds: number[];
}

export function emptyOpDisplayCommand(): OpDisplayCommand {
  return {
    face: 'topics',
    kind: 'quiz',
    nonce: 0,
    title: '',
    board: '',
    roundId: null,
    extraGameId: '',
    scoreScope: 'total',
    topics: [],
    prompt: '',
    sortLabel: '',
    rows: [],
    sample: false,
    clockPhase: '',
    clockTotalMs: 0,
    clockLeftMs: 0,
    clockEndsAt: 0,
    clockHold: false,
    podiumStep: -1,
    revealMode: 'off',
    revealCount: 0,
    revealEveryMs: 0,
    revealStartedAt: 0,
    type: '',
    answers: [],
    matches: [],
    categories: [],
    mediaUrl: '',
    timeSec: 0,
    teams: [],
    answerCount: null,
    rosterCount: null,
    reactGlyph: '',
    reactAt: 0,
    scoreDecimals: 0,
    showCorrect: false,
    corrects: [],
    correctText: '',
    tipName: '',
    tipTeam: '',
    mosaicOutTeamIds: [],
  };
}

function asCommand(value: Partial<OpDisplayCommand> | null | undefined): OpDisplayCommand | null {
  if (!value || !value.face) return null;
  return {
    ...emptyOpDisplayCommand(),
    ...value,
    topics: value.topics || [],
    rows: (value.rows || []).map((row) => ({
      name: row.name,
      team: row.team || '',
      points: Number(row.points) || 0,
      previousPoints: Number(row.previousPoints) || 0,
    })),
    answers: value.answers || [],
    matches: value.matches || [],
    categories: value.categories || [],
    corrects: value.corrects || [],
    teams: value.teams || [],
    mosaicOutTeamIds: value.mosaicOutTeamIds || [],
    board: String(value.board || ''),
    roundId: value.roundId ?? null,
    extraGameId: String(value.extraGameId || '').trim().toUpperCase(),
    scoreScope:
      value.scoreScope === 'round' || value.scoreScope === 'game' || value.scoreScope === 'total'
        ? value.scoreScope
        : value.roundId
          ? 'round'
          : String(value.extraGameId || '').trim()
            ? 'game'
            : 'total',
  };
}

export function displayScoreScope(command: {
  scoreScope?: 'round' | 'game' | 'total';
  roundId?: number | null;
  extraGameId?: string;
}): 'round' | 'game' | 'total' {
  if (command.scoreScope === 'round' || command.scoreScope === 'game' || command.scoreScope === 'total') {
    return command.scoreScope;
  }
  if (command.roundId) return 'round';
  if (String(command.extraGameId || '').trim()) return 'game';
  return 'total';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function flattenCast(raw: unknown): Record<string, unknown> {
  const cast = asRecord(raw) || {};
  const nested = asRecord(cast.Payload) || asRecord(cast.payload);
  let json: Record<string, unknown> | null = null;
  const blob = cast.PayloadJson ?? cast.payloadJson ?? nested?.PayloadJson ?? nested?.payloadJson;
  if (typeof blob === 'string' && blob.trim()) {
    try {
      json = asRecord(JSON.parse(blob));
    } catch {
      json = null;
    }
  } else {
    json = asRecord(blob);
  }
  return { ...cast, ...(nested || {}), ...(json || {}) };
}

export interface OpNextCue {
  no: number;
  total: number;
  typeCode: string;
}

/**
 * A kvízmester a lobby Castban elküldi, hányadik kérdés jön és milyen típusú (`Next`).
 * A játékos a GET `DisplayCast` sorából olvassa, a pending kérdéseket ugyanis nem kapja meg.
 */
export function readOpNextCue(raw: unknown): OpNextCue | null {
  const src = flattenCast(raw);
  const face = String(src.Face ?? src.face ?? '').trim().toLowerCase();
  if (face !== 'lobby') return null;
  const next = asRecord(src.Next) || asRecord(src.next);
  if (!next) return null;
  const no = Number(next.No ?? next.no);
  const total = Number(next.Total ?? next.total);
  if (!Number.isFinite(no) || !Number.isFinite(total) || no < 1 || total < 1 || no > total) return null;
  return { no, total, typeCode: String(next.TypeCode ?? next.typeCode ?? '').trim() };
}

function castRows(raw: unknown): OpDisplayRow[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const name = String(row.Name ?? row.name ?? '').trim();
      if (!name) return null;
      return {
        name,
        team: String(row.Team ?? row.team ?? row.TeamName ?? row.teamName ?? '').trim(),
        points: Number(row.Points ?? row.points ?? row.F ?? row.f ?? 0) || 0,
        previousPoints: Number(row.PreviousPoints ?? row.previousPoints ?? 0) || 0,
      };
    })
    .filter((row): row is OpDisplayRow => Boolean(row));
}

function castStrings(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((item) => String(item ?? '')) : [];
}

function castTopics(raw: unknown): OpDisplayTopic[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const title = String(row.title ?? row.Title ?? row.TopicName ?? '').trim();
      if (!title) return null;
      return { id: String(row.id ?? row.Id ?? row.ID ?? title), title };
    })
    .filter((row): row is OpDisplayTopic => Boolean(row));
}

function castTeams(raw: unknown): OpDisplayLobbyTeam[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item): OpDisplayLobbyTeam | null => {
      const row = asRecord(item);
      if (!row) return null;
      const members = (Array.isArray(row.members ?? row.Members) ? (row.members ?? row.Members) : []) as unknown[];
      return {
        id: Number(row.id ?? row.Id ?? row.ID ?? row.TeamID) || 0,
        name: String(row.name ?? row.Name ?? ''),
        imageUrl: String(row.imageUrl ?? row.ImageUrl ?? ''),
        members: members
          .map((member) => asRecord(member))
          .filter((member): member is Record<string, unknown> => Boolean(member))
          .map((member) => ({
            nickname: String(member.nickname ?? member.Nickname ?? ''),
            online: (member.online ?? member.Online) !== false,
          })),
      };
    })
    .filter((row): row is OpDisplayLobbyTeam => Boolean(row));
}

function castCount(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function commandToCastPayload(command: OpDisplayCommand): Record<string, unknown> {
  const extraGameId = String(command.extraGameId || '').trim().toUpperCase();
  const roundId = command.roundId != null && command.roundId > 0 ? command.roundId : null;
  const scoreScope = displayScoreScope(command);
  const board =
    command.board ||
    (scoreScope === 'game' || command.kind === 'game' ? 'games' : 'quiz');
  return {
    Face: command.face,
    face: command.face,
    Kind: command.kind,
    Board: board,
    ScoreScope: scoreScope,
    Scope: scoreScope === 'round' ? 'round' : 'total',
    RoundID: roundId || undefined,
    RoundId: roundId || undefined,
    ExtraGameId: extraGameId || undefined,
    extraGameId: extraGameId || undefined,
    Title: command.title,
    Prompt: command.prompt,
    SortLabel: command.sortLabel,
    Type: command.type,
    Rows: command.rows.map((row, index) => ({
      Name: row.name,
      Team: row.team,
      Points: row.points,
      PreviousPoints: row.previousPoints,
      Place: index + 1,
    })),
    RevealMode: command.revealMode,
    RevealCount: command.revealCount,
    RevealEveryMs: command.revealEveryMs,
    RevealStartedAt: command.revealStartedAt,
    PodiumStep: command.podiumStep,
    Sample: command.sample,
    ScoreDecimals: command.scoreDecimals,
    ClockPhase: command.clockPhase,
    ClockHold: command.clockHold,
    ClockLeftMs: command.clockLeftMs,
    ClockTotalMs: command.clockTotalMs,
    ClockEndsAt: command.clockEndsAt,
    TipName: command.tipName,
    TipTeam: command.tipTeam,
    MosaicOutTeamIds: command.mosaicOutTeamIds,
    Topics: command.topics,
    Teams: command.teams,
    Answers: command.answers,
    Matches: command.matches,
    Categories: command.categories,
    MediaUrl: command.mediaUrl,
    TimeSec: command.timeSec,
    AnswerCount: command.answerCount,
    RosterCount: command.rosterCount,
    ShowCorrect: command.showCorrect,
    Corrects: command.corrects,
    CorrectText: command.correctText,
    Nonce: command.nonce,
  };
}

export function commandFromCast(raw: unknown): OpDisplayCommand | null {
  const src = flattenCast(raw);
  const face = String(src.Face ?? src.face ?? '').trim().toLowerCase();
  if (!['join', 'topics', 'draw', 'lobby', 'question', 'results'].includes(face)) return null;
  const kind = String(src.Kind ?? src.kind ?? '').trim().toLowerCase() === 'game' ? 'game' : 'quiz';
  const board = String(src.Board ?? src.board ?? '').trim().toLowerCase();
  const extraGameId = String(src.ExtraGameId ?? src.extraGameId ?? src.ExtraGameID ?? '')
    .trim()
    .toUpperCase();
  const roundId = Number(src.RoundID ?? src.roundId ?? src.RoundId);
  const scopeRaw = String(src.ScoreScope ?? src.scoreScope ?? '')
    .trim()
    .toLowerCase();
  const scoreScope: OpDisplayCommand['scoreScope'] = extraGameId
    ? 'game'
    : Number.isFinite(roundId) && roundId > 0
      ? 'round'
      : scopeRaw === 'round' || scopeRaw === 'game' || scopeRaw === 'total'
        ? scopeRaw
        : 'total';
  return asCommand({
    face: face as OpDisplayFace,
    kind,
    board: board || (scoreScope === 'game' || kind === 'game' ? 'games' : 'quiz'),
    extraGameId,
    roundId: Number.isFinite(roundId) && roundId > 0 ? roundId : null,
    scoreScope,
    title: String(src.Title ?? src.title ?? ''),
    prompt: String(src.Prompt ?? src.prompt ?? ''),
    sortLabel: String(src.SortLabel ?? src.sortLabel ?? ''),
    type: String(src.Type ?? src.type ?? ''),
    rows: castRows(src.Rows ?? src.rows),
    sample: Boolean(src.Sample ?? src.sample),
    scoreDecimals: Number(src.ScoreDecimals ?? src.scoreDecimals) === 2 ? 2 : 0,
    revealMode: String(src.RevealMode ?? src.revealMode ?? 'off') as OpRevealMode,
    revealCount: Number(src.RevealCount ?? src.revealCount) || 0,
    revealEveryMs: Number(src.RevealEveryMs ?? src.revealEveryMs) || 0,
    revealStartedAt: Number(src.RevealStartedAt ?? src.revealStartedAt) || 0,
    podiumStep: Number(src.PodiumStep ?? src.podiumStep ?? -1),
    clockPhase: String(src.ClockPhase ?? src.clockPhase ?? '') as OpDisplayClockPhase,
    clockHold: Boolean(src.ClockHold ?? src.clockHold),
    clockLeftMs: Number(src.ClockLeftMs ?? src.clockLeftMs) || 0,
    clockTotalMs: Number(src.ClockTotalMs ?? src.clockTotalMs) || 0,
    clockEndsAt: Number(src.ClockEndsAt ?? src.clockEndsAt) || 0,
    tipName: String(src.TipName ?? src.tipName ?? ''),
    tipTeam: String(src.TipTeam ?? src.tipTeam ?? ''),
    mosaicOutTeamIds: (Array.isArray(src.MosaicOutTeamIds ?? src.mosaicOutTeamIds)
      ? ((src.MosaicOutTeamIds ?? src.mosaicOutTeamIds) as unknown[])
      : []
    )
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0),
    topics: castTopics(src.Topics ?? src.topics),
    teams: castTeams(src.Teams ?? src.teams),
    answers: castStrings(src.Answers ?? src.answers),
    matches: castStrings(src.Matches ?? src.matches),
    categories: castStrings(src.Categories ?? src.categories),
    mediaUrl: String(src.MediaUrl ?? src.mediaUrl ?? ''),
    timeSec: Number(src.TimeSec ?? src.timeSec) || 0,
    answerCount: castCount(src.AnswerCount ?? src.answerCount),
    rosterCount: castCount(src.RosterCount ?? src.rosterCount),
    showCorrect: Boolean(src.ShowCorrect ?? src.showCorrect),
    corrects: (Array.isArray(src.Corrects ?? src.corrects) ? ((src.Corrects ?? src.corrects) as unknown[]) : []).map(
      (value) => value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
    ),
    correctText: String(src.CorrectText ?? src.correctText ?? ''),
    nonce: Number(src.Nonce ?? src.nonce) || 0,
  });
}

export type OpPlayerFace = 'idle' | 'lobby' | 'results' | '';
