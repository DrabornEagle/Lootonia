import { useCallback, useEffect, useState } from 'react';
import { fetchBusinessDashboardSnapshot } from '../services/businessPanelService';

export function useBusinessPanelData(businessId, limitDays = 7) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState({
    today: {},
    hours: [],
    tasks: [],
    campaigns: [],
  });
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!businessId) {
      setSnapshot({ today: {}, hours: [], tasks: [], campaigns: [] });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchBusinessDashboardSnapshot(businessId, limitDays);
      if (result.error) throw result.error;
      const nextSnapshot = result.data || { today: {}, hours: [], tasks: [], campaigns: [] };
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [businessId, limitDays]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    error,
    snapshot,
    refresh,
  };
}
