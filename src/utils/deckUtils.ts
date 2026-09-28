import { WixossCard, WixossDeck, DeckValidationResult } from '../types/wixoss';

export function validateWixossDeck(
  deck: WixossDeck,
  cardCatalog: WixossCard[]
): DeckValidationResult {
  const cardMap = new Map<string, WixossCard>();
  cardCatalog.forEach((c) => cardMap.set(c.id, c));

  const errors: string[] = [];
  const warnings: string[] = [];
  const formatRules = deck.formatRules || 'standard';

  const mainCards = deck.mainDeckCardIds
    .map((id) => cardMap.get(id))
    .filter((c): c is WixossCard => Boolean(c));

  const lrigCards = deck.lrigDeckCardIds
    .map((id) => cardMap.get(id))
    .filter((c): c is WixossCard => Boolean(c));

  const mainCount = mainCards.length;
  const lrigCount = lrigCards.length;

  // 1. Check Main Deck count (exact 40)
  if (mainCount !== 40) {
    errors.push(`Main Deck must contain exactly 40 cards (currently ${mainCount}).`);
  }

  // 2. Check LRIG Deck count (max 10)
  if (lrigCount > 10) {
    errors.push(`LRIG Deck must contain at most 10 cards (currently ${lrigCount}).`);
  } else if (lrigCount === 0) {
    warnings.push('LRIG Deck is empty. You need at least Level 0 LRIG to play.');
  }

  // 2b. Check Piece cards in LRIG Deck (max 2 Piece cards)
  const pieceCards = lrigCards.filter((c) => c.cardType === 'Piece');
  const pieceCount = pieceCards.length;
  if (pieceCount > 2) {
    errors.push(`LRIG Deck can contain at most 2 Piece cards (currently ${pieceCount}).`);
  }

  // Check card type placement compatibility
  const invalidMainTypes = mainCards.filter(
    (c) => c.cardType === 'LRIG' || c.cardType === 'Arts' || c.cardType === 'Piece'
  );
  if (invalidMainTypes.length > 0) {
    errors.push(
      `Main Deck cannot contain LRIG, Arts, or Piece cards (${invalidMainTypes.length} invalid cards found in Main Deck).`
    );
  }

  const invalidLrigTypes = lrigCards.filter(
    (c) => c.cardType === 'SIGNI' || c.cardType === 'Spell'
  );
  if (invalidLrigTypes.length > 0) {
    errors.push(
      `LRIG Deck cannot contain SIGNI or Spell cards (${invalidLrigTypes.length} invalid cards found in LRIG Deck).`
    );
  }

  // 3. Format-specific Life Burst validation
  const lifeBurstCount = mainCards.filter((c) => c.lifeBurst).length;
  const nonBurstCount = mainCards.filter((c) => !c.lifeBurst).length;
  const doubleBurstCount = mainCards.filter((c) => c.isDoubleBurst || (c.lifeBurstEffect && c.lifeBurstEffect.includes('Double'))).length;

  if (lifeBurstCount !== 20) {
    errors.push(
      `Diva Selection Format: Main Deck must contain exactly 20 Life Burst cards and 20 cards without Life Burst (currently ${lifeBurstCount} Burst / ${nonBurstCount} Without Burst).`
    );
  }

  // 4. Check card limits (max 4 per card name)
  const nameCounts: Record<string, number> = {};
  mainCards.forEach((c) => {
    nameCounts[c.name] = (nameCounts[c.name] || 0) + 1;
  });

  Object.entries(nameCounts).forEach(([name, count]) => {
    if (count > 4) {
      errors.push(`Card "${name}" exceeds maximum limit of 4 copies (${count} copies found).`);
    }
  });

  // 5. Check LRIG Level 0 requirement
  const hasLevel0Lrig = lrigCards.some((c) => c.cardType === 'LRIG' && c.level === 0);
  if (!hasLevel0Lrig) {
    errors.push('LRIG Deck must contain at least one Level 0 LRIG to start the match.');
  }

  return {
    isValid: errors.length === 0,
    formatRules,
    errors,
    warnings,
    mainCount,
    lrigCount,
    pieceCount,
    lifeBurstCount,
    nonBurstCount,
    doubleBurstCount,
  };
}

export function shuffleDeck<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
