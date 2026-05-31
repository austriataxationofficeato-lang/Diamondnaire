// ProfileScreen.jsx — User profile, stats, transaction history
import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

function StatCard({ label, value, color = 'var(--text)', sub }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 12px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.6rem',
        color, letterSpacing: '0.03em', lineHeight: 1,
      }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ color: 'var(--muted)', fontSize: '0.65rem', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const TX_COLORS = { deposit: 'var(--green)', win: 'var(--gold)', bet: 'var(--red)', bonus: 'var(--blue)', withdraw: '#f97316' };
const TX_ICONS  = { deposit: '💳', win: '🏆', bet: '🎰', bonus: '🎁', withdraw: '💸' };

export function ProfileScreen({ user }) {
  const [spins, setSpins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stats'); // 'stats' | 'history'

  useEffect(() => {
    api.recentSpins()
      .then(d => { setSpins(d.spins || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (!user) return null;

  const winRate = user.total_spins > 0
    ? ((user.total_won / Math.max(user.total_wagered, 1)) * 100).toFixed(1)
    : '0.0';

  const netPnL = (user.total_won || 0) - (user.total_wagered || 0);

  return (
    <div className="screen fade-enter" style={{ background: 'var(--bg)' }}>
      {/* Header hero */}
      <div style={{
        background: 'linear-gradient(160deg, #111128 0%, var(--bg) 100%)',
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(245,197,24,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user.photo_url
            ? <img src={user.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--gold)' }} />
            : <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold), var(--gold2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#000',
              }}>{(user.first_name || 'P')[0]}</div>
          }
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.05em', color: 'var(--text)' }}>
              {user.first_name}{user.last_name ? ` ${user.last_name}` : ''}
            </div>
            {user.username && (
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>@{user.username}</div>
            )}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)',
              borderRadius: 6, padding: '2px 10px', marginTop: 4,
            }}>
              <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>
                #{user.rank || '—'}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.1em' }}>GLOBAL RANK</span>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div style={{
          marginTop: 16,
          background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Current Balance</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--gold)', lineHeight: 1, marginTop: 2 }}>
              {(user.credits || 0).toLocaleString()}
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 6 }}>credits</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>P&amp;L</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.3rem',
              color: netPnL >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {netPnL >= 0 ? '+' : ''}{netPnL.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', background: 'var(--bg)' }}>
        {[['stats', '📊 Stats'], ['history', '🎰 Spin History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '8px', borderRadius: 8,
            border: `1px solid ${tab === key ? 'var(--gold)' : 'var(--border)'}`,
            background: tab === key ? 'rgba(245,197,24,0.08)' : 'var(--bg2)',
            color: tab === key ? 'var(--gold)' : 'var(--muted)',
            fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
          }}>{label}</button>
        ))}
      </div>

      <div className="scroll-area" style={{ padding: '12px 16px 24px' }}>
        {tab === 'stats' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <StatCard label="Total Spins"   value={(user.total_spins || 0).toLocaleString()} />
              <StatCard label="Total Wagered" value={(user.total_wagered || 0).toLocaleString()} />
              <StatCard label="Total Won"     value={(user.total_won || 0).toLocaleString()} color="var(--gold)" />
              <StatCard label="Biggest Win"   value={(user.biggest_win || 0).toLocaleString()} color="var(--gold)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <StatCard label="Win Rate"  value={`${winRate}%`} color={parseFloat(winRate) > 50 ? 'var(--green)' : 'var(--muted)'} />
              <StatCard label="Net P&L"   value={`${netPnL >= 0 ? '+' : ''}${netPnL.toLocaleString()}`} color={netPnL >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatCard label="Rank"      value={`#${user.rank || '—'}`} color="var(--gold)" />
            </div>

            {/* RTP note */}
            <div style={{
              marginTop: 12, background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px', fontSize: '0.65rem', color: 'var(--muted)', lineHeight: 1.7,
            }}>
              <span style={{ color: 'var(--text)' }}>ℹ️ Return to Player (RTP)</span><br />
              Lucky Slots uses AI-powered RNG for fair, random outcomes. The theoretical RTP is approximately 94%. All credits are virtual and have no monetary value.
            </div>
          </>
        )}

        {tab === 'history' && (
          loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '0.8rem' }}>Loading...</div>
          ) : spins.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '0.8rem' }}>
              No spins yet — go play!
            </div>
          ) : spins.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 6,
            }}>
              <div style={{ fontSize: '1.1rem', letterSpacing: '0.05em', flex: 1 }}>
                {s.reels.join(' ')}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                {s.bet} bet
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                color: s.win > 0 ? 'var(--gold)' : 'var(--red)',
                minWidth: 60, textAlign: 'right',
              }}>
                {s.win > 0 ? `+${s.win}` : `-${s.bet}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
