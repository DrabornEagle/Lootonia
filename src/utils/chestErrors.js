function extractRaw(input) {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  if (typeof input?.message === 'string') return input.message;
  if (typeof input?.reason === 'string') return input.reason;
  if (typeof input?.error === 'string') return input.error;
  return String(input);
}

function includesAny(text, parts) {
  return parts.some((dkd_part) => text.includes(dkd_part));
}

export function getChestErrorMeta(input) {
  const technical = extractRaw(input).trim();
  const raw = technical.toLowerCase();

  if (!technical) {
    return {
      key: 'unknown',
      title: 'Açılamadı',
      message: 'İşlem tamamlanamadı. Lütfen tekrar dene.',
      technical: '',
    };
  }

  if (raw === 'cooldown' || includesAny(raw, ['cooldown', 'next_open_at'])) {
    return {
      key: 'cooldown',
      title: 'Bekleme Süresi',
      message: 'Bu sandık için bekleme süresi devam ediyor. Biraz sonra tekrar dene.',
      technical,
    };
  }

  if (raw === 'admin_required' || raw.includes('admin_required')) {
    return {
      key: 'admin_required',
      title: 'Yetki Gerekli',
      message: 'Bu işlem için yetkili hesap gerekiyor. Test veya yönetici hesabıyla tekrar dene.',
      technical,
    };
  }

  if (raw === 'invalid_code' || includesAny(raw, ['invalid_code', 'code_invalid'])) {
    return {
      key: 'invalid_code',
      title: 'Kod Geçersiz',
      message: 'Kod geçersiz, süresi dolmuş ya da eski sistemde üretilmiş olabilir. Yeni kod üretip tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['expired_code', 'code_expired', 'expires_at', 'expired'])) {
    return {
      key: 'expired_code',
      title: 'Kodun Süresi Doldu',
      message: 'Bu kodun süresi dolmuş. Yakındaysan yeni bir kod üretip tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['already_used', 'already_consumed', 'consumed_at', 'code_consumed'])) {
    return {
      key: 'already_used',
      title: 'Kod Kullanılmış',
      message: 'Bu kod daha önce kullanılmış görünüyor. Yeni kod üretmen gerekiyor.',
      technical,
    };
  }

  if (includesAny(raw, ['too_far', 'out_of_range', 'outside_radius', 'not_near'])) {
    return {
      key: 'too_far',
      title: 'Uzakta',
      message: 'Sandığa biraz daha yaklaşman gerekiyor. Radius içine girince tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['energy_low', 'not_enough_energy', 'no_energy'])) {
    return {
      key: 'energy_low',
      title: 'Enerji Yetersiz',
      message: 'Bu işlemi yapmak için yeterli enerjin yok. Enerji dolunca tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['drop_not_found', 'chest_not_found', 'not_found'])) {
    return {
      key: 'drop_not_found',
      title: 'Sandık Bulunamadı',
      message: 'Seçili sandık bulunamadı ya da kaldırılmış olabilir. Haritayı yenileyip tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['wrong_qr', 'invalid qr', 'invalid_qr', 'qr formatı'])) {
    return {
      key: 'invalid_qr',
      title: 'QR Hatalı',
      message: 'Okutulan QR geçersiz görünüyor. Doğru QR kodu tekrar tara.',
      technical,
    };
  }

  if (includesAny(raw, ['qr_required', 'secret_required', 'missing_qr_secret'])) {
    return {
      key: 'qr_required',
      title: 'QR Doğrulaması Gerekli',
      message: 'Bu sandık yalnızca geçerli QR ile açılabiliyor. QR tara modunda tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['relation "dkd_drop_codes"', 'column "consumed_at"', 'does not exist'])) {
    return {
      key: 'db_patch_required',
      title: 'Açılamadı',
      message: 'Sandık işlemi şu anda tamamlanamıyor. Birkaç dakika sonra tekrar dene.',
      technical,
    };
  }

  if (includesAny(raw, ['function public.dkd_issue_drop_code', 'function public.dkd_open_chest_by_code', 'function public.dkd_open_chest_secure', 'function public.dkd_open_boss_chest_secure']) && includesAny(raw, ['does not exist', 'not found'])) {
    return {
      key: 'rpc_patch_required',
      title: 'Açılamadı',
      message: 'Sandık işlemi şu anda tamamlanamıyor. Birkaç dakika sonra tekrar dene.',
      technical,
    };
  }

  if (raw === 'code_failed') {
    return {
      key: 'code_failed',
      title: 'Kod Üretilemedi',
      message: 'Kod üretimi tamamlanamadı. Birkaç saniye sonra tekrar dene.',
      technical,
    };
  }

  return {
    key: 'unknown',
    title: 'Açılamadı',
    message: technical,
    technical,
  };
}
