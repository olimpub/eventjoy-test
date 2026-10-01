import { isTruthyFlag, nullableNumericId } from 'src/utils/apiPayload';
import {
  explicitOpExtraGameId,
  matchOpExtraGame,
  normalizeOpTypeCode,
  opDefaultTimeSec,
  topicOpExtraGameId,
} from './constants';

export function eventTypeHasOpFlag(eventType: Record<string, unknown> | null | undefined): boolean {
  if (!eventType) return false;
  return isTruthyFlag(eventType.OPFlg ?? eventType.OpFlg ?? eventType.opFlg);
}

export function eventTypeIdOf(event: Record<string, unknown> | null | undefined): number | null {
  if (!event) return null;
  const raw = event.EventTypeID ?? event.eventTypeId ?? event.EventTypeId;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface OpCatalogItem {
  id: number;
  Name: string;
  ImageUrl: string | null;
  FullUrl: string | null;
  ActiveFlg: boolean;
}

export interface OpEventSettings {
  EventID: number;
  DeskCountHint: number | null;
  MaxTeamSize: number;
  PlannedDurationMin: number;
  ShadowAwardFlg: boolean;
  CurrentFlg: boolean;
  TopicIds: number[];
  ExtraGameIds: string[];
  KabalaIds: number[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseIdList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => nullableNumericId(typeof item === 'object' && item ? (item as Record<string, unknown>).id ?? (item as Record<string, unknown>).ID ?? item : item))
      .filter((id): id is number => id != null);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      return parseIdList(JSON.parse(text));
    } catch {
      return text
        .split(/[,\s]+/)
        .map((part) => nullableNumericId(part))
        .filter((id): id is number => id != null);
    }
  }
  return [];
}

function extraIdFromUnknown(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  const row = asRecord(value);
  if (!row) return '';
  return String(
    row.ExtraGameId ??
      row.extraGameId ??
      row.ExtraGameID ??
      row.Code ??
      row.code ??
      row.Name ??
      row.name ??
      row.Id ??
      row.id ??
      row.ID ??
      ''
  ).trim();
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => extraIdFromUnknown(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      return parseStringList(JSON.parse(text));
    } catch {
      return text.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    }
  }
  const fromObject = extraIdFromUnknown(value);
  return fromObject ? [fromObject] : [];
}

function kabalaAssetUrl(row: Record<string, unknown>, slot: 'profile' | 'full'): string | null {
  const bags = [row.Assets, row.assets, row.KabalaAssets, row.kabalaAssets];
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue;
    for (const item of bag) {
      const asset = asRecord(item);
      if (!asset) continue;
      const assetSlot = String(asset.Slot ?? asset.slot ?? '').trim().toLowerCase();
      if (assetSlot !== slot) continue;
      if ((asset.ActiveFlg != null || asset.activeFlg != null) && !isTruthyFlag(asset.ActiveFlg ?? asset.activeFlg)) {
        continue;
      }
      const url = String(asset.BlobUrl ?? asset.blobUrl ?? '').trim();
      if (url) return url;
    }
  }
  if (slot === 'full') {
    const direct =
      (row.FullUrl != null && row.FullUrl !== '' ? String(row.FullUrl).trim() : '') ||
      (row.FullImageUrl != null && row.FullImageUrl !== '' ? String(row.FullImageUrl).trim() : '');
    return direct || null;
  }
  const direct =
    (row.ImageUrl != null && row.ImageUrl !== '' ? String(row.ImageUrl).trim() : '') ||
    (row.ProfileUrl != null && row.ProfileUrl !== '' ? String(row.ProfileUrl).trim() : '') ||
    (row.BlobUrl != null && row.BlobUrl !== '' ? String(row.BlobUrl).trim() : '') ||
    (row.MediaUrl != null && row.MediaUrl !== '' ? String(row.MediaUrl).trim() : '');
  return direct || null;
}

function kabalaProfileUrl(row: Record<string, unknown>): string | null {
  return kabalaAssetUrl(row, 'profile');
}

/** A master második datasetjét (OpKabalaAssets) a kabala sor Assets tömbjébe teszi. */
export function withKabalaAssets(kabalas: unknown[], assets: unknown[]): unknown[] {
  if (!assets.length) return kabalas;
  const byId = new Map<number, unknown[]>();
  for (const raw of assets) {
    const rec = asRecord(raw);
    if (!rec) continue;
    const kabalaId = nullableNumericId(rec.KabalaID ?? rec.KabalaId ?? rec.kabalaId);
    if (kabalaId == null) continue;
    const list = byId.get(kabalaId) ?? [];
    list.push(raw);
    byId.set(kabalaId, list);
  }
  return kabalas.map((raw) => {
    const rec = asRecord(raw);
    if (!rec) return raw;
    const id = nullableNumericId(rec.id ?? rec.ID ?? rec.Id ?? rec.KabalaID);
    const extra = id != null ? byId.get(id) : undefined;
    if (!extra?.length) return raw;
    const existing = Array.isArray(rec.Assets) ? rec.Assets : Array.isArray(rec.assets) ? rec.assets : [];
    return { ...rec, Assets: [...existing, ...extra] };
  });
}

export function normalizeOpCatalog(rows: unknown[]): OpCatalogItem[] {
  const list: OpCatalogItem[] = [];
  const seen = new Set<number>();
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.Id ?? row.KabalaID ?? row.TopicID);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      Name: String(row.Name ?? row.name ?? row.TopicName ?? row.KabalaName ?? '').trim() || `Elem ${id}`,
      ImageUrl: kabalaProfileUrl(row),
      FullUrl: kabalaAssetUrl(row, 'full') || kabalaProfileUrl(row),
      ActiveFlg: row.ActiveFlg == null && row.activeFlg == null ? true : isTruthyFlag(row.ActiveFlg ?? row.activeFlg),
    });
  }
  return list.filter((row) => row.ActiveFlg);
}

export interface OpRound {
  id: number;
  EventID: number;
  TopicID: number | null;
  TopicName: string;
  Mode: string;
  Kind: string;
  ExtraGameId: string | null;
  StatusCode: string;
  SortIndex: number;
  VisibleFlg: boolean | null;
}

export interface OpEventQuestion {
  id: number;
  EventID: number;
  RoundID: number;
  QuestionID: number | null;
  SortIndex: number;
  StatusCode: string;
  StartedAtUtc: string | null;
  StoppedAtUtc: string | null;
  AnswerCount: number;
  TimeSec: number;
  Prompt: string;
  TypeCode: string;
  OptionsJson: string | null;
  CorrectJson: string | null;
  TopicName: string;
  ExtraGameId: string | null;
  Answers: string[];
  Matches: string[];
  Categories: string[];
  IsCorrect: boolean[];
  MediaUrl: string | null;
  ImageKey: string | null;
  ImageUrl: string | null;
  AudioKey: string | null;
  AudioUrl: string | null;
}

export interface OpExtraPoolItem {
  id: number;
  EventID: number;
  QuestionID: number | null;
  ExtraGameId: string;
  SortIndex: number;
  StatusCode: string;
  TypeCode: string;
  Prompt: string;
  TopicName: string;
  TimeSec: number;
  StartedAtUtc: string | null;
  Answers: string[];
  IsCorrect: boolean[];
  ImageKey: string | null;
  ImageUrl: string | null;
  AudioKey: string | null;
  AudioUrl: string | null;
  MediaUrl: string | null;
  /** TopicName-ből került a játékba, nem ExtraGameId-ből. */
  topicOnly?: boolean;
}

export interface OpQuestionPreviewModel {
  type: string;
  prompt: string;
  timeSec: number;
  sortIndex?: number;
  topic?: string;
  answers: string[];
  matches: string[];
  categories?: string[];
  isCorrect: boolean[];
  synonyms: string[];
  mediaUrl?: string | null;
  audioUrl?: string | null;
}

export function opQuestionTopic(
  row: { TopicName?: string; RoundID?: number } | null | undefined,
  game?: { rounds: OpRound[] } | null,
  topics?: { id: number; Name: string }[]
): string {
  const direct = row?.TopicName?.trim();
  if (direct) return direct;
  const round = row?.RoundID != null ? game?.rounds.find((item) => item.id === row.RoundID) : undefined;
  if (!round) return '';
  const named = round.TopicName.trim();
  if (named) return named;
  return topics?.find((topic) => topic.id === round.TopicID)?.Name?.trim() || '';
}

export function previewModelFromQuestion(row: OpEventQuestion): OpQuestionPreviewModel {
  const answers = (row.Answers || []).map((item) => String(item ?? ''));
  const synonyms =
    String(row.TypeCode || '') === 'freetext'
      ? extractOpFreetextSynonyms(row as unknown as Record<string, unknown>)
      : [];
  return {
    type: row.TypeCode,
    prompt: row.Prompt,
    timeSec: row.TimeSec,
    sortIndex: row.SortIndex,
    topic: row.TopicName?.trim() || '',
    answers: row.TypeCode === 'freetext' ? [] : answers,
    matches: row.Matches || [],
    categories: row.Categories || [],
    isCorrect: row.IsCorrect || [],
    synonyms,
    mediaUrl: opQuestionImageUrl(row),
  };
}

function extraFreetextAnswers(row: Record<string, unknown>, fromJsonAnswers: string[]): string[] {
  const synonyms = extractOpFreetextSynonyms(row);
  if (synonyms.length) return synonyms;
  return splitPipeTexts(fromJsonAnswers);
}

export function extraPoolToQuestion(row: OpExtraPoolItem): OpEventQuestion {
  const freetext = String(row.TypeCode || '').toLowerCase() === 'freetext';
  const answers = freetext ? splitPipeTexts(row.Answers || []) : row.Answers || [];
  return {
    id: row.id,
    EventID: row.EventID,
    RoundID: 0,
    QuestionID: row.QuestionID,
    SortIndex: row.SortIndex,
    StatusCode: row.StatusCode,
    StartedAtUtc: row.StartedAtUtc,
    StoppedAtUtc: null,
    AnswerCount: 0,
    TimeSec: row.TimeSec > 0 ? row.TimeSec : 0,
    Prompt: row.Prompt,
    TypeCode: row.TypeCode,
    OptionsJson: null,
    CorrectJson: freetext && answers.length ? JSON.stringify({ Synonyms: answers }) : null,
    TopicName: row.TopicName,
    ExtraGameId: row.ExtraGameId,
    Answers: freetext ? answers : row.Answers || [],
    Matches: [],
    Categories: [],
    IsCorrect: row.IsCorrect || [],
    MediaUrl: row.MediaUrl,
    ImageKey: row.ImageKey,
    ImageUrl: row.ImageUrl,
    AudioKey: row.AudioKey,
    AudioUrl: row.AudioUrl,
  };
}

