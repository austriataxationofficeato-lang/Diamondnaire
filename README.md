# 💎 Diamondnaire - Telegram Slot Game

A full-stack server-side slot game for Telegram with real payments, global leaderboard, and Telegram login.

## Features


- 🎰 Server-side slot machine with all your specified symbols
- 💎💰 Real currency and diamond system
- 🏆 Global leaderboard for all players
- 🎟️ Ticket multipliers (x1, x3, x5, x9, x15, x25, x50, x100)
- 🧊 Ice/Freeze system - machine freezes at 100%
- ⚠️ Danger symbols with penalties
- ✨ Fair symbols with bonus rewards
- 📱 Telegram Web App integration
- 🏦 Bank, Shop, Bonuses, Gifts, Inbox, Settings menus

## Game Symbols

### Winning Symbols (3 matching)
| Symbols | Reward |
|---------|--------|
| 💎💎💎 | 10 Diamonds |
| 🏆🏆🏆 | 3000 Points |
| 🎖️🎖️🎖️ | 3000 Points |
| 💸💸💸 | $19.68 |
| 💵💵💵 | $15.00 |
| 💰💰💰 | $46.02 |
| 👑👑👑 | 3000 Points |

### Danger Symbols (Penalties)
| Symbol | 3x | 2x | 1x |
|--------|----|----|-----|
| 🧨 Bomb | -2999 | -1999 | -700 |
| 💀 Skull | -2009 | -1009 | -750 |
| ⚱️ Art | -2091 | -1099 | -720 |
| ⛏️ Miner | -2001 | -1999 | -1000 |

### Fair Symbols (Rewards for 3x)
- 🃏 Ace: 500 points
- ⭐ Star: 250 points
- 🎟️ Tickets: 10 tickets
- 🧊 Ice: 5%

## Deployment


### Backend (Render.com)
1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. Create New Web Service
4. Connect your GitHub repo
5. Set:
   - Build Command: `npm install`
   - Start Command: `node server.js`

### Frontend (Vercel)
1. Go to [Vercel.com](https://vercel.com)
2. Import from GitHub
3. Set:
   - Framework Preset: Other
   - Output Directory: public

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/init` | POST | Initialize user with Telegram |
| `/api/user/:id` | GET | Get user profile |
| `/api/spin` | POST | Spin the slot machine |
| `/api/leaderboard` | GET | Get global leaderboard |
| `/api/buy-ice` | POST | Buy ice to unfreeze |
| `/api/buy-diamonds` | POST | Buy diamonds |
| `/api/add-balance` | POST | Add balance |


## Tech Stack


- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: HTML, CSS, JavaScript
- **Integration**: Telegram Web App SDK

## License


Commercial use allowed.
