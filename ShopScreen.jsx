// ShopScreen.jsx
import { useState } from 'react';
import { api } from '../utils/api.js';
import { useTelegram } from '../hooks/useTelegram.js';

const PACKAGES = [
  {
    key: 'starter',
    stars: 50,
    credits: 500,
    label: 'Starter Pack',
    emoji: '🎟️',
    badge: null,
    color: '#3b82f6',
  },
  {
    key: 'popular',
    stars: 200,
    credits: 2500,
    label: 'Popular Pack',
    emoji: '⭐',
    badge: 'MOST POPULAR',
    color: '#f5c518',
    bonusLabel: '+25% Bonus',
  },
  {
    key: 'premium',
    stars: 500,
    credits: 7000,
    label: 'Premium Pack',
    emoji: '💎',
    badge: 'BEST VALUE',
    color: '#22c55e',
    bonusLabel: '+40% Bonus',
  },
  {
    key: 'whale',
    stars: 1000,
    credits: 15000,
    label: 'Whale Pack',
    emoji: '🐋',
    badge: 'VIP',
    color: '#e94560',
    bonusLabel: '+50% Bonus',
  },
];

export function ShopScreen({ onPurchaseSuccess }) {
  const { openInvoice, haptic, showAlert } = useTelegram();
  const [loading, setLoading] = useState(null); // pkg key being purchased

  async function handleBuy(pkg) {
    if (loading) return;
    haptic('medium');
    setLoading(pkg.key);

    try {
      const { invoice_link } = await api.createInvoice(pkg.key);
      openInvoice(
        invoice_link,
        () => {
          haptic('heavy');
          showAlert(`🎉 ${pkg.credits.toLocaleString()} credits added to your account!`, () => {
            onPurchaseSuccess?.();
          });
          setLoading(null);
        },
        (status) => {
          if (status !== 'cancelled') {
            showAlert('Payment failed. Please try again.');
          }
          setLoading(null);
        }
      );
    } catch (err) {
      showAlert('Could not create invoice: ' + err.message);
      setLoading(null);
    }
  }

  return (
    <div className="screen fade-enter" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '2rem',
          color: 'var(--gold)', letterSpacing: '0.1em',
          textShadow: '0 0 30px rgba(245,197,24,0.4)',
        }}>
          💎 CREDIT SHOP
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.7rem', marginBottom: 16, letterSpacing: '0.05em' }}>
          Pay securely with Telegram Stars ⭐
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '0 16px 24px' }}>
        {PACKAGES.map(pkg => (
          <div
            key={pkg.key}
            style={{
              background: 'var(--bg2)',
              border: `1px solid ${pkg.badge ? pkg.color + '66' : 'var(--border)'}`,
              borderRadius: 16,
              padding: '16px',
              marginBottom: 10,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {pkg.badge && (
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: pkg.color, color: '#000',
                fontSize: '0.55rem', fontFamily: 'var(--font-display)',
                letterSpacing: '0.1em', padding: '3px 8px',
                borderRadius: 4,
              }}>
                {pkg.badge}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Icon */}
              <div style={{
                width: 54, height: 54, borderRadius: 14,
                background: `${pkg.color}22`, border: `1px solid ${pkg.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', flexShrink: 0,
              }}>
                {pkg.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em', color: 'var(--text)' }}>
                  {pkg.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: pkg.color }}>
                    {pkg.credits.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>credits</span>
                  {pkg.bonusLabel && (
                    <span style={{ color: 'var(--green)', fontSize: '0.65rem', background: 'rgba(34,197,94,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      {pkg.bonusLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Buy button */}
              <button
                onClick={() => handleBuy(pkg)}
                disabled={!!loading}
                style={{
                  background: loading === pkg.key ? 'var(--bg3)' : `linear-gradient(135deg, ${pkg.color}, ${pkg.color}bb)`,
                  color: loading === pkg.key ? 'var(--muted)' : '#000',
                  border: 'none', borderRadius: 10,
                  padding: '10px 14px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.05em',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: 70,
                  transition: 'all 0.15s',
                }}
              >
                {loading === pkg.key ? (
                  <span style={{ fontSize: '0.7rem' }}>...</span>
                ) : (
                  <>
                    <span>⭐ {pkg.stars}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>Stars</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {/* Info */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px', marginTop: 8,
        }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.65rem', lineHeight: 1.7 }}>
            <div style={{ color: 'var(--text)', fontSize: '0.75rem', marginBottom: 6, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
              HOW IT WORKS
            </div>
            ⭐ Payments use Telegram Stars — secure, instant.<br />
            💳 No credit card or external signup needed.<br />
            🔒 Payments processed by Telegram's secure system.<br />
            📜 Credits are for entertainment only. No real-money value.
          </div>
        </div>
      </div>
    </div>
  );
}
