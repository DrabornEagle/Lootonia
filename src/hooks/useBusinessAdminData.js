import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createBusinessAccessCode,
  deleteBusinessCampaign,
  fetchBusinesses,
  fetchBusinessDashboard,
  fetchBusinessDropsLite,
  issueBusinessCoupon,
  linkDropToBusiness,
  logBusinessCouponUse,
  logBusinessTraffic,
  redeemBusinessCoupon,
  unlinkDropFromBusiness,
  upsertBusiness,
  upsertBusinessCampaign,
} from '../services/businessSuiteService';

const EMPTY_BUSINESS_DRAFT = {
  id: '',
  slug: '',
  name: '',
  category: 'cafe',
  city: 'Ankara',
  district: '',
  addressText: '',
  lat: '',
  lng: '',
  radiusM: '80',
  sponsorName: '',
  opensAt: '10:00',
  closesAt: '23:00',
  dailyScanGoal: '40',
  isActive: true,
};

const EMPTY_CAMPAIGN_DRAFT = {
  id: '',
  title: '',
  sponsorName: '',
  rewardLabel: 'Sponsor Ödülü',
  couponPrefix: 'DKD',
  stockLimit: '50',
  redeemedCount: '0',
  startsAt: '',
  endsAt: '',
  closesAt: '',
  isActive: true,
};

const EMPTY_COUPON_ISSUE = {
  campaignId: '',
  playerId: '',
  taskKey: '',
  couponCode: '',
  expiresAt: '',
};

const EMPTY_COUPON_REDEEM = {
  couponCode: '',
  note: '',
};

const EMPTY_DASHBOARD = {
  today: { uniquePlayers: 0, scanCount: 0, couponCount: 0, conversionRate: 0, newPlayers: 0, returningPlayers: 0 },
  hourly: [],
  tasks: [],
  daily: [],
  campaigns: [],
  linkedDrops: [],
  recentCoupons: [],
  recentUses: [],
};

const EMPTY_ACCESS_DRAFT = {
  roleKey: 'manager',
  label: '',
};

