import { WixossCard, WixossDeck, LifeBurstFormat, WixossColor } from '../types/wixoss';
import { GameState, PlayerGameState, CardInstance, SigniSlot, GameLogEntry } from '../types/game';
import { shuffleDeck } from './deckUtils';

export function createLog(playerId: 1 | 2, message: string, type: GameLogEntry['type']): GameLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    playerId,
    message,
    type,
  };
}

function setupLrigTeam(
  lrigs: WixossCard[],
  playerPrefix: string,
  cardCatalog?: WixossCard[]
): {
  center: CardInstance | null;
  assistLeft: CardInstance | null;
  assistRight: CardInstance | null;
  remainingLrigs: WixossCard[];
} {
  const allLrigs = [...lrigs];

  // Auto-resolve missing Level 0 assist LRIGs from catalog if present
  if (cardCatalog && cardCatalog.length > 0) {
    const existingIds = new Set(allLrigs.map((c) => c.id));
    const assistLrigTypes = new Set<string>();

    allLrigs.forEach((c) => {
      if (c.cardType === 'LRIG' && c.lrigType && !c.effectText?.toLowerCase().includes('center lrig')) {
        assistLrigTypes.add(c.lrigType);
      }
    });

    assistLrigTypes.forEach((ltype) => {
      const hasLvl0 = allLrigs.some((c) => c.cardType === 'LRIG' && c.level === 0 && c.lrigType === ltype);
      if (!hasLvl0) {
        const catLvl0 = cardCatalog.find(
          (c) => c.cardType === 'LRIG' && c.level === 0 && c.lrigType === ltype && !existingIds.has(c.id)
        );
        if (catLvl0) {
          allLrigs.push(catLvl0);
          existingIds.add(catLvl0.id);
        }
      }
    });
  }

  const lrig0s = allLrigs.filter((c) => c.cardType === 'LRIG' && c.level === 0);

  // Center Lvl 0 is explicitly marked [Center LRIG] or is non-assist, or team lead
  const centerCard =
    lrig0s.find(
      (c) =>
        c.effectText?.toLowerCase().includes('center lrig') ||
        c.lrigType === 'At' ||
        c.lrigType === 'Hirana'
    ) ||
    lrig0s.find((c) => !c.effectText?.toLowerCase().includes('assist lrig')) ||
    lrig0s[0] ||
    allLrigs[0];

  const assistCandidates = lrig0s.filter((c) => c.id !== centerCard?.id);
  const assistLeftCard = assistCandidates[0] || null;
  const assistRightCard = assistCandidates[1] || null;

  const usedIds = new Set([centerCard?.id, assistLeftCard?.id, assistRightCard?.id].filter(Boolean));
  const remainingLrigs = allLrigs.filter((c) => !usedIds.has(c.id));

  const createInst = (card: WixossCard | null, tag: string): CardInstance | null => {
    if (!card) return null;
    return {
      instanceId: `${playerPrefix}-${tag}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      card,
      isUp: true,
      powerBonus: 0,
      usedAbilities: { enterUsed: false, autoTriggered: false, constActive: true, actionUsed: false },
    };
  };

  return {
    center: createInst(centerCard, 'center'),
    assistLeft: createInst(assistLeftCard, 'assistLeft'),
    assistRight: createInst(assistRightCard, 'assistRight'),
    remainingLrigs,
  };
}

export function initGame(
  mode: 'hotseat' | 'split' | 'solitaire_ai',
  p1Deck: WixossDeck,
  p2Deck: WixossDeck,
  cardCatalog: WixossCard[],
  lifeBurstRuleOverride?: LifeBurstFormat
): GameState {
  const cardMap = new Map<string, WixossCard>();
  cardCatalog.forEach((c) => cardMap.set(c.id, c));

  const lifeBurstRule = lifeBurstRuleOverride || p1Deck.formatRules || p2Deck.formatRules || 'standard';

  // Prepare Player 1
  const p1Lrigs = p1Deck.lrigDeckCardIds.map((id) => cardMap.get(id)!).filter(Boolean);
  const p1MainRaw = p1Deck.mainDeckCardIds.map((id) => cardMap.get(id)!).filter(Boolean);
  const p1MainShuffled = shuffleDeck(p1MainRaw);

  const p1Team = setupLrigTeam(p1Lrigs, 'p1', cardCatalog);

  // In WIXOSS Rules: 7 Life Cloth & 5 Initial Hand Cards dealt
  const lifeClothCount = 7;
  const initialHandCount = 5;

  // 7 Life Cloth, 5 initial hand
  const p1LifeCloth = p1MainShuffled.slice(0, lifeClothCount);
  const p1Hand = p1MainShuffled.slice(lifeClothCount, lifeClothCount + initialHandCount);
  const p1DeckRemaining = p1MainShuffled.slice(lifeClothCount + initialHandCount);

  // Prepare Player 2
  const p2Lrigs = p2Deck.lrigDeckCardIds.map((id) => cardMap.get(id)!).filter(Boolean);
  const p2MainRaw = p2Deck.mainDeckCardIds.map((id) => cardMap.get(id)!).filter(Boolean);
  const p2MainShuffled = shuffleDeck(p2MainRaw);

  const p2Team = setupLrigTeam(p2Lrigs, 'p2', cardCatalog);

  const p2LifeCloth = p2MainShuffled.slice(0, lifeClothCount);
  const p2Hand = p2MainShuffled.slice(lifeClothCount, lifeClothCount + initialHandCount);
  const p2DeckRemaining = p2MainShuffled.slice(lifeClothCount + initialHandCount);

  const player1: PlayerGameState = {
    id: 1,
    name: 'Player 1',
    avatarColor: 'red',
    lrigDeck: p1Team.remainingLrigs,
    mainDeck: p1DeckRemaining,
    hand: p1Hand,
    enerZone: [],
    lifeCloth: p1LifeCloth,
    checkZone: [],
    trash: [],
    lrigZone: {
      center: p1Team.center,
      assistLeft: p1Team.assistLeft,
      assistRight: p1Team.assistRight,
      piece: null,
    },
    signiZones: { left: null, center: null, right: null },
    coinCount: 2,
    mulliganCompleted: false,
  };

  const player2: PlayerGameState = {
    id: 2,
    name: mode === 'solitaire_ai' ? 'AI LRIG' : 'Player 2',
    avatarColor: 'blue',
    lrigDeck: p2Team.remainingLrigs,
    mainDeck: p2DeckRemaining,
    hand: p2Hand,
    enerZone: [],
    lifeCloth: p2LifeCloth,
    checkZone: [],
    trash: [],
    lrigZone: {
      center: p2Team.center,
      assistLeft: p2Team.assistLeft,
      assistRight: p2Team.assistRight,
      piece: null,
    },
    signiZones: { left: null, center: null, right: null },
    coinCount: 2,
    mulliganCompleted: false,
  };

  const ruleLabel = '🎯 Standard WIXOSS Life Burst Rules';

  const initialLogs: GameLogEntry[] = [
    createLog(1, `Game initialized in ${ruleLabel}. 7 Life Cloth and 5 Initial Hand cards dealt.`, 'system'),
    createLog(
      1,
      `Player 1 Diva Selection Team deployed: Center [${p1Team.center?.card.name || 'None'}], Assist Left [${p1Team.assistLeft?.card.name || 'None'}], Assist Right [${p1Team.assistRight?.card.name || 'None'}].`,
      'system'
    ),
    createLog(
      2,
      `${player2.name} Diva Selection Team deployed: Center [${p2Team.center?.card.name || 'None'}], Assist Left [${p2Team.assistLeft?.card.name || 'None'}], Assist Right [${p2Team.assistRight?.card.name || 'None'}].`,
      'system'
    ),
    createLog(1, '=== Mulligan Phase: Select cards from opening hand to redraw, or Keep Hand ===', 'phase'),
  ];

  return {
    gameId: `game-${Date.now()}`,
    mode,
    lifeBurstRule,
    turn: 1,
    activePlayer: 1,
    phase: 'MULLIGAN',
    winner: null,
    attackState: null,
    turnAttacksCount: 0,
    log: initialLogs,
    player1,
    player2,
    history: [],
    startTime: Date.now(),
  };
}

// Safely deep clones a GameState object without serializing nested history arrays
export function cloneGameState(state: GameState): GameState {
  const { history, ...rest } = state;
  const clonedRest: Omit<GameState, 'history'> = JSON.parse(JSON.stringify(rest));
  return {
    ...clonedRest,
    history: state.history || [],
  };
}

// Generates a clean history stack with history stripped from snapshot items to prevent exponential nesting
export function pushHistory(state: GameState): GameState[] {
  const { history, ...rest } = state;
  const snapshot: GameState = {
    ...JSON.parse(JSON.stringify(rest)),
    history: [],
  };
  return [snapshot, ...(state.history || []).slice(0, 49)];
}

export function performMulligan(
  state: GameState,
  playerId: 1 | 2,
  cardIdsToDiscard: string[]
): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;

  if (p.mulliganCompleted) {
    return state;
  }

  const discardCount = cardIdsToDiscard.length;

  if (discardCount > 0) {
    // 1. Identify discarded cards from hand
    const discardedCards: WixossCard[] = [];
    p.hand = p.hand.filter((card) => {
      if (cardIdsToDiscard.includes(card.id)) {
        discardedCards.push(card);
        return false;
      }
      return true;
    });

    // 2. Draw equal number of new cards from mainDeck
    const redrawnCards: WixossCard[] = [];
    for (let i = 0; i < discardCount; i++) {
      if (p.mainDeck.length > 0) {
        const newCard = p.mainDeck.shift()!;
        p.hand.push(newCard);
        redrawnCards.push(newCard);
      }
    }

    // 3. Put discarded cards back into mainDeck and shuffle mainDeck
    p.mainDeck.push(...discardedCards);
    p.mainDeck = shuffleDeck(p.mainDeck);

    nextState.log.unshift(
      createLog(
        playerId,
        `🃏 Mulligan: ${p.name} returned ${discardCount} card(s) to deck, drew ${redrawnCards.length} new card(s), and shuffled main deck (${p.mainDeck.length} cards).`,
        'action'
      )
    );
  } else {
    nextState.log.unshift(
      createLog(playerId, `🃏 Mulligan: ${p.name} kept opening hand (${p.hand.length} cards).`, 'action')
    );
  }

  p.mulliganCompleted = true;

  // Check if both players (or single player + AI) completed Mulligan
  if (nextState.mode === 'solitaire_ai' && playerId === 1) {
    // Auto-complete Mulligan for AI (keep hand)
    nextState.player2.mulliganCompleted = true;
    nextState.log.unshift(createLog(2, `🃏 Mulligan: AI LRIG kept opening hand.`, 'action'));
  }

  if (nextState.player1.mulliganCompleted && nextState.player2.mulliganCompleted) {
    nextState.phase = 'UP';
    nextState.activePlayer = 1;
    nextState.log.unshift(createLog(1, '=== Mulligan Phase Complete! Turn 1 - Player 1 Up Phase. ===', 'phase'));
  } else if (playerId === 1 && !nextState.player2.mulliganCompleted) {
    nextState.activePlayer = 2;
    nextState.log.unshift(createLog(2, `=== ${nextState.player2.name}'s turn for Mulligan Phase ===`, 'phase'));
  }

  return nextState;
}

export function advancePhase(currentState: GameState): GameState {
  // Push state to history for undo before mutating
  const nextState: GameState = cloneGameState(currentState);
  nextState.history = pushHistory(currentState);

  const activeP = nextState.activePlayer === 1 ? nextState.player1 : nextState.player2;
  const oppP = nextState.activePlayer === 1 ? nextState.player2 : nextState.player1;

  switch (nextState.phase) {
    case 'MULLIGAN': {
      // Advance mulligan for current active player (keep hand with 0 cards discarded)
      return performMulligan(currentState, nextState.activePlayer, []);
    }

    case 'UP': {
      // Untap all active player SIGNI & LRIG and reset turn-based abilities
      if (activeP.lrigZone.center) {
        activeP.lrigZone.center.isUp = true;
        if (!activeP.lrigZone.center.usedAbilities) {
          activeP.lrigZone.center.usedAbilities = {};
        }
        activeP.lrigZone.center.usedAbilities.actionUsed = false;
        activeP.lrigZone.center.usedAbilities.autoTriggered = false;
      }
      if (activeP.lrigZone.assistLeft) activeP.lrigZone.assistLeft.isUp = true;
      if (activeP.lrigZone.assistRight) activeP.lrigZone.assistRight.isUp = true;

      (['left', 'center', 'right'] as SigniSlot[]).forEach((slot) => {
        if (activeP.signiZones[slot]) {
          activeP.signiZones[slot]!.isUp = true;
        }
      });

      nextState.phase = 'DRAW';
      nextState.log.unshift(createLog(activeP.id, `Advanced to Draw Phase.`, 'phase'));
      break;
    }

    case 'DRAW': {
      // Draw 2 cards (or 1 on Player 1 Turn 1)
      const drawAmount = nextState.turn === 1 && activeP.id === 1 ? 1 : 2;
      const drawnCards: WixossCard[] = [];

      for (let i = 0; i < drawAmount; i++) {
        if (activeP.mainDeck.length > 0) {
          const card = activeP.mainDeck.shift()!;
          activeP.hand.push(card);
          drawnCards.push(card);
        }
      }

      nextState.phase = 'ENER';
      nextState.log.unshift(
        createLog(
          activeP.id,
          `Drew ${drawnCards.length} card(s) from deck. Hand size: ${activeP.hand.length}.`,
          'action'
        )
      );
      break;
    }

    case 'ENER': {
      nextState.phase = 'GROW';
      nextState.log.unshift(createLog(activeP.id, `Ener Phase complete. Proceeding to Grow Phase.`, 'phase'));
      break;
    }

    case 'GROW': {
      nextState.phase = 'MAIN';
      nextState.log.unshift(createLog(activeP.id, `Grow Phase complete. Proceeding to Main Phase.`, 'phase'));
      break;
    }

    case 'MAIN': {
      nextState.phase = 'ATTACK';
      nextState.log.unshift(createLog(activeP.id, `Entering Attack Phase! Prepare for battle!`, 'phase'));
      break;
    }

    case 'ATTACK': {
      nextState.phase = 'END';
      nextState.log.unshift(createLog(activeP.id, `Attack Phase complete. Entering End Phase.`, 'phase'));
      break;
    }

    case 'END': {
      // Discard down to 6 if hand size > 6
      while (activeP.hand.length > 6) {
        const discarded = activeP.hand.pop()!;
        activeP.trash.push(discarded);
      }

      // Switch active player
      nextState.activePlayer = nextState.activePlayer === 1 ? 2 : 1;
      if (nextState.activePlayer === 1) {
        nextState.turn += 1;
      }
      nextState.turnAttacksCount = 0;

      nextState.phase = 'UP';
      const newActiveP = nextState.activePlayer === 1 ? nextState.player1 : nextState.player2;
      nextState.log.unshift(
        createLog(
          newActiveP.id,
          `--- Turn ${nextState.turn}: ${newActiveP.name}'s turn starts! ---`,
          'phase'
        )
      );
      break;
    }

    default:
      break;
  }

  return nextState;
}

// Play a SIGNI card from hand to field
export function playSigni(
  state: GameState,
  cardId: string,
  slot: SigniSlot
): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const activeP = nextState.activePlayer === 1 ? nextState.player1 : nextState.player2;
  const currentLrigLevel = activeP.lrigZone.center?.card.level || 0;

  const handIdx = activeP.hand.findIndex((c) => c.id === cardId);
  if (handIdx === -1) return state;

  const card = activeP.hand[handIdx];
  if (card.cardType !== 'SIGNI') return state;

  // Level restriction check
  if (card.level > currentLrigLevel) {
    nextState.log.unshift(
      createLog(
        activeP.id,
        `Cannot play level ${card.level} SIGNI "${card.name}"! Current LRIG level is ${currentLrigLevel}.`,
        'system'
      )
    );
    return nextState;
  }

  // Remove existing SIGNI in slot if any (move to trash)
  if (activeP.signiZones[slot]) {
    activeP.trash.push(activeP.signiZones[slot]!.card);
  }

  // Remove from hand, place on field UP
  activeP.hand.splice(handIdx, 1);
  activeP.signiZones[slot] = {
    instanceId: `inst-${Date.now()}-${slot}`,
    card,
    isUp: true,
    powerBonus: 0,
  };

  nextState.log.unshift(
    createLog(
      activeP.id,
      `Summoned SIGNI "${card.name}" (Lvl ${card.level}, Power ${card.power}) to ${slot.toUpperCase()} zone.`,
      'action'
    )
  );

  return nextState;
}

