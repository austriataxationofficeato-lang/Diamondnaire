// LeaderboardScreen.jsx
import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardScreen({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('won'); // 'won' | 'credits'

  useEffect(() => {
    api.leaderboard()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const board = data?.leaderboard || [];
  const stats = data?.stats || {};

  const sorted = [...board].sort((a, b) =>
    tab === 'won' ? b.total_won - a.total_won : b.credits - a.credits
  );

  return (
    <div className="screen fade-enter" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0',
        background: 'linear-gradient(180deg, var(--bg2), transparent)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '2rem',
          color: 'var(--gold)', letterSpacing: '0.1em', textAlign: 'center',
          textShadow: '0 0 30px rgba(245,197,24,0.4)',
        }}>
          🏆 LEADERBOARD
        </div>

        {/* Global stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0' }}>
          {[
            { label: 'Total Players', value: (stats.total_users || 0).toLocaleString() },
            { label: 'Total Spins', value: (stats.total_spins || 0).toLocaleString() },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)' }}>{s.value}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['won', 'Most Won'], ['credits', 'Most Credits']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8,
                border: `1px solid ${tab === key ? 'var(--gold)' : 'var(--border)'}`,
                background: tab === key ? 'rgba(245,197,24,0.1)' : 'var(--bg2)',
                color: tab === key ? 'var(--gold)' : 'var(--muted)',
                fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '0 16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '0.8rem' }}>
            Loading rankings...
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '0.8rem' }}>
            No players yet — be the first!
          </div>
        ) : (
          sorted.map((player, i) => {
            const isMe = player.telegram_id === currentUser?.telegram_id;
            const medal = MEDALS[i] || null;
            return (
              <div
                key={player.telegram_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px',
                  borderRadius: 12,
                  marginBottom: 6,
                  background: isMe ? 'rgba(245,197,24,0.08)' : 'var(--bg2)',
                  border: `1px solid ${isMe ? 'rgba(245,197,24,0.3)' : 'var(--border)'}`,
                  transition: 'background 0.15s',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 32, textAlign: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: medal ? '1.4rem' : '1.1rem',
                  color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--muted)',
                }}>
                  {medal || `#${i + 1}`}
                </div>

                {/* Avatar */}
                {player.photo_url
                  ? <img src={player.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${isMe ? 'var(--gold)' : 'var(--border)'}` }} />
                  : <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `hsl(${(player.telegram_id % 360)},50%,40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', color: '#fff', fontSize: '1rem',
                    }}>{(player.first_name || 'P')[0]}</div>
                }

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.85rem', color: isMe ? 'var(--gold)' : 'var(--text)',
                    fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {player.first_name}{isMe ? ' (You)' : ''}
                  </div>
                  {player.username && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>@{player.username}</div>
                  )}
                </div>

                {/* Value */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    color: i < 3 ? 'var(--gold)' : 'var(--text)',
                  }}>
                    {tab === 'won'
                      ? (player.total_won || 0).toLocaleString()
                      : (player.credits || 0).toLocaleString()
                    }
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
                    {tab === 'won' ? 'WON' : 'CREDITS'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
