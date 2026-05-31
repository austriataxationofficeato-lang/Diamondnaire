// GameScreen.jsx — Full commercial slot machine
import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { useTelegram } from '../hooks/useTelegram.js';

const BETS = [1, 5, 10, 25, 50, 100];
const SYMBOLS = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣','🔔'];
const PLACEHOLDER = '🎰';

// ── Confetti particle system ──────────────────────────────────────────────────
function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      particles.current = [];
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#f5c518','#e94560','#22c55e','#3b82f6','#ffffff','#ff9900'];
    for (let i = 0; i < 120; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current.forEach((p, idx) => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.rot += p.rotV;
        p.vy += 0.08; // gravity

        if (p.y > canvas.height + 20) {
          particles.current.splice(idx, 1);
          return;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.9;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (particles.current.length > 0) {
        animRef.current = requestAnimationFrame(draw);
      }
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 30,
        display: active ? 'block' : 'none',
      }}
    />
  );
}

// ── Single reel ───────────────────────────────────────────────────────────────
function Reel({ symbol, spinning, delay, win, index }) {
  const trackRef = useRef(null);

  // Build a long strip of symbols for the blur animation
  const strip = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS, ...SYMBOLS];

  return (
    <div style={{
      width: '30%',
      aspectRatio: '9/11',
      background: 'linear-gradient(180deg, #080814 0%, #0e0e20 50%, #080814 100%)',
      border: `2px solid ${win ? '#f5c518' : '#1a1a30'}`,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      transition: 'border-color 0.4s, box-shadow 0.4s',
      boxShadow: win
        ? '0 0 30px rgba(245,197,24,0.6), inset 0 0 20px rgba(245,197,24,0.1)'
        : 'inset 0 4px 12px rgba(0,0,0,0.6)',
    }}>
      {/* Spinning strip */}
      {spinning ? (
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            animation: `reelBlur ${0.1 + index * 0.02}s linear infinite`,
            animationDelay: `${delay}ms`,
          }}
        >
          {strip.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '60px', fontSize: '2rem',
              filter: 'blur(2px)', opacity: 0.5,
            }}>{s}</div>
          ))}
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
          fontSize: symbol === PLACEHOLDER ? '2rem' : '2.6rem',
          animation: symbol !== PLACEHOLDER ? 'reelLand 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          filter: win ? 'drop-shadow(0 0 12px rgba(245,197,24,0.8))' : 'none',
        }}>
          {symbol}
        </div>
      )}

      {/* Top / bottom gradient masks */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg,#080814 0%,transparent 25%,transparent 75%,#080814 100%)',
      }} />

      {/* Win shimmer overlay */}
      {win && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg,transparent 40%,rgba(245,197,24,0.08) 50%,transparent 60%)',
          backgroundSize: '200% 200%',
          animation: 'shimmerMove 1.2s linear infinite',
        }} />
      )}
    </div>
  );
}

// ── Jackpot overlay ───────────────────────────────────────────────────────────
function JackpotOverlay({ amount, onDismiss }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <div style={{
        textAlign: 'center',
        animation: 'jackpotEntrance 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 8, animation: 'spin360 2s linear infinite' }}>🎰</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '3.5rem',
          color: '#f5c518', letterSpacing: '0.1em',
          textShadow: '0 0 40px rgba(245,197,24,0.8), 0 0 80px rgba(245,197,24,0.4)',
          animation: 'jackpotPulse 0.8s ease infinite alternate',
        }}>JACKPOT!</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '2.5rem',
          color: '#ffffff', letterSpacing: '0.05em', marginTop: 8,
        }}>
          +{amount.toLocaleString()} CREDITS
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 20, letterSpacing: '0.2em' }}>
          TAP TO CONTINUE
        </div>
      </div>
    </div>
  );
}

// ── Paytable modal ────────────────────────────────────────────────────────────
const PAYTABLE_ROWS = [
  { combo: '💎 💎 💎', label: 'DIAMOND JACKPOT', mult: '100×', color: '#a78bfa' },
  { combo: '7️⃣ 7️⃣ 7️⃣', label: 'TRIPLE SEVEN',    mult: '60×',  color: '#f5c518' },
  { combo: '⭐ ⭐ ⭐', label: 'TRIPLE STAR',      mult: '30×',  color: '#f5c518' },
  { combo: '🔔 🔔 🔔', label: 'TRIPLE BELL',      mult: '20×',  color: '#f97316' },
  { combo: '🍇 🍇 🍇', label: 'TRIPLE GRAPE',     mult: '10×',  color: '#c084fc' },
  { combo: '🍊 🍊 🍊', label: 'TRIPLE ORANGE',    mult: '6×',   color: '#fb923c' },
  { combo: '🍋 🍋 🍋', label: 'TRIPLE LEMON',     mult: '4×',   color: '#facc15' },
  { combo: '🍒 🍒 🍒', label: 'TRIPLE CHERRY',    mult: '3×',   color: '#f43f5e' },
  { combo: '🍒 🍒 any', label: 'DOUBLE CHERRY',   mult: '1×',   color: '#fb7185' },
  { combo: 'any 💎 any', label: 'ANY DIAMOND',    mult: '0.5×', color: '#a78bfa' },
];

