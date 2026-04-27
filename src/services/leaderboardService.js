import { supabase } from '../lib/supabase';

export async function fetchWeeklyLeaderboard(metric, weekOffset, limit = 25) {
  return supabase.rpc('dkd_get_weekly_leaderboard2', {
    dkd_param_metric: metric,
    dkd_param_limit: limit,
    dkd_param_week_offset: weekOffset,
  });
}

export async function adminClosePreviousWeek() {
  return supabase.rpc('dkd_admin_close_week', { dkd_param_week_offset: -1, dkd_param_limit: 50 });
}

export async function claimWeeklyTopReward(metric) {
  return supabase.rpc('dkd_claim_weekly_top_reward', { dkd_param_metric: metric });
}

export async function checkCourierWeeklyRewardPopup() {
  return supabase.rpc('dkd_check_courier_weekly_reward_popup');
}
