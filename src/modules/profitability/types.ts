// =============================================================================
// PROFI-T-ABILITY — Adatmodell
// Forrás: PROFITABILITY_JATEKMENET_SPEC.md (16. fejezet: Ajánlott adatmodell)
// =============================================================================

export type EventStage =
  | 'design'
  | 'organization'
  | 'checkin'
  | 'draw'
  | 'game'
  | 'ceremony'
  | 'closed';

export type EventType =
  | 'b2c'
  | 'b2b'
  | 'education'
  | 'community';

export type PlayerStatus =
  | 'Regisztrált'
  | 'Bejelentkezett'
  | 'Játszik'
  | 'Nem játszik'
  | 'Várólistán'
  | 'Csere';

export type TableStatus = 'Kisorsolva' | 'Folyamatban' | 'Kész';
export type RoundStatus = 'Kisorsolva' | 'Folyamatban' | 'Lezárt';

export interface Player {
  id: number;
  name: string;
  team: string;
  status: PlayerStatus;
  avatar: string;
  checkInTime?: string | null;
}

export interface TablePlayer {
  id: number;
  name: string;
  team: string;
  color: string; // '#FF6060' | '#28C76F' | '#2AA9FF' | '#F2E74B'
  winnings: number | null; // 0 - 80
  truckValue: number | null; // 0 - 12
  manualOrder?: number;
}

export interface Table {
  id: number;
  name: string;
  status: TableStatus;
  gameMaster: string;
  players: TablePlayer[];
}

export interface Round {
  round: number;
  status: RoundStatus;
  tables: Table[];
}

export interface Person {
  id: number;
  name: string;
  role: string;
  avatar?: string;
}

export interface Feedback {
  id: number;
  user: string;
  team?: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ProfitabilityEvent {
  id: number;
  name: string;
  type: EventType;
  date: string;
  location: string;
  coverImage?: string;
  stage: EventStage;
  status: string;
  organizers: Person[];
  gameMasters: Person[];
  players: Player[];
  drawResults: Round[] | null;
  feedbacks: Feedback[];
  activeTab?: TabKey;
  resultsViewMode?: 'individual' | 'team';
  resultsRoundFilter?: number;
}

export type TabKey = 'overview' | 'checkin' | 'game' | 'results' | 'feedbacks';

// Egyéni + csapat leaderboard sor típusok (Eredmények tabhoz)
export interface IndividualResultRow {
  playerId: number;
  name: string;
  team: string;
  roundTotals: (number | null)[]; // index 0 = 1. forduló nyereménye ...
  totalWinnings: number;
  totalTrucks: number;
}

export interface TeamResultRow {
  team: string;
  roundTotals: (number | null)[];
  totalWinnings: number;
  totalTrucks: number;
  playerCount: number;
}
