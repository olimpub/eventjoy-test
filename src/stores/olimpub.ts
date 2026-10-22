import { defineStore } from 'pinia';
import {
  fetchOpEvent,
  fetchOpMaster,
  fetchOpQuestions,
} from 'src/modules/olimpub/opApi';
import {
  emptyOpLive,
  normalizeOpEventQuestions,
  opLiveQuestionStatus,
  sameOpLiveQuestion,
  type OpCatalogItem,
  type OpEventQuestion,
  type OpEventSettings,
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

function pingStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      const row = item as Record<string, unknown>;
      return String(row.Text ?? row.text ?? row.Value ?? row.value ?? row.Name ?? row.name ?? '').trim();
    })
    .filter(Boolean);
}

function optionalCount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isPlayerFace(face: string) {
  return face === 'idle' || face === 'lobby' || face === 'results';
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
    /** Az Op.MosaicBuzz saját számlálója: a pingAt egyetlen helyet jelez, két egyidejű ping közül az egyik elveszne. */
    buzzSeq: 0,
    lastBuzz: null as {
      eventId: number | null;
      nickname: string;
      teamName: string;
      teamId: number | null;
      eventUserId: number | null;
      leftMs: number | null;
    } | null,
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
      /* Az Op.MosaicBuzz-t a BE már csak az első érvényes tippnél küldi szét; a helyi ClockPaused alapján
         nem dobjuk el (egy beragadt ClockPaused elnyelte a tippet a kvízmesternél). */
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
      if (action === 'Op.MosaicBuzz') {
        this.lastBuzz = {
          eventId: eventId != null ? Number(eventId) : null,
          nickname: this.lastPingNickname,
          teamName: this.lastPingTeamName,
          teamId: this.lastPingTeamId,
          eventUserId: this.lastPingEventUserId,
          leftMs: this.lastPingLeftMs,
        };
        this.buzzSeq += 1;
      }
      const judged = body.CorrectFlg ?? body.correctFlg ?? body.Correct ?? body.correct;
      if (action === 'Op.MosaicJudge') {
        this.lastPingCorrectFlg =
          judged === true || judged === 1 || judged === '1' || String(judged || '').toLowerCase() === 'true';
      } else if (action === 'Op.MosaicBuzz' || isOpStartAction(action) || action === 'Op.StartExtraQuestion') {
        this.lastPingCorrectFlg = null;
      }
      const face = String(body.Face ?? body.face ?? '').trim().toLowerCase();
      const playerFace = action === 'Op.SetPlayerFace' && isPlayerFace(face) ? face : null;
      if (playerFace != null) this.lastPingFace = playerFace;
      const incomingVersion = Number(body.StateVersion ?? body.stateVersion);
      const knownVersion = prevGame?.live.StateVersion || 0;
      const versionGap =
        Number.isFinite(incomingVersion) && knownVersion > 0 && incomingVersion > knownVersion + 1;
      if (
        action === 'Op.CastDisplay' ||
        action === 'Op.ShowLeaderboard' ||
        action === 'Op.ShowLobby' ||
        action === 'Op.ShowTopics' ||
        action === 'Op.ShowDraw' ||
        isOpStartAction(action) ||
        action === 'Op.StartClock' ||
        action === 'Op.PauseQuestion' ||
        action === 'Op.StopQuestion' ||
        action === 'Op.StopExtraQuestion'
      ) {
        this.lastPingCast = body;
      }
      if (!key) return;
      if (action === 'Op.Presence' && !versionGap) {
        const game = prevGame || this.getGame(key);
        const userId = this.lastPingEventUserId;
        const flag = body.Online ?? body.online;
        const online = flag === true || flag === 1 || flag === '1' || String(flag).toLowerCase() === 'true';
        if (userId != null && game.teamMembers.some((member) => member.EventUserID === userId)) {
          this.games[key] = {
            ...game,
            teamMembers: game.teamMembers.map((member) =>
              member.EventUserID === userId ? { ...member, Online: online } : member
            ),
          };
          return;
        }
      }
      const nextCount = isOpStartAction(action)
        ? 0
        : Math.max(prevGame?.live.AnswerCount || 0, this.lastPingAnswerCount ?? 0);
      const paused =
        isOpStartAction(action)
          ? true
          : action === 'Op.StartClock'
            ? false
            : action === 'Op.StartExtra'
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
      const baseGame = prevGame || this.getGame(eventId as number | string);
      const sheetId = Number(body.EventQuestionID ?? body.QuestionID ?? body.QuestionId);
      const sheetPrompt = String(body.Prompt ?? body.prompt ?? '').trim();
      /* A játékos GET-je a pending kérdéssort nem adja, ezért az indító pingből építünk egy sort:
         a kérdés ugyanabban a pillanatban kirajzolható, nem kell köztes képernyő a következő GET-ig. */
      let startedRow: OpEventQuestion | undefined;
      if (
        isOpStartAction(action) &&
        Number.isFinite(sheetId) &&
        sheetId > 0 &&
        sheetPrompt &&
        !baseGame.questions.some((row) => row.id === sheetId)
      ) {
        const roundId =
          body.RoundID ??
          body.roundID ??
          baseGame.live.ActiveRoundID ??
          baseGame.questions[baseGame.questions.length - 1]?.RoundID;
        const answers = pingStrings(body.Answers ?? body.answers ?? body.Options);
        const matches = pingStrings(body.Matches ?? body.matches);
        const categories = pingStrings(body.Categories ?? body.categories);
        const built = normalizeOpEventQuestions(
          [
            {
              ...body,
              EventQuestionID: sheetId,
              EventID: eventId,
              RoundID: roundId,
              StatusCode: 'active',
              Prompt: sheetPrompt,
            },
          ],
          eventId
        )[0];
        if (built) {
          startedRow = {
            ...built,
            Answers: answers.length ? answers : built.Answers,
            Matches: matches.length ? matches : built.Matches,
            Categories: categories.length ? categories : built.Categories,
          };
        }
      }
      this.games[key] = {
        ...baseGame,
        questions:
          isOpStartAction(action) && Number.isFinite(sheetId) && sheetId > 0 && sheetPrompt
            ? baseGame.questions.map((row) =>
                row.id !== sheetId
                  ? row
                  : {
                      ...row,
                      Prompt: sheetPrompt,
                      TypeCode: String(body.TypeCode ?? body.Type ?? row.TypeCode),
                      TimeSec: Number(body.TimeSec ?? body.timeSec) || row.TimeSec,
                      Answers: pingStrings(body.Answers ?? body.answers ?? body.Options).length
                        ? pingStrings(body.Answers ?? body.answers ?? body.Options)
                        : row.Answers,
                      Matches: pingStrings(body.Matches ?? body.matches).length
                        ? pingStrings(body.Matches ?? body.matches)
                        : row.Matches,
                      Categories: pingStrings(body.Categories ?? body.categories).length
                        ? pingStrings(body.Categories ?? body.categories)
                        : row.Categories,
                      ImageUrl: String(body.ImageUrl ?? body.imageUrl ?? '') || row.ImageUrl,
                      ImageKey: String(body.ImageKey ?? body.imageKey ?? '') || row.ImageKey,
                      AudioUrl: String(body.AudioUrl ?? body.audioUrl ?? '') || row.AudioUrl,
                      MediaUrl: String(body.MediaUrl ?? body.mediaUrl ?? body.ImageUrl ?? body.imageUrl ?? '') || row.MediaUrl,
                      TopicName: String(body.TopicName ?? body.topicName ?? '') || row.TopicName,
                    }
              )
            : startedRow
              ? [...baseGame.questions, startedRow]
              : baseGame.questions,
        live: {
          ...baseGame.live,
          AnswerCount: nextCount,
          StateVersion: Math.max(
            knownVersion,
            Number.isFinite(incomingVersion) && !versionGap ? incomingVersion : 0
          ),
          PlayerFace: playerFace ?? prevGame?.live.PlayerFace ?? '',
          ClockPaused: paused,
          ActiveEventQuestionID:
            isOpStartAction(action) && Number.isFinite(sheetId) && sheetId > 0
              ? sheetId
              : baseGame.live.ActiveEventQuestionID,
          QuestionStatus: isOpStartAction(action)
            ? 'active'
            : action === 'Op.StopQuestion' || action === 'Op.StopExtraQuestion'
              ? 'stopped'
              : baseGame.live.QuestionStatus,
          AnswerStartedAtUtc:
            action === 'Op.StartClock'
              ? String(body.AnswerStartedAtUtc ?? body.answerStartedAtUtc ?? '') || new Date().toISOString()
              : isOpStartAction(action)
                ? null
                : prevGame?.live.AnswerStartedAtUtc ?? null,
          Screen: isOpStartAction(action)
            ? 'question'
            : action === 'Op.ShowLeaderboard'
              ? 'results'
              : action === 'Op.ShowLobby'
                ? 'lobby'
                : action === 'Op.ShowTopics'
                  ? 'topics'
                  : action === 'Op.ShowDraw'
                    ? 'draw'
                    : prevGame?.live.Screen || '',
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
          /* A bővített Op.CastDisplay ping hordozza a tippelőt (üres TipName = nincs tippelő), ezért felülírja a korábbit. */
          MosaicTipName:
            action === 'Op.MosaicJudge' || isOpStartAction(action)
              ? ''
              : action === 'Op.CastDisplay' && clockPhase
                ? this.lastPingNickname
                : this.lastPingNickname || prevGame?.live.MosaicTipName || '',
          MosaicTipTeam:
            action === 'Op.MosaicJudge' || isOpStartAction(action)
              ? ''
              : action === 'Op.CastDisplay' && clockPhase
                ? this.lastPingTeamName
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
        !versionGap &&
        (action === 'Op.React' ||
        action === 'Op.MosaicBuzz' ||
        (action === 'Op.MosaicJudge' && this.lastPingCorrectFlg === false) ||
        (action === 'Op.CastDisplay' && (this.lastPingHold || clockPhase === 'paused' || clockPhase === 'play')) ||
        action === 'Op.StartClock' ||
        action === 'Op.PauseQuestion')
      ) {
        return;
      }
      const prev = pingReloadTimers.get(key);
      if (prev) window.clearTimeout(prev);
      pingReloadTimers.set(
        key,
        window.setTimeout(() => {
          pingReloadTimers.delete(key);
          if (eventId != null) void this.loadGame(eventId);
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
      const repoId = patch.QuestionID ?? questionId;
      this.games[key] = {
        ...prev,
        questions: prev.questions.map((row) =>
          row.id === questionId ? { ...row, ...patch } : row
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
        this.lastPingAction === 'Op.SetPlayerFace' &&
        this.lastPingEventId != null &&
        String(this.lastPingEventId) === key &&
        isPlayerFace(this.lastPingFace)
          ? this.lastPingFace
          : '';
      const cleared = this.clearedExtraGames[key] || [];
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
      /* Párbajnál (duel_speed) nincs felolvasási fázis és Op.StartClock: a BE indításkor elindítja a válaszórát. */
      const startedQuestion = payload.questions.find((row) => row.id === payload.live.ActiveEventQuestionID);
      const startedRound = payload.rounds.find((row) => row.id === startedQuestion?.RoundID);
      const serverStartsClock = String(startedRound?.RoundTypeCode || '').toLowerCase() === 'duel_speed';
      const live = {
        ...payload.live,
        AnswerStartedAtUtc:
          samePing && this.lastPingAction === 'Op.StartClock'
            ? prev?.live.AnswerStartedAtUtc || payload.live.AnswerStartedAtUtc || new Date().toISOString()
            : samePing && isOpStartAction(this.lastPingAction)
              ? serverStartsClock
                ? payload.live.AnswerStartedAtUtc || null
                : null
              : payload.live.AnswerStartedAtUtc || prev?.live.AnswerStartedAtUtc || null,
        ClockPaused:
          samePing && isOpStartAction(this.lastPingAction)
            ? serverStartsClock && payload.live.AnswerStartedAtUtc
              ? Boolean(payload.live.ClockPaused)
              : true
            : samePing && this.lastPingAction === 'Op.StartClock'
              ? false
              : samePing && this.lastPingAction === 'Op.PauseQuestion' && this.lastPingHold === true
                ? true
                : samePing && this.lastPingAction === 'Op.PauseQuestion' && this.lastPingHold === false
                  ? false
                  : frozen
                    ? true
                    : payload.live.ClockPaused,
        ClockLeftMs:
          frozen || castPhase === 'paused'
            ? (this.lastPingLeftMs ?? payload.live.ClockLeftMs ?? prev?.live.ClockLeftMs)
            : payload.live.ClockLeftMs,
        PlayerFace: pingFace || payload.live.PlayerFace || '',
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
      /* A játékos GET-je az éppen induló kérdést késve adja: ha a pingből épített aktív sor a válaszban még nincs benn,
         megtartjuk, különben a kérdésoldal eltűnne (váróterem villanás) a következő GET-ig. */
      const activeId = live.ActiveEventQuestionID;
      const carriedRow =
        activeId != null &&
        String(live.QuestionStatus || '').toLowerCase() === 'active' &&
        !payload.questions.some((row) => row.id === activeId)
          ? prev?.questions.find((row) => row.id === activeId && String(row.StatusCode || '').toLowerCase() === 'active')
          : undefined;
      this.games[key] = {
        rounds: payload.rounds,
        questions: (carriedRow ? [...payload.questions, carriedRow] : payload.questions).map((row) => {
          const kept = prev?.questions.find((item) => item.id === row.id);
          if (!kept) return row;
          const incomingKey = (row.IsCorrect || []).some(Boolean);
          const keptKey = (kept.IsCorrect || []).some(Boolean);
          const freetext = String(row.TypeCode || '').toLowerCase() === 'freetext';
          const lostSynonyms = freetext && !(row.Answers || []).some(Boolean) && (kept.Answers || []).some(Boolean);
          if (incomingKey && row.CorrectJson && !lostSynonyms) return row;
          return {
            ...row,
            IsCorrect: incomingKey || !keptKey ? row.IsCorrect : kept.IsCorrect,
            CorrectJson: row.CorrectJson || kept.CorrectJson,
            Answers: lostSynonyms ? kept.Answers : row.Answers,
          };
        }),
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
      this.games[key] = {
        ...prev,
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
        return this.getGame(eventId).repoQuestions;
      } catch {
        return this.getGame(eventId).repoQuestions;
      }
    },
  },
});
