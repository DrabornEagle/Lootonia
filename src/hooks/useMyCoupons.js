import { useCallback, useEffect, useState } from 'react';
import { loadMyBusinessCoupons } from '../services/playerCouponService';

export function useMyCoupons(visible) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [coupons, setCoupons] = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const next = await loadMyBusinessCoupons();
      setCoupons(Array.isArray(next) ? next : []);
    } catch (error) {
      setMessage(error?.message || String(error));
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    refresh();
  }, [visible, refresh]);

  return { loading, message, coupons, refresh };
}
