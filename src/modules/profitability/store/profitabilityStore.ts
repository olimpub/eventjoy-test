import { defineStore } from 'pinia';
import {
  ProfitabilityEvent,
  EventStage,
  EventType,
  Player,
  Round,
  Table,
  TabKey
} from '../types';

const STORAGE_KEY = 'eventjoy_profitability_state_v2';

export const PLAYER_COLORS = ['#FF6060', '#28C76F', '#2AA9FF', '#F2E74B'];

const FIRST_NAMES = ['Tóth', 'Kiss', 'Nagy', 'Szabó', 'Varga', 'Kovács', 'Farkas', 'Mészáros', 'Simon', 'Horváth', 'Balogh', 'Juhász', 'Takács', 'Molnár', 'Török', 'Papp', 'Fekete', 'Oláh', 'Rácz', 'Németh', 'Szűcs', 'Balázs', 'Fodor', 'Gál', 'Kis', 'Orsós', 'Somogyi', 'Vincze', 'Pál', 'Katona', 'Antal', 'Sipos'];
const LAST_NAMES = ['Erika', 'Bence', 'Anna', 'Tamás', 'Péter', 'Júlia', 'Dávid', 'Eszter', 'László', 'Nóra', 'Márton', 'Csilla', 'Zoltán', 'Réka', 'Ádám', 'Klára', 'Gábor', 'Petra', 'Bálint', 'Zsófia', 'Máté', 'Dóra', 'Ákos', 'Lilla', 'Ferenc', 'Ilona', 'Sándor', 'Mónika', 'Gergő', 'Kata', 'Levente', 'Blanka'];
const TEAMS = ['Alpha Csapat', 'Beta Csapat', 'Gamma Csapat', 'Delta Csapat', 'Epsilon Csapat', 'Zeta Csapat', 'Éta Csapat', 'Théta Csapat'];

function makeAvatar(first: string, last: string): string {
  return (first[0] + last[0]).toUpperCase();
}

function generateDemoPlayers(count: number): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const team = TEAMS[Math.floor(i / 4) % TEAMS.length];
    players.push({
      id: i + 1,
      name: `${first} ${last}`,
      team,
      status: 'Bejelentkezett',
      avatar: makeAvatar(first, last),
      checkInTime: '2026.10.15 13:4' + (i % 6)
    });
  }
  return players;
}

function getInitialDemoEvent(): ProfitabilityEvent {
  return {
    id: 1,
    name: 'Budapesti PROFI-T-ABILITY Bajnokság',
    type: 'b2c',
    date: '2026.10.15 14:00 - 18:00',
    location: 'Budapest, Bálna Rendezvényközpont',
    stage: 'checkin',
    status: 'Aktív',
    organizers: [
      { id: 1, name: 'Kelemen Krisztián', role: 'Főszervező' },
      { id: 2, name: 'Horváth Gábor', role: 'Szervező' }
    ],
    gameMasters: [
      { id: 1, name: 'Kovács Máté', role: 'Játékmester (1. asztal)' },
      { id: 2, name: 'Szilágyi Dóra', role: 'Játékmester (2. asztal)' },
      { id: 3, name: 'Bíró Ákos', role: 'Játékmester (3. asztal)' },
      { id: 4, name: 'Lakatos Lilla', role: 'Játékmester (4. asztal)' },
      { id: 5, name: 'Fehér Zsolt', role: 'Játékmester (5. asztal)' },
      { id: 6, name: 'Nagy Petra', role: 'Játékmester (6. asztal)' },
      { id: 7, name: 'Kertész Bálint', role: 'Játékmester (7. asztal)' },
      { id: 8, name: 'Vass Zsófia', role: 'Játékmester (8. asztal)' }
    ],
    players: generateDemoPlayers(32),
    drawResults: null,
    feedbacks: [],
    activeTab: 'checkin',
    resultsViewMode: 'individual',
    resultsRoundFilter: 3
  };
}

interface PersistShape {
  events: ProfitabilityEvent[];
  currentEventId: number;
}

function loadPersisted(): PersistShape | null {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (item) return JSON.parse(item) as PersistShape;
  } catch (err) {
    console.warn('Hiba a profitability state betöltésekor:', err);
  }
  return null;
}

