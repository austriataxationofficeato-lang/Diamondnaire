// HomeScreen.jsx — Dashboard / landing screen
import { useState } from 'react';
import { api } from '../utils/api.js';

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 10px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.4rem',
        color: accent || 'var(--text)', lineHeight: 1,
      }}>{value}</div>
      <div style={{
        color: 'var(--muted)', fontSize: '0.58rem', letterSpacing: '0.14em',
        textTransform: 'uppercase', marginTop: 3,
      }}>{label}</div>
    </div>
  );
}

export function HomeScreen({ user, onNavigate }) {
  const [bonusState, setBonusState] = useState(null); // null|'loading'|'done'|number(cooldown)

  async function claimBonus() {
    if (bonusState) return;
    setBonusState('loading');
    try {
      await api.dailyBonus();
      setBonusState('done');
    } catch (e) {
      const match = e.message.match(/(\d+)/);
      setBonusState(match ? Number(match[1]) : 'done');
    }
  }

  const name  = user?.first_name || 'Player';
  const photo = user?.photo_url;
  const netPL = (user?.total_won || 0) - (user?.total_wagered || 0);

  return (
    <div className="screen fade-enter" style={{ background: 'var(--bg)' }}>
      {/* Gold ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(245,197,24,0.09) 0%, transparent 70%)',
      }} />

      <div className="scroll-area" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '18px 16px 28px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar */}
              {photo
                ? <img src={photo} alt="" style={{
                    width: 46, height: 46, borderRadius: '50%',
                    border: '2px solid var(--gold)',
                    boxShadow: '0 0 12px rgba(245,197,24,0.3)',
                  }} />
                : <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#000',
                    boxShadow: '0 0 12px rgba(245,197,24,0.3)',
                  }}>{name[0].toUpperCase()}</div>
              }
              <div>
                <div style={{ color: 'var(--muted)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  Welcome back
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                  {name}
                </div>
              </div>
            </div>
            {/* Rank badge */}
            <div style={{
              background: 'rgba(245,197,24,0.08)',
              border: '1px solid rgba(245,197,24,0.25)',
              borderRadius: 10, padding: '6px 12px', textAlign: 'center',
            }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Rank</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
                #{user?.rank || '—'}
              </div>
            </div>
          </div>

          {/* ── Balance card ── */}
          <div style={{
            background: 'linear-gradient(145deg, #131324 0%, #0c0c1c 100%)',
            border: '1px solid rgba(245,197,24,0.2)',
            borderRadius: 20,
            padding: '22px 20px 18px',
            marginBottom: 14,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          }}>
            {/* Decorative circle */}
            <div style={{
              position: 'absolute', right: -30, top: -30,
              width: 140, height: 140, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', left: -20, bottom: -20,
              width: 100, height: 100, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
              Your Balance
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '3.2rem',
              color: 'var(--gold)', letterSpacing: '0.03em', lineHeight: 1,
              textShadow: '0 0 30px rgba(245,197,24,0.35)',
            }}>
              {(user?.credits || 0).toLocaleString()}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.65rem', marginTop: 4, marginBottom: 14 }}>credits</div>

            {/* Net P&L row */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total Won</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)' }}>
                  {(user?.total_won || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ color: 'var(--muted)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Net P&L</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: netPL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {netPL >= 0 ? '+' : ''}{netPL.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ color: 'var(--muted)', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Best Win</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)' }}>
                  {(user?.biggest_win || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mini stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            <StatPill label="Spins"    value={(user?.total_spins || 0).toLocaleString()} />
            <StatPill label="Wagered"  value={(user?.total_wagered || 0).toLocaleString()} />
            <StatPill label="Global #" value={`${user?.rank || '—'}`} accent="var(--gold)" />
          </div>

          {/* ── Daily bonus ── */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: '2rem', flexShrink: 0 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.04em' }}>
                Daily Bonus
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.68rem', marginTop: 2 }}>
                {bonusState === 'done'
                  ? '✅ +50 credits claimed!'
                  : typeof bonusState === 'number'
                  ? `⏳ Next in ${bonusState}h`
                  : '50 free credits every 20 hours'}
              </div>
            </div>
            <button
              onClick={claimBonus}
              disabled={!!bonusState}
              style={{
                background: bonusState ? 'var(--bg3)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${bonusState ? 'var(--border)' : 'rgba(34,197,94,0.35)'}`,
                color: bonusState ? 'var(--muted)' : 'var(--green)',
                borderRadius: 8, padding: '7px 14px',
                fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
              }}
            >
              {bonusState === 'loading' ? '...' : bonusState === 'done' ? '✓' : typeof bonusState === 'number' ? `${bonusState}h` : 'Claim'}
            </button>
          </div>

          {/* ── Main CTA ── */}
          <button
            className="btn-gold"
            onClick={() => onNavigate('game')}
            style={{ fontSize: '1.6rem', padding: '16px', marginBottom: 10 }}
          >
            🎰  PLAY NOW
          </button>

          {/* ── Quick links ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Buy Credits', emoji: '💎', screen: 'shop',        color: 'var(--purple)' },
              { label: 'Leaderboard', emoji: '🏆', screen: 'leaderboard', color: 'var(--gold)'   },
            ].map(item => (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '16px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  color: item.color,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--muted)', fontSize: '0.6rem', lineHeight: 1.6 }}>
            🔐 Secured by Telegram • 🎲 AI-powered RNG<br />
            For entertainment only · 18+ · Play responsibly
          </div>
        </div>
      </div>
    </div>
  );
}
