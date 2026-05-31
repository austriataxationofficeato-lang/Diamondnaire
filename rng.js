// rng.js — Server-side RNG via Anthropic Claude
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣', '🔔'];

// Fallback pure-random for rate limit situations
function fallbackSpin() {
  const weights = [20, 18, 16, 14, 12, 8, 4, 8];
  const total = weights.reduce((a, b) => a + b, 0);
  function pick() {
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= weights[i];
      if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
  }
  return {
    reels: [pick(), pick(), pick()],
    message: 'The reels have spoken!',
  };
}

export async function spinReels(bet, userId) {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: `You are the certified RNG engine for a licensed slot machine. 
Respond ONLY with a raw JSON object, no markdown, no preamble.
Symbols: 🍒 🍋 🍊 🍇 ⭐ 💎 7️⃣ 🔔
Weights (higher = more common): 🍒:20 🍋:18 🍊:16 🍇:14 ⭐:12 🔔:9 💎:5 7️⃣:6
Rules:
- Be genuinely random using weighted probabilities above
- Big wins (3 diamonds or 3 sevens) should be rare (~0.3% each)
- Return format: {"reels":["sym1","sym2","sym3"],"message":"short dramatic message max 8 words"}`,
      messages: [
        {
          role: 'user',
          content: `User ${userId} spins. Bet: ${bet} credits. Generate result.`,
        },
      ],
    });

    const text = msg.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // Validate
    if (
      !Array.isArray(result.reels) ||
      result.reels.length !== 3 ||
      !result.reels.every(s => SYMBOLS.includes(s))
    ) {
      return fallbackSpin();
    }

    return result;
  } catch (err) {
    console.error('RNG API error, using fallback:', err.message);
    return fallbackSpin();
  }
}

// ── Payout calculator ────────────────────────────────────────────────────────
export function calcWin(reels, bet) {
  const [a, b, c] = reels;

  // Jackpots
  if (a === '💎' && b === '💎' && c === '💎') return bet * 100;
  if (a === '7️⃣' && b === '7️⃣' && c === '7️⃣') return bet * 60;
  if (a === '⭐' && b === '⭐' && c === '⭐') return bet * 30;
  if (a === '🔔' && b === '🔔' && c === '🔔') return bet * 20;
  if (a === '🍇' && b === '🍇' && c === '🍇') return bet * 10;
  if (a === '🍊' && b === '🍊' && c === '🍊') return bet * 6;
  if (a === '🍋' && b === '🍋' && c === '🍋') return bet * 4;
  if (a === '🍒' && b === '🍒' && c === '🍒') return bet * 3;

  // Partial matches
  if (a === '🍒' && b === '🍒') return bet * 1; // double cherry
  if (reels.includes('💎')) return Math.floor(bet * 0.5); // any diamond

  return 0;
}

export const PAYTABLE = [
  { combo: '💎 💎 💎', label: 'JACKPOT', mult: 100 },
  { combo: '7️⃣ 7️⃣ 7️⃣', label: 'TRIPLE 7', mult: 60 },
  { combo: '⭐ ⭐ ⭐', label: 'TRIPLE STAR', mult: 30 },
  { combo: '🔔 🔔 🔔', label: 'TRIPLE BELL', mult: 20 },
  { combo: '🍇 🍇 🍇', label: 'TRIPLE GRAPE', mult: 10 },
  { combo: '🍊 🍊 🍊', label: 'TRIPLE ORANGE', mult: 6 },
  { combo: '🍋 🍋 🍋', label: 'TRIPLE LEMON', mult: 4 },
  { combo: '🍒 🍒 🍒', label: 'TRIPLE CHERRY', mult: 3 },
  { combo: '🍒 🍒 any', label: 'DOUBLE CHERRY', mult: 1 },
  { combo: 'any 💎 any', label: 'ANY DIAMOND', mult: '0.5' },
];