function sameOpPrompt(a?: string | null, b?: string | null) {
  return String(a || '').trim() === String(b || '').trim() && Boolean(String(a || '').trim());
}

/** Extra idő: tblQuestion / extraCatalog. ExtraQuestion.id nem keverhető a katalógus id-val; OpLive.TimeSec nem használható. */
export function opExtraQuestionTimeSec(input: {
  extraGameId?: string | null;
  extraQuestionId?: number | null;
  question?: {
    id?: number;
    TimeSec?: number;
    QuestionID?: number | null;
    TypeCode?: string;
    Prompt?: string;
  } | null;
  extraPool: OpExtraPoolItem[];
  extraCatalog: OpExtraPoolItem[];
  repoQuestions: Array<{ id: number; TimeSec: number }>;
}): number {
  const extraId = matchOpExtraGame(input.extraGameId)?.id || input.extraGameId || '';
  if (!extraId) return 0;
  const catalog = input.extraCatalog.filter((row) => row.ExtraGameId === extraId);
  const pool = input.extraPool.filter((row) => row.ExtraGameId === extraId);
  const q = input.question;
  const poolHit =
    input.extraQuestionId != null ? pool.find((row) => row.id === input.extraQuestionId) : undefined;
  const catalogByQuestionId =
    q?.QuestionID != null
      ? catalog.find((row) => row.QuestionID === q.QuestionID || row.id === q.QuestionID)
      : undefined;
  const catalogByPool =
    poolHit?.QuestionID != null
      ? catalog.find((row) => row.QuestionID === poolHit.QuestionID || row.id === poolHit.QuestionID)
      : poolHit
        ? catalog.find((row) => sameOpPrompt(row.Prompt, poolHit.Prompt))
        : undefined;
  const catalogByPrompt = q?.Prompt ? catalog.find((row) => sameOpPrompt(row.Prompt, q.Prompt)) : undefined;
  const catalogHit = catalogByQuestionId || catalogByPool || catalogByPrompt;
  const questionId =
    catalogHit?.QuestionID ??
    poolHit?.QuestionID ??
    q?.QuestionID ??
    (catalogHit && catalogHit.id > 0 ? catalogHit.id : null);
  const repo = questionId != null ? input.repoQuestions.find((row) => row.id === questionId) : undefined;
  if (repo && repo.TimeSec > 0) return repo.TimeSec;
  if (catalogHit && catalogHit.TimeSec > 0) return catalogHit.TimeSec;
  if (poolHit && poolHit.TimeSec > 0) return poolHit.TimeSec;
  if (q?.TimeSec != null && q.TimeSec > 0) return q.TimeSec;
  if (extraId === 'EG2') return 0;
  if (q?.TypeCode) return opDefaultTimeSec(q.TypeCode);
  return 10;
}