// Charge Ener from hand to Ener Zone
export function chargeEner(state: GameState, cardId: string): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const activeP = nextState.activePlayer === 1 ? nextState.player1 : nextState.player2;
  const handIdx = activeP.hand.findIndex((c) => c.id === cardId);

  if (handIdx !== -1) {
    const card = activeP.hand.splice(handIdx, 1)[0];
    activeP.enerZone.push(card);
    nextState.log.unshift(
      createLog(activeP.id, `Charged card "${card.name}" (${card.color}) to Ener Zone. Ener count: ${activeP.enerZone.length}.`, 'action')
    );
  }

  return nextState;
}

export function determineLrigZone(
  card: WixossCard,
  lrigZone: PlayerGameState['lrigZone']
): 'center' | 'assistLeft' | 'assistRight' {
  if (lrigZone.center && card.lrigType && lrigZone.center.card.lrigType === card.lrigType) {
    return 'center';
  }
  if (lrigZone.assistLeft && card.lrigType && lrigZone.assistLeft.card.lrigType === card.lrigType) {
    return 'assistLeft';
  }
  if (lrigZone.assistRight && card.lrigType && lrigZone.assistRight.card.lrigType === card.lrigType) {
    return 'assistRight';
  }

  const centerLvl = lrigZone.center?.card.level ?? -1;
  const assistLeftLvl = lrigZone.assistLeft?.card.level ?? -1;
  const assistRightLvl = lrigZone.assistRight?.card.level ?? -1;

  if (card.level === centerLvl + 1 && card.level <= 3 && !card.effectText?.toLowerCase().includes('assist lrig')) {
    return 'center';
  }
  if (card.level === assistLeftLvl + 1 && card.level <= 2) {
    return 'assistLeft';
  }
  if (card.level === assistRightLvl + 1 && card.level <= 2) {
    return 'assistRight';
  }

  return 'center';
}