export const useProfitabilityStore = defineStore('profitabilityStore', {
  state: () => {
    const saved = loadPersisted();
    if (saved && saved.events && saved.events.length > 0) {
      return {
        events: saved.events,
        currentEventId: saved.currentEventId || saved.events[0].id
      };
    }
    return {
      events: [getInitialDemoEvent()] as ProfitabilityEvent[],
      currentEventId: 1
    };
  },

  getters: {
    currentEvent(state): ProfitabilityEvent | undefined {
      return state.events.find(e => e.id === state.currentEventId) || state.events[0];
    },

    getEventById: (state) => (id: number): ProfitabilityEvent | undefined => {
      const found = state.events.find(e => Number(e.id) === Number(id));
      if (found) return found;
      if (state.events.length > 0) {
        return {
          ...state.events[0],
          id: id
        };
      }
      return undefined;
    },

    playingPlayers: (state) => (eventId: number): Player[] => {
      const event = state.events.find(e => e.id === eventId);
      if (!event) return [];
      return event.players.filter(p => p.status === 'Bejelentkezett' || p.status === 'Játszik');
    },

    // Tabok engedélyezési logikája a spec 7. fejezete alapján
    tabAvailability: (state) => (eventId: number) => {
      const event = state.events.find(e => e.id === eventId);
      if (!event) {
        return { overview: true, checkin: false, game: false, results: false, feedbacks: false };
      }
      const hasDraw = !!event.drawResults && event.drawResults.length > 0;
      const hasClosedRound = hasDraw && event.drawResults!.some(r => r.status === 'Lezárt');
      return {
        overview: true,
        checkin: true,
        game: hasDraw,
        results: hasClosedRound,
        feedbacks: event.stage === 'closed'
      };
    }
  },

  actions: {
    saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          events: this.events,
          currentEventId: this.currentEventId
        }));
      } catch (err) {
        console.warn('Hiba a profitability state mentésekor:', err);
      }
    },

    setCurrentEvent(id: number) {
      this.currentEventId = id;
      this.saveToStorage();
    },

    setActiveTab(eventId: number, tab: TabKey) {
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        event.activeTab = tab;
        this.saveToStorage();
      }
    },

    // Automatikus tabváltás állapotváltáskor (spec 2. fejezet táblázata)
    defaultTabForStage(stage: EventStage): TabKey {
      switch (stage) {
        case 'design':
        case 'organization':
          return 'overview';
        case 'checkin':
          return 'checkin';
        case 'draw':
          return 'game';
        case 'game':
          return 'game';
        case 'ceremony':
          return 'results';
        case 'closed':
          return 'feedbacks';
        default:
          return 'overview';
      }
    },

    setStage(eventId: number, stage: EventStage) {
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        event.stage = stage;
        event.activeTab = this.defaultTabForStage(stage);
        this.saveToStorage();
      }
    },

    updateEventStage(eventId: number, stage: EventStage) {
      this.setStage(eventId, stage);
    },

    resetDemo(eventId: number) {
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        const fresh = getInitialDemoEvent();
        event.stage = 'checkin';
        event.status = 'Aktív';
        event.drawResults = null;
        event.players = fresh.players;
        event.feedbacks = [];
        event.activeTab = 'checkin';
        event.resultsViewMode = 'individual';
        event.resultsRoundFilter = 3;
        this.saveToStorage();
      }
    },

    resetEventDemoData(eventId: number) {
      this.resetDemo(eventId);
    },

    setPlayerStatus(eventId: number, playerId: number, status: Player['status']) {
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        const p = event.players.find(x => x.id === playerId);
        if (p) {
          p.status = status;
          if (status === 'Bejelentkezett' && !p.checkInTime) {
            p.checkInTime = new Date().toLocaleString('hu-HU');
          }
          this.saveToStorage();
        }
      }
    },

    checkInPlayer(eventId: number, playerId: number) {
      this.setPlayerStatus(eventId, playerId, 'Bejelentkezett');
    },

    // A "playing" számítás alapja: Bejelentkezett + Játszik státuszúak
    playingCount(eventId: number): number {
      const event = this.events.find(e => e.id === eventId);
      if (!event) return 0;
      return event.players.filter(p => p.status === 'Bejelentkezett' || p.status === 'Játszik').length;
    },

    startDraw(eventId: number): { success: boolean; message?: string } {
      const event = this.events.find(e => e.id === eventId);
      if (!event) return { success: false, message: 'Esemény nem található!' };

      const activePlayers = event.players.filter(p => p.status === 'Bejelentkezett' || p.status === 'Játszik');
      if (activePlayers.length < 4 || activePlayers.length % 4 !== 0) {
        return {
          success: false,
          message: `A sorsolás csak 4-gyel osztható játszó létszám esetén indítható! Jelenlegi aktív: ${activePlayers.length} fő.`
        };
      }

      // Mostantól mindenki, aki játszik ténylegesen "Játszik" státuszú
      activePlayers.forEach(p => { p.status = 'Játszik'; });

      const tableCount = activePlayers.length / 4;
      const rounds: Round[] = [];

      for (let r = 1; r <= 3; r++) {
        const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
        const tables: Table[] = [];

        for (let t = 0; t < tableCount; t++) {
          const tablePlayers = shuffled.slice(t * 4, (t + 1) * 4).map((player, idx) => ({
            id: player.id,
            name: player.name,
            team: player.team,
            color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
            winnings: null,
            truckValue: null
          }));

          const gameMasterName = event.gameMasters[t % event.gameMasters.length]?.name || `${t + 1}. Asztal Játékmester`;

          tables.push({
            id: t + 1,
            name: `${t + 1}. asztal`,
            status: 'Kisorsolva',
            gameMaster: gameMasterName,
            players: tablePlayers
          });
        }

        rounds.push({
          round: r,
          status: 'Kisorsolva',
          tables
        });
      }

      event.drawResults = rounds;
      event.stage = 'draw';
      event.activeTab = 'game';
      this.saveToStorage();
      return { success: true };
    },

    startRound(eventId: number, roundNum: number) {
      const event = this.events.find(e => e.id === eventId);
      if (event && event.drawResults) {
        const round = event.drawResults.find(r => r.round === roundNum);
        if (round) {
          round.status = 'Folyamatban';
          round.tables.forEach(t => { t.status = 'Folyamatban'; });
          if (event.stage !== 'game') {
            event.stage = 'game';
          }
          this.saveToStorage();
        }
      }
    },

    updatePlayerResult(
      eventId: number,
      roundNum: number,
      tableId: number,
      playerId: number,
      winnings: number | null,
      truckValue: number | null
    ): { success: boolean; message?: string } {
      if (winnings !== null && (winnings < 0 || winnings > 80)) {
        return { success: false, message: 'A nyeremény értéke 0 és 80 között kell legyen!' };
      }
      if (truckValue !== null && (truckValue < 0 || truckValue > 12)) {
        return { success: false, message: 'A kamion értéke 0 és 12 között kell legyen!' };
      }

      const event = this.events.find(e => e.id === eventId);
      if (!event || !event.drawResults) return { success: false, message: 'Nincs sorsolási eredmény' };

      const round = event.drawResults.find(r => r.round === roundNum);
      if (!round) return { success: false, message: 'Forduló nem található' };

      const table = round.tables.find(t => t.id === tableId);
      if (!table) return { success: false, message: 'Asztal nem található' };

      const p = table.players.find(x => x.id === playerId);
      if (p) {
        p.winnings = winnings;
        p.truckValue = truckValue;

        table.players.sort((a, b) => {
          const wA = a.winnings ?? -1;
          const wB = b.winnings ?? -1;
          if (wB !== wA) return wB - wA;
          return (b.truckValue ?? -1) - (a.truckValue ?? -1);
        });

        this.saveToStorage();
        return { success: true };
      }
      return { success: false, message: 'Játékos nem található az asztalon' };
    },

    generateRandomResultsForRound(eventId: number, roundNum: number) {
      const event = this.events.find(e => e.id === eventId);
      if (!event || !event.drawResults) return;
      const round = event.drawResults.find(r => r.round === roundNum);
      if (!round) return;

      round.tables.forEach(table => {
        table.players.forEach(p => {
          p.winnings = Math.floor(Math.random() * 81); // 0-80
          p.truckValue = Math.floor(Math.random() * 13); // 0-12
        });
        table.players.sort((a, b) => {
          const wA = a.winnings ?? -1;
          const wB = b.winnings ?? -1;
          if (wB !== wA) return wB - wA;
          return (b.truckValue ?? -1) - (a.truckValue ?? -1);
        });
        table.status = 'Kész';
      });
      this.saveToStorage();
    },

    movePlayerOrder(eventId: number, roundNum: number, tableId: number, index: number, direction: 'up' | 'down') {
      const event = this.events.find(e => e.id === eventId);
      if (!event || !event.drawResults) return;
      const round = event.drawResults.find(r => r.round === roundNum);
      if (!round) return;
      const table = round.tables.find(t => t.id === tableId);
      if (!table) return;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < table.players.length) {
        const temp = table.players[index];
        table.players[index] = table.players[targetIndex];
        table.players[targetIndex] = temp;
        this.saveToStorage();
      }
    },

    closeTable(eventId: number, roundNum: number, tableId: number): { success: boolean; message?: string } {
      const event = this.events.find(e => e.id === eventId);
      if (!event || !event.drawResults) return { success: false, message: 'Nincs sorsolás' };
      const round = event.drawResults.find(r => r.round === roundNum);
      if (!round) return { success: false, message: 'Forduló nem található' };
      const table = round.tables.find(t => t.id === tableId);
      if (!table) return { success: false, message: 'Asztal nem található' };

      const missing = table.players.some(p => p.winnings === null || p.truckValue === null);
      if (missing) {
        return { success: false, message: 'Minden játékosnál rögzíteni kell a nyereményt és a kamionértéket az asztal lezárása előtt!' };
      }

      table.status = 'Kész';
      this.saveToStorage();
      return { success: true };
    },

    closeRound(eventId: number, roundNum: number): { success: boolean; message?: string } {
      const event = this.events.find(e => e.id === eventId);
      if (!event || !event.drawResults) return { success: false, message: 'Nincs sorsolás' };
      const round = event.drawResults.find(r => r.round === roundNum);
      if (!round) return { success: false, message: 'Forduló nem található' };

      const notReady = round.tables.filter(t => t.status !== 'Kész');
      if (notReady.length > 0) {
        return {
          success: false,
          message: `A forduló csak akkor zárható le, ha minden asztal eredménye elkészült (${notReady.length} asztal még hátra van).`
        };
      }

      round.status = 'Lezárt';
      this.saveToStorage();
      return { success: true };
    },

    setResultsViewMode(eventId: number, mode: 'individual' | 'team') {
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        event.resultsViewMode = mode;
        this.saveToStorage();
      }
    },

    setResultsRoundFilter(eventId: number, roundFilter: number) {
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        event.resultsRoundFilter = roundFilter;
        this.saveToStorage();
      }
    },

    startCeremony(eventId: number) {
      this.updateEventStage(eventId, 'ceremony');
    },

    closeEvent(eventId: number) {
      this.updateEventStage(eventId, 'closed');
    },

    createEvent(name: string, type: EventType, date: string, location: string): ProfitabilityEvent {
      const newId = (Math.max(...this.events.map(e => e.id), 0) || 0) + 1;
      const newEvent: ProfitabilityEvent = {
        id: newId,
        name: name || 'Új PROFI-T-ABILITY Esemény',
        type: type || 'b2c',
        date: date || '2026.11.01 10:00 - 16:00',
        location: location || 'Budapest',
        stage: 'design',
        status: 'Tervezés alatt',
        organizers: [{ id: 1, name: 'Szervező', role: 'Főszervező' }],
        gameMasters: [
          { id: 1, name: 'Kovács Máté', role: 'Játékmester (1. asztal)' },
          { id: 2, name: 'Szilágyi Dóra', role: 'Játékmester (2. asztal)' },
          { id: 3, name: 'Bíró Ákos', role: 'Játékmester (3. asztal)' },
          { id: 4, name: 'Lakatos Lilla', role: 'Játékmester (4. asztal)' }
        ],
        players: generateDemoPlayers(32),
        drawResults: null,
        feedbacks: [],
        activeTab: 'overview',
        resultsViewMode: 'individual',
        resultsRoundFilter: 3
      };

      this.events.push(newEvent);
      this.currentEventId = newId;
      this.saveToStorage();
      return newEvent;
    }
  }
});
