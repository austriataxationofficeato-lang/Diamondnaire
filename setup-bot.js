#!/usr/bin/env node
/**
 * setup-bot.js — Run once after deployment to configure your Telegram bot
 * Usage: TELEGRAM_BOT_TOKEN=xxx WEBHOOK_URL=https://your-domain.com node setup-bot.js
 */

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. https://yourdomain.com
const APP_URL     = process.env.APP_URL || WEBHOOK_URL; // Mini App URL

if (!BOT_TOKEN || !WEBHOOK_URL) {
  console.error('Usage: TELEGRAM_BOT_TOKEN=xxx WEBHOOK_URL=https://yourdomain.com node setup-bot.js');
  process.exit(1);
}

async function tgCall(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`${method}:`, data.ok ? '✅ OK' : `❌ ${data.description}`);
  return data;
}

async function setup() {
  console.log('\n🎰 Lucky Slots — Bot Setup\n');

  // 1. Set webhook
  await tgCall('setWebhook', {
    url:             `${WEBHOOK_URL}/webhook/telegram`,
    allowed_updates: ['message', 'pre_checkout_query'],
    drop_pending_updates: true,
  });

  // 2. Set bot commands
  await tgCall('setMyCommands', {
    commands: [
      { command: 'start',  description: '🎰 Open Lucky Slots' },
      { command: 'play',   description: '▶️  Go to game' },
      { command: 'help',   description: '❓ Help & support' },
    ],
  });

  // 3. Set bot description
  await tgCall('setMyDescription', {
    description: '🎰 Lucky Slots — The #1 AI-powered slot machine on Telegram! Spin to win, climb the global leaderboard, and buy credits with Telegram Stars.',
  });

  // 4. Set short description
  await tgCall('setMyShortDescription', {
    short_description: '🎰 AI-powered slot machine with global leaderboard & Telegram Stars payments',
  });

  // 5. Set menu button to launch the Mini App
  if (APP_URL) {
    await tgCall('setChatMenuButton', {
      menu_button: {
        type:     'web_app',
        text:     '🎰 Play Now',
        web_app:  { url: APP_URL },
      },
    });
  }

  // 6. Verify webhook
  const info = await tgCall('getWebhookInfo', {});
  if (info.ok) {
    console.log('\nWebhook info:');
    console.log('  URL:            ', info.result.url);
    console.log('  Pending updates:', info.result.pending_update_count);
    console.log('  Last error:     ', info.result.last_error_message || 'none');
  }

  console.log('\n✅ Bot setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Message @BotFather → /mybots → your bot → Payments');
  console.log('     to enable Telegram Stars or connect a payment provider.');
  console.log('  2. Test your Mini App by opening it in Telegram.');
  console.log('  3. Monitor /health endpoint for server status.\n');
}

setup().catch(console.error);