export interface ParsedEnerCost {
  total: number;
  colorRequirements: Partial<Record<WixossColor, number>>;
}

export function parseEnerCost(costStr?: string): ParsedEnerCost {
  if (!costStr || costStr.trim() === '' || costStr === 'Free') {
    return { total: 0, colorRequirements: {} };
  }

  const trimmed = costStr.trim();

  // Pure integer string e.g. "0", "1", "5", "15"
  if (/^\d+$/.test(trimmed)) {
    const amount = parseInt(trimmed, 10);
    return {
      total: amount,
      colorRequirements: amount > 0 ? { Colorless: amount } : {},
    };
  }

  const parts = trimmed.split(',').map((s) => s.trim());
  let total = 0;
  const colorRequirements: Partial<Record<WixossColor, number>> = {};

  for (const part of parts) {
    if (!part) continue;

    // Matches "Color x N" e.g. "Red x 2", "Colorless x 15", "Blue x 0"
    const colorMatch = part.match(/([A-Za-z]+)\s*x\s*(\d+)/i);
    if (colorMatch) {
      const rawColor = colorMatch[1].trim();
      const amount = parseInt(colorMatch[2], 10);
      total += amount;

      if (amount > 0) {
        const colorFormatted = (rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase()) as WixossColor;
        colorRequirements[colorFormatted] = (colorRequirements[colorFormatted] || 0) + amount;
      }
      continue;
    }

    // Matches standalone number in a comma-separated list e.g. "Red x 2, 13" -> 13 colorless
    const numMatch = part.match(/^(\d+)$/);
    if (numMatch) {
      const amount = parseInt(numMatch[1], 10);
      total += amount;
      if (amount > 0) {
        colorRequirements['Colorless'] = (colorRequirements['Colorless'] || 0) + amount;
      }
      continue;
    }
  }

  return { total, colorRequirements };
}

