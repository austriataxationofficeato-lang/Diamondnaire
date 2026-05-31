// App.jsx — root component with 5-tab nav
import { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram.js';
import { api } from './utils/api.js';
import { HomeScreen }        from './pages/HomeScreen.jsx';
import { GameScreen }        from './pages/GameScreen.jsx';
import { LeaderboardScreen } from './pages/LeaderboardScreen.jsx';
import { ShopScreen }        from './pages/ShopScreen.jsx';
import { ProfileScreen }     from './pages/ProfileScreen.jsx';
import './globals.css';

// ── SVG Nav Icons ─────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const SlotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <line x1="8"  y1="4"  x2="8"  y2="20"/>
    <line x1="16" y1="4"  x2="16" y2="20"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="5"  cy="10" r="1"/>
    <circle cx="5"  cy="14" r="1"/>
    <circle cx="19" cy="10" r="1"/>
    <circle cx="19" cy="14" r="1"/>
  </svg>
);
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 21 12 21 16 21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <path d="M7 4H4a2 2 0 00-2 2v3c0 4 3 7 7 8"/>
    <path d="M17 4h3a2 2 0 012 2v3c0 4-3 7-7 8"/>
    <rect x="7" y="2" width="10" height="11" rx="1"/>
  </svg>
);
const ShopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const NAV = [
  { key: 'home',        label: 'Home',    Icon: HomeIcon },
  { key: 'game',        label: 'Play',    Icon: SlotIcon },
  { key: 'leaderboard', label: 'Ranks',   Icon: TrophyIcon },
  { key: 'shop',        label: 'Shop',    Icon: ShopIcon },
  { key: 'profile',     label: 'Me',      Icon: UserIcon },
];

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <style>{`
        @keyframes logoPulse {
          0%,100% { transform: scale(1);    filter: drop-shadow(0 0 20px rgba(245,197,24,0.4)); }
          50%      { transform: scale(1.08); filter: drop-shadow(0 0 50px rgba(245,197,24,0.9)); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: scaleY(1);   opacity: 0.4; }
          40%          { transform: scaleY(1.6); opacity: 1; }
        }
      `}</style>
      <div style={{ fontSize: '5rem', animation: 'logoPulse 1.6s ease infinite' }}>🎰</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--gold)', letterSpacing: '0.15em' }}>
        LUCKY SLOTS
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 7, height: 20, borderRadius: 4,
            background: 'var(--gold)', opacity: 0.4,
            animation: `dotBounce 1s ease ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorScreen({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 14, textAlign: 'center',
    }}>
      <div style={{ fontSize: '3.5rem' }}>⚠️</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#e94560', letterSpacing: '0.06em' }}>
        Cannot Connect
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '0.78rem', lineHeight: 1.7, maxWidth: 280 }}>
        {message}<br /><br />
        Please open Lucky Slots through the Telegram app.
      </div>
      <div style={{
        marginTop: 8, padding: '10px 20px',
        background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.25)',
        borderRadius: 8, color: '#e94560', fontSize: '0.7rem', letterSpacing: '0.1em',
      }}>
        t.me/YourBotUsername
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { ready, haptic } = useTelegram();
  const [screen,    setScreen]    = useState('home');
  const [user,      setUser]      = useState(null);
  const [authError, setAuthError] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!ready) return;
    api.login()
      .then(u  => { setUser(u);          setLoading(false); })
      .catch(e => { setAuthError(e.message); setLoading(false); });
  }, [ready]);

  function navigate(dest) {
    if (dest === screen) return;
    haptic('light');
    setScreen(dest);
  }

  function handleCreditsChange(newCredits) {
    setUser(u => u ? { ...u, credits: newCredits } : u);
  }

  async function handlePurchaseSuccess() {
    try { const u = await api.profile(); setUser(u); } catch {}
  }

  if (!ready || loading) return <LoadingScreen />;
  if (authError)          return <ErrorScreen message={authError} />;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', overflow: 'hidden',
    }}>
      {/* ── Screens ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {screen === 'home'        && <HomeScreen        user={user}         onNavigate={navigate} />}
        {screen === 'game'        && <GameScreen        user={user}         onCreditsChange={handleCreditsChange} onNavigate={navigate} />}
        {screen === 'leaderboard' && <LeaderboardScreen currentUser={user} />}
        {screen === 'shop'        && <ShopScreen        onPurchaseSuccess={handlePurchaseSuccess} />}
        {screen === 'profile'     && <ProfileScreen     user={user} />}
      </div>

      {/* ── Bottom navigation ── */}
      <nav style={{
        display: 'flex',
        background: 'rgba(10,10,18,0.97)',
        borderTop: '1px solid #111120',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
        position: 'relative', zIndex: 20,
      }}>
        {NAV.map(({ key, label, Icon }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '9px 2px 7px',
                background: 'none', border: 'none',
                color: active ? 'var(--gold)' : '#333344',
                gap: 3,
                transition: 'color 0.15s',
                position: 'relative',
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2, borderRadius: '0 0 2px 2px',
                  background: 'var(--gold)',
                  boxShadow: '0 0 8px rgba(245,197,24,0.6)',
                }} />
              )}
              <div style={{ width: 22, height: 22 }}><Icon /></div>
              <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
