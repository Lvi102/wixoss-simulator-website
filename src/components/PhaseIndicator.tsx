import React from 'react';
import { GamePhase } from '../types/game';
import {
  RotateCcw,
  Download,
  Zap,
  Sparkles,
  Flame,
  Sword,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle2,
  Award,
  PlayCircle,
} from 'lucide-react';

interface PhaseConfig {
  key: GamePhase;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  colorScheme: {
    activeBadge: string;
    activeGlow: string;
    activeText: string;
    border: string;
    dotColor: string;
  };
}

const PHASE_CONFIGS: Record<GamePhase, PhaseConfig> = {
  MULLIGAN: {
    key: 'MULLIGAN',
    label: 'Mulligan Phase',
    shortLabel: 'MULLIGAN',
    icon: Layers,
    description: 'Select opening hand cards to discard & redraw, or keep your 5 cards.',
    colorScheme: {
      activeBadge: 'bg-amber-500 text-zinc-950 font-black',
      activeGlow: 'bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      activeText: 'text-amber-300',
      border: 'border-amber-500/50',
      dotColor: 'bg-amber-400',
    },
  },
  UP: {
    key: 'UP',
    label: 'Up Phase (Upkeep)',
    shortLabel: 'UP',
    icon: RotateCcw,
    description: 'All DOWN (tapped) SIGNI and LRIG cards stand UP. Abilities reset for the turn.',
    colorScheme: {
      activeBadge: 'bg-sky-500 text-zinc-950 font-black',
      activeGlow: 'bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.25)]',
      activeText: 'text-sky-300',
      border: 'border-sky-500/50',
      dotColor: 'bg-sky-400',
    },
  },
  DRAW: {
    key: 'DRAW',
    label: 'Draw Phase',
    shortLabel: 'DRAW',
    icon: Download,
    description: 'Draw cards from Main Deck into Hand (1 card on Turn 1 first player, 2 cards on all other turns).',
    colorScheme: {
      activeBadge: 'bg-emerald-500 text-zinc-950 font-black',
      activeGlow: 'bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      activeText: 'text-emerald-300',
      border: 'border-emerald-500/50',
      dotColor: 'bg-emerald-400',
    },
  },
  ENER: {
    key: 'ENER',
    label: 'Ener Phase',
    shortLabel: 'ENER',
    icon: Zap,
    description: 'Optionally move 1 card from hand or 1 SIGNI on field into your Ener Zone.',
    colorScheme: {
      activeBadge: 'bg-yellow-500 text-zinc-950 font-black',
      activeGlow: 'bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.25)]',
      activeText: 'text-yellow-300',
      border: 'border-yellow-500/50',
      dotColor: 'bg-yellow-400',
    },
  },
  GROW: {
    key: 'GROW',
    label: 'Grow Phase',
    shortLabel: 'GROW',
    icon: Sparkles,
    description: 'Pay Ener cost to level up your Center LRIG or Assist LRIGs from LRIG Deck.',
    colorScheme: {
      activeBadge: 'bg-purple-500 text-white font-black',
      activeGlow: 'bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      activeText: 'text-purple-300',
      border: 'border-purple-500/50',
      dotColor: 'bg-purple-400',
    },
  },
  MAIN: {
    key: 'MAIN',
    label: 'Main Phase',
    shortLabel: 'MAIN',
    icon: Flame,
    description: 'Play SIGNI up to LRIG level limit, cast Spells, play Piece cards, or use LRIG Abilities.',
    colorScheme: {
      activeBadge: 'bg-rose-500 text-white font-black',
      activeGlow: 'bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
      activeText: 'text-rose-300',
      border: 'border-rose-500/50',
      dotColor: 'bg-rose-400',
    },
  },
  ATTACK: {
    key: 'ATTACK',
    label: 'Attack Phase',
    shortLabel: 'ATTACK',
    icon: Sword,
    description: 'Declare SIGNI attacks against opposing SIGNI or Player. Declare Center LRIG attack.',
    colorScheme: {
      activeBadge: 'bg-red-600 text-white font-black',
      activeGlow: 'bg-red-600/15 shadow-[0_0_25px_rgba(220,38,38,0.35)]',
      activeText: 'text-red-300',
      border: 'border-red-500/60',
      dotColor: 'bg-red-500',
    },
  },
  END: {
    key: 'END',
    label: 'End Phase',
    shortLabel: 'END',
    icon: Clock,
    description: 'End-of-turn effects trigger. Adjust hand to max 6 cards, then pass turn to opponent.',
    colorScheme: {
      activeBadge: 'bg-indigo-500 text-white font-black',
      activeGlow: 'bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.25)]',
      activeText: 'text-indigo-300',
      border: 'border-indigo-500/50',
      dotColor: 'bg-indigo-400',
    },
  },
  GAME_OVER: {
    key: 'GAME_OVER',
    label: 'Game Over',
    shortLabel: 'OVER',
    icon: Award,
    description: 'Game completed! Winner has been declared.',
    colorScheme: {
      activeBadge: 'bg-amber-400 text-zinc-950 font-black',
      activeGlow: 'bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.25)]',
      activeText: 'text-amber-200',
      border: 'border-amber-400/50',
      dotColor: 'bg-amber-400',
    },
  },
};