export function payEnerCost(
  player: PlayerGameState,
  costStr?: string
): { success: boolean; errorMsg?: string; paidCount: number } {
  const { total, colorRequirements } = parseEnerCost(costStr);
  if (total === 0) return { success: true, paidCount: 0 };

  if (player.enerZone.length < total) {
    return {
      success: false,
      errorMsg: `Insufficient Ener! Cost requires ${total} Ener card(s) (${costStr || 'Required Cost'}), but you only have ${player.enerZone.length} in Ener Zone.`,
      paidCount: 0,
    };
  }

  const tempEnerZone = [...player.enerZone];
  const toDeductIndices: number[] = [];

  // Check specific colored costs first
  for (const [colorKey, reqAmount] of Object.entries(colorRequirements)) {
    if (colorKey === 'Colorless' || !reqAmount || reqAmount <= 0) continue;
    let needed = reqAmount;

    // 1. Match exact color
    for (let i = 0; i < tempEnerZone.length; i++) {
      if (needed <= 0) break;
      if (toDeductIndices.includes(i)) continue;
      if (tempEnerZone[i].color === colorKey) {
        toDeductIndices.push(i);
        needed--;
      }
    }

    // 2. Match multi-ener / guard cards for remaining required colored cost
    for (let i = 0; i < tempEnerZone.length; i++) {
      if (needed <= 0) break;
      if (toDeductIndices.includes(i)) continue;
      if (tempEnerZone[i].guard) { // Multi-Ener Guard cards
        toDeductIndices.push(i);
        needed--;
      }
    }

    if (needed > 0) {
      return {
        success: false,
        errorMsg: `Insufficient ${colorKey} Ener! Cost requires ${reqAmount} ${colorKey} Ener card(s) (${costStr}).`,
        paidCount: 0,
      };
    }
  }

  // Fill remaining required total with any remaining Ener cards for Colorless cost
  for (let i = 0; i < tempEnerZone.length && toDeductIndices.length < total; i++) {
    if (!toDeductIndices.includes(i)) {
      toDeductIndices.push(i);
    }
  }

  if (toDeductIndices.length < total) {
    return {
      success: false,
      errorMsg: `Insufficient Ener! Requires ${total} Ener card(s) (${costStr}).`,
      paidCount: 0,
    };
  }

  // Deduct chosen cards from highest index to lowest
  toDeductIndices.sort((a, b) => b - a);
  for (const idx of toDeductIndices) {
    const [card] = player.enerZone.splice(idx, 1);
    player.trash.push(card);
  }

  return { success: true, paidCount: total };
}

