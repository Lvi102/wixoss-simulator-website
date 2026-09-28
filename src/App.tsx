import React, { useState, useEffect } from 'react';
import { WixossCard, WixossDeck, LifeBurstFormat } from './types/wixoss';
import { GameState } from './types/game';
import { MatchRecord } from './types/history';
import { INITIAL_CARD_DATABASE } from './data/defaultCards';
import { INITIAL_PREBUILT_DECKS } from './data/defaultDecks';
import { initGame } from './utils/gameEngine';
import { downloadFullBackup } from './utils/backupUtils';
import { DigitalLibraryManager } from './components/DigitalLibraryManager';
import { DeckBuilderView } from './components/DeckBuilderView';
import { WixossGameSimulator } from './components/WixossGameSimulator';
import { MatchHistoryView } from './components/MatchHistoryView';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { Play, Layers, BookOpen, Shield, Trophy, History, Database } from 'lucide-react';

const SAMPLE_MATCH_HISTORY: MatchRecord[] = [
  {
    id: 'sample-match-1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    gameMode: 'hotseat',
    lifeBurstRule: 'standard',
    durationSeconds: 385,
    turnsCount: 6,
    winnerId: 1,
    winnerName: 'Player 1',
    player1: {
      id: 1,
      name: 'Player 1',
      deckId: 'wxdi-d03-hirana',
      deckName: 'Diva Debut Deck Hirana',
      deckColor: 'Red',
      remainingLifeCloth: 3,
    },
    player2: {
      id: 2,
      name: 'Player 2',
      deckId: 'wxdi-d01-at',
      deckName: 'Diva Debut Deck At',
      deckColor: 'Green',
      remainingLifeCloth: 0,
    },
    notes: 'Hirana Level 3 Assasin strike dealing final damage.',
  },
  {
    id: 'sample-match-2',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    gameMode: 'solitaire_ai',
    lifeBurstRule: 'standard',
    durationSeconds: 240,
    turnsCount: 4,
    winnerId: 1,
    winnerName: 'Player 1',
    player1: {
      id: 1,
      name: 'Player 1',
      deckId: 'wxdi-d03-hirana',
      deckName: 'Diva Debut Deck Hirana',
      deckColor: 'Red',
      remainingLifeCloth: 4,
    },
    player2: {
      id: 2,
      name: 'AI LRIG Bot',
      deckId: 'wxdi-d02-rei',
      deckName: 'Diva Control Deck Rei',
      deckColor: 'Blue',
      remainingLifeCloth: 0,
    },
    notes: 'Fast Red aggro victory against AI bot.',
  },
  {
    id: 'sample-match-3',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    gameMode: 'split',
    lifeBurstRule: 'standard',
    durationSeconds: 510,
    turnsCount: 8,
    winnerId: 2,
    winnerName: 'Player 2',
    player1: {
      id: 1,
      name: 'Player 1',
      deckId: 'wxdi-d01-at',
      deckName: 'Diva Debut Deck At',
      deckColor: 'Green',
      remainingLifeCloth: 0,
    },
    player2: {
      id: 2,
      name: 'Player 2',
      deckId: 'wxdi-d02-rei',
      deckName: 'Diva Control Deck Rei',
      deckColor: 'Blue',
      remainingLifeCloth: 2,
    },
    notes: 'Clutch Life Burst trigger swung game momentum to Rei.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'deckbuilder' | 'library' | 'history'>('simulator');

  // Match History state stored in localStorage
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(() => {
    const saved = localStorage.getItem('wixoss_match_history');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  // Local state with persistence & automatic sync for default database
  const [cards, setCards] = useState<WixossCard[]>(() => {
    const saved = localStorage.getItem('wixoss_cards');
    if (!saved) return INITIAL_CARD_DATABASE;
    try {
      const parsed: WixossCard[] = JSON.parse(saved);
      // Merge/update standard default cards while keeping custom cards created by user
      const defaultMap = new Map(INITIAL_CARD_DATABASE.map((c) => [c.id, c]));
      const userCustomCards: WixossCard[] = [];
      const seenCustom = new Set<string>();
      for (const c of parsed) {
        if (!defaultMap.has(c.id) && !seenCustom.has(c.id)) {
          seenCustom.add(c.id);
          userCustomCards.push(c);
        }
      }
      return [...INITIAL_CARD_DATABASE, ...userCustomCards];
    } catch {
      return INITIAL_CARD_DATABASE;
    }
  });

  const [decks, setDecks] = useState<WixossDeck[]>(() => {
    const saved = localStorage.getItem('wixoss_decks');
    if (!saved) return INITIAL_PREBUILT_DECKS;
    try {
      const parsed: WixossDeck[] = JSON.parse(saved);
      // Update default prebuilt decks with latest definitions
      const defaultDeckMap = new Map(INITIAL_PREBUILT_DECKS.map((d) => [d.id, d]));
      const updatedDecks = parsed.map((d) => defaultDeckMap.get(d.id) || d);
      // Ensure any new prebuilt deck is present
      const existingDeckIds = new Set(updatedDecks.map((d) => d.id));
      const missingDefaultDecks = INITIAL_PREBUILT_DECKS.filter((d) => !existingDeckIds.has(d.id));
      return [...updatedDecks, ...missingDefaultDecks];
    } catch {
      return INITIAL_PREBUILT_DECKS;
    }
  });

  // Active game session state
  const [activeGameState, setActiveGameState] = useState<GameState | null>(null);

  // New Game setup modal state
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState<boolean>(false);
  const [selectedGameMode, setSelectedGameMode] = useState<'hotseat' | 'split' | 'solitaire_ai'>('hotseat');
  const [selectedLifeBurstRule, setSelectedLifeBurstRule] = useState<LifeBurstFormat>('standard');
  const [p1SelectedDeckId, setP1SelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [p2SelectedDeckId, setP2SelectedDeckId] = useState<string>(decks[1]?.id || decks[0]?.id || '');

  // Backup modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('wixoss_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('wixoss_decks', JSON.stringify(decks));
  }, [decks]);

  useEffect(() => {
    localStorage.setItem('wixoss_match_history', JSON.stringify(matchHistory));
  }, [matchHistory]);

  const handleRestoreBackup = (
    importedCards: WixossCard[],
    importedDecks: WixossDeck[],
    importedHistory?: MatchRecord[],
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    if (mode === 'replace') {
      if (importedCards && importedCards.length > 0) setCards(importedCards);
      if (importedDecks && importedDecks.length > 0) setDecks(importedDecks);
      if (importedHistory) setMatchHistory(importedHistory);
    } else {
      // Merge mode
      if (importedCards && importedCards.length > 0) {
        setCards((prev) => {
          const cardMap = new Map(prev.map((c) => [c.id, c]));
          importedCards.forEach((c) => cardMap.set(c.id, c));
          return Array.from(cardMap.values());
        });
      }

      if (importedDecks && importedDecks.length > 0) {
        setDecks((prev) => {
          const deckMap = new Map(prev.map((d) => [d.id, d]));
          importedDecks.forEach((d) => deckMap.set(d.id, d));
          return Array.from(deckMap.values());
        });
      }

      if (importedHistory && importedHistory.length > 0) {
        setMatchHistory((prev) => {
          const historyMap = new Map(prev.map((h) => [h.id, h]));
          importedHistory.forEach((h) => historyMap.set(h.id, h));
          return Array.from(historyMap.values());
        });
      }
    }
  };

  const handleRecordMatchResult = (record: MatchRecord) => {
    setMatchHistory((prev) => [record, ...prev]);
  };

  const handleClearHistory = () => {
    setMatchHistory([]);
  };

  const handleDeleteMatch = (matchId: string) => {
    setMatchHistory((prev) => prev.filter((m) => m.id !== matchId));
  };

  const handleSeedSampleHistory = () => {
    setMatchHistory(SAMPLE_MATCH_HISTORY);
  };

  const handleAddCardToLibrary = (card: WixossCard) => {
    setCards((prev) => [card, ...prev]);
  };

  const handleDeleteCardFromLibrary = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleSaveDeck = (deck: WixossDeck) => {
    setDecks((prev) => {
      const idx = prev.findIndex((d) => d.id === deck.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = deck;
        return copy;
      }
      return [deck, ...prev];
    });
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
  };

  const handleStartBattle = () => {
    const p1Deck = decks.find((d) => d.id === p1SelectedDeckId) || decks[0];
    const p2Deck = decks.find((d) => d.id === p2SelectedDeckId) || decks[1] || decks[0];

    const newGame = initGame(selectedGameMode, p1Deck, p2Deck, cards, selectedLifeBurstRule);
    setActiveGameState(newGame);
    setIsNewGameModalOpen(false);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                WIXOSS <span className="text-rose-500">SIMULATOR</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">
                Automated Engine • Digital Decks • Local Multiplayer
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'simulator'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Play className="h-3.5 w-3.5" /> Battle Arena
            </button>

            <button
              onClick={() => setActiveTab('deckbuilder')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'deckbuilder'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Deck Builder
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Card List
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <History className="h-3.5 w-3.5" /> Match History
            </button>
          </nav>

          {/* Quick Action Button */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors"
              title="Export or Restore local card and deck backups"
            >
              <Database className="h-3.5 w-3.5" /> Backup & Data
            </button>

            <button
              onClick={() => setIsNewGameModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-200" /> Start Battle
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'simulator' && (
          <div>
            {activeGameState ? (
              <WixossGameSimulator
                initialState={activeGameState}
                onExitGame={() => setActiveGameState(null)}
                onRecordMatchResult={handleRecordMatchResult}
              />
            ) : (
              /* Starter Battle Screen */
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-8 shadow-2xl max-w-3xl mx-auto my-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-inner">
                  <Trophy className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    WIXOSS Local Multiplayer Arena
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                    Automated rules engine for WIXOSS TCG. Features automated phase progression, Grow costs, Life Burst resolution, Guard declarations, and local multiplayer.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-rose-400 font-bold text-xs uppercase tracking-wider block">
                      Hotseat Mode
                    </span>
                    <p className="text-xs text-zinc-400">
                      Pass-and-play 2-player local match with optional hand privacy shield.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-sky-400 font-bold text-xs uppercase tracking-wider block">
                      Split-Screen
                    </span>
                    <p className="text-xs text-zinc-400">
                      Dual-board display on a single screen for tabletop opponents.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block">
                      Solitaire AI
                    </span>
                    <p className="text-xs text-zinc-400">
                      Practice solo against an automated AI LRIG deck engine.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNewGameModalOpen(true)}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 text-white font-bold text-sm shadow-xl hover:shadow-rose-900/40 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <Play className="h-5 w-5 fill-white" /> Launch Match Setup
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deckbuilder' && (
          <DeckBuilderView
            decks={decks}
            cards={cards}
            onSaveDeck={handleSaveDeck}
            onDeleteDeck={handleDeleteDeck}
            onSelectDeckForBattle={(deck) => {
              setP1SelectedDeckId(deck.id);
              setIsNewGameModalOpen(true);
            }}
          />
        )}

        {activeTab === 'library' && (
          <DigitalLibraryManager
            cards={cards}
            decks={decks}
            matchHistory={matchHistory}
            onAddCard={handleAddCardToLibrary}
            onDeleteCard={handleDeleteCardFromLibrary}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onBackupAll={() => downloadFullBackup(cards, decks, matchHistory)}
          />
        )}

        {activeTab === 'history' && (
          <MatchHistoryView
            matchHistory={matchHistory}
            onClearHistory={handleClearHistory}
            onDeleteMatch={handleDeleteMatch}
            onSeedSampleHistory={handleSeedSampleHistory}
            onStartNewBattle={() => setIsNewGameModalOpen(true)}
          />
        )}
      </main>

      {/* Match Setup Modal */}
      {isNewGameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-zinc-100 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-rose-500" /> Configure Local WIXOSS Battle
              </h3>
              <button
                onClick={() => setIsNewGameModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Game Mode */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
                  Select Game Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'hotseat', label: 'Hotseat', desc: 'Pass & Play' },
                    { id: 'split', label: 'Split Screen', desc: 'Dual View' },
                    { id: 'solitaire_ai', label: 'Vs AI Bot', desc: 'Solo Practice' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedGameMode(m.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedGameMode === m.id
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-white">{m.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Rule Display */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  Game Format Rule
                </label>
                <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-300 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white">🎯 Standard Diva Selection Format</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Official Rule: 40 Main Deck cards (20 Cards WITH Life Burst / 20 Cards WITHOUT Life Burst)
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    Official
                  </span>
                </div>
              </div>

              {/* Player 1 Deck */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  Player 1 Deck
                </label>
                <select
                  value={p1SelectedDeckId}
                  onChange={(e) => setP1SelectedDeckId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.color} • {d.mainDeckCardIds.length} Main / {d.lrigDeckCardIds.length} LRIG)
                    </option>
                  ))}
                </select>
              </div>

              {/* Player 2 Deck */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                  {selectedGameMode === 'solitaire_ai' ? 'AI Bot Deck' : 'Player 2 Deck'}
                </label>
                <select
                  value={p2SelectedDeckId}
                  onChange={(e) => setP2SelectedDeckId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.color} • {d.mainDeckCardIds.length} Main / {d.lrigDeckCardIds.length} LRIG)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setIsNewGameModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-medium text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleStartBattle}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 text-white font-bold text-sm shadow-md flex items-center gap-2"
              >
                <Play className="h-4 w-4" /> Start Battle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Data Settings Modal */}
      <BackupSettingsModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        cards={cards}
        decks={decks}
        matchHistory={matchHistory}
        onRestoreBackup={handleRestoreBackup}
      />
    </div>
  );
}