export function readOpMediaText(...values: unknown[]): string | null {
  for (const value of values) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function extraMediaOf(row: object) {
  const rec = row as Record<string, unknown>;
  let imageKey = readOpMediaText(rec.ImageKey, rec.imageKey);
  let imageUrl = readOpMediaText(rec.ImageUrl, rec.imageUrl);
  let audioKey = readOpMediaText(rec.AudioKey, rec.audioKey, rec.SoundKey, rec.soundKey, rec.Mp3Key, rec.mp3Key);
  let audioUrl = readOpMediaText(rec.AudioUrl, rec.audioUrl, rec.SoundUrl, rec.soundUrl, rec.Mp3Url, rec.mp3Url);
  const mediaUrl = readOpMediaText(rec.MediaUrl, rec.mediaUrl, rec.MediaKey, rec.mediaKey);
  for (const [key, val] of Object.entries(rec)) {
    const fold = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const text = readOpMediaText(val);
    if (!text) continue;
    if (!audioKey && (fold.includes('audiokey') || fold === 'soundkey' || fold === 'mp3key' || fold === 'audiofile')) {
      audioKey = text;
    }
    if (!audioUrl && (fold.includes('audiourl') || fold === 'soundurl' || fold === 'mp3url')) {
      audioUrl = text;
    }
    if (!imageKey && (fold === 'imagekey' || fold === 'mediakey')) imageKey = text;
    if (!imageUrl && (fold === 'imageurl')) imageUrl = text;
  }
  const mediaIsUrl = Boolean(mediaUrl && /^https?:\/\//i.test(mediaUrl));
  const mediaLooksAudio = Boolean(mediaUrl && opLooksAudioMedia(mediaUrl));
  return {
    ImageKey: imageKey || (!mediaIsUrl && mediaUrl && !mediaLooksAudio ? mediaUrl : null),
    ImageUrl: imageUrl || (mediaIsUrl && !mediaLooksAudio ? mediaUrl : null),
    AudioKey: audioKey || (!mediaIsUrl && mediaLooksAudio ? mediaUrl : null),
    AudioUrl: audioUrl || (mediaIsUrl && mediaLooksAudio ? mediaUrl : null),
    MediaUrl: mediaIsUrl ? mediaUrl : imageUrl,
  };
}

function fillExtraMedia(existing: OpExtraPoolItem, row: OpExtraPoolItem) {
  if (row.ImageKey) existing.ImageKey = row.ImageKey;
  if (row.ImageUrl) existing.ImageUrl = row.ImageUrl;
  if (row.AudioKey) existing.AudioKey = row.AudioKey;
  if (row.AudioUrl) existing.AudioUrl = row.AudioUrl;
  if (row.MediaUrl) existing.MediaUrl = row.MediaUrl;
}

function sameExtraMediaRow(a: OpExtraPoolItem, b: OpExtraPoolItem) {
  if (a.ExtraGameId && b.ExtraGameId && a.ExtraGameId !== b.ExtraGameId) return false;
  if (a.QuestionID != null && b.QuestionID != null && a.QuestionID === b.QuestionID) return true;
  if (a.id === b.id) return true;
  if (a.QuestionID != null && (b.id === a.QuestionID || b.QuestionID === a.id)) return true;
  if (b.QuestionID != null && a.id === b.QuestionID) return true;
  return false;
}

export function enrichOpExtraMedia(targets: OpExtraPoolItem[], sources: OpExtraPoolItem[]) {
  for (const row of targets) {
    for (const hit of sources) {
      if (!sameExtraMediaRow(row, hit)) continue;
      fillExtraMedia(row, hit);
    }
  }
  return targets;
}

export function opQuestionImageUrl(row: Pick<OpEventQuestion, 'ImageUrl' | 'MediaUrl'>): string | null {
  const image = readOpMediaText(row.ImageUrl);
  if (image && /^https?:\/\//i.test(image)) return image;
  const legacy = readOpMediaText(row.MediaUrl);
  if (legacy && /^https?:\/\//i.test(legacy)) return legacy;
  return image || null;
}

export function opLooksAudioMedia(value: string | null | undefined) {
  const text = String(value || '').trim();
  return /\.(mp3|m4a|wav|aac)(\?|$)/i.test(text) || /-aud\./i.test(text);
}

export function opQuestionHasAudio(
  row:
    | {
        AudioKey?: string | null;
        AudioUrl?: string | null;
        MediaUrl?: string | null;
      }
    | null
    | undefined
) {
  if (!row) return false;
  if (readOpMediaText(row.AudioKey, row.AudioUrl)) return true;
  return opLooksAudioMedia(readOpMediaText(row.MediaUrl));
}

export function opQuestionAudioUrl(row: Pick<OpEventQuestion, 'AudioUrl'> | null | undefined): string | null {
  const audio = readOpMediaText(row?.AudioUrl);
  if (audio && (/^https?:\/\//i.test(audio) || audio.startsWith('blob:') || audio.startsWith('data:'))) return audio;
  return null;
}

export function isOpQuestionEditable(statusCode: string): boolean {
  return String(statusCode || '').trim().toLowerCase() === 'pending';
}

export function toOpQuestionSavePayload(
  row: OpEventQuestion,
  next: {
    type?: string;
    prompt: string;
    timeSec: number;
    answers: string[];
    matches: string[];
    isCorrect: boolean[];
    synonyms: string[];
    itemCats: string[];
    imageKey?: string | null;
    audioKey?: string | null;
  }
): Record<string, unknown> {
  const type = next.type || row.TypeCode || 'single';
  const body: Record<string, unknown> = {
    EventID: row.EventID,
    EventQuestionID: row.id,
    QuestionID: row.QuestionID,
    TypeCode: type,
    Type: type,
    Prompt: next.prompt.trim(),
    TimeSec: next.timeSec,
    SortIndex: row.SortIndex,
  };
  if (row.ExtraGameId) {
    body.ExtraGameId = row.ExtraGameId;
    if (!row.RoundID) delete body.EventQuestionID;
  }
  if (next.imageKey !== undefined && next.imageKey !== row.ImageKey) body.ImageKey = next.imageKey;
  if (next.audioKey !== undefined && next.audioKey !== row.AudioKey) body.AudioKey = next.audioKey;
  if (type === 'freetext') {
    body.Answer1 = next.synonyms.map((item) => item.trim()).filter(Boolean).join('|');
    return body;
  }
  let slot = 0;
  next.answers.forEach((raw, i) => {
    const text = String(raw || '').trim();
    if (!text) return;
    slot += 1;
    body[`Answer${slot}`] = text;
    if (type === 'single' || type === 'multi') {
      body[`IsCorrect${slot}`] = Boolean(next.isCorrect[i]);
    }
    if (type === 'match') {
      const right = String(next.matches[i] || '').trim();
      if (right) body[`Match${slot}`] = right;
    }
    if (type === 'category') {
      const cat = String(next.itemCats[i] || '').trim();
      if (cat) body[`Match${slot}`] = cat;
    }
  });
  return body;
}

export interface OpTeam {
  id: number;
  EventID: number;
  KabalaID: number | null;
  Name: string;
  MemberCount: number;
}

export interface OpTeamMember {
  TeamID: number;
  EventUserID: number;
  Nickname: string | null;
}

export interface OpPenalty {
  id: number;
  TeamID: number;
  Points: number;
  UndoOfID: number | null;
  CreatedAtUtc: string;
}

export function normalizeOpPenalties(rows: unknown[]): OpPenalty[] {
  const list: OpPenalty[] = [];
  const seen = new Set<number>();
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.Id);
    const TeamID = nullableNumericId(row.TeamID ?? row.TeamId ?? row.teamId);
    const Points = Number(row.Points ?? row.points);
    if (id == null || TeamID == null || !Number.isFinite(Points) || seen.has(id)) continue;
    seen.add(id);
    const undo = nullableNumericId(row.UndoOfID ?? row.UndoOfId ?? row.undoOfID);
    list.push({
      id,
      TeamID,
      Points,
      UndoOfID: undo,
      CreatedAtUtc: String(row.CreatedAtUtc ?? row.createdAtUtc ?? ''),
    });
  }
  return list;
}

export function sumOpPenaltiesByTeam(rows: OpPenalty[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const row of rows) {
    out[row.TeamID] = (out[row.TeamID] || 0) + row.Points;
  }
  return out;
}

export function formatOpPenaltySum(value: number): string {
  if (!value) return '';
  return value > 0 ? `+${value}` : String(value);
}

export function countOpPenaltiesByTeam(rows: OpPenalty[]): Record<number, { plus: number; minus: number }> {
  const out: Record<number, { plus: number; minus: number }> = {};
  for (const row of rows) {
    const slot = out[row.TeamID] || (out[row.TeamID] = { plus: 0, minus: 0 });
    if (row.Points > 0) slot.plus += 1;
    else if (row.Points < 0) slot.minus += 1;
  }
  return out;
}

function opMemberNickname(row: Record<string, unknown> | null, depth = 0): string | null {
  if (!row) return null;
  const first = String(row.FirstName ?? row.firstName ?? '').trim();
  const last = String(row.LastName ?? row.lastName ?? '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  const direct = [
    row.Nickname,
    row.nickname,
    row.NickName,
    row.nickName,
    row.UserNickname,
    row.userNickname,
    row.UsrNickname,
    row.Becenev,
    row.becenev,
    row.DisplayName,
    row.displayName,
    row.PlayerName,
    row.MemberName,
    row.FullName,
    row.Name,
    row.name,
    full,
  ]
    .map((value) => String(value ?? '').trim())
    .find((value) => value && value !== 'null' && value !== 'undefined');
  if (direct) return direct;
  if (depth >= 2) return null;
  const nested = row.User ?? row.user ?? row.Usr ?? row.tblUser;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return opMemberNickname(nested as Record<string, unknown>, depth + 1);
  }
  return null;
}

export function enrichOpTeamMembers(members: OpTeamMember[], extras: unknown[] = []): OpTeamMember[] {
  if (!members.length || !extras.length) return members;
  const byEventUser = new Map<number, string>();
  for (const raw of extras) {
    const row = asRecord(raw);
    if (!row) continue;
    const nick = opMemberNickname(row);
    if (!nick) continue;
    const eventUserId = nullableNumericId(
      row.EventUserID ?? row.eventUserID ?? row.EventUserId ?? row.id ?? row.ID
    );
    if (eventUserId != null) byEventUser.set(eventUserId, nick);
  }
  return members.map((row) => ({
    ...row,
    Nickname: row.Nickname || byEventUser.get(row.EventUserID) || null,
  }));
}

function syntheticMemberId(teamId: number, label: string): number {
  let hash = 0;
  const key = `${teamId}:${label}`;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return -1 - (hash % 1_000_000_000);
}

/** Teams[].Members / string[] / hiányzó EventUserID — a MemberCount ettől független. */
export function collectOpTeamMemberRows(teams: unknown[], extra: unknown[] = []): unknown[] {
  const out: unknown[] = [...extra];
  for (const raw of teams || []) {
    const team = asRecord(raw);
    if (!team) continue;
    const teamId = nullableNumericId(
      team.TeamID ?? team.TeamId ?? team.teamId ?? team.id ?? team.ID
    );
    const nested =
      team.Members ??
      team.members ??
      team.TeamMembers ??
      team.teamMembers ??
      team.Users ??
      team.EventUsers;
    const rows = Array.isArray(nested) ? nested : nested && typeof nested === 'object' ? [nested] : [];
    for (const item of rows) {
      if (typeof item === 'string' || typeof item === 'number') {
        out.push({ TeamID: teamId, Nickname: String(item).trim() });
        continue;
      }
      const row = asRecord(item);
      if (!row) continue;
      out.push({
        ...row,
        TeamID: row.TeamID ?? row.TeamId ?? row.teamId ?? teamId,
      });
    }
  }
  return out;
}

export function normalizeOpTeamMembers(rows: unknown[]): OpTeamMember[] {
  const list: OpTeamMember[] = [];
  const seen = new Set<string>();
  for (const raw of rows || []) {
    if (typeof raw === 'string' || typeof raw === 'number') continue;
    const row = asRecord(raw);
    if (!row) continue;
    const TeamID = nullableNumericId(row.TeamID ?? row.teamID ?? row.TeamId ?? row.teamId);
    const Nickname = opMemberNickname(row);
    const EventUserID =
      nullableNumericId(
        row.EventUserID ?? row.eventUserID ?? row.EventUserId ?? row.UserID ?? row.userID
      ) ?? (TeamID != null && Nickname ? syntheticMemberId(TeamID, Nickname) : null);
    if (TeamID == null || EventUserID == null) continue;
    const key = `${TeamID}:${EventUserID}`;
    if (seen.has(key)) {
      const prev = list.find((item) => item.TeamID === TeamID && item.EventUserID === EventUserID);
      if (prev && !prev.Nickname && Nickname) prev.Nickname = Nickname;
      continue;
    }
    seen.add(key);
    list.push({ TeamID, EventUserID, Nickname });
  }
  return list;
}

export interface OpLiveState {
  DisplayState: string;
  PlayerFace: string;
  ActiveRoundID: number | null;
  ActiveEventQuestionID: number | null;
  FocusedEventQuestionID: number | null;
  StateVersion: number;
  AnswerCount: number;
  QuestionStatus: string;
  StartedAtUtc: string | null;
  TimeSec: number | null;
  ClockPaused: boolean;
  ClockLeftMs: number | null;
  DisplayClockPhase: string;
  MosaicTipName: string;
  MosaicTipTeam: string;
  MosaicOutTeamIds: number[];
  ExtraRunID: number | null;
  ExtraGameId: string | null;
  ActiveExtraQuestionID: number | null;
  ExtraQuestionStatus: string;
}

export function parseOpUtcMs(value: string | null | undefined): number | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const iso = text.includes('T') ? text : text.replace(' ', 'T');
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  return Number.isFinite(ms) ? ms : null;
}

export function emptyOpLive(): OpLiveState {
  return {
    DisplayState: 'idle',
    PlayerFace: '',
    ActiveRoundID: null,
    ActiveEventQuestionID: null,
    FocusedEventQuestionID: null,
    StateVersion: 0,
    AnswerCount: 0,
    QuestionStatus: '',
    StartedAtUtc: null,
    TimeSec: null,
    ClockPaused: false,
    ClockLeftMs: null,
    DisplayClockPhase: '',
    MosaicTipName: '',
    MosaicTipTeam: '',
    MosaicOutTeamIds: [],
    ExtraRunID: null,
    ExtraGameId: null,
    ActiveExtraQuestionID: null,
    ExtraQuestionStatus: '',
  };
}

function liveQuestionStatusOf(live: OpLiveState): string {
  return String((live.ExtraGameId ? live.ExtraQuestionStatus : live.QuestionStatus) || '').toLowerCase();
}

export function isOpLiveQuestionRunning(live: OpLiveState | null | undefined): boolean {
  return liveQuestionStatusOf(live || emptyOpLive()) === 'active';
}

export function sameOpLiveQuestion(a: OpLiveState | null | undefined, b: OpLiveState | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.ExtraGameId || b.ExtraGameId) {
    return (
      Boolean(a.ExtraGameId) &&
      a.ExtraGameId === b.ExtraGameId &&
      a.ActiveExtraQuestionID != null &&
      a.ActiveExtraQuestionID === b.ActiveExtraQuestionID
    );
  }
  return a.ActiveEventQuestionID != null && a.ActiveEventQuestionID === b.ActiveEventQuestionID;
}

export function opLiveQuestionStatus(live: OpLiveState | null | undefined): string {
  return liveQuestionStatusOf(live || emptyOpLive());
}

export function liveAnswerCountFor(
  live: OpLiveState | null | undefined,
  pingCount: number | null | undefined,
  target?: { eventQuestionId?: number | null; extraQuestionId?: number | null }
): number {
  if (!live) return Math.max(0, pingCount ?? 0);
  const status = liveQuestionStatusOf(live);
  if (status === 'pending') return 0;
  const extra = Boolean(live.ExtraGameId);
  const liveId = extra ? live.ActiveExtraQuestionID : live.ActiveEventQuestionID;
  const want = extra ? target?.extraQuestionId : target?.eventQuestionId;
  if (want != null && liveId != null && Number(want) !== Number(liveId) && status !== 'active') {
    return 0;
  }
  return Math.max(live.AnswerCount || 0, pingCount ?? 0);
}

export interface OpRepoQuestion {
  id: number;
  TopicID: number | null;
  TopicName: string;
  TypeCode: string;
  Prompt: string;
  TimeSec: number;
  MediaUrl: string | null;
  ImageKey: string | null;
  ImageUrl: string | null;
  AudioKey: string | null;
  AudioUrl: string | null;
  UsedFlg: boolean;
  SortIndex: number | null;
  ExtraGameId: string | null;
  Answers: string[];
  IsCorrect: boolean[];
}

function parseJsonText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function pickRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, val] of Object.entries(row)) {
    if (wanted.has(key.toLowerCase()) && val != null && val !== '') return val;
  }
  return undefined;
}

function isBlankExtraIds(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (Array.isArray(value) && !value.length) return true;
  if (typeof value === 'string' && !value.trim()) return true;
  return false;
}

