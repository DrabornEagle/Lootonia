export const ENERGY_REGEN_SECONDS = 2700;
export const NEARBY_FILTER_METERS = 1500;

export const RARITY_TR = {
  common: 'YAYGIN',
  rare: 'NADİR',
  epic: 'EPİK',
  legendary: 'EFSANEVİ',
  mythic: 'MİTİK',
};

export const DROP_TYPE_TR = {
  qr: 'QR Sandığı',
  map: 'Harita Sandığı',
  boss: 'Boss Sandığı',
  cafe: 'Kafe',
  restaurant: 'Restoran',
  metro: 'Metro',
  park: 'Park',
  mall: 'AVM',
  set_bonus: 'Shard',
};

export const DAILY_TASKS_V1 = [
  { key: 'chest_1', title: '1 Sandık Aç', desc: 'Bugün en az 1 sandık aç.', reward_token: 15, reward_energy: 0, reward_xp: 15 },
  { key: 'chest_3', title: '3 Sandık Aç', desc: 'Bugün toplam 3 sandık aç.', reward_token: 35, reward_energy: 0, reward_xp: 30 },
  { key: 'boss_1', title: "Boss'u Yen", desc: 'Boss sorusunu doğru cevapla.', reward_token: 40, reward_energy: 10, reward_xp: 45 },
  { key: 'bonus', title: 'Günlük Bonus', desc: 'Diğer 3 görevi al ve bonusu kap.', reward_token: 25, reward_energy: 0, reward_xp: 25 },
];

export const WEEKLY_TASKS_V1 = [
  { key: 'w_chest_10', title: '10 Sandık Aç', desc: 'Bu hafta toplam 10 sandık aç.', reward_token: 120, reward_energy: 10, reward_xp: 90 },
  { key: 'w_boss_3', title: '3 Boss Yen', desc: 'Bu hafta 3 boss sandığı aç.', reward_token: 200, reward_energy: 20, reward_xp: 120 },
  { key: 'w_unique_5', title: '5 Farklı Nokta', desc: 'Bu hafta 5 farklı drop aç.', reward_token: 150, reward_energy: 0, reward_xp: 100 },
  { key: 'w_bonus', title: 'Haftalık Bonus', desc: 'Diğer 3 haftalık görevi al ve bonusu kap.', reward_token: 250, reward_energy: 30, reward_xp: 160 },
];

export const SHARD_CRAFT_OPTIONS = [
  { key: 'common', title: 'Yaygın Üret', rarity: 'common', cost: 45, desc: 'Hızlı koleksiyon genişletme için.' },
  { key: 'rare', title: 'Nadir Üret', rarity: 'rare', cost: 110, desc: 'Daha değerli kart havuzuna giriş.' },
  { key: 'epic', title: 'Epik Üret', rarity: 'epic', cost: 260, desc: 'Orta oyun için güçlü craft.' },
  { key: 'legendary', title: 'Efsanevi Üret', rarity: 'legendary', cost: 620, desc: 'Geç oyun premium craft.' },
];

export const SHARD_UPGRADE_OPTIONS = [
  { key: 'common', from: 'common', to: 'rare', cost: 50 },
  { key: 'rare', from: 'rare', to: 'epic', cost: 140 },
  { key: 'epic', from: 'epic', to: 'legendary', cost: 320 },
  { key: 'legendary', from: 'legendary', to: 'mythic', cost: 800 },
];

export const SERIES_TR = {
  SKYLINE: 'GÖKDELEN',
  NEON: 'NEON METROPOL',
  APEX: 'APEX KULELERİ',
  ORBIT: 'ORBİT ÜSSÜ',
  GENERAL: 'GENEL',
};
