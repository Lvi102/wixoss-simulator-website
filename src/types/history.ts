import { WixossColor, LifeBurstFormat } from './wixoss';

export interface PlayerMatchSummary {
  id: 1 | 2;
  name: string;
  deckId: string;
  deckName: string;
  deckColor: WixossColor;
  remainingLifeCloth: number;
}

export interface MatchRecord {
  id: string; // Unique match ID
  date: string; // ISO string timestamp
  gameMode: 'hotseat' | 'split' | 'solitaire_ai';
  lifeBurstRule: LifeBurstFormat;
  durationSeconds: number; // Duration of the game in seconds
  turnsCount: number; // Total turns taken in game
  winnerId: 1 | 2; // 1 for Player 1, 2 for Player 2
  winnerName: string; // Name of winning player
  player1: PlayerMatchSummary;
  player2: PlayerMatchSummary;
  notes?: string;
}