function pickFilledExtraGameIds(row: Record<string, unknown>): unknown {
  const keys = ['ExtraGameIds', 'ExtraGameIdsJson', 'extraGameIds', 'ExtraGames', 'ExtraGameId'];
  for (const key of keys) {
    const val = row[key];
    if (!isBlankExtraIds(val)) return val;
  }
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, val] of Object.entries(row)) {
    if (wanted.has(key.toLowerCase()) && !isBlankExtraIds(val)) return val;
  }
  return undefined;
}

function foldRowKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function readIndexedStrings(row: Record<string, unknown>, prefix: string): string[] {
  const found = new Map<number, string>();
  const prefixFold = foldRowKey(prefix);
  for (const [key, val] of Object.entries(row)) {
    const folded = foldRowKey(key);
    if (!folded.startsWith(prefixFold)) continue;
    const rest = folded.slice(prefixFold.length);
    if (!/^[0-9]+$/.test(rest)) continue;
    const index = Number(rest);
    if (index < 1 || index > 8) continue;
    const text = val == null || val === '' ? '' : String(val).trim();
    if (text && !found.has(index)) found.set(index, text);
  }
  for (let i = 1; i <= 8; i += 1) {
    if (found.has(i)) continue;
    const raw = pickRowValue(row, `${prefix}${i}`, `${prefix.toLowerCase()}${i}`);
    const text = raw == null ? '' : String(raw).trim();
    if (text) found.set(i, text);
  }
  if (!found.size) return [];
  const last = Math.max(...found.keys());
  const out: string[] = [];
  for (let i = 1; i <= last; i += 1) out.push(found.get(i) || '');
  return out;
}

function readIndexedFlags(row: Record<string, unknown>, prefix: string): boolean[] {
  const out: boolean[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const raw = pickRowValue(row, `${prefix}${i}`);
    if (raw == null || raw === '') {
      out.push(false);
      continue;
    }
    if (raw === true || raw === 1 || raw === '1') {
      out.push(true);
      continue;
    }
    const text = String(raw).trim().toLowerCase();
    out.push(text === 'true' || text === 'x' || text === 'igen' || text === 'yes');
  }
  return out;
}

function unwrapNestedList(value: unknown): unknown {
  let current = value;
  while (Array.isArray(current) && current.length === 1 && Array.isArray(current[0])) {
    current = current[0];
  }
  return current;
}

interface OpListItem {
  id: number | null;
  listType: string;
  value: string;
  sortIndex: number;
}

function isRightListType(type: string): boolean {
  const folded = type.replace(/[^a-z]/g, '');
  return (
    folded === 'matches' ||
    folded === 'match' ||
    folded === 'cats' ||
    folded === 'cat' ||
    folded === 'categories' ||
    folded === 'category' ||
    folded === 'right' ||
    folded === 'jobb'
  );
}

function optionItemText(rec: Record<string, unknown>): string {
  return String(
    rec.TextValue ??
      rec.textValue ??
      rec.Value ??
      rec.value ??
      rec.Text ??
      rec.text ??
      rec.Answer ??
      rec.answer ??
      rec.Left ??
      rec.left ??
      rec.Item ??
      rec.item ??
      ''
  ).trim();
}

function readListItems(value: unknown): OpListItem[] {
  const parsed = unwrapNestedList(parseJsonText(value));
  if (!Array.isArray(parsed)) return [];
  const items: OpListItem[] = [];
  parsed.forEach((item, index) => {
    if (item == null || item === '') return;
    if (typeof item === 'string' || typeof item === 'number') {
      const text = String(item).trim();
      if (text) items.push({ id: null, listType: 'options', value: text, sortIndex: index + 1 });
      return;
    }
    const rec = asRecord(item);
    if (!rec) return;
    const text = optionItemText(rec);
    if (!text) return;
    items.push({
      id: nullableNumericId(rec.id ?? rec.ID ?? rec.OptionID ?? rec.optionId),
      listType: String(rec.ListType ?? rec.listType ?? 'options')
        .trim()
        .toLowerCase(),
      value: text,
      sortIndex: nullableNumericId(rec.SortIndex ?? rec.sortIndex ?? rec.OrderNo) ?? index + 1,
    });
  });
  return items.sort((a, b) => a.sortIndex - b.sortIndex || (a.id ?? 0) - (b.id ?? 0));
}

function partsFromListItems(items: OpListItem[]): { answers: string[]; matches: string[] } {
  return {
    answers: items.filter((item) => !isRightListType(item.listType)).map((item) => item.value),
    matches: items.filter((item) => isRightListType(item.listType)).map((item) => item.value),
  };
}

function asOptionList(value: unknown): string[] {
  return readListItems(value).map((item) => item.value);
}

export function parseOpOptionParts(value: unknown): { answers: string[]; matches: string[] } {
  const fromList = readListItems(value);
  if (fromList.length) return partsFromListItems(fromList);
  const parsed = unwrapNestedList(parseJsonText(value));
  const rec = asRecord(parsed);
  if (!rec) {
    if (typeof parsed === 'string' && parsed.trim()) {
      return { answers: parsed.split('|').map((part) => part.trim()).filter(Boolean), matches: [] };
    }
    return { answers: [], matches: [] };
  }
  const left = rec.Left ?? rec.Items ?? rec.left ?? rec.items ?? rec.Options ?? rec.options ?? rec.Answers ?? rec.answers;
  const right = rec.Right ?? rec.Cats ?? rec.right ?? rec.cats ?? rec.Matches ?? rec.matches ?? rec.Categories ?? rec.categories;
  if (left != null || right != null) {
    const answers = asOptionList(left);
    const matches = asOptionList(right);
    if (answers.length || matches.length) return { answers, matches };
  }
  return { answers: [], matches: [] };
}

