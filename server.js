const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./diamondnaire.db');

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    username TEXT,
    first_name TEXT,
    points INTEGER DEFAULT 0,
    diamonds INTEGER DEFAULT 0,
    tickets INTEGER DEFAULT 100,
    ice INTEGER DEFAULT 0,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Game history
  db.run(`CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    reels TEXT,
    bet_multiplier INTEGER,
    win_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Leaderboard
  db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    total_points INTEGER DEFAULT 0,
    total_wins REAL DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Bonuses
  db.run(`CREATE TABLE IF NOT EXISTS bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    amount REAL,
    claimed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Shop items
  db.run(`CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price_type TEXT,
    price_amount REAL,
    reward_type TEXT,
    reward_amount REAL,
    icon TEXT
  )`);


  // Insert default shop items
  db.run(`INSERT OR IGNORE INTO shop_items (name, price_type, price_amount, reward_type, reward_amount, icon) VALUES
    ('Ice Pack', 'diamonds', 50, 'ice', 100, '🧊'),
    ('Diamond Pack', 'dollars', 5, 'diamonds', 10, '💎'),
    ('Ticket Pack', 'diamonds', 10, 'tickets', 50, '🎟️'),
    ('Points Boost', 'diamonds', 25, 'points', 1000, '🏅')
  `);
});

// Game symbols
const SYMBOLS = ['💎', '👑', '💀', '⚱️', '🎖️', '🏆', '🧊', '🥶', '🃏', '💰', '⭐', '⛏️', '💵', '💸', '🧨'];

// Winning combinations (per symbol)
const WIN_RATES = {
  '💎': { three: 10, two: 2 },
  '👑': { three: 3000, two: 100 },
  '💀': { three: -2009, two: -1009, one: -750 },
  '⚱️': { three: -2091, two: -1099, one: -720 },
  '🎖️': { three: 3000, two: 100 },
  '🏆': { three: 3000, two: 100 },
  '🧊': { three: 0.05, two: 0.02 },
  '🥶': { three: 0, two: 0 },
  '🃏': { three: 500, two: 50 },
  '💰': { three: 46.02, two: 10 },
  '⭐': { three: 250, two: 25 },
  '⛏️': { three: -2001, two: -1999, one: -1000 },
  '💵': { three: 15.00, two: 5 },
  '💸': { three: 19.68, two: 5 },
  '🧨': { three: -2999, two: -1999, one: -700 }
};

// Ticket multipliers
const TICKET_MULTIPLIERS = [1, 3, 5, 9, 15, 25, 50, 100];

// Helper: Generate random reels
function generateReels() {
  const reels = [];
  for (let i = 0; i < 3; i++) {
    reels.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  return reels;
}

// Helper: Calculate winnings
function calculateWinnings(reels, betMultiplier) {
  const [r1, r2, r3] = reels;
  let totalWin = 0;
  let winDetails = [];

  // Count symbols
  const counts = {};
  reels.forEach(s => counts[s] = (counts[s] || 0) + 1);

  // Check for three of a kind
  for (const [symbol, count] of Object.entries(counts)) {
    if (count === 3) {
      const rate = WIN_RATES[symbol];
      if (rate && rate.three !== undefined) {
        let win = rate.three;
        if (typeof win === 'number' && win > 0) {
          win = win * betMultiplier;
        }
        totalWin += win;
        winDetails.push({ symbol, count: 3, win });
      }
    }
  }

  // Check for two of a kind (only if no three of a kind for that symbol)
  for (const [symbol, count] of Object.entries(counts)) {
    if (count === 2) {
      const rate = WIN_RATES[symbol];
      if (rate && rate.two !== undefined) {
        let win = rate.two;
        if (typeof win === 'number' && win > 0) {
          win = win * betMultiplier;
        }
        totalWin += win;
        winDetails.push({ symbol, count: 2, win });
      }
    }
  }

  // Special: Ace gives 500pts for three
  if (r1 === '🃏' && r2 === '🃏' && r3 === '🃏') {
    totalWin += 500 * betMultiplier;
    winDetails.push({ symbol: '🃏', count: 3, win: 500 * betMultiplier });
  }

  // Special: Star gives 250pts for three
  if (r1 === '⭐' && r2 === '⭐' && r3 === '⭐') {
    totalWin += 250 * betMultiplier;
    winDetails.push({ symbol: '⭐', count: 3, win: 250 * betMultiplier });
  }

  // Special: Tickets give 10 for three
  if (r1 === '🎟️' && r2 === '🎟️' && r3 === '🎟️') {
    totalWin += 10 * betMultiplier;
    winDetails.push({ symbol: '🎟️', count: 3, win: 10 * betMultiplier });
  }

  // Special: Ice gives 5% for three
  if (r1 === '🧊' && r2 === '🧊' && r3 === '🧊') {
    totalWin += 0.05;
    winDetails.push({ symbol: '🧊', count: 3, win: '5%' });
  }

  return { totalWin, winDetails };
}

// API: Initialize/Register user (Telegram login)
app.post('/api/auth', (req, res) => {
  const { telegram_id, username, first_name } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id required' });
  }

  db.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!user) {
      // Create new user
      db.run(`INSERT INTO users (telegram_id, username, first_name, tickets) VALUES (?, ?, ?, 100)`,
        [telegram_id, username || '', first_name || ''], function(err) {
          if (err) return res.status(500).json({ error: err.message });

          // Create leaderboard entry
          db.run(`INSERT INTO leaderboard (user_id, total_points, total_wins, games_played) VALUES (?, 0, 0, 0)`,
            [this.lastID]);

          db.get(`SELECT * FROM users WHERE id = ?`, [this.lastID], (err, newUser) => {
            res.json({ user: newUser });
          });
        });
    } else {
      res.json({ user });
    }
  });
});

