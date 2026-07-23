import { useEffect, useState } from 'react';
import { getAuthHeader } from '../utils/webAuth';

export function useOrderRating(telegramId, days = 15) {
  const [rating, setRating] = useState(null);

  useEffect(() => {
    if (!telegramId) {
      setRating(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      telegram_id: String(telegramId),
      days: String(days),
    });

    fetch(`/api/user-order-rating?${params.toString()}`, { headers: getAuthHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled) setRating(data?.success ? data.rating : null);
      })
      .catch(() => {
        if (!cancelled) setRating(null);
      });

    return () => { cancelled = true; };
  }, [telegramId, days]);

  return rating;
}