function PaytableModal({ onClose }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0e0e1e',
          borderRadius: '20px 20px 0 0',
          border: '1px solid #1e1e38',
          borderBottom: 'none',
          width: '100%',
          padding: '0 0 24px',
          animation: 'slideUp 0.25s cubic-bezier(0.34,1.26,0.64,1)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2a2a40' }} />
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.8rem',
          color: '#f5c518', textAlign: 'center', letterSpacing: '0.12em',
          padding: '12px 16px 8px',
          textShadow: '0 0 20px rgba(245,197,24,0.4)',
        }}>
          ⚡ PAY TABLE
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.65rem', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 16 }}>
          Multipliers apply per credit bet
        </div>

        {PAYTABLE_ROWS.map((row, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid #111120',
          }}>
            <div style={{ fontSize: '1.05rem', minWidth: 90, letterSpacing: '0.05em' }}>{row.combo}</div>
            <div style={{ flex: 1, color: 'var(--muted)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{row.label}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.3rem',
              color: row.color, minWidth: 44, textAlign: 'right',
            }}>{row.mult}</div>
          </div>
        ))}

        <div style={{ padding: '16px 16px 0', color: 'var(--muted)', fontSize: '0.63rem', lineHeight: 1.7, textAlign: 'center' }}>
          RNG powered by Claude AI • Results are server-side and tamper-proof<br />
          For entertainment only • 18+ • Play responsibly
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px',
              background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.3)',
              borderRadius: 10, color: '#e94560',
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em',
            }}
          >CLOSE</button>
        </div>
      </div>
    </div>
  );
}