// API: Get user profile
app.get('/api/user/:telegram_id', (req, res) => {
  db.get(`SELECT * FROM users WHERE telegram_id = ?`, [req.params.telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });
});

// API: Spin the slot machine
app.post('/api/spin', (req, res) => {
  const { telegram_id, bet_multiplier } = req.body;

  if (!telegram_id || !bet_multiplier) {
    return res.status(400).json({ error: 'telegram_id and bet_multiplier required' });
  }

  // Validate bet multiplier
  if (!TICKET_MULTIPLIERS.includes(bet_multiplier)) {
    return res.status(400).json({ error: 'Invalid bet multiplier' });
  }

  db.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check tickets
    const ticketsNeeded = bet_multiplier;
    if (user.tickets < ticketsNeeded) {
      return res.status(400).json({ error: 'Not enough tickets', need: ticketsNeeded, have: user.tickets });
    }

    // Check if machine is frozen
    if (user.ice <= 0) {
      return res.status(400).json({ error: 'Machine is frozen. Buy Ice to continue!', frozen: true });
    }

    // Deduct tickets
    db.run(`UPDATE users SET tickets = tickets - ? WHERE telegram_id = ?`, [ticketsNeeded, telegram_id]);

    // Generate reels
    const reels = generateReels();

    // Calculate winnings
    const { totalWin, winDetails } = calculateWinnings(reels, bet_multiplier);

    // Update user balance and points
    let newPoints = user.points;
    let newDiamonds = user.diamonds;
    let newBalance = user.balance;
    let newIce = user.ice;

    if (totalWin > 0) {
      // Positive win
      if (totalWin >= 1) {
        newBalance += totalWin;
      }
      newPoints += Math.floor(totalWin);

      // Check for diamond win
      if (reels[0] === '💎' && reels[1] === '💎' && reels[2] === '💎') {
        newDiamonds += 10;
      }
    } else if (totalWin < 0) {
      // Negative win (penalty)
      newPoints += Math.floor(totalWin);
      if (newPoints < 0) newPoints = 0;
    }

    // Ice calculation: decrease by bet amount, add if ice symbols appear
    newIce -= bet_multiplier * 0.1;
    const iceCount = reels.filter(s => s === '🧊').length;
    newIce += iceCount * 2;
    if (newIce < 0) newIce = 0;
    if (newIce > 100) newIce = 100;

    // Update user
    db.run(`UPDATE users SET points = ?, diamonds = ?, balance = ?, ice = ? WHERE telegram_id = ?`,
      [newPoints, newDiamonds, newBalance, newIce, telegram_id]);

    // Update leaderboard
    db.run(`UPDATE leaderboard SET 
      total_points = total_points + ?,
      total_wins = total_wins + ?,
      games_played = games_played + 1
    WHERE user_id = ?`, [Math.floor(totalWin), totalWin > 0 ? totalWin : 0, user.id]);

    // Save game history
    db.run(`INSERT INTO game_history (user_id, reels, bet_multiplier, win_amount) VALUES (?, ?, ?, ?)`,
      [user.id, JSON.stringify(reels), bet_multiplier, totalWin]);

    res.json({
      reels,
      win: totalWin,
      winDetails,
      newBalance,
      newPoints,
      newDiamonds,
      newTickets: user.tickets - ticketsNeeded,
      newIce: Math.round(newIce)
    });
  });
});

