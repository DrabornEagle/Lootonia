export function dayKey(dkd_day_value = new Date()) {
  const dkd_year_value = dkd_day_value.getFullYear();
  const dkd_month_value = String(dkd_day_value.getMonth() + 1).padStart(2, '0');
  const da = String(dkd_day_value.getDate()).padStart(2, '0');
  return `${dkd_year_value}-${dkd_month_value}-${da}`;
}

export function nextLocalMidnight(base = new Date()) {
  const dkd_numeric_value = new Date(base);
  dkd_numeric_value.setHours(24, 0, 0, 0);
  return dkd_numeric_value;
}

export function nextBossReturnDate(base = new Date()) {
  return nextLocalMidnight(base);
}

export function nextBossReturnClockText(base = new Date()) {
  const dkd_iteration_value = nextBossReturnDate(base);
  const hh = String(dkd_iteration_value.getHours()).padStart(2, '0');
  const mm = String(dkd_iteration_value.getMinutes()).padStart(2, '0');
  return `Yarın ${hh}:${mm}`;
}

export function nextBossReturnText(base = new Date()) {
  const now = new Date(base);
  const target = nextBossReturnDate(now);
  const remainMs = target.getTime() - now.getTime();

  if (remainMs <= 1000) return 'Hazır';

  const totalSeconds = Math.max(0, Math.floor(remainMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}sa ${String(minutes).padStart(2, '0')}dk`;
  if (minutes > 0) return `${minutes}dk ${String(seconds).padStart(2, '0')}sn`;
  return `${seconds}sn`;
}


export function bossHomeStatusText(bossState, base = new Date()) {
  const today = dayKey(base);
  const current = bossState && bossState.day === today ? bossState : null;
  const dailyFinished = !!(current && !current.drop_id && (current.victory || current.solved || current.escaped));
  return dailyFinished ? nextBossReturnText(base) : 'Boss Hazır';
}

export function weekStartKey(dkd_day_value = new Date()) {
  const dkd_numeric_value = new Date(dkd_day_value);
  dkd_numeric_value.setHours(0, 0, 0, 0);
  const day = dkd_numeric_value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dkd_numeric_value.setDate(dkd_numeric_value.getDate() + diff);
  const dkd_year_value = dkd_numeric_value.getFullYear();
  const dkd_month_value = String(dkd_numeric_value.getMonth() + 1).padStart(2, '0');
  const da = String(dkd_numeric_value.getDate()).padStart(2, '0');
  return `${dkd_year_value}-${dkd_month_value}-${da}`;
}

