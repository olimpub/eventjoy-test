import { defineStore } from 'pinia';
import {
  fetchOpEvent,
  fetchOpMaster,
  fetchOpQuestions,
} from 'src/modules/olimpub/opApi';
import {
  extraCatalogFromRepo,
  emptyOpLive,
  mergeOpExtraPool,
  opLiveQuestionStatus,
  sameOpLiveQuestion,
  type OpCatalogItem,
  type OpEventQuestion,
  type OpEventSettings,
  type OpExtraPoolItem,
  type OpLiveState,
  type OpPenalty,
  type OpRepoQuestion,
  type OpRound,
  type OpTeam,
  type OpTeamMember,
} from 'src/modules/olimpub/opData';

export interface OpGameState {
  rounds: OpRound[];
  questions: OpEventQuestion[];
  extraPool: OpExtraPoolItem[];
  extraCatalog: OpExtraPoolItem[];
  teams: OpTeam[];
  teamMembers: OpTeamMember[];
  penalties: OpPenalty[];
  live: OpLiveState;
  repoQuestions: OpRepoQuestion[];
  loadedAt: number;
  displayCast: Record<string, unknown> | null;
}

const emptyLive = (): OpLiveState => emptyOpLive();

const pingReloadTimers = new Map<string, number>();
const recentPingKeys: { key: string; at: number }[] = [];

function optionalCount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isOpStartAction(action: string) {
  return (
    action === 'Op.StartQuestion' ||
    action === 'Op.StartExtraQuestion' ||
    action === 'Op.NextQuestion' ||
    action === 'Op.ReopenQuestion'
  );
}

function pingKey(eventId: number | string | null, action: string, body: Record<string, unknown>) {
  return [
    eventId ?? '',
    action,
    body.Glyph ?? body.glyph ?? '',
    body.AnswerCount ?? body.answerCount ?? body.SubmittedCount ?? '',
    body.EventUserID ?? body.eventUserID ?? body.UserID ?? '',
    body.TeamID ?? body.teamId ?? body.TeamId ?? '',
    body.Nickname ?? body.nickname ?? '',
    body.Hold ?? body.hold ?? '',
    body.Face ?? body.face ?? '',
  ].join('|');
}

function isDuplicatePing(key: string) {
  const now = Date.now();
  const windowMs = 150;
  while (recentPingKeys.length && now - (recentPingKeys[0]?.at || 0) > windowMs) {
    recentPingKeys.shift();
  }
  if (recentPingKeys.some((row) => row.key === key && now - row.at < windowMs)) return true;
  recentPingKeys.push({ key, at: now });
  return false;
}

