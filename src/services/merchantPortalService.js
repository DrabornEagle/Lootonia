import {
  claimBusinessAccessCode,
  fetchBusinessDashboard,
  fetchMyBusinessMemberships,
  deleteBusinessCampaign,
  redeemBusinessCoupon,
  updateBusinessMemberLocation,
  upsertBusinessCampaign,
} from './businessSuiteService';
import {
  deleteMerchantBusinessProduct,
  fetchMerchantBusinessProducts,
  upsertMerchantBusinessProduct,
} from './businessProductService';

export async function fetchMerchantHome() {
  const businesses = await fetchMyBusinessMemberships();
  const firstId = businesses?.[0]?.business_id || null;
  const [dashboard, products] = await Promise.all([
    firstId ? fetchBusinessDashboard(firstId) : Promise.resolve(null),
    firstId ? fetchMerchantBusinessProducts(firstId) : Promise.resolve([]),
  ]);
  return {
    businesses,
    selectedBusinessId: firstId,
    dashboard,
    products,
  };
}

export async function fetchMerchantDashboardForBusiness(businessId) {
  return fetchBusinessDashboard(businessId);
}

export async function fetchMerchantProductsForBusiness(businessId) {
  return fetchMerchantBusinessProducts(businessId);
}

export async function claimMerchantBusiness(code) {
  return claimBusinessAccessCode(code);
}

export async function redeemMerchantCoupon({ businessId, couponCode, note }) {
  return redeemBusinessCoupon({ businessId, couponCode, note });
}

export async function saveMerchantCampaign(input) {
  return upsertBusinessCampaign(input);
}

export async function removeMerchantCampaign({ businessId, campaignId }) {
  return deleteBusinessCampaign({ businessId, campaignId });
}

export async function saveMerchantProduct(input) {
  return upsertMerchantBusinessProduct(input);
}

export async function removeMerchantProduct(productId) {
  return deleteMerchantBusinessProduct(productId);
}


export async function saveMerchantBusinessLocation(input) {
  return updateBusinessMemberLocation(input);
}
