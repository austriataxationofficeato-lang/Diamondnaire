// server.js — Lucky Slots full-stack backend
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

import { telegramAuth } from './auth.js';
import { spinReels, calcWin, PAYTABLE } from './rng.js';
import {
  upsertUser,
  getUserByTelegramId,
  getUserById,
  deductCredits,
  addWin,
  addCredits,
  recordSpin,
  recordTransaction,
  getLeaderboard,
  getUserRank,
  getRecentSpins,
  getStats,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── In-memory spin rate limiter (max 2 concurrent per user) ──────────────────
const spinningUsers = new Set();


// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Auth / Profile ───────────────────────────────────────────────────────────

// POST /api/auth/login — validate initData, upsert user, return profile
app.post('/api/auth/login', telegramAuth, (req, res) => {
  const tUser = req.telegramUser;

  const user = upsertUser.get({
    telegram_id: tUser.id,
    username:    tUser.username   || null,
    first_name:  tUser.first_name || 'Player',
    last_name:   tUser.last_name  || null,
    photo_url:   tUser.photo_url  || null,
  });

  const rank = getUserRank.get(user.id);

  res.json({
    ...user,
    rank: rank?.rank || null,
  });
});

// GET /api/profile — get own profile
app.get('/api/profile', telegramAuth, (req, res) => {
  const dbUser = getUserByTelegramId.get(req.telegramUser.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  const rank = getUserRank.get(dbUser.id);
  res.json({ ...dbUser, rank: rank?.rank || null });
});

// ── Spin ─────────────────────────────────────────────────────────────────────

// POST /api/spin  { bet: number }
app.post('/api/spin', telegramAuth, async (req, res) => {
  const { bet } = req.body;
  const validBets = [1, 5, 10, 25, 50, 100];

  if (!validBets.includes(Number(bet))) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }

  const dbUser = getUserByTelegramId.get(req.telegramUser.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found. Please login.' });

  // Concurrent spin guard
  const lockKey = `spin:${dbUser.id}`;
  if (spinningUsers.has(lockKey)) {
    return res.status(429).json({ error: 'Spin already in progress' });
  }
  spinningUsers.add(lockKey);

  // Deduct bet
  const result = deductCredits.run(bet, bet, dbUser.id, bet);
  if (result.changes === 0) {
    return res.status(402).json({ error: 'Insufficient credits' });
  }

  let spinResult, win;
  try {
  // RNG
  spinResult = await spinReels(bet, dbUser.id);
  win = calcWin(spinResult.reels, bet);

  // Apply win
  if (win > 0) {
    addWin.run(win, win, win, dbUser.id);
  }

  // Record
  recordSpin.run(dbUser.id, bet, JSON.stringify(spinResult.reels), win);
  recordTransaction.run({
    user_id:           dbUser.id,
    type:              'bet',
    amount:            -bet,
    telegram_charge_id: null,
    status:            'completed',
    note:              `Spin bet`,
  });
  if (win > 0) {
    recordTransaction.run({
      user_id:           dbUser.id,
      type:              'win',
      amount:            win,
      telegram_charge_id: null,
      status:            'completed',
      note:              `Win: ${spinResult.reels.join('')}`,
    });
  }

  // Fresh user data
  const updatedUser = getUserById.get(dbUser.id);

  } catch(rngErr) {
    spinningUsers.delete(lockKey);
    // Refund on RNG error
    addCredits.run(bet, dbUser.id);
    return res.status(500).json({ error: 'Spin failed, credits refunded' });
  }
  spinningUsers.delete(lockKey);
  res.json({
    reels:   spinResult.reels,
    message: spinResult.message,
    win,
    credits: updatedUser.credits,
    stats: {
      total_spins: updatedUser.total_spins,
      total_won:   updatedUser.total_won,
      biggest_win: updatedUser.biggest_win,
    },
  });
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
app.get('/api/leaderboard', telegramAuth, (req, res) => {
  const board = getLeaderboard.all();
  const stats = getStats.get();
  res.json({ leaderboard: board, stats });
});

// ── Recent spins ──────────────────────────────────────────────────────────────
app.get('/api/spins/recent', telegramAuth, (req, res) => {
  const dbUser = getUserByTelegramId.get(req.telegramUser.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });
  const spins = getRecentSpins.all(dbUser.id);
  res.json({ spins: spins.map(s => ({ ...s, reels: JSON.parse(s.reels) })) });
});

// ── Paytable ──────────────────────────────────────────────────────────────────
app.get('/api/paytable', (req, res) => {
  res.json({ paytable: PAYTABLE });
});

// ── Payments ──────────────────────────────────────────────────────────────────
/**
 * TELEGRAM STARS PAYMENT FLOW:
 * 1. Client calls POST /api/payments/create-invoice with { package: 'small'|'medium'|'large'|'mega' }
 * 2. Backend returns { invoice_link } from Telegram Bot API
 * 3. Client opens invoice_link with Telegram.WebApp.openInvoice()
 * 4. On success, Telegram sends pre_checkout_query webhook → we answer it
 * 5. Telegram sends successful_payment webhook → we credit the user
 *
 * For real fiat payments, set TELEGRAM_PAYMENT_PROVIDER_TOKEN in .env
 * For Telegram Stars (XTR), leave provider_token empty.
 */

const CREDIT_PACKAGES = {
  starter:  { stars: 50,   credits: 500,   label: '500 Credits',   bonus: '' },
  popular:  { stars: 200,  credits: 2500,  label: '2,500 Credits', bonus: '+25% Bonus' },
  premium:  { stars: 500,  credits: 7000,  label: '7,000 Credits', bonus: '+40% Bonus' },
  whale:    { stars: 1000, credits: 15000, label: '15,000 Credits', bonus: '+50% Bonus' },
};

// POST /api/payments/create-invoice
app.post('/api/payments/create-invoice', telegramAuth, async (req, res) => {
  const { package: pkg } = req.body;
  const pack = CREDIT_PACKAGES[pkg];
  if (!pack) return res.status(400).json({ error: 'Invalid package' });

  const dbUser = getUserByTelegramId.get(req.telegramUser.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  try {
    // Create invoice via Telegram Bot API
    const payload = JSON.stringify({
      user_id: dbUser.id,
      package: pkg,
      credits: pack.credits,
    });

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:           `🎰 ${pack.label}`,
          description:     `${pack.label} for Lucky Slots${pack.bonus ? ' — ' + pack.bonus : ''}`,
          payload,
          // provider_token: '',  // empty = Telegram Stars (XTR)
          provider_token:  process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN || '',
          currency:        'XTR',  // Telegram Stars
          prices: [{ label: pack.label, amount: pack.stars }],
          photo_url:       'https://i.imgur.com/YourSlotImage.png', // replace
        }),
      }
    );

    const tgData = await tgRes.json();
    if (!tgData.ok) throw new Error(tgData.description || 'Telegram API error');

    res.json({ invoice_link: tgData.result });
  } catch (err) {
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: 'Failed to create invoice: ' + err.message });
  }
});