// Grow LRIG level up (Center, Assist Left, or Assist Right)
export function growLrig(
  state: GameState,
  lrigCardId: string,
  targetZoneOverride?: 'center' | 'assistLeft' | 'assistRight',
  growingPlayerId?: number
): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const pId = growingPlayerId || nextState.activePlayer;
  const activeP = pId === 1 ? nextState.player1 : nextState.player2;
  const oppP = pId === 1 ? nextState.player2 : nextState.player1;

  const lrigIdx = activeP.lrigDeck.findIndex((c) => c.id === lrigCardId);
  if (lrigIdx === -1) return state;

  const newLrig = activeP.lrigDeck[lrigIdx];
  const targetZone = targetZoneOverride || determineLrigZone(newLrig, activeP.lrigZone);

  const currentInst = activeP.lrigZone[targetZone];
  const currentLevel = currentInst?.card.level ?? 0;

  if (newLrig.level !== currentLevel + 1) {
    nextState.log.unshift(
      createLog(
        activeP.id,
        `Invalid grow! ${targetZone.toUpperCase()} LRIG level must progress step-by-step from Level ${currentLevel} to Level ${currentLevel + 1}.`,
        'system'
      )
    );
    return nextState;
  }

  // Phase & Rule restriction checks
  if (targetZone === 'center') {
    if (nextState.phase !== 'GROW') {
      nextState.log.unshift(
        createLog(activeP.id, `Center LRIG can only grow during the Grow Phase!`, 'system')
      );
      return nextState;
    }
    if (newLrig.level > nextState.turn) {
      nextState.log.unshift(
        createLog(
          activeP.id,
          `Cannot Grow Center LRIG to Level ${newLrig.level} on Turn ${nextState.turn}! (Level 1 requires Turn 1+, Level 2 requires Turn 2+, Level 3 requires Turn 3+).`,
          'system'
        )
      );
      return nextState;
    }
  } else if (targetZone === 'assistLeft' || targetZone === 'assistRight') {
    if (nextState.phase === 'GROW') {
      nextState.log.unshift(
        createLog(
          activeP.id,
          `Assist LRIGs CANNOT grow during the Grow Phase! (Assist LRIGs grow during Main or Attack Phase).`,
          'system'
        )
      );
      return nextState;
    }
    if (nextState.phase !== 'MAIN' && nextState.phase !== 'ATTACK') {
      nextState.log.unshift(
        createLog(
          activeP.id,
          `Assist LRIGs can only grow during Main or Attack Phase!`,
          'system'
        )
      );
      return nextState;
    }
  }

  // Pay Grow Ener Cost using exact cost parsing
  const payResult = payEnerCost(activeP, newLrig.cost);
  if (!payResult.success) {
    nextState.log.unshift(
      createLog(activeP.id, `❌ Cannot Grow LRIG "${newLrig.name}": ${payResult.errorMsg}`, 'system')
    );
    return nextState;
  }

  if (payResult.paidCount > 0) {
    nextState.log.unshift(
      createLog(
        activeP.id,
        `paid ${payResult.paidCount} Ener card(s) from Ener Zone for Grow Cost (${newLrig.cost}).`,
        'action'
      )
    );
  }

  // Move LRIG card from LRIG deck to field zone
  activeP.lrigDeck.splice(lrigIdx, 1);
  const newInst: CardInstance = {
    instanceId: `lrig-inst-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    card: newLrig,
    isUp: true,
    powerBonus: 0,
    usedAbilities: {
      enterUsed: false,
      autoTriggered: false,
      constActive: true,
      actionUsed: false,
    },
  };

  activeP.lrigZone[targetZone] = newInst;

  const zoneName =
    targetZone === 'center'
      ? 'Center LRIG'
      : targetZone === 'assistLeft'
      ? 'Assist LRIG (Left)'
      : 'Assist LRIG (Right)';

  nextState.log.unshift(
    createLog(
      activeP.id,
      `✨ ${activeP.name}'s ${zoneName} GREW to Level ${newLrig.level}: "${newLrig.name}"!`,
      'grow'
    )
  );

  // Trigger [Enter] Effect Automations!
  if (newLrig.effectText) {
    const text = newLrig.effectText.toLowerCase();

    // 1. Draw cards automation
    if (text.includes('draw a card') || text.includes('draw 1 card')) {
      if (activeP.mainDeck.length > 0) {
        const drawn = activeP.mainDeck.shift()!;
        activeP.hand.push(drawn);
        nextState.log.unshift(
          createLog(activeP.id, `[Enter Effect]: ${activeP.name} drew 1 card ("${drawn.name}").`, 'action')
        );
      }
    } else if (text.includes('draw 2 cards')) {
      for (let i = 0; i < 2; i++) {
        if (activeP.mainDeck.length > 0) {
          const drawn = activeP.mainDeck.shift()!;
          activeP.hand.push(drawn);
          nextState.log.unshift(
            createLog(activeP.id, `[Enter Effect]: ${activeP.name} drew 1 card ("${drawn.name}").`, 'action')
          );
        }
      }
    }

    // 2. Ener Charge automation
    if (text.includes('ener charge 2')) {
      for (let i = 0; i < 2; i++) {
        if (activeP.mainDeck.length > 0) {
          activeP.enerZone.push(activeP.mainDeck.shift()!);
        }
      }
      nextState.log.unshift(
        createLog(activeP.id, `[Enter Effect]: ${activeP.name} performed Ener Charge 2. (Ener count: ${activeP.enerZone.length})`, 'action')
      );
    } else if (text.includes('ener charge 1')) {
      if (activeP.mainDeck.length > 0) {
        activeP.enerZone.push(activeP.mainDeck.shift()!);
        nextState.log.unshift(
          createLog(activeP.id, `[Enter Effect]: ${activeP.name} performed Ener Charge 1. (Ener count: ${activeP.enerZone.length})`, 'action')
        );
      }
    }

    // 3. Vanish opposing SIGNI automation
    if (text.includes('vanish target signi') || text.includes('vanish an opponent')) {
      const slots: SigniSlot[] = ['left', 'center', 'right'];
      for (const slot of slots) {
        const oppSigni = oppP.signiZones[slot];
        if (oppSigni) {
          const pwr = oppSigni.card.power + oppSigni.powerBonus;
          if (!text.includes('8000 or less') || pwr <= 8000) {
            oppP.enerZone.push(oppSigni.card);
            oppP.signiZones[slot] = null;
            nextState.log.unshift(
              createLog(
                activeP.id,
                `💥 [Enter Effect]: Banished opponent's SIGNI "${oppSigni.card.name}" on ${slot.toUpperCase()} lane to Ener Zone!`,
                'damage'
              )
            );
            break;
          }
        }
      }
    }
  }

  return nextState;
}

