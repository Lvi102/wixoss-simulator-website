import React, { useState } from 'react';
import { GameState, SigniSlot } from '../types/game';
import { executeAttack, createLog, cloneGameState } from '../utils/gameEngine';
import {
  Sword,
  Shield,
  Zap,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Flame,
  Plus,
  RotateCcw,
} from 'lucide-react';

interface BattleDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
}

export const BattleDebugModal: React.FC<BattleDebugModalProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
}) => {
  if (!isOpen) return null;

  const activeP = gameState.activePlayer === 1 ? gameState.player1 : gameState.player2;
  const defP = gameState.activePlayer === 1 ? gameState.player2 : gameState.player1;

  const slots: SigniSlot[] = ['left', 'center', 'right'];

  // Quick power buff for debugging
  const handleApplyPowerBuff = (slot: SigniSlot, bonus: number) => {
    const nextState: GameState = cloneGameState(gameState);
    const p = nextState.activePlayer === 1 ? nextState.player1 : nextState.player2;
    const signiInst = p.signiZones[slot];
    if (signiInst) {
      signiInst.powerBonus += bonus;
      nextState.log.unshift(
        createLog(
          p.id,
          `🛠️ [Debug Battle] Added +${bonus} Power Bonus to SIGNI "${signiInst.card.name}" on ${slot.toUpperCase()} lane! (Total Power: ${
            signiInst.card.power + signiInst.powerBonus
          })`,
          'action'
        )
      );
      setGameState(nextState);
    }
  };

  // Quick attack execution
  const handleExecuteAttackInDebug = (slot: SigniSlot | 'lrig') => {
    const next = executeAttack(gameState, slot);
    setGameState(next);
  };

  // Check LRIG Guard Availability
  const defenderGuardCards = defP.hand.filter((c) => c.guard);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-zinc-950 border-2 border-rose-500/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-950/80 via-zinc-900 to-amber-950/80 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-lg">
              <Sword className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Battle Inspector & Combat Debugger
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Phase: {gameState.phase}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Turn {gameState.turn} • Attacker: <strong className="text-zinc-200">{activeP.name}</strong> vs Defender: <strong className="text-zinc-200">{defP.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Rules Banner */}
          <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 space-y-1">
              <p className="font-bold text-amber-300">Official WIXOSS Combat Rules Reference:</p>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                <li><strong>SIGNI Battle:</strong> Attacker Power ≥ Defender Power → Opposing SIGNI is <strong>Banished to Ener Zone</strong> (+1 Ener to Defender).</li>
                <li><strong>Direct Attack:</strong> Empty opposing SIGNI lane → 1 Direct Hit to Defender's Life Cloth (triggers Check Zone & Life Burst).</li>
                <li><strong>LRIG Attack:</strong> Defender may play a [Guard] card from hand to nullify the attack. Otherwise deals 1 Life Cloth damage.</li>
                <li><strong>Turn 1 Restrictions:</strong> 1st Player cannot attack on Turn 1. 2nd Player can perform max 1 attack on Turn 1.</li>
              </ul>
            </div>
          </div>

          {/* 3 SIGNI Lanes Combat Analysis Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <Flame className="h-4 w-4" /> SIGNI Lane Battles Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const atkSigni = activeP.signiZones[slot];
                const defSigni = defP.signiZones[slot];

                const atkTotalPower = atkSigni ? atkSigni.card.power + atkSigni.powerBonus : 0;
                const defTotalPower = defSigni ? defSigni.card.power + defSigni.powerBonus : 0;

                // Determine predicted combat outcome
                let outcomeType: 'banish' | 'resisted' | 'direct' | 'empty' = 'empty';
                if (atkSigni) {
                  if (defSigni) {
                    outcomeType = atkTotalPower >= defTotalPower ? 'banish' : 'resisted';
                  } else {
                    outcomeType = 'direct';
                  }
                }

                return (
                  <div
                    key={slot}
                    className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-4 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                        {slot.toUpperCase()} LANE
                      </span>
                      {outcomeType === 'banish' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          💥 BANISH TO ENER
                        </span>
                      )}
                      {outcomeType === 'resisted' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          🛡️ RESISTED
                        </span>
                      )}
                      {outcomeType === 'direct' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/40">
                          ⚡ DIRECT HIT
                        </span>
                      )}
                      {outcomeType === 'empty' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-500">
                          EMPTY
                        </span>
                      )}
                    </div>

                    {/* Attacker SIGNI Card Details */}
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-rose-400 font-bold">
                        <span>ATTACKER ({activeP.name})</span>
                        <span>{atkSigni ? (atkSigni.isUp ? 'UP' : 'DOWN') : 'NO CARD'}</span>
                      </div>
                      {atkSigni ? (
                        <div>
                          <p className="text-xs font-extrabold text-white truncate">{atkSigni.card.name}</p>
                          <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                            <span className="text-zinc-400">Power:</span>
                            <span className="font-bold text-amber-300">
                              {atkTotalPower.toLocaleString()} ({atkSigni.card.power} + {atkSigni.powerBonus})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">Lane is empty</p>
                      )}
                    </div>

                    <div className="text-center text-xs font-black text-rose-500 my-1">
                      VS
                    </div>

                    {/* Defender SIGNI Card Details */}
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-sky-400 font-bold">
                        <span>DEFENDER ({defP.name})</span>
                        <span>{defSigni ? (defSigni.isUp ? 'UP' : 'DOWN') : 'EMPTY LANE'}</span>
                      </div>
                      {defSigni ? (
                        <div>
                          <p className="text-xs font-extrabold text-white truncate">{defSigni.card.name}</p>
                          <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                            <span className="text-zinc-400">Power:</span>
                            <span className="font-bold text-sky-300">
                              {defTotalPower.toLocaleString()} ({defSigni.card.power} + {defSigni.powerBonus})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-400 font-semibold italic">Open lane! Direct attack target!</p>
                      )}
                    </div>

                    {/* Power Buff Debugger Tools */}
                    {atkSigni && (
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-zinc-500 font-mono">Test Buff:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplyPowerBuff(slot, 1000)}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-bold"
                          >
                            +1k
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPowerBuff(slot, 3000)}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-bold"
                          >
                            +3k
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPowerBuff(slot, 5000)}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-bold"
                          >
                            +5k
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Direct Attack Button */}
                    {atkSigni && atkSigni.isUp && gameState.phase === 'ATTACK' && (
                      <button
                        type="button"
                        onClick={() => handleExecuteAttackInDebug(slot)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all mt-2"
                      >
                        <Sword className="h-3.5 w-3.5" /> Execute Attack
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LRIG Battle Analysis */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Center LRIG Attack & Guard Inspection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-white">Attacking LRIG</span>
                  <span className="text-[10px] font-mono font-bold text-rose-400">
                    {activeP.lrigZone.center?.isUp ? 'UP (Ready to Attack)' : 'DOWN (Tapped)'}
                  </span>
                </div>
                {activeP.lrigZone.center ? (
                  <div className="text-xs">
                    <p className="font-bold text-rose-300">{activeP.lrigZone.center.card.name}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Level {activeP.lrigZone.center.card.level} • {activeP.lrigZone.center.card.color} • Limit {activeP.lrigZone.center.card.lrigLimit || 0}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 italic">No LRIG in Center Zone</p>
                )}
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-white">Defender Guard Cards ({defP.name})</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {defenderGuardCards.length > 0 ? `${defenderGuardCards.length} Guard Card(s)` : 'No Guard Cards'}
                  </span>
                </div>
                {defenderGuardCards.length > 0 ? (
                  <div className="text-xs space-y-1">
                    {defenderGuardCards.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{c.name} (Guard)</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-zinc-400 italic mt-1">
                      Defender will automatically play 1 Guard card to nullify LRIG attack!
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-rose-400 font-semibold italic">
                    Defender has no Guard in hand! LRIG attack will deal 1 Direct Hit to Life Cloth!
                  </p>
                )}
              </div>
            </div>

            {activeP.lrigZone.center?.isUp && gameState.phase === 'ATTACK' && (
              <button
                type="button"
                onClick={() => handleExecuteAttackInDebug('lrig')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:brightness-110 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition-all"
              >
                <Sword className="h-4 w-4" /> Declare LRIG Attack Now
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