export const useOlimpubStore = defineStore('olimpub', {
  state: () => ({
    kabalas: [] as OpCatalogItem[],
    topics: [] as OpCatalogItem[],
    masterLoaded: false,
    eventSettings: [] as OpEventSettings[],
    games: {} as Record<string, OpGameState>,
    pingAt: 0,
    lastPingAction: '',
    lastPingEventId: null as number | null,
    lastPingGlyph: '',
    lastPingAnswerCount: null as number | null,
    lastPingRosterCount: null as number | null,
    lastPingHold: null as boolean | null,
    lastPingLeftMs: null as number | null,
    lastPingTeamId: null as number | null,
    lastPingTeamName: '',
    lastPingNickname: '',
    lastPingFace: '',
    lastPingClockPhase: '',
    lastPingCorrectFlg: null as boolean | null,
    lastPingEventUserId: null as number | null,
    lastPingCast: null as Record<string, unknown> | null,
    clearedExtraGames: {} as Record<string, string[]>,
  }),
  getters: {
    getSettingsForEvent: (state) => (eventId: number | string) => {
      const numId = Number(eventId);
      return (
        state.eventSettings.find(
          (row) => Number(row.EventID) === numId || String(row.EventID) === String(eventId)
        ) || null
      );
    },
    getGame: (state) => (eventId: number | string): OpGameState => {
      const row = state.games[String(eventId)];
      if (!row) {
        return {
          rounds: [],
          questions: [],
          extraPool: [],
          extraCatalog: [],
          teams: [],
          teamMembers: [],
          penalties: [],
          live: emptyLive(),
          repoQuestions: [],
          loadedAt: 0,
          displayCast: null,
        };
      }
      return {
        ...row,
        extraPool: row.extraPool || [],
        extraCatalog: row.extraCatalog || [],
        teamMembers: row.teamMembers || [],
        teams: row.teams || [],
        penalties: row.penalties || [],
      };
    },
  },
  actions: {
    replaceSettings(rows: OpEventSettings[]) {
      if (!rows.length) return;
      const next = [...this.eventSettings];
      for (const row of rows) {
        const idx = next.findIndex((item) => String(item.EventID) === String(row.EventID));
        if (idx >= 0) next[idx] = row;
        else next.push(row);
      }
      this.eventSettings = next;
    },
    notePing(eventId: number | string | null, action = '', payload: Record<string, unknown> | null = null) {
      const body = payload && typeof payload === 'object' ? payload : {};
      if (isDuplicatePing(pingKey(eventId, action, body))) return;
      const key = eventId != null && eventId !== '' ? String(eventId) : '';
      const prevGame = key ? this.games[key] || this.getGame(eventId as number | string) : null;
      if (action === 'Op.MosaicBuzz' && prevGame?.live.ClockPaused) return;
      this.pingAt = Date.now();
      this.lastPingAction = action;
      this.lastPingEventId = eventId != null ? Number(eventId) : null;
      this.lastPingGlyph = String(body.Glyph ?? body.glyph ?? '');
      const answers = optionalCount(
        body.AnswerCount ?? body.answerCount ?? body.SubmittedCount ?? body.submittedCount
      );
      const roster = optionalCount(body.RosterCount ?? body.rosterCount);
      if (isOpStartAction(action)) {
        this.lastPingAnswerCount = 0;
      } else if (answers != null) {
        this.lastPingAnswerCount = Math.max(this.lastPingAnswerCount ?? 0, answers);
      } else if (action === 'Op.SubmitAnswer') {
        this.lastPingAnswerCount = (this.lastPingAnswerCount ?? 0) + 1;
      }
      if (roster != null) this.lastPingRosterCount = roster;
      const clockPhase = String(body.ClockPhase ?? body.clockPhase ?? '').trim().toLowerCase();
      if (action === 'Op.CastDisplay') this.lastPingClockPhase = clockPhase;
      if (action === 'Op.MosaicBuzz') {
        this.lastPingHold = true;
      } else if (body.Hold != null || body.hold != null || body.ClockHold != null || body.clockHold != null) {
        this.lastPingHold = Boolean(body.Hold ?? body.hold ?? body.ClockHold ?? body.clockHold);
      } else if (action === 'Op.CastDisplay' && (clockPhase === 'paused' || clockPhase === 'read')) {
        this.lastPingHold = true;
      } else if (action === 'Op.CastDisplay' && (clockPhase === 'play' || clockPhase === 'done')) {
        this.lastPingHold = false;
      } else {
        this.lastPingHold = null;
      }
      const left = Number(body.LeftMs ?? body.leftMs ?? body.ClockLeftMs ?? body.clockLeftMs);
      this.lastPingLeftMs = Number.isFinite(left) ? left : null;
      const teamId = Number(body.TeamID ?? body.teamId ?? body.TeamId);
      this.lastPingTeamId = Number.isFinite(teamId) && teamId > 0 ? teamId : null;
      this.lastPingTeamName = String(
        body.TeamName ?? body.teamName ?? body.TipTeam ?? body.tipTeam ?? ''
      );
      this.lastPingNickname = String(
        body.Nickname ?? body.nickname ?? body.Name ?? body.name ?? body.TipName ?? body.tipName ?? ''
      );
      const userId = Number(body.EventUserID ?? body.eventUserID ?? body.EventUserId ?? body.UserID);
      this.lastPingEventUserId = Number.isFinite(userId) && userId > 0 ? userId : null;
      const judged = body.CorrectFlg ?? body.correctFlg ?? body.Correct ?? body.correct;
      if (action === 'Op.MosaicJudge') {
        this.lastPingCorrectFlg =
          judged === true || judged === 1 || judged === '1' || String(judged || '').toLowerCase() === 'true';
      } else if (action === 'Op.MosaicBuzz' || isOpStartAction(action) || action === 'Op.StartExtraQuestion') {
        this.lastPingCorrectFlg = null;
      }
      const face = String(body.Face ?? body.face ?? '').trim().toLowerCase();
      if (action === 'Op.CastDisplay' && face) this.lastPingFace = face;
      if (action === 'Op.CastDisplay' || action === 'Op.ShowLeaderboard') {
        this.lastPingCast = body;
      }
      if (!key) return;
      const nextCount = isOpStartAction(action)
        ? 0
        : Math.max(prevGame?.live.AnswerCount || 0, this.lastPingAnswerCount ?? 0);
      const paused =
        isOpStartAction(action) || action === 'Op.StartExtra'
          ? false
          : action === 'Op.MosaicBuzz'
            ? true
            : action === 'Op.MosaicJudge'
              ? false
              : action === 'Op.CastDisplay' && this.lastPingHold === true
                ? true
                : action === 'Op.CastDisplay' && this.lastPingHold === false
                  ? false
                  : action === 'Op.PauseQuestion' && this.lastPingHold != null
                    ? this.lastPingHold
                    : Boolean(prevGame?.live.ClockPaused);
      this.games[key] = {
        ...(prevGame || this.getGame(eventId as number | string)),
        live: {
          ...(prevGame?.live || this.getGame(eventId as number | string).live),
          AnswerCount: nextCount,
          PlayerFace:
            action === 'Op.CastDisplay' && (face === 'idle' || face === 'lobby' || face === 'results')
              ? face
              : prevGame?.live.PlayerFace || '',
          ClockPaused: paused,
          ClockLeftMs:
            this.lastPingLeftMs != null &&
            (action === 'Op.MosaicBuzz' ||
              action === 'Op.PauseQuestion' ||
              (action === 'Op.CastDisplay' && this.lastPingLeftMs != null))
              ? this.lastPingLeftMs
              : prevGame?.live.ClockLeftMs ?? null,
          DisplayClockPhase:
            action === 'Op.CastDisplay' && clockPhase
              ? clockPhase
              : action === 'Op.MosaicBuzz'
                ? 'paused'
                : action === 'Op.MosaicJudge' || isOpStartAction(action)
                  ? ''
                  : prevGame?.live.DisplayClockPhase || '',
          MosaicTipName:
            action === 'Op.MosaicJudge' || isOpStartAction(action)
              ? ''
              : this.lastPingNickname || prevGame?.live.MosaicTipName || '',
          MosaicTipTeam:
            action === 'Op.MosaicJudge' || isOpStartAction(action)
              ? ''
              : this.lastPingTeamName || prevGame?.live.MosaicTipTeam || '',
          MosaicOutTeamIds: (() => {
            const prevOut = prevGame?.live.MosaicOutTeamIds || [];
            if (isOpStartAction(action) || action === 'Op.StartExtra') return [];
            if (action === 'Op.MosaicJudge' && this.lastPingCorrectFlg === true) return [];
            const extra = body.MosaicOutTeamIds ?? body.mosaicOutTeamIds ?? body.outTeamIds;
            const listed = (Array.isArray(extra) ? extra : String(extra ?? '').split(','))
              .map((item) => Number(item))
              .filter((id) => Number.isFinite(id) && id > 0);
            if (action === 'Op.CastDisplay' && extra != null) return [...new Set(listed)];
            const next = [...prevOut];
            if (action === 'Op.MosaicJudge' && this.lastPingTeamId != null && !next.includes(this.lastPingTeamId)) {
              next.push(this.lastPingTeamId);
            }
            for (const id of listed) {
              if (!next.includes(id)) next.push(id);
            }
            return next;
          })(),
        },
      };
      if (
        action === 'Op.React' ||
        action === 'Op.MosaicBuzz' ||
        (action === 'Op.MosaicJudge' && this.lastPingCorrectFlg === false) ||
        (action === 'Op.CastDisplay' && (this.lastPingHold || clockPhase === 'paused' || clockPhase === 'play'))
      ) {
        return;
      }
      const prev = pingReloadTimers.get(key);
      if (prev) window.clearTimeout(prev);
      pingReloadTimers.set(
        key,
        window.setTimeout(() => {
          pingReloadTimers.delete(key);
          void this.loadGame(eventId);
        }, 220)
      );
    },
    async loadMaster(force = false) {
      if (this.masterLoaded && !force && this.kabalas.length) return;
      try {
        const catalog = await fetchOpMaster();
        if (catalog.kabalas.length) this.kabalas = catalog.kabalas;
        if (catalog.topics.length) this.topics = catalog.topics;
        this.masterLoaded = this.kabalas.length > 0 || this.topics.length > 0;
      } catch {
        this.masterLoaded = false;
      }
    },
    mergeKabalas(rows: OpCatalogItem[]) {
      if (!rows.length) return;
      const byId = new Map(this.kabalas.map((row) => [row.id, row]));
      for (const row of rows) byId.set(row.id, row);
      this.kabalas = [...byId.values()];
      this.masterLoaded = this.masterLoaded || this.kabalas.length > 0;
    },
    replaceTeams(eventId: number | string | null | undefined, teams: OpTeam[]) {
      if (eventId == null || eventId === '' || !teams.length) return;
      const key = String(eventId);
      const prev = this.getGame(eventId);
      this.games[key] = { ...prev, teams };
    },
    dropOwnTeam(eventId: number | string, eventUserId: number | null) {
      const key = String(eventId);
      const prev = this.getGame(eventId);
      const mine =
        eventUserId != null
          ? prev.teamMembers.find((row) => row.EventUserID === eventUserId)
          : prev.teamMembers[0];
      this.games[key] = {
        ...prev,
        teamMembers:
          eventUserId == null
            ? []
            : prev.teamMembers.filter((row) => row.EventUserID !== eventUserId),
        teams: prev.teams.map((team) =>
          mine && team.id === mine.TeamID
            ? { ...team, MemberCount: Math.max(0, team.MemberCount - 1) }
            : team
        ),
      };
    },
    replaceRepoQuestions(eventId: number | string, rows: OpRepoQuestion[]) {
      const key = String(eventId);
      const prev = this.getGame(eventId);
      this.games[key] = { ...prev, repoQuestions: rows };
    },
    patchEventQuestion(
      eventId: number | string,
      questionId: number,
      patch: Partial<OpEventQuestion>
    ) {
      const key = String(eventId);
      const prev = this.getGame(eventId);
      const extraPatch: Partial<OpExtraPoolItem> = {
        Prompt: patch.Prompt,
        TimeSec: patch.TimeSec,
        TypeCode: patch.TypeCode,
        Answers: patch.Answers,
        IsCorrect: patch.IsCorrect,
        ImageKey: patch.ImageKey,
        ImageUrl: patch.ImageUrl,
        AudioKey: patch.AudioKey,
        AudioUrl: patch.AudioUrl,
        MediaUrl: patch.MediaUrl,
        TopicName: patch.TopicName,
      };
      const extraHit = (row: OpExtraPoolItem) =>
        row.id === questionId ||
        row.QuestionID === questionId ||
        (patch.QuestionID != null && row.QuestionID === patch.QuestionID);
      const repoId = patch.QuestionID ?? questionId;
      this.games[key] = {
        ...prev,
        questions: prev.questions.map((row) =>
          row.id === questionId ? { ...row, ...patch } : row
        ),
        extraCatalog: prev.extraCatalog.map((row) =>
          extraHit(row) ? { ...row, ...extraPatch } : row
        ),
        extraPool: prev.extraPool.map((row) =>
          extraHit(row) ? { ...row, ...extraPatch } : row
        ),
        repoQuestions: prev.repoQuestions.map((row) =>
          row.id === repoId
            ? {
                ...row,
                Prompt: patch.Prompt ?? row.Prompt,
                TimeSec: patch.TimeSec ?? row.TimeSec,
                TypeCode: patch.TypeCode ?? row.TypeCode,
                Answers: patch.Answers ?? row.Answers,
                IsCorrect: patch.IsCorrect ?? row.IsCorrect,
                MediaUrl: patch.MediaUrl ?? row.MediaUrl,
                ImageKey: patch.ImageKey ?? row.ImageKey,
                ImageUrl: patch.ImageUrl ?? row.ImageUrl,
                AudioKey: patch.AudioKey ?? row.AudioKey,
                AudioUrl: patch.AudioUrl ?? row.AudioUrl,
              }
            : row
        ),
      };
    },
    async loadEvent(eventId: number | string) {
      const payload = await fetchOpEvent(eventId);
      this.replaceSettings(payload.settings);
      const key = String(eventId);
      const prev = this.games[key];
      const incomingStatus = opLiveQuestionStatus(payload.live);
      const questionChanged = Boolean(prev?.live) && !sameOpLiveQuestion(payload.live, prev.live);
      const pingCount =
        this.lastPingEventId != null && String(this.lastPingEventId) === key
          ? this.lastPingAnswerCount ?? 0
          : 0;
      if (incomingStatus === 'pending' && this.lastPingEventId != null && String(this.lastPingEventId) === key) {
        this.lastPingAnswerCount = 0;
      }
      const pingFace =
        this.lastPingAction === 'Op.CastDisplay' &&
        this.lastPingEventId != null &&
        String(this.lastPingEventId) === key &&
        (this.lastPingFace === 'idle' || this.lastPingFace === 'lobby' || this.lastPingFace === 'results')
          ? this.lastPingFace
          : '';
      const cleared = this.clearedExtraGames[key] || [];
      const pendingExtra = (row: OpExtraPoolItem) =>
        cleared.includes(row.ExtraGameId)
          ? { ...row, StatusCode: 'pending', StartedAtUtc: null }
          : row;
      const extraId = String(payload.live.ExtraGameId || '').toUpperCase();
      const samePing = this.lastPingEventId != null && String(this.lastPingEventId) === key;
      const holdPing =
        samePing &&
        (this.lastPingAction === 'Op.MosaicBuzz' ||
          (this.lastPingAction === 'Op.PauseQuestion' && this.lastPingHold === true) ||
          (this.lastPingAction === 'Op.CastDisplay' &&
            (this.lastPingHold === true || this.lastPingClockPhase === 'paused')));
      const keepMosaicHold =
        Boolean(prev?.live.ClockPaused) &&
        extraId === 'EG2' &&
        String(payload.live.ExtraQuestionStatus || '').toLowerCase() === 'active' &&
        this.lastPingAction !== 'Op.MosaicJudge' &&
        this.lastPingAction !== 'Op.StartExtraQuestion' &&
        this.lastPingAction !== 'Op.StartExtra' &&
        !(this.lastPingAction === 'Op.CastDisplay' && this.lastPingHold === false);
      const frozen = holdPing || keepMosaicHold;
      const castPhase = String(payload.live.DisplayClockPhase || '').toLowerCase();
      const live = {
        ...payload.live,
        ClockPaused:
          castPhase === 'paused' || castPhase === 'read'
            ? true
            : castPhase === 'play' || castPhase === 'done'
              ? false
              : frozen
                ? true
                : payload.live.ClockPaused,
        ClockLeftMs:
          frozen || castPhase === 'paused'
            ? (this.lastPingLeftMs ?? payload.live.ClockLeftMs ?? prev?.live.ClockLeftMs)
            : payload.live.ClockLeftMs,
        PlayerFace: pingFace || prev?.live.PlayerFace || payload.live.PlayerFace || '',
        ExtraQuestionStatus:
          extraId === 'EG2' &&
          this.lastPingAction === 'Op.MosaicJudge' &&
          this.lastPingCorrectFlg === false
            ? prev?.live.ExtraQuestionStatus || 'active'
            : payload.live.ExtraQuestionStatus,
        ActiveExtraQuestionID:
          extraId === 'EG2' &&
          this.lastPingAction === 'Op.MosaicJudge' &&
          this.lastPingCorrectFlg === false
            ? prev?.live.ActiveExtraQuestionID ?? payload.live.ActiveExtraQuestionID
            : payload.live.ActiveExtraQuestionID,
        MosaicOutTeamIds:
          extraId === 'EG2' && questionChanged
            ? []
            : extraId === 'EG2'
              ? [...new Set([...(prev?.live.MosaicOutTeamIds || []), ...(payload.live.MosaicOutTeamIds || [])])]
              : payload.live.MosaicOutTeamIds || [],
        AnswerCount:
          incomingStatus === 'pending'
            ? 0
            : questionChanged
              ? Math.max(payload.live.AnswerCount || 0, pingCount)
              : Math.max(payload.live.AnswerCount || 0, prev?.live.AnswerCount || 0, pingCount),
        ...(cleared.includes(extraId)
          ? {
              ExtraGameId: null,
              ExtraRunID: null,
              ActiveExtraQuestionID: null,
              ExtraQuestionStatus: '',
              AnswerCount: 0,
              TimeSec: null,
            }
          : {}),
      };
      this.games[key] = {
        rounds: payload.rounds,
        questions: payload.questions,
        extraPool: payload.extraPool.map(pendingExtra),
        extraCatalog: payload.extraCatalog.map(pendingExtra),
        teams: payload.teams.length ? payload.teams : prev?.teams || [],
        teamMembers: payload.teamMembers.length ? payload.teamMembers : prev?.teamMembers || [],
        penalties: payload.hasPenaltiesDataset ? payload.penalties : prev?.penalties || [],
        live,
        repoQuestions: payload.repoQuestions.length
          ? payload.repoQuestions
          : prev?.repoQuestions || [],
        loadedAt: Date.now(),
        displayCast: payload.displayCast || prev?.displayCast || null,
      };
      return payload.settings[0] || this.getSettingsForEvent(eventId);
    },
    async loadGame(eventId: number | string) {
      await this.loadEvent(eventId);
      return this.getGame(eventId);
    },
    resetExtraLocalState(eventId: number | string, extraGameId: string) {
      const key = String(eventId);
      const prev = this.getGame(eventId);
      const extraId = String(extraGameId || '').trim().toUpperCase();
      if (!extraId) return;
      const cleared = [...new Set([...(this.clearedExtraGames[key] || []), extraId])];
      this.clearedExtraGames = { ...this.clearedExtraGames, [key]: cleared };
      if (String(this.lastPingEventId) === key) this.lastPingAnswerCount = 0;
      const pending = (row: OpExtraPoolItem) =>
        row.ExtraGameId !== extraId
          ? row
          : { ...row, StatusCode: 'pending', StartedAtUtc: null };
      this.games[key] = {
        ...prev,
        extraPool: prev.extraPool.map(pending),
        extraCatalog: prev.extraCatalog.map(pending),
        live:
          !prev.live.ExtraGameId || String(prev.live.ExtraGameId).toUpperCase() === extraId
            ? {
                ...prev.live,
                ExtraGameId: null,
                ExtraRunID: null,
                ActiveExtraQuestionID: null,
                ExtraQuestionStatus: '',
                AnswerCount: 0,
                TimeSec: null,
              }
            : prev.live,
      };
    },
    reviveExtraGame(eventId: number | string, extraGameId: string) {
      const key = String(eventId);
      const extraId = String(extraGameId || '').trim().toUpperCase();
      const next = (this.clearedExtraGames[key] || []).filter((id) => id !== extraId);
      const rest = { ...this.clearedExtraGames };
      if (next.length) rest[key] = next;
      else delete rest[key];
      this.clearedExtraGames = rest;
    },
    setPlayerFace(eventId: number | string, face: string) {
      const key = String(eventId);
      const prev = this.games[key] || this.getGame(eventId);
      const next = String(face || '').trim().toLowerCase();
      this.lastPingFace = next;
      this.lastPingEventId = Number(eventId) || this.lastPingEventId;
      this.games[key] = { ...prev, live: { ...prev.live, PlayerFace: next } };
    },
    async loadRepoQuestions(eventId: number | string) {
      try {
        const rows = await fetchOpQuestions(eventId);
        if (rows.length) this.replaceRepoQuestions(eventId, rows);
        const extras = extraCatalogFromRepo(this.getGame(eventId).repoQuestions, eventId);
        if (extras.length) {
          const prev = this.getGame(eventId);
          this.games[String(eventId)] = {
            ...prev,
            extraCatalog: mergeOpExtraPool(prev.extraCatalog, extras, []),
          };
        }
        return this.getGame(eventId).repoQuestions;
      } catch {
        return this.getGame(eventId).repoQuestions;
      }
    },
  },
});
