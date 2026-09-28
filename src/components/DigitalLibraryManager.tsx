import React, { useState } from 'react';
import { WixossCard, WixossDeck, WixossColor, CardType } from '../types/wixoss';
import { MatchRecord } from '../types/history';
import { downloadFullBackup } from '../utils/backupUtils';
import {
  Search,
  Plus,
  Shield,
  Zap,
  Sparkles,
  Filter,
  Download,
  Database,
  Trash2,
  Eye,
  Maximize2,
  Copy,
  Check,
  X,
  Layers,
  Info,
  Ban,
  Edit3,
  Wand2,
  Tag,
} from 'lucide-react';

export function parseCardAbilities(card: WixossCard): string[] {
  const abilities: string[] = [];
  if (card.abilities && card.abilities.length > 0) {
    card.abilities.forEach((a) => {
      if (!abilities.includes(a)) abilities.push(a);
    });
  }

  const text = `${card.effectText || ''} ${card.lifeBurstEffect || ''}`;

  // Abilities (Timing / Mode)
  const abilityPresets = [
    '[Enter]',
    '[Const]',
    '[Action]',
    '[Auto]',
    '[Team Action]',
    '[Team Enter]',
    '[Team Const]',
    '[Team Auto]',
  ];

  // Keywords
  const keywordPresets = [
    '[Shadow]',
    '[Lancer]',
    '[Double Crash]',
    '[Double Crush]',
    '[Assassin]',
    '[Multi Ener]',
    '[S Lancer]',
    '[Guard]',
  ];

  const typeCardPresets = [
    '[Center LRIG]',
    '[Assist LRIG]',
    '[Arts]',
    '[SIGNI]',
    '[Spell]',
    '[PIECE]',
  ];

  const presets = [...abilityPresets, ...keywordPresets, ...typeCardPresets];

  presets.forEach((kw) => {
    if (text.toLowerCase().includes(kw.toLowerCase())) {
      const tagToPush = kw === '[Double Crush]' ? '[Double Crash]' : kw;
      if (!abilities.includes(tagToPush)) {
        abilities.push(tagToPush);
      }
    }
  });

  const keywordMappings: [RegExp, string][] = [
    [/assassin/i, '[Assassin]'],
    [/multi ener/i, '[Multi Ener]'],
    [/s lancer/i, '[S Lancer]'],
    [/double c(ra|ru)sh/i, '[Double Crash]'],
    [/lancer/i, '[Lancer]'],
    [/shadow/i, '[Shadow]'],
    [/guard/i, '[Guard]'],
  ];

  keywordMappings.forEach(([regex, tag]) => {
    if (regex.test(text) && !abilities.includes(tag)) {
      abilities.push(tag);
    }
  });

  if (card.guard && !abilities.includes('[Guard]')) {
    abilities.push('[Guard]');
  }
  if (card.lifeBurst && !abilities.includes('[Life Burst]')) {
    abilities.push('[Life Burst]');
  }

  return abilities;
}

export function getAbilityBadgeStyle(ability: string) {
  const lower = ability.toLowerCase();
  if (lower.includes('enter')) return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
  if (lower.includes('const')) return 'bg-sky-950/80 text-sky-300 border-sky-700/60';
  if (lower.includes('action')) return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
  if (lower.includes('auto')) return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  if (lower.includes('guard')) return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
  if (lower.includes('burst')) return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
  if (
    lower.includes('shadow') ||
    lower.includes('lancer') ||
    lower.includes('crash') ||
    lower.includes('crush') ||
    lower.includes('assassin') ||
    lower.includes('multi ener')
  ) {
    return 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-700/60';
  }
  if (
    lower.includes('lrig') ||
    lower.includes('arts') ||
    lower.includes('signi') ||
    lower.includes('spell') ||
    lower.includes('piece')
  ) {
    return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
  }
  return 'bg-zinc-800 text-zinc-300 border-zinc-700';
}

interface DigitalLibraryManagerProps {
  cards: WixossCard[];
  decks?: WixossDeck[];
  matchHistory?: MatchRecord[];
  onAddCard: (card: WixossCard) => void;
  onDeleteCard: (id: string) => void;
  onOpenScanner?: () => void;
  onOpenBackupModal?: () => void;
  onBackupAll?: () => void;
}

