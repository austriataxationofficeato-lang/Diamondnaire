// useTelegram.js
import { useEffect, useState } from 'react';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0a0a12');
      tg.setBackgroundColor('#0a0a12');
      setReady(true);
    } else {
      // Non-Telegram browser (dev mode)
      setReady(true);
    }
  }, []);

  function openInvoice(link, onSuccess, onFail) {
    if (tg?.openInvoice) {
      tg.openInvoice(link, (status) => {
        if (status === 'paid') onSuccess?.();
        else onFail?.(status);
      });
    } else {
      // Dev fallback
      window.open(link, '_blank');
      onSuccess?.();
    }
  }

  function haptic(type = 'light') {
    tg?.HapticFeedback?.impactOccurred(type);
  }

  function showAlert(msg, cb) {
    if (tg?.showAlert) tg.showAlert(msg, cb);
    else { alert(msg); cb?.(); }
  }

  const user = tg?.initDataUnsafe?.user || {
    id: 0,
    first_name: 'Player',
    username: 'player',
  };

  return { tg, ready, user, openInvoice, haptic, showAlert };
}
