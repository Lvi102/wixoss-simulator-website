import { WixossCard, LifeBurstFormat } from './wixoss';

export type GamePhase = 'MULLIGAN' | 'UP' | 'DRAW' | 'ENER' | 'GROW' | 'MAIN' | 'ATTACK' | 'END' | 'GAME_OVER';

export type SigniSlot = 'left' | 'center' | 'right';

export interface CardInstance {
  instanceId: string;
  card: WixossCard;
  isUp: boolean; // Up (true) or Down (false - tapped)
  powerBonus: number;
  frozen?: boolean;
  usedAbilities?: {
    enterUsed?: boolean;
    autoTriggered?: boolean;
    constActive?: boolean;
    actionUsed?: boolean;
  };
}

export interface PlayerGameState {
  id: 1 | 2;
  name: string;
  avatarColor: string;
  lrigDeck: WixossCard[];
  mainDeck: WixossCard[];
  hand: WixossCard[];
  enerZone: WixossCard[];
  lifeCloth: WixossCard[]; // Face down cards representing health
  checkZone: WixossCard[];
  trash: WixossCard[];
  lrigZone: {
    center: CardInstance | null;
    assistLeft: CardInstance | null;
    assistRight: CardInstance | null;
    piece: WixossCard | null;
  };
  signiZones: {
    left: CardInstance | null;
    center: CardInstance | null;
    right: CardInstance | null;
  };
  coinCount: number;
  mulliganCompleted?: boolean;
}

export interface AttackStepState {
  attackerSlot: SigniSlot | 'lrig';
  attackerPlayerId: 1 | 2;
  targetSlot: SigniSlot | 'lrig';
  defenderPlayerId: 1 | 2;
  isGuardDeclared?: boolean;
  waitingForLifeBurst?: boolean;
  burstCard?: WixossCard | null;
}

export interface GameLogEntry {
  id: string;
  timestamp: string;
  playerId: 1 | 2;
  message: string;
  type: 'phase' | 'action' | 'grow' | 'attack' | 'damage' | 'burst' | 'system';
}

export interface GameState {
  gameId: string;
  mode: 'hotseat' | 'split' | 'solitaire_ai';
  lifeBurstRule: LifeBurstFormat; // Standard Diva Selection Format
  turn: number;
  activePlayer: 1 | 2;
  phase: GamePhase;
  winner: 1 | 2 | null;
  attackState: AttackStepState | null;
  turnAttacksCount?: number;
  log: GameLogEntry[];
  player1: PlayerGameState;
  player2: PlayerGameState;
  history: GameState[]; // For UNDO functionality!
  startTime?: number; // Unix timestamp in ms
}