const COLOR_CLASSES: Record<WixossColor, { bg: string; text: string; border: string }> = {
  Red: { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-600/50' },
  Blue: { bg: 'bg-sky-950/40', text: 'text-sky-400', border: 'border-sky-600/50' },
  Green: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-600/50' },
  Black: { bg: 'bg-zinc-900', text: 'text-purple-400', border: 'border-purple-600/50' },
  White: { bg: 'bg-amber-950/20', text: 'text-amber-300', border: 'border-amber-500/50' },
  Colorless: { bg: 'bg-zinc-800/40', text: 'text-zinc-300', border: 'border-zinc-600/50' },
};

export const DigitalLibraryManager: React.FC<DigitalLibraryManagerProps> = ({
  cards,
  decks = [],
  matchHistory = [],
  onAddCard,
  onDeleteCard,
  onOpenScanner,
  onOpenBackupModal,
  onBackupAll,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [onlyBurst, setOnlyBurst] = useState<boolean>(false);
  const [onlyGuard, setOnlyGuard] = useState<boolean>(false);
  const [activeCardModal, setActiveCardModal] = useState<WixossCard | null>(null);
  const [copiedCardInfo, setCopiedCardInfo] = useState<boolean>(false);
  const [isArtworkFullscreen, setIsArtworkFullscreen] = useState<boolean>(false);

  // Manual Custom / Edit Card Form Modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState<Partial<WixossCard>>({
    name: '',
    cardType: 'SIGNI',
    color: 'Red',
    level: 1,
    power: 3000,
    cost: 'Free',
    lifeBurst: false,
    lifeBurstEffect: '',
    effectText: '',
    abilities: [],
    guard: false,
  });

  const toggleAbilityTag = (tag: string) => {
    const currentAbilities = newCard.abilities || [];
    const exists = currentAbilities.includes(tag);
    const updatedAbilities = exists
      ? currentAbilities.filter((a) => a !== tag)
      : [...currentAbilities, tag];

    let effect = newCard.effectText || '';
    if (!exists && !effect.includes(tag)) {
      effect = `${tag} ${effect}`.trim();
    }

    setNewCard({
      ...newCard,
      abilities: updatedAbilities,
      effectText: effect,
      guard: tag === '[Guard]' ? true : newCard.guard,
    });
  };

  const handleLifeBurstToggle = (checked: boolean) => {
    setNewCard({
      ...newCard,
      lifeBurst: checked,
      lifeBurstEffect: checked ? newCard.lifeBurstEffect || '' : '',
    });
  };

  const filteredCards = cards.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchType = c.cardType.toLowerCase().includes(q);
      const matchColor = c.color.toLowerCase().includes(q);
      const matchClass = (c.signiClass || '').toLowerCase().includes(q);
      const matchLrigType = (c.lrigType || '').toLowerCase().includes(q);
      const matchEffect = c.effectText.toLowerCase().includes(q);
      const matchBurst = (c.lifeBurstEffect || '').toLowerCase().includes(q);
      if (
        !matchId &&
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

    if (selectedColor !== 'All' && c.color !== selectedColor) return false;
    if (selectedType !== 'All' && c.cardType !== selectedType) return false;
    if (selectedLevel !== 'All' && c.level !== parseInt(selectedLevel)) return false;
    if (onlyBurst && !c.lifeBurst) return false;
    if (onlyGuard && !c.guard) return false;

    return true;
  });

  const handleSaveManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.name) return;

    const isBurst = Boolean(newCard.lifeBurst) && newCard.cardType !== 'LRIG' && newCard.cardType !== 'Arts' && newCard.cardType !== 'Piece';

    const savedCard: WixossCard = {
      id: editingCardId || `custom-card-${Date.now()}`,
      name: newCard.name,
      cardType: (newCard.cardType as CardType) || 'SIGNI',
      color: (newCard.color as WixossColor) || 'Red',
      level: Number(newCard.level) || 0,
      power: Number(newCard.power) || 0,
      cost: newCard.cost || 'Free',
      lifeBurst: isBurst,
      lifeBurstEffect: isBurst ? newCard.lifeBurstEffect || '' : '',
      effectText: newCard.effectText || '',
      abilities: newCard.abilities || [],
      guard: Boolean(newCard.guard),
      isCustom: true,
      imageUrl: newCard.imageUrl,
      createdAt: newCard.createdAt || new Date().toISOString(),
    };

    onAddCard(savedCard);
    setIsManualModalOpen(false);
    setEditingCardId(null);
    setNewCard({
      name: '',
      cardType: 'SIGNI',
      color: 'Red',
      level: 1,
      power: 3000,
      cost: 'Free',
      lifeBurst: false,
      lifeBurstEffect: '',
      effectText: '',
      abilities: [],
      guard: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            WIXOSS Card List
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
              {filteredCards.length} Cards
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Browse official sets and manage custom card creations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4 text-rose-400" /> Custom Card
          </button>

          <button
            onClick={() => {
              if (onBackupAll) {
                onBackupAll();
              } else {
                downloadFullBackup(cards, decks, matchHistory);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 font-bold text-xs border border-emerald-700/80 shadow-md flex items-center gap-2 transition-all"
            title="Export card database and deck data to JSON file"
          >
            <Download className="h-4 w-4 text-emerald-400" /> Backup All
          </button>

          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-sky-400 font-semibold text-xs border border-zinc-700 flex items-center gap-2 transition-colors"
              title="Restore / Import Backups & Manage Data"
            >
              <Database className="h-4 w-4 text-sky-400" /> Restore / Data
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards by name, type (SIGNI, LRIG, Spell), color (Red, Blue, Green...), or effect..."
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-9 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
              title="Clear Search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Colors */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'White', 'Red', 'Blue', 'Green', 'Black', 'Colorless'].map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-xs ${
                  selectedColor === color
                    ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
              >
                {color === 'White' && <span className="h-2 w-2 rounded-full bg-amber-200 border border-amber-400" />}
                {color === 'Red' && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                {color === 'Blue' && <span className="h-2 w-2 rounded-full bg-sky-400" />}
                {color === 'Green' && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                {color === 'Black' && <span className="h-2 w-2 rounded-full bg-purple-500" />}
                {color === 'Colorless' && <span className="h-2 w-2 rounded-full bg-zinc-400" />}
                {color}
              </button>
            ))}
          </div>

          {/* Types & Levels */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1">
              {['All', 'LRIG', 'SIGNI', 'Spell', 'Arts', 'Piece'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedType === t
                      ? 'bg-zinc-200 text-zinc-900 font-bold'
                      : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-750'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-bold uppercase mr-1">Lvl:</span>
              {['All', '0', '1', '2', '3'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                    selectedLevel === lvl
                      ? 'bg-rose-500 text-white'
                      : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles Row */}
        <div className="flex items-center space-x-6 text-xs text-zinc-300 pt-1 border-t border-zinc-800/60">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyBurst}
              onChange={(e) => setOnlyBurst(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
            />
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Zap className="h-3.5 w-3.5" /> Life Burst Only
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyGuard}
              onChange={(e) => setOnlyGuard(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-950 text-sky-400 focus:ring-sky-500 h-3.5 w-3.5"
            />
            <span className="flex items-center gap-1 text-sky-400 font-medium">
              <Shield className="h-3.5 w-3.5" /> Guard Cards Only
            </span>
          </label>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredCards.map((card) => {
          const style = COLOR_CLASSES[card.color] || COLOR_CLASSES.Colorless;

          return (
            <div
              key={card.id}
              onClick={() => setActiveCardModal(card)}
              className={`group relative rounded-2xl border ${style.border} ${style.bg} p-3.5 flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer shadow-md hover:shadow-xl hover:border-zinc-400`}
            >
              {/* Header Badges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                    {card.cardType}{card.cardType.toUpperCase() === 'SPELL' ? '' : ` • Lvl ${card.level}`}
                  </span>

                  <div className="flex items-center space-x-1">
                    {card.lifeBurst && (
                      <span className="p-1 rounded-full bg-amber-500/20 text-amber-300" title="Life Burst">
                        <Zap className="h-3 w-3" />
                      </span>
                    )}
                    {card.guard && (
                      <span className="p-1 rounded-full bg-sky-500/20 text-sky-300" title="Guard SIGNI">
                        <Shield className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Title & Image */}
                <h3 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-rose-400 transition-colors">
                  {card.name}
                </h3>

                {card.signiClass && (
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">[{card.signiClass}]</p>
                )}

                {/* Effect Preview & Ability Badges */}
                <div className="mt-2 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {parseCardAbilities(card).slice(0, 3).map((ab) => (
                      <span
                        key={ab}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getAbilityBadgeStyle(
                          ab
                        )}`}
                      >
                        {ab}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-300/90 line-clamp-2 leading-snug">
                    {card.effectText}
                  </p>
                </div>
              </div>

              {/* Footer Specs */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>{card.power > 0 ? `PWR ${card.power}` : card.cost}</span>
                <div className="flex items-center space-x-1">
                  {card.cardType !== 'LRIG' && card.cardType !== 'Arts' && card.cardType !== 'Piece' && card.lifeBurst && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans font-bold flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5" /> Burst
                    </span>
                  )}
                  {card.isCustom && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-sans font-semibold">
                      Custom
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 text-zinc-500">
          <p className="text-sm font-medium">No cards found matching current filters.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedColor('All');
              setSelectedType('All');
              setOnlyBurst(false);
              setOnlyGuard(false);
            }}
            className="mt-2 text-xs text-rose-400 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Expanded Card View Modal */}
      {activeCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-zinc-900 border-2 border-zinc-800 p-5 sm:p-7 text-zinc-100 shadow-2xl space-y-6 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-extrabold text-xs uppercase tracking-wider font-mono ${
                      COLOR_CLASSES[activeCardModal.color]?.text || 'text-zinc-300'
                    } bg-zinc-950 border border-zinc-800`}
                  >
                    {activeCardModal.color} {activeCardModal.cardType}
                  </span>
                  {activeCardModal.rarity && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-xs">
                      {activeCardModal.rarity}
                    </span>
                  )}
                  {activeCardModal.isCustom && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-sans font-semibold text-xs">
                      Custom Card
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {activeCardModal.name}
                </h3>
              </div>

              <button
                onClick={() => {
                  setActiveCardModal(null);
                  setIsArtworkFullscreen(false);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                title="Close Modal (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: FULL CARD ARTWORK FRAME (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div
                  className={`group relative w-full max-w-[280px] aspect-[1/1.42] rounded-3xl border-4 ${
                    COLOR_CLASSES[activeCardModal.color]?.border || 'border-zinc-700'
                  } bg-gradient-to-b ${
                    activeCardModal.color === 'Red'
                      ? 'from-rose-950 via-zinc-950 to-zinc-950'
                      : activeCardModal.color === 'Blue'
                      ? 'from-sky-950 via-zinc-950 to-zinc-950'
                      : activeCardModal.color === 'Green'
                      ? 'from-emerald-950 via-zinc-950 to-zinc-950'
                      : activeCardModal.color === 'Black'
                      ? 'from-purple-950 via-zinc-950 to-zinc-950'
                      : activeCardModal.color === 'White'
                      ? 'from-amber-950/60 via-zinc-950 to-zinc-950'
                      : 'from-zinc-900 via-zinc-950 to-zinc-950'
                  } p-3 flex flex-col justify-between shadow-2xl overflow-hidden cursor-pointer`}
                  onClick={() => setIsArtworkFullscreen(true)}
                >
                  {/* Card Art Top Header Strip */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 bg-zinc-950/80 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-bold text-zinc-200 uppercase font-mono">
                      {activeCardModal.cardType.toUpperCase() === 'SPELL' ? activeCardModal.cardType : `Lvl ${activeCardModal.level}`}
                    </span>
                    <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">
                      WIXOSS
                    </span>
                    <span className="text-[11px] font-bold text-amber-300 font-mono">
                      {activeCardModal.cost}
                    </span>
                  </div>

                  {/* Artwork Image Container */}
                  <div className="relative my-2 w-full h-full min-h-[190px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center group-hover:brightness-110 transition-all">
                    {activeCardModal.imageUrl ? (
                      <img
                        src={activeCardModal.imageUrl}
                        alt={activeCardModal.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      /* Stylized TCG Card Illustration Frame */
                      <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center space-y-3 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900">
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-lg ${
                            COLOR_CLASSES[activeCardModal.color]?.border || 'border-zinc-700'
                          } ${COLOR_CLASSES[activeCardModal.color]?.bg || 'bg-zinc-900'}`}
                        >
                          {activeCardModal.cardType === 'LRIG' ? (
                            <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
                          ) : activeCardModal.lifeBurst ? (
                            <Zap className="h-8 w-8 text-amber-400" />
                          ) : activeCardModal.guard ? (
                            <Shield className="h-8 w-8 text-sky-400" />
                          ) : (
                            <Layers className="h-8 w-8 text-rose-400" />
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-100 line-clamp-2 px-1">
                            {activeCardModal.name}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                            Official Card Artwork
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Expand Artwork Hover Badge */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white space-y-1">
                      <Maximize2 className="h-6 w-6 text-rose-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Expand Full Artwork
                      </span>
                    </div>
                  </div>

                  {/* Card Art Footer Strip */}
                  <div className="bg-zinc-950/90 p-2 rounded-xl border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono font-bold text-zinc-300">
                    <span className="text-emerald-400">
                      {activeCardModal.power > 0 ? `${activeCardModal.power} PWR` : activeCardModal.cardType}
                    </span>
                    {activeCardModal.lifeBurst && (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                        <Zap className="h-3 w-3" /> Life Burst
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsArtworkFullscreen(true)}
                  className="mt-3 text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> View Full Artwork
                </button>
              </div>

              {/* RIGHT COLUMN: OFFICIAL CARD SPECS & DETAILS (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                {/* Official Specifications Bar */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Official Specifications
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-xs">
                    <div className="p-1">
                      <span className="text-zinc-500 block text-[10px] uppercase">Level</span>
                      <span className="font-extrabold text-white text-base">
                        {activeCardModal.cardType.toUpperCase() === 'SPELL' ? '—' : activeCardModal.level}
                      </span>
                    </div>

                    <div className="p-1 border-l border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase">Power</span>
                      <span className="font-extrabold text-emerald-400 text-base">
                        {activeCardModal.power ? activeCardModal.power : '—'}
                      </span>
                    </div>

                    <div className="p-1 border-l border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase">Cost</span>
                      <span className="font-extrabold text-amber-300 text-xs sm:text-sm line-clamp-1">
                        {activeCardModal.cost}
                      </span>
                    </div>

                    <div className="p-1 border-l border-zinc-800">
                      <span className="text-zinc-500 block text-[10px] uppercase">Color</span>
                      <span
                        className={`font-extrabold text-xs sm:text-sm ${
                          COLOR_CLASSES[activeCardModal.color]?.text || 'text-zinc-200'
                        }`}
                      >
                        {activeCardModal.color}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Classification & Ability Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {activeCardModal.lrigType && (
                    <span className="px-3 py-1 rounded-xl bg-purple-950/60 text-purple-300 border border-purple-800/50 font-bold font-mono">
                      LRIG: {activeCardModal.lrigType}
                    </span>
                  )}

                  {activeCardModal.team && (
                    <span className="px-3 py-1 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 font-bold font-mono">
                      Team: {activeCardModal.team}
                    </span>
                  )}

                  {activeCardModal.signiClass && (
                    <span className="px-3 py-1 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 font-bold font-mono">
                      Class: {activeCardModal.signiClass}
                    </span>
                  )}

                  {parseCardAbilities(activeCardModal).map((ab) => (
                    <span
                      key={ab}
                      className={`px-3 py-1 rounded-xl font-bold border ${getAbilityBadgeStyle(
                        ab
                      )}`}
                    >
                      {ab}
                    </span>
                  ))}
                </div>

                {/* Main Card Ability & Effect */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Card Effect / Ability Text
                  </h4>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap shadow-inner">
                    {activeCardModal.effectText}
                  </div>
                </div>

                {/* Life Burst Effect Box */}
                {activeCardModal.lifeBurstEffect && (
                  <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-2xl text-xs space-y-1 shadow-lg">
                    <span className="text-amber-400 font-extrabold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Zap className="h-4 w-4 text-amber-400" /> Official Life Burst Effect:
                    </span>
                    <p className="text-amber-200/90 leading-relaxed">
                      {activeCardModal.lifeBurstEffect}
                    </p>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const levelStr = activeCardModal.cardType.toUpperCase() === 'SPELL' ? 'N/A' : activeCardModal.level;
                        const fullText = `Official Name: ${activeCardModal.name}\nType: ${activeCardModal.cardType} | Color: ${activeCardModal.color} | Level: ${levelStr}\nCost: ${activeCardModal.cost}\nEffect: ${activeCardModal.effectText}${activeCardModal.lifeBurstEffect ? `\nLife Burst: ${activeCardModal.lifeBurstEffect}` : ''}`;
                        navigator.clipboard.writeText(fullText);
                        setCopiedCardInfo(true);
                        setTimeout(() => setCopiedCardInfo(false), 2000);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedCardInfo ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Info!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-rose-400" /> Copy Official Info
                        </>
                      )}
                    </button>

                    {/* Edit Card / Customize Button */}
                    <button
                      onClick={() => {
                        setEditingCardId(activeCardModal.isCustom ? activeCardModal.id : `custom-${Date.now()}`);
                        setNewCard({
                          ...activeCardModal,
                          abilities: parseCardAbilities(activeCardModal),
                        });
                        setIsManualModalOpen(true);
                        setActiveCardModal(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 text-xs font-semibold border border-purple-700/60 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-purple-300" />
                      {activeCardModal.isCustom ? 'Edit Card & Abilities' : 'Customize / Clone Card'}
                    </button>

                    {/* Quick Remove Life Burst Button if card has burst */}
                    {activeCardModal.lifeBurst && (
                      <button
                        onClick={() => {
                          const updated = {
                            ...activeCardModal,
                            lifeBurst: false,
                            lifeBurstEffect: '',
                            abilities: (activeCardModal.abilities || []).filter((a) => a !== '[Life Burst]'),
                          };
                          onAddCard(updated);
                          setActiveCardModal(updated);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 text-xs font-semibold border border-amber-700/60 flex items-center gap-1.5 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5 text-amber-400" /> Remove Life Burst
                      </button>
                    )}

                    {activeCardModal.isCustom && (
                      <button
                        onClick={() => {
                          onDeleteCard(activeCardModal.id);
                          setActiveCardModal(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-semibold border border-red-800/60 flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Custom Card
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActiveCardModal(null);
                      setIsArtworkFullscreen(false);
                    }}
                    className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Card Artwork Zoom Overlay */}
      {isArtworkFullscreen && activeCardModal && (
        <div
          onClick={() => setIsArtworkFullscreen(false)}
          className="fixed inset-0 z-[60] bg-black/95 p-4 flex flex-col items-center justify-center backdrop-blur-lg animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-md w-full p-4 flex flex-col items-center text-center space-y-4">
            <button
              onClick={() => setIsArtworkFullscreen(false)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
            >
              <X className="h-6 w-6" />
            </button>

            <div
              className={`w-full max-w-[340px] aspect-[1/1.42] rounded-3xl border-4 ${
                COLOR_CLASSES[activeCardModal.color]?.border || 'border-zinc-700'
              } bg-zinc-950 p-4 flex flex-col justify-between shadow-2xl overflow-hidden`}
            >
              {activeCardModal.imageUrl ? (
                <img
                  src={activeCardModal.imageUrl}
                  alt={activeCardModal.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center space-y-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 rounded-2xl border border-zinc-800">
                  <div
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 shadow-2xl ${
                      COLOR_CLASSES[activeCardModal.color]?.border || 'border-zinc-700'
                    } ${COLOR_CLASSES[activeCardModal.color]?.bg || 'bg-zinc-900'}`}
                  >
                    <Sparkles className="h-10 w-10 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {activeCardModal.name}
                    </h3>
                    <p className="text-xs text-rose-400 font-mono mt-1">
                      {activeCardModal.color} {activeCardModal.cardType}{activeCardModal.cardType.toUpperCase() === 'SPELL' ? '' : ` • Lvl ${activeCardModal.level}`}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed italic max-w-xs">
                    "{activeCardModal.effectText}"
                  </p>
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-400 font-mono">
              Click anywhere or press Esc to exit artwork preview
            </div>
          </div>
        </div>
      )}

      {/* Manual Custom Card Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingCardId ? (
                <>
                  <Edit3 className="h-5 w-5 text-purple-400" /> Edit / Customize WIXOSS Card
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-rose-500" /> Create Custom WIXOSS Card
                </>
              )}
            </h3>

            <form onSubmit={handleSaveManualCard} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Card Name</label>
                <input
                  type="text"
                  required
                  value={newCard.name || ''}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="e.g. Code Heart Flame"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Quick Ability Tag Selection */}
              <div>
                <label className="block text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Card Abilities & Keywords</span>
                  <span className="text-[10px] text-zinc-500">Click to add to effect</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                  {[
                    '[Enter]',
                    '[Const]',
                    '[Action]',
                    '[Auto]',
                    '[Team Action]',
                    '[Team Enter]',
                    '[Team Const]',
                    '[Team Auto]',
                    '[Shadow]',
                    '[Lancer]',
                    '[Double Crash]',
                    '[Assassin]',
                    '[Multi Ener]',
                    '[S Lancer]',
                    '[Guard]',
                    '[Center LRIG]',
                    '[Assist LRIG]',
                    '[Arts]',
                    '[SIGNI]',
                    '[Spell]',
                    '[PIECE]',
                  ].map((tag) => {
                    const active = (newCard.abilities || []).includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleAbilityTag(tag)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          active
                            ? getAbilityBadgeStyle(tag)
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {active ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Card Type</label>
                  <select
                    value={newCard.cardType}
                    onChange={(e) => setNewCard({ ...newCard, cardType: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="LRIG">LRIG</option>
                    <option value="SIGNI">SIGNI</option>
                    <option value="Spell">Spell</option>
                    <option value="Arts">Arts</option>
                    <option value="Piece">Piece</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Color</label>
                  <select
                    value={newCard.color}
                    onChange={(e) => setNewCard({ ...newCard, color: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                    <option value="Green">Green</option>
                    <option value="Black">Black</option>
                    <option value="White">White</option>
                    <option value="Colorless">Colorless</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Level</label>
                  {newCard.cardType?.toUpperCase() === 'SPELL' ? (
                    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-500 font-mono text-xs">
                      N/A (Spell)
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={newCard.level ?? 0}
                      onChange={(e) => setNewCard({ ...newCard, level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">SIGNI Power</label>
                  <input
                    type="number"
                    step={1000}
                    value={newCard.power}
                    onChange={(e) => setNewCard({ ...newCard, power: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2 pt-1">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      disabled={newCard.cardType === 'LRIG' || newCard.cardType === 'Arts' || newCard.cardType === 'Piece'}
                      checked={Boolean(newCard.lifeBurst) && newCard.cardType !== 'LRIG' && newCard.cardType !== 'Arts' && newCard.cardType !== 'Piece'}
                      onChange={(e) => handleLifeBurstToggle(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-950 text-rose-600 focus:ring-rose-500 disabled:opacity-40"
                    />
                    <span className={`text-xs ${newCard.cardType === 'LRIG' || newCard.cardType === 'Arts' || newCard.cardType === 'Piece' ? 'text-zinc-600' : 'text-amber-300 font-semibold flex items-center gap-1'}`}>
                      <Zap className="h-3.5 w-3.5 text-amber-400" /> Has Life Burst
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={Boolean(newCard.guard)}
                      onChange={(e) => setNewCard({ ...newCard, guard: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-950 text-sky-400 focus:ring-sky-500"
                    />
                    <span className="text-xs text-sky-300 font-semibold flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-sky-400" /> Is Guard
                    </span>
                  </label>
                </div>

                {newCard.cardType === 'LRIG' || newCard.cardType === 'Arts' || newCard.cardType === 'Piece' ? (
                  <p className="text-[10px] text-zinc-500 italic">
                    Note: According to WIXOSS rules, Life Burst is only permitted on Main Deck cards (SIGNI & Spells).
                  </p>
                ) : null}
              </div>

              {newCard.lifeBurst && newCard.cardType !== 'LRIG' && newCard.cardType !== 'Arts' && newCard.cardType !== 'Piece' && (
                <div>
                  <label className="block text-amber-300 text-xs font-semibold mb-1">Life Burst Effect Text</label>
                  <input
                    type="text"
                    value={newCard.lifeBurstEffect || ''}
                    onChange={(e) => setNewCard({ ...newCard, lifeBurstEffect: e.target.value })}
                    placeholder="[Life Burst] Banish 1 target SIGNI / Draw 1 card..."
                    className="w-full bg-amber-950/20 border border-amber-800/40 rounded-lg p-2 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1">Effect Description</label>
                <textarea
                  value={newCard.effectText || ''}
                  onChange={(e) => setNewCard({ ...newCard, effectText: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  {editingCardId ? 'Save Card Changes' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