// Execute Attack Step (No max attack restrictions)
export function executeAttack(
  state: GameState,
  attackerSlot: SigniSlot | 'lrig'
): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const activeP = nextState.activePlayer === 1 ? nextState.player1 : nextState.player2;
  const defP = nextState.activePlayer === 1 ? nextState.player2 : nextState.player1;

  // WIXOSS Official Rule: 1st Player cannot attack on Turn 1!
  if (nextState.turn === 1 && activeP.id === 1) {
    nextState.log.unshift(
      createLog(
        activeP.id,
        `⚠️ Rule Restriction: Player 1 (going 1st) cannot attack on Turn 1!`,
        'system'
      )
    );
    return state;
  }

  nextState.turnAttacksCount = (nextState.turnAttacksCount || 0) + 1;

  if (attackerSlot === 'lrig') {
    const lrigInst = activeP.lrigZone.center;
    if (!lrigInst || !lrigInst.isUp) return state;

    // Tap LRIG
    lrigInst.isUp = false;
    nextState.log.unshift(createLog(activeP.id, `⚔️ LRIG "${lrigInst.card.name}" declares attack!`, 'attack'));

    // Check if defender has Guard in hand
    const guardIdx = defP.hand.findIndex((c) => c.guard);
    if (guardIdx !== -1) {
      // Auto-Guard or prompt Guard!
      const guardCard = defP.hand.splice(guardIdx, 1)[0];
      defP.trash.push(guardCard);
      nextState.log.unshift(
        createLog(defP.id, `🛡️ ${defP.name} played Guard card "${guardCard.name}"! LRIG attack is NULLIFIED!`, 'action')
      );
      return nextState;
    }

    // No Guard -> Deal Damage to Life Cloth
    return applyDamageToPlayer(nextState, defP.id);
  } else {
    // SIGNI Attack
    const signiInst = activeP.signiZones[attackerSlot];
    if (!signiInst || !signiInst.isUp) return state;

    // Tap SIGNI
    signiInst.isUp = false;

    // Opposing SIGNI in front slot
    const oppSigniInst = defP.signiZones[attackerSlot];

    nextState.log.unshift(
      createLog(
        activeP.id,
        `⚔️ SIGNI "${signiInst.card.name}" (Power ${signiInst.card.power + signiInst.powerBonus}) attacks on ${attackerSlot.toUpperCase()} lane!`,
        'attack'
      )
    );

    if (oppSigniInst) {
      // Battle SIGNIs!
      const attackerTotalPwr = signiInst.card.power + signiInst.powerBonus;
      const defenderTotalPwr = oppSigniInst.card.power + oppSigniInst.powerBonus;

      if (attackerTotalPwr >= defenderTotalPwr) {
        defP.enerZone.push(oppSigniInst.card);
        defP.signiZones[attackerSlot] = null;
        nextState.log.unshift(
          createLog(
            activeP.id,
            `💥 Banish! Opposing SIGNI "${oppSigniInst.card.name}" (${defenderTotalPwr} Power) was banished to Ener Zone! (+1 Ener for ${defP.name})`,
            'damage'
          )
        );
      } else {
        nextState.log.unshift(
          createLog(
            activeP.id,
            `Attack resisted! Opposing SIGNI "${oppSigniInst.card.name}" survived (${defenderTotalPwr} vs ${attackerTotalPwr} Power).`,
            'action'
          )
        );
      }
      return nextState;
    } else {
      // Direct Attack on Life Cloth!
      return applyDamageToPlayer(nextState, defP.id);
    }
  }
}

// Apply 1 damage to player's Life Cloth
function applyDamageToPlayer(state: GameState, defenderId: 1 | 2): GameState {
  const defP = defenderId === 1 ? state.player1 : state.player2;
  const atkId: 1 | 2 = defenderId === 1 ? 2 : 1;
  const rule = state.lifeBurstRule || 'standard';

  if (defP.lifeCloth.length > 0) {
    const burstCard = defP.lifeCloth.pop()!;
    defP.checkZone.push(burstCard);

    state.log.unshift(
      createLog(
        defenderId,
        `💔 Direct Hit! Life Cloth damaged! "${burstCard.name}" entered Check Zone. Remaining Life: ${defP.lifeCloth.length}.`,
        'damage'
      )
    );

    if (burstCard.lifeBurst) {
      state.log.unshift(
        createLog(
          defenderId,
          `⚡ LIFE BURST ACTIVATED! SIGNI/Spell "${burstCard.name}": ${burstCard.lifeBurstEffect || 'Burst Effect resolved!'}`,
          'burst'
        )
      );
      // Official WIXOSS rule: After Life Burst resolves, card goes to Ener Zone unless effect specifies adding to hand
      const effectStr = (burstCard.lifeBurstEffect || '').toLowerCase();
      if (effectStr.includes('hand') || effectStr.includes('draw')) {
        defP.hand.push(burstCard);
      } else {
        defP.enerZone.push(burstCard);
      }
    } else {
      defP.enerZone.push(burstCard);
    }

    // Clear check zone
    defP.checkZone = [];
  } else {
    // LIFE CLOTH IS 0 -> GAME OVER!
    state.winner = atkId;
    state.phase = 'GAME_OVER';
    state.log.unshift(
      createLog(atkId, `🏆 GAME OVER! ${atkId === 1 ? state.player1.name : state.player2.name} VICTORY! Direct attack succeeded with 0 Life Cloth remaining!`, 'system')
    );
  }

  return state;
}

// Execute Solitaire AI turn logic for single player practice
export function processAiTurn(state: GameState): GameState {
  if (state.activePlayer !== 2 || state.mode !== 'solitaire_ai' || state.winner !== null) {
    return state;
  }

  let s = { ...state };

  // Run through AI phases
  while (s.activePlayer === 2 && s.winner === null) {
    if (s.phase === 'UP' || s.phase === 'DRAW') {
      s = advancePhase(s);
    } else if (s.phase === 'ENER') {
      // AI charges 1 card to Ener if hand > 3
      if (s.player2.hand.length > 3) {
        s = chargeEner(s, s.player2.hand[0].id);
      }
      s = advancePhase(s);
    } else if (s.phase === 'GROW') {
      // AI grows if available
      const currentLevel = s.player2.lrigZone.center?.card.level || 0;
      const nextLrig = s.player2.lrigDeck.find((c) => c.cardType === 'LRIG' && c.level === currentLevel + 1);
      if (nextLrig) {
        s = growLrig(s, nextLrig.id);
      }
      s = advancePhase(s);
    } else if (s.phase === 'MAIN') {
      // AI plays SIGNI cards matching current LRIG level
      const currentLevel = s.player2.lrigZone.center?.card.level || 0;
      const playableSigni = s.player2.hand.filter((c) => c.cardType === 'SIGNI' && c.level <= currentLevel);

      const slots: SigniSlot[] = ['left', 'center', 'right'];
      slots.forEach((slot) => {
        if (!s.player2.signiZones[slot] && playableSigni.length > 0) {
          const cardToPlay = playableSigni.shift()!;
          s = playSigni(s, cardToPlay.id, slot);
        }
      });
      s = advancePhase(s);
    } else if (s.phase === 'ATTACK') {
      // AI attacks with all SIGNIs first, then LRIG
      const slots: SigniSlot[] = ['left', 'center', 'right'];
      slots.forEach((slot) => {
        if (s.player2.signiZones[slot]?.isUp) {
          s = executeAttack(s, slot);
        }
      });

      if (s.player2.lrigZone.center?.isUp) {
        s = executeAttack(s, 'lrig');
      }

      s = advancePhase(s);
    } else if (s.phase === 'END') {
      s = advancePhase(s);
      break; // End AI turn, hand over to P1
    } else {
      break;
    }
  }

  return s;
}

