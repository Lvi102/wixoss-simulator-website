import { WixossDeck } from '../types/wixoss';

export const INITIAL_PREBUILT_DECKS: WixossDeck[] = [
  {
    id: 'deck-wxdi-d01-ancient-surprise',
    name: 'WXDi-D01 DIVA DEBUT DECK Ancient Surprise',
    description: 'Official WXDi-D01 preconstructed deck featuring At Level 0-3 Center LRIG, Tawil & Umr Assist LRIGs, Harmonic Call Piece, Polygenesis Spells, and Ancient Surprise SIGNIs accurately divided into 20 Cards WITH Life Burst and 20 Cards WITHOUT Life Burst.',
    color: 'Green',
    formatRules: 'standard',
    updatedAt: new Date().toISOString(),
    favorite: true,
    lrigDeckCardIds: [
      'wxdi-d01-001-at-0',
      'wxdi-d01-002-at-1',
      'wxdi-d01-003-at-2',
      'wxdi-d01-004-at-3',
      'wxdi-d01-005-tawil-0',
      'wxdi-d01-006-tawil-1',
      'wxdi-d01-007-tawil-2',
      'wxdi-d01-008-umr-0',
      'wxdi-d01-009-umr-1',
      'wxdi-d01-011-harmonic-call',
    ],
    mainDeckCardIds: [
      // 20 BURSTS (4 Servant ♯, 4 Polygenesis, 4 Sen no Rikyu, 4 Zwei =Slow Loris=, 4 Tobiel)
      'wxdi-d01-020-servant-sharp', 'wxdi-d01-020-servant-sharp', 'wxdi-d01-020-servant-sharp', 'wxdi-d01-020-servant-sharp',
      'wxdi-d01-021-polygenesis', 'wxdi-d01-021-polygenesis', 'wxdi-d01-021-polygenesis', 'wxdi-d01-021-polygenesis',
      'wxdi-d01-013-sen-no-rikyu', 'wxdi-d01-013-sen-no-rikyu', 'wxdi-d01-013-sen-no-rikyu', 'wxdi-d01-013-sen-no-rikyu',
      'wxdi-d01-014-zwei-slow-loris', 'wxdi-d01-014-zwei-slow-loris', 'wxdi-d01-014-zwei-slow-loris', 'wxdi-d01-014-zwei-slow-loris',
      'wxdi-d01-015-tobiel', 'wxdi-d01-015-tobiel', 'wxdi-d01-015-tobiel', 'wxdi-d01-015-tobiel',

      // 20 NON-BURSTS (4 Camelopar, 4 Assylen, 4 Atalanta, 4 Water Buffalo, 4 Koalala)
      'wxdi-d01-012-camelopar', 'wxdi-d01-012-camelopar', 'wxdi-d01-012-camelopar', 'wxdi-d01-012-camelopar',
      'wxdi-d01-016-assylen', 'wxdi-d01-016-assylen', 'wxdi-d01-016-assylen', 'wxdi-d01-016-assylen',
      'wxdi-d01-017-atalanta', 'wxdi-d01-017-atalanta', 'wxdi-d01-017-atalanta', 'wxdi-d01-017-atalanta',
      'wxdi-d01-018-water-buffalo', 'wxdi-d01-018-water-buffalo', 'wxdi-d01-018-water-buffalo', 'wxdi-d01-018-water-buffalo',
      'wxdi-d01-019-koalala', 'wxdi-d01-019-koalala', 'wxdi-d01-019-koalala', 'wxdi-d01-019-koalala',
    ],
  },
  {
    id: 'deck-red-no-limit',
    name: 'WXDi-D03 DIVA DEBUT DECK No Limit',
    description: 'Official WXDi-D03 preconstructed deck featuring Hirana Level 0-3 Center LRIG, Akino (Rock & Paper) & Rei (Flash Blade & Empty Blade) Assist LRIGs, Glory Grow Piece, Deafening Inferno Spells, Lancelot & Romail SIGNI.',
    color: 'Red',
    formatRules: 'standard',
    updatedAt: new Date().toISOString(),
    favorite: true,
    lrigDeckCardIds: [
      'wxdi-d03-001-hirana-0',
      'wxdi-d03-002-hirana-1',
      'wxdi-d03-003-hirana-2',
      'wxdi-d03-004-hirana-3',
      'wxdi-d03-005-akino-0',
      'wxdi-d03-006-akino-rock',
      'wxdi-d03-007-akino-paper',
      'wxdi-d03-008-rei-0',
      'wxdi-d03-009-rei-flash-blade',
      'wxdi-d03-011-glory-grow',
    ],
    mainDeckCardIds: [
      // 20 BURSTS (4 Servant ♯, 4 Deafening Inferno, 4 Volcanic, 4 Kagutsuchi, 4 Letti)
      'wxdi-d03-020-servant-sharp', 'wxdi-d03-020-servant-sharp', 'wxdi-d03-020-servant-sharp', 'wxdi-d03-020-servant-sharp',
      'wxdi-d03-021-deafening-inferno', 'wxdi-d03-021-deafening-inferno', 'wxdi-d03-021-deafening-inferno', 'wxdi-d03-021-deafening-inferno',
      'wxdi-d03-014-volcanic', 'wxdi-d03-014-volcanic', 'wxdi-d03-014-volcanic', 'wxdi-d03-014-volcanic',
      'wxdi-d03-015-kagutsuchi', 'wxdi-d03-015-kagutsuchi', 'wxdi-d03-015-kagutsuchi', 'wxdi-d03-015-kagutsuchi',
      'wxdi-d03-016-letti', 'wxdi-d03-016-letti', 'wxdi-d03-016-letti', 'wxdi-d03-016-letti',

      // 20 NON-BURSTS (4 Romail, 4 Lancelot, 4 Adamanthia, 4 Bronze, 4 Silvana)
      'wxdi-d03-012-romail', 'wxdi-d03-012-romail', 'wxdi-d03-012-romail', 'wxdi-d03-012-romail',
      'wxdi-d03-013-lancelot', 'wxdi-d03-013-lancelot', 'wxdi-d03-013-lancelot', 'wxdi-d03-013-lancelot',
      'wxdi-d03-017-adamanthia', 'wxdi-d03-017-adamanthia', 'wxdi-d03-017-adamanthia', 'wxdi-d03-017-adamanthia',
      'wxdi-d03-018-bronze', 'wxdi-d03-018-bronze', 'wxdi-d03-018-bronze', 'wxdi-d03-018-bronze',
      'wxdi-d03-019-silvana', 'wxdi-d03-019-silvana', 'wxdi-d03-019-silvana', 'wxdi-d03-019-silvana',
    ],
  },
];
