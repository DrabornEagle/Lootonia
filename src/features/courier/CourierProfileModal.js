import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import { fetchCourierJobs } from '../../services/courierService';
import { fetchCourierProfile, fetchCourierWalletLedger, fetchCourierJobHistory } from '../../services/courierProfileService';

const BG = ['#040A14', '#071225', '#050913'];
const CARD = ['rgba(14,31,51,0.98)', 'rgba(8,18,31,0.98)', 'rgba(5,10,18,0.98)'];
const CYAN = '#7BE6FF';
const GOLD = '#F4D27A';
const GREEN = '#4BE3A5';
const PURPLE = '#B58CFF';
const WHITE_72 = 'rgba(230,241,255,0.72)';
const WHITE_86 = 'rgba(244,248,255,0.86)';
const BORDER = 'rgba(118,188,255,0.16)';

function courierRegionText(profile) {
  const city = String(profile?.courier_city || 'Ankara').trim() || 'Ankara';
  const zone = String(profile?.courier_zone || profile?.courier_profile_meta?.zone || '').trim();
  return zone ? `${city} • ${zone}` : `${city} • Genel Bölge`;
}

function dkd_courier_region_detail_text_value(dkd_profile_value) {
  const dkd_country_value = String(dkd_profile_value?.dkd_country || dkd_profile_value?.dkd_courier_online_country || 'Türkiye').trim() || 'Türkiye';
  const dkd_city_value = String(dkd_profile_value?.dkd_city || dkd_profile_value?.courier_city || dkd_profile_value?.dkd_courier_online_city || 'Ankara').trim() || 'Ankara';
  const dkd_region_value = String(dkd_profile_value?.dkd_region || dkd_profile_value?.courier_zone || dkd_profile_value?.dkd_courier_online_region || dkd_profile_value?.courier_profile_meta?.zone || '').trim();
  return [dkd_country_value, dkd_city_value, dkd_region_value || 'Genel Bölge'].filter(Boolean).join(' / ');
}

