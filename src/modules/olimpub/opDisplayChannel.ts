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

const KEY = (eventId: string | number) => `opDisplayCommand:${eventId}`;
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('opDisplayCommand') : null;

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
    nonce: Number(src.Nonce ?? src.nonce) || 0,
  });
}

export function publishOpDisplay(eventId: string | number, command: OpDisplayCommand) {
  const raw = JSON.stringify(command);
  try {
    localStorage.setItem(KEY(eventId), raw);
  } catch {
    /* ignore */
  }
  try {
    channel?.postMessage({ eventId: Number(eventId), command });
  } catch {
    /* ignore */
  }
}

export function readOpDisplay(eventId: string | number): OpDisplayCommand | null {
  try {
    const raw = localStorage.getItem(KEY(eventId));
    if (!raw) return null;
    return asCommand(JSON.parse(raw) as OpDisplayCommand);
  } catch {
    return null;
  }
}

export function onOpDisplay(listener: (eventId: number, command: OpDisplayCommand) => void): () => void {
  const seen = new Map<string, number>();
  const emit = (id: number, command: OpDisplayCommand) => {
    const stamp = `${id}:${command.nonce}:${command.reactAt}:${command.answerCount}`;
    const prev = seen.get(stamp) || 0;
    if (Date.now() - prev < 400) return;
    seen.set(stamp, Date.now());
    listener(id, command);
  };
  const onStorage = (event: StorageEvent) => {
    const key = String(event.key || '');
    if (!key.startsWith('opDisplayCommand:') || !event.newValue) return;
    const id = Number(key.slice('opDisplayCommand:'.length));
    if (!Number.isFinite(id)) return;
    try {
      const command = asCommand(JSON.parse(event.newValue) as OpDisplayCommand);
      if (command) emit(id, command);
    } catch {
      /* ignore */
    }
  };
  const onMessage = (event: MessageEvent) => {
    const id = Number(event.data?.eventId);
    const command = asCommand(event.data?.command as OpDisplayCommand);
    if (!Number.isFinite(id) || !command) return;
    emit(id, command);
  };
  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onMessage);
  };
}

const PLAYER_FACE_KEY = (eventId: string | number) => `opPlayerFace:${eventId}`;
const playerFaceChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('opPlayerFace') : null;

export type OpPlayerFace = 'idle' | 'lobby' | 'results' | '';

export function writeOpPlayerFace(eventId: string | number, face: OpPlayerFace) {
  const id = String(eventId);
  try {
    if (face) localStorage.setItem(PLAYER_FACE_KEY(id), face);
    else localStorage.removeItem(PLAYER_FACE_KEY(id));
  } catch {
    /* private mode */
  }
  playerFaceChannel?.postMessage({ eventId: id, face });
}

export function readOpPlayerFace(eventId: string | number): OpPlayerFace {
  try {
    const face = String(localStorage.getItem(PLAYER_FACE_KEY(eventId)) || '').trim().toLowerCase();
    if (face === 'idle' || face === 'lobby' || face === 'results') return face;
  } catch {
    /* private mode */
  }
  return '';
}

export function onOpPlayerFace(listener: (eventId: string, face: OpPlayerFace) => void) {
  const onStorage = (event: StorageEvent) => {
    const key = String(event.key || '');
    if (!key.startsWith('opPlayerFace:')) return;
    const id = key.slice('opPlayerFace:'.length);
    const face = String(event.newValue || '').trim().toLowerCase();
    listener(id, face === 'idle' || face === 'lobby' || face === 'results' ? face : '');
  };
  const onMessage = (event: MessageEvent) => {
    const id = String(event.data?.eventId || '');
    const face = String(event.data?.face || '').trim().toLowerCase();
    if (!id) return;
    listener(id, face === 'idle' || face === 'lobby' || face === 'results' ? face : '');
  };
  window.addEventListener('storage', onStorage);
  playerFaceChannel?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('storage', onStorage);
    playerFaceChannel?.removeEventListener('message', onMessage);
  };
}