// POST /api/payments/packages — list packages
app.get('/api/payments/packages', (req, res) => {
  res.json({ packages: CREDIT_PACKAGES });
});

// ── Telegram Webhook (for payment callbacks) ──────────────────────────────────
app.post('/webhook/telegram', express.json(), async (req, res) => {
  const update = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // Pre-checkout query — must answer within 10s
  if (update.pre_checkout_query) {
    const pcq = update.pre_checkout_query;
    await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pre_checkout_query_id: pcq.id, ok: true }),
    });
    return res.json({ ok: true });
  }

  // Successful payment
  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const payload = JSON.parse(payment.invoice_payload);

    const user = getUserById.get(payload.user_id);
    if (user) {
      addCredits.run(payload.credits, user.id);
      recordTransaction.run({
        user_id:            user.id,
        type:               'deposit',
        amount:             payload.credits,
        telegram_charge_id: payment.telegram_payment_charge_id,
        status:             'completed',
        note:               `Purchase: ${payload.package} (${payment.total_amount} Stars)`,
      });
      console.log(`Credited ${payload.credits} to user ${user.id}`);
    }
    return res.json({ ok: true });
  }

  res.json({ ok: true });
});

// ── Daily bonus ───────────────────────────────────────────────────────────────
app.post('/api/bonus/daily', telegramAuth, (req, res) => {
  const dbUser = getUserByTelegramId.get(req.telegramUser.id);
  if (!dbUser) return res.status(404).json({ error: 'Not found' });

  // Simple daily: if last_seen is >24h ago, give bonus
  const lastSeen = new Date(dbUser.last_seen);
  const now = new Date();
  const hoursDiff = (now - lastSeen) / 1000 / 3600;

  if (hoursDiff < 20) {
    return res.status(429).json({
      error: 'Already claimed today',
      next_bonus_in: Math.ceil(20 - hoursDiff),
    });
  }

  const bonus = 50;
  addCredits.run(bonus, dbUser.id);
  recordTransaction.run({
    user_id: dbUser.id, type: 'bonus', amount: bonus,
    telegram_charge_id: null, status: 'completed', note: 'Daily bonus',
  });

  const updated = getUserById.get(dbUser.id);
  res.json({ bonus, credits: updated.credits });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎰 Lucky Slots server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
});
