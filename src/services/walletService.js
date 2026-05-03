export function normalizeTl(value) {
  const dkd_iteration_value = Number(value ?? 0);
  return Number.isFinite(dkd_iteration_value) ? dkd_iteration_value : 0;
}

export function resolveUnifiedWalletTl(profile = {}) {
  const direct = normalizeTl(profile?.wallet_tl);
  if (direct > 0 || Object.prototype.hasOwnProperty.call(profile || {}, 'wallet_tl')) return direct;

  const courier = normalizeTl(profile?.courier_wallet_tl);
  if (courier > 0 || Object.prototype.hasOwnProperty.call(profile || {}, 'courier_wallet_tl')) return courier;

  const merchant = normalizeTl(profile?.merchant_wallet_tl);
  if (merchant > 0 || Object.prototype.hasOwnProperty.call(profile || {}, 'merchant_wallet_tl')) return merchant;

  return 0;
}

export function formatWalletTlCompact(value) {
  const amount = normalizeTl(value);
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TL`;
}
