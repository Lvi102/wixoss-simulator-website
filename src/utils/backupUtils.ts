import { WixossCard, WixossDeck } from '../types/wixoss';
import { MatchRecord } from '../types/history';

export interface WixossBackupData {
  appName: string;
  version: string;
  exportDate: string;
  cardCount: number;
  deckCount: number;
  cards: WixossCard[];
  decks: WixossDeck[];
  matchHistory?: MatchRecord[];
}

export function downloadFullBackup(
  cards: WixossCard[],
  decks: WixossDeck[],
  matchHistory?: MatchRecord[]
): void {
  const backupData: WixossBackupData = {
    appName: 'WIXOSS Simulator',
    version: '1.0',
    exportDate: new Date().toISOString(),
    cardCount: cards.length,
    deckCount: decks.length,
    cards,
    decks,
    matchHistory: matchHistory || [],
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `wixoss_backup_all_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadDecksBackup(decks: WixossDeck[], cards?: WixossCard[]): void {
  const backupData = {
    appName: 'WIXOSS Simulator',
    version: '1.0',
    exportDate: new Date().toISOString(),
    deckCount: decks.length,
    decks,
    ...(cards ? { cards } : {}),
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Saved Decks - WO.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCardsBackup(cards: WixossCard[]): void {
  const backupData = {
    appName: 'WIXOSS Simulator',
    version: '1.0',
    exportDate: new Date().toISOString(),
    cardCount: cards.length,
    cards,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `wixoss_card_database.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackup(jsonText: string): {
  success: boolean;
  message: string;
  data?: WixossBackupData;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON backup file structure.' };
    }

    let cards: WixossCard[] = [];
    let decks: WixossDeck[] = [];
    let matchHistory: MatchRecord[] = [];

    if (Array.isArray(parsed.cards)) {
      cards = parsed.cards;
    } else if (Array.isArray(parsed)) {
      // Direct array of cards fallback
      cards = parsed;
    }

    if (Array.isArray(parsed.decks)) {
      decks = parsed.decks;
    }

    if (Array.isArray(parsed.matchHistory)) {
      matchHistory = parsed.matchHistory;
    }

    if (cards.length === 0 && decks.length === 0) {
      return {
        success: false,
        message: 'No card database or deck data found in this JSON backup file.',
      };
    }

    return {
      success: true,
      message: `Parsed ${cards.length} cards and ${decks.length} decks successfully.`,
      data: {
        appName: parsed.appName || 'WIXOSS Simulator',
        version: parsed.version || '1.0',
        exportDate: parsed.exportDate || new Date().toISOString(),
        cardCount: cards.length,
        deckCount: decks.length,
        cards,
        decks,
        matchHistory,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to parse backup file: ${err.message || 'Invalid JSON syntax'}`,
    };
  }
}
