const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new Database('diamondnaire.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT UNIQUE,
    username TEXT,
    balance REAL DEFAULT 0,
    diamonds REAL DEFAULT 0,
    points INTEGER DEFAULT 0,
    tickets INTEGER DEFAULT 0,
    ice INTEGER DEFAULT 0,
    total_played INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    amount REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    reels TEXT,
    bet_multiplier INTEGER,
    win_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    total_winnings REAL DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

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
  '🧊': { type: 'ice', amount: 5 } // 5% as specified
};

// Ticket multipliers
const TICKET_MULTIPLIERS = [1, 3, 5, 9, 15, 25, 50, 100];
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
  
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
  
  if (!user) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO users (id, telegram_id, username, balance, diamonds, points, tickets, ice)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, telegram_id, username, 100, 5, 100, 50, 0);
    
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  
  res.json({ success: true, user });
});

// Get user profile
app.get('/api/user/:telegram_id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.params.telegram_id);
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  res.json({ success: true, user });
});

// Spin the slot machine
app.post('/api/spin', (req, res) => {
  const { telegram_id, bet_multiplier } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
  
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
  const updates = [];
  const params = [];
  
  if (result.diamonds > 0) {
    updates.push('diamonds = diamonds + ?');
    params.push(result.diamonds);
  }
  if (result.dollars > 0) {
    updates.push('balance = balance + ?');
    params.push(result.dollars);
  }
  if (result.points !== 0) {
    updates.push('points = points + ?');
    params.push(result.points);
  }
  if (result.tickets > 0) {
    updates.push('tickets = tickets + ?');
    params.push(result.tickets);
  }
  if (result.ice > 0) {
    updates.push('ice = ice + ?');
    params.push(result.ice);
  }
  
  updates.push('total_played = total_played + 1');
  params.push(user.id);
  
  if (updates.length > 1) {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  
  // Record game history
  const historyId = uuidv4();
  db.prepare(`
    INSERT INTO game_history (id, user_id, reels, bet_multiplier, win_amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(historyId, user.id, JSON.stringify(reels), bet_multiplier, result.dollars + result.diamonds);
  
  // Update leaderboard
  if (result.dollars > 0 || result.diamonds > 0) {
    db.prepare(`
      INSERT INTO leaderboard (user_id, username, total_winnings, games_played)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET
        total_winnings = total_winnings + ?,
        games_played = games_played + 1
    `).run(user.id, user.username, result.dollars + result.diamonds, result.dollars + result.diamonds);
  }
  
  // Get updated user
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  
  res.json({
    success: true,
    reels,
    result,
    user: updatedUser
  });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT * FROM leaderboard
    ORDER BY total_winnings DESC
    LIMIT 100
  `).all();
  
  res.json({ success: true, leaderboard });
});

// Buy Ice (unfreeze machine)
app.post('/api/buy-ice', (req, res) => {
  const { telegram_id, amount } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const cost = amount * 10; // 10 dollars per ice unit
  
  if (user.balance < cost) {
    return res.json({ success: false, message: 'Insufficient balance' });
  }
  
  db.prepare(`
    UPDATE users SET balance = balance - ?, ice = ice - ? WHERE id = ?
  `).run(cost, amount, user.id);
  
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  
  res.json({ success: true, user: updatedUser });
});

// Add balance (for testing / payments)
app.post('/api/add-balance', (req, res) => {
  const { telegram_id, amount } = req.body;
  
  db.prepare(`
    UPDATE users SET balance = balance + ? WHERE telegram_id = ?
  `).run(amount, telegram_id);
  
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
  
  res.json({ success: true, user });
});

// Get game history
app.get('/api/history/:telegram_id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.params.telegram_id);
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const history = db.prepare(`
    SELECT * FROM game_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(user.id);
  
  res.json({ success: true, history });
});

// Shop - Buy diamonds
app.post('/api/buy-diamonds', (req, res) => {
  const { telegram_id, amount } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
  
  if (!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  const cost = amount * 5; // 5 dollars per diamond
  
  if (user.balance < cost) {
    return res.json({ success: false, message: 'Insufficient balance' });
  }
  
  db.prepare(`
    UPDATE users SET balance = balance - ?, diamonds = diamonds + ? WHERE id = ?
  `).run(cost, amount, user.id);
  
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  
  res.json({ success: true, user: updatedUser });
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