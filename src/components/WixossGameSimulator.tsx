import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, SigniSlot, CardInstance, PlayerGameState } from '../types/game';
import { WixossCard } from '../types/wixoss';
import { PhaseIndicator } from './PhaseIndicator';
import { BattleDebugModal } from './BattleDebugModal';
import {
  advancePhase,
  playSigni,
  chargeEner,
  growLrig,
  determineLrigZone,
  executeAttack,
  processAiTurn,
  setGameLifeBurstRule,
  triggerManualLifeBurst,
  playPieceCard,
  performMulligan,
  drawManualCard,
  cloneGameState,
  pushHistory,
  banishTargetSigni,
  bounceTargetSigniToHand,
  toggleTargetSigniState,
  modifyTargetSigniPower,
  moveTopDeckToHand,
  moveTopDeckToEner,
  moveTopDeckToTrash,
  moveTopDeckToLifeCloth,
} from '../utils/gameEngine';
import { LifeBurstFormat } from '../types/wixoss';
import { MatchRecord } from '../types/history';
import {
  Shield,
  Zap,
  Sword,
  RotateCcw,
  Bot,
  Users,
  Eye,
  EyeOff,
  Flame,
  Award,
  ChevronRight,
  Info,
  Keyboard,
  HelpCircle,
  X,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Clock,
  ListFilter,
  Target,
  Layers,
  ArrowRightLeft,
  Plus,
  Minus,
} from 'lucide-react';

interface WixossGameSimulatorProps {
  initialState: GameState;
  onExitGame: () => void;
  onRecordMatchResult?: (record: MatchRecord) => void;
}

interface LrigAbilityStatusBadgesProps {
  cardInstance: CardInstance | null;
  playerId: 1 | 2;
  zoneKey?: 'center' | 'assistLeft' | 'assistRight';
  isInteractive?: boolean;
  onToggleAbility?: (
    playerId: 1 | 2,
    zoneKey: 'center' | 'assistLeft' | 'assistRight',
    abilityType: 'enter' | 'auto' | 'action'
  ) => void;
  compact?: boolean;
}

