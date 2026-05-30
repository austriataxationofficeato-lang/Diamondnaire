const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data store
let db = {
  users: {},
  transactions: [],
  game_history: [],
  leaderboard: {}
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      db = JSON.parse(data);
    }
  } catch (e) {
    console.log('Starting fresh data store');
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

loadData();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Game symbols
const SYMBOLS = ['💎', '👑', '💀', '⚱️', '🎖️', '🏆', '🧊', '🥶', '🃏', '💰', '⭐', '⛏️', '💵', '💸', '🧨'];

// Winning configurations
const THREE_SYMBOL_WINNINGS = {
  '💎💎💎': { type: 'diamonds', amount: 10 },
  '🏆🏆🏆': { type: 'points', amount: 3000 },
  '🎖️🎖️🎖️': { type: 'points', amount: 3000 },
  '💸💸💸': { type: 'dollars', amount: 19.68 },
  '💵💵💵': { type: 'dollars', amount: 15.00 },
  '💰💰💰': { type: 'dollars', amount: 46.02 },
  '👑👑👑': { type: 'points', amount: 3000 }
};

const TWO_SYMBOL_WINNINGS = {
  '💎💎': { type: 'diamonds', amount: 1 },
  '🏆🏆': { type: 'points', amount: 100 },
  '🎖️🎖️': { type: 'points', amount: 100 },
  '💸💸': { type: 'dollars', amount: 2 },
  '💵💵': { type: 'dollars', amount: 1.5 },
  '💰💰': { type: 'dollars', amount: 5 },
  '👑👑': { type: 'points', amount: 100 }
};

// Danger symbols penalties
const DANGER_PENALTIES = {
  '🧨': { 3: -2999, 2: -1999, 1: -700 },
  '💀': { 3: -2009, 2: -1009, 1: -750 },
  '⚱️': { 3: -2091, 2: -1099, 1: -720 },
  '⛏️': { 3: -2001, 2: -1999, 1: -1000 }
};

// Fair symbols rewards
const FAIR_REWARDS = {
  '🃏': { type: 'points', amount: 500 },
  '⭐': { type: 'points', amount: 250 },
  '🎟️': { type: 'tickets', amount: 10 },
  '🧊': { type: 'ice', amount: 5 }
};

const MAX_BET_TICKETS = 300;

// Helper functions
function getRandomReels() {
  const reels = [];
  for (let i = 0; i < 3; i++) {
    reels.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  return reels;
}

function countSymbols(reels) {
  const counts = {};
  reels.forEach(symbol => {
    counts[symbol] = (counts[symbol] || 0) + 1;
  });
  return counts;
}

function calculateWinnings(reels, betMultiplier) {
  const counts = countSymbols(reels);
  let result = {
    win: false,
    diamonds: 0,
    dollars: 0,
    points: 0,
    tickets: 0,
    ice: 0,
    message: ''
  };

  // Check three symbol wins
  const threeCombo = reels.join('');
  if (THREE_SYMBOL_WINNINGS[threeCombo]) {
    const win = THREE_SYMBOL_WINNINGS[threeCombo];
    result.win = true;
    if (win.type === 'diamonds') result.diamonds = win.amount;
    if (win.type === 'dollars') result.dollars = win.amount;
    if (win.type === 'points') result.points = win.amount;
    result.message = `🎉 ${threeCombo} - ${win.amount} ${win.type}!`;
  }

  // Check two symbol wins
  for (const [combo, win] of Object.entries(TWO_SYMBOL_WINNINGS)) {
    const symbol = combo[0];
    if (counts[symbol] >= 2) {
      result.win = true;
      if (win.type === 'diamonds') result.diamonds += win.amount;
      if (win.type === 'dollars') result.dollars += win.amount;
      if (win.type === 'points') result.points += win.amount;
      result.message = `🎉 ${symbol}${symbol} - ${win.amount} ${win.type}!`;
    }
  }

  // Check danger symbols
  for (const [symbol, penalty] of Object.entries(DANGER_PENALTIES)) {
    if (counts[symbol]) {
      const count = counts[symbol];
      result.points += penalty[count] || penalty[1];
      result.message = `💥 ${symbol} x${count} - ${penalty[count] || penalty[1]} points!`;
    }
  }

  // Check fair symbols
  for (const [symbol, reward] of Object.entries(FAIR_REWARDS)) {
    if (counts[symbol] >= 3) {
      result.win = true;
      if (reward.type === 'points') result.points += reward.amount;
      if (reward.type === 'tickets') result.tickets += reward.amount;
      if (reward.type === 'ice') result.ice += reward.amount;
      result.message = `✨ ${symbol} x3 - ${reward.amount} ${reward.type}!`;
    }
  }

  // Apply bet multiplier
  if (result.win) {
    result.diamonds *= betMultiplier;
    result.dollars *= betMultiplier;
    result.points *= betMultiplier;
    result.tickets *= betMultiplier;
    result.ice *= betMultiplier;
  }

  return result;
}

// API Routes

// Initialize or get user
app.post('/api/init', (req, res) => {
  const { telegram_id, username } = req.body;
  
  if (!db.users[telegram_id]) {
    db.users[telegram_id] = {
      id: telegram_id,
      telegram_id,
      username,
      balance: 100,
      diamonds: 5,
      points: 100,
      tickets: 50,
      ice: 0,
      total_played: 0,
      created_at: new Date().toISOString()
    };
    saveData();
  }
  
  res.json({ success: true, user: db.users[telegram_id] });
});

// Get user profile
app.get('/api/user/:telegram_id', (req, res) => {
  const user = db.users[req.params.telegram_id];
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  res.json({ success: true, user });
});

// Spin the slot machine
app.post('/api/spin', (req, res) => {
  const { telegram_id, bet_multiplier } = req.body;
  
  const user = db.users[telegram_id];
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  // Check if machine is frozen
  if (user.ice >= 100) {
    return res.json({ success: false, message: 'Machine frozen! Buy Ice 🧊 to unlock', frozen: true });
  }
  
  // Check ticket requirements
  if (bet_multiplier === 100 && user.tickets < MAX_BET_TICKETS) {
    return res.json({ success: false, message: `Need at least ${MAX_BET_TICKETS} tickets for 100x bet` });
  }
  
  // Generate reels
  const reels = getRandomReels();
  const result = calculateWinnings(reels, bet_multiplier);
  
  // Update user balance
  if (result.diamonds > 0) user.diamonds += result.diamonds;
  if (result.dollars > 0) user.balance += result.dollars;
  if (result.points !== 0) user.points += result.points;
  if (result.tickets > 0) user.tickets += result.tickets;
  if (result.ice > 0) user.ice += result.ice;
  user.total_played += 1;
  
  // Record game history
  db.game_history.push({
    id: uuidv4(),
    user_id: telegram_id,
    reels: JSON.stringify(reels),
    bet_multiplier,
    win_amount: result.dollars + result.diamonds,
    created_at: new Date().toISOString()
  });
  
  // Keep only last 1000 history entries
  if (db.game_history.length > 1000) {
    db.game_history = db.game_history.slice(-1000);
  }
  
  // Update leaderboard
  if (result.dollars > 0 || result.diamonds > 0) {
    const winnings = result.dollars + result.diamonds;
    if (!db.leaderboard[telegram_id]) {
      db.leaderboard[telegram_id] = {
        user_id: telegram_id,
        username: user.username,
        total_winnings: winnings,
        games_played: 1
      };
    } else {
      db.leaderboard[telegram_id].total_winnings += winnings;
      db.leaderboard[telegram_id].games_played += 1;
    }
  }
  
  saveData();
  
  res.json({
    success: true,
    reels,
    result,
    user
  });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Object.values(db.leaderboard)
    .sort((a, b) => b.total_winnings - a.total_winnings)
    .slice(0, 100);
  
  res.json({ success: true, leaderboard });
});

// Buy Ice (unfreeze machine)
app.post('/api/buy-ice', (req, res) => {
  const { telegram_id, amount } = req.body;
  
  const user = db.users[telegram_id];
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const cost = amount * 10;
  
  if (user.balance < cost) {
    return res.json({ success: false, message: 'Insufficient balance' });
  }
  
  user.balance -= cost;
  user.ice = Math.max(0, user.ice - amount);
  
  saveData();
  
  res.json({ success: true, user });
});

// Add balance
app.post('/api/add-balance', (req, res) => {
  const { telegram_id, amount } = req.body;
  
  if (db.users[telegram_id]) {
    db.users[telegram_id].balance += amount;
    saveData();
  }
  
  res.json({ success: true, user: db.users[telegram_id] });
});

// Get game history
app.get('/api/history/:telegram_id', (req, res) => {
  const history = db.game_history
    .filter(h => h.user_id === req.params.telegram_id)
    .slice(-50)
    .reverse();
  
  res.json({ success: true, history });
});

// Shop - Buy diamonds
app.post('/api/buy-diamonds', (req, res) => {
  const { telegram_id, amount } = req.body;
  
  const user = db.users[telegram_id];
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const cost = amount * 5;
  
  if (user.balance < cost) {
    return res.json({ success: false, message: 'Insufficient balance' });
  }
  
  user.balance -= cost;
  user.diamonds += amount;
  
  saveData();
  
  res.json({ success: true, user });
});

// Serve the app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.listen(PORT, () => {
  console.log(`Diamondnaire server running on port ${PORT}`);
});