export function setGameLifeBurstRule(state: GameState, newRule: LifeBurstFormat): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.lifeBurstRule = newRule;
  nextState.log.unshift(
    createLog(nextState.activePlayer, `⚙️ Life Burst Rule: Standard Life Burst`, 'system')
  );
  return nextState;
}

export function drawManualCard(state: GameState, playerId: 1 | 2): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;
  if (p.mainDeck.length > 0) {
    const card = p.mainDeck.shift()!;
    p.hand.push(card);
    nextState.log.unshift(
      createLog(
        playerId,
        `🃏 ${p.name} manually drew 1 card ("${card.name}"). Main deck: ${p.mainDeck.length} cards remaining.`,
        'action'
      )
    );
  } else {
    nextState.log.unshift(
      createLog(playerId, `⚠️ Cannot draw: ${p.name}'s main deck is empty!`, 'system')
    );
  }

  return nextState;
}

export function playPieceCard(
  state: GameState,
  pieceCardId: string,
  playerId?: number
): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const pId = playerId || nextState.activePlayer;
  const p = pId === 1 ? nextState.player1 : nextState.player2;
  const oppP = pId === 1 ? nextState.player2 : nextState.player1;

  const cardIdx = p.lrigDeck.findIndex((c) => c.id === pieceCardId);
  if (cardIdx === -1) return state;

  const pieceCard = p.lrigDeck[cardIdx];

  // Remove Piece card from LRIG Deck
  p.lrigDeck.splice(cardIdx, 1);

  nextState.log.unshift(
    createLog(p.id, `✨ ${p.name} played ${pieceCard.cardType} card "${pieceCard.name}" from LRIG Deck! Effect: ${pieceCard.effectText || 'Executed'}`, 'action')
  );

  // Execute automatic effects if matching keywords
  const text = (pieceCard.effectText || '').toLowerCase();
  if (text.includes('draw')) {
    if (p.mainDeck.length > 0) {
      const drawn = p.mainDeck.shift()!;
      p.hand.push(drawn);
      nextState.log.unshift(createLog(p.id, `✨ ${pieceCard.cardType} Effect: Drew 1 card ("${drawn.name}").`, 'action'));
    }
  }
  if (text.includes('ener charge') || text.includes('ener')) {
    if (p.mainDeck.length > 0) {
      const top = p.mainDeck.shift()!;
      p.enerZone.push(top);
      nextState.log.unshift(createLog(p.id, `✨ ${pieceCard.cardType} Effect: Charged 1 Ener ("${top.name}").`, 'action'));
    }
  }
  if (text.includes('vanish') || text.includes('banish')) {
    const slots: SigniSlot[] = ['left', 'center', 'right'];
    for (const slot of slots) {
      if (oppP.signiZones[slot]) {
        const vanished = oppP.signiZones[slot]!;
        oppP.enerZone.push(vanished.card);
        oppP.signiZones[slot] = null;
        nextState.log.unshift(createLog(p.id, `✨ ${pieceCard.cardType} Effect: Banished opponent's SIGNI "${vanished.card.name}" to Ener Zone!`, 'damage'));
        break;
      }
    }
  }

  return nextState;
}

export function triggerManualLifeBurst(
  state: GameState,
  playerId: 1 | 2,
  cardIndex: number,
  zone: 'lifeCloth' | 'checkZone' | 'hand' | 'enerZone'
): GameState {
  const nextState: GameState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;
  const oppP = playerId === 1 ? nextState.player2 : nextState.player1;
  const zoneList = p[zone];

  if (!zoneList || cardIndex < 0 || cardIndex >= zoneList.length) {
    return state;
  }

  const [burstCard] = zoneList.splice(cardIndex, 1);
  if (!burstCard) return state;

  const burstEffect = burstCard.lifeBurstEffect || burstCard.effectText || 'Life Burst executed!';
  const effectLower = burstEffect.toLowerCase();

  nextState.log.unshift(
    createLog(
      playerId,
      `⚡ MANUAL LIFE BURST ACTIVATED! Player ${playerId} triggered "${burstCard.name}" [Life Burst]: ${burstEffect}`,
      'burst'
    )
  );

  // Execute automatic side effects based on Life Burst text keywords
  if (effectLower.includes('draw 2')) {
    const d1 = p.mainDeck.shift();
    const d2 = p.mainDeck.shift();
    if (d1) p.hand.push(d1);
    if (d2) p.hand.push(d2);
    nextState.log.unshift(createLog(playerId, `⚡ Life Burst Effect: Drew 2 cards into hand!`, 'burst'));
  } else if (effectLower.includes('draw 1') || effectLower.includes('draw')) {
    const d1 = p.mainDeck.shift();
    if (d1) p.hand.push(d1);
    nextState.log.unshift(createLog(playerId, `⚡ Life Burst Effect: Drew 1 card into hand!`, 'burst'));
  }

  if (effectLower.includes('ener') || effectLower.includes('charge')) {
    const topDeck = p.mainDeck.shift();
    if (topDeck) {
      p.enerZone.push(topDeck);
      nextState.log.unshift(createLog(playerId, `⚡ Life Burst Effect: Charged "${topDeck.name}" to Ener Zone!`, 'burst'));
    }
  }

  if (effectLower.includes('vanish') || effectLower.includes('banish')) {
    const slots: SigniSlot[] = ['left', 'center', 'right'];
    const occupiedSlot = slots.find((s) => oppP.signiZones[s] !== null);
    if (occupiedSlot && oppP.signiZones[occupiedSlot]) {
      const target = oppP.signiZones[occupiedSlot]!;
      oppP.enerZone.push(target.card);
      oppP.signiZones[occupiedSlot] = null;
      nextState.log.unshift(
        createLog(playerId, `⚡ Life Burst Effect: Banished opposing SIGNI "${target.card.name}" to Ener Zone!`, 'burst')
      );
    }
  }

  // Card movement: according to WIXOSS rules, cards added to hand go to hand, otherwise to Ener Zone
  if (effectLower.includes('hand') || effectLower.includes('draw')) {
    p.hand.push(burstCard);
  } else {
    p.enerZone.push(burstCard);
  }

  return nextState;
}