function uniqueOptionTexts(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function splitPipeTexts(list: string[]): string[] {
  return uniqueOptionTexts(
    list.flatMap((item) =>
      String(item || '')
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

export function extractOpFreetextSynonyms(row: Record<string, unknown>): string[] {
  const correct = unwrapNestedList(parseJsonText(row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct));
  const fromCorrect: string[] = [];
  const rec = asRecord(correct);
  if (rec) {
    fromCorrect.push(
      ...asOptionList(rec.Synonyms ?? rec.synonyms ?? rec.Answers ?? rec.answers ?? rec.Values ?? rec.values)
    );
    const single = optionItemText(rec);
    if (single) fromCorrect.push(single);
  }
  if (Array.isArray(correct)) {
    fromCorrect.push(...readListItems(correct).map((item) => item.value));
    correct.forEach((item) => {
      if (typeof item === 'string' || typeof item === 'number') fromCorrect.push(String(item).trim());
    });
  } else if (typeof correct === 'string' && correct.trim()) {
    fromCorrect.push(correct);
  }

  const fromAnswers = splitPipeTexts([
    ...readIndexedStrings(row, 'Answer'),
    ...asOptionList(row.Answers ?? row.answers),
  ]);
  const fromOptions = readListItems(row.Options ?? row.options ?? row.OptionsJson ?? row.optionsJson).map(
    (item) => item.value
  );
  const correctTexts = splitPipeTexts(fromCorrect);
  if (fromAnswers.length) return fromAnswers;
  if (correctTexts.length && !freetextCorrectIsOptionIdsOnly(row)) return correctTexts;
  if (fromOptions.length) return uniqueOptionTexts(fromOptions);
  return correctTexts;
}

function freetextCorrectIsOptionIdsOnly(row: Record<string, unknown>): boolean {
  const correct = unwrapNestedList(parseJsonText(row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct));
  if (!Array.isArray(correct) || !correct.length) return false;
  return correct.every((item) => {
    if (typeof item === 'number' && Number.isFinite(item)) return true;
    const rec = asRecord(item);
    if (!rec) return false;
    const hasText = Boolean(optionItemText(rec));
    const hasSyn = rec.Synonyms != null || rec.synonyms != null;
    const optionId = nullableNumericId(rec.OptionID ?? rec.optionId ?? rec.id);
    return optionId != null && !hasText && !hasSyn;
  });
}

export function extractOpQuestionOptions(row: Record<string, unknown>): {
  answers: string[];
  matches: string[];
  optionItems: OpListItem[];
} {
  const fromAnswer = readIndexedStrings(row, 'Answer');
  const fromMatch = readIndexedStrings(row, 'Match');
  const optionItems = readListItems(row.Options ?? row.options ?? row.OptionsJson ?? row.optionsJson);
  const matchItems = readListItems(row.Matches ?? row.matches);
  const fromJson = optionItems.length
    ? partsFromListItems(optionItems)
    : parseOpOptionParts(row.OptionsJson ?? row.optionsJson ?? row.AnswerJson ?? row.answerJson);
  return {
    answers: fromAnswer.length ? fromAnswer : fromJson.answers,
    matches: fromMatch.length ? fromMatch : matchItems.length ? matchItems.map((item) => item.value) : fromJson.matches,
    optionItems: optionItems.length ? optionItems : fromJson.answers.map((value, i) => ({
      id: null,
      listType: 'options',
      value,
      sortIndex: i + 1,
    })),
  };
}

function readCorrectFlags(row: Record<string, unknown>, optionItems: OpListItem[]): boolean[] {
  const answers = optionItems.filter((item) => !isRightListType(item.listType));
  const indexed = readIndexedFlags(row, 'IsCorrect');
  if (indexed.some(Boolean)) return indexed.slice(0, Math.max(answers.length, indexed.lastIndexOf(true) + 1));

  const rawFlags = row.IsCorrect ?? row.isCorrect ?? row.Helyes ?? row.helyes;
  if (Array.isArray(rawFlags) && rawFlags.every((item) => typeof item === 'boolean' || item === 0 || item === 1 || item === '0' || item === '1')) {
    return rawFlags.map((item) => isTruthyFlag(item));
  }

  const correct = unwrapNestedList(parseJsonText(row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct));
  if (Array.isArray(correct)) {
    const optionIds = new Set<number>();
    const indexes = new Set<number>();
    correct.forEach((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        optionIds.add(item);
        indexes.add(item);
        return;
      }
      const rec = asRecord(item);
      if (!rec) return;
      const optionId = nullableNumericId(rec.OptionID ?? rec.optionId ?? rec.id ?? rec.ID);
      const index = nullableNumericId(rec.Index ?? rec.index);
      if (optionId != null) optionIds.add(optionId);
      if (index != null) indexes.add(index);
    });
    if (answers.some((item) => item.id != null && optionIds.has(item.id))) {
      return answers.map((item) => item.id != null && optionIds.has(item.id));
    }
    // ExtraPool JOIN: CorrectJson jöhet idegen kérdésről (más OptionID). Ne a SortIndex/Index legyen a helyes.
    if (optionIds.size && answers.some((item) => item.id != null)) {
      return answers.map(() => false);
    }
    if (indexes.size) {
      return answers.map((_, i) => indexes.has(i) || indexes.has(i + 1));
    }
  }

  const rec = asRecord(correct);
  if (rec?.Index != null) {
    const index = nullableNumericId(rec.Index);
    return answers.map((_, i) => i === index || (index != null && index > 0 && i === index - 1));
  }
  if (Array.isArray(rec?.Indexes)) {
    const set = new Set(
      (rec.Indexes as unknown[])
        .map((item) => nullableNumericId(item))
        .filter((id): id is number => id != null)
    );
    return answers.map((_, i) => set.has(i) || set.has(i + 1));
  }

  return answers.map(() => false);
}

export function opCategoryNames(
  type: string,
  matches: string[],
  optionsJson?: string | null,
  correctJson?: string | null
): string[] {
  if (normalizeOpTypeCode(type) !== 'category') return [];
  const fromMatch = [...new Set((matches || []).map((item) => String(item || '').trim()).filter(Boolean))];
  if (fromMatch.length) return fromMatch;
  const fromOptions = parseOpOptionParts(optionsJson).matches.filter(Boolean);
  if (fromOptions.length) return [...new Set(fromOptions)];
  const parsed = parseJsonText(correctJson);
  const rec = asRecord(parsed);
  const buckets = rec?.Buckets ?? rec?.buckets;
  if (buckets && typeof buckets === 'object' && !Array.isArray(buckets)) {
    return Object.keys(buckets as Record<string, unknown>).map((key) => key.trim()).filter(Boolean);
  }
  return [];
}

export function parseOpOptions(value: unknown): string[] {
  return asOptionList(value);
}

export function formatOpQuestionCorrect(row: {
  TypeCode: string;
  Answers: string[];
  Matches: string[];
  IsCorrect: boolean[];
  CorrectJson: string | null;
  OptionsJson: string | null;
}): string {
  const type = String(row.TypeCode || '').toLowerCase();
  if (type === 'single' || type === 'multi') {
    const picked = row.Answers.filter((_, i) => row.IsCorrect[i]).filter(Boolean);
    if (picked.length) return picked.join(', ');
  }
  if (type === 'order' && row.Answers.some(Boolean)) {
    return row.Answers.filter(Boolean).join(' → ');
  }
  if (type === 'match') {
    const pairs = row.Answers.map((left, i) => {
      const right = row.Matches[i];
      return left && right ? `${left} — ${right}` : '';
    }).filter(Boolean);
    if (pairs.length) return pairs.join(', ');
  }
  if (type === 'category') {
    const pairs = row.Answers.map((item, i) => {
      const cat = row.Matches[i];
      return item && cat ? `${item} → ${cat}` : '';
    }).filter(Boolean);
    if (pairs.length) return pairs.join(', ');
  }
  if (type === 'freetext') {
    const fromAnswer = String(row.Answers[0] || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    if (fromAnswer.length) return fromAnswer.join(', ');
  }
  return formatOpCorrect(row.TypeCode, row.CorrectJson, row.OptionsJson);
}

export function formatOpCorrect(typeCode: string, correctJson: string | null, optionsJson: string | null): string {
  if (!correctJson) return '—';
  const parsed = parseJsonText(correctJson);
  const options = parseOpOptions(optionsJson);
  const type = String(typeCode || '').toLowerCase();

  const optionAt = (index: number) => {
    if (index >= 0 && index < options.length) return options[index];
    return `${index + 1}.`;
  };

  if (typeof parsed === 'string') {
    return parsed.split('|').map((part) => part.trim()).filter(Boolean).join(', ') || parsed;
  }
  if (!parsed || typeof parsed !== 'object') return String(correctJson);

  const rec = parsed as Record<string, unknown>;
  if (type === 'freetext' || rec.Synonyms != null) {
    const list = Array.isArray(rec.Synonyms) ? rec.Synonyms : parseStringList(rec.Synonyms);
    return list.join(', ') || '—';
  }
  if (type === 'single' || rec.Index != null) {
    const index = nullableNumericId(rec.Index);
    if (index == null) return '—';
    return optionAt(index >= options.length && index > 0 ? index - 1 : index);
  }
  if (Array.isArray(rec.Indexes) || Array.isArray(rec.IndexList)) {
    const indexes = (rec.Indexes || rec.IndexList) as unknown[];
    return indexes
      .map((item) => nullableNumericId(item))
      .filter((id): id is number => id != null)
      .map((id) => optionAt(id >= options.length && id > 0 ? id - 1 : id))
      .join(', ');
  }
  if (Array.isArray(rec.Order)) {
    return (rec.Order as unknown[])
      .map((item) => nullableNumericId(item))
      .filter((id): id is number => id != null)
      .map((id, i) => `${i + 1}. ${optionAt(id >= options.length && id > 0 ? id - 1 : id)}`)
      .join(' → ');
  }
  if (Array.isArray(rec.Pairs)) {
    return (rec.Pairs as unknown[])
      .map((pair) => {
        if (Array.isArray(pair)) return pair.map((item) => String(item ?? '')).join(' — ');
        const row = asRecord(pair);
        if (!row) return '';
        return `${row.Left ?? row.A ?? ''} — ${row.Right ?? row.B ?? ''}`;
      })
      .filter(Boolean)
      .join(', ');
  }
  if (rec.Map && typeof rec.Map === 'object') {
    return Object.entries(rec.Map as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${String(val ?? '')}`)
      .join(', ');
  }
  return String(correctJson);
}

function normalizeStatus(value: unknown): string {
  return String(value ?? 'pending').trim().toLowerCase() || 'pending';
}

export function normalizeOpRounds(rows: unknown[], eventId?: number | string | null): OpRound[] {
  const list: OpRound[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.RoundID);
    const EventID = nullableNumericId(row.EventID ?? row.eventID) ?? nullableNumericId(eventId);
    if (id == null || EventID == null) continue;
    list.push({
      id,
      EventID,
      TopicID: nullableNumericId(row.TopicID ?? row.topicID),
      TopicName: String(row.TopicName ?? row.topicName ?? row.Topic ?? row.Name ?? '').trim(),
      Mode: String(row.Mode ?? row.mode ?? 'mixed').trim() || 'mixed',
      Kind: String(row.Kind ?? row.kind ?? '').trim().toLowerCase(),
      ExtraGameId:
        matchOpExtraGame(row.ExtraGameId ?? row.extraGameId ?? row.ExtraGameID)?.id ||
        String(row.ExtraGameId ?? row.extraGameId ?? row.ExtraGameID ?? '').trim().toUpperCase() ||
        null,
      StatusCode: normalizeStatus(row.StatusCode ?? row.statusCode ?? row.Status),
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex) ?? list.length + 1,
      VisibleFlg:
        row.VisibleFlg == null && row.visibleFlg == null && row.DisplayFlg == null && row.displayFlg == null
          ? null
          : isTruthyFlag(row.VisibleFlg ?? row.visibleFlg ?? row.DisplayFlg ?? row.displayFlg),
    });
  }
  return list.sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
}

export function normalizeOpEventQuestions(
  rows: unknown[],
  eventId?: number | string | null
): OpEventQuestion[] {
  const list: OpEventQuestion[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.EventQuestionID);
    const EventID = nullableNumericId(row.EventID ?? row.eventID) ?? nullableNumericId(eventId);
    const RoundID = nullableNumericId(row.RoundID ?? row.roundID);
    const TopicName = String(row.TopicName ?? row.topicName ?? row.Topic ?? '').trim();
    const ExtraGameId = explicitOpExtraGameId(
      String(row.ExtraGameId ?? row.extraGameId ?? row.ExtraGameID ?? row.Game ?? '').trim() || null
    );
    if (id == null || EventID == null) continue;
    if (RoundID == null && !ExtraGameId) continue;
    const options = row.OptionsJson ?? row.optionsJson ?? row.Options ?? row.options;
    const correct = row.CorrectJson ?? row.correctJson ?? row.Correct ?? row.correct;
    const fromJson = extractOpQuestionOptions(row);
    const typeRaw = String(row.TypeCode ?? row.typeCode ?? row.Type ?? 'single').trim() || 'single';
    const TypeCode = normalizeOpTypeCode(typeRaw) || typeRaw;
    const OptionsJson =
      options == null || options === '' ? null : typeof options === 'string' ? options : JSON.stringify(options);
    const CorrectJson =
      correct == null || correct === '' ? null : typeof correct === 'string' ? correct : JSON.stringify(correct);
    list.push({
      id,
      EventID,
      RoundID: RoundID ?? 0,
      QuestionID: nullableNumericId(row.QuestionID ?? row.questionID),
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex) ?? list.length + 1,
      StatusCode: normalizeStatus(row.StatusCode ?? row.statusCode ?? row.Status),
      StartedAtUtc: row.StartedAtUtc != null ? String(row.StartedAtUtc) : null,
      StoppedAtUtc: row.StoppedAtUtc != null ? String(row.StoppedAtUtc) : null,
      AnswerCount: nullableNumericId(row.AnswerCount ?? row.answerCount) ?? 0,
      TimeSec:
        nullableNumericId(
          row.TimeSec ??
            row.timeSec ??
            row.DurationSec ??
            row.durationSec ??
            row.Seconds ??
            row.seconds
        ) ?? 0,
      Prompt: String(row.Prompt ?? row.prompt ?? row.Question ?? '').trim(),
      TypeCode,
      OptionsJson,
      CorrectJson,
      TopicName,
      ExtraGameId,
      Answers:
        TypeCode === 'freetext'
          ? (() => {
              const synonyms = extractOpFreetextSynonyms(row);
              return synonyms.length ? [synonyms.join('|')] : fromJson.answers;
            })()
          : fromJson.answers,
      Matches: fromJson.matches,
      Categories: opCategoryNames(TypeCode, fromJson.matches, OptionsJson, CorrectJson),
      IsCorrect: readCorrectFlags(row, fromJson.optionItems),
      ImageKey: readOpMediaText(row.ImageKey, row.imageKey),
      ImageUrl: readOpMediaText(row.ImageUrl, row.imageUrl),
      AudioKey: readOpMediaText(row.AudioKey, row.audioKey, row.SoundKey, row.soundKey),
      AudioUrl: readOpMediaText(row.AudioUrl, row.audioUrl, row.SoundUrl, row.soundUrl, row.Mp3Url, row.mp3Url),
      MediaUrl: readOpMediaText(row.ImageUrl, row.imageUrl, row.MediaUrl, row.mediaUrl),
    });
  }
  return list.sort((a, b) => a.SortIndex - b.SortIndex || a.id - b.id);
}

export function normalizeOpTeams(rows: unknown[], eventId?: number | string | null): OpTeam[] {
  const list: OpTeam[] = [];
  const seen = new Set<number>();
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const KabalaID = nullableNumericId(
      row.KabalaID ?? row.kabalaID ?? row.KabalaId ?? row.kabalaId
    );
    const id =
      nullableNumericId(row.id ?? row.ID ?? row.Id ?? row.TeamID ?? row.TeamId ?? row.teamId) ??
      KabalaID;
    const EventID =
      nullableNumericId(row.EventID ?? row.eventID ?? row.EventId) ?? nullableNumericId(eventId);
    if (id == null || EventID == null || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      EventID,
      KabalaID,
      Name: String(row.Name ?? row.name ?? row.KabalaName ?? `Csapat ${id}`).trim(),
      MemberCount: nullableNumericId(row.MemberCount ?? row.memberCount) ?? 0,
    });
  }
  return list;
}

/** Csapatválasztó: profile. Váróterem: full, ha nincs, profile. */
export function kabalaImageOf(
  team: { KabalaID: number | null; Name: string },
  catalog: OpCatalogItem[],
  slot: 'profile' | 'full' = 'profile'
): string {
  const byId =
    team.KabalaID != null ? catalog.find((row) => row.id === team.KabalaID) : undefined;
  const name = String(team.Name || '').trim().toLowerCase();
  const byName = name ? catalog.find((row) => row.Name.trim().toLowerCase() === name) : undefined;
  const hit = byId || byName;
  if (!hit) return '';
  if (slot === 'full') return hit.FullUrl || hit.ImageUrl || '';
  return hit.ImageUrl || hit.FullUrl || '';
}
export function teamsFromKabalaIds(
  eventId: number | string | null | undefined,
  kabalaIds: number[],
  catalog: OpCatalogItem[],
  existing: OpTeam[] = []
): OpTeam[] {
  if (existing.length) return existing;
  const EventID = nullableNumericId(eventId);
  if (EventID == null) return [];
  const list: OpTeam[] = [];
  const seen = new Set<number>();
  for (const kid of kabalaIds || []) {
    if (kid == null || seen.has(kid)) continue;
    const cat = catalog.find((row) => row.id === kid);
    if (!cat) continue;
    seen.add(kid);
    list.push({
      id: kid,
      EventID,
      KabalaID: kid,
      Name: cat.Name,
      MemberCount: 0,
    });
  }
  return list;
}

function parseOpDisplayCastClock(cast: Record<string, unknown> | null) {
  if (!cast) {
    return {
      face: '',
      phase: '',
      hold: false,
      leftMs: null as number | null,
      tipName: '',
      tipTeam: '',
      outTeamIds: [] as number[],
    };
  }
  const nested = asRecord(cast.Payload) || asRecord(cast.payload);
  let json: Record<string, unknown> | null = null;
  const raw = cast.PayloadJson ?? cast.payloadJson ?? nested?.PayloadJson ?? nested?.payloadJson;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      json = asRecord(JSON.parse(raw));
    } catch {
      json = null;
    }
  } else {
    json = asRecord(raw);
  }
  const src = { ...cast, ...(nested || {}), ...(json || {}) };
  const phase = String(src.ClockPhase ?? src.clockPhase ?? '').trim().toLowerCase();
  const hold =
    [src.ClockHold, src.clockHold, src.Hold, src.hold, src.MosaicBlocked, src.Blocked].some(
      (value) => value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true'
    ) ||
    phase === 'paused' ||
    phase === 'read' ||
    Boolean(String(src.TipName ?? src.tipName ?? '').trim());
  const outRaw = src.MosaicOutTeamIds ?? src.mosaicOutTeamIds ?? src.outTeamIds ?? src.OutTeamIds;
  const outTeamIds = (Array.isArray(outRaw) ? outRaw : String(outRaw || '').split(','))
    .map((item) => Number(item))
    .filter((id) => Number.isFinite(id) && id > 0);
  return {
    face: String(src.Face ?? src.face ?? '').trim().toLowerCase(),
    phase,
    hold,
    leftMs: nullableNumericId(src.ClockLeftMs ?? src.clockLeftMs ?? src.LeftMs ?? src.leftMs),
    tipName: String(src.TipName ?? src.tipName ?? src.Nickname ?? src.nickname ?? '').trim(),
    tipTeam: String(src.TipTeam ?? src.tipTeam ?? src.TeamName ?? src.teamName ?? '').trim(),
    outTeamIds: [...new Set(outTeamIds)],
  };
}

export function normalizeOpLive(rows: unknown[], displayCast?: unknown[]): OpLiveState {
  const row = asRecord(rows?.[0]) || asRecord(rows);
  const cast = asRecord(displayCast?.[0]) || asRecord(displayCast);
  if (!row && !cast) return emptyOpLive();
  const clock = parseOpDisplayCastClock(cast);
  const playerFace = ['idle', 'lobby', 'results'].includes(clock.face)
    ? clock.face
    : String(row?.PlayerFace ?? row?.playerFace ?? '').trim().toLowerCase();
  const base = row || {};
  const rowPaused = [base.ClockPaused, base.clockPaused, base.PausedFlg, base.pausedFlg, base.Hold, base.hold].some(
    (value) => value === true || value === 1 || value === '1' || String(value || '').toLowerCase() === 'true'
  );
  return {
    DisplayState: String(base.DisplayState ?? base.displayState ?? base.State ?? 'idle').trim() || 'idle',
    PlayerFace: playerFace,
    ActiveRoundID: nullableNumericId(base.ActiveRoundID ?? base.activeRoundID ?? base.RoundID),
    ActiveEventQuestionID: nullableNumericId(
      base.ActiveEventQuestionID ?? base.activeEventQuestionID ?? base.EventQuestionID
    ),
    FocusedEventQuestionID: nullableNumericId(
      base.FocusedEventQuestionID ?? base.focusedEventQuestionID ?? base.FocusEventQuestionID
    ),
    StateVersion: nullableNumericId(base.StateVersion ?? base.stateVersion) ?? 0,
    AnswerCount: nullableNumericId(base.AnswerCount ?? base.answerCount) ?? 0,
    QuestionStatus: String(base.QuestionStatus ?? base.questionStatus ?? base.StatusCode ?? '').trim().toLowerCase(),
    StartedAtUtc: base.StartedAtUtc != null && base.StartedAtUtc !== '' ? String(base.StartedAtUtc) : null,
    TimeSec: nullableNumericId(base.TimeSec ?? base.timeSec),
    ClockPaused: clock.phase === 'play' || clock.phase === 'done' ? false : clock.hold || rowPaused,
    ClockLeftMs:
      clock.leftMs ??
      nullableNumericId(base.ClockLeftMs ?? base.clockLeftMs ?? base.RemainingMs ?? base.LeftMs ?? base.leftMs),
    DisplayClockPhase: clock.phase,
    MosaicTipName: clock.tipName,
    MosaicTipTeam: clock.tipTeam,
    MosaicOutTeamIds: clock.outTeamIds,
    ExtraRunID: nullableNumericId(base.ExtraRunID ?? base.extraRunID ?? base.ExtraRunId),
    ExtraGameId:
      matchOpExtraGame(base.ExtraGameId ?? base.extraGameId ?? base.ExtraGameID)?.id ||
      String(base.ExtraGameId ?? base.extraGameId ?? '').trim().toUpperCase() ||
      null,
    ActiveExtraQuestionID: nullableNumericId(
      base.ActiveExtraQuestionID ?? base.activeExtraQuestionID ?? base.ExtraQuestionID
    ),
    ExtraQuestionStatus: String(base.ExtraQuestionStatus ?? base.extraQuestionStatus ?? '').trim().toLowerCase(),
  };
}

function extraPoolRowKey(row: { ExtraGameId: string; id: number }) {
  return `${row.ExtraGameId}:${row.id}`;
}

function foldOpPrompt(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Feltöltött dummy extra sor — ne játsszuk, ne szerkesszük. */
export function isDroppedOpExtraPrompt(prompt: string) {
  return foldOpPrompt(prompt) === 'melyikegyextratesztkerdes';
}

function extraPoolStatusRank(code: string) {
  if (code === 'active' || code === 'stopped') return 2;
  if (code === 'closed') return 1;
  return 0;
}

function extraCorrectLooksSet(flags: boolean[]) {
  return (flags || []).some(Boolean);
}

function hydrateOpExtraPoolItem(existing: OpExtraPoolItem, row: OpExtraPoolItem) {
  if (row.Answers.length > existing.Answers.length) {
    existing.Answers = [...row.Answers];
    if (extraCorrectLooksSet(row.IsCorrect) || !extraCorrectLooksSet(existing.IsCorrect)) {
      existing.IsCorrect = [...(row.IsCorrect || [])];
    }
  } else if (!existing.Answers.length && row.Answers.length) {
    existing.Answers = [...row.Answers];
    existing.IsCorrect = [...(row.IsCorrect || [])];
  } else if (
    row.Answers.length === existing.Answers.length &&
    extraCorrectLooksSet(row.IsCorrect) &&
    !extraCorrectLooksSet(existing.IsCorrect)
  ) {
    existing.IsCorrect = [...(row.IsCorrect || [])];
  }
  if (!existing.Prompt && row.Prompt) existing.Prompt = row.Prompt;
  if (existing.QuestionID == null && row.QuestionID != null) existing.QuestionID = row.QuestionID;
  if (row.TimeSec > 0) existing.TimeSec = row.TimeSec;
  if (extraPoolStatusRank(row.StatusCode) > extraPoolStatusRank(existing.StatusCode)) {
    existing.StatusCode = row.StatusCode;
  }
  if (!existing.StartedAtUtc && row.StartedAtUtc) existing.StartedAtUtc = row.StartedAtUtc;
  if (!existing.TopicName && row.TopicName) existing.TopicName = row.TopicName;
  if (!row.topicOnly) existing.topicOnly = false;
  fillExtraMedia(existing, row);
}

function keepExplicitExtraRows(rows: OpExtraPoolItem[]): OpExtraPoolItem[] {
  const explicitGames = new Set(rows.filter((row) => !row.topicOnly).map((row) => row.ExtraGameId));
  if (!explicitGames.size) return rows;
  return rows.filter((row) => !row.topicOnly || !explicitGames.has(row.ExtraGameId));
}

function collapseOpExtraPool(rows: OpExtraPoolItem[]): OpExtraPoolItem[] {
  const list: OpExtraPoolItem[] = [];
  const index = new Map<string, number>();
  for (const row of rows) {
    const key = extraPoolRowKey(row);
    const at = index.get(key);
    if (at != null) {
      hydrateOpExtraPoolItem(list[at], row);
      continue;
    }
    index.set(key, list.length);
    list.push({
      ...row,
      Answers: [...(row.Answers || [])],
      IsCorrect: [...(row.IsCorrect || [])],
    });
  }
  const byQuestion = new Map<string, OpExtraPoolItem>();
  const collapsed: OpExtraPoolItem[] = [];
  for (const row of list) {
    if (row.QuestionID == null) {
      collapsed.push(row);
      continue;
    }
    const qkey = `${row.ExtraGameId}:${row.QuestionID}`;
    const hit = byQuestion.get(qkey);
    if (hit) {
      hydrateOpExtraPoolItem(hit, row);
      continue;
    }
    byQuestion.set(qkey, row);
    collapsed.push(row);
  }
  const withAnswers = new Map<number, OpExtraPoolItem>();
  for (const row of collapsed) {
    if (row.QuestionID == null || !row.Answers.length) continue;
    const hit = withAnswers.get(row.QuestionID);
    if (!hit || row.Answers.length > hit.Answers.length) withAnswers.set(row.QuestionID, row);
  }
  for (const row of collapsed) {
    if (row.Answers.length || row.QuestionID == null) continue;
    const src = withAnswers.get(row.QuestionID);
    if (!src) continue;
    row.Answers = [...src.Answers];
    row.IsCorrect = [...src.IsCorrect];
  }
  return keepExplicitExtraRows(collapsed).sort(
    (a, b) =>
      a.ExtraGameId.localeCompare(b.ExtraGameId) || a.SortIndex - b.SortIndex || a.id - b.id
  );
}

export function normalizeOpExtraPool(
  rows: unknown[],
  eventId?: number | string | null
): OpExtraPoolItem[] {
  const list: OpExtraPoolItem[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const explicit = explicitOpExtraGameId(
      String(row.ExtraGameId ?? row.extraGameId ?? row.ExtraGameID ?? row.Game ?? '').trim() || null
    );
    const topicName = String(row.TopicName ?? row.topicName ?? row.Topic ?? '').trim();
    const ExtraGameId = explicit || topicOpExtraGameId(topicName);
    if (!ExtraGameId) continue;
    const EventID = nullableNumericId(row.EventID ?? row.eventID) ?? nullableNumericId(eventId);
    if (EventID == null) continue;
    const id =
      nullableNumericId(
        row.ExtraQuestionID ??
          row.ExtraQuestionId ??
          row.id ??
          row.ID ??
          row.EventExtraQuestionID ??
          row.QuestionID
      ) ?? -(list.length + 1);
    const fromJson = extractOpQuestionOptions(row);
    const TypeCode = normalizeOpTypeCode(String(row.TypeCode ?? row.typeCode ?? row.Type ?? 'single')) || 'single';
    const Prompt = String(row.Prompt ?? row.prompt ?? row.Question ?? '').trim();
    if (isDroppedOpExtraPrompt(Prompt)) continue;
    list.push({
      id,
      EventID,
      QuestionID: nullableNumericId(row.QuestionID ?? row.questionID ?? row.QuestionId),
      ExtraGameId,
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex) ?? list.length + 1,
      StatusCode: normalizeStatus(row.StatusCode ?? row.statusCode ?? row.Status),
      TypeCode,
      Prompt,
      TopicName: topicName,
      TimeSec: nullableNumericId(row.TimeSec ?? row.timeSec) ?? 0,
      StartedAtUtc: row.StartedAtUtc != null && row.StartedAtUtc !== '' ? String(row.StartedAtUtc) : null,
      topicOnly: !explicit,
      Answers: TypeCode === 'freetext' ? extraFreetextAnswers(row, fromJson.answers) : fromJson.answers,
      IsCorrect: readCorrectFlags(row, fromJson.optionItems),
      ...extraMediaOf(row),
    });
  }
  return collapseOpExtraPool(list);
}

function extraPoolFromQuestion(row: OpEventQuestion): OpExtraPoolItem | null {
  const explicit = explicitOpExtraGameId(row.ExtraGameId);
  const ExtraGameId = explicit || topicOpExtraGameId(row.TopicName);
  if (!ExtraGameId || isDroppedOpExtraPrompt(row.Prompt)) return null;
  return {
    id: row.id,
    EventID: row.EventID,
    QuestionID: row.QuestionID,
    ExtraGameId,
    topicOnly: !explicit,
    SortIndex: row.SortIndex,
    StatusCode: row.StatusCode,
    TypeCode: row.TypeCode,
    Prompt: row.Prompt,
    TopicName: row.TopicName,
    TimeSec: row.TimeSec,
    StartedAtUtc: row.StartedAtUtc,
    Answers: row.Answers || [],
    IsCorrect: row.IsCorrect || [],
    ...extraMediaOf(row),
  };
}

export function extraCatalogFromRepo(
  rows: OpRepoQuestion[],
  eventId?: number | string | null
): OpExtraPoolItem[] {
  const EventID = nullableNumericId(eventId);
  if (EventID == null) return [];
  const list: OpExtraPoolItem[] = [];
  for (const row of rows) {
    const explicit = explicitOpExtraGameId(row.ExtraGameId);
    const ExtraGameId = explicit || topicOpExtraGameId(row.TopicName);
    if (!ExtraGameId || isDroppedOpExtraPrompt(row.Prompt)) continue;
    list.push({
      id: row.id,
      EventID,
      QuestionID: row.id,
      ExtraGameId,
      topicOnly: !explicit,
      SortIndex: row.SortIndex ?? list.length + 1,
      StatusCode: 'pending',
      TypeCode: row.TypeCode,
      Prompt: row.Prompt,
      TopicName: row.TopicName,
      TimeSec: row.TimeSec,
      StartedAtUtc: null,
      Answers: row.TypeCode === 'freetext' ? splitPipeTexts(row.Answers || []) : row.Answers || [],
      IsCorrect: row.IsCorrect || [],
      ...extraMediaOf(row),
    });
  }
  return collapseOpExtraPool(list);
}

export function mergeOpExtraPool(
  pool: OpExtraPoolItem[],
  extras: OpExtraPoolItem[],
  questions: OpEventQuestion[]
): OpExtraPoolItem[] {
  const list = collapseOpExtraPool(pool);
  const index = new Map(list.map((row, at) => [extraPoolRowKey(row), at]));
  const push = (row: OpExtraPoolItem) => {
    const key = extraPoolRowKey(row);
    const at = index.get(key);
    if (at != null) {
      hydrateOpExtraPoolItem(list[at], row);
      return;
    }
    const existing =
      row.QuestionID != null
        ? list.find((item) => item.ExtraGameId === row.ExtraGameId && item.QuestionID === row.QuestionID)
        : undefined;
    if (existing) {
      hydrateOpExtraPoolItem(existing, row);
      return;
    }
    index.set(key, list.length);
    list.push({
      ...row,
      Answers: [...(row.Answers || [])],
      IsCorrect: [...(row.IsCorrect || [])],
    });
  };
  for (const row of extras) push(row);
  for (const row of questions) {
    const mapped = extraPoolFromQuestion(row);
    if (mapped) push(mapped);
  }
  return reconcileOpExtraCatalog(collapseOpExtraPool(list));
}

export function reconcileOpExtraCatalog(
  rows: OpExtraPoolItem[],
  repo: OpRepoQuestion[] = []
): OpExtraPoolItem[] {
  const byId = new Map(repo.map((row) => [row.id, row]));
  const out: OpExtraPoolItem[] = [];
  for (const row of rows || []) {
    const repoRow =
      (row.QuestionID != null ? byId.get(row.QuestionID) : undefined) || byId.get(row.id);
    const topic = row.TopicName || repoRow?.TopicName || '';
    const explicit = explicitOpExtraGameId(row.ExtraGameId);
    const extraId = explicit || topicOpExtraGameId(topic);
    if (!extraId) continue;
    out.push({
      ...row,
      TopicName: topic || row.TopicName,
      ExtraGameId: extraId,
      topicOnly: explicit ? false : row.topicOnly !== false,
      QuestionID: row.QuestionID ?? repoRow?.id ?? null,
    });
  }
  return collapseOpExtraPool(out);
}

export function uniqueOpExtraGameIds(...groups: Array<string[] | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const raw of group || []) {
      const id = String(raw || '').trim().toUpperCase();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function normalizeOpRepoQuestions(rows: unknown[]): OpRepoQuestion[] {
  const list: OpRepoQuestion[] = [];
  const seen = new Set<number>();
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const id = nullableNumericId(row.id ?? row.ID ?? row.QuestionID ?? row.QuestionId) ?? -(list.length + 1);
    if (seen.has(id)) continue;
    const prompt = String(row.Prompt ?? row.prompt ?? row.Question ?? row.Kérdés ?? '').trim();
    if (!prompt && id < 0) continue;
    seen.add(id);
    const fromJson = extractOpQuestionOptions(row);
    const ExtraGameId = explicitOpExtraGameId(
      String(row.ExtraGameId ?? row.extraGameId ?? row.ExtraGameID ?? row.Game ?? '').trim() || null
    );
    const TypeCode = normalizeOpTypeCode(String(row.TypeCode ?? row.typeCode ?? row.Type ?? 'single')) || 'single';
    list.push({
      id,
      TopicID: nullableNumericId(row.TopicID ?? row.topicID),
      TopicName: String(row.TopicName ?? row.topicName ?? row.Topic ?? '').trim(),
      TypeCode,
      Prompt: prompt,
      TimeSec: nullableNumericId(row.TimeSec ?? row.timeSec) ?? 0,
      ...extraMediaOf(row),
      UsedFlg: isTruthyFlag(row.UsedFlg ?? row.usedFlg ?? row.InEventFlg),
      SortIndex: nullableNumericId(row.SortIndex ?? row.sortIndex ?? row.OrderNo),
      ExtraGameId,
      Answers: TypeCode === 'freetext' ? extraFreetextAnswers(row, fromJson.answers) : fromJson.answers,
      IsCorrect: readCorrectFlags(row, fromJson.optionItems),
    });
  }
  return list;
}

export function normalizeOpSettings(
  rows: unknown[],
  eventId?: number | string | null
): OpEventSettings[] {
  const list: OpEventSettings[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const EventID =
      nullableNumericId(row.EventID ?? row.eventID ?? row.EventId) ?? nullableNumericId(eventId);
    if (EventID == null) continue;
    list.push({
      EventID,
      DeskCountHint: nullableNumericId(row.DeskCountHint ?? row.deskCountHint),
      MaxTeamSize: nullableNumericId(row.MaxTeamSize ?? row.maxTeamSize) ?? 8,
      PlannedDurationMin: nullableNumericId(row.PlannedDurationMin ?? row.plannedDurationMin) ?? 90,
      ShadowAwardFlg:
        row.ShadowAwardFlg == null && row.shadowAwardFlg == null
          ? true
          : isTruthyFlag(row.ShadowAwardFlg ?? row.shadowAwardFlg),
      CurrentFlg: isTruthyFlag(row.CurrentFlg ?? row.currentFlg),
      TopicIds: parseIdList(row.TopicIds ?? row.TopicIdsJson ?? row.topicIds),
      ExtraGameIds: uniqueOpExtraGameIds(
        parseStringList(pickFilledExtraGameIds(row)).map((id) => matchOpExtraGame(id)?.id || id.toUpperCase())
      ),
      KabalaIds: parseIdList(row.KabalaIds ?? row.KabalaIdsJson ?? row.kabalaIds),
    });
  }
  return list;
}

export type OpLeaderboardBoard = 'main' | 'quiz' | 'games' | 'shadow' | 'raw';

export function formatOpAnswerPoints(value: number): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function formatOpScoreDelta(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  const text = Math.abs(n).toFixed(2);
  if (n > 0) return `+${text}`;
  if (n < 0) return `-${text}`;
  return text;
}

export interface OpLeaderboardRow {
  key: string;
  name: string;
  points: number;
  previousPoints: number;
  place: number;
  teamId: number | null;
  eventUserId: number | null;
  teamName: string;
  extraGameId: string;
  roundId: number | null;
}

function readLeaderboardPoints(row: Record<string, unknown>, mode: 'f' | 'raw' | 'extra' | 'points'): number {
  if (mode === 'points') {
    const value = Number(row.Points ?? row.points ?? row.Score ?? row.score ?? row.Total ?? row.total);
    return Number.isFinite(value) ? value : 0;
  }
  if (mode === 'raw') {
    const raw = row.RawS ?? row.rawS ?? row.Points ?? row.points ?? row.Score ?? row.score ?? row.Total ?? row.total;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }
  if (mode === 'extra') {
    const extra =
      row.ExtraScore ??
      row.extraScore ??
      row.Extra ??
      row.extra ??
      row.GamePoints ??
      row.gamePoints ??
      row.Points ??
      row.points ??
      row.Score ??
      row.score ??
      row.Total ??
      row.total;
    const value = Number(extra);
    return Number.isFinite(value) ? Math.round(value) : 0;
  }
  const placed = row.F ?? row.f ?? row.PlacementPoints ?? row.placementPoints ?? row.StandingsPoints;
  if (placed != null && placed !== '') {
    const value = Number(placed);
    return Number.isFinite(value) ? Math.round(value) : 0;
  }
  const raw = row.Points ?? row.points ?? row.Score ?? row.score ?? row.Total ?? row.total;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  if (Math.abs(value - Math.round(value)) > 0.001) return 0;
  return Math.round(value);
}

function readPreviousPoints(row: Record<string, unknown>): number {
  const raw = row.PreviousPoints ?? row.previousPoints ?? row.PrevPoints ?? row.prevPoints;
  if (raw == null || raw === '') return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function normalizeOpLeaderboardRows(
  rows: unknown[],
  mode: 'f' | 'raw' | 'extra' | 'points' = 'f'
): OpLeaderboardRow[] {
  const list: OpLeaderboardRow[] = [];
  for (const raw of rows || []) {
    const row = asRecord(raw);
    if (!row) continue;
    const teamId = nullableNumericId(row.TeamId ?? row.TeamID ?? row.teamId ?? row.teamID);
    const eventUserId = nullableNumericId(
      row.EventUserID ?? row.EventUserId ?? row.eventUserID ?? row.eventUserId
    );
    const name = String(
      row.Name ?? row.name ?? row.Nickname ?? row.nickname ?? row.DisplayName ?? row.displayName ?? ''
    ).trim();
    const teamName = String(
      row.TeamName ?? row.teamName ?? row.KabalaName ?? row.kabalaName ?? row.Team ?? ''
    ).trim();
    if (!name && teamId == null && eventUserId == null) continue;
    const placeRaw = Number(row.Place ?? row.place ?? row.Rank ?? row.rank ?? 0);
    const label = name || (teamId != null ? `Csapat ${teamId}` : 'Névtelen');
    const points = readLeaderboardPoints(row, mode);
    list.push({
      key: eventUserId != null ? `u${eventUserId}` : teamId != null ? `t${teamId}` : `n${list.length}-${label}`,
      name: label,
      points,
      previousPoints: readPreviousPoints(row),
      place: Number.isFinite(placeRaw) && placeRaw > 0 ? placeRaw : 0,
      teamId,
      eventUserId,
      teamName: teamName && teamName !== label ? teamName : '',
      extraGameId: matchOpExtraGame(
        row.ExtraGameId ?? row.extraGameId ?? row.ExtraGameID ?? row.Game
      )?.id || String(row.ExtraGameId ?? row.extraGameId ?? '').trim().toUpperCase(),
      roundId: nullableNumericId(row.RoundID ?? row.roundId ?? row.RoundId),
    });
  }
  const hasPlaces = list.length > 0 && list.every((row) => row.place > 0);
  const ranked = [...list].sort((a, b) => {
    if (hasPlaces && a.place !== b.place) return a.place - b.place;
    return b.points - a.points || a.name.localeCompare(b.name, 'hu');
  });
  if (hasPlaces) return ranked;
  let place = 1;
  return ranked.map((row, index) => {
    if (index > 0 && row.points < ranked[index - 1].points) place = index + 1;
    return { ...row, place };
  });
}

export function mergeOpLeaderboardRows(...groups: OpLeaderboardRow[][]): OpLeaderboardRow[] {
  const byKey = new Map<string, OpLeaderboardRow>();
  for (const group of groups) {
    for (const row of group) {
      const key =
        row.teamId != null ? `t${row.teamId}` : row.eventUserId != null ? `u${row.eventUserId}` : row.name;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...row, key });
        continue;
      }
      byKey.set(key, {
        ...prev,
        points: prev.points + row.points,
        previousPoints: prev.previousPoints + row.previousPoints,
        name: prev.name || row.name,
        teamName: prev.teamName || row.teamName,
        teamId: prev.teamId ?? row.teamId,
        eventUserId: prev.eventUserId ?? row.eventUserId,
      });
    }
  }
  return rankOpLeaderboardRows([...byKey.values()]);
}

function rankOpLeaderboardRows(rows: OpLeaderboardRow[]): OpLeaderboardRow[] {
  const ranked = [...rows].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'hu'));
  let place = 1;
  return ranked.map((row, index) => {
    if (index > 0 && row.points < ranked[index - 1].points) place = index + 1;
    return { ...row, place };
  });
}

export function extraPenaltyStandings(teams: OpTeam[], penalties: OpPenalty[]): OpLeaderboardRow[] {
  const sums = sumOpPenaltiesByTeam(penalties);
  return rankOpLeaderboardRows(
    teams
      .filter((team) => team.Name.trim())
      .map((team) => ({
        key: `t${team.id}`,
        name: team.Name,
        points: sums[team.id] || 0,
        previousPoints: 0,
        place: 0,
        teamId: team.id,
        eventUserId: null,
        teamName: '',
        extraGameId: '',
        roundId: null,
      }))
  );
}

export function withOpPenaltyPoints(
  rows: OpLeaderboardRow[],
  teams: OpTeam[],
  penalties: OpPenalty[]
): OpLeaderboardRow[] {
  const sums = sumOpPenaltiesByTeam(penalties);
  const seen = new Set<number>();
  const next = rows.map((row) => {
    if (row.teamId != null) seen.add(row.teamId);
    return {
      ...row,
      points: row.points + (row.teamId != null ? sums[row.teamId] || 0 : 0),
    };
  });
  for (const team of teams) {
    if (!team.Name.trim() || seen.has(team.id)) continue;
    const points = sums[team.id] || 0;
    if (!points) continue;
    next.push({
      key: `t${team.id}`,
      name: team.Name,
      points,
      previousPoints: 0,
      place: 0,
      teamId: team.id,
      eventUserId: null,
      teamName: '',
      extraGameId: '',
      roundId: null,
    });
  }
  return rankOpLeaderboardRows(next);
}

export function filterOpLeaderboardRows(
  rows: OpLeaderboardRow[],
  opts?: { extraGameId?: string | null; roundId?: number | null }
): OpLeaderboardRow[] {
  const extra =
    matchOpExtraGame(opts?.extraGameId)?.id || String(opts?.extraGameId || '').trim().toUpperCase();
  const roundId = opts?.roundId != null && opts.roundId > 0 ? opts.roundId : null;
  let next = rows;
  if (extra) {
    const tagged = next.filter((row) => row.extraGameId === extra);
    if (tagged.length) next = tagged;
  }
  if (roundId != null) {
    const tagged = next.filter((row) => row.roundId === roundId);
    if (tagged.length) next = tagged;
  }
  return next;
}
