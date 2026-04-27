import { BOSS_QUESTIONS_V1 } from '../constants/boss';

export function hashStringToInt(str) {
  const dkd_source_value = String(str || '');
  let dkd_hash_value = 2166136261;
  for (let dkd_index_value = 0; dkd_index_value < dkd_source_value.length; dkd_index_value++) {
    dkd_hash_value ^= dkd_source_value.charCodeAt(dkd_index_value);
    dkd_hash_value = Math.imul(dkd_hash_value, 16777619);
  }
  return dkd_hash_value >>> 0;
}

export function mulberry32(dkd_left_value) {
  return function () {
    let dkd_temp_value = (dkd_left_value += 0x6D2B79F5);
    dkd_temp_value = Math.imul(dkd_temp_value ^ (dkd_temp_value >>> 15), dkd_temp_value | 1);
    dkd_temp_value ^= dkd_temp_value + Math.imul(dkd_temp_value ^ (dkd_temp_value >>> 7), dkd_temp_value | 61);
    return ((dkd_temp_value ^ (dkd_temp_value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickBossQuestion(dayStr) {
  let seed = 0;
  for (let dkd_index_value = 0; dkd_index_value < String(dayStr || '').length; dkd_index_value++) seed += String(dayStr).charCodeAt(dkd_index_value);
  const idx = seed % BOSS_QUESTIONS_V1.length;
  return BOSS_QUESTIONS_V1[idx] || BOSS_QUESTIONS_V1[0];
}

export function pickBossQuestionIds(seedStr, count = 3) {
  const pool = (BOSS_QUESTIONS_V1 || []).map((dkd_question_item) => dkd_question_item.id).filter(Boolean);
  if (!pool.length) return [];
  if (pool.length <= count) return pool.slice(0, count);

  const rng = mulberry32(hashStringToInt(seedStr));
  const arr = pool.slice();
  for (let dkd_index_value = arr.length - 1; dkd_index_value > 0; dkd_index_value--) {
    const dkd_swap_index_value = Math.floor(rng() * (dkd_index_value + 1));
    const tmp = arr[dkd_index_value];
    arr[dkd_index_value] = arr[dkd_swap_index_value];
    arr[dkd_swap_index_value] = tmp;
  }
  return arr.slice(0, count);
}

export function hash32(str) {
  const dkd_source_value = String(str || '');
  let dkd_hash_value = 2166136261;
  for (let dkd_index_value = 0; dkd_index_value < dkd_source_value.length; dkd_index_value++) {
    dkd_hash_value ^= dkd_source_value.charCodeAt(dkd_index_value);
    dkd_hash_value = Math.imul(dkd_hash_value, 16777619);
  }
  return dkd_hash_value >>> 0;
}

export function rand01(seed, dkd_iteration_value) {
  const dkd_numeric_value = Math.imul((seed >>> 0) + 0x9e3779b9, (dkd_iteration_value + 1) * 2654435761) >>> 0;
  return (dkd_numeric_value % 100000) / 100000;
}
