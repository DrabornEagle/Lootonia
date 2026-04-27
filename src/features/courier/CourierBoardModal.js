import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  InteractionManager,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import SkylineHeroCard from '../../components/ui/SkylineHeroCard';
import {
  acceptCourierJob,
  completeCourierJob,
  fetchCourierJobs,
  markCourierJobPickedUp,
} from '../../services/courierService';
import { awardProfileXp } from '../../services/profileService';
import { submitCourierApplication } from '../../services/courierApplicationService';
import { resolveUnifiedWalletTl } from '../../services/walletService';
import { supabase } from '../../lib/supabase';
import CourierProfileModal from './CourierProfileModal';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import { cityLootTheme } from '../../theme/cityLootTheme';
import DkdCargoSenderPanel from './dkd_cargo_sender_panel';
import DkdCargoLiveMapModal from './dkd_cargo_live_map_modal';
import DkdUrgentCourierPanel from './dkd_urgent_courier_panel';
import { dkd_upload_cargo_package_art, dkd_upsert_courier_live_location } from '../../services/dkd_cargo_service';
import useDeferredVisibility from '../../hooks/useDeferredVisibility';

const dkd_colors = cityLootTheme.colors;
const GEOCODE_HINT = 'Türkiye';

const ANKARA_ZONES = ['Çankaya', 'Etimesgut', 'Eryaman', 'Yenimahalle', 'Keçiören', 'Sincan', 'Mamak', 'Gölbaşı', 'Pursaklar', 'Altındağ'];
const VEHICLE_TYPES = [
  { key: 'moto', label: 'Motosiklet' },
  { key: 'bike', label: 'Bisiklet' },
  { key: 'car', label: 'Araba' },
];

function normalizeDigits(value, max = 32) {
  return String(value || '').replace(/\D/g, '').slice(0, max);
}

function dkd_phone_digits_value(dkd_value) {
  return String(dkd_value || '').replace(/\D/g, '');
}

function dkd_format_turkiye_phone_text(dkd_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_value);
  const dkd_local_digits_value = dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '');
  if (dkd_local_digits_value.length < 10) return '';
  const dkd_trimmed_value = dkd_local_digits_value.slice(0, 10);
  return `+90 ${dkd_trimmed_value.slice(0, 3)} ${dkd_trimmed_value.slice(3, 6)} ${dkd_trimmed_value.slice(6, 8)} ${dkd_trimmed_value.slice(8, 10)}`;
}

function dkd_phone_dial_url_value(dkd_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_value);
  const dkd_local_digits_value = dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '');
  if (dkd_local_digits_value.length < 10) return '';
  return `tel:+90${dkd_local_digits_value.slice(0, 10)}`;
}

function defaultApplicationDraft(profile = {}) {
  return {
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    email: '',
    city: 'Ankara',
    zone: String(profile?.courier_zone || profile?.courier_profile_meta?.zone || 'Çankaya'),
    vehicleType: String(profile?.courier_vehicle_type || 'moto'),
    plateNo: '',
    addressText: '',
    emergencyName: '',
    emergencyPhone: '',
    identityFrontUri: '',
    identityBackUri: '',
    selfieUri: '',
    driverLicenseUri: '',
    vehicleLicenseUri: '',
    insuranceUri: '',
  };
}

function courierXpGoalForLevel(level) {
  const lvl = Math.max(1, Number(level || 1));
  return 110 + ((lvl - 1) * 35);
}

function courierProgressFromScore(scoreValue) {
  let score = Math.max(0, Number(scoreValue || 0));
  let level = 1;
  let goal = courierXpGoalForLevel(level);

  while (score >= goal) {
    score -= goal;
    level += 1;
    goal = courierXpGoalForLevel(level);
  }

  const progressXp = score;
  const progressPct = goal > 0 ? Math.max(0, Math.min(100, Math.round((progressXp / goal) * 100))) : 0;
  return {
    level,
    levelGoal: goal,
    progressXp,
    progressPct,
  };
}

function courierLevelReward(levelValue) {
  const level = Math.max(1, Number(levelValue || 1));
  return {
    token: 30 + (level * 10),
    shards: Math.max(1, Math.floor((level + 1) / 2)),
    xp: 40 + (level * 15),
  };
}

function aggregateCourierLevelRewards(fromLevel, toLevel) {
  let token = 0;
  let shards = 0;
  let xp = 0;
  for (let level = Math.max(1, Number(fromLevel || 1)) + 1; level <= Math.max(1, Number(toLevel || 1)); level += 1) {
    const reward = courierLevelReward(level);
    token += Number(reward.token || 0);
    shards += Number(reward.shards || 0);
    xp += Number(reward.xp || 0);
  }
  return { token, shards, xp };
}

function courierRegionLabel(profile = {}) {
  const city = String(profile?.courier_city || 'Ankara').trim() || 'Ankara';
  const zone = String(profile?.courier_zone || profile?.courier_profile_meta?.zone || '').trim();
  return zone ? `${city} / ${zone}` : city;
}

function appRequiredReady(form) {
  return !!(
    String(form?.firstName || '').trim() &&
    String(form?.lastName || '').trim() &&
    String(form?.nationalId || '').replace(/\D/g, '').length === 11 &&
    String(form?.phone || '').trim().length >= 10 &&
    String(form?.zone || '').trim() &&
    String(form?.driverLicenseUri || '').trim() &&
    String(form?.vehicleLicenseUri || '').trim() &&
    String(form?.identityFrontUri || '').trim() &&
    String(form?.selfieUri || '').trim()
  );
}

async function pickDeviceImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission?.status !== 'granted') {
    throw new Error('Fotoğraf seçebilmek için galeri izni gerekli.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.82,
  });
  if (result?.canceled) return '';
  return result?.assets?.[0]?.uri || '';
}

async function dkd_capture_cargo_pickup_photo() {
  const dkd_permission_value = await ImagePicker.requestCameraPermissionsAsync();
  if (dkd_permission_value?.status !== 'granted') {
    throw new Error('Fotoğraf çekebilmek için kamera izni gerekli.');
  }
  const dkd_result_value = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.84,
  });
  if (dkd_result_value?.canceled) return '';
  return dkd_result_value?.assets?.[0]?.uri || '';
}

function FieldLabel({ children, required = false }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={styles.fieldRequired}> *</Text> : null}
    </Text>
  );
}

function FormInput({ value, onChangeText, placeholder, keyboardType = 'default', multiline = false, maxLength }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(231,241,255,0.38)"
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      style={[styles.formInput, multiline && styles.formInputMultiline]}
    />
  );
}

function ImagePickTile({ label, value, onPick, optional = false }) {
  return (
    <Pressable onPress={onPick} style={styles.docTile}>
      <LinearGradient colors={['rgba(84,219,255,0.12)', 'rgba(181,140,255,0.10)', 'rgba(82,242,161,0.08)']} style={StyleSheet.absoluteFill} />
      {value ? <Image source={{ uri: value }} style={styles.docImage} resizeMode="cover" /> : null}
      <View style={styles.docOverlay}>
        <MaterialCommunityIcons name={value ? 'check-decagram' : 'image-plus'} size={20} color={value ? '#64F3B6' : '#A4EFFF'} />
        <Text style={styles.docTitle}>{label}</Text>
        <Text style={styles.docSub}>{value ? 'Cihazdan seçildi' : optional ? 'İsteğe bağlı' : 'Dokun ve seç'}</Text>
      </View>
    </Pressable>
  );
}

