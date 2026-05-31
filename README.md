# 🎰 Lucky Slots — Full-Stack Telegram Mini App

A commercial-grade slot machine game built as a Telegram Mini App with:
- **Telegram Login** (cryptographic initData validation)
- **Telegram Stars Payments** (real in-app purchases)
- **Global Leaderboard** (SQLite, real-time across all users)
- **Server-side RNG** (Claude AI Sonnet via Anthropic API)
- **Home Screen + Game Screen + Shop + Leaderboard**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Telegram App  →  Mini App WebView                  │
│                   (React + Vite)                    │
│                        │                            │
│                   HTTPS API calls                   │
│                   x-telegram-init-data header       │
│                        │                            │
│              Express.js Backend (Node)              │
│              ├─ Auth: validate initData             │
│              ├─ Spin: Claude API RNG                │
│              ├─ Payments: Telegram Stars            │
│              ├─ Leaderboard: SQLite                 │
│              └─ Webhook: payment callbacks          │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Create Your Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. `/newbot` → give it a name and username
3. Copy the **Bot Token**
4. `/newapp` → create a Mini App, set your frontend URL as the Web App URL
5. For payments: `/mybots` → select bot → **Payments** → connect a provider (or use Telegram Stars — no provider needed)

### 2. Set Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHI...
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_PAYMENT_PROVIDER_TOKEN=   # Leave empty for Telegram Stars (XTR)
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
```

### 3. Register Webhook with Telegram

After deploying, register your webhook so Telegram sends payment callbacks:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-backend-domain.com/webhook/telegram"}'
```

### 4. Deploy with Docker

```bash
# From project root
cp backend/.env.example backend/.env
# Edit backend/.env with your values

docker-compose up --build -d
```

### 5. Local Development

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Fill in .env, set DEV_BYPASS_AUTH=true for local dev
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
# Create frontend/.env.local:
# VITE_API_URL=http://localhost:3001/api
npm run dev
```

> **Note:** Telegram auth validation requires the app to run inside Telegram.  
> For local dev, set `DEV_BYPASS_AUTH=true` in backend `.env`.

---

## Payment Flow (Telegram Stars)

```
1. User taps "Buy" in Shop screen
2. Frontend → POST /api/payments/create-invoice { package: 'popular' }
3. Backend → Telegram Bot API → createInvoiceLink
4. Backend returns { invoice_link }
5. Frontend → Telegram.WebApp.openInvoice(invoice_link, callback)
6. Telegram handles payment UI natively
7. On success: Telegram → POST /webhook/telegram { successful_payment }
8. Backend credits user account in DB
9. Frontend polls /api/profile for updated balance
```

To use **real fiat payments** instead of Stars:
- Get a payment provider token from BotFather (supports Stripe, etc.)
- Set `TELEGRAM_PAYMENT_PROVIDER_TOKEN` in `.env`
- Change `currency` in server.js from `'XTR'` to `'USD'` (or your currency)
- Prices are in the smallest currency unit (cents for USD)

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | initData | Login / register user |
| GET | `/api/profile` | initData | Get own profile |
| POST | `/api/spin` | initData | Spin reels `{ bet }` |
| GET | `/api/leaderboard` | initData | Global leaderboard |
| GET | `/api/spins/recent` | initData | Last 20 spins |
| GET | `/api/paytable` | none | Paytable info |
| GET | `/api/payments/packages` | none | Credit packages |
| POST | `/api/payments/create-invoice` | initData | Create Telegram invoice |
| POST | `/api/bonus/daily` | initData | Claim daily bonus |
| POST | `/webhook/telegram` | none | Telegram payment webhooks |

---

## Paytable

| Combination | Payout |
|-------------|--------|
| 💎 💎 💎 | 100× bet |
| 7️⃣ 7️⃣ 7️⃣ | 60× bet |
| ⭐ ⭐ ⭐ | 30× bet |
| 🔔 🔔 🔔 | 20× bet |
| 🍇 🍇 🍇 | 10× bet |
| 🍊 🍊 🍊 | 6× bet |
| 🍋 🍋 🍋 | 4× bet |
| 🍒 🍒 🍒 | 3× bet |
| 🍒 🍒 any | 1× bet |
| any 💎 any | 0.5× bet |

---

## Tech Stack

- **Frontend:** React 18, Vite, Telegram WebApp SDK
- **Backend:** Node.js, Express, better-sqlite3
- **AI RNG:** Anthropic Claude Sonnet (server-side)
- **Payments:** Telegram Stars / Bot Payments API
- **Auth:** Telegram Mini App initData HMAC-SHA256 validation
- **Deploy:** Docker + nginx

---

## Legal Notice

This app uses virtual credits for entertainment purposes only.  
Credits have no real-world monetary value and cannot be withdrawn.  
Ensure compliance with gambling laws in your jurisdiction before deploying commercially.
