import React, { useState } from 'react';
import { WixossDeck, WixossCard, WixossColor } from '../types/wixoss';
import { validateWixossDeck } from '../utils/deckUtils';
import { downloadDecksBackup, parseAndValidateBackup } from '../utils/backupUtils';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Layers,
  Zap,
  Copy,
  ChevronRight,
  Download,
  Upload,
  Edit3,
  RotateCcw,
  Wand2,
  BarChart2,
  Filter,
} from 'lucide-react';

interface DeckBuilderViewProps {
  decks: WixossDeck[];
  cards: WixossCard[];
  onSaveDeck: (deck: WixossDeck) => void;
  onDeleteDeck: (id: string) => void;
  onSelectDeckForBattle: (deck: WixossDeck) => void;
}

export const DeckBuilderView: React.FC<DeckBuilderViewProps> = ({
  decks,
  cards,
  onSaveDeck,
  onDeleteDeck,
  onSelectDeckForBattle,
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [search, setSearch] = useState<string>('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('All');
  const [selectedBurstFilter, setSelectedBurstFilter] = useState<string>('All');

  // Auto-save feedback state
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);

  const activeDeck = decks.find((d) => d.id === selectedDeckId) || decks[0];

  const cardMap = new Map<string, WixossCard>();
  cards.forEach((c) => cardMap.set(c.id, c));

  const validation = activeDeck ? validateWixossDeck(activeDeck, cards) : null;

  const triggerAutoSave = (updatedDeck: WixossDeck, label: string) => {
    onSaveDeck(updatedDeck);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAutoSaveToast(`${label} • Auto-saved at ${timeStr}`);
  };

  const handleUpdateDeckName = (newName: string) => {
    if (!activeDeck) return;
    const updated: WixossDeck = {
      ...activeDeck,
      name: newName,
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Updated deck name to "${newName}"`);
  };

  const handleUpdateDeckColor = (newColor: WixossColor) => {
    if (!activeDeck) return;
    const updated: WixossDeck = {
      ...activeDeck,
      color: newColor,
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Updated deck color to ${newColor}`);
  };

  const handleCreateDeck = () => {
    const newDeck: WixossDeck = {
      id: `deck-${Date.now()}`,
      name: `New WIXOSS Deck ${decks.length + 1}`,
      description: 'Custom WIXOSS deck created in deck builder.',
      color: 'Red',
      lrigDeckCardIds: ['wxdi-d03-001-hirana-0'],
      mainDeckCardIds: [],
      updatedAt: new Date().toISOString(),
    };
    onSaveDeck(newDeck);
    setSelectedDeckId(newDeck.id);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAutoSaveToast(`Created "${newDeck.name}" • Auto-saved at ${timeStr}`);
  };

  const handleDuplicateDeck = () => {
    if (!activeDeck) return;
    const dupDeck: WixossDeck = {
      ...activeDeck,
      id: `deck-${Date.now()}`,
      name: `${activeDeck.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    onSaveDeck(dupDeck);
    setSelectedDeckId(dupDeck.id);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAutoSaveToast(`Duplicated "${dupDeck.name}" • Auto-saved at ${timeStr}`);
  };

  const handleDeleteActiveDeck = () => {
    if (!activeDeck) return;
    if (decks.length <= 1) {
      alert('Cannot delete the only deck. You must have at least 1 deck available.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${activeDeck.name}"?`)) {
      onDeleteDeck(activeDeck.id);
      const remaining = decks.filter((d) => d.id !== activeDeck.id);
      if (remaining.length > 0) {
        setSelectedDeckId(remaining[0].id);
      }
    }
  };

  const handleClearMainDeck = () => {
    if (!activeDeck) return;
    if (activeDeck.mainDeckCardIds.length === 0) return;
    if (window.confirm('Clear all cards from the Main Deck?')) {
      const updated: WixossDeck = {
        ...activeDeck,
        mainDeckCardIds: [],
        updatedAt: new Date().toISOString(),
      };
      triggerAutoSave(updated, 'Cleared Main Deck');
    }
  };

  const handleClearLrigDeck = () => {
    if (!activeDeck) return;
    if (activeDeck.lrigDeckCardIds.length === 0) return;
    if (window.confirm('Clear all cards from the LRIG Deck?')) {
      const updated: WixossDeck = {
        ...activeDeck,
        lrigDeckCardIds: [],
        updatedAt: new Date().toISOString(),
      };
      triggerAutoSave(updated, 'Cleared LRIG Deck');
    }
  };

  const handleAutoBalanceDeck = () => {
    if (!activeDeck) return;
    const currentMain = [...activeDeck.mainDeckCardIds];
    const currentBurst = currentMain.filter((id) => cardMap.get(id)?.lifeBurst).length;
    const currentNonBurst = currentMain.filter((id) => !cardMap.get(id)?.lifeBurst).length;

    const deckColor = activeDeck.color;
    const matchingColorCards = cards.filter(
      (c) => (c.color === deckColor || c.color === 'Colorless') && (c.cardType === 'SIGNI' || c.cardType === 'Spell')
    );

    const burstCandidates = matchingColorCards.filter((c) => c.lifeBurst);
    const nonBurstCandidates = matchingColorCards.filter((c) => !c.lifeBurst);

    const newMain = [...currentMain];

    // Fill Burst cards up to 20
    let neededBurst = 20 - currentBurst;
    let bIdx = 0;
    while (neededBurst > 0 && burstCandidates.length > 0) {
      const candidate = burstCandidates[bIdx % burstCandidates.length];
      const countInDeck = newMain.filter((id) => cardMap.get(id)?.name === candidate.name).length;
      if (countInDeck < 4 && newMain.length < 40) {
        newMain.push(candidate.id);
        neededBurst--;
      }
      bIdx++;
      if (bIdx > burstCandidates.length * 5) break;
    }

    // Fill Non-Burst cards up to 20
    let neededNonBurst = 20 - currentNonBurst;
    let nbIdx = 0;
    while (neededNonBurst > 0 && nonBurstCandidates.length > 0) {
      const candidate = nonBurstCandidates[nbIdx % nonBurstCandidates.length];
      const countInDeck = newMain.filter((id) => cardMap.get(id)?.name === candidate.name).length;
      if (countInDeck < 4 && newMain.length < 40) {
        newMain.push(candidate.id);
        neededNonBurst--;
      }
      nbIdx++;
      if (nbIdx > nonBurstCandidates.length * 5) break;
    }

    const updated: WixossDeck = {
      ...activeDeck,
      mainDeckCardIds: newMain,
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Auto-filled Main Deck to ${newMain.length} cards`);
  };

  const handleImportDeckJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseAndValidateBackup(text);
      if (res.success && res.data?.decks && res.data.decks.length > 0) {
        res.data.decks.forEach((deck) => onSaveDeck(deck));
        setSelectedDeckId(res.data.decks[0].id);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setAutoSaveToast(`Imported ${res.data.decks.length} deck(s) • Auto-saved at ${timeStr}`);
      } else {
        alert(res.message || 'Failed to import deck JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addCardToMainDeck = (cardId: string) => {
    if (!activeDeck) return;
    const card = cardMap.get(cardId);
    if (!card) return;

    if (card.cardType === 'Piece' || card.cardType === 'LRIG' || card.cardType === 'Arts') {
      alert(`${card.cardType} cards belong in the LRIG Deck, not the Main Deck.`);
      return;
    }

    // Check max 4 check by name across both decks
    const sameNameCount = [...activeDeck.mainDeckCardIds, ...activeDeck.lrigDeckCardIds]
      .map((id) => cardMap.get(id))
      .filter((c) => c && c.name === card.name).length;

    if (sameNameCount >= 4) {
      alert(`Cannot add more than 4 copies of "${card.name}".`);
      return;
    }

    if (activeDeck.mainDeckCardIds.length >= 40) {
      alert('Main Deck is full! Maximum 40 cards allowed.');
      return;
    }

    const updated: WixossDeck = {
      ...activeDeck,
      mainDeckCardIds: [...activeDeck.mainDeckCardIds, cardId],
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Added "${card.name}" to Main Deck`);
  };

  const removeCardFromMainDeckByCardId = (cardId: string) => {
    if (!activeDeck) return;
    const card = cardMap.get(cardId);
    const index = activeDeck.mainDeckCardIds.indexOf(cardId);
    if (index === -1) return;

    const newMain = [...activeDeck.mainDeckCardIds];
    newMain.splice(index, 1);
    const updated: WixossDeck = {
      ...activeDeck,
      mainDeckCardIds: newMain,
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Removed "${card?.name || 'Card'}" from Main Deck`);
  };

  const addCardToLrigDeck = (cardId: string) => {
    if (!activeDeck) return;
    const card = cardMap.get(cardId);
    if (!card) return;

    if (card.cardType === 'SIGNI' || card.cardType === 'Spell') {
      alert(`${card.cardType} cards belong in the Main Deck, not the LRIG Deck.`);
      return;
    }

    if (activeDeck.lrigDeckCardIds.length >= 10) {
      alert('LRIG Deck is full! Maximum 10 cards allowed.');
      return;
    }

    if (card.cardType === 'Piece') {
      const pieceCount = activeDeck.lrigDeckCardIds
        .map((id) => cardMap.get(id))
        .filter((c) => c && c.cardType === 'Piece').length;
      if (pieceCount >= 2) {
        alert('LRIG Deck can contain at most 2 Piece cards.');
        return;
      }
    }

    const updated: WixossDeck = {
      ...activeDeck,
      lrigDeckCardIds: [...activeDeck.lrigDeckCardIds, cardId],
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Added "${card.name}" to LRIG Deck`);
  };

  const removeCardFromLrigDeckByCardId = (cardId: string) => {
    if (!activeDeck) return;
    const card = cardMap.get(cardId);
    const index = activeDeck.lrigDeckCardIds.indexOf(cardId);
    if (index === -1) return;

    const newLrig = [...activeDeck.lrigDeckCardIds];
    newLrig.splice(index, 1);
    const updated: WixossDeck = {
      ...activeDeck,
      lrigDeckCardIds: newLrig,
      updatedAt: new Date().toISOString(),
    };
    triggerAutoSave(updated, `Removed "${card?.name || 'Card'}" from LRIG Deck`);
  };

  // Grouped Main Deck Cards helper
  const getGroupedMainDeck = () => {
    if (!activeDeck) return [];
    const countsMap = new Map<string, { card: WixossCard; count: number; ids: string[] }>();

    activeDeck.mainDeckCardIds.forEach((id) => {
      const c = cardMap.get(id);
      if (!c) return;
      const key = c.id;
      if (!countsMap.has(key)) {
        countsMap.set(key, { card: c, count: 0, ids: [] });
      }
      const entry = countsMap.get(key)!;
      entry.count += 1;
      entry.ids.push(id);
    });

    const list = Array.from(countsMap.values());
    return list.sort((a, b) => {
      const lvlA = a.card.cardType === 'Spell' ? 99 : a.card.level ?? 0;
      const lvlB = b.card.cardType === 'Spell' ? 99 : b.card.level ?? 0;
      if (lvlA !== lvlB) return lvlA - lvlB;
      return a.card.name.localeCompare(b.card.name);
    });
  };

  // Grouped LRIG Deck Cards helper
  const getGroupedLrigDeck = () => {
    if (!activeDeck) return [];
    const countsMap = new Map<string, { card: WixossCard; count: number; ids: string[] }>();

    activeDeck.lrigDeckCardIds.forEach((id) => {
      const c = cardMap.get(id);
      if (!c) return;
      const key = c.id;
      if (!countsMap.has(key)) {
        countsMap.set(key, { card: c, count: 0, ids: [] });
      }
      const entry = countsMap.get(key)!;
      entry.count += 1;
      entry.ids.push(id);
    });

    const list = Array.from(countsMap.values());
    return list.sort((a, b) => {
      const typeRank = (t: string) => (t === 'LRIG' ? 1 : t === 'Piece' ? 2 : 3);
      const rA = typeRank(a.card.cardType);
      const rB = typeRank(b.card.cardType);
      if (rA !== rB) return rA - rB;
      return (a.card.level ?? 0) - (b.card.level ?? 0);
    });
  };

  // Calculate level curve statistics for Main Deck
  const getLevelCurve = () => {
    if (!activeDeck) return { l1: 0, l2: 0, l3: 0, spell: 0 };
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;
    let spell = 0;

    activeDeck.mainDeckCardIds.forEach((id) => {
      const c = cardMap.get(id);
      if (!c) return;
      if (c.cardType === 'Spell') {
        spell++;
      } else if (c.level === 1) {
        l1++;
      } else if (c.level === 2) {
        l2++;
      } else if (c.level === 3) {
        l3++;
      }
    });

    return { l1, l2, l3, spell };
  };

  const levelCurve = getLevelCurve();

  // Filter available cards to add
  const filteredCatalog = cards.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchType = c.cardType.toLowerCase().includes(q);
      const matchColor = c.color.toLowerCase().includes(q);
      const matchClass = (c.signiClass || '').toLowerCase().includes(q);
      const matchLrigType = (c.lrigType || '').toLowerCase().includes(q);
      const matchEffect = c.effectText.toLowerCase().includes(q);
      const matchBurst = (c.lifeBurstEffect || '').toLowerCase().includes(q);
      if (
        !matchName &&
        !matchType &&
        !matchColor &&
        !matchClass &&
        !matchLrigType &&
        !matchEffect &&
        !matchBurst
      ) {
        return false;
      }
    }
    if (selectedColorFilter !== 'All' && c.color !== selectedColorFilter) return false;
    if (selectedTypeFilter !== 'All' && c.cardType !== selectedTypeFilter) return false;
    if (selectedLevelFilter !== 'All') {
      const targetLvl = parseInt(selectedLevelFilter.replace('Lvl ', ''), 10);
      if (c.level !== targetLvl) return false;
    }
    if (selectedBurstFilter === 'burst' && !c.lifeBurst) return false;
    if (selectedBurstFilter === 'no_burst' && c.lifeBurst) return false;
    return true;
  });

  const groupedMain = getGroupedMainDeck();
  const groupedLrig = getGroupedLrigDeck();

  return (
    <div className="space-y-6">
      {/* Top Deck Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block">
              Active Deck Selection
            </label>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="bg-transparent font-bold text-lg text-white focus:outline-none focus:text-rose-400 cursor-pointer"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id} className="bg-zinc-900 text-white">
                  {d.name} ({d.color})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCreateDeck}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Create a new blank deck"
          >
            <Plus className="h-4 w-4 text-rose-400" /> New
          </button>

          <button
            onClick={handleDuplicateDeck}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Duplicate active deck"
          >
            <Copy className="h-4 w-4" /> Clone
          </button>

          <label className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="h-4 w-4" /> Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportDeckJson}
              className="hidden"
            />
          </label>

          <button
            onClick={() => downloadDecksBackup(decks, cards)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sky-400 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download Saved Decks - WO.json"
          >
            <Download className="h-4 w-4" /> Export (.json)
          </button>

          <button
            onClick={handleDeleteActiveDeck}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-rose-950 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-zinc-700 hover:border-rose-700/60 flex items-center gap-1 transition-colors cursor-pointer"
            title="Delete active deck"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {activeDeck && (
            <button
              onClick={() => onSelectDeckForBattle(activeDeck)}
              disabled={!validation?.isValid}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all ml-1 cursor-pointer disabled:cursor-not-allowed"
            >
              Battle with Deck <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Auto-Save Active Banner */}
      {autoSaveToast && (
        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-xs text-emerald-300 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{autoSaveToast}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono uppercase tracking-wider bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700/50 font-bold">
            Auto-Saved
          </span>
        </div>
      )}

      {activeDeck ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Deck Info & Rules Validation (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Editable Deck Details Card */}
            <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-rose-400" /> Deck Details
                </h3>
                <span className="text-[10px] font-mono text-zinc-500">ID: {activeDeck.id}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Deck Title
                  </label>
                  <input
                    type="text"
                    value={activeDeck.name}
                    onChange={(e) => handleUpdateDeckName(e.target.value)}
                    placeholder="Enter deck name..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Primary Color
                    </label>
                    <select
                      value={activeDeck.color}
                      onChange={(e) => handleUpdateDeckColor(e.target.value as WixossColor)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      {['White', 'Red', 'Blue', 'Green', 'Black', 'Colorless'].map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Format Rule
                    </label>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-rose-400 font-bold truncate">
                      Diva Selection
                    </div>
                  </div>
                </div>

                {/* Level Curve Statistics Widget */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                      <BarChart2 className="h-3 w-3 text-sky-400" /> SIGNI Level Curve
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {activeDeck.mainDeckCardIds.length} Total Cards
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
                      <div className="text-[9px] text-zinc-400 font-bold">Lvl 1</div>
                      <div className="text-xs font-mono font-bold text-rose-400">{levelCurve.l1}</div>
                    </div>
                    <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
                      <div className="text-[9px] text-zinc-400 font-bold">Lvl 2</div>
                      <div className="text-xs font-mono font-bold text-sky-400">{levelCurve.l2}</div>
                    </div>
                    <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
                      <div className="text-[9px] text-zinc-400 font-bold">Lvl 3</div>
                      <div className="text-xs font-mono font-bold text-emerald-400">{levelCurve.l3}</div>
                    </div>
                    <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
                      <div className="text-[9px] text-zinc-400 font-bold">Spells</div>
                      <div className="text-xs font-mono font-bold text-purple-400">{levelCurve.spell}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Card */}
            <div className="bg-zinc-900/90 rounded-2xl p-5 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Deck Format & Rules
                </h3>
                {validation?.isValid ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Legal Deck
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Invalid Deck
                  </span>
                )}
              </div>

              {/* Progress meters */}
              <div className="space-y-3 text-xs pt-1">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-400">Main Deck (Exact 40)</span>
                    <span
                      className={`font-mono font-bold ${
                        validation?.mainCount === 40 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {validation?.mainCount} / 40
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        validation?.mainCount === 40 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, (validation?.mainCount || 0) * 2.5)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-400">
                      Life Bursts (Exact 20)
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        validation?.lifeBurstCount === 20 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {validation?.lifeBurstCount} Bursts / {validation?.nonBurstCount} Non-Burst
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(100, (validation?.lifeBurstCount || 0) * 2.5)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-400">LRIG Deck (Max 10)</span>
                    <span
                      className={`font-mono font-bold ${
                        (validation?.lrigCount || 0) <= 10 ? 'text-sky-400' : 'text-rose-400'
                      }`}
                    >
                      {validation?.lrigCount} / 10
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (validation?.lrigCount || 0) <= 10 ? 'bg-sky-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, (validation?.lrigCount || 0) * 10)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-400">Piece Cards (Max 2)</span>
                    <span
                      className={`font-mono font-bold ${
                        (validation?.pieceCount || 0) <= 2 ? 'text-purple-400' : 'text-rose-400'
                      }`}
                    >
                      {validation?.pieceCount || 0} / 2
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (validation?.pieceCount || 0) <= 2 ? 'bg-purple-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, ((validation?.pieceCount || 0) / 2) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Deck Helper Action */}
              <div className="pt-2 border-t border-zinc-800">
                <button
                  onClick={handleAutoBalanceDeck}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-rose-600/30 to-purple-600/30 hover:from-amber-600/50 hover:via-rose-600/50 hover:to-purple-600/50 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Auto-fills remaining Main Deck slots to match color and 20-burst ratio"
                >
                  <Wand2 className="h-3.5 w-3.5 text-amber-400" /> Auto-Fill Legal Main Deck
                </button>
              </div>

              {/* Errors list */}
              {validation?.errors.length! > 0 && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-[11px] text-red-300 space-y-1">
                  {validation?.errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-red-400">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LRIG Deck List */}
            <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <span>LRIG Deck Cards ({activeDeck.lrigDeckCardIds.length})</span>
                </h4>
                {activeDeck.lrigDeckCardIds.length > 0 && (
                  <button
                    onClick={handleClearLrigDeck}
                    className="text-[10px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Clear LRIG Deck"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {groupedLrig.map(({ card, count }) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      {card.cardType === 'Piece' ? (
                        <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40 text-[9px] font-bold uppercase tracking-wider shrink-0">
                          PIECE
                        </span>
                      ) : card.cardType === 'Arts' ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-500/40 text-[9px] font-bold uppercase tracking-wider shrink-0">
                          ARTS
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-500/40 text-[9px] font-bold uppercase tracking-wider shrink-0">
                          L{card.level ?? 0}
                        </span>
                      )}
                      <span className="font-medium text-zinc-200 line-clamp-1">
                        {card.name}
                      </span>
                      {count > 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold text-[10px] border border-sky-700/50">
                          x{count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => addCardToLrigDeck(card.id)}
                        title="Add another copy"
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-sky-400 border border-zinc-800 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => removeCardFromLrigDeckByCardId(card.id)}
                        title="Remove 1 copy"
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                ))}
                {activeDeck.lrigDeckCardIds.length === 0 && (
                  <p className="text-xs text-zinc-500 italic text-center py-3">
                    No LRIG cards added. Select LRIG/Piece cards from Catalog right.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Middle Column: Main Deck Composition (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/90 rounded-2xl p-5 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Main Deck ({activeDeck.mainDeckCardIds.length}/40)
              </h3>
              {activeDeck.mainDeckCardIds.length > 0 && (
                <button
                  onClick={handleClearMainDeck}
                  className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear all cards from Main Deck"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {groupedMain.map(({ card, count }) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs group transition-colors"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    {card.cardType.toUpperCase() === 'SPELL' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40 shrink-0">
                        SPELL
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                        L{card.level}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100 block line-clamp-1">
                          {card.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono font-bold text-[10px] border border-zinc-700/60 shrink-0">
                          x{count}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-zinc-400">
                        <span>{card.color}</span>
                        {card.lifeBurst && (
                          <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                            <Zap className="h-3 w-3" /> Burst
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => addCardToMainDeck(card.id)}
                      title="Add another copy"
                      className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => removeCardFromMainDeckByCardId(card.id)}
                      title="Remove 1 copy"
                      className="px-2 py-1 rounded bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      -1
                    </button>
                  </div>
                </div>
              ))}

              {activeDeck.mainDeckCardIds.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-xs italic space-y-2">
                  <p>Main Deck is empty.</p>
                  <p className="text-zinc-600">
                    Select cards from the Card Catalog on the right or click "Auto-Fill" to populate!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Card Library Catalog (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/90 rounded-2xl p-5 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-rose-400" /> Card Catalog ({filteredCatalog.length})
              </h3>
            </div>

            {/* Catalog search & filter */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards by name, effect, or class..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />

            {/* Color Filter buttons */}
            <div className="space-y-1 pt-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Color Filter
              </label>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {['All', 'White', 'Red', 'Blue', 'Green', 'Black', 'Colorless'].map((col) => {
                  const active = selectedColorFilter === col;
                  return (
                    <button
                      key={col}
                      onClick={() => setSelectedColorFilter(col)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        active
                          ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                          : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {col === 'White' && <span className="h-2 w-2 rounded-full bg-amber-200 border border-amber-400" />}
                      {col === 'Red' && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                      {col === 'Blue' && <span className="h-2 w-2 rounded-full bg-sky-400" />}
                      {col === 'Green' && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                      {col === 'Black' && <span className="h-2 w-2 rounded-full bg-purple-500" />}
                      {col === 'Colorless' && <span className="h-2 w-2 rounded-full bg-zinc-400" />}
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Type Filters */}
            <div className="flex flex-wrap gap-1 text-xs pt-1">
              {['All', 'LRIG', 'SIGNI', 'Spell', 'Piece'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedTypeFilter === t
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Level Filter */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {['All', 'Lvl 0', 'Lvl 1', 'Lvl 2', 'Lvl 3'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevelFilter(lvl)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedLevelFilter === lvl
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Life Burst Filters */}
            <div className="flex flex-wrap gap-1 text-[11px] pt-1">
              <button
                onClick={() => setSelectedBurstFilter('All')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedBurstFilter === 'All'
                    ? 'bg-zinc-700 text-white font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                All Cards
              </button>
              <button
                onClick={() => setSelectedBurstFilter('burst')}
                className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  selectedBurstFilter === 'burst'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-zinc-950 text-amber-400/80 hover:text-amber-300 border border-zinc-800'
                }`}
              >
                <Zap className="h-3 w-3" /> With Burst (20 Req)
              </button>
              <button
                onClick={() => setSelectedBurstFilter('no_burst')}
                className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  selectedBurstFilter === 'no_burst'
                    ? 'bg-zinc-700 text-white font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                No Burst (20 Req)
              </button>
            </div>

            {/* Catalog Items list */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredCatalog.map((card) => {
                const countInDeck = [...activeDeck.mainDeckCardIds, ...activeDeck.lrigDeckCardIds]
                  .map((id) => cardMap.get(id))
                  .filter((c) => c && c.name === card.name).length;

                const colorBadgeClass =
                  card.color === 'White'
                    ? 'bg-amber-950/40 text-amber-300 border-amber-600/40'
                    : card.color === 'Red'
                    ? 'bg-rose-950/40 text-rose-400 border-rose-600/40'
                    : card.color === 'Blue'
                    ? 'bg-sky-950/40 text-sky-400 border-sky-600/40'
                    : card.color === 'Green'
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/40'
                    : card.color === 'Black'
                    ? 'bg-purple-950/40 text-purple-400 border-purple-600/40'
                    : 'bg-zinc-800/40 text-zinc-300 border-zinc-600/40';

                return (
                  <div
                    key={card.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 text-xs space-y-2 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${colorBadgeClass}`}
                          >
                            {card.color}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400">
                            {card.cardType}{card.cardType.toUpperCase() === 'SPELL' ? '' : ` • Lvl ${card.level}`}
                          </span>
                          {card.lifeBurst && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-0.5">
                              <Zap className="h-2.5 w-2.5" /> Burst
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              countInDeck >= 4
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                : countInDeck > 0
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                : 'bg-zinc-900 text-zinc-500'
                            }`}
                          >
                            {countInDeck}/4 in deck
                          </span>
                        </div>
                        <h4 className="font-bold text-zinc-100">{card.name}</h4>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {card.cardType === 'LRIG' || card.cardType === 'Arts' || card.cardType === 'Piece' ? (
                          <button
                            onClick={() => addCardToLrigDeck(card.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            + LRIG
                          </button>
                        ) : (
                          <button
                            onClick={() => addCardToMainDeck(card.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            + Main
                          </button>
                        )}
                      </div>
                    </div>

                    {card.lifeBurstEffect && (
                      <p className="text-[10px] text-amber-300 bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
                        <span className="font-bold">Life Burst:</span> {card.lifeBurstEffect}
                      </p>
                    )}

                    <p className="text-[11px] text-zinc-400 line-clamp-2">{card.effectText}</p>
                  </div>
                );
              })}
              {filteredCatalog.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No cards matched your filter query.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-3">
          <p className="text-zinc-400 text-sm">No active deck selected.</p>
          <button
            onClick={handleCreateDeck}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create New Deck
          </button>
        </div>
      )}
    </div>
  );
};
