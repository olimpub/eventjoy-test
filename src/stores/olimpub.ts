import { defineStore } from 'pinia';
import {
  fetchOpEvent,
  fetchOpMaster,
  fetchOpQuestions,
} from 'src/modules/olimpub/opApi';
import type {
  OpCatalogItem,
  OpEventQuestion,
  OpEventSettings,
  OpLiveState,
  OpRepoQuestion,
  OpRound,
  OpTeam,
} from 'src/modules/olimpub/opData';

export interface OpGameState {
  rounds: OpRound[];
  questions: OpEventQuestion[];
  teams: OpTeam[];
  live: OpLiveState;
  repoQuestions: OpRepoQuestion[];
  loadedAt: number;
}

const emptyLive = (): OpLiveState => ({
  DisplayState: 'idle',
  ActiveRoundID: null,
  ActiveEventQuestionID: null,
});

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
      return (
        state.games[String(eventId)] || {
          rounds: [],
          questions: [],
          teams: [],
          live: emptyLive(),
          repoQuestions: [],
          loadedAt: 0,
        }
      );
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
    notePing(eventId: number | string | null, action = '') {
      this.pingAt = Date.now();
      this.lastPingAction = action;
      this.lastPingEventId = eventId != null ? Number(eventId) : null;
    },
    async loadMaster(force = false) {
      if (this.masterLoaded && !force) return;
      const catalog = await fetchOpMaster();
      this.kabalas = catalog.kabalas;
      this.topics = catalog.topics;
      this.masterLoaded = true;
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
      this.games[key] = {
        ...prev,
        questions: prev.questions.map((row) =>
          row.id === questionId ? { ...row, ...patch } : row
        ),
      };
    },
    async loadEvent(eventId: number | string) {
      const payload = await fetchOpEvent(eventId);
      this.replaceSettings(payload.settings);
      const key = String(eventId);
      const prev = this.games[key];
      this.games[key] = {
        rounds: payload.rounds,
        questions: payload.questions,
        teams: payload.teams,
        live: payload.live,
        repoQuestions: payload.repoQuestions.length
          ? payload.repoQuestions
          : prev?.repoQuestions || [],
        loadedAt: Date.now(),
      };
      return payload.settings[0] || this.getSettingsForEvent(eventId);
    },
    async loadGame(eventId: number | string) {
      await this.loadEvent(eventId);
      return this.getGame(eventId);
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