const STANDARD_PHASE_ORDER: GamePhase[] = ['UP', 'DRAW', 'ENER', 'GROW', 'MAIN', 'ATTACK', 'END'];

interface PhaseIndicatorProps {
  currentPhase: GamePhase;
  turnNumber: number;
  activePlayerName: string;
  activePlayerId: 1 | 2;
  onAdvancePhase?: () => void;
  onOpenBattleDebug?: () => void;
  isWinnerDeclared?: boolean;
  compactHeaderOnly?: boolean;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  turnNumber,
  activePlayerName,
  activePlayerId,
  onAdvancePhase,
  onOpenBattleDebug,
  isWinnerDeclared = false,
  compactHeaderOnly = false,
}) => {
  const currentConfig = PHASE_CONFIGS[currentPhase] || PHASE_CONFIGS.MAIN;
  const CurrentIcon = currentConfig.icon;

  if (compactHeaderOnly) {
    return (
      <div className="flex items-center space-x-1 bg-zinc-950/90 px-2.5 py-1 rounded-xl border border-zinc-800">
        {STANDARD_PHASE_ORDER.map((phaseKey) => {
          const isActive = currentPhase === phaseKey;
          const config = PHASE_CONFIGS[phaseKey];
          return (
            <span
              key={phaseKey}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                isActive
                  ? `${config.colorScheme.activeBadge} shadow-sm animate-pulse`
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={`${config.label}: ${config.description}`}
            >
              {config.shortLabel}
            </span>
          );
        })}
      </div>
    );
  }

  const currentIndex = STANDARD_PHASE_ORDER.indexOf(currentPhase);

  return (
    <div
      className={`relative w-full rounded-2xl border p-3 sm:p-4 backdrop-blur-md transition-all duration-300 overflow-hidden ${currentConfig.colorScheme.activeGlow} ${currentConfig.colorScheme.border} bg-zinc-950/90`}
    >
      {/* Background Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Active Phase Badge & Dynamic Engine Description */}
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${currentConfig.colorScheme.activeBadge} ${currentConfig.colorScheme.border}`}
          >
            <CurrentIcon className="h-5 w-5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                Turn {turnNumber} • {activePlayerName}
              </span>
              <h3 className={`text-sm sm:text-base font-extrabold ${currentConfig.colorScheme.activeText}`}>
                {currentConfig.label}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              {currentConfig.description}
            </p>
          </div>
        </div>

        {/* Right: Proceed Phase & Battle Debug Action Buttons */}
        {!isWinnerDeclared && currentPhase !== 'MULLIGAN' && (
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            {onOpenBattleDebug && (
              <button
                type="button"
                onClick={onOpenBattleDebug}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-rose-300 font-bold text-xs border border-rose-500/40 shadow-sm flex items-center gap-1.5 transition-all"
                title="Inspect 3-lane combat predictions & power calculations"
              >
                <Sword className="h-3.5 w-3.5 text-rose-400" />
                <span>Debug Battle</span>
              </button>
            )}

            {onAdvancePhase && (
              <button
                type="button"
                onClick={onAdvancePhase}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all border border-rose-400/30"
              >
                <span>
                  {currentPhase === 'END' ? 'Pass Turn to Opponent' : `Proceed to Next Phase`}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[10px] font-mono font-normal hidden sm:inline">
                  Space
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Phase Sequence Stepper Flow */}
      {currentPhase !== 'MULLIGAN' && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          {STANDARD_PHASE_ORDER.map((phaseKey, idx) => {
            const isCurrent = currentPhase === phaseKey;
            const isPassed = currentIndex > -1 && idx < currentIndex;
            const config = PHASE_CONFIGS[phaseKey];
            const StepIcon = config.icon;

            return (
              <React.Fragment key={phaseKey}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all shrink-0 ${
                    isCurrent
                      ? `${config.colorScheme.activeBadge} ${config.colorScheme.border} scale-105 shadow-md`
                      : isPassed
                      ? 'bg-zinc-900/80 text-emerald-400 border-emerald-900/40 opacity-70'
                      : 'bg-zinc-950 text-zinc-500 border-zinc-800/60'
                  }`}
                  title={`${config.label}: ${config.description}`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{config.shortLabel}</span>
                </div>

                {idx < STANDARD_PHASE_ORDER.length - 1 && (
                  <div
                    className={`h-0.5 min-w-[8px] flex-1 rounded ${
                      isPassed ? 'bg-emerald-600/60' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
