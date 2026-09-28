import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: Physical Card Scanner (OCR & WIXOSS Specs Extraction)
app.post('/api/gemini/scan-card', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cardHint } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 field is required' });
      return;
    }

    const ai = getGenAI();

    const prompt = `Analyze this physical WIXOSS Trading Card Game (TCG) card photo.
Extract the card metadata as JSON matching WIXOSS specifications:
- name: Card name (English or translated Japanese)
- cardType: One of "LRIG", "SIGNI", "Spell", "Arts", "Piece"
- color: Primary WIXOSS color: "Red", "Blue", "Green", "Black", "White", or "Colorless"
- level: Number (0 to 4 for LRIG/SIGNI, 0 if not applicable)
- power: Power value for SIGNI (e.g. 3000, 8000, 12000, 0 if not SIGNI)
- cost: Color cost string like "Red x 1, Colorless x 1" or "Free" or "Colorless x 2"
- lifeBurst: Boolean (true if card has a Life Burst banner/icon at bottom, else false)
- lifeBurstEffect: Description of Life Burst effect text if present, else ""
- effectText: Description of standard card abilities/effects
- lrigType: If LRIG, LRIG type/character name (e.g., "At", "Hirana", "Rei", "Akino", "Tama", "Piruluk", "Tama", "Yuzuki", etc.), else ""
- signiClass: If SIGNI, class/subtype (e.g. "Arm", "Devil", "Jewel", "Poisonous", "奏生", etc.), else ""
- guard: Boolean (true if card is a Guard SIGNI, else false)
- rarity: Rarity symbol like "C", "R", "SR", "LR", "ST", "PR" if visible, else "SR"
- flavorText: Any flavor text if visible, else ""

${cardHint ? `User notes: ${cardHint}` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            cardType: { type: Type.STRING },
            color: { type: Type.STRING },
            level: { type: Type.NUMBER },
            power: { type: Type.NUMBER },
            cost: { type: Type.STRING },
            lifeBurst: { type: Type.BOOLEAN },
            lifeBurstEffect: { type: Type.STRING },
            effectText: { type: Type.STRING },
            lrigType: { type: Type.STRING },
            signiClass: { type: Type.STRING },
            guard: { type: Type.BOOLEAN },
            rarity: { type: Type.STRING },
            flavorText: { type: Type.STRING },
          },
          required: ['name', 'cardType', 'color', 'effectText'],
        },
      },
    });

    const cardData = JSON.parse(response.text || '{}');
    res.json({ success: true, card: cardData });
  } catch (err: any) {
    console.error('Error in scan-card:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze card image' });
  }
});

// API: AI Deck Advisor / Strategy Helper
app.post('/api/gemini/suggest-deck', async (req, res) => {
  try {
    const { archetype, color, notes } = req.body;
    const ai = getGenAI();

    const prompt = `You are a WIXOSS TCG master deck builder.
Generate a cohesive WIXOSS deck concept for archetype "${archetype || 'Diva Debut'}" focusing on color "${color || 'Red'}".
Provide deck building suggestions, combo tips, key card recommendations, and mulligan advice.
${notes ? `User notes: ${notes}` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deckTitle: { type: Type.STRING },
            lrigDeckStrategy: { type: Type.STRING },
            mainDeckStrategy: { type: Type.STRING },
            keyCombos: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            mulliganGuide: { type: Type.STRING },
          },
          required: ['deckTitle', 'lrigDeckStrategy', 'mainDeckStrategy', 'keyCombos'],
        },
      },
    });

    const suggestions = JSON.parse(response.text || '{}');
    res.json({ success: true, suggestions });
  } catch (err: any) {
    console.error('Error in suggest-deck:', err);
    res.status(500).json({ error: err.message || 'Failed to generate deck advice' });
  }
});

// Vite Middleware & Static Server
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WIXOSS Simulator server running at http://localhost:${PORT}`);
  });
}

startServer();
