// rng.js - Simple Server-side RNG (no external API needed)

const SYMBOLS = ['💎', '👑', '💀', '⚱️', '🎖️', '🏆', '🧊', '🥶', '🃏', '💰', '⭐', '⛏️', '💵', '💸', '🧨'];

// Weighted symbols (higher = more common)
const WEIGHTS = [20, 18, 16, 14, 12, 8, 4, 8, 10, 9, 7, 6, 5, 4, 3];

function pickSymbol() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

export function spinReels(bet, userId) {
  // Generate 3 reels
  const reels = [pickSymbol(), pickSymbol(), pickSymbol()];
  
  // Calculate winnings
  const [a, b, c] = reels;
  let win = 0;
  let message = '';

  // Jackpots
  if (a === '🏆' && b === '🏆' && c === '🏆') {
    win = bet * 100;
    message = '🎉 JACKPOT! 🏆🏆🏆';
  } else if (a === '🎖️' && b === '🎖️' && c === '🎖️') {
    win = bet * 60;
    message = '🎉 MEGA WIN! 🎖️🎖️🎖️';
  } else if (a === '👑' && b === '👑' && c === '👑') {
    win = bet * 30;
    message = '🎉 BIG WIN! 👑👑👑';
  } else if (a === '💎' && b === '💎' && c === '💎') {
    win = bet * 20;
    message = '💎 DIAMOND WIN! 💎💎💎';
  } else if (a === '💰' && b === '💰' && c === '💰') {
    win = bet * 10;
    message = '💰 MONEY WIN! 💰💰💰';
  } else if (a === '⭐' && b === '⭐' && c === '⭐') {
    win = bet * 7;
    message = '⭐ STAR WIN! ⭐⭐⭐';
  } else if (a === '💵' && b === '💵' && c === '💵') {
    win = bet * 5;
    message = '💵 CASH WIN! 💵💵💵';
  } else if (a === '💸' && b === '💸' && c === '💸') {
    win = bet * 4;
    message = '💸 MONEY BAG! 💸💸💸';
  } else if (a === '🧨' && b === '🧨' && c === '🧨') {
    win = -bet * 3;
    message = '💥 BOMB! -3x bet';
  } else if (a === '💀' && b === '💀' && c === '💀') {
    win = -bet * 2;
    message = '💀 SKULLS! -2x bet';
  } else if (a === '⚱️' && b === '⚱️' && c === '⚱️') {
    win = -bet * 2;
    message = '⚱️ CURSE! -2x bet';
  } else if (a === '⛏️' && b === '⛏️' && c === '⛏️') {
    win = -bet * 2;
    message = '⛏️ MINER! -2x bet';
  } else if (a === '🧊' && b === '🧊' && c === '🧊') {
    win = bet * 3;
    message = '🧊 ICE WIN! 🧊🧊🧊';
  } else if (a === '🥶' && b === '🥶' && c === '🥶') {
    win = bet * 3;
    message = '🥶 FROZEN! 🧊🧊🧊';
  } else if (a === '🃏' && b === '🃏' && c === '🃏') {
    win = bet * 3;
    message = '🃏 ACE WIN! 🃏🃏🃏';
  } 
  // Partial matches
  else if (a === b || a === c || b === c) {
    win = Math.floor(bet * 0.5);
    message = '✨ Partial match! +0.5x';
  } else {
    message = 'No win. Try again!';
  }

  return {
    reels,
    message,
    win
  };
}

export const PAYTABLE = [
  { combo: '🏆🏆🏆', label: 'JACKPOT', mult: 100 },
  { combo: '🎖️🎖️🎖️', label: 'MEGA WIN', mult: 60 },
  { combo: '👑👑👑', label: 'BIG WIN', mult: 30 },
  { combo: '💎💎💎', label: 'DIAMOND', mult: 20 },
  { combo: '💰💰💰', label: 'MONEY', mult: 10 },
  { combo: '⭐⭐⭐', label: 'STAR', mult: 7 },
  { combo: '💵💵💵', label: 'CASH', mult: 5 },
  { combo: '💸💸💸', label: 'MONEY BAG', mult: 4 },
  { combo: '🧊🧊🧊', label: 'ICE', mult: 3 },
  { combo: '🃏🃏🃏', label: 'ACE', mult: 3 },
  { combo: '🧨🧨🧨', label: 'BOMB', mult: -3 },
  { combo: '💀💀💀', label: 'SKULL', mult: -2 },
  { combo: '⚱️⚱️⚱️', label: 'CURSE', mult: -2 },
  { combo: '⛏️⛏️⛏️', label: 'MINER', mult: -2 }
];
