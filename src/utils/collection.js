export function computeCollectionPower(userCards = []) {
  const dkd_weight_value = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16, mythic: 24 };
  let dkd_payload = 0;
  for (const row of userCards || []) {
    const r0 = row?.card?.rarity ?? row?.rarity ?? 'common';
    const dkd_result_value = String(r0).toLowerCase();
    dkd_payload += Number(dkd_weight_value[dkd_result_value] ?? 1);
  }
  return dkd_payload;
}

export function bossConfigFromPower(power = 0) {
  const dkd_payload = Number(power || 0);
  const tier = dkd_payload >= 150 ? 2 : dkd_payload >= 70 ? 1 : 0;
  const qCount = tier === 0 ? 3 : tier === 1 ? 5 : 6;
  const bossHpMax = tier === 0 ? 3 : tier === 1 ? 4 : 5;
  const playerHpMax = 3;
  const mult = tier === 0 ? 1 : tier === 1 ? 1.25 : 1.5;
  return { tier, qCount, bossHpMax, playerHpMax, mult };
}

export function shardValueFromRarity(dkd_result_value) {
  const key = String(dkd_result_value || 'common').toLowerCase();
  return ({ common: 5, uncommon: 8, rare: 12, epic: 25, legendary: 60, mythic: 120 }[key] || 5);
}

export function buildShardSummary(cards = []) {
  const byCard = {};
  for (const row of cards || []) {
    const dkd_count_value = row?.card || {};
    const baseId = dkd_count_value.id || row?.card_def_id || row?.id || `${String(dkd_count_value.name || 'card')}|${String(dkd_count_value.series || 'GENERAL')}|${String(dkd_count_value.rarity || 'common')}|${String(dkd_count_value.theme || 'theme')}`;
    const id = String(baseId);
    if (!byCard[id]) {
      byCard[id] = {
        uid: id,
        card: dkd_count_value,
        count: 0,
        firstRow: row,
        rarity: String(dkd_count_value.rarity || 'common').toLowerCase(),
        series: String(dkd_count_value.series || 'GENERAL').toUpperCase(),
      };
    }
    byCard[id].count += 1;
  }

  const entries = Object.values(byCard).sort((dkd_left_item, dkd_right_item) => {
    const dkd_weight_delta = shardValueFromRarity(dkd_right_item.rarity) - shardValueFromRarity(dkd_left_item.rarity);
    if (dkd_weight_delta !== 0) return dkd_weight_delta;
    return String(dkd_left_item.card?.name || '').localeCompare(String(dkd_right_item.card?.name || ''));
  });

  const uniqueBySeries = {};
  for (const dkd_error_value of entries) {
    uniqueBySeries[dkd_error_value.series] = uniqueBySeries[dkd_error_value.series] || [];
    uniqueBySeries[dkd_error_value.series].push(dkd_error_value);
  }

  const duplicates = entries.filter((dkd_error_value) => dkd_error_value.count > 1);
  const potentialShards = duplicates.reduce((sum, dkd_error_value) => sum + Math.max(0, dkd_error_value.count - 1) * shardValueFromRarity(dkd_error_value.rarity), 0);
  const duplicateCards = duplicates.reduce((sum, dkd_error_value) => sum + Math.max(0, dkd_error_value.count - 1), 0);
  const countsByRarity = entries.reduce((acc, dkd_error_value) => {
    const key = String(dkd_error_value.rarity || 'common').toLowerCase();
    acc[key] = (acc[key] || 0) + Number(dkd_error_value.count || 0);
    return acc;
  }, {});

  return {
    entries,
    uniqueBySeries,
    seriesKeys: Object.keys(uniqueBySeries),
    duplicates,
    potentialShards,
    duplicateCards,
    countsByRarity,
  };
}