// ── Main GameScreen ───────────────────────────────────────────────────────────
export function GameScreen({ user, onCreditsChange, onNavigate }) {
  const { haptic } = useTelegram();

  const [reels,       setReels]       = useState([PLACEHOLDER, PLACEHOLDER, PLACEHOLDER]);
  const [spinning,    setSpinning]    = useState(false);
  const [bet,         setBet]         = useState(5);
  const [credits,     setCredits]     = useState(user?.credits || 0);
  const [lastWin,     setLastWin]     = useState(null);
  const [message,     setMessage]     = useState('Pull the lever to begin!');
  const [winReels,    setWinReels]    = useState([false, false, false]);
  const [history,     setHistory]     = useState([]);
  const [showPay,     setShowPay]     = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [confetti,    setConfetti]    = useState(false);
  const [error,       setError]       = useState(null);
  const [spinCount,   setSpinCount]   = useState(0);

  useEffect(() => { setCredits(user?.credits || 0); }, [user?.credits]);

  const stopConfetti = useCallback(() => {
    setConfetti(false);
    setShowJackpot(false);
  }, []);

  async function handleSpin() {
    if (spinning || credits < bet) return;

    haptic('medium');
    setSpinning(true);
    setLastWin(null);
    setWinReels([false, false, false]);
    setError(null);
    setMessage('🎲 Spinning...');
    // Optimistic deduct
    setCredits(c => c - bet);

    try {
      const data = await api.spin(bet);

      // Staggered reel stops
      const STOP_DELAY = 1800;
      setTimeout(() => {
        setReels(data.reels);
        setSpinning(false);
        setCredits(data.credits);
        onCreditsChange?.(data.credits);
        setSpinCount(n => n + 1);

        const isJackpot = data.win >= bet * 50;
        const isBigWin  = data.win >= bet * 10 && !isJackpot;

        if (data.win > 0) {
          haptic(isJackpot ? 'heavy' : 'medium');
          setLastWin(data.win);
          setWinReels([true, true, true]);
          setConfetti(true);
          if (isJackpot) {
            setShowJackpot(true);
            setMessage('💎 JACKPOT!!!');
          } else if (isBigWin) {
            setMessage(`🔥 BIG WIN! ${data.message}`);
          } else {
            setMessage(`🎉 ${data.message} (+${data.win})`);
          }
          // Auto-clear confetti
          setTimeout(() => { if (!isJackpot) setConfetti(false); }, 3500);
        } else {
          haptic('light');
          setMessage(data.message);
        }

        setHistory(h => [{ reels: data.reels, win: data.win, bet, id: Date.now() }, ...h.slice(0, 9)]);
      }, STOP_DELAY);
    } catch (err) {
      setSpinning(false);
      setCredits(c => c + bet); // refund
      setError(err.message);
      setMessage('⚠️ Error — try again');
    }
  }

  const isWin    = lastWin > 0;
  const canSpin  = !spinning && credits >= bet;
  const cabinetGlow = isWin
    ? '0 0 60px rgba(245,197,24,0.25), inset 0 0 30px rgba(245,197,24,0.05)'
    : 'none';

  return (
    <div className="screen" style={{ background: 'var(--bg)', position: 'relative' }}>
      <style>{`
        @keyframes reelBlur {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-25%); }
        }
        @keyframes reelLand {
          0%   { transform: scale(1.35) rotate(-2deg); opacity: 0.6; }
          60%  { transform: scale(0.92) rotate(1deg); }
          100% { transform: scale(1)    rotate(0deg); opacity: 1; }
        }
        @keyframes jackpotPulse {
          from { text-shadow: 0 0 20px rgba(245,197,24,0.5); transform: scale(1); }
          to   { text-shadow: 0 0 80px rgba(245,197,24,1), 0 0 120px rgba(245,197,24,0.5); transform: scale(1.04); }
        }
        @keyframes jackpotEntrance {
          from { transform: scale(0.4) translateY(40px); opacity: 0; }
          to   { transform: scale(1) translateY(0);     opacity: 1; }
        }
        @keyframes spin360 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shimmerMove {
          from { background-position: 200% 200%; }
          to   { background-position: -200% -200%; }
        }
        @keyframes winPop {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.06); }
          60%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes creditPop {
          0%   { transform: scale(1); color: var(--gold); }
          50%  { transform: scale(1.15); color: #fff; }
          100% { transform: scale(1); }
        }
        @keyframes msgFade {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Confetti canvas */}
      <Confetti active={confetti} />

      {/* Jackpot overlay */}
      {showJackpot && <JackpotOverlay amount={lastWin} onDismiss={stopConfetti} />}

      {/* Paytable modal */}
      {showPay && <PaytableModal onClose={() => setShowPay(false)} />}

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px',
        borderBottom: '1px solid #111120',
        background: 'rgba(8,8,20,0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        flexShrink: 0,
      }}>
        {/* Balance */}
        <div>
          <div style={{ color: 'var(--muted)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>BALANCE</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--gold)',
            textShadow: '0 0 16px rgba(245,197,24,0.35)', lineHeight: 1,
            animation: isWin ? 'creditPop 0.5s ease' : 'none',
          }}>
            {credits.toLocaleString()}
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.4rem',
          letterSpacing: '0.1em', color: 'var(--text)',
          textShadow: '0 0 10px rgba(255,255,255,0.1)',
        }}>
          🎰 LUCKY SLOTS
        </div>

        {/* Paytable */}
        <button
          onClick={() => setShowPay(true)}
          style={{
            background: '#111120', border: '1px solid #1e1e38',
            borderRadius: 8, color: 'var(--muted)',
            padding: '5px 10px', fontSize: '0.65rem',
            letterSpacing: '0.06em', fontFamily: 'var(--font-mono)',
          }}
        >
          INFO
        </button>
      </div>

      {/* ── Cabinet ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px 4px', gap: 10, overflow: 'hidden' }}>

        {/* Reel window */}
        <div style={{
          background: 'linear-gradient(160deg, #0c0c1e 0%, #09091a 100%)',
          border: `2px solid ${isWin ? 'rgba(245,197,24,0.5)' : '#1a1a30'}`,
          borderRadius: 18,
          padding: '14px 10px 10px',
          boxShadow: cabinetGlow,
          transition: 'box-shadow 0.4s, border-color 0.4s',
          animation: isWin && !spinning ? 'winPop 0.5s ease' : 'none',
          flexShrink: 0,
        }}>
          {/* Message ticker */}
          <div style={{
            textAlign: 'center',
            fontFamily: isWin ? 'var(--font-display)' : 'var(--font-mono)',
            fontSize: isWin ? '1.05rem' : '0.8rem',
            letterSpacing: isWin ? '0.06em' : '0.04em',
            color: isWin ? 'var(--gold)' : 'var(--muted)',
            minHeight: '1.4rem',
            marginBottom: 10,
            animation: 'msgFade 0.3s ease',
            textShadow: isWin ? '0 0 16px rgba(245,197,24,0.4)' : 'none',
            key: message, // force re-anim
          }}>
            {message}
          </div>

          {/* Reels */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
            {reels.map((sym, i) => (
              <Reel
                key={i}
                index={i}
                symbol={sym}
                spinning={spinning}
                delay={i * 80}
                win={winReels[i]}
              />
            ))}
          </div>

          {/* Win amount */}
          <div style={{
            textAlign: 'center', minHeight: '2rem',
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem', letterSpacing: '0.06em',
            color: 'var(--gold)',
            textShadow: lastWin ? '0 0 24px rgba(245,197,24,0.6)' : 'none',
            animation: lastWin ? 'jackpotPulse 1s ease infinite alternate' : 'none',
          }}>
            {lastWin ? `+${lastWin.toLocaleString()}` : ''}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.3)',
            borderRadius: 8, padding: '8px 12px',
            color: '#e94560', fontSize: '0.75rem', textAlign: 'center', flexShrink: 0,
          }}>{error}</div>
        )}

        {/* ── Bet selector ── */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            color: 'var(--muted)', fontSize: '0.55rem', letterSpacing: '0.2em',
            textTransform: 'uppercase', textAlign: 'center', marginBottom: 5,
          }}>BET PER SPIN</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {BETS.map(b => (
              <button
                key={b}
                onClick={() => !spinning && setBet(b)}
                disabled={spinning}
                style={{
                  flex: 1, padding: '7px 2px',
                  borderRadius: 8,
                  border: `1px solid ${bet === b ? 'var(--gold)' : 'var(--border)'}`,
                  background: bet === b ? 'rgba(245,197,24,0.12)' : 'var(--bg2)',
                  color: bet === b ? 'var(--gold)' : 'var(--muted)',
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                  transition: 'all 0.12s',
                  fontWeight: bet === b ? '500' : '400',
                }}
              >{b}</button>
            ))}
          </div>
        </div>

        {/* ── Spin button ── */}
        <button
          onClick={handleSpin}
          disabled={!canSpin}
          style={{
            width: '100%',
            padding: '15px',
            fontFamily: 'var(--font-display)',
            fontSize: '1.7rem',
            letterSpacing: '0.15em',
            borderRadius: 14,
            border: 'none',
            cursor: canSpin ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            background: spinning
              ? 'linear-gradient(135deg,#222,#1a1a1a)'
              : !canSpin
              ? 'linear-gradient(135deg,#1c1c1c,#141414)'
              : 'linear-gradient(135deg, #f5c518 0%, #e8a000 100%)',
            color: canSpin && !spinning ? '#000' : '#444',
            boxShadow: canSpin && !spinning
              ? '0 4px 24px rgba(245,197,24,0.4), 0 1px 0 rgba(255,255,255,0.15) inset'
              : 'none',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {spinning
            ? 'SPINNING...'
            : credits < bet
            ? `NEED ${bet - credits} MORE`
            : `SPIN — ${bet} CR`}

          {/* Shimmer on spin btn */}
          {canSpin && !spinning && (
            <div style={{
              position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)',
              animation: 'shimmerBtn 2.5s ease infinite',
            }} />
          )}
        </button>

        {/* ── Spin history ── */}
        {history.length > 0 && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 12px',
            overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{
              color: 'var(--muted)', fontSize: '0.55rem', letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 5,
            }}>RECENT</div>
            {history.slice(0, 5).map(h => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '3px 0', borderBottom: '1px solid #111120',
              }}>
                <span style={{ fontSize: '0.85rem', letterSpacing: '0.04em', flex: 1 }}>{h.reels.join(' ')}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>{h.bet}cr</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                  color: h.win > 0 ? 'var(--gold)' : '#333', minWidth: 48, textAlign: 'right',
                }}>
                  {h.win > 0 ? `+${h.win}` : `-${h.bet}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Low credits nudge */}
        {credits < bet && !spinning && (
          <button
            onClick={() => onNavigate?.('shop')}
            style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 10, padding: '10px',
              color: '#22c55e', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              letterSpacing: '0.04em', textAlign: 'center', flexShrink: 0,
            }}
          >
            💳 Buy more credits →
          </button>
        )}
      </div>

      <style>{`
        @keyframes shimmerBtn {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
