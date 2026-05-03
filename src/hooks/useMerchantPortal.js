import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  claimMerchantBusiness,
  fetchMerchantDashboardForBusiness,
  fetchMerchantHome,
  fetchMerchantProductsForBusiness,
  redeemMerchantCoupon,
  removeMerchantCampaign,
  removeMerchantProduct,
  saveMerchantBusinessLocation,
  saveMerchantCampaign,
  saveMerchantProduct,
} from '../services/merchantPortalService';
import {
  isLocalAssetUri,
  uploadBusinessProductArt,
} from '../services/businessProductService';

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

const EMPTY_PRODUCT_DRAFT = {
  id: '',
  title: '',
  description: '',
  category: 'genel',
  imageUrl: '',
  priceToken: '0',
  priceCash: '',
  deliveryFeeTl: '0',
  currencyCode: 'TRY',
  stock: '0',
  sortOrder: '0',
  isActive: true,
};

export function useMerchantPortal(visible) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [businessProducts, setBusinessProducts] = useState([]);
  const [claimCode, setClaimCode] = useState('');
  const [redeemDraft, setRedeemDraft] = useState({ couponCode: '', note: '' });
  const [campaignDraft, setCampaignDraft] = useState(EMPTY_CAMPAIGN_DRAFT);
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT_DRAFT);
  const [locationDraft, setLocationDraft] = useState({ addressText: '', lat: '', lng: '', radiusM: '80' });

  const selectedBusiness = useMemo(
    () => businesses.find((row) => String(row.business_id) === String(selectedBusinessId)) || null,
    [businesses, selectedBusinessId]
  );

  const loadProductsForBusiness = useCallback(async (businessId) => {
    if (!businessId) {
      setBusinessProducts([]);
      return [];
    }
    try {
      const rows = await fetchMerchantProductsForBusiness(businessId);
      const safeRows = Array.isArray(rows) ? rows : [];
      setBusinessProducts(safeRows);
      return safeRows;
    } catch (error) {
      setMessage(error?.message || String(error));
      setBusinessProducts([]);
      return [];
    }
  }, []);

  const refresh = useCallback(async (keepSelection = true) => {
    setLoading(true);
    setMessage('');
    try {
      const home = await fetchMerchantHome();
      const nextBusinesses = Array.isArray(home?.businesses) ? home.businesses : [];
      setBusinesses(nextBusinesses);

      let nextSelected = selectedBusinessId;
      if (!keepSelection || !nextSelected || !nextBusinesses.some((row) => String(row.business_id) === String(nextSelected))) {
        nextSelected = home?.selectedBusinessId || nextBusinesses?.[0]?.business_id || null;
        setSelectedBusinessId(nextSelected);
      }

      if (nextSelected) {
        const nextDashboard = keepSelection && home?.selectedBusinessId === nextSelected && home?.dashboard
          ? home.dashboard
          : await fetchMerchantDashboardForBusiness(nextSelected);
        setDashboard(nextDashboard || EMPTY_DASHBOARD);
        if (keepSelection && home?.selectedBusinessId === nextSelected && Array.isArray(home?.products)) {
          setBusinessProducts(home.products);
        } else {
          await loadProductsForBusiness(nextSelected);
        }
      } else {
        setDashboard(EMPTY_DASHBOARD);
        setBusinessProducts([]);
      }
    } catch (error) {
      setMessage(error?.message || String(error));
      setBusinesses([]);
      setDashboard(EMPTY_DASHBOARD);
      setBusinessProducts([]);
    } finally {
      setLoading(false);
    }
  }, [loadProductsForBusiness, selectedBusinessId]);

  useEffect(() => {
    if (!visible) return;
    refresh(true);
  }, [visible, refresh]);

  useEffect(() => {
    if (!visible || !selectedBusinessId) return;
    Promise.all([
      fetchMerchantDashboardForBusiness(selectedBusinessId)
        .then((next) => setDashboard(next || EMPTY_DASHBOARD))
        .catch((error) => setMessage(error?.message || String(error))),
      loadProductsForBusiness(selectedBusinessId),
    ]);
  }, [visible, selectedBusinessId, loadProductsForBusiness]);

  useEffect(() => {
    if (!selectedBusinessId) {
      setCampaignDraft(EMPTY_CAMPAIGN_DRAFT);
      setProductDraft(EMPTY_PRODUCT_DRAFT);
      setLocationDraft({ addressText: '', lat: '', lng: '', radiusM: '80' });
      return;
    }
    setCampaignDraft((prev) => prev?.id ? prev : EMPTY_CAMPAIGN_DRAFT);
    setProductDraft((prev) => prev?.id ? prev : EMPTY_PRODUCT_DRAFT);
    setLocationDraft({
      addressText: selectedBusiness?.address_text || '',
      lat: selectedBusiness?.lat == null ? '' : String(selectedBusiness.lat),
      lng: selectedBusiness?.lng == null ? '' : String(selectedBusiness.lng),
      radiusM: String(selectedBusiness?.radius_m || 80),
    });
  }, [selectedBusinessId, selectedBusiness?.address_text, selectedBusiness?.lat, selectedBusiness?.lng, selectedBusiness?.radius_m]);

  const claimCodeNow = useCallback(async () => {
    const code = String(claimCode || '').trim().toUpperCase();
    if (!code) {
      setMessage('Bağlantı kodunu gir.');
      return null;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await claimMerchantBusiness(code);
      if (!result?.ok) {
        setMessage(`Kod reddedildi: ${result?.reason || 'bilinmeyen hata'}`);
        return result;
      }
      setClaimCode('');
      await refresh(false);
      setMessage('İşletme hesabına bağlandın.');
      return result;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [claimCode, refresh]);

  const redeemCouponNow = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    const code = String(redeemDraft?.couponCode || '').trim().toUpperCase();
    if (!code) {
      setMessage('Kupon kodunu gir.');
      return null;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await redeemMerchantCoupon({
        businessId: selectedBusinessId,
        couponCode: code,
        note: redeemDraft?.note || '',
      });
      await refresh(true);
      if (!result?.ok) {
        setMessage(`Kupon reddedildi: ${result?.reason || 'bilinmeyen hata'}`);
        return result;
      }
      setRedeemDraft({ couponCode: '', note: '' });
      setMessage(`Kupon doğrulandı: ${result?.coupon_code || code}`);
      return result;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [selectedBusinessId, redeemDraft, refresh]);

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
    setMessage('Kampanya düzenleme formuna yüklendi.');
  }, []);

  const saveCampaignNow = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setBusy(true);
    setMessage('');
    try {
      const campaignId = await saveMerchantCampaign({
        ...campaignDraft,
        id: campaignDraft?.id || null,
        businessId: selectedBusinessId,
        stockLimit: Number(campaignDraft?.stockLimit || 0),
        redeemedCount: Number(campaignDraft?.redeemedCount || 0),
      });
      setCampaignDraft(EMPTY_CAMPAIGN_DRAFT);
      await refresh(true);
      setMessage(campaignDraft?.id ? 'Kampanya güncellendi.' : 'Kampanya oluşturuldu.');
      return campaignId;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [selectedBusinessId, campaignDraft, refresh]);

  const deleteCampaignNow = useCallback(async (campaignId) => {
    const dkd_campaign_id_text = String(campaignId || campaignDraft?.id || '').trim();
    if (!selectedBusinessId || !dkd_campaign_id_text) {
      setMessage('Silinecek kampanyayı seç.');
      return null;
    }
    setBusy(true);
    setMessage('');
    try {
      await removeMerchantCampaign({ businessId: selectedBusinessId, campaignId: dkd_campaign_id_text });
      if (String(campaignDraft?.id || '') === dkd_campaign_id_text) setCampaignDraft(EMPTY_CAMPAIGN_DRAFT);
      await refresh(true);
      setMessage('Kampanya silindi.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [campaignDraft?.id, refresh, selectedBusinessId]);

  const chooseProductToEdit = useCallback((product) => {
    if (!product) return;
    setProductDraft({
      id: product.id || '',
      title: product.title || '',
      description: product.description || '',
      category: product.category || 'genel',
      imageUrl: product.image_url || '',
      priceToken: String(product.price_token || 0),
      priceCash: product.price_cash == null ? '' : String(product.price_cash),
      deliveryFeeTl: String(product.delivery_fee_tl || 0),
      currencyCode: product.currency_code || 'TRY',
      stock: String(product.stock || 0),
      sortOrder: String(product.sort_order || 0),
      isActive: product.is_active !== false,
    });
    setMessage('Ürün düzenleme formuna yüklendi.');
  }, []);

  const resetProductDraft = useCallback(() => {
    setProductDraft(EMPTY_PRODUCT_DRAFT);
  }, []);

  const saveProductNow = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    const title = String(productDraft?.title || '').trim();
    if (!title) {
      setMessage('Ürün adı zorunlu.');
      return null;
    }
    setBusy(true);
    setMessage('');
    try {
      let imageUrl = String(productDraft?.imageUrl || '').trim();
      if (imageUrl && isLocalAssetUri(imageUrl)) {
        const upload = await uploadBusinessProductArt({
          imageUri: imageUrl,
          businessSlug: selectedBusiness?.slug || selectedBusiness?.name || 'business',
          productName: title,
        });
        imageUrl = String(upload?.data?.publicUrl || '').trim();
      }

      const productId = await saveMerchantProduct({
        ...productDraft,
        id: productDraft?.id || null,
        businessId: selectedBusinessId,
        title,
        imageUrl,
        priceToken: Number(productDraft?.priceToken || 0),
        priceCash: productDraft?.priceCash === '' ? null : Number(productDraft?.priceCash || 0),
        deliveryFeeTl: Number(productDraft?.deliveryFeeTl || 0),
        stock: Number(productDraft?.stock || 0),
        sortOrder: Number(productDraft?.sortOrder || 0),
        currencyCode: String(productDraft?.currencyCode || 'TRY').trim().toUpperCase() || 'TRY',
      });
      setProductDraft(EMPTY_PRODUCT_DRAFT);
      await loadProductsForBusiness(selectedBusinessId);
      setMessage(productDraft?.id ? 'İşletme market ürünü güncellendi.' : 'İşletme market ürünü oluşturuldu.');
      return productId;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [selectedBusiness, selectedBusinessId, productDraft, loadProductsForBusiness]);


  const saveLocationNow = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    setBusy(true);
    setMessage('');
    try {
      await saveMerchantBusinessLocation({
        businessId: selectedBusinessId,
        addressText: locationDraft.addressText,
        lat: locationDraft.lat,
        lng: locationDraft.lng,
        radiusM: locationDraft.radiusM,
      });
      await refresh(true);
      setMessage('İşletme konumu kaydedildi.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [locationDraft, refresh, selectedBusinessId]);

  const deleteProductNow = useCallback(async (productId) => {
    if (!productId) return null;
    setBusy(true);
    setMessage('');
    try {
      await removeMerchantProduct(productId);
      if (String(productDraft?.id || '') === String(productId)) {
        setProductDraft(EMPTY_PRODUCT_DRAFT);
      }
      await loadProductsForBusiness(selectedBusinessId);
      setMessage('Ürün kaldırıldı.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }, [loadProductsForBusiness, productDraft?.id, selectedBusinessId]);

  return {
    loading,
    busy,
    message,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    dashboard,
    businessProducts,
    claimCode,
    setClaimCode,
    claimCodeNow,
    redeemDraft,
    setRedeemDraft,
    redeemCouponNow,
    campaignDraft,
    setCampaignDraft,
    chooseCampaignToEdit,
    saveCampaignNow,
    deleteCampaignNow,
    productDraft,
    setProductDraft,
    chooseProductToEdit,
    saveProductNow,
    deleteProductNow,
    resetProductDraft,
    locationDraft,
    setLocationDraft,
    saveLocationNow,
    refresh,
  };
}