// Banish target SIGNI on field to owner's Ener Zone
export function banishTargetSigni(
  state: GameState,
  targetPlayerId: 1 | 2,
  slot: SigniSlot,
  actorPlayerId: 1 | 2 = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const targetP = targetPlayerId === 1 ? nextState.player1 : nextState.player2;
  const targetInst = targetP.signiZones[slot];

  if (!targetInst) return state;

  targetP.enerZone.push(targetInst.card);
  targetP.signiZones[slot] = null;

  nextState.log.unshift(
    createLog(
      actorPlayerId,
      `💥 Target Action: Banished ${targetP.name}'s SIGNI "${targetInst.card.name}" on ${slot.toUpperCase()} slot to Ener Zone.`,
      'damage'
    )
  );

  return nextState;
}

// Bounce target SIGNI on field to owner's Hand
export function bounceTargetSigniToHand(
  state: GameState,
  targetPlayerId: 1 | 2,
  slot: SigniSlot,
  actorPlayerId: 1 | 2 = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const targetP = targetPlayerId === 1 ? nextState.player1 : nextState.player2;
  const targetInst = targetP.signiZones[slot];

  if (!targetInst) return state;

  targetP.hand.push(targetInst.card);
  targetP.signiZones[slot] = null;

  nextState.log.unshift(
    createLog(
      actorPlayerId,
      `↩️ Target Action: Returned ${targetP.name}'s SIGNI "${targetInst.card.name}" on ${slot.toUpperCase()} slot back to Hand.`,
      'action'
    )
  );

  return nextState;
}

// Toggle target SIGNI state (Down/Up/Freeze)
export function toggleTargetSigniState(
  state: GameState,
  targetPlayerId: 1 | 2,
  slot: SigniSlot,
  action: 'down' | 'up' | 'freeze',
  actorPlayerId: 1 | 2 = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const targetP = targetPlayerId === 1 ? nextState.player1 : nextState.player2;
  const targetInst = targetP.signiZones[slot];

  if (!targetInst) return state;

  if (action === 'down') {
    targetInst.isUp = false;
    nextState.log.unshift(
      createLog(
        actorPlayerId,
        `⬇️ Target Action: Downed (Tapped) ${targetP.name}'s SIGNI "${targetInst.card.name}".`,
        'action'
      )
    );
  } else if (action === 'up') {
    targetInst.isUp = true;
    nextState.log.unshift(
      createLog(
        actorPlayerId,
        `⬆️ Target Action: Upped (Untapped) ${targetP.name}'s SIGNI "${targetInst.card.name}".`,
        'action'
      )
    );
  }

  return nextState;
}

// Modify target SIGNI Power Bonus
export function modifyTargetSigniPower(
  state: GameState,
  targetPlayerId: 1 | 2,
  slot: SigniSlot,
  powerDelta: number,
  actorPlayerId: 1 | 2 = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const targetP = targetPlayerId === 1 ? nextState.player1 : nextState.player2;
  const targetInst = targetP.signiZones[slot];

  if (!targetInst) return state;

  targetInst.powerBonus += powerDelta;
  const totalPower = targetInst.card.power + targetInst.powerBonus;

  nextState.log.unshift(
    createLog(
      actorPlayerId,
      `⚡ Target Action: ${powerDelta >= 0 ? '+' : ''}${powerDelta} Power to ${targetP.name}'s SIGNI "${targetInst.card.name}" (Total: ${totalPower} Power).`,
      'action'
    )
  );

  // If power reaches 0 or less, vanish SIGNI automatically
  if (totalPower <= 0) {
    targetP.enerZone.push(targetInst.card);
    targetP.signiZones[slot] = null;
    nextState.log.unshift(
      createLog(
        actorPlayerId,
        `💥 Power reached 0! SIGNI "${targetInst.card.name}" was vanished to Ener Zone!`,
        'damage'
      )
    );
  }

  return nextState;
}

// Move Top of Deck to Hand
export function moveTopDeckToHand(
  state: GameState,
  playerId: 1 | 2,
  count: number = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;

  let moved = 0;
  for (let i = 0; i < count; i++) {
    if (p.mainDeck.length > 0) {
      const card = p.mainDeck.shift()!;
      p.hand.push(card);
      moved++;
    }
  }

  if (moved > 0) {
    nextState.log.unshift(
      createLog(
        playerId,
        `🃏 Deck Action: Moved top ${moved} card(s) of ${p.name}'s deck directly to Hand.`,
        'action'
      )
    );
  }

  return nextState;
}

// Move Top of Deck to Ener Zone (Ener Charge)
export function moveTopDeckToEner(
  state: GameState,
  playerId: 1 | 2,
  count: number = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;

  let moved = 0;
  for (let i = 0; i < count; i++) {
    if (p.mainDeck.length > 0) {
      const card = p.mainDeck.shift()!;
      p.enerZone.push(card);
      moved++;
    }
  }

  if (moved > 0) {
    nextState.log.unshift(
      createLog(
        playerId,
        `🔋 Deck Action: Ener Charged top ${moved} card(s) of ${p.name}'s deck into Ener Zone.`,
        'action'
      )
    );
  }

  return nextState;
}

// Move Top of Deck to Trash (Mill)
export function moveTopDeckToTrash(
  state: GameState,
  playerId: 1 | 2,
  count: number = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;

  let moved = 0;
  for (let i = 0; i < count; i++) {
    if (p.mainDeck.length > 0) {
      const card = p.mainDeck.shift()!;
      p.trash.push(card);
      moved++;
    }
  }

  if (moved > 0) {
    nextState.log.unshift(
      createLog(
        playerId,
        `🗑️ Deck Action: Milled top ${moved} card(s) of ${p.name}'s deck to Trash.`,
        'action'
      )
    );
  }

  return nextState;
}

// Move Top of Deck to Life Cloth
export function moveTopDeckToLifeCloth(
  state: GameState,
  playerId: 1 | 2,
  count: number = 1
): GameState {
  const nextState = cloneGameState(state);
  nextState.history = pushHistory(state);

  const p = playerId === 1 ? nextState.player1 : nextState.player2;

  let moved = 0;
  for (let i = 0; i < count; i++) {
    if (p.mainDeck.length > 0) {
      const card = p.mainDeck.shift()!;
      p.lifeCloth.push(card);
      moved++;
    }
  }

  if (moved > 0) {
    nextState.log.unshift(
      createLog(
        playerId,
        `🛡️ Deck Action: Added top ${moved} card(s) of ${p.name}'s deck to Life Cloth (Life Count: ${p.lifeCloth.length}).`,
        'action'
      )
    );
  }

  return nextState;
}

