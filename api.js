// api.js — centralised API client with Telegram auth header

const BASE = import.meta.env.VITE_API_URL || '/api';

function getInitData() {
  // In Telegram Mini App, window.Telegram.WebApp.initData holds the auth string
  return window.Telegram?.WebApp?.initData || '';
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  login:           ()        => request('POST', '/auth/login'),
  profile:         ()        => request('GET',  '/profile'),
  spin:            (bet)     => request('POST', '/spin', { bet }),
  leaderboard:     ()        => request('GET',  '/leaderboard'),
  recentSpins:     ()        => request('GET',  '/spins/recent'),
  paytable:        ()        => request('GET',  '/paytable'),
  packages:        ()        => request('GET',  '/payments/packages'),
  createInvoice:   (pkg)     => request('POST', '/payments/create-invoice', { package: pkg }),
  dailyBonus:      ()        => request('POST', '/bonus/daily'),
};
