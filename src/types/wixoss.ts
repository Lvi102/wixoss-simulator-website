export type WixossColor = 'Red' | 'Blue' | 'Green' | 'Black' | 'White' | 'Colorless';

export type CardType = 'LRIG' | 'SIGNI' | 'Spell' | 'Arts' | 'Piece';

export type LifeBurstFormat = 'standard';

export interface WixossCard {
  id: string;
  name: string;
  cardType: CardType;
  color: WixossColor;
  level: number;
  power: number;
  cost: string; // e.g. "Red x 1" or "Colorless x 2" or "Free"
  lifeBurst: boolean;
  isDoubleBurst?: boolean; // Has Double Life Burst ability
  lifeBurstEffect?: string;
  effectText: string;
  abilities?: string[]; // e.g., ["[Enter]", "[Const]", "[Action]", "[Team Action]"]
  lrigType?: string; // e.g., "Hirana", "Akino", "Rei", "At", "Piruluk"
  team?: string; // e.g., "No Limit", "Card Jockey", "Diagram", "Ancient Surprise"
  signiClass?: string; // e.g., "Arm", "Jewel", "Devil", "Aquatic"
  guard: boolean; // Is Guard card
  rarity?: string;
  imageUrl?: string;
  isCustom?: boolean;
  flavorText?: string;
  createdAt?: string;
}

export interface WixossDeck {
  id: string;
  name: string;
  description: string;
  color: WixossColor;
  formatRules?: LifeBurstFormat; // Standard Diva Selection (20 Burst / 20 No-Burst)
  lrigDeckCardIds: string[]; // Up to 10 LRIG / Arts / Piece cards
  mainDeckCardIds: string[]; // Exactly 40 SIGNI & Spell cards
  favorite?: boolean;
  updatedAt: string;
}

export interface DeckValidationResult {
  isValid: boolean;
  formatRules: LifeBurstFormat;
  errors: string[];
  warnings: string[];
  mainCount: number;
  lrigCount: number;
  pieceCount: number;
  lifeBurstCount: number;
  nonBurstCount: number;
  doubleBurstCount: number;
}