export function useBusinessAdminData(visible) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessIdState] = useState(null);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [adminDrops, setAdminDrops] = useState([]);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [businessDraft, setBusinessDraft] = useState(EMPTY_BUSINESS_DRAFT);
  const [campaignDraft, setCampaignDraft] = useState(EMPTY_CAMPAIGN_DRAFT);
  const [couponIssueDraft, setCouponIssueDraft] = useState(EMPTY_COUPON_ISSUE);
  const [couponRedeemDraft, setCouponRedeemDraft] = useState(EMPTY_COUPON_REDEEM);
  const [accessDraft, setAccessDraft] = useState(EMPTY_ACCESS_DRAFT);
  const [lastAccessCode, setLastAccessCode] = useState('');
  const [linkDropId, setLinkDropId] = useState('');

  const selectedBusiness = useMemo(
    () => businesses.find((row) => String(row.id) === String(selectedBusinessId)) || null,
    [businesses, selectedBusinessId]
  );

  const setSelectedBusinessId = useCallback((nextBusinessId) => {
    setIsCreatingBusiness(false);
    setSelectedBusinessIdState(nextBusinessId || null);
  }, []);

  const startNewBusiness = useCallback(() => {
    setIsCreatingBusiness(true);
    setSelectedBusinessIdState(null);
    setBusinessDraft(EMPTY_BUSINESS_DRAFT);
    setCampaignDraft(EMPTY_CAMPAIGN_DRAFT);
    setDashboard(EMPTY_DASHBOARD);
    setMessage('');
  }, []);

  const syncBusinessDraft = useCallback((row) => {
    if (!row) {
      setBusinessDraft(EMPTY_BUSINESS_DRAFT);
      return;
    }
    setBusinessDraft({
      id: row.id || '',
      slug: row.slug || '',
      name: row.name || '',
      category: row.category || 'general',
      city: row.city || 'Ankara',
      district: row.district || '',
      addressText: row.address_text || '',
      lat: row.lat == null ? '' : String(row.lat),
      lng: row.lng == null ? '' : String(row.lng),
      radiusM: String(row.radius_m || 80),
      sponsorName: row.sponsor_name || '',
      opensAt: row.opens_at || '10:00',
      closesAt: row.closes_at || '23:00',
      dailyScanGoal: String(row.daily_scan_goal || 40),
      isActive: row.is_active !== false,
    });
  }, []);

  const refreshDashboard = useCallback(async (businessId = selectedBusinessId) => {
    if (!businessId) {
      setDashboard(EMPTY_DASHBOARD);
      return EMPTY_DASHBOARD;
    }
    const next = await fetchBusinessDashboard(businessId);
    setDashboard(next);
    return next;
  }, [selectedBusinessId]);

  const refreshAll = useCallback(async (keepSelection = true, forcedBusinessId = null) => {
    setLoading(true);
    setMessage('');
    try {
      const [nextBusinesses, nextDrops] = await Promise.all([
        fetchBusinesses(),
        fetchBusinessDropsLite(),
      ]);
      setBusinesses(nextBusinesses);
      setAdminDrops(nextDrops);

      let nextSelectedId = forcedBusinessId || (isCreatingBusiness ? null : selectedBusinessId);
      const selectionMissing = nextSelectedId && !nextBusinesses.some((row) => String(row.id) === String(nextSelectedId));

      if (!keepSelection || selectionMissing) {
        nextSelectedId = nextBusinesses?.[0]?.id || null;
        if (nextSelectedId) {
          setIsCreatingBusiness(false);
          setSelectedBusinessIdState(nextSelectedId);
        } else if (!forcedBusinessId) {
          setSelectedBusinessIdState(null);
        }
      }

      if (isCreatingBusiness && !forcedBusinessId && keepSelection) {
        syncBusinessDraft(null);
        setDashboard(EMPTY_DASHBOARD);
      } else {
        const selected = nextBusinesses.find((row) => String(row.id) === String(nextSelectedId)) || null;
        syncBusinessDraft(selected);

        if (nextSelectedId) {
          const nextDashboard = await fetchBusinessDashboard(nextSelectedId);
          setDashboard(nextDashboard);
        } else {
          setDashboard(EMPTY_DASHBOARD);
        }
      }
    } catch (error) {
      setMessage(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  }, [isCreatingBusiness, selectedBusinessId, syncBusinessDraft]);

  useEffect(() => {
    if (!visible) return;
    refreshAll(true);
  }, [visible, refreshAll]);

  useEffect(() => {
    if (!visible) return;
    if (isCreatingBusiness || !selectedBusinessId) {
      syncBusinessDraft(null);
      setDashboard(EMPTY_DASHBOARD);
      return;
    }
    const row = businesses.find((item) => String(item.id) === String(selectedBusinessId)) || null;
    syncBusinessDraft(row);
    refreshDashboard(selectedBusinessId).catch((error) => setMessage(error?.message || String(error)));
  }, [visible, isCreatingBusiness, selectedBusinessId, businesses, syncBusinessDraft, refreshDashboard]);

  const saveBusiness = useCallback(async () => {
    setSaving(true);
    setMessage('');
    try {
      const businessId = await upsertBusiness({
        ...businessDraft,
        id: businessDraft?.id || null,
        dailyScanGoal: Number(businessDraft?.dailyScanGoal || 40),
        lat: businessDraft?.lat,
        lng: businessDraft?.lng,
        radiusM: businessDraft?.radiusM,
      });
      setIsCreatingBusiness(false);
      setSelectedBusinessIdState(businessId);
      await refreshAll(true, businessId);
      setMessage('İşletme kaydedildi.');
      return businessId;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [businessDraft, refreshAll]);

  const saveCampaign = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      const campaignId = await upsertBusinessCampaign({
        ...campaignDraft,
        businessId: selectedBusinessId,
        id: campaignDraft?.id || null,
        stockLimit: Number(campaignDraft?.stockLimit || 0),
        redeemedCount: Number(campaignDraft?.redeemedCount || 0),
      });
      await refreshDashboard(selectedBusinessId);
      setCampaignDraft(EMPTY_CAMPAIGN_DRAFT);
      setMessage('Kampanya kaydedildi.');
      return campaignId;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [campaignDraft, refreshDashboard, selectedBusinessId]);

  const deleteCampaign = useCallback(async (campaignIdOverride = null) => {
    const dkd_campaign_id_text = String(campaignIdOverride || campaignDraft?.id || '').trim();
    if (!selectedBusinessId || !dkd_campaign_id_text) {
      setMessage('Silinecek kampanyayı seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      await deleteBusinessCampaign({ businessId: selectedBusinessId, campaignId: dkd_campaign_id_text });
      if (String(campaignDraft?.id || '') === dkd_campaign_id_text) setCampaignDraft(EMPTY_CAMPAIGN_DRAFT);
      await refreshDashboard(selectedBusinessId);
      setMessage('Kampanya silindi.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [campaignDraft?.id, refreshDashboard, selectedBusinessId]);

  const attachDrop = useCallback(async (dropIdOverride = null) => {
    const dropId = dropIdOverride || linkDropId;
    if (!selectedBusinessId || !dropId) {
      setMessage('İşletme ve drop seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      await linkDropToBusiness({ businessId: selectedBusinessId, dropId, isPrimary: true, trafficWeight: 1 });
      setLinkDropId('');
      await refreshDashboard(selectedBusinessId);
      setMessage('Drop işletmeye bağlandı.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, [linkDropId, refreshDashboard, selectedBusinessId]);

  const removeLinkedDrop = useCallback(async (dropId) => {
    if (!selectedBusinessId || !dropId) {
      setMessage('Önce işletme ve kaldırılacak drop seç.');
      return false;
    }
    setSaving(true);
    setMessage('');
    try {
      await unlinkDropFromBusiness({ businessId: selectedBusinessId, dropId });
      await refreshDashboard(selectedBusinessId);
      setMessage('Drop bağlantısı kaldırıldı.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, [refreshDashboard, selectedBusinessId]);

  const issueCoupon = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      const code = await issueBusinessCoupon({
        businessId: selectedBusinessId,
        campaignId: couponIssueDraft?.campaignId || null,
        playerId: couponIssueDraft?.playerId || null,
        taskKey: couponIssueDraft?.taskKey || null,
        couponCode: couponIssueDraft?.couponCode || null,
        expiresAt: couponIssueDraft?.expiresAt || null,
      });
      setCouponIssueDraft(EMPTY_COUPON_ISSUE);
      await refreshDashboard(selectedBusinessId);
      setMessage(`Kupon üretildi: ${code}`);
      return code;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [couponIssueDraft, refreshDashboard, selectedBusinessId]);

  const redeemCoupon = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      const result = await redeemBusinessCoupon({
        businessId: selectedBusinessId,
        couponCode: couponRedeemDraft?.couponCode || '',
        note: couponRedeemDraft?.note || '',
      });
      await refreshDashboard(selectedBusinessId);
      if (!result?.ok) {
        setMessage(`Kupon reddedildi: ${result?.reason || 'bilinmeyen hata'}`);
        return result;
      }
      setCouponRedeemDraft(EMPTY_COUPON_REDEEM);
      setMessage(`Kupon kullanıldı: ${result?.coupon_code || ''}`);
      return result;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [couponRedeemDraft, refreshDashboard, selectedBusinessId]);

  const createAccessCode = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      const code = await createBusinessAccessCode({
        businessId: selectedBusinessId,
        roleKey: accessDraft?.roleKey || 'manager',
        label: accessDraft?.label || '',
      });
      setLastAccessCode(code);
      setAccessDraft(EMPTY_ACCESS_DRAFT);
      setMessage(`Bağlantı kodu üretildi: ${code}`);
      return code;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [selectedBusinessId, accessDraft]);

  const writeTestTraffic = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      await logBusinessTraffic({
        businessId: selectedBusinessId,
        sourceType: 'qr',
        taskKey: 'test_traffic',
        meta: { origin: 'admin_test' },
      });
      await refreshDashboard(selectedBusinessId);
      setMessage('Test trafik yazıldı.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, [refreshDashboard, selectedBusinessId]);

  const writeTestCouponUse = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setSaving(true);
    setMessage('');
    try {
      await logBusinessCouponUse({
        businessId: selectedBusinessId,
        couponCode: `TEST-${String(Date.now()).slice(-5)}`,
        taskKey: 'test_coupon',
        meta: { origin: 'admin_test' },
      });
      await refreshDashboard(selectedBusinessId);
      setMessage('Test kupon kullanım yazıldı.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, [refreshDashboard, selectedBusinessId]);

  const chooseCampaignToEdit = useCallback((campaign) => {
    if (!campaign) return;
    setCampaignDraft({
      id: campaign.id || '',
      title: campaign.title || '',
      sponsorName: campaign.sponsor_name || '',
      rewardLabel: campaign.reward_label || 'Sponsor Ödülü',
      couponPrefix: campaign.coupon_prefix || 'DKD',
      stockLimit: String(campaign.stock_limit || 0),
      redeemedCount: String(campaign.redeemed_count || 0),
      startsAt: campaign.starts_at || '',
      endsAt: campaign.ends_at || '',
      closesAt: campaign.closes_at || '',
      isActive: campaign.is_active !== false,
    });
  }, []);

  return {
    loading,
    saving,
    message,
    setMessage,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    startNewBusiness,
    isCreatingBusiness,
    selectedBusiness,
    adminDrops,
    dashboard,
    businessDraft,
    setBusinessDraft,
    saveBusiness,
    campaignDraft,
    setCampaignDraft,
    saveCampaign,
    deleteCampaign,
    chooseCampaignToEdit,
    couponIssueDraft,
    setCouponIssueDraft,
    issueCoupon,
    couponRedeemDraft,
    setCouponRedeemDraft,
    redeemCoupon,
    linkDropId,
    setLinkDropId,
    attachDrop,
    removeLinkedDrop,
    refreshAll,
    refreshDashboard,
    writeTestTraffic,
    writeTestCouponUse,
    accessDraft,
    setAccessDraft,
    createAccessCode,
    lastAccessCode,
  };
}