function money(value) {
  const amount = Number(value || 0);
  return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function intText(value) {
  return String(Math.max(0, Number(value || 0)).toLocaleString('tr-TR'));
}

function getPhase(task) {
  const status = String(task?.status || '').toLowerCase();
  const pickupStatus = String(task?.pickup_status || '').toLowerCase();
  if (status === 'completed') return 'completed';
  if (pickupStatus === 'picked_up') return 'to_customer';
  if (status === 'accepted') return 'to_business';
  return 'open';
}

function getCompletedAt(task) {
  return task?.completed_at || task?.updated_at || task?.accepted_at || task?.created_at || null;
}

function isCompletedTask(task) {
  return getPhase(task) === 'completed' && Boolean(getCompletedAt(task));
}

function dayKey(input) {
  const dkd_day_value = input ? new Date(input) : null;
  if (!dkd_day_value || Number.isNaN(dkd_day_value.getTime())) return null;
  const dkd_year_value = dkd_day_value.getFullYear();
  const dkd_month_value = `${dkd_day_value.getMonth() + 1}`.padStart(2, '0');
  const day = `${dkd_day_value.getDate()}`.padStart(2, '0');
  return `${dkd_year_value}-${dkd_month_value}-${day}`;
}

function monthKey(input) {
  const dkd_day_value = input ? new Date(input) : null;
  if (!dkd_day_value || Number.isNaN(dkd_day_value.getTime())) return null;
  const dkd_year_value = dkd_day_value.getFullYear();
  const dkd_month_value = `${dkd_day_value.getMonth() + 1}`.padStart(2, '0');
  return `${dkd_year_value}-${dkd_month_value}`;
}

function fmtDateTime(input) {
  const dkd_day_value = input ? new Date(input) : null;
  if (!dkd_day_value || Number.isNaN(dkd_day_value.getTime())) return '-';
  const dd = `${dkd_day_value.getDate()}`.padStart(2, '0');
  const mm = `${dkd_day_value.getMonth() + 1}`.padStart(2, '0');
  const yyyy = dkd_day_value.getFullYear();
  const hh = `${dkd_day_value.getHours()}`.padStart(2, '0');
  const mi = `${dkd_day_value.getMinutes()}`.padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function fmtDayLabel(input) {
  const dkd_day_value = input ? new Date(input) : null;
  if (!dkd_day_value || Number.isNaN(dkd_day_value.getTime())) return 'Tarihsiz';
  return dkd_day_value.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function dkd_group_items_by_day_value(dkd_row_list_value, dkd_date_reader_value) {
  const dkd_group_map_value = new Map();
  (Array.isArray(dkd_row_list_value) ? dkd_row_list_value : []).forEach((dkd_row_value) => {
    const dkd_date_value = dkd_date_reader_value(dkd_row_value);
    const dkd_key_value = dayKey(dkd_date_value) || 'unknown';
    if (!dkd_group_map_value.has(dkd_key_value)) dkd_group_map_value.set(dkd_key_value, { dkd_key_value, dkd_label_value: fmtDayLabel(dkd_date_value), dkd_rows_value: [] });
    dkd_group_map_value.get(dkd_key_value).dkd_rows_value.push(dkd_row_value);
  });
  return [...dkd_group_map_value.values()].sort((dkd_left_value, dkd_right_value) => String(dkd_right_value.dkd_key_value).localeCompare(String(dkd_left_value.dkd_key_value)));
}

function taskTitle(task) {
  const left = task?.merchant_name || task?.title || 'Kurye Teslimatı';
  const right = task?.product_title || task?.job_type || 'Sipariş';
  return `${left} • ${right}`;
}

function safeText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function MetricCard({ icon, label, value, accent }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { borderColor: `${accent}AA` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ icon, title, meta }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={WHITE_86} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function CollapseSectionTitle({ icon, title, meta, open, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.sectionHead}>
      <View style={styles.sectionHeadLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={WHITE_86} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionToggleWrap}>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={WHITE_72} />
      </View>
    </Pressable>
  );
}

function DeliveryCard({ item }) {
  return (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryHead}>
        <Text style={styles.deliveryTitle} numberOfLines={1}>{taskTitle(item)}</Text>
        <View style={styles.deliveryFeePill}>
          <Text style={styles.deliveryFeeText}>{money(item?.fee_tl || 0)}</Text>
        </View>
      </View>
      <Text style={styles.deliverySub} numberOfLines={1}>{safeText(item?.merchant_name || item?.pickup)}</Text>
      <View style={styles.deliveryRow}><Text style={styles.deliveryMetaLabel}>Alım</Text><Text style={styles.deliveryMetaText} numberOfLines={1}>{safeText(item?.pickup)}</Text></View>
      <View style={styles.deliveryRow}><Text style={styles.deliveryMetaLabel}>Teslim</Text><Text style={styles.deliveryMetaText} numberOfLines={1}>{safeText(item?.dropoff)}</Text></View>
      <View style={styles.deliveryBottom}>
        <Text style={styles.deliveryScore}>Skor +{intText(item?.reward_score || 0)}</Text>
        <Text style={styles.deliveryFoot}>{intText(item?.eta_min || 0)} dk • {Number(item?.distance_km || 0).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</Text>
      </View>
      <Text style={styles.deliveryTime}>{fmtDateTime(getCompletedAt(item))}</Text>
    </View>
  );
}

function dkd_cash_direction_value(item) {
  const dkd_direction_value = String(item?.direction || '').toLowerCase();
  return dkd_direction_value === 'debit' ? 'debit' : 'credit';
}

function dkd_cash_icon_name(item) {
  const dkd_source_type_value = String(item?.source_type || '').toLowerCase();
  if (dkd_source_type_value.includes('withdraw')) return 'cash-minus';
  if (dkd_source_type_value.includes('payment')) return 'wallet-minus';
  return dkd_cash_direction_value(item) === 'debit' ? 'cash-minus' : 'cash-plus';
}

function dkd_cash_title_text(item) {
  const dkd_note_value = String(item?.note || '').trim();
  if (dkd_note_value) return dkd_note_value;
  const dkd_source_type_value = String(item?.source_type || '').toLowerCase();
  if (dkd_source_type_value === 'delivery_fee') return taskTitle(item);
  if (dkd_source_type_value.includes('withdraw')) return 'Kurye cüzdan çekimi';
  if (dkd_source_type_value.includes('payment')) return 'Kargo ödeme hareketi';
  if (dkd_source_type_value) return dkd_source_type_value.replace(/_/g, ' ');
  return taskTitle(item);
}

function dkd_cash_date_value(item) {
  return item?.created_at || getCompletedAt(item);
}

function dkd_cash_amount_value(item) {
  const dkd_raw_amount_value = Number(item?.amount_tl ?? item?.fee_tl ?? 0);
  const dkd_sign_value = dkd_cash_direction_value(item) === 'debit' ? -1 : 1;
  return dkd_sign_value * Math.abs(Number.isFinite(dkd_raw_amount_value) ? dkd_raw_amount_value : 0);
}

function CashRow({ item }) {
  const dkd_amount_value = dkd_cash_amount_value(item);
  const dkd_is_negative_value = dkd_amount_value < 0;
  const dkd_balance_after_value = Number(item?.balance_after_tl ?? 0);
  return (
    <View style={styles.cashRow}>
      <View style={styles.cashLeft}>
        <View style={[styles.cashIconWrap, dkd_is_negative_value && styles.cashIconWrapDebit]}>
          <MaterialCommunityIcons name={dkd_cash_icon_name(item)} size={16} color={dkd_is_negative_value ? '#FF8F8F' : GREEN} />
        </View>
        <View style={styles.cashTextWrap}>
          <Text style={styles.cashTitle} numberOfLines={1}>{dkd_cash_title_text(item)}</Text>
          <Text style={styles.cashDate}>{fmtDateTime(dkd_cash_date_value(item))}</Text>
          {item?.balance_after_tl != null ? <Text style={styles.cashBalanceText}>Bakiye sonrası • {money(dkd_balance_after_value)}</Text> : null}
        </View>
      </View>
      <Text style={[styles.cashAmount, dkd_is_negative_value && styles.cashAmountDebit]}>{money(dkd_amount_value)}</Text>
    </View>
  );
}

function CourierProfileModal({ visible, onClose, profile, setProfile }) {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [dkd_history_tasks, setDkdHistoryTasks] = useState([]);
  const [dkd_wallet_ledger, setDkdWalletLedger] = useState([]);
  const [dkd_remote_profile, setDkdRemoteProfile] = useState(null);
  const [dkd_cash_section_open_value, setDkdCashSectionOpenValue] = useState(false);
  const [dkd_delivery_section_open_value, setDkdDeliverySectionOpenValue] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dkd_jobs_res, dkd_profile_res, dkd_history_res, dkd_ledger_res] = await Promise.all([
        fetchCourierJobs(),
        fetchCourierProfile(),
        fetchCourierJobHistory(40),
        fetchCourierWalletLedger(50),
      ]);
      if (dkd_jobs_res?.error) throw dkd_jobs_res.error;
      setTasks(Array.isArray(dkd_jobs_res?.data) ? dkd_jobs_res.data : []);
      setDkdHistoryTasks(Array.isArray(dkd_history_res?.data) ? dkd_history_res.data : []);
      setDkdWalletLedger(Array.isArray(dkd_ledger_res?.data) ? dkd_ledger_res.data : []);
      setDkdRemoteProfile(dkd_profile_res?.data || null);
      if (dkd_profile_res?.data && setProfile) {
        setProfile((dkd_prev_profile) => (dkd_prev_profile ? { ...dkd_prev_profile, ...dkd_profile_res.data } : dkd_prev_profile));
      }
    } catch {
      setTasks([]);
      setDkdHistoryTasks([]);
      setDkdWalletLedger([]);
      setDkdRemoteProfile(null);
    } finally {
      setLoading(false);
    }
  }, [setProfile]);

  useEffect(() => {
    if (!visible) return;
    load();
  }, [visible, load]);

  const completedTasks = useMemo(() => {
    return [...dkd_history_tasks]
      .filter((task) => isCompletedTask(task))
      .sort((dkd_left_value, dkd_right_value) => new Date(getCompletedAt(dkd_right_value) || 0).getTime() - new Date(getCompletedAt(dkd_left_value) || 0).getTime());
  }, [dkd_history_tasks]);

  const activeTasks = useMemo(() => tasks.filter((task) => ['to_business', 'to_customer'].includes(getPhase(task))), [tasks]);
  const dkd_effective_profile = useMemo(() => (dkd_remote_profile || profile || {}), [dkd_remote_profile, profile]);
  const dkd_registered_region_text_value = useMemo(() => dkd_courier_region_detail_text_value(dkd_effective_profile), [dkd_effective_profile]);

  const summary = useMemo(() => {
    const now = new Date();
    const todayKey = dayKey(now);
    const currentMonth = monthKey(now);
    const totalEarnings = completedTasks.reduce((sum, task) => sum + Number(task?.fee_tl || 0), 0);
    const todayEarnings = completedTasks
      .filter((task) => dayKey(getCompletedAt(task)) === todayKey)
      .reduce((sum, task) => sum + Number(task?.fee_tl || 0), 0);
    const monthEarnings = completedTasks
      .filter((task) => monthKey(getCompletedAt(task)) === currentMonth)
      .reduce((sum, task) => sum + Number(task?.fee_tl || 0), 0);
    const fastestEtaValue = completedTasks
      .map((task) => Number(task?.eta_min || 0))
      .filter((value) => value > 0)
      .sort((dkd_left_value, dkd_right_value) => dkd_left_value - dkd_right_value)[0] || null;
    const activeDays = new Set(completedTasks.map((task) => dayKey(getCompletedAt(task))).filter(Boolean)).size;
    const averageFee = completedTasks.length ? totalEarnings / completedTasks.length : 0;
    const rating = completedTasks.length ? '5.0 / 5' : '-';
    return {
      cashBalance: Number(dkd_effective_profile?.wallet_tl ?? dkd_effective_profile?.courier_wallet_tl ?? 0),
      totalEarnings,
      todayEarnings,
      monthEarnings,
      fastestEtaText: fastestEtaValue ? `${intText(fastestEtaValue)} dk` : '-',
      averageFee,
      activeDays,
      rating,
    };
  }, [completedTasks, dkd_effective_profile]);

  useEffect(() => {
    if (!setProfile) return;
    if (!visible) return;
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        courier_completed_jobs: Math.max(Number(prev?.courier_completed_jobs || 0), completedTasks.length),
      };
    });
  }, [completedTasks.length, setProfile, visible]);

  const deliveryCountText = intText(Math.max(Number((dkd_effective_profile?.completed_jobs ?? dkd_effective_profile?.courier_completed_jobs ?? 0)), completedTasks.length));
  const cashRows = dkd_wallet_ledger.length ? dkd_wallet_ledger.slice(0, 20) : completedTasks.slice(0, 20);
  const recentDeliveries = completedTasks.slice(0, 16);
  const dkd_cash_group_list_value = useMemo(() => dkd_group_items_by_day_value(cashRows, dkd_cash_date_value), [cashRows]);
  const dkd_delivery_group_list_value = useMemo(() => dkd_group_items_by_day_value(recentDeliveries, getCompletedAt), [recentDeliveries]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeScreen style={styles.screen}>
        <LinearGradient colors={BG} style={styles.screen}>
          <Pressable onPress={onClose} style={styles.closeButtonFloating}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.heroTitle}>Kurye Profili</Text>
              <Text style={styles.heroSub}>{safeText(dkd_effective_profile?.status === 'approved' || dkd_effective_profile?.courier_status === 'approved' ? 'Onaylı Kurye' : 'Kurye')} • {String(dkd_effective_profile?.vehicle_type || dkd_effective_profile?.courier_vehicle_type || 'moto').toUpperCase()} • {courierRegionText(dkd_effective_profile)}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.panel}>
              <LinearGradient colors={CARD} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={styles.panelGlow} />
              <View style={styles.summaryHead}>
                <View style={styles.summaryBadge}>
                  <MaterialCommunityIcons name="bike-fast" size={22} color={GOLD} />
                </View>
                <View style={styles.summaryTitleWrap}>
                  <Text style={styles.summaryTitle}>Kurye Operasyon Özeti</Text>
                </View>
              </View>

              <View style={styles.dkd_registered_region_card}>
                <View style={styles.dkd_registered_region_icon}>
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={CYAN} />
                </View>
                <View style={styles.dkd_registered_region_copy}>
                  <Text style={styles.dkd_registered_region_label}>Kayıtlı Bölgen</Text>
                  <Text style={styles.dkd_registered_region_text} numberOfLines={2}>{dkd_registered_region_text_value}</Text>
                </View>
              </View>

              {loading ? (
                <View style={styles.loaderWrap}><ActivityIndicator color="#FFFFFF" /></View>
              ) : (
                <View style={styles.metricGrid}>
                  <MetricCard icon="wallet-outline" label="Cüzdan" value={money(summary.cashBalance)} accent={GREEN} />
                  <MetricCard icon="cash-multiple" label="Toplam Kazanç" value={money(summary.totalEarnings)} accent={GOLD} />
                  <MetricCard icon="calendar-today" label="Bugün" value={money(summary.todayEarnings)} accent={CYAN} />
                  <MetricCard icon="calendar-month" label="Bu Ay" value={money(summary.monthEarnings)} accent={PURPLE} />
                  <MetricCard icon="star-four-points-outline" label="Kurye Skoru" value={intText((dkd_effective_profile?.score ?? dkd_effective_profile?.courier_score ?? 0))} accent={CYAN} />
                  <MetricCard icon="package-variant-closed" label="Teslimat" value={deliveryCountText} accent={GREEN} />
                  <MetricCard icon="source-branch" label="Açık Görev" value={intText(dkd_effective_profile?.open_jobs ?? activeTasks.length)} accent={CYAN} />
                  <MetricCard icon="timer-outline" label="En Hızlı ETA" value={summary.fastestEtaText} accent="#FFB76A" />
                </View>
              )}
            </View>

            <SectionTitle icon="chart-box-outline" title="Performans" />
            <View style={styles.metricGridSmall}>
              <MetricCard icon="cash-fast" label="Ortalama Ücret" value={money(summary.averageFee)} accent={GREEN} />
              <MetricCard icon="calendar-check-outline" label="Aktif Gün" value={intText(summary.activeDays)} accent={CYAN} />
              <MetricCard icon="star-outline" label="Puan" value={summary.rating} accent={GOLD} />
            </View>

            <CollapseSectionTitle icon="wallet-plus-outline" title="Kurye Kasa Hareketleri" meta={`${cashRows.length} kayıt`} open={dkd_cash_section_open_value} onPress={() => setDkdCashSectionOpenValue((dkd_prev_value) => !dkd_prev_value)} />
            {dkd_cash_section_open_value ? (
              <View style={styles.listGap}>
                {dkd_cash_group_list_value.length ? dkd_cash_group_list_value.map((dkd_group_value) => (
                  <View key={`cash-group-${dkd_group_value.dkd_key_value}`} style={styles.listCard}>
                    <Text style={styles.groupDayTitle}>{dkd_group_value.dkd_label_value}</Text>
                    {dkd_group_value.dkd_rows_value.map((item) => <CashRow key={`cash-${item.id}-${dkd_cash_date_value(item) || 'x'}`} item={item} />)}
                  </View>
                )) : <View style={styles.listCard}><Text style={styles.emptyText}>Henüz kurye kasa kaydı yok.</Text></View>}
              </View>
            ) : null}

            <CollapseSectionTitle icon="truck-fast-outline" title="Son Teslimatlar" meta={`${recentDeliveries.length} görev`} open={dkd_delivery_section_open_value} onPress={() => setDkdDeliverySectionOpenValue((dkd_prev_value) => !dkd_prev_value)} />
            {dkd_delivery_section_open_value ? (
              <View style={styles.listGap}>
                {dkd_delivery_group_list_value.length ? dkd_delivery_group_list_value.map((dkd_group_value) => (
                  <View key={`delivery-group-${dkd_group_value.dkd_key_value}`} style={styles.deliveryGroupWrap}>
                    <Text style={styles.groupDayTitle}>{dkd_group_value.dkd_label_value}</Text>
                    <View style={styles.listGap}>
                      {dkd_group_value.dkd_rows_value.map((item) => <DeliveryCard key={`delivery-${item.id}-${getCompletedAt(item) || 'x'}`} item={item} />)}
                    </View>
                  </View>
                )) : (
                  <View style={styles.listCard}><Text style={styles.emptyText}>Teslim edilen siparişler burada görünür. Görevi kabul etmek yetmez; teslim tamamlanınca eklenir.</Text></View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050913' },
  header: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerCopy: {
    paddingRight: 76,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  heroSub: { marginTop: 6, color: WHITE_72, fontSize: 14, fontWeight: '700' },
  closeButtonFloating: {
    position: 'absolute',
    top: 2,
    right: 10,
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 8,
  },
  content: { paddingHorizontal: 12, paddingBottom: 36 },
  panel: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 22,
    marginBottom: 26,
  },
  panelGlow: {
    position: 'absolute',
    right: 20,
    top: 12,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(64,157,255,0.08)',
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  summaryBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,128,0.25)',
    marginRight: 14,
  },
  summaryTitleWrap: { flex: 1 },
  summaryTitle: { color: '#F7FBFF', fontSize: 20, fontWeight: '900' },
  summarySub: { marginTop: 4, color: WHITE_72, fontSize: 13, fontWeight: '700' },
  dkd_registered_region_card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(123,230,255,0.22)',
    backgroundColor: 'rgba(123,230,255,0.075)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: -4,
    marginBottom: 18,
  },
  dkd_registered_region_icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,230,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(123,230,255,0.26)',
  },
  dkd_registered_region_copy: { flex: 1, minWidth: 0 },
  dkd_registered_region_label: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  dkd_registered_region_text: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 3, lineHeight: 19 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricGridSmall: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  metricCard: {
    width: '47.5%',
    minHeight: 138,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(4,10,19,0.84)',
    padding: 16,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 14,
  },
  metricLabel: { color: WHITE_72, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  metricValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionToggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#F7FBFF', fontSize: 19, fontWeight: '900' },
  sectionMeta: { color: WHITE_72, fontSize: 13, fontWeight: '700' },
  listCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(4,10,19,0.88)',
    padding: 14,
    marginBottom: 22,
  },
  listGap: { gap: 14 },
  deliveryGroupWrap: { gap: 10 },
  groupDayTitle: { color: CYAN, fontSize: 13, fontWeight: '900', marginBottom: 10 },
  emptyText: { color: WHITE_72, fontSize: 15, lineHeight: 22 },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  cashLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  cashIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(75,227,165,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(75,227,165,0.22)',
    marginRight: 10,
  },
  cashTextWrap: { flex: 1 },
  cashTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  cashDate: { color: WHITE_72, fontSize: 12, marginTop: 4 },
  cashBalanceText: { color: 'rgba(255,255,255,0.56)', fontSize: 11, marginTop: 3 },
  cashAmount: { color: GREEN, fontSize: 15, fontWeight: '900' },
  cashAmountDebit: { color: '#FF8F8F' },
  cashIconWrapDebit: {
    backgroundColor: 'rgba(255,104,104,0.10)',
    borderColor: 'rgba(255,104,104,0.22)',
  },
  deliveryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(4,10,19,0.90)',
    padding: 16,
  },
  deliveryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  deliveryTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  deliveryFeePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(46,214,135,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(46,214,135,0.30)',
  },
  deliveryFeeText: { color: '#E4FFF3', fontSize: 14, fontWeight: '900' },
  deliverySub: { color: WHITE_72, marginTop: 10, fontSize: 14 },
  deliveryRow: { flexDirection: 'row', marginTop: 6 },
  deliveryMetaLabel: { width: 54, color: WHITE_72, fontSize: 14, fontWeight: '700' },
  deliveryMetaText: { flex: 1, color: WHITE_86, fontSize: 14 },
  deliveryBottom: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryScore: { color: '#E4F5FF', fontSize: 15, fontWeight: '900' },
  deliveryFoot: { color: WHITE_72, fontSize: 14, fontWeight: '700' },
  deliveryTime: { marginTop: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  loaderWrap: { paddingVertical: 26, alignItems: 'center', justifyContent: 'center' },
});

export default memo(CourierProfileModal);