// API: Get global leaderboard
app.get('/api/leaderboard', (req, res) => {
  db.all(`SELECT 
    l.user_id,
    u.username,
    u.first_name,
    l.total_points,
    l.total_wins,
    l.games_played
  FROM leaderboard l
  JOIN users u ON l.user_id = u.id
  ORDER BY l.total_points DESC
  LIMIT 50`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ leaderboard: rows });
  });
});

// API: Get shop items
app.get('/api/shop', (req, res) => {
  db.all(`SELECT * FROM shop_items`, [], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ items });
  });
});

// API: Purchase item
app.post('/api/shop/buy', (req, res) => {
  const { telegram_id, item_id } = req.body;

  db.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.get(`SELECT * FROM shop_items WHERE id = ?`, [item_id], (err, item) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!item) return res.status(404).json({ error: 'Item not found' });

      // Check if user can afford
      let userCurrency = 0;
      if (item.price_type === 'diamonds') userCurrency = user.diamonds;
      else if (item.price_type === 'dollars') userCurrency = user.balance;
      else if (item.price_type === 'points') userCurrency = user.points;

      if (userCurrency < item.price_amount) {
        return res.status(400).json({ error: 'Not enough currency', need: item.price_amount, have: userCurrency });
      }

      // Deduct price
      let updateSql = '';
      if (item.price_type === 'diamonds') updateSql = 'UPDATE users SET diamonds = diamonds - ?';
      else if (item.price_type === 'dollars') updateSql = 'UPDATE users SET balance = balance - ?';
      else if (item.price_type === 'points') updateSql = 'UPDATE users SET points = points - ?';

      db.run(updateSql + ' WHERE telegram_id = ?', [item.price_amount, telegram_id]);

      // Add reward
      let rewardSql = '';
      if (item.reward_type === 'ice') rewardSql = 'UPDATE users SET ice = ice + ?';
      else if (item.reward_type === 'diamonds') rewardSql = 'UPDATE users SET diamonds = diamonds + ?';
      else if (item.reward_type === 'tickets') rewardSql = 'UPDATE users SET tickets = tickets + ?';
      else if (item.reward_type === 'points') rewardSql = 'UPDATE users SET points = points + ?';

      db.run(rewardSql + ' WHERE telegram_id = ?', [item.reward_amount, telegram_id]);

      res.json({ success: true, item, reward: item.reward_amount });
    });
  });
});

// API: Get bonuses
app.get('/api/bonuses/:telegram_id', (req, res) => {
  db.all(`SELECT * FROM bonuses WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?) AND claimed = 0`, 
    [req.params.telegram_id], (err, bonuses) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ bonuses });
  });
});

// API: Claim bonus
app.post('/api/bonuses/claim', (req, res) => {
  const { telegram_id, bonus_id } = req.body;

  db.get(`SELECT * FROM bonuses WHERE id = ? AND user_id = (SELECT id FROM users WHERE telegram_id = ?)`,
    [bonus_id, telegram_id], (err, bonus) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!bonus) return res.status(404).json({ error: 'Bonus not found' });
    if (bonus.claimed) return res.status(400).json({ error: 'Already claimed' });

    // Mark as claimed
    db.run(`UPDATE bonuses SET claimed = 1 WHERE id = ?`, [bonus_id]);

    // Add to user balance
    if (bonus.type === 'diamonds') {
      db.run(`UPDATE users SET diamonds = diamonds + ? WHERE telegram_id = ?`, [bonus.amount, telegram_id]);
    } else if (bonus.type === 'tickets') {
      db.run(`UPDATE users SET tickets = tickets + ? WHERE telegram_id = ?`, [bonus.amount, telegram_id]);
    } else if (bonus.type === 'points') {
      db.run(`UPDATE users SET points = points + ? WHERE telegram_id = ?`, [bonus.amount, telegram_id]);
    }

    res.json({ success: true });
  });
});

// API: Add funds (Telegram Stars payment simulation)
app.post('/api/payment/add-funds', (req, res) => {
  const { telegram_id, amount, payment_method } = req.body;

  // In production, this would integrate with Telegram Stars API
  // For now, simulate payment
  db.run(`UPDATE users SET balance = balance + ? WHERE telegram_id = ?`, [amount, telegram_id]);

  res.json({ success: true, newBalance: amount });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Diamondnaire server running on port ${PORT}`);
});