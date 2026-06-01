// db.js - JSON File-based storage (no native modules)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'slots.json');

// Ensure data directory exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// Initialize empty database
let db = {
  users: {},
  spins: [],
  transactions: []
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(data);
    }
  } catch (e) {
    console.log('Starting fresh data store');
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

loadData();

// User queries
export const upsertUser = (user) => {
  if (!db.users[user.telegram_id]) {
    db.users[user.telegram_id] = {
      id: user.telegram_id,
      telegram_id: user.telegram_id,
      username: user.username || null,
      first_name: user.first_name || 'Player',
      last_name: user.last_name || null,
      photo_url: user.photo_url || null,
      credits: 100,
      total_wagered: 0,
      total_won: 0,
      total_spins: 0,
      biggest_win: 0,
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString()
    };
  } else {
    db.users[user.telegram_id].last_seen = new Date().toISOString();
    if (user.username) db.users[user.telegram_id].username = user.username;
    if (user.first_name) db.users[user.telegram_id].first_name = user.first_name;
    if (user.last_name) db.users[user.telegram_id].last_name = user.last_name;
    if (user.photo_url) db.users[user.telegram_id].photo_url = user.photo_url;
  }
  saveData();
  return db.users[user.telegram_id];
};

export const getUserByTelegramId = (telegram_id) => {
  return db.users[telegram_id] || null;
};

export const getUserById = (id) => {
  return db.users[id] || null;
};

export const deductCredits = (id, credits, bet, reels, win) => {
  const user = db.users[id];
  if (!user) return null;
  
  user.credits = credits;
  user.total_wagered += bet;
  user.total_spins += 1;
  if (win > 0) {
    user.total_won += win;
    if (win > user.biggest_win) user.biggest_win = win;
  }
  
  // Record spin
  db.spins.push({
    id: Date.now(),
    user_id: id,
    bet,
    reels: JSON.stringify(reels),
    win,
    created_at: new Date().toISOString()
  });
  
  // Keep only last 10000 spins
  if (db.spins.length > 10000) {
    db.spins = db.spins.slice(-10000);
  }
  
  saveData();
  return user;
};

export const addWin = (id, credits, winAmount) => {
  const user = db.users[id];
  if (!user) return null;
  
  user.credits = credits;
  user.total_won += winAmount;
  if (winAmount > user.biggest_win) user.biggest_win = winAmount;
  
  saveData();
  return user;
};

export const addCredits = (id, amount, type, note) => {
  const user = db.users[id];
  if (!user) return null;
  
  user.credits += amount;
  
  // Record transaction
  db.transactions.push({
    id: Date.now(),
    user_id: id,
    type,
    amount,
    note,
    created_at: new Date().toISOString()
  });
  
  saveData();
  return user;
};

export const getLeaderboard = () => {
  return Object.values(db.users)
    .sort((a, b) => b.total_won - a.total_won)
    .slice(0, 100);
};

export const getUserRank = (id) => {
  const leaderboard = getLeaderboard();
  return leaderboard.findIndex(u => u.telegram_id === id) + 1;
};

export const getRecentSpins = (telegram_id) => {
  return db.spins
    .filter(s => s.user_id === telegram_id)
    .slice(-50)
    .reverse();
};

export const getStats = () => {
  const users = Object.values(db.users);
  return {
    totalUsers: users.length,
    totalSpins: db.spins.length,
    totalWagered: users.reduce((sum, u) => sum + (u.total_wagered || 0), 0),
    totalWon: users.reduce((sum, u) => sum + (u.total_won || 0), 0)
  };
};