function CourierLevelUpModal({ visible, reward, onClose }) {
  if (!visible || !reward) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.rewardBackdrop}>
        <LinearGradient colors={['rgba(6,12,20,0.88)', 'rgba(7,16,27,0.94)']} style={styles.rewardShell}>
          <LinearGradient colors={['#61D8FF', '#B17CFF', '#61F2AE']} style={styles.rewardRing} />
          <View style={styles.rewardBadge}>
            <MaterialCommunityIcons name="trophy-award" size={28} color="#08111A" />
          </View>
          <Text style={styles.rewardEyebrow}>KURYE SEVİYE ATLADI</Text>
          <Text style={styles.rewardTitle}>Seviye {reward.toLevel}</Text>
          <Text style={styles.rewardSubtitle}>Yeni teslimat ödüllerin hesabına eklendi.</Text>

          <View style={styles.rewardGrid}>
            <View style={[styles.rewardStatCard, styles.rewardStatCardGold]}>
              <MaterialCommunityIcons name="cash-multiple" size={18} color="#FFE39A" />
              <Text style={styles.rewardStatLabel}>Token</Text>
              <Text style={styles.rewardStatValue}>+{reward.token}</Text>
            </View>
            <View style={[styles.rewardStatCard, styles.rewardStatCardPurple]}>
              <MaterialCommunityIcons name="diamond-stone" size={18} color="#D9C2FF" />
              <Text style={styles.rewardStatLabel}>Shard</Text>
              <Text style={styles.rewardStatValue}>+{reward.shards}</Text>
            </View>
            <View style={[styles.rewardStatCard, styles.rewardStatCardBlue]}>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color="#A9EEFF" />
              <Text style={styles.rewardStatLabel}>XP</Text>
              <Text style={styles.rewardStatValue}>+{reward.xp}</Text>
            </View>
          </View>

          <Pressable onPress={onClose} style={styles.rewardCloseBtn}>
            <LinearGradient colors={['#55DAFF', '#2D8EFF', '#182754']} style={StyleSheet.absoluteFill} />
            <Text style={styles.rewardCloseText}>Harika</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function DkdCargoPickupProofModal({
  dkd_visible_value,
  dkd_task_value,
  dkd_photo_uri_value,
  dkd_busy_value,
  dkd_on_close_value,
  dkd_on_capture_value,
  dkd_on_confirm_value,
}) {
  if (!dkd_visible_value || !dkd_task_value) return null;
  const dkd_has_photo_value = !!String(dkd_photo_uri_value || '').trim();
  return (
    <Modal visible={dkd_visible_value} animationType="fade" transparent onRequestClose={dkd_busy_value ? undefined : dkd_on_close_value}>
      <View style={styles.dkdPickupProofBackdrop}>
        <LinearGradient
          colors={['rgba(5,11,20,0.95)', 'rgba(8,18,31,0.98)', 'rgba(10,20,36,0.97)']}
          style={styles.dkdPickupProofShell}
        >
          <View style={styles.dkdPickupProofGlowA} />
          <View style={styles.dkdPickupProofGlowB} />

          <View style={styles.dkdPickupProofHead}>
            <LinearGradient colors={['#F6B54E', '#FF8D1F', '#5A2608']} style={styles.dkdPickupProofIconWrap}>
              <MaterialCommunityIcons name="camera-plus" size={22} color="#FFF9F2" />
            </LinearGradient>
            <View style={styles.dkdPickupProofHeadCopy}>
              <Text style={styles.dkdPickupProofEyebrow}>TESLİM ALMA DOĞRULAMASI</Text>
              <Text style={styles.dkdPickupProofTitle}>Ürünün fotoğrafını çek</Text>
              <Text style={styles.dkdPickupProofSubtitle}>
                {`${dkd_task_value?.customer_full_name || dkd_task_value?.merchant_name || 'Gönderici'} için paketi teslim almadan önce tek kare doğrulama fotoğrafı ekle.`}
              </Text>
            </View>
          </View>

          <View style={styles.dkdPickupProofInfoCard}>
            <Text style={styles.dkdPickupProofInfoLabel}>Paket İçeriği</Text>
            <Text style={styles.dkdPickupProofInfoValue}>{dkd_task_value?.product_title || 'Paket'}</Text>
            <Text style={styles.dkdPickupProofInfoSub}>Bu fotoğraf kurye teslim alma kanıtı olarak saklanır.</Text>
          </View>

          {dkd_has_photo_value ? (
            <View style={styles.dkdPickupProofPreviewWrap}>
              <Image source={{ uri: dkd_photo_uri_value }} style={styles.dkdPickupProofPreviewImage} resizeMode="cover" />
              <View style={styles.dkdPickupProofPreviewBadge}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#081119" />
                <Text style={styles.dkdPickupProofPreviewBadgeText}>Fotoğraf hazır</Text>
              </View>
            </View>
          ) : (
            <Pressable onPress={dkd_busy_value ? undefined : dkd_on_capture_value} style={styles.dkdPickupProofCameraCard}>
              <LinearGradient colors={['rgba(97,216,255,0.12)', 'rgba(181,124,255,0.10)', 'rgba(82,242,161,0.08)']} style={StyleSheet.absoluteFill} />
              <MaterialCommunityIcons name="camera-outline" size={28} color="#CFF6FF" />
              <Text style={styles.dkdPickupProofCameraTitle}>Fotoğraf çek</Text>
              <Text style={styles.dkdPickupProofCameraText}>Kargo görünür haldeyken kamerayı aç ve net bir kare çek.</Text>
            </Pressable>
          )}

          <View style={styles.dkdPickupProofActionRow}>
            <Pressable onPress={dkd_busy_value ? undefined : dkd_on_close_value} style={[styles.dkdPickupProofSecondaryAction, dkd_busy_value && styles.actionDisabled]}>
              <MaterialCommunityIcons name="close" size={17} color={dkd_colors.text} />
              <Text style={styles.dkdPickupProofSecondaryActionText}>Vazgeç</Text>
            </Pressable>

            {dkd_has_photo_value ? (
              <>
                <Pressable onPress={dkd_busy_value ? undefined : dkd_on_capture_value} style={[styles.dkdPickupProofSecondaryAction, dkd_busy_value && styles.actionDisabled]}>
                  <MaterialCommunityIcons name="camera-retake-outline" size={17} color={dkd_colors.text} />
                  <Text style={styles.dkdPickupProofSecondaryActionText}>Tekrar çek</Text>
                </Pressable>
                <Pressable onPress={dkd_busy_value ? undefined : dkd_on_confirm_value} style={[styles.dkdPickupProofPrimaryAction, dkd_busy_value && styles.actionDisabled]}>
                  <LinearGradient colors={['#F6B54E', '#FF8D1F', '#3B1D09']} style={StyleSheet.absoluteFill} />
                  {dkd_busy_value ? <ActivityIndicator size="small" color="#F7FBFF" /> : <MaterialCommunityIcons name="package-variant-closed-check" size={17} color="#F7FBFF" />}
                  <Text style={styles.dkdPickupProofPrimaryActionText}>{dkd_busy_value ? 'Kaydediliyor…' : 'Teslim aldım'}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}


function safeNum(value) {
  const dkd_iteration_value = Number(value);
  return Number.isFinite(dkd_iteration_value) ? dkd_iteration_value : null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const a1 = safeNum(lat1);
  const b1 = safeNum(lng1);
  const a2 = safeNum(lat2);
  const b2 = safeNum(lng2);
  if ([a1, b1, a2, b2].some((dkd_coordinate_value) => dkd_coordinate_value == null)) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(a2 - a1);
  const dLng = toRad(b2 - b1);
  const dkd_source_value =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a1)) * Math.cos(toRad(a2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const dkd_count_value = 2 * Math.asin(Math.sqrt(dkd_source_value));
  return 6371 * dkd_count_value;
}

function normalizeAddressText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function validCoordPair(lat, lng) {
  const dkd_left_value = safeNum(lat);
  const dkd_right_value = safeNum(lng);
  if (dkd_left_value == null || dkd_right_value == null) return false;
  if (Math.abs(dkd_left_value) < 0.0001 && Math.abs(dkd_right_value) < 0.0001) return false;
  return true;
}

function coordPair(lat, lng) {
  return validCoordPair(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : null;
}

function needsGeocode(lat, lng) {
  return !validCoordPair(lat, lng);
}

function formatKm(value) {
  const km = safeNum(value);
  if (km == null) return '-';
  if (km <= 0.9) return `${Math.max(1, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

function roadFactorForKm(km) {
  if (km == null) return 1;
  if (km <= 1) return 1.16;
  if (km <= 4) return 1.24;
  if (km <= 10) return 1.3;
  return 1.36;
}

function speedForKm(km) {
  if (km == null) return 22;
  if (km <= 1) return 14;
  if (km <= 4) return 20;
  if (km <= 10) return 26;
  return 32;
}

function estimateArrivalMinutes(distanceKm) {
  const km = safeNum(distanceKm);
  if (km == null) return null;
  const roadKm = km * roadFactorForKm(km);
  const speed = speedForKm(roadKm);
  return Math.max(2, Math.round((roadKm / speed) * 60));
}

function formatArrival(minutes) {
  const mins = safeNum(minutes);
  if (mins == null) return '-';
  if (mins < 60) return `${mins} dk`;
  const dkd_hash_value = Math.floor(mins / 60);
  const dkd_month_value = mins % 60;
  return dkd_month_value ? `${dkd_hash_value} sa ${dkd_month_value} dk` : `${dkd_hash_value} sa`;
}

function formatTl(value) {
  const dkd_iteration_value = Number(value || 0);
  return `${dkd_iteration_value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TL`;
}

function dkd_is_cargo_task(task) {
  return String(task?.job_type || '').toLowerCase() === 'cargo' || task?.cargo_shipment_id != null;
}

function dkd_is_business_task(dkd_task_value) {
  return !dkd_is_cargo_task(dkd_task_value);
}

function dkd_hash_text_value(dkd_text_value) {
  const dkd_input_value = String(dkd_text_value || 'cargo-seed');
  let dkd_hash_value = 0;
  for (let dkd_index_value = 0; dkd_index_value < dkd_input_value.length; dkd_index_value += 1) {
    dkd_hash_value = ((dkd_hash_value << 5) - dkd_hash_value) + dkd_input_value.charCodeAt(dkd_index_value);
    dkd_hash_value |= 0;
  }
  return Math.abs(dkd_hash_value);
}

function dkd_cargo_pickup_fee_from_distance_km(dkd_distance_km_value) {
  const dkd_numeric_km_value = safeNum(dkd_distance_km_value) ?? 0;
  if (dkd_numeric_km_value <= 0.1) return 50;
  if (dkd_numeric_km_value <= 2) return 100;
  return 120;
}

function dkd_cargo_delivery_seed_value(task) {
  return [task?.pickup, task?.dropoff, task?.cargo_shipment_id, task?.id].filter(Boolean).join('|') || 'cargo-delivery';
}

function dkd_cargo_delivery_fee_from_distance_km(dkd_distance_km_value, task = null) {
  const dkd_hash_value = dkd_hash_text_value(dkd_cargo_delivery_seed_value(task));
  return 40 + (dkd_hash_value % 31);
}

function dkd_cargo_total_fee_from_distance_km(dkd_pickup_route_km_value, dkd_delivery_route_km_value, task = null) {
  return Math.round((dkd_cargo_pickup_fee_from_distance_km(dkd_pickup_route_km_value) + dkd_cargo_delivery_fee_from_distance_km(dkd_delivery_route_km_value, task)) * 100) / 100;
}

function courierFeeTl(task, dkd_distance_km_value = null) {
  const raw = task?.fee_tl ?? task?.courier_fee_tl ?? task?.price_tl ?? task?.cash_tl ?? 0;
  const dkd_iteration_value = Number(raw);
  if (Number.isFinite(dkd_iteration_value) && dkd_iteration_value > 0) return Math.max(0, dkd_iteration_value);
  if (dkd_is_cargo_task(task)) {
    const dkd_delivery_distance_km_value = safeNum(task?.cargo_delivery_distance_km) ?? safeNum(task?.delivery_distance_km) ?? haversineKm(task?.pickup_lat, task?.pickup_lng, task?.dropoff_lat, task?.dropoff_lng);
    return dkd_cargo_total_fee_from_distance_km(dkd_distance_km_value, dkd_delivery_distance_km_value, task);
  }
  return Number.isFinite(dkd_iteration_value) ? Math.max(0, dkd_iteration_value) : 0;
}

function taskDateValue(task) {
  return task?.completed_at || task?.delivered_at || task?.updated_at || task?.created_at || null;
}

function isSameLocalDay(dkd_left_value, dkd_right_value) {
  return dkd_left_value.getFullYear() === dkd_right_value.getFullYear() && dkd_left_value.getMonth() === dkd_right_value.getMonth() && dkd_left_value.getDate() === dkd_right_value.getDate();
}

function jobPhase(task) {
  const status = String(task?.status || 'open').toLowerCase();
  const pickupStatus = String(task?.pickup_status || 'pending').toLowerCase();
  if (status === 'completed' || pickupStatus === 'delivered') return 'completed';
  if (status === 'picked_up' || status === 'to_customer' || status === 'delivering' || pickupStatus === 'picked_up') return 'to_customer';
  if (status === 'accepted' || status === 'assigned' || status === 'to_business') return 'to_business';
  return 'open';
}

function pickupAddressForTask(task) {
  return normalizeAddressText(task?.pickup || task?.business_address_text || task?.merchant_address_text || task?.merchant_name || (dkd_is_cargo_task(task) ? 'Müşteri alım noktası' : 'İşletme teslim alma noktası'));
}

function dropoffAddressForTask(task) {
  return normalizeAddressText(task?.dropoff || task?.delivery_address_text || 'Teslimat adresi');
}

function geocodeKeyForTask(task, phase) {
  return `${phase}:${phase === 'to_customer' || phase === 'completed' ? dropoffAddressForTask(task) : pickupAddressForTask(task)}`;
}

function targetMeta(task, geocodeCache = {}) {
  const phase = jobPhase(task);
  const cacheKey = geocodeKeyForTask(task, phase);
  const cached = geocodeCache?.[cacheKey] || null;
  if (phase === 'completed') {
    const target = coordPair(task?.dropoff_lat, task?.dropoff_lng) || coordPair(cached?.lat, cached?.lng);
    return {
      title: 'Sipariş Tamamlandı',
      address: dropoffAddressForTask(task),
      lat: target?.lat ?? null,
      lng: target?.lng ?? null,
    };
  }
  if (phase === 'to_customer') {
    const target = coordPair(task?.dropoff_lat, task?.dropoff_lng) || coordPair(cached?.lat, cached?.lng);
    return {
      title: dkd_is_cargo_task(task) ? 'Teslimata gidiliyor' : 'Müşteriye gidiliyor',
      address: dropoffAddressForTask(task),
      lat: target?.lat ?? null,
      lng: target?.lng ?? null,
    };
  }
  const target = coordPair(task?.pickup_lat, task?.pickup_lng) || coordPair(cached?.lat, cached?.lng);
  return {
    title: dkd_is_cargo_task(task) ? 'Göndericiye gidiliyor' : 'İşletmeye gidiliyor',
    address: pickupAddressForTask(task),
    lat: target?.lat ?? null,
    lng: target?.lng ?? null,
  };
}

function buildRegion(currentLocation, task, geocodeCache) {
  const target = targetMeta(task, geocodeCache);
  const current = coordPair(currentLocation?.lat, currentLocation?.lng);
  const cLat = current?.lat ?? null;
  const cLng = current?.lng ?? null;
  const tLat = target.lat;
  const tLng = target.lng;
  if (cLat != null && cLng != null && tLat != null && tLng != null) {
    const midLat = (cLat + tLat) / 2;
    const midLng = (cLng + tLng) / 2;
    const latDelta = Math.max(Math.abs(cLat - tLat) * 1.7, 0.02);
    const lngDelta = Math.max(Math.abs(cLng - tLng) * 1.7, 0.02);
    return { latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
  }
  if (tLat != null && tLng != null) {
    return { latitude: tLat, longitude: tLng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }
  if (cLat != null && cLng != null) {
    return { latitude: cLat, longitude: cLng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }
  return null;
}

function statusLabel(task) {
  const phase = jobPhase(task);
  if (phase === 'completed') return 'Tamamlandı';
  if (phase === 'to_customer') return dkd_is_cargo_task(task) ? 'Teslimata gidiliyor' : 'Yolda';
  if (phase === 'to_business') return dkd_is_cargo_task(task) ? 'Göndericiye gidiliyor' : 'İşletmeye gidiliyor';
  return 'Açık';
}

function dkd_cargo_card_title_value(task) {
  const dkd_name_value = String(task?.customer_full_name || '').trim();
  if (dkd_name_value) return dkd_name_value;
  const dkd_title_value = String(task?.title || '').replace(/^kargo\s*[•:\-]?\s*/i, '').trim();
  if (dkd_title_value) return dkd_title_value;
  return 'Gönderici';
}

function actionLabel(task, saving) {
  if (saving) return 'Kaydediliyor…';
  const phase = jobPhase(task);
  if (phase === 'open') return 'Görevi Kabul Et';
  if (phase === 'to_business') return 'Ürünü teslim aldım';
  if (phase === 'to_customer') return 'Teslim Edildi';
  return 'Tamamlandı';
}


function dkd_phase_rank(task) {
  const dkd_phase_value = jobPhase(task);
  if (dkd_phase_value === 'completed') return 3;
  if (dkd_phase_value === 'to_customer') return 2;
  if (dkd_phase_value === 'to_business') return 1;
  return 0;
}

function dkd_merge_task_rows(dkd_prev_rows, dkd_next_rows) {
  const dkd_prev_map = new Map((Array.isArray(dkd_prev_rows) ? dkd_prev_rows : []).map((dkd_row) => [String(dkd_row?.id || ''), dkd_row]));
  return (Array.isArray(dkd_next_rows) ? dkd_next_rows : []).map((dkd_next_row) => {
    const dkd_prev_row = dkd_prev_map.get(String(dkd_next_row?.id || ''));
    if (!dkd_prev_row) return dkd_next_row;
    return dkd_phase_rank(dkd_prev_row) > dkd_phase_rank(dkd_next_row)
      ? { ...dkd_next_row, ...dkd_prev_row }
      : dkd_next_row;
  });
}

function nextDistanceAndArrival(task, currentLocation, geocodeCache) {
  const phase = jobPhase(task);
  const target = targetMeta(task, geocodeCache);
  const current = coordPair(currentLocation?.lat, currentLocation?.lng);
  const straightLiveKm = haversineKm(current?.lat, current?.lng, target.lat, target.lng);
  const liveKm = straightLiveKm == null ? null : straightLiveKm * roadFactorForKm(straightLiveKm);
  const straightFallbackKm = phase === 'to_customer'
    ? safeNum(task?.distance_km)
    : haversineKm(task?.pickup_lat, task?.pickup_lng, task?.dropoff_lat, task?.dropoff_lng) ?? safeNum(task?.distance_km);
  const fallbackKm = straightFallbackKm == null ? null : straightFallbackKm * (straightFallbackKm > 30 ? 1 : roadFactorForKm(straightFallbackKm));
  const distanceKm = liveKm ?? fallbackKm;
  const liveEta = estimateArrivalMinutes(distanceKm);
  const fallbackEta = safeNum(task?.eta_min);
  return {
    distanceKm,
    arrivalMin: liveEta ?? fallbackEta,
  };
}


function dkd_mini_map_pulse_chip({ dkd_label_value = 'Kurye Paneli' }) {
  const dkd_pulse_anim_value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_pulse_anim_value]);

  const dkd_scale_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.03],
  });
  const dkd_opacity_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  return (
    <Animated.View
      style={[
        styles.dkdMiniMapActionChip,
        {
          opacity: dkd_opacity_value,
          transform: [{ scale: dkd_scale_value }],
        },
      ]}
    >
      <LinearGradient colors={['rgba(15,25,39,0.96)', 'rgba(8,16,28,0.92)']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(88,229,193,0.20)', 'rgba(114,186,255,0.16)', 'rgba(170,124,255,0.14)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={StyleSheet.absoluteFill} />
      <View style={styles.dkdMiniMapActionChipGlow} />
      <View style={styles.dkdMiniMapActionIconWrap}>
        <MaterialCommunityIcons name="cursor-default-click-outline" size={14} color="#F5FDFF" />
      </View>
      <View style={styles.dkdMiniMapActionCopy}>
        <Text style={styles.dkdMiniMapActionChipText}>{dkd_label_value}</Text>
        <Text style={styles.dkdMiniMapActionChipSubText}>Canlı takibi aç</Text>
      </View>
      <View style={styles.dkdMiniMapActionSignalWrap}>
        <View style={styles.dkdMiniMapActionPulseDot} />
      </View>
      <MaterialCommunityIcons name="arrow-top-right" size={14} color="#F5FDFF" />
    </Animated.View>
  );
}

const DkdMiniMapPulseChip = dkd_mini_map_pulse_chip;

function MiniMapPreview({ currentLocation, task, geocodeCache, onPress, dkd_show_open_chip_value = false, dkd_open_chip_text_value = 'Kurye Paneli' }) {

  const target = targetMeta(task, geocodeCache);
  const region = buildRegion(currentLocation, task, geocodeCache);
  const dkd_is_cargo_preview_value = dkd_is_cargo_task(task);
  const DkdPreviewShell = onPress ? Pressable : View;

  if (!region) {
    return (
      <DkdPreviewShell onPress={onPress} style={styles.miniMapFallback}>
        <MaterialCommunityIcons name="map-marker-path" size={20} color={dkd_colors.cyanSoft} />
        <Text style={styles.miniMapFallbackText}>{target.address || 'Konum hazır değil'}</Text>
      </DkdPreviewShell>
    );
  }

  return (
    <DkdPreviewShell onPress={onPress} style={styles.miniMapWrap}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={region}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {validCoordPair(currentLocation?.lat, currentLocation?.lng) ? (
          <Marker coordinate={{ latitude: Number(currentLocation.lat), longitude: Number(currentLocation.lng) }} pinColor="#65D8FF" />
        ) : null}
        {target.lat != null && target.lng != null ? (
          <Marker coordinate={{ latitude: target.lat, longitude: target.lng }} pinColor="#F6B54E" />
        ) : null}
      </MapView>
      <LinearGradient colors={['rgba(6,13,22,0.05)', 'rgba(6,13,22,0.62)']} style={StyleSheet.absoluteFill} />
      <View style={styles.miniMapBadge}>
        <MaterialCommunityIcons name="map-outline" size={14} color="#DFF9FF" />
        <Text style={styles.miniMapBadgeText}>{target.title}</Text>
      </View>
      {dkd_is_cargo_preview_value && dkd_show_open_chip_value ? (
        <View style={styles.dkdMiniMapActionWrap}>
          <DkdMiniMapPulseChip dkd_label_value={dkd_open_chip_text_value} />
        </View>
      ) : null}
    </DkdPreviewShell>
  );
}

function CompletedRouteSummary({ task }) {
  return (
    <View style={styles.completedRouteCard}>
      <View style={styles.completedRouteBadge}>
        <MaterialCommunityIcons name="check-decagram" size={15} color="#DFF9FF" />
        <Text style={styles.completedRouteBadgeText}>Sipariş tamamlandı</Text>
      </View>
      <Text style={styles.completedRouteTitle}>{dropoffAddressForTask(task)}</Text>
      <Text style={styles.completedRouteText}>Bu görev tamamlandı. Mini harita açık görev ve aktif teslimat aşamalarında görünür.</Text>
    </View>
  );
}

function DkdCompletedRouteSummary({ task }) {
  const dkd_target_value = targetMeta(task, {});
  return (
    <View style={styles.completedRouteCard}>
      <View style={styles.completedRouteChip}>
        <MaterialCommunityIcons name="check-decagram" size={14} color="#DFF9FF" />
        <Text style={styles.completedRouteChipText}>Sipariş Tamamlandı</Text>
      </View>
      <Text style={styles.completedRouteTitle}>{dkd_target_value?.address || dropoffAddressForTask(task)}</Text>
      <Text style={styles.completedRouteHint}>Mini harita tamamlanan görevlerde kapalı kalır. Kabul ve aktif teslimat aşamalarında harita görünür.</Text>
    </View>
  );
}

function PhaseStrip({ task }) {
  const phase = jobPhase(task);
  const picked = phase === 'to_customer' || phase === 'completed';
  const completed = phase === 'completed';
  const dkd_is_cargo_phase_value = dkd_is_cargo_task(task);
  const dkd_pickup_icon_name_value = dkd_is_cargo_phase_value ? 'package-variant-closed-check' : 'store-check-outline';
  const dkd_delivery_icon_name_value = dkd_is_cargo_phase_value ? 'truck-delivery-outline' : 'bike-fast';
  return (
    <View style={styles.phaseStripCard}>
      <View style={[styles.phaseStepModern, styles.phaseStepActiveModern, picked && styles.phaseStepDoneModern]}>
        <View style={[styles.dkd_phase_step_icon_shell, picked ? styles.dkd_phase_step_icon_shell_done : styles.dkd_phase_step_icon_shell_idle]}>
          <MaterialCommunityIcons name={dkd_pickup_icon_name_value} size={16} color={picked ? '#F6FFFB' : '#9EF3D1'} />
        </View>
        <Text style={[styles.phaseStepModernText, picked && styles.phaseStepDoneModernText]}>
          {picked ? (dkd_is_cargo_phase_value ? 'Paket alındı' : 'Ürün alındı') : (dkd_is_cargo_phase_value ? 'Müşteriden al' : 'İşletmeden al')}
        </Text>
      </View>
      <View style={styles.phaseDividerModern} />
      <View style={[styles.phaseStepModern, picked && styles.phaseStepActiveModern, completed && styles.phaseStepDoneModernBlue]}>
        <View style={[styles.dkd_phase_step_icon_shell, completed ? styles.dkd_phase_step_icon_shell_delivery_done : picked ? styles.dkd_phase_step_icon_shell_delivery_ready : styles.dkd_phase_step_icon_shell_idle]}>
          <MaterialCommunityIcons name={dkd_delivery_icon_name_value} size={16} color={completed ? '#F4FCFF' : picked ? '#F4FCFF' : '#AEEFFF'} />
        </View>
        <Text style={[styles.phaseStepModernText, picked && styles.phaseStepDoneModernText]}>
          {completed ? 'Teslim edildi' : picked ? (dkd_is_cargo_phase_value ? 'Teslim Edilecek' : 'Müşteriye git') : 'Müşteri bekliyor'}
        </Text>
      </View>
    </View>
  );
}

function StatTile({ label, value, accent, iconName }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.dkdStatTileHead}>
        <Text style={styles.statTileLabel}>{label}</Text>
        {iconName ? (
          <View style={styles.dkdStatTileIconWrap}>
            <MaterialCommunityIcons name={iconName} size={15} color={accent || dkd_colors.cyanSoft} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.statTileValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function DkdInfoLine({ dkd_icon_name_value, dkd_label_value, dkd_value, dkd_icon_color_value }) {
  const dkd_text_value = String(dkd_value || '').trim();
  if (!dkd_text_value || dkd_text_value === '-') return null;
  return (
    <View style={styles.dkdInfoLineRow}>
      <View style={styles.dkdInfoLineIconWrap}>
        <MaterialCommunityIcons name={dkd_icon_name_value} size={15} color={dkd_icon_color_value || dkd_colors.cyanSoft} />
      </View>
      <View style={styles.dkdInfoLineCopy}>
        <Text style={styles.dkdInfoLineLabel}>{dkd_label_value}</Text>
        <Text style={styles.dkdInfoLineValue}>{dkd_text_value}</Text>
      </View>
    </View>
  );
}

const JobCard = memo(function JobCard({ task, savingId, currentLocation, geocodeCache, onAccept, onPickedUp, onComplete, onOpenRoute, onOpenCustomerPhone, onOpenCargoPanel }) {
  const phase = jobPhase(task);
  const saving = String(savingId || '') === String(task?.id || '');
  const next = nextDistanceAndArrival(task, currentLocation, geocodeCache);
  const dkd_is_cargo_card_value = dkd_is_cargo_task(task);
  const dkd_card_motion_value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dkd_duration_value = phase === 'completed' ? 3600 : phase === 'open' ? 2450 : 2050;
    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_card_motion_value, {
          toValue: 1,
          duration: dkd_duration_value,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_card_motion_value, {
          toValue: 0,
          duration: dkd_duration_value,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_card_motion_value, phase]);

  const dkd_card_translate_y_value = dkd_card_motion_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const dkd_card_scale_value = dkd_card_motion_value.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.008],
  });
  const dkd_card_glow_opacity_value = dkd_card_motion_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0.92],
  });
  const dkd_card_shine_translate_x_value = dkd_card_motion_value.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 240],
  });

  return (
    <Animated.View style={[styles.dkdAnimatedJobCardShell, { transform: [{ translateY: dkd_card_translate_y_value }, { scale: dkd_card_scale_value }] }]}>
      <View style={styles.jobCard}>
      <Animated.View style={[styles.dkdJobCardAura, { opacity: dkd_card_glow_opacity_value }]} />
      <Animated.View style={[styles.dkdJobCardShineWrap, { transform: [{ translateX: dkd_card_shine_translate_x_value }] }]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={styles.dkdJobCardShine} />
      </Animated.View>
      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.jobFill}>
        <View style={styles.cardGlowA} />
        <View style={styles.cardGlowB} />
        <View style={styles.jobTopRow}>
          <View style={styles.dkdJobHeadMain}>
            <View style={styles.dkdJobIconBubble}>
              <MaterialCommunityIcons name={dkd_is_cargo_task(task) ? 'cube-send' : 'storefront-outline'} size={20} color={dkd_colors.cyanSoft} />
            </View>
            <View style={styles.dkdJobHeadCopy}>
              <Text style={styles.jobTitle}>{dkd_is_cargo_card_value ? dkd_cargo_card_title_value(task) : (task?.title || 'Kurye görevi')}</Text>
              {dkd_is_cargo_card_value ? null : <Text style={styles.dkdJobHeadSub}>{`İşletme • ${task?.merchant_name || 'İşletme'}`}</Text>}
            </View>
          </View>
          <View style={styles.dkdJobHeadActionColumn}>
            {dkd_is_cargo_card_value ? null : (
              <View style={[styles.statePill, phase === 'completed' ? styles.statePillDone : phase === 'open' ? styles.statePillOpen : styles.statePillActive]}>
                <Text style={styles.statePillText}>{statusLabel(task)}</Text>
              </View>
            )}

          </View>
        </View>

        <View style={styles.dkdJobInfoPanel}>
          <DkdInfoLine dkd_icon_name_value="map-marker-radius-outline" dkd_label_value="Gönderici Adresi" dkd_value={task?.pickup || '-'} dkd_icon_color_value={dkd_colors.cyanSoft} />
          <DkdInfoLine dkd_icon_name_value="map-marker-check-outline" dkd_label_value="Teslim Edilecek" dkd_value={task?.dropoff || '-'} dkd_icon_color_value={dkd_colors.green} />
          {!!task?.customer_full_name ? <DkdInfoLine dkd_icon_name_value="account-outline" dkd_label_value="Gönderici" dkd_value={task.customer_full_name} dkd_icon_color_value={dkd_colors.goldSoft} /> : null}
          {!!task?.product_title ? <DkdInfoLine dkd_icon_name_value="package-variant-closed" dkd_label_value={String(task?.job_type || '') === 'cargo' ? 'Paket İçeriği' : 'Ürün'} dkd_value={task.product_title} dkd_icon_color_value={dkd_colors.cyanSoft} /> : null}
          {!!task?.delivery_note ? <DkdInfoLine dkd_icon_name_value="note-text-outline" dkd_label_value="Kurye Notu" dkd_value={task.delivery_note} dkd_icon_color_value={dkd_colors.goldSoft} /> : null}
          {!!task?.customer_phone_text ? (
            <Pressable onPress={() => onOpenCustomerPhone?.(task?.customer_phone_text)} style={styles.dkdPhoneCallChip}>
              <MaterialCommunityIcons name="phone-outline" size={14} color={dkd_colors.cyanSoft} />
              <Text style={styles.dkdPhoneCallChipText}>Telefon No • {dkd_format_turkiye_phone_text(task?.customer_phone_text) || 'Ara'}</Text>
            </Pressable>
          ) : null}
        </View>

        {!!task?.package_image_url ? <Image source={{ uri: task.package_image_url }} style={styles.dkdCargoJobImage} resizeMode="cover" /> : null}
        {String(task?.pickup_proof_image_url || '').trim() ? (
          <View style={styles.dkdCargoProofCard}>
            <View style={styles.dkdCargoProofHead}>
              <MaterialCommunityIcons name="image-check-outline" size={15} color={dkd_colors.green} />
              <Text style={styles.dkdCargoProofTitle}>Teslim alma fotoğrafı</Text>
            </View>
            <Image source={{ uri: task.pickup_proof_image_url }} style={styles.dkdCargoPickupProofImage} resizeMode="cover" />
          </View>
        ) : null}
        <PhaseStrip task={task} />
        {phase === 'completed' ? <DkdCompletedRouteSummary task={task} /> : <MiniMapPreview currentLocation={currentLocation} task={task} geocodeCache={geocodeCache} onPress={dkd_is_cargo_card_value ? () => onOpenCargoPanel?.(task) : undefined} dkd_show_open_chip_value={dkd_is_cargo_card_value} dkd_open_chip_text_value="Kargo Oluştur" />}

        <View style={styles.metricRow}>
          <StatTile label="Skor" value={`+${Number(task?.reward_score || 0)}`} accent={dkd_colors.goldSoft} iconName="star-four-points-outline" />
          <StatTile label="Rota" value={formatKm(next.distanceKm)} accent={dkd_colors.cyanSoft} iconName="map-marker-distance" />
          <StatTile label="Varış" value={formatArrival(next.arrivalMin)} iconName="clock-fast" />
          <StatTile label="Kazanç" value={formatTl(courierFeeTl(task, next.distanceKm))} accent={dkd_colors.green} iconName="cash-fast" />
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={() => { if (dkd_is_cargo_card_value) { onOpenCargoPanel?.(task); } else { onOpenRoute(task); } }} style={styles.secondaryAction}>
            <MaterialCommunityIcons name="map-search-outline" size={17} color={dkd_colors.text} />
            <Text style={styles.secondaryActionText}>{dkd_is_cargo_card_value ? 'Konuma Git' : 'Haritada Aç'}</Text>
          </Pressable>
          {phase !== 'completed' ? (
            <Pressable
              onPress={() => {
                if (phase === 'open') onAccept(task.id);
                else if (phase === 'to_business') onPickedUp(task);
                else onComplete(task);
              }}
              disabled={saving}
              style={[styles.primaryAction, saving && styles.actionDisabled]}
            >
              <LinearGradient
                colors={phase === 'open' ? ['#40D8FF', '#2A8DFF', '#0E1840'] : phase === 'to_business' ? ['#F6B54E', '#FF8D1F', '#3B1D09'] : ['#52F2A1', '#14C97F', '#103824']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.dkdPrimaryActionInner}>
                <MaterialCommunityIcons name={phase === 'open' ? 'flash-outline' : phase === 'to_business' ? 'package-variant-closed-check' : 'check-decagram'} size={17} color="#F7FBFF" />
                <Text style={styles.primaryActionText}>{actionLabel(task, saving)}</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
    </Animated.View>
  );
});

export default function CourierBoardModal({ visible, onClose, profile, setProfile, currentLocation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [applying, setApplying] = useState(false);
  const [geocodeCache, setGeocodeCache] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [dkd_queue_source_filter_value, setDkdQueueSourceFilterValue] = useState('business');
  const [profileVisible, setProfileVisible] = useState(false);
  const [rewardModal, setRewardModal] = useState(null);
  const [applicationDraft, setApplicationDraft] = useState(() => defaultApplicationDraft(profile));
  const [dkd_pickup_modal_task_value, setDkdPickupModalTaskValue] = useState(null);
  const [dkd_pickup_modal_image_uri_value, setDkdPickupModalImageUriValue] = useState('');
  const [dkd_pickup_modal_busy_value, setDkdPickupModalBusyValue] = useState(false);
  const [dkd_center_tab_value, setDkdCenterTabValue] = useState('cargo_panel');
  const [dkd_cargo_panel_mode_value, setDkdCargoPanelModeValue] = useState('create');
  const [dkd_cargo_panel_task_value, setDkdCargoPanelTaskValue] = useState(null);
  const [dkd_cargo_panel_refreshing_value, setDkdCargoPanelRefreshingValue] = useState(false);
  const dkd_deferred_modal_content_ready_value = useDeferredVisibility(visible, true);

  const setDraftField = useCallback((dkd_key_value, dkd_field_value) => {
    setApplicationDraft((prev) => ({ ...prev, [dkd_key_value]: dkd_field_value }));
  }, []);

  const chooseDoc = useCallback(async (dkd_key_value) => {
    try {
      const dkd_uri_value = await pickDeviceImage();
      if (!dkd_uri_value) return;
      setApplicationDraft((prev) => ({ ...prev, [dkd_key_value]: dkd_uri_value }));
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Fotoğraf seçilemedi.');
    }
  }, []);

  const courierStatus = String(profile?.courier_status || 'none');
  const courierApproved = courierStatus === 'approved';
  const courierPending = courierStatus === 'pending';
  const courierProgress = useMemo(() => courierProgressFromScore(profile?.courier_score || 0), [profile?.courier_score]);
  const nextCourierReward = useMemo(() => courierLevelReward((courierProgress?.level || 1) + 1), [courierProgress?.level]);
  const walletTl = useMemo(() => resolveUnifiedWalletTl(profile || {}), [profile?.wallet_tl, profile?.courier_wallet_tl]);
  const dkd_sync_wallet_after_cargo_payment_value = useCallback((dkd_wallet_after_value) => {
    if (!setProfile) return;
    const dkd_numeric_wallet_value = Number(dkd_wallet_after_value);
    if (!Number.isFinite(dkd_numeric_wallet_value)) return;
    setProfile((dkd_previous_profile_value) => (
      dkd_previous_profile_value
        ? {
            ...dkd_previous_profile_value,
            wallet_tl: dkd_numeric_wallet_value,
          }
        : dkd_previous_profile_value
    ));
  }, [setProfile]);
  const dkd_active_task_value = useMemo(() => tasks.find((dkd_task_value) => ['to_business', 'to_customer'].includes(jobPhase(dkd_task_value))) || null, [tasks]);
  const dkd_live_arrival_value = useMemo(() => dkd_active_task_value ? nextDistanceAndArrival(dkd_active_task_value, currentLocation, geocodeCache)?.arrivalMin ?? null : null, [dkd_active_task_value, currentLocation, geocodeCache]);

  const dkd_order_mode_breathe_value = useRef(new Animated.Value(0)).current;
  const dkd_order_mode_scan_value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    const dkd_order_mode_breathe_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_order_mode_breathe_value, {
          toValue: 1,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_order_mode_breathe_value, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    dkd_order_mode_breathe_loop_value.start();
    return () => dkd_order_mode_breathe_loop_value.stop();
  }, [dkd_order_mode_breathe_value, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    dkd_order_mode_scan_value.setValue(0);
    const dkd_order_mode_scan_loop_value = Animated.loop(
      Animated.timing(dkd_order_mode_scan_value, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    dkd_order_mode_scan_loop_value.start();
    return () => dkd_order_mode_scan_loop_value.stop();
  }, [dkd_order_mode_scan_value, visible]);

  const dkd_order_mode_translate_y_value = dkd_order_mode_breathe_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });
  const dkd_order_mode_scale_value = dkd_order_mode_breathe_value.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.007],
  });
  const dkd_order_mode_glow_opacity_value = dkd_order_mode_breathe_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.14, 0.32],
  });
  const dkd_order_mode_outline_opacity_value = dkd_order_mode_breathe_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.46],
  });
  const dkd_order_mode_icon_halo_scale_value = dkd_order_mode_breathe_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.1],
  });
  const dkd_order_mode_icon_halo_opacity_value = dkd_order_mode_breathe_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.26],
  });
  const dkd_order_mode_scan_translate_x_value = dkd_order_mode_scan_value.interpolate({
    inputRange: [0, 1],
    outputRange: [-190, 260],
  });
  const dkd_order_mode_scan_opacity_value = dkd_order_mode_scan_value.interpolate({
    inputRange: [0, 0.12, 0.5, 0.88, 1],
    outputRange: [0, 0.42, 0.22, 0.42, 0],
  });

  const loadJobs = useCallback(async () => {
    if (!courierApproved) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchCourierJobs();
      if (error) throw error;
      setTasks((dkd_prev_rows) => dkd_merge_task_rows(dkd_prev_rows, Array.isArray(data) ? data : []));
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Kurye görevleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [courierApproved]);

  useEffect(() => {
    if (!visible) return undefined;
    setDkdCenterTabValue(courierApproved ? 'courier' : 'cargo_panel');
    setDkdCargoPanelModeValue('create');
    const dkd_interaction_task_value = InteractionManager.runAfterInteractions(() => {
      loadJobs();
    });
    return () => {
      dkd_interaction_task_value?.cancel?.();
    };
  }, [visible, loadJobs, courierApproved]);

  useEffect(() => {
    if (!visible) return;
    setApplicationDraft((prev) => ({
      ...defaultApplicationDraft(profile),
      ...prev,
      city: 'Ankara',
      zone: prev?.zone || String(profile?.courier_zone || profile?.courier_profile_meta?.zone || 'Çankaya'),
      vehicleType: prev?.vehicleType || String(profile?.courier_vehicle_type || 'moto'),
    }));
  }, [visible, profile?.courier_zone, profile?.courier_vehicle_type, profile?.courier_profile_meta]);

  useEffect(() => {
    if (!visible || !tasks.length) return;
    let cancelled = false;

    async function fillMissingCoordinates() {
      const entries = [];
      tasks.forEach((task) => {
        const phase = jobPhase(task);
        const address = phase === 'to_customer' || phase === 'completed' ? dropoffAddressForTask(task) : pickupAddressForTask(task);
        const lat = phase === 'to_customer' || phase === 'completed' ? task?.dropoff_lat : task?.pickup_lat;
        const lng = phase === 'to_customer' || phase === 'completed' ? task?.dropoff_lng : task?.pickup_lng;
        const key = geocodeKeyForTask(task, phase);
        if (!address || !needsGeocode(lat, lng) || geocodeCache[key]) return;
        entries.push({ key, address });
      });
      for (const entry of entries) {
        try {
          const query = entry.address.toLowerCase().includes('ankara') ? entry.address : `${entry.address}, ${GEOCODE_HINT}`;
          const rows = await Location.geocodeAsync(query);
          if (cancelled) return;
          if (Array.isArray(rows) && rows.length) {
            setGeocodeCache((prev) => ({
              ...prev,
              [entry.key]: { lat: Number(rows[0].latitude), lng: Number(rows[0].longitude) },
            }));
          }
        } catch (dkd_unused_value) {}
      }
    }

    fillMissingCoordinates();
    return () => { cancelled = true; };
  }, [visible, tasks, geocodeCache]);

  useEffect(() => {
    if (!visible || !courierApproved) return;
    if (currentLocation?.lat == null || currentLocation?.lng == null) return;

    const dkd_plate_value = String(profile?.courier_profile_meta?.plate_no || profile?.courier_profile_meta?.plateNo || '').trim().toUpperCase();
    const dkd_vehicle_type_value = String(profile?.courier_vehicle_type || profile?.courier_profile_meta?.vehicle_type || 'moto').trim().toLowerCase();

    let dkd_cancelled_value = false;
    async function dkd_sync_live_location() {
      try {
        if (dkd_cancelled_value) return;
        await dkd_upsert_courier_live_location({
          dkd_lat: currentLocation?.lat,
          dkd_lng: currentLocation?.lng,
          dkd_eta_min: dkd_live_arrival_value,
          dkd_heading_deg: currentLocation?.heading,
          dkd_plate_no: dkd_plate_value,
          dkd_vehicle_type: dkd_vehicle_type_value,
        });
      } catch (dkd_unused_error_value) {}
    }

    dkd_sync_live_location();
    const dkd_interval_value = setInterval(dkd_sync_live_location, 25000);
    return () => {
      dkd_cancelled_value = true;
      clearInterval(dkd_interval_value);
    };
  }, [visible, courierApproved, currentLocation?.lat, currentLocation?.lng, currentLocation?.heading, dkd_live_arrival_value, profile?.courier_profile_meta, profile?.courier_vehicle_type]);

  const stats = useMemo(() => {
    const open = tasks.filter((task) => jobPhase(task) === 'open').length;
    const accepted = tasks.filter((task) => ['to_business', 'to_customer'].includes(jobPhase(task))).length;
    const completed = tasks.filter((task) => jobPhase(task) === 'completed').length;
    return { open, accepted, completed };
  }, [tasks]);

  const dkd_queue_source_stats_value = useMemo(() => {
    const dkd_build_source_summary_value = (dkd_task_rows_value) => ({
      open: dkd_task_rows_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'open').length,
      accepted: dkd_task_rows_value.filter((dkd_task_value) => ['to_business', 'to_customer'].includes(jobPhase(dkd_task_value))).length,
      completed: dkd_task_rows_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'completed').length,
      total: dkd_task_rows_value.length,
    });

    const dkd_business_task_rows_value = tasks.filter((dkd_task_value) => dkd_is_business_task(dkd_task_value));
    const dkd_cargo_task_rows_value = tasks.filter((dkd_task_value) => dkd_is_cargo_task(dkd_task_value));

    return {
      business: dkd_build_source_summary_value(dkd_business_task_rows_value),
      cargo: dkd_build_source_summary_value(dkd_cargo_task_rows_value),
    };
  }, [tasks]);

  useEffect(() => {
    if (!visible || !courierApproved) return;
    setStatusFilter((dkd_prev_value) => {
      const dkd_has_active_value = tasks.some((dkd_task_value) => ['to_business', 'to_customer'].includes(jobPhase(dkd_task_value)));
      const dkd_has_open_value = tasks.some((dkd_task_value) => jobPhase(dkd_task_value) === 'open');
      if (dkd_has_active_value) return 'active';
      if (dkd_has_open_value) return 'open';
      return 'open';
    });
  }, [visible, courierApproved, tasks]);

  useEffect(() => {
    if (!visible || !courierApproved) return;
    const dkd_business_total_value = Number(dkd_queue_source_stats_value?.business?.total || 0);
    const dkd_cargo_total_value = Number(dkd_queue_source_stats_value?.cargo?.total || 0);
    if (dkd_queue_source_filter_value === 'business' && dkd_business_total_value === 0 && dkd_cargo_total_value > 0) {
      setDkdQueueSourceFilterValue('cargo');
      return;
    }
    if (dkd_queue_source_filter_value === 'cargo' && dkd_cargo_total_value === 0 && dkd_business_total_value > 0) {
      setDkdQueueSourceFilterValue('business');
      return;
    }
    if (dkd_business_total_value === 0 && dkd_cargo_total_value === 0) {
      setDkdQueueSourceFilterValue('business');
    }
  }, [visible, courierApproved, dkd_queue_source_filter_value, dkd_queue_source_stats_value]);

  const opsSummary = useMemo(() => {
    const completedTasks = tasks.filter((task) => jobPhase(task) === 'completed');
    const now = new Date();
    const total = completedTasks.reduce((sum, task) => sum + courierFeeTl(task), 0);
    const today = completedTasks.reduce((sum, task) => {
      const dtRaw = taskDateValue(task);
      if (!dtRaw) return sum;
      const dt = new Date(dtRaw);
      if (Number.isNaN(dt.getTime())) return sum;
      return isSameLocalDay(dt, now) ? sum + courierFeeTl(task) : sum;
    }, 0);
    const month = completedTasks.reduce((sum, task) => {
      const dtRaw = taskDateValue(task);
      if (!dtRaw) return sum;
      const dt = new Date(dtRaw);
      if (Number.isNaN(dt.getTime())) return sum;
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()
        ? sum + courierFeeTl(task)
        : sum;
    }, 0);
    return { total, today, month };
  }, [tasks]);

  const dkd_source_filtered_tasks_value = useMemo(() => {
    if (dkd_queue_source_filter_value === 'cargo') return tasks.filter((dkd_task_value) => dkd_is_cargo_task(dkd_task_value));
    return tasks.filter((dkd_task_value) => dkd_is_business_task(dkd_task_value));
  }, [tasks, dkd_queue_source_filter_value]);

  const dkd_active_source_stats_value = useMemo(() => {
    return dkd_queue_source_filter_value === 'cargo'
      ? (dkd_queue_source_stats_value?.cargo || { open: 0, accepted: 0, completed: 0, total: 0 })
      : (dkd_queue_source_stats_value?.business || { open: 0, accepted: 0, completed: 0, total: 0 });
  }, [dkd_queue_source_filter_value, dkd_queue_source_stats_value]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'open') return dkd_source_filtered_tasks_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'open');
    if (statusFilter === 'active') return dkd_source_filtered_tasks_value.filter((dkd_task_value) => ['to_business', 'to_customer'].includes(jobPhase(dkd_task_value)));
    if (statusFilter === 'completed') return dkd_source_filtered_tasks_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'completed');
    return dkd_source_filtered_tasks_value;
  }, [dkd_source_filtered_tasks_value, statusFilter]);

  useEffect(() => {
    if (!dkd_cargo_panel_task_value?.id) return;
    const dkd_fresh_task_value = tasks.find((dkd_task_row_value) => String(dkd_task_row_value?.id || '') === String(dkd_cargo_panel_task_value?.id || ''));
    if (dkd_fresh_task_value) setDkdCargoPanelTaskValue(dkd_fresh_task_value);
  }, [tasks, dkd_cargo_panel_task_value?.id]);

  const handleAccept = useCallback(async (taskId) => {
    setSavingId(String(taskId));
    try {
      const { data, error } = await acceptCourierJob(taskId, currentLocation);
      if (error) throw error;
      const dkd_now_value = new Date().toISOString();
      setTasks((dkd_prev_rows) => dkd_prev_rows.map((dkd_row) => (
        String(dkd_row?.id || '') === String(taskId)
          ? {
              ...dkd_row,
              status: 'accepted',
              is_active: true,
              accepted_at: dkd_row?.accepted_at || dkd_now_value,
              updated_at: dkd_now_value,
              assigned_user_id: profile?.user_id || dkd_row?.assigned_user_id || null,
              fee_tl: Number(data?.fee_tl || dkd_row?.fee_tl || 0),
              cargo_delivery_distance_km: Number(data?.delivery_distance_km || dkd_row?.cargo_delivery_distance_km || 0),
            }
          : dkd_row
      )));
      setStatusFilter('active');
      setTimeout(() => { loadJobs(); }, 900);
      Alert.alert('Kurye', 'Görev kabul edildi. Aktif operasyon filtresine geçildi.');
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Görev kabul edilemedi.');
    } finally {
      setSavingId(null);
    }
  }, [currentLocation, loadJobs, profile?.user_id]);

  const handlePickedUp = useCallback(async (task, dkd_pickup_proof_image_url_value = '') => {
    setSavingId(String(task?.id || ''));
    try {
      const { data, error } = await markCourierJobPickedUp(task?.id, { dkd_pickup_proof_image_url: dkd_pickup_proof_image_url_value });
      if (error) throw error;
      const dkd_now_value = new Date().toISOString();
      setTasks((dkd_prev_rows) => dkd_prev_rows.map((dkd_row) => (
        String(dkd_row?.id || '') === String(task?.id || '')
          ? {
              ...dkd_row,
              status: 'picked_up',
              pickup_status: 'picked_up',
              picked_up_at: dkd_row?.picked_up_at || dkd_now_value,
              updated_at: dkd_now_value,
              pickup_proof_image_url: String(dkd_pickup_proof_image_url_value || dkd_row?.pickup_proof_image_url || '').trim(),
            }
          : dkd_row
      )));
      setTimeout(() => { loadJobs(); }, 900);
      Alert.alert('Kurye', data?.message || `${task?.product_title || 'Ürün'} için teslim alma fotoğrafı kaydedildi. Teslim aldım.`);
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Teslim alma kaydedilemedi.');
      throw dkd_error_value;
    } finally {
      setSavingId(null);
    }
  }, [loadJobs]);

  const handleComplete = useCallback(async (task) => {
    setSavingId(String(task?.id || ''));
    const beforeProfile = profile || {};
    const beforeCourier = courierProgressFromScore(beforeProfile?.courier_score || 0);
    try {
      const { data, error } = await completeCourierJob(task?.id);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const feeTl = courierFeeTl({ ...(task || {}), ...(row || {}) }, nextDistanceAndArrival(task, currentLocation, geocodeCache).distanceKm);
      const nextCourierScore = Number(row?.courier_score ?? (Number(beforeProfile?.courier_score || 0) + Number(task?.reward_score || 0)));
      const nextCompletedJobs = Number(row?.courier_completed_jobs ?? (Number(beforeProfile?.courier_completed_jobs || 0) + 1));
      const nextCourierWallet = Number(row?.courier_wallet_tl ?? row?.wallet_tl ?? (Number(beforeProfile?.courier_wallet_tl || 0) + feeTl));
      const nextTotalEarned = Number(row?.courier_total_earned_tl ?? (Number(beforeProfile?.courier_total_earned_tl || 0) + feeTl));
      const nextWallet = Number(row?.wallet_tl ?? Number(beforeProfile?.wallet_tl ?? resolveUnifiedWalletTl(beforeProfile)) + feeTl);
      const nextToken = Number(row?.token ?? beforeProfile?.token ?? 0);

      if (row && setProfile) {
        setProfile((prev) => (
          prev
            ? {
                ...prev,
                courier_status: prev.courier_status || 'approved',
                courier_score: nextCourierScore,
                courier_completed_jobs: nextCompletedJobs,
                courier_wallet_tl: nextCourierWallet,
                courier_total_earned_tl: nextTotalEarned,
                courier_withdrawn_tl: Number((row?.courier_withdrawn_tl ?? prev?.courier_withdrawn_tl ?? 0)),
                courier_active_days: Number((row?.courier_active_days ?? prev?.courier_active_days ?? 0)),
                courier_last_completed_at: row?.courier_last_completed_at || new Date().toISOString(),
                courier_fastest_eta_min: row?.courier_fastest_eta_min == null
                  ? (prev?.courier_fastest_eta_min ?? null)
                  : Number(row?.courier_fastest_eta_min),
                wallet_tl: nextWallet,
                token: nextToken,
              }
            : prev
        ));
      }

      const afterCourier = courierProgressFromScore(nextCourierScore);
      if (afterCourier.level > beforeCourier.level) {
        const reward = aggregateCourierLevelRewards(beforeCourier.level, afterCourier.level);
        const rewardPatch = {
          token: Number(beforeProfile?.token || 0) + Number(reward.token || 0),
          shards: Number(beforeProfile?.shards || 0) + Number(reward.shards || 0),
        };

        if (beforeProfile?.user_id) {
          try {
            await supabase
              .from('dkd_profiles')
              .update(rewardPatch)
              .eq('user_id', beforeProfile.user_id);

            const xpResult = await awardProfileXp(beforeProfile.user_id, beforeProfile, reward.xp);
            setProfile?.((prev) => (
              prev
                ? {
                    ...prev,
                    ...rewardPatch,
                    xp: Number(xpResult?.data?.xp ?? prev?.xp ?? 0),
                    level: Math.max(1, Number(xpResult?.data?.level ?? prev?.level ?? 1)),
                    rank_key: xpResult?.data?.rank_key || prev?.rank_key || 'rookie',
                  }
                : prev
            ));
          } catch (dkd_unused_value) {
            setProfile?.((prev) => (
              prev
                ? {
                    ...prev,
                    ...rewardPatch,
                    xp: Number(prev?.xp || 0) + Number(reward.xp || 0),
                  }
                : prev
            ));
          }
        }

        setRewardModal({
          ...reward,
          fromLevel: beforeCourier.level,
          toLevel: afterCourier.level,
        });
      }

      const dkd_now_value = new Date().toISOString();
      setTasks((dkd_prev_rows) => dkd_prev_rows.map((dkd_row) => (
        String(dkd_row?.id || '') === String(task?.id || '')
          ? {
              ...dkd_row,
              status: 'completed',
              pickup_status: 'delivered',
              completed_at: dkd_now_value,
              updated_at: dkd_now_value,
              is_active: false,
            }
          : dkd_row
      )));
      setTimeout(() => { loadJobs(); }, 900);
      Alert.alert('Kurye', `Teslimat tamamlandı. +${Number(task?.reward_score || 0)} skor • +${feeTl.toFixed(0)} TL cüzdana işlendi.`);
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Teslimat kaydedilemedi.');
    } finally {
      setSavingId(null);
    }
  }, [loadJobs, profile, setProfile]);

  const dkd_close_pickup_modal_value = useCallback(() => {
    if (dkd_pickup_modal_busy_value) return;
    setDkdPickupModalTaskValue(null);
    setDkdPickupModalImageUriValue('');
  }, [dkd_pickup_modal_busy_value]);

  const dkd_open_pickup_modal_value = useCallback((dkd_task_value) => {
    if (!dkd_is_cargo_task(dkd_task_value)) {
      handlePickedUp(dkd_task_value).catch(() => {});
      return;
    }
    setDkdPickupModalTaskValue(dkd_task_value);
    setDkdPickupModalImageUriValue(String(dkd_task_value?.pickup_proof_image_url || '').trim());
  }, [handlePickedUp]);

  const dkd_capture_pickup_modal_photo_value = useCallback(async () => {
    try {
      const dkd_uri_value = await dkd_capture_cargo_pickup_photo();
      if (!dkd_uri_value) return;
      setDkdPickupModalImageUriValue(dkd_uri_value);
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Fotoğraf çekilemedi.');
    }
  }, []);

  const dkd_confirm_pickup_modal_value = useCallback(async () => {
    const dkd_task_value = dkd_pickup_modal_task_value;
    const dkd_image_uri_value = String(dkd_pickup_modal_image_uri_value || '').trim();
    if (!dkd_task_value?.id) return;
    if (!dkd_image_uri_value) {
      Alert.alert('Kurye', 'Önce ürünün fotoğrafını çek.');
      return;
    }

    setDkdPickupModalBusyValue(true);
    try {
      const dkd_sender_slug_value = [dkd_task_value?.customer_full_name, dkd_task_value?.merchant_name, dkd_task_value?.id].filter(Boolean).join('-');
      const { data: dkd_upload_data_value } = await dkd_upload_cargo_package_art({
        dkd_image_uri: dkd_image_uri_value,
        dkd_sender_slug: dkd_sender_slug_value || `cargo-${dkd_task_value?.id || 'pickup'}`,
        dkd_content_label: `pickup-proof-${dkd_task_value?.id || Date.now()}`,
      });
      const dkd_public_url_value = String(dkd_upload_data_value?.publicUrl || '').trim();
      if (!dkd_public_url_value) {
        throw new Error('Teslim alma fotoğrafı yüklenemedi.');
      }
      await handlePickedUp(dkd_task_value, dkd_public_url_value);
      setDkdPickupModalTaskValue(null);
      setDkdPickupModalImageUriValue('');
    } catch (dkd_error_value) {
      if (String(dkd_error_value?.message || '').toLowerCase().includes('yüklenemedi')) {
        Alert.alert('Kurye', dkd_error_value?.message || 'Teslim alma fotoğrafı kaydedilemedi.');
      }
    } finally {
      setDkdPickupModalBusyValue(false);
    }
  }, [dkd_pickup_modal_image_uri_value, dkd_pickup_modal_task_value, handlePickedUp]);

  const openRoute = useCallback(async (task) => {
    const target = targetMeta(task, geocodeCache);
    const current = coordPair(currentLocation?.lat, currentLocation?.lng);
    const origin = current ? `&origin=${current.lat},${current.lng}` : '';
    const coordQuery = target.lat != null && target.lng != null
      ? `&destination=${target.lat},${target.lng}`
      : `&destination=${encodeURIComponent(String(target.address || ''))}`;
    const url = `https://www.google.com/maps/dir/?api=1${origin}${coordQuery}&travelmode=driving`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Kurye', 'Harita bağlantısı açılamadı.');
        return;
      }
      await Linking.openURL(url);
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Harita bağlantısı açılamadı.');
    }
  }, [currentLocation?.lat, currentLocation?.lng, geocodeCache]);

  const dkd_open_cargo_panel_value = useCallback((dkd_task_value) => {
    if (!dkd_is_cargo_task(dkd_task_value)) return;
    setDkdCargoPanelTaskValue(dkd_task_value);
  }, []);

  const dkd_close_cargo_panel_value = useCallback(() => {
    setDkdCargoPanelTaskValue(null);
  }, []);

  const dkd_refresh_cargo_panel_value = useCallback(async () => {
    setDkdCargoPanelRefreshingValue(true);
    try {
      await loadJobs();
    } finally {
      setDkdCargoPanelRefreshingValue(false);
    }
  }, [loadJobs]);

  const dkd_open_customer_phone_value = useCallback(async (dkd_phone_text_value) => {
    const dkd_url_value = dkd_phone_dial_url_value(dkd_phone_text_value);
    if (!dkd_url_value) {
      Alert.alert('Kurye', 'Geçerli telefon numarası bulunamadı.');
      return;
    }
    try {
      const dkd_supported_value = await Linking.canOpenURL(dkd_url_value);
      if (!dkd_supported_value) {
        Alert.alert('Kurye', 'Telefon araması başlatılamadı.');
        return;
      }
      await Linking.openURL(dkd_url_value);
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Telefon araması başlatılamadı.');
    }
  }, []);

  const handleApply = useCallback(async () => {
    if (!appRequiredReady(applicationDraft)) {
      Alert.alert('Kurye', 'Lütfen zorunlu alanları ve gerekli belgeleri tamamla.');
      return;
    }
    setApplying(true);
    try {
      const { data, error } = await submitCourierApplication({
        userId: profile?.user_id || profile?.id,
        form: applicationDraft,
      });
      if (error) throw error;

      const nextStatus = String(data?.status || 'pending');
      setProfile?.((prev) => (
        prev
          ? {
              ...prev,
              courier_status: nextStatus,
              courier_city: String(data?.city || applicationDraft.city || 'Ankara'),
              courier_zone: String(data?.zone || applicationDraft.zone || ''),
              courier_vehicle_type: String(data?.vehicle_type || applicationDraft.vehicleType || 'moto'),
              courier_profile_meta: {
                ...(prev?.courier_profile_meta || {}),
                zone: String(data?.zone || applicationDraft.zone || ''),
                application_documents: data?.documents || {},
              },
            }
          : prev
      ));
      Alert.alert('Kurye', 'Detaylı başvurun kaydedildi. Belgeler admin incelemesine gönderildi.');
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Başvuru gönderilemedi.');
    } finally {
      setApplying(false);
    }
  }, [applicationDraft, profile?.id, profile?.user_id, setProfile]);


  const dkd_render_cargo_panel_value = () => (
    <View style={styles.dkdCargoPanelShell}>
      <View style={styles.dkdCargoPanelSegmentRow}>
        <Pressable
          onPress={() => setDkdCargoPanelModeValue('create')}
          style={[styles.dkdCargoPanelSegmentChip, dkd_cargo_panel_mode_value === 'create' && styles.dkdCargoPanelSegmentChipActive]}
        >
          <MaterialCommunityIcons name="package-variant-plus" size={16} color={dkd_cargo_panel_mode_value === 'create' ? '#07131C' : '#CFFBFF'} />
          <Text style={[styles.dkdCargoPanelSegmentText, dkd_cargo_panel_mode_value === 'create' && styles.dkdCargoPanelSegmentTextActive]}>Kargo Oluştur</Text>
        </Pressable>
        <Pressable
          onPress={() => setDkdCargoPanelModeValue('shipments')}
          style={[styles.dkdCargoPanelSegmentChip, dkd_cargo_panel_mode_value === 'shipments' && styles.dkdCargoPanelSegmentChipActive]}
        >
          <MaterialCommunityIcons name="package-variant-closed-check" size={16} color={dkd_cargo_panel_mode_value === 'shipments' ? '#07131C' : '#CFFBFF'} />
          <Text style={[styles.dkdCargoPanelSegmentText, dkd_cargo_panel_mode_value === 'shipments' && styles.dkdCargoPanelSegmentTextActive]}>Gönderilerim</Text>
        </Pressable>
      </View>
      <DkdCargoSenderPanel
        dkd_visible_value={visible && dkd_center_tab_value === 'cargo_panel'}
        dkd_panel_mode_value={dkd_cargo_panel_mode_value === 'shipments' ? 'shipments_only' : 'create_only'}
        dkd_current_location_value={currentLocation}
        dkd_wallet_tl_value={walletTl}
        dkd_on_wallet_after_payment_value={dkd_sync_wallet_after_cargo_payment_value}
        dkd_on_created_value={() => { setStatusFilter('open'); loadJobs(); }}
      />
    </View>
  );

  const dkd_render_urgent_panel_value = () => (
    <DkdUrgentCourierPanel
      dkd_visible_value={visible && dkd_center_tab_value === 'urgent'}
      dkd_profile_value={profile}
      dkd_courier_approved_value={courierApproved}
      dkd_on_wallet_after_payment_value={dkd_sync_wallet_after_cargo_payment_value}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeScreen style={styles.screen}>
        <LinearGradient colors={['#05111D', '#081629', '#050912']} style={styles.screen}>
          <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {courierApproved ? (
            !dkd_deferred_modal_content_ready_value ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                <ActivityIndicator size="large" color="#67E8F9" />
                <Text style={{ marginTop: 14, color: 'rgba(231,241,255,0.78)', fontSize: 15, fontWeight: '700' }}>Kurye merkezi hazırlanıyor...</Text>
                <Text style={{ marginTop: 6, color: 'rgba(231,241,255,0.48)', fontSize: 12, textAlign: 'center' }}>Ağır liste ve rota panelleri etkileşim tamamlandıktan sonra yüklenecek.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <SkylineHeroCard
                title="Kurye-Kargo Operasyon Merkezi"
                titleStyle={styles.dkd_center_hero_title}
                icon="truck-fast-outline"
                tone="green"
                onRefresh={loadJobs}
                onClose={onClose}
              >
                <View style={styles.heroXpPanel}>
                  <View style={styles.heroXpTopRow}>
                    <Text style={styles.heroXpLabel}>Kurye XP • {courierRegionLabel(profile)}</Text>
                    <Text style={styles.heroXpLevel}>Seviye {courierProgress.level}</Text>
                  </View>
                  <View style={styles.heroXpTrack}>
                    <LinearGradient colors={['#61D8FF', '#7E8BFF', '#C07BFF', '#61F2AE']} start={dkd_make_native_axis_point(0, 0.5)} end={dkd_make_native_axis_point(1, 0.5)} style={[styles.heroXpFill, { width: `${Math.max(8, courierProgress.progressPct)}%` }]} />
                  </View>
                  <Text style={styles.heroXpMeta}>{courierProgress.progressXp}/{courierProgress.levelGoal} XP • %{courierProgress.progressPct}</Text>
                  <Text style={styles.heroXpRewardLine}>Sonraki seviye: +{nextCourierReward.token} Token • +{nextCourierReward.shards} Shard • +{nextCourierReward.xp} XP</Text>
                  <View style={styles.dkdHeroLicenseWalletRow}>
                    <View style={styles.heroLicenseChip}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color="#63F1B1" />
                      <Text style={styles.heroLicenseChipText}>Kurye lisansı aktif</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.heroStatsRow}>
                  <View style={styles.headerMiniChip}><Text style={styles.headerMiniChipText}>Skor {String(Number(profile?.courier_score || 0))}</Text></View>
                  <View style={[styles.headerMiniChip, styles.headerMiniChipBlue]}><Text style={styles.headerMiniChipText}>Teslimat {String(Number(profile?.courier_completed_jobs || 0))}</Text></View>
                  <View style={[styles.headerMiniChip, styles.headerMiniChipGreen]}><Text style={styles.headerMiniChipText}>Aktif {String(stats.accepted)}</Text></View>
                </View>
              </SkylineHeroCard>

              <View style={styles.dkdCenterQuickGrid}>
                <Pressable onPress={() => setProfileVisible(true)} style={styles.dkdCenterQuickCardPressable}>
                  <LinearGradient
                    colors={['rgba(100,226,255,0.24)', 'rgba(118,125,255,0.22)', 'rgba(176,102,255,0.20)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={styles.dkdCenterQuickCard}
                  >
                    <View style={styles.dkdCenterQuickCardTopRow}>
                      <LinearGradient
                        colors={['#62E6FF', '#7C84FF', '#B66DFF']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdCenterQuickIconShell}
                      >
                        <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={styles.dkdCenterQuickStatusChip}>
                        <Text style={styles.dkdCenterQuickStatusText}>Profil</Text>
                      </View>
                    </View>
                    <View style={styles.dkdCenterQuickTextStack}>
                      <Text style={styles.dkdCenterQuickEyebrow}>KURYE MODU</Text>
                      <Text style={styles.dkdCenterQuickTitle}>Kurye Profili</Text>
                      <Text style={styles.dkdCenterQuickSubtitle}>Lisans, bölge ve teslimat performansını tek yerden aç.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => { setDkdCargoPanelModeValue('create'); setDkdCenterTabValue('cargo_panel'); }} style={styles.dkdCenterQuickCardPressable}>
                  <LinearGradient
                    colors={dkd_center_tab_value === 'cargo_panel'
                      ? ['rgba(109,255,214,0.30)', 'rgba(44,210,144,0.26)', 'rgba(8,34,23,0.98)']
                      : ['rgba(92,255,214,0.18)', 'rgba(18,126,96,0.20)', 'rgba(7,24,18,0.96)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={[styles.dkdCenterQuickCard, dkd_center_tab_value === 'cargo_panel' && styles.dkdCenterQuickCardActive]}
                  >
                    <View style={styles.dkdCenterQuickCardTopRow}>
                      <LinearGradient
                        colors={dkd_center_tab_value === 'cargo_panel' ? ['#71FFE1', '#39E7B3', '#159F73'] : ['#69F7CF', '#2DD494']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdCenterQuickIconShell}
                      >
                        <MaterialCommunityIcons name="package-variant-plus" size={20} color="#083224" />
                      </LinearGradient>
                      <View style={[styles.dkdCenterQuickStatusChip, dkd_center_tab_value === 'cargo_panel' && styles.dkdCenterQuickStatusChipActive]}>
                        <Text style={[styles.dkdCenterQuickStatusText, dkd_center_tab_value === 'cargo_panel' && styles.dkdCenterQuickStatusTextActive]}>Yeni</Text>
                      </View>
                    </View>
                    <View style={styles.dkdCenterQuickTextStack}>
                      <Text style={styles.dkdCenterQuickEyebrow}>GÖNDERİ MODU</Text>
                      <Text style={styles.dkdCenterQuickTitle}>Kargo Paneli</Text>
                      <Text style={styles.dkdCenterQuickSubtitle}>Kargo oluştur ve Gönderilerim akışını tek karttan yönet.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.dkd_modern_center_tab_row}>
                <Pressable onPress={() => setDkdCenterTabValue('courier')} style={styles.dkd_modern_center_tab_pressable}>
                  <Animated.View
                    style={[
                      styles.dkdOrderModeCardMotionLayer,
                      dkd_center_tab_value === 'courier' && {
                        transform: [
                          { translateY: dkd_order_mode_translate_y_value },
                          { scale: dkd_order_mode_scale_value },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={dkd_center_tab_value === 'courier' ? ['rgba(104,236,255,0.28)', 'rgba(105,124,255,0.26)', 'rgba(23,34,58,0.96)'] : ['rgba(18,40,62,0.96)', 'rgba(12,28,45,0.96)', 'rgba(8,17,30,0.96)']}
                      start={dkd_make_native_axis_point(0, 0)}
                      end={dkd_make_native_axis_point(1, 1)}
                      style={[styles.dkd_modern_center_tab_card, dkd_center_tab_value === 'courier' && styles.dkd_modern_center_tab_card_courier_active]}
                    >
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.dkdOrderModeCardAura, { opacity: dkd_center_tab_value === 'courier' ? dkd_order_mode_glow_opacity_value : 0 }]}
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.dkdOrderModeCardOutline, { opacity: dkd_center_tab_value === 'courier' ? dkd_order_mode_outline_opacity_value : 0 }]}
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.dkdOrderModeCardScanWrap,
                          {
                            opacity: dkd_center_tab_value === 'courier' ? dkd_order_mode_scan_opacity_value : 0,
                            transform: [{ translateX: dkd_order_mode_scan_translate_x_value }],
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={['rgba(255,255,255,0)', 'rgba(117,232,255,0.18)', 'rgba(138,160,255,0.52)', 'rgba(255,255,255,0)']}
                          start={dkd_make_native_axis_point(0, 0)}
                          end={dkd_make_native_axis_point(1, 1)}
                          style={styles.dkdOrderModeCardScanBand}
                        />
                      </Animated.View>
                      <View style={styles.dkd_modern_center_tab_card_top_row}>
                        <View style={styles.dkdOrderModeCardIconWrap}>
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              styles.dkdOrderModeCardIconHalo,
                              {
                                opacity: dkd_center_tab_value === 'courier' ? dkd_order_mode_icon_halo_opacity_value : 0,
                                transform: [{ scale: dkd_order_mode_icon_halo_scale_value }],
                              },
                            ]}
                          />
                          <LinearGradient
                            colors={dkd_center_tab_value === 'courier' ? ['#69E7FF', '#718BFF', '#B56DFF'] : ['rgba(116,190,255,0.22)', 'rgba(78,124,255,0.16)']}
                            start={dkd_make_native_axis_point(0, 0)}
                            end={dkd_make_native_axis_point(1, 1)}
                            style={styles.dkd_modern_center_tab_icon_shell}
                          >
                            <MaterialCommunityIcons name="bike-fast" size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </View>
                        <View style={[styles.dkd_modern_center_tab_status_chip, dkd_center_tab_value === 'courier' && styles.dkd_modern_center_tab_status_chip_courier_active]}>
                          <Text style={[styles.dkd_modern_center_tab_status_text, dkd_center_tab_value === 'courier' && styles.dkd_modern_center_tab_status_text_active]}>
                            {dkd_center_tab_value === 'courier' ? `${Number(stats.open || 0) + Number(stats.accepted || 0)} iş` : 'Siparişler'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dkd_modern_center_tab_text_stack}>
                        <Text style={styles.dkd_modern_center_tab_eyebrow}>SİPARİŞ MODU</Text>
                        <Text style={[styles.dkd_modern_center_tab_title, dkd_center_tab_value === 'courier' && styles.dkd_modern_center_tab_title_active]}>Sipariş Havuzu</Text>
                        <Text style={styles.dkd_modern_center_tab_subtitle}>Açık ve aktif teslimatları tek ekranda yönet.</Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>

                <Pressable onPress={() => setDkdCenterTabValue('urgent')} style={styles.dkd_modern_center_tab_pressable}>
                  <LinearGradient
                    colors={dkd_center_tab_value === 'urgent' ? ['rgba(99,255,203,0.24)', 'rgba(17,116,74,0.32)', 'rgba(7,26,18,0.96)'] : ['rgba(18,40,62,0.96)', 'rgba(10,26,40,0.96)', 'rgba(6,16,28,0.96)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={[styles.dkd_modern_center_tab_card, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_card_cargo_active]}
                  >
                    <View style={styles.dkd_modern_center_tab_card_top_row}>
                      <LinearGradient
                        colors={dkd_center_tab_value === 'urgent' ? ['#6CFFD4', '#29D694', '#0F704A'] : ['rgba(104,255,214,0.22)', 'rgba(45,212,148,0.14)']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkd_modern_center_tab_icon_shell}
                      >
                        <MaterialCommunityIcons name="flash-outline" size={20} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={[styles.dkd_modern_center_tab_status_chip, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_status_chip_cargo_active]}>
                        <Text style={[styles.dkd_modern_center_tab_status_text, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_status_text_active]}>Canlı</Text>
                      </View>
                    </View>
                    <View style={styles.dkd_modern_center_tab_text_stack}>
                      <Text style={styles.dkd_modern_center_tab_eyebrow}>ACİL TESLİMAT</Text>
                      <Text style={[styles.dkd_modern_center_tab_title, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_title_active]}>Acil Kurye</Text>
                      <Text style={styles.dkd_modern_center_tab_subtitle}>Market, fırın ve eczane siparişlerini web ile senkron yönet.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              {dkd_center_tab_value === 'courier' ? (
                <> 
              <View style={styles.dkdQueueSourcePanel}>
                <View style={styles.queuePanelCompactHead}>
                  <Text style={styles.queueTitle}>Sipariş Kanalları</Text>
                  <Text style={styles.queueCompactMeta}>{Number(dkd_queue_source_stats_value?.business?.total || 0) + Number(dkd_queue_source_stats_value?.cargo?.total || 0)} görev</Text>
                </View>
                <Text style={styles.dkdQueueSourcePanelSubtext}>İşletme market teslimatları ile kargo operasyonlarını ayrı kanallarda yönet.</Text>
                <View style={styles.dkdQueueSourceCardRow}>
                  <Pressable onPress={() => setDkdQueueSourceFilterValue('business')} style={styles.dkdQueueSourceCardPressable}>
                    <LinearGradient
                      colors={dkd_queue_source_filter_value === 'business'
                        ? ['rgba(110,228,255,0.26)', 'rgba(89,125,255,0.20)', 'rgba(11,22,46,0.98)']
                        : ['rgba(17,37,58,0.96)', 'rgba(8,20,36,0.96)', 'rgba(7,16,28,0.96)']}
                      start={dkd_make_native_axis_point(0, 0)}
                      end={dkd_make_native_axis_point(1, 1)}
                      style={[styles.dkdQueueSourceCard, dkd_queue_source_filter_value === 'business' && styles.dkdQueueSourceCardBusinessActive]}
                    >
                      <View style={styles.dkdQueueSourceCardTopRow}>
                        <LinearGradient
                          colors={dkd_queue_source_filter_value === 'business' ? ['#71E8FF', '#7190FF', '#B66DFF'] : ['rgba(113,232,255,0.18)', 'rgba(113,144,255,0.14)']}
                          start={dkd_make_native_axis_point(0, 0)}
                          end={dkd_make_native_axis_point(1, 1)}
                          style={styles.dkdQueueSourceIconShell}
                        >
                          <MaterialCommunityIcons name="storefront-outline" size={18} color="#FFFFFF" />
                        </LinearGradient>
                        </View>
                      <Text style={styles.dkdQueueSourceEyebrow}>İŞLETME SİPARİŞLERİ</Text>
                      <Text style={styles.dkdQueueSourceTitle}>İşletme Siparişleri</Text>
                      <Text style={styles.dkdQueueSourceText}>Vitrin ve mağaza üzerinden gelen işletme teslimatlarını burada yönet.</Text>
                      <View style={styles.dkdQueueSourceStatRow}>
                        <View style={styles.dkdQueueSourceStatPill}><Text style={styles.dkdQueueSourceStatText}>Açık {dkd_queue_source_stats_value?.business?.open || 0}</Text></View>
                        <View style={styles.dkdQueueSourceStatPill}><Text style={styles.dkdQueueSourceStatText}>Aktif {dkd_queue_source_stats_value?.business?.accepted || 0}</Text></View>
                      </View>
                    </LinearGradient>
                  </Pressable>

                  <Pressable onPress={() => setDkdQueueSourceFilterValue('cargo')} style={styles.dkdQueueSourceCardPressable}>
                    <LinearGradient
                      colors={dkd_queue_source_filter_value === 'cargo'
                        ? ['rgba(104,255,214,0.24)', 'rgba(33,180,131,0.22)', 'rgba(7,31,23,0.98)']
                        : ['rgba(17,37,58,0.96)', 'rgba(8,20,36,0.96)', 'rgba(7,16,28,0.96)']}
                      start={dkd_make_native_axis_point(0, 0)}
                      end={dkd_make_native_axis_point(1, 1)}
                      style={[styles.dkdQueueSourceCard, dkd_queue_source_filter_value === 'cargo' && styles.dkdQueueSourceCardCargoActive]}
                    >
                      <View style={styles.dkdQueueSourceCardTopRow}>
                        <LinearGradient
                          colors={dkd_queue_source_filter_value === 'cargo' ? ['#79FFE2', '#35D7A7', '#10906D'] : ['rgba(121,255,226,0.18)', 'rgba(53,215,167,0.14)']}
                          start={dkd_make_native_axis_point(0, 0)}
                          end={dkd_make_native_axis_point(1, 1)}
                          style={styles.dkdQueueSourceIconShell}
                        >
                          <MaterialCommunityIcons name="cube-send" size={18} color="#FFFFFF" />
                        </LinearGradient>
                      </View>
                      <Text style={styles.dkdQueueSourceEyebrow}>KARGO SİPARİŞLERİ</Text>
                      <Text style={styles.dkdQueueSourceTitle}>Kargo Siparişleri</Text>
                      <Text style={styles.dkdQueueSourceText}>Gönderici ve alıcı arasında çalışan kargo teslimatlarını burada aç.</Text>
                      <View style={styles.dkdQueueSourceStatRow}>
                        <View style={styles.dkdQueueSourceStatPill}><Text style={styles.dkdQueueSourceStatText}>Açık {dkd_queue_source_stats_value?.cargo?.open || 0}</Text></View>
                        <View style={styles.dkdQueueSourceStatPill}><Text style={styles.dkdQueueSourceStatText}>Aktif {dkd_queue_source_stats_value?.cargo?.accepted || 0}</Text></View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>

              <View style={styles.queuePanelCompact}>
                <View style={styles.queuePanelCompactHead}>
                  <Text style={styles.queueTitle}>{dkd_queue_source_filter_value === 'cargo' ? 'Kargo Operasyon Filtresi' : 'İşletme Operasyon Filtresi'}</Text>
                  <Text style={styles.queueCompactMeta}>{filteredTasks.length} görev</Text>
                </View>
                <View style={styles.queueFilterRow}>
                  <Pressable onPress={() => setStatusFilter('open')} style={[styles.queueFilterChip, statusFilter === 'open' && styles.queueFilterChipActive]}>
                    <Text style={[styles.queueFilterChipText, statusFilter === 'open' && styles.queueFilterChipTextActive]}>Açık {dkd_active_source_stats_value.open}</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatusFilter('active')} style={[styles.queueFilterChip, statusFilter === 'active' && styles.queueFilterChipActive]}>
                    <Text style={[styles.queueFilterChipText, statusFilter === 'active' && styles.queueFilterChipTextActive]}>Aktif {dkd_active_source_stats_value.accepted}</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatusFilter('completed')} style={[styles.queueFilterChip, statusFilter === 'completed' && styles.queueFilterChipActive]}>
                    <Text style={[styles.queueFilterChipText, statusFilter === 'completed' && styles.queueFilterChipTextActive]}>Biten {dkd_active_source_stats_value.completed}</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatusFilter('all')} style={[styles.queueFilterChip, statusFilter === 'all' && styles.queueFilterChipActive]}>
                    <Text style={[styles.queueFilterChipText, statusFilter === 'all' && styles.queueFilterChipTextActive]}>Tümü {dkd_active_source_stats_value.total}</Text>
                  </Pressable>
                </View>
              </View>

              {loading ? (
                <View style={styles.loaderWrap}><ActivityIndicator color="#fff" /></View>
              ) : filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <JobCard
                    key={String(task?.id)}
                    task={task}
                    savingId={savingId}
                    currentLocation={currentLocation}
                    geocodeCache={geocodeCache}
                    onAccept={handleAccept}
                    onPickedUp={dkd_open_pickup_modal_value}
                    onComplete={handleComplete}
                    onOpenRoute={openRoute}
                    onOpenCustomerPhone={dkd_open_customer_phone_value}
                    onOpenCargoPanel={dkd_open_cargo_panel_value}
                  />
                ))
              ) : (
                <View style={styles.emptyWrap}>
                  <MaterialCommunityIcons name={dkd_queue_source_filter_value === 'cargo' ? 'cube-send' : 'storefront-outline'} size={28} color={dkd_queue_source_filter_value === 'cargo' ? dkd_colors.green : dkd_colors.cyanSoft} />
                  <Text style={styles.emptyTitle}>{statusFilter === 'all' ? (dkd_queue_source_filter_value === 'cargo' ? 'Şu an açık kargo siparişi yok' : 'Şu an açık işletme siparişi yok') : 'Bu filtrede görev görünmüyor'}</Text>
                  <Text style={styles.emptyText}>{statusFilter === 'all' ? (dkd_queue_source_filter_value === 'cargo' ? 'Kargo merkezinden açılan gönderiler burada görünecek.' : 'İşletme marketinden token ile alınan teslimatlar burada görünecek.') : 'Başka bir filtre seçerek diğer operasyon kartlarını görebilirsin.'}</Text>
                </View>
              )}
                </>
              ) : dkd_center_tab_value === 'urgent' ? (
                dkd_render_urgent_panel_value()
              ) : (
                dkd_render_cargo_panel_value()
              )}
              </ScrollView>
            )
          ) : (
            <ScrollView contentContainerStyle={styles.applyShell} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <SkylineHeroCard
                title="Kurye-Kargo Operasyon Merkezi"
                titleStyle={styles.dkd_center_hero_title}
                icon="truck-fast-outline"
                tone={courierPending ? 'blue' : 'green'}
                badgeText={courierPending ? 'Başvuru beklemede' : undefined}
                onClose={onClose}
              >
                {courierPending ? (
                  <Text style={styles.applyHeroText}>
                    Başvurun admin incelemesinde. Belgelerin doğrulanınca kurye paneli otomatik açılacak.
                  </Text>
                ) : null}
              </SkylineHeroCard>

              <View style={styles.dkdUnlockedCenterCardGrid}>
                <Pressable onPress={() => { setDkdCargoPanelModeValue('create'); setDkdCenterTabValue('cargo_panel'); }} style={styles.dkdUnlockedCenterCardPressable}>
                  <LinearGradient
                    colors={dkd_center_tab_value === 'cargo_panel'
                      ? ['rgba(90,255,214,0.30)', 'rgba(41,183,137,0.24)', 'rgba(7,38,27,0.98)']
                      : ['rgba(56,211,255,0.20)', 'rgba(33,114,196,0.18)', 'rgba(8,24,38,0.96)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={[styles.dkdUnlockedCenterCard, dkd_center_tab_value === 'cargo_panel' && styles.dkdUnlockedCenterCardActive]}
                  >
                    <View style={styles.dkdUnlockedCenterCardTopRow}>
                      <LinearGradient
                        colors={dkd_center_tab_value === 'cargo_panel' ? ['#79FFE2', '#35D7A7', '#10906D'] : ['#6CE7FF', '#4B87FF', '#6C7CFF']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdUnlockedCenterIconShell}
                      >
                        <MaterialCommunityIcons name="package-variant-plus" size={20} color={dkd_center_tab_value === 'cargo_panel' ? '#083324' : '#FFFFFF'} />
                      </LinearGradient>
                      <View style={[styles.dkdUnlockedCenterStatusChip, dkd_center_tab_value === 'cargo_panel' && styles.dkdUnlockedCenterStatusChipCargo]}>
                        <Text style={[styles.dkdUnlockedCenterStatusText, dkd_center_tab_value === 'cargo_panel' && styles.dkdUnlockedCenterStatusTextActive]}>Hemen Aç</Text>
                      </View>
                    </View>
                    <View style={styles.dkdUnlockedCenterTextStack}>
                      <Text style={styles.dkdUnlockedCenterEyebrow}>GÖNDERİ MODU</Text>
                      <Text style={styles.dkdUnlockedCenterTitle}>Kargo Paneli</Text>
                      <Text style={styles.dkdUnlockedCenterSubtitle}>Kargo oluştur ve Gönderilerim akışını tek karttan yönet.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => setDkdCenterTabValue('urgent')} style={styles.dkdUnlockedCenterCardPressable}>
                  <LinearGradient
                    colors={dkd_center_tab_value === 'urgent'
                      ? ['rgba(255,211,92,0.30)', 'rgba(255,92,149,0.22)', 'rgba(52,22,40,0.98)']
                      : ['rgba(255,211,92,0.18)', 'rgba(255,92,149,0.14)', 'rgba(28,18,34,0.96)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={[styles.dkdUnlockedCenterCard, dkd_center_tab_value === 'urgent' && styles.dkdUnlockedCenterCardUrgentActive]}
                  >
                    <View style={styles.dkdUnlockedCenterCardTopRow}>
                      <LinearGradient
                        colors={dkd_center_tab_value === 'urgent' ? ['#FFD85F', '#FF6A96', '#8CF2FF'] : ['#FFD85F', '#FF7EA7', '#6CE7FF']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdUnlockedCenterIconShell}
                      >
                        <MaterialCommunityIcons name="flash-outline" size={20} color="#07131C" />
                      </LinearGradient>
                      <View style={[styles.dkdUnlockedCenterStatusChip, dkd_center_tab_value === 'urgent' && styles.dkdUnlockedCenterStatusChipUrgent]}>
                        <Text style={[styles.dkdUnlockedCenterStatusText, dkd_center_tab_value === 'urgent' && styles.dkdUnlockedCenterStatusTextActive]}>Senkron</Text>
                      </View>
                    </View>
                    <View style={styles.dkdUnlockedCenterTextStack}>
                      <Text style={styles.dkdUnlockedCenterEyebrow}>ACİL TESLİMAT</Text>
                      <Text style={styles.dkdUnlockedCenterTitle}>Acil Kurye</Text>
                      <Text style={styles.dkdUnlockedCenterSubtitle}>Market, fırın ve eczane siparişlerini web ile senkron oluştur.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => setDkdCenterTabValue('application')} style={styles.dkdUnlockedCenterCardPressable}>
                  <LinearGradient
                    colors={dkd_center_tab_value === 'application'
                      ? ['rgba(117,139,255,0.30)', 'rgba(187,108,255,0.24)', 'rgba(28,20,58,0.98)']
                      : ['rgba(98,226,255,0.18)', 'rgba(116,125,255,0.18)', 'rgba(17,24,44,0.96)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={[styles.dkdUnlockedCenterCard, dkd_center_tab_value === 'application' && styles.dkdUnlockedCenterCardApplicationActive]}
                  >
                    <View style={styles.dkdUnlockedCenterCardTopRow}>
                      <LinearGradient
                        colors={dkd_center_tab_value === 'application' ? ['#71E8FF', '#7484FF', '#BC6FFF'] : ['#6CE7FF', '#7C84FF', '#B66DFF']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdUnlockedCenterIconShell}
                      >
                        <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={[styles.dkdUnlockedCenterStatusChip, dkd_center_tab_value === 'application' && styles.dkdUnlockedCenterStatusChipApplication]}>
                        <Text style={[styles.dkdUnlockedCenterStatusText, dkd_center_tab_value === 'application' && styles.dkdUnlockedCenterStatusTextActive]}>Belge Yükle</Text>
                      </View>
                    </View>
                    <View style={styles.dkdUnlockedCenterTextStack}>
                      <Text style={styles.dkdUnlockedCenterEyebrow}>KURYE MODU</Text>
                      <Text style={styles.dkdUnlockedCenterTitle}>Kurye Başvurusu</Text>
                      <Text style={styles.dkdUnlockedCenterSubtitle}>Kimlik, ehliyet ve bölge bilgilerini ekleyip kurye lisans sürecini başlat.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              {dkd_center_tab_value === 'cargo_panel' ? (
                dkd_render_cargo_panel_value()
              ) : dkd_center_tab_value === 'urgent' ? (
                dkd_render_urgent_panel_value()
              ) : (
              <>
              <View style={styles.applyCard}>
                <Text style={styles.applyTitle}>Detaylı kurye başvuru formu</Text>
                <Text style={styles.applyText}>
                  Ankara bölge seçimi zorunlu. Seçtiğin bölge, onay sonrası kurye profilinde otomatik görünecek.
                </Text>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <FieldLabel required>Ad</FieldLabel>
                    <FormInput value={applicationDraft.firstName} onChangeText={(dkd_value_2) => setDraftField('firstName', dkd_value_2)} placeholder="Ad" maxLength={32} />
                  </View>
                  <View style={styles.formCol}>
                    <FieldLabel required>Soyad</FieldLabel>
                    <FormInput value={applicationDraft.lastName} onChangeText={(dkd_value_2) => setDraftField('lastName', dkd_value_2)} placeholder="Soyad" maxLength={32} />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <FieldLabel required>TC Kimlik No</FieldLabel>
                    <FormInput value={applicationDraft.nationalId} onChangeText={(dkd_value_2) => setDraftField('nationalId', normalizeDigits(dkd_value_2, 11))} placeholder="11 haneli TC" keyboardType="number-pad" maxLength={11} />
                  </View>
                  <View style={styles.formCol}>
                    <FieldLabel required>Telefon</FieldLabel>
                    <FormInput value={applicationDraft.phone} onChangeText={(dkd_value_2) => setDraftField('phone', normalizeDigits(dkd_value_2, 11))} placeholder="05xx xxx xx xx" keyboardType="phone-pad" maxLength={11} />
                  </View>
                </View>

                <FieldLabel>E-posta</FieldLabel>
                <FormInput value={applicationDraft.email} onChangeText={(dkd_value_2) => setDraftField('email', dkd_value_2)} placeholder="ornek@mail.com" keyboardType="email-address" maxLength={64} />

                <FieldLabel required>Ankara Bölgesi</FieldLabel>
                <View style={styles.zoneChipWrap}>
                  {ANKARA_ZONES.map((zone) => (
                    <Pressable key={zone} onPress={() => setDraftField('zone', zone)} style={[styles.zoneChip, applicationDraft.zone === zone && styles.zoneChipActive]}>
                      <Text style={[styles.zoneChipText, applicationDraft.zone === zone && styles.zoneChipTextActive]}>{zone}</Text>
                    </Pressable>
                  ))}
                </View>

                <FieldLabel required>Araç Türü</FieldLabel>
                <View style={styles.zoneChipWrap}>
                  {VEHICLE_TYPES.map((item) => (
                    <Pressable key={item.key} onPress={() => setDraftField('vehicleType', item.key)} style={[styles.zoneChip, applicationDraft.vehicleType === item.key && styles.zoneChipActive]}>
                      <Text style={[styles.zoneChipText, applicationDraft.vehicleType === item.key && styles.zoneChipTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <FieldLabel>Plaka</FieldLabel>
                    <FormInput value={applicationDraft.plateNo} onChangeText={(dkd_value) => setDraftField('plateNo', dkd_value.toUpperCase())} placeholder="06 ABC 123" maxLength={16} />
                  </View>
                  <View style={styles.formCol}>
                    <FieldLabel>Acil Durum Telefonu</FieldLabel>
                    <FormInput value={applicationDraft.emergencyPhone} onChangeText={(dkd_value_2) => setDraftField('emergencyPhone', normalizeDigits(dkd_value_2, 11))} placeholder="05xx xxx xx xx" keyboardType="phone-pad" maxLength={11} />
                  </View>
                </View>

                <FieldLabel>Acil Durum Kişisi</FieldLabel>
                <FormInput value={applicationDraft.emergencyName} onChangeText={(dkd_value_2) => setDraftField('emergencyName', dkd_value_2)} placeholder="Yakın iletişim kişisi" maxLength={48} />

                <FieldLabel>Adres Bilgisi</FieldLabel>
                <FormInput value={applicationDraft.addressText} onChangeText={(dkd_value_2) => setDraftField('addressText', dkd_value_2)} placeholder="Mahalle, cadde, sokak ve ek açıklama" multiline maxLength={240} />

                <Text style={styles.docsSectionTitle}>Belge Yükleme</Text>
                <View style={styles.docGrid}>
                  <ImagePickTile label="Kimlik ön yüz" value={applicationDraft.identityFrontUri} onPick={() => chooseDoc('identityFrontUri')} />
                  <ImagePickTile label="Kimlik arka yüz" value={applicationDraft.identityBackUri} onPick={() => chooseDoc('identityBackUri')} optional />
                  <ImagePickTile label="Selfie / yüz doğrulama" value={applicationDraft.selfieUri} onPick={() => chooseDoc('selfieUri')} />
                  <ImagePickTile label="Ehliyet fotoğrafı" value={applicationDraft.driverLicenseUri} onPick={() => chooseDoc('driverLicenseUri')} />
                  <ImagePickTile label="Araç ruhsatı" value={applicationDraft.vehicleLicenseUri} onPick={() => chooseDoc('vehicleLicenseUri')} />
                  <ImagePickTile label="Sigorta / poliçe" value={applicationDraft.insuranceUri} onPick={() => chooseDoc('insuranceUri')} optional />
                </View>

                <Pressable disabled={applying || courierPending} onPress={handleApply} style={[styles.primaryAction, styles.applySubmitBtn, (applying || courierPending) && styles.actionDisabled]}>
                  <LinearGradient colors={['#40D8FF', '#2A8DFF', '#0E1840']} style={StyleSheet.absoluteFill} />
                  <Text style={styles.primaryActionText}>
                    {courierPending ? 'Başvuru incelemede' : applying ? 'Belgeler gönderiliyor…' : 'Kurye başvurusu yap'}
                  </Text>
                </Pressable>
              </View>
              </>
              )}
            </ScrollView>
          )}

          <CourierLevelUpModal visible={!!rewardModal} reward={rewardModal} onClose={() => setRewardModal(null)} />

          <DkdCargoPickupProofModal
            dkd_visible_value={!!dkd_pickup_modal_task_value}
            dkd_task_value={dkd_pickup_modal_task_value}
            dkd_photo_uri_value={dkd_pickup_modal_image_uri_value}
            dkd_busy_value={dkd_pickup_modal_busy_value}
            dkd_on_close_value={dkd_close_pickup_modal_value}
            dkd_on_capture_value={dkd_capture_pickup_modal_photo_value}
            dkd_on_confirm_value={dkd_confirm_pickup_modal_value}
          />

          <CourierProfileModal
            visible={profileVisible}
            onClose={() => setProfileVisible(false)}
            profile={profile}
          />

          <DkdCargoLiveMapModal
            dkd_visible_value={!!dkd_cargo_panel_task_value}
            dkd_is_courier_panel_value
            dkd_task_value={dkd_cargo_panel_task_value}
            dkd_current_location_value={currentLocation}
            dkd_vehicle_type_value={profile?.courier_vehicle_type || profile?.vehicle_type || profile?.courier_vehicle || null}
            dkd_refreshing_value={dkd_cargo_panel_refreshing_value}
            dkd_on_close_value={dkd_close_cargo_panel_value}
            dkd_on_refresh_value={dkd_refresh_cargo_panel_value}
          />
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05111D' },
  scrollContent: { paddingBottom: 36 },
  headerMiniChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(246,181,78,0.28)',
    backgroundColor: 'rgba(246,181,78,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  headerMiniChipBlue: {
    borderColor: 'rgba(103,227,255,0.24)',
    backgroundColor: 'rgba(103,227,255,0.10)',
  },
  headerMiniChipGreen: {
    borderColor: 'rgba(88,226,171,0.28)',
    backgroundColor: 'rgba(88,226,171,0.10)',
  },
  headerMiniChipText: { color: '#F7FBFF', fontSize: 13, fontWeight: '900' },
  headerMiniChipGold: {
    borderColor: 'rgba(246,181,78,0.24)',
    backgroundColor: 'rgba(246,181,78,0.14)',
  },
  dkdJobHeadActionColumn: {
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  dkdCargoTrackButton: {
    minHeight: 46,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(72,173,214,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(118,228,255,0.30)',
    shadowColor: '#59D7FF',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dkdCargoTrackButtonGlow: {
    position: 'absolute',
    right: -18,
    top: -14,
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dkdCargoTrackButtonIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dkdCargoTrackButtonText: {
    color: '#F2FBFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkdMiniMapActionWrap: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  dkdMiniMapActionChip: {
    minHeight: 42,
    minWidth: 170,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(129,213,255,0.20)',
    backgroundColor: 'rgba(8,18,31,0.90)',
    shadowColor: '#58E5C1',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dkdMiniMapActionChipGlow: {
    position: 'absolute',
    right: -12,
    top: -18,
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dkdMiniMapActionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  dkdMiniMapActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  dkdMiniMapActionChipText: {
    color: '#F4FCFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkdMiniMapActionChipSubText: {
    marginTop: 1,
    color: 'rgba(223,249,255,0.72)',
    fontSize: 9,
    fontWeight: '700',
  },
  dkdMiniMapActionSignalWrap: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkdMiniMapActionPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#7EF3C0',
    shadowColor: '#7EF3C0',
    shadowOpacity: 0.85,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  dkdCargoJobImage: {
    width: '100%',
    height: 148,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkdCargoProofCard: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(97,216,255,0.20)',
    backgroundColor: 'rgba(8,18,31,0.82)',
  },
  dkdCargoProofHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dkdCargoProofTitle: {
    color: '#F5FBFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkdCargoPickupProofImage: {
    width: '100%',
    height: 132,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkdPickupProofBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,10,18,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dkdPickupProofShell: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    backgroundColor: 'rgba(7,16,28,0.98)',
  },
  dkdPickupProofGlowA: {
    position: 'absolute',
    top: -36,
    right: -24,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(255,168,74,0.14)',
  },
  dkdPickupProofGlowB: {
    position: 'absolute',
    left: -24,
    bottom: -32,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(97,216,255,0.12)',
  },
  dkdPickupProofHead: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  dkdPickupProofIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFAE4A',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dkdPickupProofHeadCopy: {
    flex: 1,
  },
  dkdPickupProofEyebrow: {
    color: 'rgba(246,181,78,0.92)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  dkdPickupProofTitle: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  dkdPickupProofSubtitle: {
    marginTop: 6,
    color: 'rgba(231,241,255,0.76)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  dkdPickupProofInfoCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkdPickupProofInfoLabel: {
    color: 'rgba(188,241,255,0.76)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dkdPickupProofInfoValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dkdPickupProofInfoSub: {
    marginTop: 6,
    color: 'rgba(231,241,255,0.66)',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
  },
  dkdPickupProofCameraCard: {
    marginTop: 16,
    minHeight: 208,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  dkdPickupProofCameraTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dkdPickupProofCameraText: {
    color: 'rgba(231,241,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  dkdPickupProofPreviewWrap: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkdPickupProofPreviewImage: {
    width: '100%',
    height: 244,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkdPickupProofPreviewBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(99,241,177,0.92)',
  },
  dkdPickupProofPreviewBadgeText: {
    color: '#081119',
    fontSize: 11,
    fontWeight: '900',
  },
  dkdPickupProofActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  dkdPickupProofSecondaryAction: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkdPickupProofSecondaryActionText: {
    color: '#F3FBFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkdPickupProofPrimaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    minWidth: 148,
  },
  dkdPickupProofPrimaryActionText: {
    color: '#F7FBFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkdCargoPanelShell: {
    gap: 12,
    marginTop: 10,
  },
  dkdCargoPanelSegmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
  },
  dkdCargoPanelSegmentChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dkdCargoPanelSegmentChipActive: {
    backgroundColor: '#8CF2FF',
    borderColor: 'rgba(140,242,255,0.62)',
    shadowColor: '#67E8F9',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dkdCargoPanelSegmentText: {
    color: '#CFFBFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkdCargoPanelSegmentTextActive: {
    color: '#07131C',
  },
  dkdCenterTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  dkdCenterTabChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dkdCenterTabChipActive: {
    backgroundColor: 'rgba(86,223,255,0.16)',
    borderColor: 'rgba(86,223,255,0.28)',
  },
  dkdCenterTabChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dkdCenterTabIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkdCenterTabIconWrapCourierActive: {
    backgroundColor: 'rgba(83,216,255,0.20)',
    borderColor: 'rgba(83,216,255,0.34)',
  },
  dkdCenterTabIconWrapCargoActive: {
    backgroundColor: 'rgba(88,226,171,0.18)',
    borderColor: 'rgba(88,226,171,0.32)',
  },
  dkdCenterTabChipText: {
    color: 'rgba(231,241,255,0.78)',
    fontSize: 13,
    fontWeight: '900',
  },
  dkdCenterTabChipTextActive: {
    color: '#FFFFFF',
  },
  dkdCenterQuickGrid: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    marginTop: 14,
    marginHorizontal: 16,
  },
  dkdCenterQuickCardPressable: {
    flex: 1,
    minHeight: 132,
    borderRadius: 24,
  },
  dkdCenterQuickCard: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8,18,32,0.92)',
    shadowColor: '#09131F',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  dkdCenterQuickCardActive: {
    borderColor: 'rgba(108,255,212,0.30)',
    shadowColor: '#5DFFC7',
    shadowOpacity: 0.24,
    elevation: 9,
  },
  dkdCenterQuickCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  dkdCenterQuickIconShell: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#7EE1FF',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  dkdCenterQuickStatusChip: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkdCenterQuickStatusChipActive: {
    backgroundColor: 'rgba(108,255,212,0.16)',
    borderColor: 'rgba(108,255,212,0.26)',
  },
  dkdCenterQuickStatusText: {
    color: 'rgba(231,241,255,0.78)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dkdCenterQuickStatusTextActive: {
    color: '#FFFFFF',
  },
  dkdCenterQuickTextStack: {
    marginTop: 14,
    gap: 5,
  },
  dkdCenterQuickEyebrow: {
    color: 'rgba(188,241,255,0.78)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dkdCenterQuickTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  dkdCenterQuickSubtitle: {
    color: 'rgba(223,236,247,0.74)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkdUnlockedCenterCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dkdUnlockedCenterCardPressable: {
    flex: 1,
    flexBasis: '47%',
    minWidth: 148,
    minHeight: 132,
    borderRadius: 24,
  },
  dkdUnlockedCenterCard: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(9,18,32,0.94)',
    shadowColor: '#0A1320',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  dkdUnlockedCenterCardActive: {
    borderColor: 'rgba(108,255,212,0.30)',
    shadowColor: '#5DFFC7',
    shadowOpacity: 0.26,
    elevation: 9,
  },
  dkdUnlockedCenterCardApplicationActive: {
    borderColor: 'rgba(132,150,255,0.30)',
    shadowColor: '#7F8FFF',
    shadowOpacity: 0.24,
    elevation: 9,
  },
  dkdUnlockedCenterCardUrgentActive: {
    borderColor: 'rgba(255,213,95,0.34)',
    shadowColor: '#FFB84E',
    shadowOpacity: 0.25,
    elevation: 9,
  },
  dkdUnlockedCenterCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dkdUnlockedCenterIconShell: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#79DFFF',
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  dkdUnlockedCenterStatusChip: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkdUnlockedCenterStatusChipCargo: {
    backgroundColor: 'rgba(108,255,212,0.16)',
    borderColor: 'rgba(108,255,212,0.24)',
  },
  dkdUnlockedCenterStatusChipApplication: {
    backgroundColor: 'rgba(124,140,255,0.18)',
    borderColor: 'rgba(124,140,255,0.28)',
  },
  dkdUnlockedCenterStatusChipUrgent: {
    backgroundColor: 'rgba(255,213,95,0.18)',
    borderColor: 'rgba(255,213,95,0.30)',
  },
  dkdUnlockedCenterStatusText: {
    color: 'rgba(231,241,255,0.78)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dkdUnlockedCenterStatusTextActive: {
    color: '#FFFFFF',
  },
  dkdUnlockedCenterTextStack: {
    marginTop: 14,
    gap: 5,
  },
  dkdUnlockedCenterEyebrow: {
    color: 'rgba(188,241,255,0.78)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dkdUnlockedCenterTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  dkdUnlockedCenterSubtitle: {
    color: 'rgba(223,236,247,0.74)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkd_modern_center_tab_row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  dkd_modern_center_tab_pressable: {
    flex: 1,
    minHeight: 118,
    borderRadius: 24,
  },
  dkd_modern_center_tab_card: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8,18,32,0.92)',
    shadowColor: '#09131F',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
    overflow: 'hidden',
  },
  dkdOrderModeCardMotionLayer: {
    flex: 1,
    borderRadius: 24,
  },
  dkdOrderModeCardAura: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -18,
    borderRadius: 30,
    backgroundColor: 'rgba(97,167,255,0.10)',
    zIndex: 1,
  },
  dkdOrderModeCardOutline: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(130,220,255,0.28)',
    zIndex: 2,
  },
  dkdOrderModeCardScanWrap: {
    position: 'absolute',
    top: -24,
    left: -120,
    width: 110,
    height: 220,
    zIndex: 2,
  },
  dkdOrderModeCardScanBand: {
    flex: 1,
    transform: [{ rotate: '18deg' }],
  },
  dkdOrderModeCardIconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkdOrderModeCardIconHalo: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(106,160,255,0.26)',
  },
  dkd_modern_center_tab_card_courier_active: {
    borderColor: 'rgba(110,220,255,0.34)',
    shadowColor: '#67DBFF',
    shadowOpacity: 0.28,
    elevation: 9,
  },
  dkd_modern_center_tab_card_cargo_active: {
    borderColor: 'rgba(108,255,212,0.30)',
    shadowColor: '#5DFFC7',
    shadowOpacity: 0.26,
    elevation: 9,
  },
  dkd_modern_center_tab_card_top_row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dkd_modern_center_tab_icon_shell: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#79DFFF',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  dkd_modern_center_tab_status_chip: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkd_modern_center_tab_status_chip_courier_active: {
    backgroundColor: 'rgba(104,231,255,0.18)',
    borderColor: 'rgba(104,231,255,0.28)',
  },
  dkd_modern_center_tab_status_chip_cargo_active: {
    backgroundColor: 'rgba(108,255,212,0.16)',
    borderColor: 'rgba(108,255,212,0.24)',
  },
  dkd_modern_center_tab_status_text: {
    color: 'rgba(231,241,255,0.74)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dkd_modern_center_tab_status_text_active: {
    color: '#FFFFFF',
  },
  dkd_modern_center_tab_text_stack: {
    marginTop: 14,
    gap: 5,
  },
  dkd_modern_center_tab_eyebrow: {
    color: 'rgba(174,241,255,0.78)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dkd_modern_center_tab_title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 23,
  },
  dkd_modern_center_tab_title_active: {
    color: '#FFFFFF',
  },
  dkd_modern_center_tab_subtitle: {
    color: 'rgba(223,236,247,0.74)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkdQueueSourcePanel: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 14,
  },
  dkdQueueSourcePanelSubtext: {
    marginTop: 8,
    color: 'rgba(223,236,247,0.72)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  dkdQueueSourceCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dkdQueueSourceCardPressable: {
    flex: 1,
    borderRadius: 22,
  },
  dkdQueueSourceCard: {
    minHeight: 168,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(8,18,32,0.92)',
    shadowColor: '#09131F',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  dkdQueueSourceCardBusinessActive: {
    borderColor: 'rgba(113,232,255,0.30)',
    shadowColor: '#67DBFF',
    shadowOpacity: 0.24,
  },
  dkdQueueSourceCardCargoActive: {
    borderColor: 'rgba(121,255,226,0.30)',
    shadowColor: '#62F4C9',
    shadowOpacity: 0.24,
  },
  dkdQueueSourceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dkdQueueSourceIconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dkdQueueSourceEyebrow: {
    marginTop: 14,
    color: 'rgba(174,241,255,0.78)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  dkdQueueSourceTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  dkdQueueSourceText: {
    marginTop: 6,
    color: 'rgba(223,236,247,0.74)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkdQueueSourceStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dkdQueueSourceStatPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dkdQueueSourceStatText: {
    color: '#F3FAFF',
    fontSize: 11,
    fontWeight: '900',
  },
  queuePanelCompact: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 14,
  },
  queuePanelCompactHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  queueTitle: { color: dkd_colors.text, fontSize: 17, fontWeight: '900' },
  dkd_center_hero_title: {
    fontSize: 21,
    lineHeight: 27,
  },
  queueCompactMeta: { color: dkd_colors.textMuted, fontSize: 12, fontWeight: '800' },
  queueFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  queueFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  queueFilterChipActive: {
    borderColor: 'rgba(103,227,255,0.28)',
    backgroundColor: 'rgba(103,227,255,0.14)',
  },
  queueFilterChipText: { color: dkd_colors.textSoft, fontSize: 12, fontWeight: '900' },
  queueFilterChipTextActive: { color: '#E9FBFF' },
  loaderWrap: { paddingVertical: 24 },
  dkdAnimatedJobCardShell: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  jobCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(116,226,255,0.14)',
    backgroundColor: 'rgba(10,18,31,0.92)',
    shadowColor: '#0A1420',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  jobFill: { padding: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  cardGlowA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(103,227,255,0.10)',
    right: -40,
    top: -40,
  },
  cardGlowB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(246,181,78,0.08)',
    left: -32,
    bottom: -32,
  },
  dkdJobCardAura: {
    position: 'absolute',
    inset: -1,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(116,226,255,0.26)',
    backgroundColor: 'rgba(93,171,255,0.05)',
  },
  dkdJobCardShineWrap: {
    position: 'absolute',
    top: -26,
    bottom: -26,
    width: 120,
    zIndex: 1,
    opacity: 0.75,
    pointerEvents: 'none',
  },
  dkdJobCardShine: {
    flex: 1,
    width: 120,
    transform: [{ rotate: '18deg' }],
  },
  jobTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dkdJobHeadMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 8 },
  dkdJobIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(83,216,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(83,216,255,0.26)',
  },
  dkdJobHeadCopy: { flex: 1, minWidth: 0 },
  dkdJobHeadSub: { color: 'rgba(220,238,255,0.62)', fontSize: 11, fontWeight: '800', marginTop: 4, letterSpacing: 0.2 },
  dkdJobInfoPanel: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(117,226,255,0.12)',
    backgroundColor: 'rgba(5,12,22,0.58)',
    padding: 12,
    gap: 10,
  },
  dkdInfoLineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dkdInfoLineIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dkdInfoLineCopy: { flex: 1, minWidth: 0 },
  dkdInfoLineLabel: { color: 'rgba(213,228,241,0.58)', fontSize: 10, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  dkdInfoLineValue: { color: dkd_colors.text, fontSize: 13, lineHeight: 20, fontWeight: '800', marginTop: 3 },
  jobTitle: { color: dkd_colors.text, fontSize: 18, fontWeight: '900' },
  jobInfo: { color: dkd_colors.textSoft, fontSize: 12, marginTop: 6, lineHeight: 18, fontWeight: '700' },
  dkdPhoneCallChip: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(85,216,255,0.22)',
    backgroundColor: 'rgba(85,216,255,0.10)',
  },
  dkdPhoneCallChipText: {
    color: '#EAF8FF',
    fontSize: 11,
    fontWeight: '900',
  },
  statePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statePillOpen: { borderColor: 'rgba(103,227,255,0.24)' },
  statePillActive: { borderColor: 'rgba(246,181,78,0.24)' },
  statePillDone: { borderColor: 'rgba(88,226,171,0.30)' },
  statePillText: { color: dkd_colors.text, fontSize: 12, fontWeight: '900' },
  phaseStripCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(9,16,27,0.56)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phaseStepModern: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseStepActiveModern: {
    borderColor: 'rgba(88,226,171,0.22)',
    backgroundColor: 'rgba(88,226,171,0.14)',
  },
  phaseStepDoneModern: {
    borderColor: 'rgba(88,226,171,0.24)',
    backgroundColor: 'rgba(88,226,171,0.18)',
  },
  phaseStepDoneModernBlue: {
    borderColor: 'rgba(103,227,255,0.26)',
    backgroundColor: 'rgba(103,227,255,0.16)',
  },
  dkd_phase_step_icon_shell: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dkd_phase_step_icon_shell_idle: {
    borderColor: 'rgba(123,231,255,0.24)',
    backgroundColor: 'rgba(69,140,182,0.18)',
  },
  dkd_phase_step_icon_shell_done: {
    borderColor: 'rgba(121,247,191,0.34)',
    backgroundColor: 'rgba(56,179,131,0.28)',
  },
  dkd_phase_step_icon_shell_delivery_ready: {
    borderColor: 'rgba(104,227,255,0.34)',
    backgroundColor: 'rgba(52,143,198,0.28)',
  },
  dkd_phase_step_icon_shell_delivery_done: {
    borderColor: 'rgba(130,218,255,0.34)',
    backgroundColor: 'rgba(73,146,235,0.28)',
  },
  phaseStepModernText: { color: '#EAFBFF', fontSize: 12, fontWeight: '900', flex: 1 },
  phaseStepDoneModernText: { color: '#EAFBFF' },
  phaseDividerModern: {
    width: 8,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  miniMapWrap: {
    height: 118,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(6,13,22,0.55)',
  },
  miniMapFallback: {
    minHeight: 84,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(6,13,22,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  miniMapFallbackText: { color: dkd_colors.textSoft, textAlign: 'center', fontWeight: '700' },
  completedRouteCard: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(6,13,22,0.55)',
    padding: 14,
    gap: 10,
  },
  completedRouteChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(83,216,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(83,216,255,0.24)',
  },
  completedRouteChipText: {
    color: '#EAFBFF',
    fontSize: 12,
    fontWeight: '900',
  },
  completedRouteTitle: {
    color: dkd_colors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 22,
  },
  completedRouteHint: {
    color: dkd_colors.textSoft,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '700',
  },
  miniMapBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(6,17,26,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniMapBadgeText: { color: '#DFF9FF', fontSize: 11, fontWeight: '900' },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  dkdStatTileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dkdStatTileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statTile: {
    flexBasis: '48%',
    maxWidth: '48%',
    minHeight: 90,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(7,12,22,0.68)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statTileLabel: {
    color: dkd_colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statTileValue: { color: dkd_colors.text, fontSize: 18, fontWeight: '900', marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  dkdPrimaryActionInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryAction: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: { color: dkd_colors.text, fontSize: 16, fontWeight: '900' },
  primaryAction: {
    flex: 1.4,
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { color: '#F7FBFF', fontSize: 16, fontWeight: '900' },
  actionDisabled: { opacity: 0.58 },
  emptyWrap: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 22,
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  emptyTitle: { color: dkd_colors.text, fontSize: 18, fontWeight: '900' },
  emptyText: { color: dkd_colors.textSoft, textAlign: 'center', lineHeight: 19 },
  applyShell: { flexGrow: 1, paddingBottom: 40 },
  applyCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
  },
  applyTitle: { color: dkd_colors.text, fontSize: 18, fontWeight: '900' },
  applyText: { color: dkd_colors.textSoft, lineHeight: 20, marginTop: 8 },

  applyHeroText: {
    color: dkd_colors.textSoft,
    lineHeight: 20,
    fontWeight: '700',
  },
  heroXpPanel: {
    marginTop: 2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  heroXpTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroXpLabel: {
    color: '#F8FCFF',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  heroXpLevel: {
    color: '#F8FCFF',
    fontSize: 14,
    fontWeight: '900',
  },
  heroXpTrack: {
    marginTop: 12,
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroXpFill: {
    height: '100%',
    borderRadius: 999,
  },
  heroXpMeta: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  heroXpRewardLine: {
    color: '#F8FCFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  dkdHeroLicenseWalletRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  heroLicenseChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(82,242,161,0.28)',
    backgroundColor: 'rgba(82,242,161,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  heroLicenseChipText: {
    color: '#DFFBF0',
    fontSize: 12,
    fontWeight: '900',
  },
  dkdHeroWalletSummary: {
    minWidth: 122,
    maxWidth: 136,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#52E9B3',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dkdHeroWalletSummaryShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,255,212,0.16)',
    backgroundColor: 'rgba(6,28,20,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dkdHeroWalletIconShell: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkdHeroWalletTextWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  dkdHeroWalletSummaryLabel: {
    color: 'rgba(205,255,230,0.82)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dkdHeroWalletSummaryValue: {
    color: '#75FFD0',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  formCol: {
    flex: 1,
  },
  fieldLabel: {
    color: '#F7FBFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 8,
  },
  fieldRequired: {
    color: '#63F1B1',
  },
  formInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(8,15,26,0.70)',
    color: '#F7FBFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  formInputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  zoneChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  zoneChipActive: {
    borderColor: 'rgba(103,227,255,0.28)',
    backgroundColor: 'rgba(103,227,255,0.14)',
  },
  zoneChipText: {
    color: dkd_colors.textSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  zoneChipTextActive: {
    color: '#E9FBFF',
  },
  docsSectionTitle: {
    color: '#F7FBFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 12,
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docTile: {
    width: '48%',
    minHeight: 148,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,18,30,0.74)',
    overflow: 'hidden',
  },
  docImage: {
    ...StyleSheet.absoluteFillObject,
  },
  docOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(6,12,20,0.28)',
    gap: 6,
  },
  docTitle: {
    color: '#F7FBFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  docSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  applySubmitBtn: {
    marginTop: 18,
  },
  rewardBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,14,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  rewardShell: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 22,
    overflow: 'hidden',
    alignItems: 'center',
  },
  rewardRing: {
    position: 'absolute',
    top: -44,
    right: -44,
    width: 180,
    height: 180,
    borderRadius: 999,
    opacity: 0.28,
  },
  rewardBadge: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: '#F4D27A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  rewardEyebrow: {
    marginTop: 16,
    color: '#A7EEFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  rewardTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  rewardSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  rewardGrid: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  rewardStatCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardStatCardGold: {
    borderColor: 'rgba(246,181,78,0.24)',
    backgroundColor: 'rgba(246,181,78,0.12)',
  },
  rewardStatCardPurple: {
    borderColor: 'rgba(181,140,255,0.24)',
    backgroundColor: 'rgba(181,140,255,0.12)',
  },
  rewardStatCardBlue: {
    borderColor: 'rgba(103,227,255,0.24)',
    backgroundColor: 'rgba(103,227,255,0.12)',
  },
  rewardStatLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  rewardStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  rewardCloseBtn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  rewardCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

});