export const LrigAbilityStatusBadges: React.FC<LrigAbilityStatusBadgesProps> = ({
  cardInstance,
  playerId,
  zoneKey = 'center',
  isInteractive = true,
  onToggleAbility,
  compact = false,
}) => {
  if (!cardInstance || !cardInstance.card) return null;

  const effectText = cardInstance.card.effectText || '';
  const hasEnter = /\[enter\]/i.test(effectText);
  const hasAuto = /\[auto\]/i.test(effectText);
  const hasConst = /\[const\]/i.test(effectText);
  const hasAction = /\[(?:team action|action|game 1)\]/i.test(effectText);

  if (!hasEnter && !hasAuto && !hasConst && !hasAction) return null;

  const used = cardInstance.usedAbilities || {};

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1 mt-1.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
      {/* ENTER ABILITY BADGE */}
      {hasEnter && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive && onToggleAbility) {
              onToggleAbility(playerId, zoneKey, 'enter');
            }
          }}
          disabled={!isInteractive}
          title={
            used.enterUsed
              ? '[Enter] Ability used. Click to reset to Ready.'
              : '[Enter] Ability is READY! Click to trigger or mark as used.'
          }
          className={`px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 border transition-all ${
            used.enterUsed
              ? 'bg-zinc-800/90 text-amber-200/60 border-zinc-700/80 hover:bg-zinc-800'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/35 shadow-sm animate-pulse'
          }`}
        >
          {used.enterUsed ? (
            <>
              <Check className="h-2.5 w-2.5 text-zinc-400" />
              <span>[Enter] Used</span>
            </>
          ) : (
            <>
              <Sparkles className="h-2.5 w-2.5 text-amber-400" />
              <span>[Enter] Ready</span>
            </>
          )}
        </button>
      )}

      {/* AUTO ABILITY BADGE */}
      {hasAuto && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive && onToggleAbility) {
              onToggleAbility(playerId, zoneKey, 'auto');
            }
          }}
          disabled={!isInteractive}
          title={
            used.autoTriggered
              ? '[Auto] Ability triggered. Click to reset to Active.'
              : '[Auto] Ability active (listening for triggers). Click to trigger.'
          }
          className={`px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 border transition-all ${
            used.autoTriggered
              ? 'bg-sky-950/80 text-sky-200 border-sky-600 hover:bg-sky-900/60'
              : 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/35'
          }`}
        >
          <Zap className="h-2.5 w-2.5 text-sky-400" />
          <span>{used.autoTriggered ? '[Auto] Triggered' : '[Auto] Active'}</span>
        </button>
      )}

      {/* CONST ABILITY BADGE */}
      {hasConst && (
        <div
          title="[Const] Ability is continuously active while LRIG is on field."
          className="px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 border bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
        >
          <Shield className="h-2.5 w-2.5 text-emerald-400" />
          <span>[Const] Active</span>
        </div>
      )}

      {/* ACTION ABILITY BADGE */}
      {hasAction && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isInteractive && onToggleAbility) {
              onToggleAbility(playerId, zoneKey, 'action');
            }
          }}
          disabled={!isInteractive}
          title={
            used.actionUsed
              ? '[Action] Ability used this turn. Click to reset to Ready.'
              : '[Action] Ability is READY! Click to execute.'
          }
          className={`px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 border transition-all ${
            used.actionUsed
              ? 'bg-zinc-800/90 text-purple-200/60 border-zinc-700/80 hover:bg-zinc-800'
              : 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/35 shadow-sm animate-pulse'
          }`}
        >
          {used.actionUsed ? (
            <>
              <Check className="h-2.5 w-2.5 text-zinc-400" />
              <span>[Action] Used</span>
            </>
          ) : (
            <>
              <Flame className="h-2.5 w-2.5 text-purple-400" />
              <span>[Action] Ready</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

interface LifeClothZoneProps {
  player: PlayerGameState;
  colorTheme: 'sky' | 'rose';
  onInspect: () => void;
  isDamageFlashing?: boolean;
}

export const LifeClothZoneAnimated: React.FC<LifeClothZoneProps> = ({
  player,
  colorTheme,
  onInspect,
  isDamageFlashing = false,
}) => {
  const maxLife = 7;
  const isSky = colorTheme === 'sky';

  return (
    <div
      className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 overflow-hidden ${
        isDamageFlashing
          ? 'bg-red-950/90 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] ring-2 ring-red-500/60 animate-pulse'
          : isSky
          ? 'bg-zinc-950/90 border-sky-900/40 text-xs hover:border-sky-700/60'
          : 'bg-zinc-950/90 border-rose-900/40 text-xs hover:border-rose-700/60'
      }`}
    >
      {/* Damage Flash Shockwave Overlay */}
      <AnimatePresence>
        {isDamageFlashing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0.9, 0.4, 0.9, 0], scale: [1, 1.03, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600/40 via-amber-500/30 to-red-600/40 pointer-events-none z-10 border-2 border-red-500/80"
          />
        )}
      </AnimatePresence>

      <div className="flex items-center space-x-2 z-20">
        <div
          className={`p-1.5 rounded-lg transition-transform ${
            isDamageFlashing
              ? 'bg-red-600 text-white animate-bounce shadow-md shadow-red-500/50'
              : isSky
              ? 'bg-sky-950 border border-sky-800/60 text-sky-400'
              : 'bg-rose-950 border border-rose-800/60 text-rose-400'
          }`}
        >
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                isDamageFlashing
                  ? 'text-red-200 animate-pulse'
                  : isSky
                  ? 'text-sky-300'
                  : 'text-rose-300'
              }`}
            >
              Life Cloth ({player.lifeCloth.length} / {maxLife})
            </span>
            {isDamageFlashing && (
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-amber-200 text-[9px] font-mono font-bold animate-ping shadow">
                DAMAGE!
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 font-mono block">
            Click zone to inspect shields
          </span>
        </div>
      </div>

      {/* Cards Row with AnimatePresence */}
      <div
        className="flex items-center space-x-1.5 cursor-pointer z-20"
        onClick={onInspect}
        title="Click to inspect Life Cloth cards stack"
      >
        {Array.from({ length: maxLife }).map((_, i) => {
          const isPresent = i < player.lifeCloth.length;
          const cardInCloth = player.lifeCloth[i];
          const slotKey = `slot-${player.id}-${i}`;

          return (
            <div key={slotKey} className="relative w-6 h-9 flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                {isPresent ? (
                  <motion.div
                    key={`cloth-card-${player.id}-${cardInCloth?.id || i}`}
                    initial={{ scale: 0.8, opacity: 0, y: -10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{
                      scale: [1, 1.35, 0.3],
                      opacity: [1, 0.95, 0],
                      y: [0, -25, -45],
                      rotate: [0, i % 2 === 0 ? -22 : 22, i % 2 === 0 ? -40 : 40],
                      filter: 'brightness(2.5) contrast(1.5)',
                      transition: { duration: 0.7, ease: 'easeOut' },
                    }}
                    whileHover={{ scale: 1.18, y: -3 }}
                    className={`absolute inset-0 rounded-md border flex flex-col items-center justify-between p-0.5 shadow-md transition-shadow cursor-pointer ${
                      isSky
                        ? 'bg-gradient-to-b from-sky-900/90 via-sky-950 to-zinc-950 border-sky-400/80 shadow-sky-500/30 text-sky-200 hover:border-sky-300'
                        : 'bg-gradient-to-b from-rose-900/90 via-rose-950 to-zinc-950 border-rose-400/80 shadow-rose-500/30 text-rose-200 hover:border-rose-300'
                    }`}
                  >
                    {/* Top Shield Index */}
                    <div className="flex items-center justify-between w-full px-0.5">
                      <Shield className={`h-2 w-2 ${isSky ? 'text-sky-300' : 'text-rose-300'}`} />
                      <span className="text-[8px] font-mono font-black opacity-90">{i + 1}</span>
                    </div>

                    {/* Card Back / Core Graphic */}
                    <div className="w-full flex-1 my-0.5 rounded-[2px] bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSky ? 'bg-sky-400/70' : 'bg-rose-400/70'}`} />
                    </div>

                    {/* Bottom Label */}
                    <span className="text-[7px] font-mono font-extrabold uppercase tracking-tighter opacity-80">
                      LC
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-slot-${player.id}-${i}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-md border border-zinc-800 bg-zinc-900/60 flex items-center justify-center text-zinc-600 shadow-inner"
                  >
                    <span className="text-[9px] font-mono font-bold opacity-50">✕</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DIVA_PLAYMAT_URL =
  'https://static.wikia.nocookie.net/selector-wixoss/images/7/76/Diva_selection_playmat.png/revision/latest/scale-to-width-down/1000?cb=20201220101512';

export const WixossGameSimulator: React.FC<WixossGameSimulatorProps> = ({
  initialState,
  onExitGame,
  onRecordMatchResult,
}) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [hideHandForHotseat, setHideHandForHotseat] = useState<boolean>(false);
  const [selectedCardForAction, setSelectedCardForAction] = useState<WixossCard | null>(null);
  const [selectedMulliganCardIds, setSelectedMulliganCardIds] = useState<string[]>([]);
  const [showControlsTooltip, setShowControlsTooltip] = useState<boolean>(false);
  const [showPlaymatModal, setShowPlaymatModal] = useState<boolean>(false);
  const [hasRecordedMatch, setHasRecordedMatch] = useState<boolean>(false);

  // Life Cloth change tracking for visual damage feedback animations
  const [p1LifeCount, setP1LifeCount] = useState<number>(initialState.player1.lifeCloth.length);
  const [p2LifeCount, setP2LifeCount] = useState<number>(initialState.player2.lifeCloth.length);
  const [p1DamageFlash, setP1DamageFlash] = useState<boolean>(false);
  const [p2DamageFlash, setP2DamageFlash] = useState<boolean>(false);
  const [damageNotice, setDamageNotice] = useState<{
    playerId: 1 | 2;
    amount: number;
    key: number;
  } | null>(null);

  useEffect(() => {
    const currentP1Life = gameState.player1.lifeCloth.length;
    const currentP2Life = gameState.player2.lifeCloth.length;

    if (currentP1Life < p1LifeCount) {
      const lost = p1LifeCount - currentP1Life;
      setP1DamageFlash(true);
      setDamageNotice({ playerId: 1, amount: lost, key: Date.now() });
      const timer = setTimeout(() => {
        setP1DamageFlash(false);
      }, 1500);
      setP1LifeCount(currentP1Life);
      return () => clearTimeout(timer);
    } else if (currentP1Life > p1LifeCount) {
      setP1LifeCount(currentP1Life);
    }

    if (currentP2Life < p2LifeCount) {
      const lost = p2LifeCount - currentP2Life;
      setP2DamageFlash(true);
      setDamageNotice({ playerId: 2, amount: lost, key: Date.now() });
      const timer = setTimeout(() => {
        setP2DamageFlash(false);
      }, 1500);
      setP2LifeCount(currentP2Life);
      return () => clearTimeout(timer);
    } else if (currentP2Life > p2LifeCount) {
      setP2LifeCount(currentP2Life);
    }
  }, [gameState.player1.lifeCloth.length, gameState.player2.lifeCloth.length, p1LifeCount, p2LifeCount]);

  // Auto-record match history when a winner is declared
  useEffect(() => {
    if (gameState.winner !== null && !hasRecordedMatch && onRecordMatchResult) {
      const winnerP = gameState.winner === 1 ? gameState.player1 : gameState.player2;
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - (gameState.startTime || Date.now())) / 1000)
      );

      const matchRecord: MatchRecord = {
        id: `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: new Date().toISOString(),
        gameMode: gameState.mode,
        lifeBurstRule: gameState.lifeBurstRule || 'standard',
        durationSeconds,
        turnsCount: gameState.turn,
        winnerId: gameState.winner,
        winnerName: winnerP.name,
        player1: {
          id: 1,
          name: gameState.player1.name,
          deckId: gameState.player1.deck.id,
          deckName: gameState.player1.deck.name,
          deckColor: gameState.player1.deck.color,
          remainingLifeCloth: gameState.player1.lifeCloth.length,
        },
        player2: {
          id: 2,
          name: gameState.player2.name,
          deckId: gameState.player2.deck.id,
          deckName: gameState.player2.deck.name,
          deckColor: gameState.player2.deck.color,
          remainingLifeCloth: gameState.player2.lifeCloth.length,
        },
        notes: `Game completed on turn ${gameState.turn}. Winner: ${winnerP.name}.`,
      };

      onRecordMatchResult(matchRecord);
      setHasRecordedMatch(true);
    }
  }, [gameState, hasRecordedMatch, onRecordMatchResult]);

  // Battle Inspector & Debugger modal state
  const [isBattleDebugOpen, setIsBattleDebugOpen] = useState<boolean>(false);

  // Target SIGNI and Top-of-Deck Action Modal state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [targetModalTab, setTargetModalTab] = useState<'signi' | 'deck'>('signi');
  const [selectedTargets, setSelectedTargets] = useState<
    Array<{ playerId: 1 | 2; slot: SigniSlot }>
  >([]);
  const [deckActionCount, setDeckActionCount] = useState<number>(1);
  const [peekedDeckCards, setPeekedDeckCards] = useState<WixossCard[] | null>(null);

  // Log Panel filters & search
  const [logFilter, setLogFilter] = useState<'all' | 'phase' | 'attack' | 'action' | 'burst'>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [logCopied, setLogCopied] = useState<boolean>(false);

  // Modals for inspecting Ener, Trash, Check Zone, or Life Cloth
  const [inspectZone, setInspectZone] = useState<{
    player: 1 | 2;
    type: 'ener' | 'trash' | 'lrigDeck' | 'checkZone' | 'lifeCloth';
  } | null>(null);

  const activeP = gameState.activePlayer === 1 ? gameState.player1 : gameState.player2;
  const oppP = gameState.activePlayer === 1 ? gameState.player2 : gameState.player1;

  // Targeting Helper Handlers
  const toggleTargetSlot = (playerId: 1 | 2, slot: SigniSlot) => {
    setSelectedTargets((prev) => {
      const exists = prev.some((t) => t.playerId === playerId && t.slot === slot);
      if (exists) {
        return prev.filter((t) => !(t.playerId === playerId && t.slot === slot));
      } else {
        return [...prev, { playerId, slot }];
      }
    });
  };

  const handleBanishTargets = () => {
    let next = cloneGameState(gameState);
    selectedTargets.forEach((t) => {
      next = banishTargetSigni(next, t.playerId, t.slot, activeP.id);
    });
    setGameState(next);
    setSelectedTargets([]);
  };

  const handleBounceTargets = () => {
    let next = cloneGameState(gameState);
    selectedTargets.forEach((t) => {
      next = bounceTargetSigniToHand(next, t.playerId, t.slot, activeP.id);
    });
    setGameState(next);
    setSelectedTargets([]);
  };

  const handleToggleStateTargets = (action: 'down' | 'up') => {
    let next = cloneGameState(gameState);
    selectedTargets.forEach((t) => {
      next = toggleTargetSigniState(next, t.playerId, t.slot, action, activeP.id);
    });
    setGameState(next);
    setSelectedTargets([]);
  };

  const handleModifyPowerTargets = (powerDelta: number) => {
    let next = cloneGameState(gameState);
    selectedTargets.forEach((t) => {
      next = modifyTargetSigniPower(next, t.playerId, t.slot, powerDelta, activeP.id);
    });
    setGameState(next);
    setSelectedTargets([]);
  };

  const handleMoveTopDeckToHand = (count: number) => {
    const next = moveTopDeckToHand(gameState, activeP.id, count);
    setGameState(next);
  };

  const handleMoveTopDeckToEner = (count: number) => {
    const next = moveTopDeckToEner(gameState, activeP.id, count);
    setGameState(next);
  };

  const handleMoveTopDeckToTrash = (count: number) => {
    const next = moveTopDeckToTrash(gameState, activeP.id, count);
    setGameState(next);
  };

  const handleMoveTopDeckToLifeCloth = (count: number) => {
    const next = moveTopDeckToLifeCloth(gameState, activeP.id, count);
    setGameState(next);
  };

  const handleNextPhase = () => {
    let next = advancePhase(gameState);

    // If game mode is Solitaire AI and it's AI turn (Player 2)
    if (next.activePlayer === 2 && next.mode === 'solitaire_ai' && next.winner === null) {
      setTimeout(() => {
        const aiProcessed = processAiTurn(next);
        setGameState(aiProcessed);
      }, 500);
    } else {
      setGameState(next);
    }
  };

  const handleUndo = () => {
    if (gameState.history && gameState.history.length > 0) {
      const [prev, ...remainingHistory] = gameState.history;
      setGameState({
        ...prev,
        history: remainingHistory,
      });
    }
  };

  const handleToggleLrigAbility = (
    playerId: 1 | 2,
    zoneKey: 'center' | 'assistLeft' | 'assistRight',
    abilityType: 'enter' | 'auto' | 'action'
  ) => {
    setGameState((prev) => {
      const next: GameState = cloneGameState(prev);
      next.history = pushHistory(prev);

      const player = playerId === 1 ? next.player1 : next.player2;
      const lrigInstance = player.lrigZone[zoneKey];
      if (!lrigInstance) return prev;

      if (!lrigInstance.usedAbilities) {
        lrigInstance.usedAbilities = {};
      }

      const card = lrigInstance.card;
      let logMsg = '';

      if (abilityType === 'enter') {
        const isUsed = !lrigInstance.usedAbilities.enterUsed;
        lrigInstance.usedAbilities.enterUsed = isUsed;
        logMsg = isUsed
          ? `✨ ${player.name}'s LRIG "${card.name}" activated [Enter] ability!`
          : `🔄 ${player.name}'s LRIG "${card.name}" reset [Enter] ability status to Ready.`;
      } else if (abilityType === 'auto') {
        const isTrig = !lrigInstance.usedAbilities.autoTriggered;
        lrigInstance.usedAbilities.autoTriggered = isTrig;
        logMsg = isTrig
          ? `⚡ ${player.name}'s LRIG "${card.name}" triggered [Auto] ability!`
          : `📡 ${player.name}'s LRIG "${card.name}" reset [Auto] ability status to Active.`;
      } else if (abilityType === 'action') {
        const isUsed = !lrigInstance.usedAbilities.actionUsed;
        lrigInstance.usedAbilities.actionUsed = isUsed;
        logMsg = isUsed
          ? `💥 ${player.name}'s LRIG "${card.name}" executed [Action] ability!`
          : `🔄 ${player.name}'s LRIG "${card.name}" reset [Action] ability status to Ready.`;
      }

      if (logMsg) {
        next.log.unshift({
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          playerId,
          message: logMsg,
          type: 'action',
        });
      }

      return next;
    });
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState.winner === null) {
          handleNextPhase();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (gameState.phase === 'MULLIGAN') {
          const next = performMulligan(gameState, activeP.id, selectedMulliganCardIds);
          setGameState(next);
          setSelectedMulliganCardIds([]);
        }
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (gameState.winner === null) {
          const next = drawManualCard(gameState, activeP.id);
          setGameState(next);
        }
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowControlsTooltip((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSelectedCardForAction(null);
        setSelectedMulliganCardIds([]);
        setInspectZone(null);
        setShowControlsTooltip(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeP, selectedMulliganCardIds]);

  const handlePlaySigniToSlot = (slot: SigniSlot) => {
    if (!selectedCardForAction) return;
    const next = playSigni(gameState, selectedCardForAction.id, slot);
    setGameState(next);
    setSelectedCardForAction(null);
  };

  const handleChargeSelectedToEner = () => {
    if (!selectedCardForAction) return;
    const next = chargeEner(gameState, selectedCardForAction.id);
    setGameState(next);
    setSelectedCardForAction(null);
  };

  const handleGrowLrig = (
    lrigCardId: string,
    targetZone?: 'center' | 'assistLeft' | 'assistRight',
    growingPlayerId?: number
  ) => {
    const next = growLrig(gameState, lrigCardId, targetZone, growingPlayerId);
    setGameState(next);
  };

  const handleDeclareAttack = (slot: SigniSlot | 'lrig') => {
    const next = executeAttack(gameState, slot);
    setGameState(next);
  };

  return (
    <div className="flex flex-col h-full min-h-[85vh] bg-zinc-950 text-zinc-100 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
      {/* Simulator Top Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              WIXOSS Local Arena
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                Turn {gameState.turn}
              </span>
            </h2>
          </div>

          <div className="hidden sm:flex items-center space-x-1 font-mono text-zinc-400">
            <span>Mode:</span>
            <span className="text-rose-400 font-semibold uppercase">{gameState.mode}</span>
          </div>
        </div>

        {/* Compact Phase Indicator Bar */}
        <PhaseIndicator
          currentPhase={gameState.phase}
          turnNumber={gameState.turn}
          activePlayerName={activeP.name}
          activePlayerId={activeP.id}
          compactHeaderOnly
        />

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Life Burst Mode Badge */}
          <div className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-rose-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            🎯 Standard Burst
          </div>

          <button
            onClick={() => setIsBattleDebugOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-950 to-zinc-800 hover:brightness-110 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Inspect 3-lane combat predictions, power calculations, and test battle rules"
          >
            <Sword className="h-3.5 w-3.5 text-rose-400" />
            <span>Debug Battle</span>
          </button>

          <button
            onClick={() => setShowPlaymatModal(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-amber-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="View Official Diva Selection Playmat Diagram"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Playmat</span>
          </button>

          {gameState.mode === 'hotseat' && (
            <button
              onClick={() => setHideHandForHotseat(!hideHandForHotseat)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 flex items-center gap-1.5 text-xs font-semibold"
            >
              {hideHandForHotseat ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {hideHandForHotseat ? 'Show Hand' : 'Shield Hand'}
            </button>
          )}

          <button
            onClick={() => setShowControlsTooltip((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showControlsTooltip
                ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
            }`}
            title="Keyboard Shortcuts & Controls (Hotkey: ? or H)"
          >
            <Keyboard className="h-3.5 w-3.5 text-rose-400" />
            <span>Controls</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={!gameState.history || gameState.history.length === 0}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 disabled:opacity-40 text-zinc-300 flex items-center gap-1.5 text-xs font-semibold"
            title="Undo Last Action (Hotkey: U)"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>

          <button
            onClick={onExitGame}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/50 text-red-300 text-xs font-semibold"
          >
            Exit Game
          </button>
        </div>
      </div>

      {/* Main Game Layout (Split into Playfield & Log Drawer) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Playfield Area with Official Diva Selection Playmat background */}
        <div
          className="lg:col-span-9 p-4 flex flex-col justify-between space-y-4 overflow-y-auto relative rounded-3xl border border-zinc-800 shadow-2xl bg-zinc-950/90 bg-cover bg-center bg-no-repeat transition-all"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(9, 9, 11, 0.85), rgba(9, 9, 11, 0.80)), url('${DIVA_PLAYMAT_URL}')`,
          }}
        >
          {/* DEDICATED VISUAL PHASE INDICATOR BANNER & STEPPER */}
          <PhaseIndicator
            currentPhase={gameState.phase}
            turnNumber={gameState.turn}
            activePlayerName={activeP.name}
            activePlayerId={activeP.id}
            onAdvancePhase={handleNextPhase}
            onOpenBattleDebug={() => setIsBattleDebugOpen(true)}
            isWinnerDeclared={gameState.winner !== null}
          />

          {/* MULLIGAN PHASE INTERACTIVE PANEL */}
          {gameState.phase === 'MULLIGAN' && (
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-rose-500/60 p-6 rounded-3xl shadow-2xl space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider font-mono">
                      Mulligan Phase
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {gameState.mode === 'solitaire_ai' ? 'Solo Match' : 'Local Multiplayer'}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2">
                    🃏 Opening Hand Selection — {activeP.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select cards from your opening hand to discard and redraw. Returned cards will be shuffled into your main deck, ensuring exact card count validation (5 Hand / 7 Life Cloth).
                  </p>
                </div>

                <div className="flex items-center space-x-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800 shrink-0 text-xs font-mono">
                  <div className="text-center px-2">
                    <span className="text-zinc-500 text-[10px] uppercase block">Hand Size</span>
                    <span className="font-bold text-rose-400 text-sm">{activeP.hand.length}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-800" />
                  <div className="text-center px-2">
                    <span className="text-zinc-500 text-[10px] uppercase block">Main Deck</span>
                    <span className="font-bold text-emerald-400 text-sm">{activeP.mainDeck.length}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-800" />
                  <div className="text-center px-2">
                    <span className="text-zinc-500 text-[10px] uppercase block">Life Cloth</span>
                    <span className="font-bold text-amber-400 text-sm">{activeP.lifeCloth.length}</span>
                  </div>
                </div>
              </div>

              {/* Opening Hand Cards Selection Grid */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                  <span className="text-zinc-300 uppercase tracking-wider text-[11px]">
                    Click Cards to Mark for Discard ({selectedMulliganCardIds.length} / {activeP.hand.length} selected)
                  </span>
                  {selectedMulliganCardIds.length > 0 && (
                    <button
                      onClick={() => setSelectedMulliganCardIds([])}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {activeP.hand.map((card, idx) => {
                    const isSelected = selectedMulliganCardIds.includes(card.id);
                    return (
                      <div
                        key={`${card.id}-${idx}`}
                        onClick={() => {
                          setSelectedMulliganCardIds((prev) =>
                            prev.includes(card.id)
                              ? prev.filter((id) => id !== card.id)
                              : [...prev, card.id]
                          );
                        }}
                        className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between min-h-[170px] ${
                          isSelected
                            ? 'border-rose-500 bg-rose-950/60 ring-2 ring-rose-500 scale-105 shadow-lg shadow-rose-950/80'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/80'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-2.5 -right-2.5 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-md border border-rose-400">
                            DISCARD
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold">
                            <span className="text-rose-400 font-mono">
                              {card.cardType.toUpperCase() === 'SPELL' ? '' : `Lvl ${card.level}`}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[9px]">
                              {card.cardType}
                            </span>
                          </div>
                          <h4 className="font-bold text-zinc-100 text-xs line-clamp-1">{card.name}</h4>
                          <p className="text-[10px] text-zinc-400 line-clamp-3 mt-1 leading-tight">
                            {card.effectText}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="font-mono font-semibold">
                            {card.power > 0 ? `${card.power} PWR` : card.cost || 'Spell'}
                          </span>
                          {card.lifeBurst && <Zap className="h-3 w-3 text-amber-400" title="Life Burst" />}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isSelected ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isSelected ? 'Redrawing' : 'Keep'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                <div className="flex items-center space-x-2 text-xs text-zinc-400">
                  <Info className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>
                    Rules engine automatically validates 5 hand cards and shuffles deck.
                  </span>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {selectedMulliganCardIds.length === 0 ? (
                    <button
                      onClick={() => {
                        const next = performMulligan(gameState, activeP.id, []);
                        setGameState(next);
                        setSelectedMulliganCardIds([]);
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>✓ Keep Opening Hand ({activeP.hand.length} Cards)</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono font-normal">
                        M
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const next = performMulligan(gameState, activeP.id, selectedMulliganCardIds);
                        setGameState(next);
                        setSelectedMulliganCardIds([]);
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 animate-pulse"
                    >
                      <span>🔄 Discard {selectedMulliganCardIds.length} & Redraw (Shuffle Deck)</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono font-normal">
                        M
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Turn 1 Attack Phase Restrictions Banner for 1st Player */}
          {gameState.phase === 'ATTACK' && gameState.turn === 1 && activeP.id === 1 && (
            <div className="bg-amber-950/80 border border-amber-500/50 text-amber-200 p-3 rounded-2xl text-xs font-semibold shadow flex items-center gap-2">
              <Sword className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>1st Player Turn 1 Restriction:</strong> Player 1 (going 1st) cannot attack on Turn 1 according to official WIXOSS rules. Proceed to End Phase / Next Turn! (Player 2 going 2nd CAN attack on Turn 1).
              </span>
            </div>
          )}
          {gameState.winner !== null && (
            <div className="bg-gradient-to-r from-amber-500 via-rose-600 to-amber-500 text-white p-4 rounded-2xl text-center font-bold text-lg shadow-xl animate-bounce flex items-center justify-center gap-2">
              <Award className="h-6 w-6" /> VICTORY! {gameState.winner === 1 ? gameState.player1.name : gameState.player2.name} WON THE MATCH!
            </div>
          )}

          {/* Active Life Burst Banner */}
          {gameState.log[0]?.type === 'burst' && (
            <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 border-2 border-amber-500/80 text-amber-200 p-3.5 rounded-2xl text-xs font-semibold shadow-xl flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-500/30 text-amber-300">
                  <Zap className="h-5 w-5 text-amber-400" />
                </span>
                <div>
                  <span className="font-extrabold text-white uppercase tracking-wider text-[11px] block">
                    ⚡ LIFE BURST ACTIVATED
                  </span>
                  <p className="text-amber-100">{gameState.log[0].message}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-950 border border-amber-700/50 text-amber-300">
                Check Zone
              </span>
            </div>
          )}


          {/* TOP PLAYER (Opponent / Player 2) DIVA SELECTION PLAYMAT */}
          <div className="bg-zinc-950/80 rounded-2xl p-4 border border-sky-900/40 space-y-3 relative shadow-xl backdrop-blur-sm overflow-hidden">
            {/* Floating Damage Taken Indicator Banner */}
            <AnimatePresence>
              {damageNotice && damageNotice.playerId === oppP.id && (
                <motion.div
                  key={`dmg-opp-${damageNotice.key}`}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1.05 }}
                  exit={{ opacity: 0, y: -25, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute top-2 right-4 z-30 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white font-black text-xs border border-amber-300/80 shadow-[0_0_20px_rgba(239,68,68,0.8)] flex items-center gap-2 pointer-events-none"
                >
                  <Zap className="h-4 w-4 text-amber-300 animate-bounce shrink-0" />
                  <span>{oppP.name} TOOK {damageNotice.amount} DAMAGE! LIFE CLOTH REMOVED</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header Bar */}
            <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50" />
                <span className="font-extrabold text-sky-200">{oppP.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  (Hand: {oppP.hand.length} | Main Deck: {oppP.mainDeck.length})
                </span>
              </div>

              {/* Zone Badges */}
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <button
                  onClick={() => setInspectZone({ player: oppP.id, type: 'checkZone' })}
                  className="px-2 py-0.5 rounded-lg bg-amber-950/50 border border-amber-800/50 text-amber-300 text-[10px] font-semibold hover:bg-amber-900/60"
                >
                  Check: {oppP.checkZone.length}
                </button>

                <button
                  onClick={() => setInspectZone({ player: oppP.id, type: 'ener' })}
                  className="px-2 py-0.5 rounded-lg bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-900/60"
                >
                  Ener: {oppP.enerZone.length}
                </button>

                <button
                  onClick={() => setInspectZone({ player: oppP.id, type: 'trash' })}
                  className="px-2 py-0.5 rounded-lg bg-purple-950/50 border border-purple-800/50 text-purple-300 text-[10px] font-semibold hover:bg-purple-900/60"
                >
                  Trash: {oppP.trash.length}
                </button>

                <button
                  onClick={() => setInspectZone({ player: oppP.id, type: 'lrigDeck' })}
                  className="px-2 py-0.5 rounded-lg bg-sky-950/50 border border-sky-800/50 text-sky-300 text-[10px] font-semibold hover:bg-sky-900/60"
                >
                  LRIG Deck: {oppP.lrigDeck.length}
                </button>
              </div>
            </div>

            {/* Life Cloth Horizontal Cards Zone with Transition Animations */}
            <LifeClothZoneAnimated
              player={oppP}
              colorTheme="sky"
              onInspect={() => setInspectZone({ player: oppP.id, type: 'lifeCloth' })}
              isDamageFlashing={oppP.id === 1 ? p1DamageFlash : p2DamageFlash}
            />

            {/* Diva Selection Playmat LRIG Row (Backline: Assist Left, Center LRIG, Assist Right, Piece Zone) */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase font-bold text-sky-400/80 tracking-widest block text-left">
                ── DIVA SELECTION LRIG ZONE ──
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Assist LRIG Left */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-sky-900/40 flex flex-col justify-between min-h-[110px]">
                  <span className="text-[9px] text-sky-400 font-bold uppercase tracking-wider">ASSIST LRIG (L)</span>
                  {oppP.lrigZone.assistLeft ? (
                    <div>
                      <span className="font-bold text-xs text-sky-300 block truncate">{oppP.lrigZone.assistLeft.card.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">Lvl {oppP.lrigZone.assistLeft.card.level}</span>
                      <LrigAbilityStatusBadges cardInstance={oppP.lrigZone.assistLeft} playerId={oppP.id} zoneKey="assistLeft" compact />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>

                {/* Center LRIG */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border-2 border-sky-500/50 flex flex-col justify-between min-h-[110px] shadow-lg shadow-sky-950/40">
                  <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-wider">CENTER LRIG</span>
                  {oppP.lrigZone.center ? (
                    <div>
                      <span className="font-extrabold text-xs text-sky-200 block truncate">{oppP.lrigZone.center.card.name}</span>
                      <span className="text-[9px] text-sky-400 font-mono font-bold">
                        Lvl {oppP.lrigZone.center.card.level} • {oppP.lrigZone.center.isUp ? 'UP' : 'DOWN'}
                      </span>
                      <LrigAbilityStatusBadges cardInstance={oppP.lrigZone.center} playerId={oppP.id} zoneKey="center" compact />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>

                {/* Assist LRIG Right */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-sky-900/40 flex flex-col justify-between min-h-[110px]">
                  <span className="text-[9px] text-sky-400 font-bold uppercase tracking-wider">ASSIST LRIG (R)</span>
                  {oppP.lrigZone.assistRight ? (
                    <div>
                      <span className="font-bold text-xs text-sky-300 block truncate">{oppP.lrigZone.assistRight.card.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">Lvl {oppP.lrigZone.assistRight.card.level}</span>
                      <LrigAbilityStatusBadges cardInstance={oppP.lrigZone.assistRight} playerId={oppP.id} zoneKey="assistRight" compact />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>

                {/* Piece Zone */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-purple-900/40 flex flex-col justify-between min-h-[110px]">
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">PIECE ZONE</span>
                  {oppP.lrigZone.piece ? (
                    <div>
                      <span className="font-bold text-xs text-purple-300 block truncate">{oppP.lrigZone.piece.name}</span>
                      <span className="text-[9px] text-purple-400 font-mono">Active Piece</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>
              </div>
            </div>

            {/* Diva Selection Playmat SIGNI Row (Frontline: Left, Center, Right) */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase font-bold text-sky-400/80 tracking-widest block text-left">
                ── BATTLE FRONTLINE SIGNI ZONE ──
              </span>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {(['left', 'center', 'right'] as SigniSlot[]).map((slot, i) => {
                  const signi = oppP.signiZones[slot];
                  return (
                    <div
                      key={`opp-${slot}`}
                      className={`p-3 rounded-xl bg-zinc-950 border text-xs flex flex-col justify-between min-h-[110px] transition-all ${
                        signi ? 'border-sky-700/80 bg-sky-950/20 shadow-md shadow-sky-950/40' : 'border-zinc-800/80'
                      }`}
                    >
                      <span className="text-[9px] text-zinc-400 font-bold uppercase">
                        SIGNI {i + 1} ({slot.toUpperCase()})
                      </span>
                      {signi ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-zinc-100 block truncate">{signi.card.name}</span>
                            {signi.card.lifeBurst && (
                              <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" title="Life Burst" />
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono font-bold mt-1">
                            PWR: {signi.card.power + signi.powerBonus}
                          </div>
                          <span className="text-[9px] text-zinc-400 block mt-0.5">
                            {signi.isUp ? 'UP' : 'DOWN (Tapped)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              toggleTargetSlot(oppP.id, slot);
                              setIsTargetModalOpen(true);
                              setTargetModalTab('signi');
                            }}
                            className="mt-2 w-full py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 font-bold text-[10px] shadow flex items-center justify-center gap-1"
                          >
                            <Target className="h-3 w-3 text-rose-400" /> Target SIGNI
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 my-auto">Empty Slot</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTIVE LRIG ABILITIES STATUS MONITOR */}
          {activeP.lrigZone.center && (
            <div className="bg-zinc-950/90 p-3.5 rounded-2xl border border-rose-900/40 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/50">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-100 text-xs">
                      {activeP.name}'s LRIG Ability Monitor
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 font-mono text-[10px] font-bold">
                      Lvl {activeP.lrigZone.center.card.level} {activeP.lrigZone.center.card.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Interactive status badges: Click to trigger or toggle ability status (Enter, Auto, Const, Action)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <LrigAbilityStatusBadges
                  cardInstance={activeP.lrigZone.center}
                  playerId={activeP.id}
                  zoneKey="center"
                  isInteractive={true}
                  onToggleAbility={handleToggleLrigAbility}
                />
              </div>
            </div>
          )}

          {/* MIDDLE ACTION & PHASE CONTROLLER */}
          <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Current Turn Player
              </span>
              <span className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <Flame className="h-4 w-4" /> {activeP.name} ({gameState.phase} Phase)
              </span>
            </div>

            {/* Turn Action Controls */}
            <div className="flex items-center space-x-3">
              {/* Grow LRIG Options (Center, Assist Left, Assist Right) */}
              {(gameState.phase === 'GROW' || gameState.phase === 'MAIN' || gameState.phase === 'ATTACK') && activeP.lrigDeck.length > 0 && (() => {
                const centerLvl = activeP.lrigZone.center?.card.level || 0;
                const assistLeftLvl = activeP.lrigZone.assistLeft?.card.level || 0;
                const assistRightLvl = activeP.lrigZone.assistRight?.card.level || 0;

                const growable = activeP.lrigDeck.filter((c) => {
                  if (c.cardType !== 'LRIG') return false;
                  const targetZone = determineLrigZone(c, activeP.lrigZone);
                  if (targetZone === 'center') {
                    return gameState.phase === 'GROW' && c.level === centerLvl + 1 && c.level <= gameState.turn;
                  }
                  if (targetZone === 'assistLeft') {
                    return (gameState.phase === 'MAIN' || gameState.phase === 'ATTACK') && c.level === assistLeftLvl + 1 && c.level <= 2;
                  }
                  if (targetZone === 'assistRight') {
                    return (gameState.phase === 'MAIN' || gameState.phase === 'ATTACK') && c.level === assistRightLvl + 1 && c.level <= 2;
                  }
                  return false;
                });

                if (growable.length === 0) return null;

                return (
                  <div className="flex items-center space-x-2">
                    {growable.map((lrigCard) => {
                      const targetZone = determineLrigZone(lrigCard, activeP.lrigZone);
                      const tag =
                        targetZone === 'center'
                          ? 'Center'
                          : targetZone === 'assistLeft'
                          ? 'Assist (L)'
                          : 'Assist (R)';
                      return (
                        <button
                          key={lrigCard.id}
                          onClick={() => handleGrowLrig(lrigCard.id, targetZone)}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs shadow-md animate-pulse flex items-center gap-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Grow {tag} Lvl {lrigCard.level} ({lrigCard.name})
                          <span className="px-1.5 py-0.5 rounded bg-black/40 text-amber-200 text-[10px] font-mono">
                            Cost: {lrigCard.cost}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Target SIGNI & Top-of-Deck Action Helper Button */}
              <button
                onClick={() => setIsTargetModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                title="Choose target SIGNI to banish, bounce, tap, or modify power, or manage top of deck"
              >
                <Target className="h-4 w-4 text-amber-300" />
                <span>Target SIGNI & Deck</span>
                {selectedTargets.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-rose-950 font-black text-[10px]">
                    {selectedTargets.length}
                  </span>
                )}
              </button>

              {/* Draw Card (Hotkey 'D') */}
              <button
                onClick={() => {
                  if (gameState.winner === null) {
                    const next = drawManualCard(gameState, activeP.id);
                    setGameState(next);
                  }
                }}
                disabled={gameState.winner !== null || activeP.mainDeck.length === 0}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 disabled:opacity-40 text-zinc-200 border border-zinc-700 text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                title="Draw 1 card from Main Deck (Hotkey: D)"
              >
                <span>Draw Card</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-rose-400">
                  D
                </span>
              </button>

              {/* Advance Phase Button */}
              <button
                onClick={handleNextPhase}
                disabled={gameState.winner !== null}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
              >
                <span>Proceed to {gameState.phase === 'END' ? 'Next Turn' : 'Next Phase'}</span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono font-normal">
                  Space
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* BOTTOM PLAYER (Active Player / Player 1) DIVA SELECTION PLAYMAT */}
          <div className="bg-zinc-950/80 rounded-2xl p-4 border border-rose-900/40 space-y-3 relative shadow-xl backdrop-blur-sm overflow-hidden">
            {/* Floating Damage Taken Indicator Banner */}
            <AnimatePresence>
              {damageNotice && damageNotice.playerId === activeP.id && (
                <motion.div
                  key={`dmg-act-${damageNotice.key}`}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1.05 }}
                  exit={{ opacity: 0, y: -25, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute top-2 right-4 z-30 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white font-black text-xs border border-amber-300/80 shadow-[0_0_20px_rgba(239,68,68,0.8)] flex items-center gap-2 pointer-events-none"
                >
                  <Zap className="h-4 w-4 text-amber-300 animate-bounce shrink-0" />
                  <span>{activeP.name} TOOK {damageNotice.amount} DAMAGE! LIFE CLOTH REMOVED</span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Header Bar */}
            <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <span className="font-extrabold text-rose-200">{activeP.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  (Hand: {activeP.hand.length} | Main Deck: {activeP.mainDeck.length})
                </span>
              </div>

              {/* Zone Badges */}
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <button
                  onClick={() => setInspectZone({ player: activeP.id, type: 'checkZone' })}
                  className="px-2 py-0.5 rounded-lg bg-amber-950/50 border border-amber-800/50 text-amber-300 text-[10px] font-semibold hover:bg-amber-900/60 flex items-center gap-1"
                >
                  <Zap className="h-3 w-3 text-amber-400" /> Check: {activeP.checkZone.length}
                </button>

                <button
                  onClick={() => setInspectZone({ player: activeP.id, type: 'ener' })}
                  className="px-2 py-0.5 rounded-lg bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-900/60"
                >
                  Ener: {activeP.enerZone.length}
                </button>

                <button
                  onClick={() => setInspectZone({ player: activeP.id, type: 'trash' })}
                  className="px-2 py-0.5 rounded-lg bg-purple-950/50 border border-purple-800/50 text-purple-300 text-[10px] font-semibold hover:bg-purple-900/60"
                >
                  Trash: {activeP.trash.length}
                </button>

                <button
                  onClick={() => setInspectZone({ player: activeP.id, type: 'lrigDeck' })}
                  className="px-2 py-0.5 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-[10px] font-semibold hover:bg-rose-900/60"
                >
                  LRIG Deck: {activeP.lrigDeck.length}
                </button>
              </div>
            </div>

            {/* Diva Selection Playmat SIGNI Row (Frontline: Left, Center, Right) */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase font-bold text-rose-400/80 tracking-widest block text-left">
                ── BATTLE FRONTLINE SIGNI ZONE ──
              </span>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {(['left', 'center', 'right'] as SigniSlot[]).map((slot, i) => {
                  const signi = activeP.signiZones[slot];
                  return (
                    <div
                      key={`act-${slot}`}
                      className={`p-3 rounded-xl bg-zinc-950 border text-xs flex flex-col justify-between min-h-[120px] transition-all ${
                        signi ? 'border-rose-700/80 bg-rose-950/20 shadow-md shadow-rose-950/40' : 'border-zinc-800/80'
                      }`}
                    >
                      <span className="text-[9px] text-zinc-400 font-bold uppercase">
                        SIGNI {i + 1} ({slot.toUpperCase()})
                      </span>

                      {signi ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-zinc-100 block truncate">{signi.card.name}</span>
                            {signi.card.lifeBurst && (
                              <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" title="Life Burst" />
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono font-bold mt-1">
                            PWR: {signi.card.power + signi.powerBonus}
                          </div>
                          <span className="text-[9px] text-zinc-400 block">
                            {signi.isUp ? 'UP' : 'DOWN (Tapped)'}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              toggleTargetSlot(activeP.id, slot);
                              setIsTargetModalOpen(true);
                              setTargetModalTab('signi');
                            }}
                            className="mt-1.5 w-full py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-amber-300 font-bold text-[10px] shadow flex items-center justify-center gap-1"
                          >
                            <Target className="h-3 w-3 text-amber-400" /> Target SIGNI
                          </button>

                          {/* SIGNI Attack Action Button */}
                          {gameState.phase === 'ATTACK' && signi.isUp && (
                            gameState.turn === 1 && activeP.id === 1 ? (
                              <div className="mt-1.5 text-[9px] text-amber-300 font-semibold bg-amber-950/60 p-1.5 rounded border border-amber-800/50">
                                Cannot attack on Turn 1
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeclareAttack(slot)}
                                className="mt-1.5 w-full py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shadow flex items-center justify-center gap-1"
                              >
                                <Sword className="h-3 w-3" /> Attack
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 my-auto">
                          <span className="text-[11px] text-zinc-600 block">Empty Lane</span>
                          {selectedCardForAction && selectedCardForAction.cardType === 'SIGNI' && (
                            selectedCardForAction.level <= (activeP.lrigZone.center?.card.level || 0) ? (
                              <button
                                onClick={() => handlePlaySigniToSlot(slot)}
                                className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] animate-bounce"
                              >
                                Play Here
                              </button>
                            ) : (
                              <div className="w-full py-1 px-1 rounded bg-rose-950/80 border border-rose-800/60 text-rose-300 font-semibold text-[9px] text-center">
                                Lvl {selectedCardForAction.level} &gt; LRIG Lvl {activeP.lrigZone.center?.card.level || 0}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diva Selection Playmat LRIG Row (Backline: Assist Left, Center LRIG, Assist Right, Piece Zone) */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono uppercase font-bold text-rose-400/80 tracking-widest block text-left">
                ── DIVA SELECTION LRIG ZONE ──
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Assist LRIG Left */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-rose-900/40 flex flex-col justify-between min-h-[110px]">
                  <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">ASSIST LRIG (L)</span>
                  {activeP.lrigZone.assistLeft ? (
                    <div>
                      <span className="font-bold text-xs text-rose-300 block truncate">{activeP.lrigZone.assistLeft.card.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">Lvl {activeP.lrigZone.assistLeft.card.level}</span>
                      <LrigAbilityStatusBadges cardInstance={activeP.lrigZone.assistLeft} playerId={activeP.id} zoneKey="assistLeft" compact />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>

                {/* Center LRIG */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border-2 border-rose-500/50 flex flex-col justify-between min-h-[110px] shadow-lg shadow-rose-950/40">
                  <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-wider">CENTER LRIG</span>
                  {activeP.lrigZone.center ? (
                    <div>
                      <span className="font-extrabold text-xs text-rose-200 block truncate">{activeP.lrigZone.center.card.name}</span>
                      <span className="text-[9px] text-rose-400 font-mono font-bold">
                        Lvl {activeP.lrigZone.center.card.level} • {activeP.lrigZone.center.isUp ? 'UP' : 'DOWN'}
                      </span>
                      <LrigAbilityStatusBadges cardInstance={activeP.lrigZone.center} playerId={activeP.id} zoneKey="center" compact />

                      {/* Attack with LRIG */}
                      {gameState.phase === 'ATTACK' && activeP.lrigZone.center.isUp && (
                        gameState.turn === 1 && activeP.id === 1 ? (
                          <div className="mt-1 text-[9px] text-amber-300 font-semibold bg-amber-950/60 p-1 rounded border border-amber-800/50">
                            Cannot attack on Turn 1
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeclareAttack('lrig')}
                            className="mt-1.5 w-full py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shadow flex items-center justify-center gap-1"
                          >
                            <Sword className="h-3 w-3" /> LRIG Attack
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>

                {/* Assist LRIG Right */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-rose-900/40 flex flex-col justify-between min-h-[110px]">
                  <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">ASSIST LRIG (R)</span>
                  {activeP.lrigZone.assistRight ? (
                    <div>
                      <span className="font-bold text-xs text-rose-300 block truncate">{activeP.lrigZone.assistRight.card.name}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">Lvl {activeP.lrigZone.assistRight.card.level}</span>
                      <LrigAbilityStatusBadges cardInstance={activeP.lrigZone.assistRight} playerId={activeP.id} zoneKey="assistRight" compact />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>

                {/* Piece Zone */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-purple-900/40 flex flex-col justify-between min-h-[110px]">
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">PIECE ZONE</span>
                  {activeP.lrigZone.piece ? (
                    <div>
                      <span className="font-bold text-xs text-purple-300 block truncate">{activeP.lrigZone.piece.name}</span>
                      <span className="text-[9px] text-purple-400 font-mono">Active Piece</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 my-auto">Empty</span>
                  )}
                </div>
              </div>
            </div>

            {/* Life Cloth Horizontal Cards Zone with Transition Animations */}
            <LifeClothZoneAnimated
              player={activeP}
              colorTheme="rose"
              onInspect={() => setInspectZone({ player: activeP.id, type: 'lifeCloth' })}
              isDamageFlashing={activeP.id === 1 ? p1DamageFlash : p2DamageFlash}
            />

            {/* Active Player Hand Tray */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {activeP.name}'s Hand ({activeP.hand.length} cards)
                </span>
                {selectedCardForAction && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-rose-300 font-semibold">
                      Selected: {selectedCardForAction.name}
                    </span>
                    {gameState.phase === 'ENER' && (
                      <button
                        onClick={handleChargeSelectedToEner}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]"
                      >
                        Charge to Ener
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCardForAction(null)}
                      className="text-[10px] text-zinc-400 hover:text-white underline"
                    >
                      Deselect
                    </button>
                  </div>
                )}
              </div>

              {hideHandForHotseat ? (
                <div className="py-6 text-center text-zinc-500 text-xs italic bg-zinc-900/50 rounded-lg">
                  Hand is hidden for local Hotseat privacy. Click 'Show Hand' top right to reveal.
                </div>
              ) : (
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {activeP.hand.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      onClick={() => setSelectedCardForAction(card)}
                      className={`shrink-0 w-36 p-3 rounded-xl border text-xs cursor-pointer transition-all hover:scale-105 flex flex-col justify-between ${
                        selectedCardForAction?.id === card.id
                          ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-rose-400">
                          <div className="flex items-center gap-1">
                            {card.cardType.toUpperCase() === 'SPELL' ? null : <span>Lvl {card.level}</span>}
                            {card.cardType === 'SIGNI' && card.level > (activeP.lrigZone.center?.card.level || 0) && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800" title="SIGNI Level exceeds Center LRIG Level">
                                &gt; LRIG Lvl {activeP.lrigZone.center?.card.level || 0}
                              </span>
                            )}
                          </div>
                          <span>{card.cardType}</span>
                        </div>
                        <h4 className="font-bold text-zinc-100 line-clamp-1">{card.name}</h4>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">{card.effectText}</p>
                      </div>

                      <div className="mt-2 pt-1 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{card.power > 0 ? `${card.power} PWR` : card.cost}</span>
                        {card.lifeBurst && <Zap className="h-3 w-3 text-amber-400" title="Life Burst" />}
                        {card.guard && <Shield className="h-3 w-3 text-sky-400" title="Guard" />}
                      </div>
                    </div>
                  ))}
                  {activeP.hand.length === 0 && (
                    <div className="py-6 text-center text-zinc-500 text-xs italic w-full">
                      Hand is currently empty.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Log Drawer (3 cols) */}
        <div className="lg:col-span-3 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 p-4 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            {/* Log Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center space-x-2">
                <ListFilter className="h-4 w-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  WIXOSS Battle Log
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {gameState.log.length} entries
                </span>
                <button
                  onClick={() => {
                    const text = gameState.log
                      .map((l) => `[${l.timestamp}] [P${l.playerId}] [${l.type.toUpperCase()}] ${l.message}`)
                      .join('\n');
                    navigator.clipboard.writeText(text);
                    setLogCopied(true);
                    setTimeout(() => setLogCopied(false), 2000);
                  }}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Copy log history to clipboard"
                >
                  {logCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Log Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search match history..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
              />
              {logSearch && (
                <button
                  onClick={() => setLogSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'phase', label: 'Turns' },
                { id: 'attack', label: 'Attacks' },
                { id: 'action', label: 'Actions' },
                { id: 'burst', label: 'Bursts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLogFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                    logFilter === tab.id
                      ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filtered Log List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 text-[11px]">
              {(() => {
                const filtered = gameState.log.filter((log) => {
                  if (logFilter === 'phase' && log.type !== 'phase') return false;
                  if (logFilter === 'attack' && log.type !== 'attack' && log.type !== 'damage') return false;
                  if (logFilter === 'action' && log.type !== 'action' && log.type !== 'grow') return false;
                  if (logFilter === 'burst' && log.type !== 'burst') return false;

                  if (logSearch.trim()) {
                    const q = logSearch.toLowerCase();
                    return (
                      log.message.toLowerCase().includes(q) ||
                      log.timestamp.toLowerCase().includes(q) ||
                      log.type.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-zinc-500 text-xs italic">
                      No log entries match the selected filter.
                    </div>
                  );
                }

                return filtered.map((log) => {
                  const isTurnHeader =
                    log.message.includes('Turn') ||
                    log.message.includes('Mulligan Phase Complete') ||
                    log.message.includes('Mulligan Phase');

                  const pName = log.playerId === 1 ? gameState.player1.name : gameState.player2.name;

                  return (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isTurnHeader
                          ? 'bg-rose-950/40 border-rose-600/60 ring-1 ring-rose-500/30'
                          : log.type === 'damage'
                          ? 'bg-red-950/30 border-red-900/40 text-red-200'
                          : log.type === 'burst'
                          ? 'bg-amber-950/40 border-amber-800/50 text-amber-300 font-semibold'
                          : log.type === 'grow'
                          ? 'bg-purple-950/30 border-purple-800/40 text-purple-200 font-semibold'
                          : log.type === 'attack'
                          ? 'bg-rose-950/20 border-rose-900/30 text-rose-200'
                          : 'bg-zinc-950 border-zinc-800/80 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] mb-1 font-mono">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              log.playerId === 1
                                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                                : 'bg-sky-900/60 text-sky-300 border border-sky-700/50'
                            }`}
                          >
                            P{log.playerId} ({pName})
                          </span>

                          <span className="text-zinc-500 uppercase tracking-wide font-semibold text-[8px] px-1 bg-zinc-900 rounded">
                            {log.type}
                          </span>
                        </div>

                        <span className="text-zinc-500 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {log.timestamp}
                        </span>
                      </div>

                      <p
                        className={`leading-snug ${
                          isTurnHeader ? 'font-bold text-rose-200 text-[11.5px]' : ''
                        }`}
                      >
                        {log.message}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 text-center pt-2 border-t border-zinc-800 font-mono flex items-center justify-between">
            <span>WIXOSS Engine</span>
            <span>Real-time Log Sync</span>
          </div>
        </div>
      </div>

      {/* Inspect Zone Modal (Ener / Trash / Check Zone / Life Cloth / LRIG Deck) */}
      {inspectZone && (() => {
        const targetP = inspectZone.player === 1 ? gameState.player1 : gameState.player2;
        let cardList: WixossCard[] = [];
        let zoneLabel = inspectZone.type;

        if (inspectZone.type === 'ener') {
          cardList = targetP.enerZone;
          zoneLabel = 'Ener Zone';
        } else if (inspectZone.type === 'trash') {
          cardList = targetP.trash;
          zoneLabel = 'Trash';
        } else if (inspectZone.type === 'checkZone') {
          cardList = targetP.checkZone;
          zoneLabel = 'Check Zone';
        } else if (inspectZone.type === 'lifeCloth') {
          cardList = targetP.lifeCloth;
          zoneLabel = 'Life Cloth Stack';
        } else if (inspectZone.type === 'lrigDeck') {
          cardList = targetP.lrigDeck;
          zoneLabel = 'LRIG Deck';
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <h3 className="font-bold text-base text-white capitalize">
                    {targetP.name}'s {zoneLabel} ({cardList.length} cards)
                  </h3>
                </div>
                <button
                  onClick={() => setInspectZone(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-1">
                {cardList.map((card, idx) => (
                  <div
                    key={`${card.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-zinc-100 text-sm">{card.name}</span>
                          {card.lifeBurst && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Zap className="h-3 w-3" /> Life Burst
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          {card.color} • Level {card.level} • {card.cardType} {card.signiClass ? `[${card.signiClass}]` : ''}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-zinc-300 font-mono text-xs block font-bold">
                          {card.power > 0 ? `${card.power} PWR` : card.cost}
                        </span>
                      </div>
                    </div>

                    {card.lifeBurstEffect && (
                      <div className="text-[11px] bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg text-amber-200">
                        <span className="font-bold block">Life Burst:</span>
                        {card.lifeBurstEffect}
                      </div>
                    )}

                    {card.effectText && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{card.effectText}</p>
                    )}

                    {/* Grow LRIG Button inside LRIG Deck Inspector */}
                    {inspectZone.type === 'lrigDeck' && card.cardType === 'LRIG' && (
                      <div className="pt-1 flex flex-wrap gap-2 justify-end">
                        {(['center', 'assistLeft', 'assistRight'] as const).map((zKey) => {
                          const currentInst = targetP.lrigZone[zKey];
                          const currentLvl = currentInst?.card.level ?? 0;
                          const isValidLevel = card.level === currentLvl + 1;
                          const isTurnValid = zKey === 'center'
                            ? (gameState.phase === 'GROW' && card.level <= gameState.turn)
                            : (gameState.phase === 'MAIN' || gameState.phase === 'ATTACK');

                          if (!isValidLevel || !isTurnValid) return null;

                          const label =
                            zKey === 'center'
                              ? 'Center'
                              : zKey === 'assistLeft'
                              ? 'Assist (L)'
                              : 'Assist (R)';

                          return (
                            <button
                              key={zKey}
                              onClick={() => {
                                handleGrowLrig(card.id, zKey, targetP.id);
                                setInspectZone(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-rose-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Grow {label} (Lvl {card.level})
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Play Piece / Arts Button inside LRIG Deck Inspector */}
                    {inspectZone.type === 'lrigDeck' && (card.cardType === 'Piece' || card.cardType === 'Arts') && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => {
                            const next = playPieceCard(gameState, card.id, targetP.id);
                            setGameState(next);
                            setInspectZone(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Play {card.cardType} Card
                        </button>
                      </div>
                    )}

                    {/* Manual Trigger Life Burst Button (Only for Check Zone or Life Cloth) */}
                    {(inspectZone.type === 'checkZone' || inspectZone.type === 'lifeCloth') && card.lifeBurst && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => {
                            const next = triggerManualLifeBurst(gameState, inspectZone.player, idx, inspectZone.type as any);
                            setGameState(next);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                        >
                          <Zap className="h-3.5 w-3.5" /> Trigger Life Burst
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {cardList.length === 0 && (
                  <div className="py-8 text-center text-zinc-500 italic">
                    This zone is currently empty.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONTROLS HELPER TOOLTIP / OVERLAY */}
      {showControlsTooltip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-rose-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Simulator Controls & Hotkeys</h3>
                  <p className="text-xs text-zinc-400">Keyboard shortcuts to speed up simulator gameplay</p>
                </div>
              </div>
              <button
                onClick={() => setShowControlsTooltip(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 font-mono font-bold text-xs shadow-inner">
                    Space
                  </span>
                  <span className="text-zinc-200 font-semibold">Proceed Phase / Next Turn</span>
                </div>
                <span className="text-[10px] text-zinc-500">End current phase</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 font-mono font-bold text-xs flex items-center justify-center shadow-inner shrink-0">
                    M
                  </span>
                  <span className="text-zinc-200 font-semibold">Mulligan / Keep Opening Hand</span>
                </div>
                <span className="text-[10px] text-zinc-500">Mulligan Phase</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 font-mono font-bold text-xs flex items-center justify-center shadow-inner shrink-0">
                    D
                  </span>
                  <span className="text-zinc-200 font-semibold">Draw 1 Card from Main Deck</span>
                </div>
                <span className="text-[10px] text-zinc-500">Any phase</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 font-mono font-bold text-xs flex items-center justify-center shadow-inner shrink-0">
                    U
                  </span>
                  <span className="text-zinc-200 font-semibold">Undo Last Action</span>
                </div>
                <span className="text-[10px] text-zinc-500">Revert state</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 font-mono font-bold text-xs shadow-inner">
                    Esc
                  </span>
                  <span className="text-zinc-200 font-semibold">Clear Selection / Close Modals</span>
                </div>
                <span className="text-[10px] text-zinc-500">Deselect card</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-rose-400 font-mono font-bold text-xs flex items-center justify-center shadow-inner shrink-0">
                    ? / H
                  </span>
                  <span className="text-zinc-200 font-semibold">Toggle Controls Legend</span>
                </div>
                <span className="text-[10px] text-zinc-500">Show / Hide</span>
              </div>
            </div>

            <div className="pt-2 text-center text-[11px] text-zinc-500 border-t border-zinc-800">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Esc</kbd> or click outside to close this helper window.
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL DIVA SELECTION PLAYMAT DIAGRAM MODAL */}
      {showPlaymatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-rose-500/60 rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-4 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Official WIXOSS Diva Selection Playmat</h3>
                  <p className="text-xs text-zinc-400">Standard Diva Selection field layout and card placement diagram</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlaymatModal(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 flex items-center justify-center">
              <img
                src={DIVA_PLAYMAT_URL}
                alt="Official Diva Selection Playmat"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg border border-zinc-800"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              <span>Active simulator playfield updated with official Diva Selection Playmat background graphics.</span>
              <button
                onClick={() => setShowPlaymatModal(false)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow"
              >
                Close Diagram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARGET SIGNI & TOP-OF-DECK ACTION MODAL */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Target SIGNI & Deck Action Helper
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Select any number of SIGNIs to banish, bounce, tap, or modify power, or manipulate top of deck.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
              <button
                onClick={() => setTargetModalTab('signi')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  targetModalTab === 'signi'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Target className="h-4 w-4" />
                <span>Choose Target SIGNI ({selectedTargets.length} Selected)</span>
              </button>
              <button
                onClick={() => setTargetModalTab('deck')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  targetModalTab === 'deck'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Top of Deck Actions</span>
              </button>
            </div>

            {/* Tab 1: SIGNI Target Chooser */}
            {targetModalTab === 'signi' && (
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Opponent SIGNIs */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Opponent's SIGNI Field ({oppP.name})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['left', 'center', 'right'] as SigniSlot[]).map((slot) => {
                      const s = oppP.signiZones[slot];
                      const isSelected = selectedTargets.some(
                        (t) => t.playerId === oppP.id && t.slot === slot
                      );
                      return (
                        <button
                          key={`modal-opp-${slot}`}
                          onClick={() => toggleTargetSlot(oppP.id, slot)}
                          disabled={!s}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                            !s
                              ? 'bg-zinc-950/50 border-zinc-800/60 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-rose-950/90 border-2 border-rose-500 text-white shadow-lg shadow-rose-950/50 scale-[1.02]'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono font-semibold">
                            <span>{slot.toUpperCase()} LANE</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px]">
                                ✓ TARGETED
                              </span>
                            )}
                          </div>
                          {s ? (
                            <div className="mt-1">
                              <span className="font-extrabold text-xs text-zinc-100 block truncate">
                                {s.card.name}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">
                                PWR: {s.card.power + s.powerBonus} • {s.isUp ? 'UP' : 'DOWN'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 mt-2">Empty Slot</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Player's SIGNIs */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Your SIGNI Field ({activeP.name})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['left', 'center', 'right'] as SigniSlot[]).map((slot) => {
                      const s = activeP.signiZones[slot];
                      const isSelected = selectedTargets.some(
                        (t) => t.playerId === activeP.id && t.slot === slot
                      );
                      return (
                        <button
                          key={`modal-act-${slot}`}
                          onClick={() => toggleTargetSlot(activeP.id, slot)}
                          disabled={!s}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                            !s
                              ? 'bg-zinc-950/50 border-zinc-800/60 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-amber-950/90 border-2 border-amber-500 text-white shadow-lg shadow-amber-950/50 scale-[1.02]'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono font-semibold">
                            <span>{slot.toUpperCase()} LANE</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold text-[9px]">
                                ✓ TARGETED
                              </span>
                            )}
                          </div>
                          {s ? (
                            <div className="mt-1">
                              <span className="font-extrabold text-xs text-zinc-100 block truncate">
                                {s.card.name}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">
                                PWR: {s.card.power + s.powerBonus} • {s.isUp ? 'UP' : 'DOWN'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 mt-2">Empty Slot</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Toolbar for Selected SIGNIs */}
                {selectedTargets.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        ⚡ Execute Action on {selectedTargets.length} Selected SIGNI(s):
                      </span>
                      <button
                        onClick={() => setSelectedTargets([])}
                        className="text-[10px] text-zinc-400 hover:text-white underline"
                      >
                        Clear Targets
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={handleBanishTargets}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <Flame className="h-4 w-4 text-amber-300" /> Banish to Ener
                      </button>
                      <button
                        onClick={handleBounceTargets}
                        className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <ArrowRightLeft className="h-4 w-4" /> Bounce to Hand
                      </button>
                      <button
                        onClick={() => handleToggleStateTargets('down')}
                        className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" /> Down / Tap
                      </button>
                      <button
                        onClick={() => handleToggleStateTargets('up')}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="h-4 w-4" /> Up / Untap
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-400 font-semibold">Modify Power:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleModifyPowerTargets(3000)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs hover:bg-emerald-900"
                        >
                          +3000 PWR
                        </button>
                        <button
                          onClick={() => handleModifyPowerTargets(5000)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs hover:bg-emerald-900"
                        >
                          +5000 PWR
                        </button>
                        <button
                          onClick={() => handleModifyPowerTargets(-3000)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-700 text-rose-300 font-bold text-xs hover:bg-rose-900"
                        >
                          -3000 PWR
                        </button>
                        <button
                          onClick={() => handleModifyPowerTargets(-8000)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-700 text-rose-300 font-bold text-xs hover:bg-rose-900"
                        >
                          -8000 PWR
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-xs text-zinc-400">
                    💡 Click on any SIGNI slot above (Opponent or Player field) to select target SIGNI(s).
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Top of Deck Controls */}
            {targetModalTab === 'deck' && (
              <div className="space-y-4 overflow-y-auto">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">
                      Main Deck Status ({activeP.name}): {activeP.mainDeck.length} cards remaining
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-zinc-400">Card Count:</span>
                      {[1, 2, 3, 5, 8].map((num) => (
                        <button
                          key={`deck-cnt-${num}`}
                          onClick={() => setDeckActionCount(num)}
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            deckActionCount === num
                              ? 'bg-rose-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleMoveTopDeckToHand(deckActionCount)}
                      className="p-3 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold text-xs shadow space-y-1 text-left"
                    >
                      <span className="block font-extrabold text-sm">🃏 Move to Hand</span>
                      <span className="text-[10px] text-emerald-100 font-normal block">
                        Draw top {deckActionCount} card(s) directly to Hand
                      </span>
                    </button>

                    <button
                      onClick={() => handleMoveTopDeckToEner(deckActionCount)}
                      className="p-3 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-700 hover:brightness-110 text-white font-bold text-xs shadow space-y-1 text-left"
                    >
                      <span className="block font-extrabold text-sm">🔋 Ener Charge</span>
                      <span className="text-[10px] text-amber-100 font-normal block">
                        Move top {deckActionCount} card(s) to Ener Zone
                      </span>
                    </button>

                    <button
                      onClick={() => handleMoveTopDeckToTrash(deckActionCount)}
                      className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 hover:brightness-110 text-white font-bold text-xs shadow space-y-1 text-left"
                    >
                      <span className="block font-extrabold text-sm">🗑️ Mill to Trash</span>
                      <span className="text-[10px] text-purple-100 font-normal block">
                        Move top {deckActionCount} card(s) to Trash
                      </span>
                    </button>

                    <button
                      onClick={() => handleMoveTopDeckToLifeCloth(deckActionCount)}
                      className="p-3 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 hover:brightness-110 text-white font-bold text-xs shadow space-y-1 text-left"
                    >
                      <span className="block font-extrabold text-sm">🛡️ Add Life Cloth</span>
                      <span className="text-[10px] text-rose-100 font-normal block">
                        Move top {deckActionCount} card(s) to Life Cloth
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>Target SIGNI and Deck Action Helper</span>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
              >
                Close Helper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Battle Inspector & Debugger Modal */}
      <BattleDebugModal
        isOpen={isBattleDebugOpen}
        onClose={() => setIsBattleDebugOpen(false)}
        gameState={gameState}
        setGameState={setGameState}
      />
    </div>
  );
};
