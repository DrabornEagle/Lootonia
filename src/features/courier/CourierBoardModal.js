import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StatusBar, InteractionManager, StyleSheet, Text, TextInput, View } from 'react-native';
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
  dkd_peek_cached_courier_jobs_value,
  dkd_subscribe_courier_jobs_live_updates_value,
  dkd_reject_courier_job,
  dkd_set_courier_online_status,
  markCourierJobPickedUp
} from '../../services/courierService';
import { awardProfileXp } from '../../services/profileService';
import { submitCourierApplication } from '../../services/courierApplicationService';
import { deleteAdminCourierJob } from '../../services/adminService';
import { resolveUnifiedWalletTl } from '../../services/walletService';
import { supabase } from '../../lib/supabase';
import CourierProfileModal from './CourierProfileModal';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import { cityLootTheme } from '../../theme/cityLootTheme';
import DkdCargoSenderPanel from './dkd_cargo_sender_panel';
import DkdCargoLiveMapModal from './dkd_cargo_live_map_modal';
import DkdUrgentCourierPanel from './dkd_urgent_courier_panel';
import { dkd_upload_cargo_package_art, dkd_upsert_courier_live_location } from '../../services/dkd_cargo_service';
import { dkd_fetch_mapbox_geocoding_place_value } from '../../services/dkd_mapbox_route_service';
import { dkd_fetch_logistics_jobs_value } from '../../services/dkd_logistics_service';
import DkdLogisticsModal from '../logistics/dkd_logistics_modal';

const dkd_colors = cityLootTheme.colors;
const GEOCODE_HINT = 'Türkiye';

const ANKARA_ZONES = ['Çankaya', 'Etimesgut', 'Eryaman', 'Yenimahalle', 'Keçiören', 'Sincan', 'Mamak', 'Gölbaşı', 'Pursaklar', 'Altındağ'];
const dkd_courier_region_presets_value = {
  Türkiye: {
    Ankara: ANKARA_ZONES,
    İstanbul: ['Kadıköy', 'Beşiktaş', 'Şişli', 'Üsküdar', 'Bakırköy', 'Ataşehir', 'Maltepe', 'Beylikdüzü'],
    İzmir: ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Balçova', 'Gaziemir'],
  },
  BAE: {
    Dubai: ['Downtown', 'Business Bay', 'Dubai Marina', 'Jumeirah', 'Deira', 'Al Barsha'],
    AbuDhabi: ['Corniche', 'Yas Island', 'Khalifa City', 'Al Reem'],
  },
  USA: {
    'New York': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
    'Los Angeles': ['Hollywood', 'Downtown LA', 'Santa Monica', 'Beverly Hills', 'Venice'],
    Miami: ['Downtown Miami', 'Brickell', 'Wynwood', 'Miami Beach', 'Doral'],
    Chicago: ['Loop', 'River North', 'Lincoln Park', 'Hyde Park', 'West Loop'],
    Houston: ['Downtown Houston', 'Midtown', 'Galleria', 'Montrose', 'Energy Corridor'],
  },
};
const dkd_courier_country_options_value = Object.keys(dkd_courier_region_presets_value);
function dkd_courier_city_options_value(dkd_country_value) {
  return Object.keys(dkd_courier_region_presets_value?.[dkd_country_value] || dkd_courier_region_presets_value['Türkiye']);
}
function dkd_courier_zone_options_value(dkd_country_value, dkd_city_value) {
  return dkd_courier_region_presets_value?.[dkd_country_value]?.[dkd_city_value] || [];
}
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
  const dkd_country_value = String(profile?.dkd_country || profile?.courier_profile_meta?.dkd_country || 'Türkiye').trim() || 'Türkiye';
  const dkd_city_options_value = dkd_courier_city_options_value(dkd_country_value);
  const dkd_city_value = String(profile?.dkd_city || profile?.courier_city || dkd_city_options_value?.[0] || 'Ankara').trim() || 'Ankara';
  const dkd_zone_options_value = dkd_courier_zone_options_value(dkd_country_value, dkd_city_value);
  const dkd_region_value = String(profile?.dkd_region || profile?.courier_zone || profile?.courier_profile_meta?.zone || dkd_zone_options_value?.[0] || '').trim();
  return {
    firstName: '',
    lastName: '',
    nationalId: '',
    phone: '',
    email: '',
    country: dkd_country_value,
    city: dkd_city_value,
    zone: dkd_region_value,
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
  const dkd_country_value = String(profile?.dkd_country || profile?.courier_profile_meta?.dkd_country || 'Türkiye').trim() || 'Türkiye';
  const dkd_city_value = String(profile?.dkd_city || profile?.courier_city || 'Ankara').trim() || 'Ankara';
  const dkd_region_value = String(profile?.dkd_region || profile?.courier_zone || profile?.courier_profile_meta?.zone || '').trim();
  return dkd_region_value ? `${dkd_country_value} / ${dkd_city_value} / ${dkd_region_value}` : `${dkd_country_value} / ${dkd_city_value}`;
}

function appRequiredReady(form) {
  return !!(
    String(form?.firstName || '').trim() &&
    String(form?.lastName || '').trim() &&
    String(form?.nationalId || '').replace(/\D/g, '').length === 11 &&
    String(form?.phone || '').trim().length >= 10 &&
    String(form?.country || '').trim() &&
    String(form?.city || '').trim() &&
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

function dkd_task_meta_object_value(dkd_task_value) {
  const dkd_meta_value = dkd_task_value?.cargo_meta || dkd_task_value?.meta || dkd_task_value?.snapshot || null;
  return dkd_meta_value && typeof dkd_meta_value === 'object' ? dkd_meta_value : {};
}

function dkd_is_urgent_courier_task_value(dkd_task_value) {
  const dkd_meta_value = dkd_task_meta_object_value(dkd_task_value);
  const dkd_job_type_value = String(dkd_task_value?.job_type || dkd_task_value?.type || dkd_meta_value?.job_type || dkd_meta_value?.dkd_job_type || '').trim().toLowerCase();
  const dkd_title_value = String(dkd_task_value?.title || dkd_task_value?.merchant_name || dkd_meta_value?.title || '').trim().toLocaleLowerCase('tr-TR');
  return ['urgent', 'urgent_courier', 'acil', 'acil_kurye', 'dkd_urgent', 'dkd_urgent_courier'].includes(dkd_job_type_value)
    || Boolean(dkd_task_value?.dkd_urgent_order_id || dkd_task_value?.urgent_order_id || dkd_meta_value?.dkd_urgent_order_id || dkd_meta_value?.urgent_order_id)
    || dkd_title_value.includes('acil kurye')
    || dkd_title_value.includes('acil market');
}

function dkd_is_business_task(dkd_task_value) {
  return !dkd_is_cargo_task(dkd_task_value) && !dkd_is_urgent_courier_task_value(dkd_task_value);
}

function dkd_logistics_job_status_key_value(dkd_status_value) {
  return String(dkd_status_value || 'open').toLowerCase().trim();
}

function dkd_is_logistics_job_active_value(dkd_job_value) {
  const dkd_status_key_value = dkd_logistics_job_status_key_value(dkd_job_value?.dkd_status || dkd_job_value?.status);
  return !['completed', 'cancelled', 'canceled', 'done', 'finished', 'tamamlandı', 'iptal'].includes(dkd_status_key_value);
}

function dkd_logistics_job_status_label_value(dkd_status_value) {
  const dkd_status_key_value = dkd_logistics_job_status_key_value(dkd_status_value);
  if (['completed', 'done', 'finished', 'tamamlandı'].includes(dkd_status_key_value)) return 'Tamamlandı';
  if (['cancelled', 'canceled', 'iptal'].includes(dkd_status_key_value)) return 'İptal';
  if (['accepted', 'assigned', 'active', 'in_progress'].includes(dkd_status_key_value)) return 'Aktif';
  return 'Açık';
}

function dkd_logistics_budget_text_value(dkd_job_value) {
  const dkd_min_budget_value = Number(dkd_job_value?.dkd_budget_min_tl || 0);
  const dkd_max_budget_value = Number(dkd_job_value?.dkd_budget_max_tl || 0);
  const dkd_format_budget_value = (dkd_amount_value) => Number(dkd_amount_value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  if (dkd_min_budget_value > 0 && dkd_max_budget_value > 0) return `${dkd_format_budget_value(dkd_min_budget_value)}-${dkd_format_budget_value(dkd_max_budget_value)} TL`;
  if (dkd_max_budget_value > 0) return `${dkd_format_budget_value(dkd_max_budget_value)} TL`;
  if (dkd_min_budget_value > 0) return `${dkd_format_budget_value(dkd_min_budget_value)} TL+`;
  return 'Teklif bekleniyor';
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

function jobPhase(task) {
  const status = String(task?.status || 'open').toLowerCase();
  const pickupStatus = String(task?.pickup_status || 'pending').toLowerCase();
  if (status === 'cancelled' || status === 'canceled' || pickupStatus === 'cancelled' || pickupStatus === 'canceled') return 'cancelled';
  if (status === 'completed' || pickupStatus === 'delivered') return 'completed';
  if (status === 'picked_up' || status === 'to_customer' || status === 'delivering' || pickupStatus === 'picked_up') return 'to_customer';
  if (['dkd_auto_assigned', 'dkd_assigned_offer', 'assigned_offer', 'auto_assigned', 'courier_offer'].includes(status)) return 'dkd_assigned_offer';
  if (status === 'accepted' || status === 'assigned' || status === 'to_business') return 'to_business';
  return 'open';
}

function dkd_pick_first_text_value(dkd_values) {
  for (const dkd_value of Array.isArray(dkd_values) ? dkd_values : []) {
    const dkd_text_value = normalizeAddressText(dkd_value);
    if (dkd_text_value) return dkd_text_value;
  }
  return '';
}

function pickupAddressForTask(task) {
  if (!dkd_is_cargo_task(task)) {
    const dkd_meta_value = dkd_task_meta_object_value(task);
    return dkd_pick_first_text_value([
      task?.dkd_businesses?.address_text,
      task?.business?.address_text,
      task?.merchant?.address_text,
      dkd_meta_value?.dkd_business_address_text,
      dkd_meta_value?.business_panel_address_text,
      dkd_meta_value?.business_address_text,
      dkd_meta_value?.merchant_address_text,
      task?.business_address_text,
      task?.merchant_address_text,
      task?.business_address,
      task?.merchant_address,
      task?.pickup_address_text,
      task?.sender_address_text,
      dkd_meta_value?.pickup_address_text,
      dkd_meta_value?.sender_address_text,
      task?.pickup,
      dkd_meta_value?.pickup,
      'İşletme teslim alma noktası',
    ]);
  }
  return normalizeAddressText(task?.pickup || task?.pickup_address_text || task?.customer_full_name || 'Müşteri alım noktası');
}

function dropoffAddressForTask(task) {
  if (!dkd_is_cargo_task(task)) {
    const dkd_meta_value = dkd_task_meta_object_value(task);
    return dkd_pick_first_text_value([
      task?.business_product_order?.delivery_address_text,
      task?.order?.delivery_address_text,
      dkd_meta_value?.dkd_customer_delivery_address_text,
      dkd_meta_value?.customer_delivery_address_text,
      dkd_meta_value?.order_delivery_address_text,
      dkd_meta_value?.delivery_address_text,
      dkd_meta_value?.dropoff_address_text,
      dkd_meta_value?.customer_address_text,
      dkd_meta_value?.delivery_address,
      task?.delivery_address_text,
      task?.dropoff_address_text,
      task?.delivery_address,
      task?.customer_address_text,
      task?.dropoff,
      dkd_meta_value?.dropoff,
      'Teslimat adresi',
    ]);
  }
  return normalizeAddressText(task?.dropoff || task?.delivery_address_text || 'Teslimat adresi');
}

function dkd_business_pickup_coord_for_board_value(task) {
  const dkd_meta_value = dkd_task_meta_object_value(task);
  const dkd_business_location_value = task?.business_location && typeof task.business_location === 'object' ? task.business_location : {};
  const dkd_meta_business_location_value = dkd_meta_value?.business_location && typeof dkd_meta_value.business_location === 'object' ? dkd_meta_value.business_location : {};
  return coordPair(task?.business_lat, task?.business_lng)
    || coordPair(task?.merchant_lat, task?.merchant_lng)
    || coordPair(task?.store_lat, task?.store_lng)
    || coordPair(dkd_business_location_value?.lat ?? dkd_business_location_value?.latitude, dkd_business_location_value?.lng ?? dkd_business_location_value?.longitude)
    || coordPair(dkd_meta_value?.business_lat ?? dkd_meta_value?.merchant_lat, dkd_meta_value?.business_lng ?? dkd_meta_value?.merchant_lng)
    || coordPair(dkd_meta_business_location_value?.lat ?? dkd_meta_business_location_value?.latitude, dkd_meta_business_location_value?.lng ?? dkd_meta_business_location_value?.longitude)
    || coordPair(task?.pickup_lat, task?.pickup_lng)
    || coordPair(dkd_meta_value?.pickup_lat, dkd_meta_value?.pickup_lng);
}

function dkd_business_dropoff_coord_for_board_value(task) {
  const dkd_meta_value = dkd_task_meta_object_value(task);
  const dkd_delivery_location_value = task?.delivery_location && typeof task.delivery_location === 'object' ? task.delivery_location : {};
  const dkd_meta_delivery_location_value = dkd_meta_value?.delivery_location && typeof dkd_meta_value.delivery_location === 'object' ? dkd_meta_value.delivery_location : {};
  return coordPair(task?.dropoff_lat, task?.dropoff_lng)
    || coordPair(dkd_meta_value?.dropoff_lat, dkd_meta_value?.dropoff_lng)
    || coordPair(task?.delivery_lat, task?.delivery_lng)
    || coordPair(task?.customer_lat, task?.customer_lng)
    || coordPair(task?.destination_lat, task?.destination_lng)
    || coordPair(dkd_delivery_location_value?.lat ?? dkd_delivery_location_value?.latitude, dkd_delivery_location_value?.lng ?? dkd_delivery_location_value?.longitude)
    || coordPair(dkd_meta_value?.delivery_lat ?? dkd_meta_value?.customer_lat, dkd_meta_value?.delivery_lng ?? dkd_meta_value?.customer_lng)
    || coordPair(dkd_meta_delivery_location_value?.lat ?? dkd_meta_delivery_location_value?.latitude, dkd_meta_delivery_location_value?.lng ?? dkd_meta_delivery_location_value?.longitude);
}

function geocodeKeyForTask(task, phase) {
  return `${phase}:${phase === 'to_customer' || phase === 'completed' ? dropoffAddressForTask(task) : pickupAddressForTask(task)}`;
}

function targetMeta(task, geocodeCache = {}) {
  const phase = jobPhase(task);
  const cacheKey = geocodeKeyForTask(task, phase);
  const cached = geocodeCache?.[cacheKey] || null;
  if (phase === 'completed') {
    const dkd_cached_point_value = coordPair(cached?.lat, cached?.lng);
    const dkd_dropoff_address_value = dropoffAddressForTask(task);
    const dkd_has_written_dropoff_value = Boolean(dkd_dropoff_address_value && dkd_dropoff_address_value !== 'Teslimat adresi');
    const dkd_business_dropoff_point_value = dkd_business_dropoff_coord_for_board_value(task);
    const target = dkd_is_cargo_task(task)
      ? (coordPair(task?.dropoff_lat, task?.dropoff_lng) || dkd_cached_point_value)
      : (dkd_has_written_dropoff_value ? (dkd_cached_point_value || dkd_business_dropoff_point_value) : (dkd_business_dropoff_point_value || dkd_cached_point_value));
    return {
      title: 'Sipariş Tamamlandı',
      address: dkd_dropoff_address_value,
      lat: target?.lat ?? null,
      lng: target?.lng ?? null,
    };
  }
  if (phase === 'to_customer') {
    const dkd_cached_point_value = coordPair(cached?.lat, cached?.lng);
    const dkd_dropoff_address_value = dropoffAddressForTask(task);
    const dkd_has_written_dropoff_value = Boolean(dkd_dropoff_address_value && dkd_dropoff_address_value !== 'Teslimat adresi');
    const dkd_business_dropoff_point_value = dkd_business_dropoff_coord_for_board_value(task);
    const target = dkd_is_cargo_task(task)
      ? (coordPair(task?.dropoff_lat, task?.dropoff_lng) || dkd_cached_point_value)
      : (dkd_has_written_dropoff_value ? (dkd_cached_point_value || dkd_business_dropoff_point_value) : (dkd_business_dropoff_point_value || dkd_cached_point_value));
    return {
      title: dkd_is_cargo_task(task) ? 'Teslimata gidiliyor' : 'Müşteriye gidiliyor',
      address: dkd_dropoff_address_value,
      lat: target?.lat ?? null,
      lng: target?.lng ?? null,
    };
  }
  const dkd_cached_point_value = coordPair(cached?.lat, cached?.lng);
  const dkd_pickup_address_value = pickupAddressForTask(task);
  const dkd_has_written_pickup_value = Boolean(dkd_pickup_address_value && dkd_pickup_address_value !== 'İşletme teslim alma noktası');
  const dkd_business_pickup_point_value = dkd_business_pickup_coord_for_board_value(task);
  const target = dkd_is_cargo_task(task)
    ? (coordPair(task?.pickup_lat, task?.pickup_lng) || dkd_cached_point_value)
    : (dkd_has_written_pickup_value ? (dkd_cached_point_value || dkd_business_pickup_point_value) : (dkd_business_pickup_point_value || dkd_cached_point_value));
  return {
    title: dkd_is_cargo_task(task) ? 'Göndericiye gidiliyor' : 'İşletmeye gidiliyor',
    address: dkd_pickup_address_value,
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
  if (phase === 'cancelled') return 'İptal';
  if (phase === 'completed') return 'Tamamlandı';
  if (phase === 'to_customer') return dkd_is_cargo_task(task) ? 'Teslimata gidiliyor' : 'Yolda';
  if (phase === 'to_business') return dkd_is_cargo_task(task) ? 'Göndericiye gidiliyor' : 'İşletmeye gidiliyor';
  if (phase === 'dkd_assigned_offer') return 'Sana Atandı';
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
  if (phase === 'dkd_assigned_offer') return 'Siparişi Kabul Et';
  if (phase === 'open') return 'Görevi Kabul Et';
  if (phase === 'to_business') return 'Ürünü teslim aldım';
  if (phase === 'to_customer') return 'Teslim Edildi';
  return 'Tamamlandı';
}


function dkd_phase_rank(task) {
  const dkd_phase_value = jobPhase(task);
  if (dkd_phase_value === 'cancelled') return 4;
  if (dkd_phase_value === 'completed') return 3;
  if (dkd_phase_value === 'to_customer') return 2;
  if (dkd_phase_value === 'to_business') return 1;
  if (dkd_phase_value === 'dkd_assigned_offer') return 0;
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


function DkdMiniMapPulseChip({ dkd_label_value = 'Kurye Paneli', dkd_sub_label_value = 'Canlı takibi aç' }) {
  const dkd_pulse_anim_value = useRef(new Animated.Value(1)).current;
  const dkd_has_sub_label_value = String(dkd_sub_label_value || '').trim().length > 0;

  useEffect(() => {
    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
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
        !dkd_has_sub_label_value && styles.dkdMiniMapActionChipCompact,
        {
          opacity: dkd_opacity_value,
          transform: [{ scale: dkd_scale_value }],
        },
      ]}
    >
      <LinearGradient colors={['rgba(15,25,39,0.96)', 'rgba(8,16,28,0.92)']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(88,229,193,0.20)', 'rgba(114,186,255,0.16)', 'rgba(170,124,255,0.14)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={StyleSheet.absoluteFill} />
      <View style={styles.dkdMiniMapActionChipGlow} />
      <View style={[styles.dkdMiniMapActionIconWrap, !dkd_has_sub_label_value && styles.dkdMiniMapActionIconWrapCompact]}>
        <MaterialCommunityIcons name="cursor-default-click-outline" size={dkd_has_sub_label_value ? 14 : 12} color="#F5FDFF" />
      </View>
      <View style={styles.dkdMiniMapActionCopy}>
        <Text numberOfLines={1} style={[styles.dkdMiniMapActionChipText, !dkd_has_sub_label_value && styles.dkdMiniMapActionChipTextCompact]}>{dkd_label_value}</Text>
        {dkd_has_sub_label_value ? <Text style={styles.dkdMiniMapActionChipSubText}>{dkd_sub_label_value}</Text> : null}
      </View>
      <View style={styles.dkdMiniMapActionSignalWrap}>
        <View style={styles.dkdMiniMapActionPulseDot} />
      </View>
      <MaterialCommunityIcons name="arrow-top-right" size={14} color="#F5FDFF" />
    </Animated.View>
  );
}

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
      {dkd_show_open_chip_value ? (
        <View style={styles.dkdMiniMapActionWrap}>
          <DkdMiniMapPulseChip dkd_label_value={dkd_open_chip_text_value} dkd_sub_label_value={dkd_is_cargo_preview_value ? 'Canlı takibi aç' : ''} />
        </View>
      ) : null}
    </DkdPreviewShell>
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
      <Text style={styles.completedRouteHint}>Mini harita biten görevlerde kapalı kalır. Kabul ve aktif teslimat aşamalarında harita görünür.</Text>
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


function DkdCourierOnlineControl({
  dkd_online_value,
  dkd_busy_value,
  dkd_on_toggle_value,
  dkd_assigned_job_id_value,
  dkd_has_active_delivery_value = false,
  dkd_profile_panel_node_value = null,
  dkd_force_details_open_value = false,
}) {
  const dkd_motion_value = useRef(new Animated.Value(0)).current;
  const [dkd_details_open_value, dkd_set_details_open_value] = useState(false);
  const dkd_button_title_value = dkd_has_active_delivery_value ? 'TESLİMAT BEKLENİYOR' : dkd_online_value ? 'ÇEVRİMDIŞI OL' : 'ÇEVRİMİÇİ OL';
  const dkd_button_subtitle_value = dkd_has_active_delivery_value ? 'Sipariş tamamlanınca arama otomatik devam eder' : dkd_online_value ? 'Sipariş aramasını kapat' : 'Kayıtlı bölgemde aramayı başlat';
  const dkd_status_label_value = dkd_has_active_delivery_value ? 'TESLİMATTA' : dkd_online_value ? 'ÇEVRİMİÇİ' : 'ÇEVRİMDIŞI';
  const dkd_status_subtitle_value = dkd_has_active_delivery_value ? 'Aktif sipariş teslim edilene kadar yeni arama kapalı' : dkd_online_value ? 'Canlı kurye hattı açık' : 'Kurye hattı kapalı';
  const dkd_status_icon_value = dkd_has_active_delivery_value ? 'truck-delivery-outline' : dkd_online_value ? 'bike-fast' : 'power-sleep';
  const dkd_action_icon_value = dkd_has_active_delivery_value ? 'timer-sand' : dkd_online_value ? 'stop-circle' : 'rocket-launch';
  const dkd_search_title_value = dkd_has_active_delivery_value ? 'TESLİMATTA' : dkd_online_value ? 'Sipariş Aranıyor' : 'Arama Beklemede';
  const dkd_search_subtitle_value = dkd_has_active_delivery_value ? 'Mevcut teslimat bitince en yakın sipariş araması tekrar başlar.' : dkd_online_value ? 'En yakın uygun sipariş geldiğinde popup açılacak.' : 'Çevrimiçi olunca kayıtlı bölgede arama başlar.';
  const dkd_search_icon_value = dkd_has_active_delivery_value ? 'truck-fast-outline' : dkd_online_value ? 'radar' : 'timer-sand-paused';

  useEffect(() => {
    if (dkd_force_details_open_value || dkd_online_value || dkd_has_active_delivery_value) {
      dkd_set_details_open_value(true);
    }
  }, [dkd_force_details_open_value, dkd_has_active_delivery_value, dkd_online_value]);

  useEffect(() => {
    if (!dkd_online_value && !dkd_has_active_delivery_value) {
      dkd_motion_value.setValue(0);
      return undefined;
    }
    const dkd_loop_value = Animated.loop(
      Animated.timing(dkd_motion_value, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_has_active_delivery_value, dkd_motion_value, dkd_online_value]);

  const dkd_spin_value = dkd_motion_value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dkd_pulse_value = dkd_motion_value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.12, 0.92] });
  const dkd_scan_opacity_value = dkd_motion_value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.42, 1, 0.42] });
  const dkd_search_status_panel_node_value = (
    <View style={[styles.dkdCourierOnlineV4SearchPanel, dkd_has_active_delivery_value && styles.dkdCourierOnlineV4SearchPanelDelivery]}>
      <View style={styles.dkdCourierOnlineV4SearchIconWrap}>
        {dkd_online_value || dkd_has_active_delivery_value ? (
          <>
            <Animated.View style={[styles.dkdCourierOnlineV4SearchRingOuter, { opacity: dkd_scan_opacity_value, transform: [{ scale: dkd_pulse_value }] }]} />
            <Animated.View style={[styles.dkdCourierOnlineV4SearchRing, { opacity: dkd_scan_opacity_value, transform: [{ rotate: dkd_spin_value }] }]} />
          </>
        ) : null}
        <View style={[styles.dkdCourierOnlineV4SearchCore, dkd_online_value || dkd_has_active_delivery_value ? styles.dkdCourierOnlineV4SearchCoreActive : styles.dkdCourierOnlineV4SearchCorePassive, dkd_has_active_delivery_value && styles.dkdCourierOnlineV4SearchCoreDelivery]}>
          <MaterialCommunityIcons name={dkd_search_icon_value} size={20} color="#06111A" />
        </View>
      </View>
      <View style={styles.dkdCourierOnlineV4SearchCopy}>
        <Text style={styles.dkdCourierOnlineV4SearchTitle}>{dkd_search_title_value}</Text>
        <Text style={styles.dkdCourierOnlineV4SearchSub}>{dkd_search_subtitle_value}</Text>
      </View>
      {dkd_assigned_job_id_value ? (
        <View style={styles.dkdCourierOnlineV4AssignedBadge}>
          <MaterialCommunityIcons name="target-account" size={15} color="#06111A" />
          <Text style={styles.dkdCourierOnlineV4AssignedText}>ATANDI</Text>
        </View>
      ) : null}
    </View>
  );

  const dkd_online_action_button_node_value = (
    <Pressable
      hitSlop={12}
      disabled={dkd_has_active_delivery_value || dkd_busy_value}
      onPress={() => {
        if (dkd_has_active_delivery_value) return;
        dkd_on_toggle_value?.(!dkd_online_value);
      }}
      style={({ pressed }) => [styles.dkdCourierOnlineV4ButtonPressable, pressed && !dkd_has_active_delivery_value ? styles.dkdCourierOnlineV4ButtonPressed : null, dkd_has_active_delivery_value && styles.dkdCourierOnlineV4ButtonLocked]}
    >
      <LinearGradient
        colors={dkd_has_active_delivery_value ? ['#132B62', '#0EA5E9', '#7C3AED', '#FFB84D'] : dkd_online_value ? ['#FF3F7F', '#FF8A3D', '#FFD166'] : ['#23E7FF', '#7C3AED', '#52F2A1', '#FFD166']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={styles.dkdCourierOnlineV4Button}
      >
        <View style={styles.dkdCourierOnlineV4ButtonIcon}>
          {dkd_busy_value ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name={dkd_action_icon_value} size={28} color="#FFFFFF" />
          )}
        </View>
        <View style={styles.dkdCourierOnlineV4ButtonCopy}>
          <Text style={styles.dkdCourierOnlineV4ButtonTitle}>{dkd_button_title_value}</Text>
          <Text style={styles.dkdCourierOnlineV4ButtonSub}>{dkd_button_subtitle_value}</Text>
        </View>
        <View style={styles.dkdCourierOnlineV4ButtonArrow}>
          <MaterialCommunityIcons name={dkd_has_active_delivery_value ? 'lock-check-outline' : dkd_online_value ? 'power' : 'chevron-double-right'} size={22} color="#06111A" />
        </View>
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={[styles.dkdCourierOnlineCard, styles.dkdCourierOnlineCardV4, dkd_has_active_delivery_value && styles.dkdCourierOnlineCardDeliveryMode]}>
      <LinearGradient
        colors={dkd_has_active_delivery_value ? ['rgba(24,34,74,0.98)', 'rgba(14,74,88,0.96)', 'rgba(62,34,10,0.95)'] : dkd_online_value ? ['rgba(8,34,38,0.98)', 'rgba(10,70,82,0.96)', 'rgba(34,22,74,0.95)'] : ['rgba(29,20,46,0.98)', 'rgba(55,27,48,0.95)', 'rgba(11,34,54,0.94)']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.dkdCourierOnlineV4BgOrbitOne} />
      <View style={styles.dkdCourierOnlineV4BgOrbitTwo} />

      <View style={styles.dkdCourierOnlineV4TopRow}>
        <LinearGradient
          colors={dkd_has_active_delivery_value ? ['#FFD166', '#31D7FF', '#52F2A1'] : dkd_online_value ? ['#52F2A1', '#31D7FF'] : ['#FFB84D', '#FF4D7D']}
          start={dkd_make_native_axis_point(0, 0)}
          end={dkd_make_native_axis_point(1, 1)}
          style={styles.dkdCourierOnlineV4StatusIcon}
        >
          {dkd_online_value || dkd_has_active_delivery_value ? <View style={styles.dkdCourierOnlineV4StatusIconHalo} /> : null}
          <MaterialCommunityIcons name={dkd_status_icon_value} size={dkd_has_active_delivery_value ? 30 : dkd_online_value ? 31 : 27} color="#06111A" />
          {dkd_online_value || dkd_has_active_delivery_value ? (
            <View style={[styles.dkdCourierOnlineV4StatusIconBadge, dkd_has_active_delivery_value && styles.dkdCourierOnlineV4StatusIconBadgeDelivery]}>
              <MaterialCommunityIcons name={dkd_has_active_delivery_value ? 'package-check' : 'navigation-variant'} size={12} color="#FFFFFF" />
            </View>
          ) : null}
        </LinearGradient>
        <View style={styles.dkdCourierOnlineV4StatusCopy}>
          <Text style={styles.dkdCourierOnlineV4Eyebrow}>KURYE DURUMU</Text>
          <Text style={[styles.dkdCourierOnlineV4StatusTitle, dkd_has_active_delivery_value && styles.dkdCourierOnlineV4StatusTitleDelivery]}>{dkd_status_label_value}</Text>
          <Text style={[styles.dkdCourierOnlineV4StatusSub, dkd_has_active_delivery_value && styles.dkdCourierOnlineV4StatusSubDelivery]}>{dkd_status_subtitle_value}</Text>
        </View>
        <View style={[styles.dkdCourierOnlineV4SignalPill, dkd_online_value ? styles.dkdCourierOnlineV4SignalPillActive : styles.dkdCourierOnlineV4SignalPillPassive]}>
          <View style={[styles.dkdCourierOnlineV4SignalDot, dkd_online_value ? styles.dkdCourierOnlineV4SignalDotActive : styles.dkdCourierOnlineV4SignalDotPassive]} />
          <Text style={[styles.dkdCourierOnlineV4SignalText, dkd_online_value ? styles.dkdCourierOnlineV4SignalTextActive : styles.dkdCourierOnlineV4SignalTextPassive]}>{dkd_has_active_delivery_value ? 'TESLİMAT' : dkd_online_value ? 'CANLI' : 'KAPALI'}</Text>
        </View>
      </View>

      {dkd_online_action_button_node_value}

      {dkd_search_status_panel_node_value}

      <Pressable
        onPress={() => dkd_set_details_open_value((dkd_current_open_value) => !dkd_current_open_value)}
        style={styles.dkdCourierOnlineV4DetailsToggle}
      >
        <View style={styles.dkdCourierOnlineV4DetailsToggleIcon}>
          <MaterialCommunityIcons name={dkd_details_open_value ? 'chevron-up' : 'chevron-down'} size={19} color="#06111A" />
        </View>
        <View style={styles.dkdCourierOnlineV4DetailsToggleCopy}>
          <Text style={styles.dkdCourierOnlineV4DetailsToggleTitle}>{dkd_details_open_value ? 'Kurye Profilini Gizle' : 'Kurye Profilini İncele'}</Text>
        </View>
      </Pressable>

      {dkd_details_open_value ? (
        <>
          {dkd_profile_panel_node_value ? (
            <View style={styles.dkdCourierOnlineProfileSlot}>{dkd_profile_panel_node_value}</View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const JobCard = memo(function JobCard({ task, savingId, currentLocation, geocodeCache, onAccept, onReject, onPickedUp, onComplete, onOpenRoute, onOpenCustomerPhone, onOpenCargoPanel, dkd_on_open_business_mapbox_route_value, dkd_is_admin_value = false, dkd_on_admin_delete_value }) {
  const phase = jobPhase(task);
  const saving = String(savingId || '') === String(task?.id || '');
  const next = nextDistanceAndArrival(task, currentLocation, geocodeCache);
  const dkd_is_cargo_card_value = dkd_is_cargo_task(task);
  const dkd_can_open_business_mapbox_route_value = !dkd_is_cargo_card_value && typeof dkd_on_open_business_mapbox_route_value === 'function';
  const dkd_card_motion_value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === 'completed') {
      dkd_card_motion_value.setValue(0);
      return undefined;
    }
    const dkd_duration_value = phase === 'open' ? 2450 : 2050;
    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_card_motion_value, {
          toValue: 1,
          duration: dkd_duration_value,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(dkd_card_motion_value, {
          toValue: 0,
          duration: dkd_duration_value,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
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
          <DkdInfoLine dkd_icon_name_value="cash-fast" dkd_label_value="Sipariş Ücreti" dkd_value={formatTl(courierFeeTl(task, next.distanceKm))} dkd_icon_color_value={dkd_colors.green} />
          <DkdInfoLine dkd_icon_name_value="map-marker-distance" dkd_label_value="Rota / KM" dkd_value={formatKm(next.distanceKm)} dkd_icon_color_value={dkd_colors.cyanSoft} />
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
        {phase === 'completed' ? <DkdCompletedRouteSummary task={task} /> : (
          <MiniMapPreview
            currentLocation={currentLocation}
            task={task}
            geocodeCache={geocodeCache}
            onPress={dkd_is_cargo_card_value ? () => onOpenCargoPanel?.(task) : dkd_can_open_business_mapbox_route_value ? () => dkd_on_open_business_mapbox_route_value?.(task) : undefined}
            dkd_show_open_chip_value={dkd_is_cargo_card_value || dkd_can_open_business_mapbox_route_value}
            dkd_open_chip_text_value={dkd_is_cargo_card_value ? 'Canlı Takip TIKLA' : 'ROTA ÇİZ'}
          />
        )}

        <View style={styles.metricRow}>
          <StatTile label="Skor" value={`+${Number(task?.reward_score || 0)}`} accent={dkd_colors.goldSoft} iconName="star-four-points-outline" />
          <StatTile label="Rota" value={formatKm(next.distanceKm)} accent={dkd_colors.cyanSoft} iconName="map-marker-distance" />
          <StatTile label="Varış" value={formatArrival(next.arrivalMin)} iconName="clock-fast" />
          <StatTile label="Kazanç" value={formatTl(courierFeeTl(task, next.distanceKm))} accent={dkd_colors.green} iconName="cash-fast" />
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={() => {
            if (dkd_is_cargo_card_value) {
              onOpenCargoPanel?.(task);
            } else if (dkd_can_open_business_mapbox_route_value) {
              dkd_on_open_business_mapbox_route_value?.(task);
            } else {
              onOpenRoute(task);
            }
          }} style={styles.secondaryAction}>
            <MaterialCommunityIcons name="map-search-outline" size={17} color={dkd_colors.text} />
            <Text style={styles.secondaryActionText}>{dkd_is_cargo_card_value ? 'Konuma Git' : 'ROTA ÇİZ'}</Text>
          </Pressable>
          {dkd_is_admin_value ? (
            <Pressable onPress={() => dkd_on_admin_delete_value?.(task)} disabled={saving} style={[styles.dkdAdminDeleteAction, saving && styles.actionDisabled]}>
              <MaterialCommunityIcons name="trash-can-outline" size={17} color="#FFDCE2" />
              <Text style={styles.dkdAdminDeleteActionText}>SİL</Text>
            </Pressable>
          ) : null}
          {!['completed', 'cancelled'].includes(phase) ? (
            <Pressable
              onPress={() => {
                if (phase === 'open' || phase === 'dkd_assigned_offer') onAccept(task.id);
                else if (phase === 'to_business') onPickedUp(task);
                else onComplete(task);
              }}
              disabled={saving}
              style={[styles.primaryAction, saving && styles.actionDisabled]}
            >
              <LinearGradient
                colors={phase === 'open' ? ['#40D8FF', '#2A8DFF', '#0E1840'] : phase === 'dkd_assigned_offer' ? ['#52F2A1', '#40D8FF', '#15304B'] : phase === 'to_business' ? ['#F6B54E', '#FF8D1F', '#3B1D09'] : ['#52F2A1', '#14C97F', '#103824']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.dkdPrimaryActionInner}>
                <MaterialCommunityIcons name={phase === 'open' ? 'flash-outline' : phase === 'dkd_assigned_offer' ? 'check-network-outline' : phase === 'to_business' ? 'package-variant-closed-check' : 'check-decagram'} size={17} color="#F7FBFF" />
                <Text style={styles.primaryActionText}>{actionLabel(task, saving)}</Text>
              </View>
            </Pressable>
          ) : null}
          {phase === 'dkd_assigned_offer' ? (
            <Pressable onPress={() => onReject?.(task)} disabled={saving} style={[styles.dkdRejectOfferAction, saving && styles.actionDisabled]}>
              <MaterialCommunityIcons name="close-circle-outline" size={17} color="#FFDCE2" />
              <Text style={styles.dkdRejectOfferActionText}>Reddet</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
    </Animated.View>
  );
});


export function DkdCourierInlineApplicationForm({ dkd_profile_value, dkd_set_profile_value }) {
  const [dkd_application_draft_value, dkd_set_application_draft_value] = useState(() => defaultApplicationDraft(dkd_profile_value));
  const [dkd_applying_value, dkd_set_applying_value] = useState(false);
  const dkd_courier_status_value = String(dkd_profile_value?.courier_status || 'none');
  const dkd_courier_pending_value = dkd_courier_status_value === 'pending';
  const dkd_application_city_options_value = useMemo(() => dkd_courier_city_options_value(dkd_application_draft_value?.country || 'Türkiye'), [dkd_application_draft_value?.country]);
  const dkd_application_zone_options_value = useMemo(() => dkd_courier_zone_options_value(dkd_application_draft_value?.country || 'Türkiye', dkd_application_draft_value?.city || 'Ankara'), [dkd_application_draft_value?.country, dkd_application_draft_value?.city]);

  const dkd_set_draft_field_value = useCallback((dkd_key_value, dkd_field_value) => {
    dkd_set_application_draft_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_key_value]: dkd_field_value }));
  }, []);

  const dkd_set_application_country_value = useCallback((dkd_country_value) => {
    const dkd_city_options_value = dkd_courier_city_options_value(dkd_country_value);
    const dkd_next_city_value = dkd_city_options_value?.[0] || 'Ankara';
    const dkd_zone_options_value = dkd_courier_zone_options_value(dkd_country_value, dkd_next_city_value);
    dkd_set_application_draft_value((dkd_previous_value) => ({
      ...dkd_previous_value,
      country: dkd_country_value,
      city: dkd_next_city_value,
      zone: dkd_zone_options_value?.[0] || '',
    }));
  }, []);

  const dkd_set_application_city_value = useCallback((dkd_city_value) => {
    dkd_set_application_draft_value((dkd_previous_value) => {
      const dkd_zone_options_value = dkd_courier_zone_options_value(dkd_previous_value?.country || 'Türkiye', dkd_city_value);
      return {
        ...dkd_previous_value,
        city: dkd_city_value,
        zone: dkd_zone_options_value?.[0] || '',
      };
    });
  }, []);

  const dkd_choose_document_value = useCallback(async (dkd_key_value) => {
    try {
      const dkd_uri_value = await pickDeviceImage();
      if (!dkd_uri_value) return;
      dkd_set_application_draft_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_key_value]: dkd_uri_value }));
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Fotoğraf seçilemedi.');
    }
  }, []);

  const dkd_handle_apply_value = useCallback(async () => {
    if (!appRequiredReady(dkd_application_draft_value)) {
      Alert.alert('Kurye', 'Lütfen zorunlu alanları ve gerekli belgeleri tamamla.');
      return;
    }
    dkd_set_applying_value(true);
    try {
      const dkd_submit_result_value = await submitCourierApplication({
        userId: dkd_profile_value?.user_id || dkd_profile_value?.id,
        form: dkd_application_draft_value,
      });
      if (dkd_submit_result_value?.error) throw dkd_submit_result_value.error;
      const dkd_data_value = dkd_submit_result_value?.data || {};
      const dkd_next_status_value = String(dkd_data_value?.status || 'pending');
      dkd_set_profile_value?.((dkd_previous_value) => (
        dkd_previous_value
          ? {
              ...dkd_previous_value,
              courier_status: dkd_next_status_value,
              dkd_country: String(dkd_data_value?.country || dkd_application_draft_value.country || 'Türkiye'),
              dkd_city: String(dkd_data_value?.city || dkd_application_draft_value.city || 'Ankara'),
              dkd_region: String(dkd_data_value?.zone || dkd_application_draft_value.zone || ''),
              courier_city: String(dkd_data_value?.city || dkd_application_draft_value.city || 'Ankara'),
              courier_zone: String(dkd_data_value?.zone || dkd_application_draft_value.zone || ''),
              courier_vehicle_type: String(dkd_data_value?.vehicle_type || dkd_application_draft_value.vehicleType || 'moto'),
              courier_profile_meta: {
                ...(dkd_previous_value?.courier_profile_meta || {}),
                dkd_country: String(dkd_data_value?.country || dkd_application_draft_value.country || 'Türkiye'),
                zone: String(dkd_data_value?.zone || dkd_application_draft_value.zone || ''),
                application_documents: dkd_data_value?.documents || {},
              },
            }
          : dkd_previous_value
      ));
      Alert.alert('Kurye', 'Detaylı başvurun kaydedildi. Belgeler admin incelemesine gönderildi.');
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Başvuru gönderilemedi.');
    } finally {
      dkd_set_applying_value(false);
    }
  }, [dkd_application_draft_value, dkd_profile_value?.id, dkd_profile_value?.user_id, dkd_set_profile_value]);

  return (
    <View style={styles.applyCard}>
      <Text style={styles.applyTitle}>Detaylı kurye başvuru formu</Text>
      <Text style={styles.applyText}>Ülke, şehir ve bölge seçimi zorunlu. Onay sonrası sipariş havuzun seçtiğin hizmet alanına göre filtrelenecek.</Text>

      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <FieldLabel required>Ad</FieldLabel>
          <FormInput value={dkd_application_draft_value.firstName} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('firstName', dkd_text_value)} placeholder="Ad" maxLength={32} />
        </View>
        <View style={styles.formCol}>
          <FieldLabel required>Soyad</FieldLabel>
          <FormInput value={dkd_application_draft_value.lastName} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('lastName', dkd_text_value)} placeholder="Soyad" maxLength={32} />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <FieldLabel required>TC Kimlik No</FieldLabel>
          <FormInput value={dkd_application_draft_value.nationalId} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('nationalId', normalizeDigits(dkd_text_value, 11))} placeholder="11 haneli TC" keyboardType="number-pad" maxLength={11} />
        </View>
        <View style={styles.formCol}>
          <FieldLabel required>Telefon</FieldLabel>
          <FormInput value={dkd_application_draft_value.phone} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('phone', normalizeDigits(dkd_text_value, 11))} placeholder="05xx xxx xx xx" keyboardType="phone-pad" maxLength={11} />
        </View>
      </View>

      <FieldLabel>E-posta</FieldLabel>
      <FormInput value={dkd_application_draft_value.email} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('email', dkd_text_value)} placeholder="ornek@mail.com" keyboardType="email-address" maxLength={64} />

      <FieldLabel required>Ülke</FieldLabel>
      <View style={styles.zoneChipWrap}>
        {dkd_courier_country_options_value.map((dkd_country_option_value) => (
          <Pressable key={dkd_country_option_value} onPress={() => dkd_set_application_country_value(dkd_country_option_value)} style={[styles.zoneChip, dkd_application_draft_value.country === dkd_country_option_value && styles.zoneChipActive]}>
            <Text style={[styles.zoneChipText, dkd_application_draft_value.country === dkd_country_option_value && styles.zoneChipTextActive]}>{dkd_country_option_value}</Text>
          </Pressable>
        ))}
      </View>

      <FieldLabel required>Şehir</FieldLabel>
      <View style={styles.zoneChipWrap}>
        {dkd_application_city_options_value.map((dkd_city_option_value) => (
          <Pressable key={dkd_city_option_value} onPress={() => dkd_set_application_city_value(dkd_city_option_value)} style={[styles.zoneChip, dkd_application_draft_value.city === dkd_city_option_value && styles.zoneChipActive]}>
            <Text style={[styles.zoneChipText, dkd_application_draft_value.city === dkd_city_option_value && styles.zoneChipTextActive]}>{dkd_city_option_value === 'AbuDhabi' ? 'Abu Dhabi' : dkd_city_option_value}</Text>
          </Pressable>
        ))}
      </View>

      <FieldLabel required>Bölge</FieldLabel>
      <View style={styles.zoneChipWrap}>
        {dkd_application_zone_options_value.map((dkd_zone_option_value) => (
          <Pressable key={dkd_zone_option_value} onPress={() => dkd_set_draft_field_value('zone', dkd_zone_option_value)} style={[styles.zoneChip, dkd_application_draft_value.zone === dkd_zone_option_value && styles.zoneChipActive]}>
            <Text style={[styles.zoneChipText, dkd_application_draft_value.zone === dkd_zone_option_value && styles.zoneChipTextActive]}>{dkd_zone_option_value}</Text>
          </Pressable>
        ))}
      </View>

      <FieldLabel required>Araç Türü</FieldLabel>
      <View style={styles.zoneChipWrap}>
        {VEHICLE_TYPES.map((dkd_vehicle_option_value) => (
          <Pressable key={dkd_vehicle_option_value.key} onPress={() => dkd_set_draft_field_value('vehicleType', dkd_vehicle_option_value.key)} style={[styles.zoneChip, dkd_application_draft_value.vehicleType === dkd_vehicle_option_value.key && styles.zoneChipActive]}>
            <Text style={[styles.zoneChipText, dkd_application_draft_value.vehicleType === dkd_vehicle_option_value.key && styles.zoneChipTextActive]}>{dkd_vehicle_option_value.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <FieldLabel>Plaka</FieldLabel>
          <FormInput value={dkd_application_draft_value.plateNo} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('plateNo', dkd_text_value.toUpperCase())} placeholder="06 ABC 123" maxLength={16} />
        </View>
        <View style={styles.formCol}>
          <FieldLabel>Acil Durum Telefonu</FieldLabel>
          <FormInput value={dkd_application_draft_value.emergencyPhone} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('emergencyPhone', normalizeDigits(dkd_text_value, 11))} placeholder="05xx xxx xx xx" keyboardType="phone-pad" maxLength={11} />
        </View>
      </View>

      <FieldLabel>Acil Durum Kişisi</FieldLabel>
      <FormInput value={dkd_application_draft_value.emergencyName} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('emergencyName', dkd_text_value)} placeholder="Yakın iletişim kişisi" maxLength={48} />

      <FieldLabel>Adres Bilgisi</FieldLabel>
      <FormInput value={dkd_application_draft_value.addressText} onChangeText={(dkd_text_value) => dkd_set_draft_field_value('addressText', dkd_text_value)} placeholder="Mahalle, cadde, sokak ve ek açıklama" multiline maxLength={240} />

      <Text style={styles.docsSectionTitle}>Belge Yükleme</Text>
      <View style={styles.docGrid}>
        <ImagePickTile label="Kimlik ön yüz" value={dkd_application_draft_value.identityFrontUri} onPick={() => dkd_choose_document_value('identityFrontUri')} />
        <ImagePickTile label="Kimlik arka yüz" value={dkd_application_draft_value.identityBackUri} onPick={() => dkd_choose_document_value('identityBackUri')} optional />
        <ImagePickTile label="Selfie / yüz doğrulama" value={dkd_application_draft_value.selfieUri} onPick={() => dkd_choose_document_value('selfieUri')} />
        <ImagePickTile label="Ehliyet fotoğrafı" value={dkd_application_draft_value.driverLicenseUri} onPick={() => dkd_choose_document_value('driverLicenseUri')} />
        <ImagePickTile label="Araç ruhsatı" value={dkd_application_draft_value.vehicleLicenseUri} onPick={() => dkd_choose_document_value('vehicleLicenseUri')} />
        <ImagePickTile label="Sigorta / poliçe" value={dkd_application_draft_value.insuranceUri} onPick={() => dkd_choose_document_value('insuranceUri')} optional />
      </View>

      <Pressable disabled={dkd_applying_value || dkd_courier_pending_value} onPress={dkd_handle_apply_value} style={[styles.primaryAction, styles.applySubmitBtn, (dkd_applying_value || dkd_courier_pending_value) && styles.actionDisabled]}>
        <LinearGradient colors={['#40D8FF', '#2A8DFF', '#0E1840']} style={StyleSheet.absoluteFill} />
        <Text style={styles.primaryActionText}>{dkd_courier_pending_value ? 'Başvuru incelemede' : dkd_applying_value ? 'Belgeler gönderiliyor…' : 'Kurye başvurusu yap'}</Text>
      </Pressable>
    </View>
  );
}

export default function CourierBoardModal({ visible, onClose, profile, setProfile, currentLocation, isAdmin = false, dkd_initial_panel_value = 'default' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [applying, setApplying] = useState(false);
  const [geocodeCache, setGeocodeCache] = useState({});
  const [statusFilter, setStatusFilter] = useState('new');
  const [dkd_visible_task_limit_value, setDkdVisibleTaskLimitValue] = useState(2);
  const [dkd_queue_source_filter_value, setDkdQueueSourceFilterValue] = useState('business');
  const [profileVisible, setProfileVisible] = useState(false);
  const [rewardModal, setRewardModal] = useState(null);
  const [applicationDraft, setApplicationDraft] = useState(() => defaultApplicationDraft(profile));
  const [dkd_pickup_modal_task_value, setDkdPickupModalTaskValue] = useState(null);
  const [dkd_pickup_modal_image_uri_value, setDkdPickupModalImageUriValue] = useState('');
  const [dkd_pickup_modal_busy_value, setDkdPickupModalBusyValue] = useState(false);
  const [dkd_center_tab_value, setDkdCenterTabValue] = useState('cargo_panel');
  const [dkd_urgent_panel_mode_value, setDkdUrgentPanelModeValue] = useState('default');
  const [dkd_cargo_panel_mode_value, setDkdCargoPanelModeValue] = useState('create');
  const [dkd_cargo_panel_task_value, setDkdCargoPanelTaskValue] = useState(null);
  const [dkd_cargo_panel_refreshing_value, setDkdCargoPanelRefreshingValue] = useState(false);
  const [dkd_business_mapbox_route_task_value, setDkdBusinessMapboxRouteTaskValue] = useState(null);
  const [dkd_business_mapbox_route_refreshing_value, setDkdBusinessMapboxRouteRefreshingValue] = useState(false);
  const [dkd_order_pool_page_visible_value, setDkdOrderPoolPageVisibleValue] = useState(false);
  const [dkd_order_pool_source_value, setDkdOrderPoolSourceValue] = useState('business');
  const [dkd_logistics_jobs_value, setDkdLogisticsJobsValue] = useState([]);
  const [dkd_logistics_offers_value, setDkdLogisticsOffersValue] = useState([]);
  const [dkd_logistics_loading_value, setDkdLogisticsLoadingValue] = useState(false);
  const [dkd_logistics_page_visible_value, dkd_set_logistics_page_visible_value] = useState(false);
  const [dkd_logistics_initial_panel_local_value, dkd_set_logistics_initial_panel_local_value] = useState('create');
  const [dkd_inline_logistics_panel_value, dkd_set_inline_logistics_panel_value] = useState('create');
  const [dkd_courier_online_flag_value, setDkdCourierOnlineFlagValue] = useState(false);
  const [dkd_courier_online_busy_value, setDkdCourierOnlineBusyValue] = useState(false);
  const [dkd_online_country_value, setDkdOnlineCountryValue] = useState(String(profile?.dkd_country || profile?.dkd_courier_online_country || 'Türkiye').trim() || 'Türkiye');
  const [dkd_online_city_value, setDkdOnlineCityValue] = useState(String(profile?.dkd_city || profile?.courier_city || profile?.dkd_courier_online_city || 'Ankara').trim() || 'Ankara');
  const [dkd_online_region_value, setDkdOnlineRegionValue] = useState(String(profile?.dkd_region || profile?.courier_zone || profile?.dkd_courier_online_region || 'Çankaya').trim() || 'Çankaya');
  const [dkd_auto_assigned_job_id_value, setDkdAutoAssignedJobIdValue] = useState(profile?.dkd_courier_auto_assigned_job_id || null);
  const dkd_tasks_has_rows_ref_value = useRef(false);
  const dkd_center_scroll_view_ref_value = useRef(null);
  const [dkd_deferred_modal_content_ready_value, dkd_set_deferred_modal_content_ready_value] = useState(true);

  const dkd_scroll_center_panel_once_value = useCallback(() => {
    requestAnimationFrame(() => {
      dkd_center_scroll_view_ref_value.current?.scrollTo?.({ y: 660, animated: true });
    });
  }, []);

  const setDraftField = useCallback((dkd_key_value, dkd_field_value) => {
    setApplicationDraft((prev) => ({ ...prev, [dkd_key_value]: dkd_field_value }));
  }, []);

  const dkd_application_city_options_value = useMemo(() => dkd_courier_city_options_value(applicationDraft?.country || 'Türkiye'), [applicationDraft?.country]);
  const dkd_application_zone_options_value = useMemo(() => dkd_courier_zone_options_value(applicationDraft?.country || 'Türkiye', applicationDraft?.city || 'Ankara'), [applicationDraft?.country, applicationDraft?.city]);

  const dkd_set_application_country_value = useCallback((dkd_country_value) => {
    const dkd_city_options_value = dkd_courier_city_options_value(dkd_country_value);
    const dkd_next_city_value = dkd_city_options_value?.[0] || 'Ankara';
    const dkd_zone_options_value = dkd_courier_zone_options_value(dkd_country_value, dkd_next_city_value);
    setApplicationDraft((dkd_previous_value) => ({
      ...dkd_previous_value,
      country: dkd_country_value,
      city: dkd_next_city_value,
      zone: dkd_zone_options_value?.[0] || '',
    }));
  }, []);

  const dkd_set_application_city_value = useCallback((dkd_city_value) => {
    setApplicationDraft((dkd_previous_value) => {
      const dkd_zone_options_value = dkd_courier_zone_options_value(dkd_previous_value?.country || 'Türkiye', dkd_city_value);
      return {
        ...dkd_previous_value,
        city: dkd_city_value,
        zone: dkd_zone_options_value?.[0] || '',
      };
    });
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
  const walletTl = useMemo(() => resolveUnifiedWalletTl(profile || {}), [profile]);
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
  const dkd_has_active_delivery_value = !!dkd_active_task_value;
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
          isInteraction: false,
        }),
        Animated.timing(dkd_order_mode_breathe_value, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
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
        isInteraction: false,
      })
    );
    dkd_order_mode_scan_loop_value.start();
    return () => dkd_order_mode_scan_loop_value.stop();
  }, [dkd_order_mode_scan_value, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    dkd_set_deferred_modal_content_ready_value(true);
    return undefined;
  }, [visible]);

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
    outputRange: [0, 0.16, 0.10, 0.16, 0],
  });

  const loadJobs = useCallback(async (dkd_options_value = {}) => {
    if (!courierApproved) {
      dkd_tasks_has_rows_ref_value.current = false;
      setTasks([]);
      return;
    }
    const dkd_cached_rows_value = dkd_peek_cached_courier_jobs_value();
    if (Array.isArray(dkd_cached_rows_value) && dkd_cached_rows_value.length) {
      dkd_tasks_has_rows_ref_value.current = true;
      setTasks((dkd_prev_rows_value) => dkd_merge_task_rows(dkd_prev_rows_value, dkd_cached_rows_value));
    }
    setLoading(!dkd_tasks_has_rows_ref_value.current);
    try {
      const { data: dkd_data_value, error: dkd_error_value } = await fetchCourierJobs({
        dkd_cache_ttl_ms: dkd_options_value?.dkd_force_refresh ? 0 : 45000,
        dkd_force_refresh: dkd_options_value?.dkd_force_refresh === true,
      });
      if (dkd_error_value) throw dkd_error_value;
      const dkd_next_rows_value = Array.isArray(dkd_data_value) ? dkd_data_value : [];
      dkd_tasks_has_rows_ref_value.current = dkd_next_rows_value.length > 0;
      setTasks((dkd_prev_rows_value) => dkd_merge_task_rows(dkd_prev_rows_value, dkd_next_rows_value));
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Kurye görevleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [courierApproved]);

  const dkd_load_logistics_order_pool_value = useCallback(async () => {
    setDkdLogisticsLoadingValue(true);
    try {
      const dkd_result_value = await dkd_fetch_logistics_jobs_value();
      if (dkd_result_value?.error) throw dkd_result_value.error;
      const dkd_payload_value = dkd_result_value?.data || {};
      setDkdLogisticsJobsValue(Array.isArray(dkd_payload_value?.dkd_jobs_value) ? dkd_payload_value.dkd_jobs_value : []);
      setDkdLogisticsOffersValue(Array.isArray(dkd_payload_value?.dkd_offers_value) ? dkd_payload_value.dkd_offers_value : []);
    } catch (dkd_error_value) {
      Alert.alert('Nakliye Siparişleri', dkd_error_value?.message || 'Nakliye siparişleri yüklenemedi.');
    } finally {
      setDkdLogisticsLoadingValue(false);
    }
  }, []);

  const dkd_open_order_pool_page_value = useCallback((dkd_source_value = 'business') => {
    const dkd_next_source_value = String(dkd_source_value || 'business');
    setDkdOrderPoolSourceValue(dkd_next_source_value);
    setStatusFilter('new');
    if (dkd_next_source_value === 'business' || dkd_next_source_value === 'cargo') {
      setDkdQueueSourceFilterValue(dkd_next_source_value);
    }
    if (dkd_next_source_value === 'urgent') {
      setDkdUrgentPanelModeValue('queue_only');
    }
    if (dkd_next_source_value === 'logistics') {
      dkd_load_logistics_order_pool_value();
    }
    setDkdOrderPoolPageVisibleValue(true);
  }, [dkd_load_logistics_order_pool_value]);

  const dkd_close_order_pool_page_value = useCallback(() => {
    setDkdOrderPoolPageVisibleValue(false);
  }, []);

  const dkd_open_logistics_center_value = useCallback((dkd_next_logistics_panel_value = 'create') => {
    dkd_set_logistics_initial_panel_local_value(String(dkd_next_logistics_panel_value || 'create'));
    dkd_set_logistics_page_visible_value(true);
  }, []);

  const dkd_open_inline_logistics_center_value = useCallback((dkd_next_logistics_panel_value = 'create') => {
    dkd_set_inline_logistics_panel_value(String(dkd_next_logistics_panel_value || 'create'));
    setDkdCenterTabValue('logistics_create');
    dkd_scroll_center_panel_once_value();
  }, [dkd_scroll_center_panel_once_value]);

  const dkd_close_inline_logistics_center_value = useCallback(() => {
    setDkdCenterTabValue('cargo_panel');
  }, []);

  useEffect(() => {
    if (!visible) {
      setDkdOrderPoolPageVisibleValue(false);
      return;
    }
    if (dkd_order_pool_page_visible_value && dkd_order_pool_source_value === 'logistics') {
      dkd_load_logistics_order_pool_value();
    }
  }, [dkd_load_logistics_order_pool_value, dkd_order_pool_page_visible_value, dkd_order_pool_source_value, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const dkd_initial_center_tab_value = dkd_initial_panel_value === 'application' ? 'application' : 'cargo_panel';
    setDkdCenterTabValue(dkd_initial_center_tab_value);
    setDkdCargoPanelModeValue('create');
    if (dkd_initial_panel_value === 'logistics_application') {
      dkd_open_logistics_center_value('application');
    }
    const dkd_interaction_task_value = InteractionManager.runAfterInteractions(() => {
      loadJobs({ dkd_force_refresh: true });
    });
    return () => {
      dkd_interaction_task_value?.cancel?.();
    };
  }, [visible, loadJobs, courierApproved, dkd_initial_panel_value, dkd_open_logistics_center_value]);

  useEffect(() => {
    if (!visible || !courierApproved) return undefined;
    const dkd_subscription_value = dkd_subscribe_courier_jobs_live_updates_value(() => {
      loadJobs({ dkd_force_refresh: true });
    });
    return () => {
      dkd_subscription_value?.dkd_unsubscribe?.();
    };
  }, [visible, courierApproved, loadJobs]);

  useEffect(() => {
    if (!visible) return;
    const dkd_base_draft_value = defaultApplicationDraft(profile);
    setApplicationDraft((prev) => ({
      ...dkd_base_draft_value,
      ...prev,
      country: prev?.country || dkd_base_draft_value.country,
      city: prev?.city || dkd_base_draft_value.city,
      zone: prev?.zone || dkd_base_draft_value.zone,
      vehicleType: prev?.vehicleType || String(profile?.courier_vehicle_type || 'moto'),
    }));
  }, [visible, profile]);

  useEffect(() => {
    if (!visible) return;
    const dkd_next_country_value = String(profile?.dkd_country || profile?.dkd_courier_online_country || 'Türkiye').trim() || 'Türkiye';
    const dkd_next_city_value = String(profile?.dkd_city || profile?.courier_city || profile?.dkd_courier_online_city || dkd_courier_city_options_value(dkd_next_country_value)?.[0] || 'Ankara').trim() || 'Ankara';
    const dkd_next_region_value = String(profile?.dkd_region || profile?.courier_zone || profile?.dkd_courier_online_region || dkd_courier_zone_options_value(dkd_next_country_value, dkd_next_city_value)?.[0] || '').trim();
    setDkdCourierOnlineFlagValue(profile?.dkd_courier_online === true);
    setDkdOnlineCountryValue(dkd_next_country_value);
    setDkdOnlineCityValue(dkd_next_city_value);
    setDkdOnlineRegionValue(dkd_next_region_value);
    setDkdAutoAssignedJobIdValue(profile?.dkd_courier_auto_assigned_job_id || null);
  }, [visible, profile?.dkd_courier_online, profile?.dkd_courier_online_country, profile?.dkd_courier_online_city, profile?.dkd_courier_online_region, profile?.dkd_courier_auto_assigned_job_id, profile?.dkd_country, profile?.dkd_city, profile?.dkd_region, profile?.courier_city, profile?.courier_zone]);

  const dkd_commit_courier_online_state_value = useCallback(async (dkd_next_online_value) => {
    if (!courierApproved) {
      Alert.alert('Kurye', 'Çevrimiçi mod için kurye lisansının onaylanmış olması gerekiyor.');
      return;
    }
    if (dkd_next_online_value === false && dkd_has_active_delivery_value) {
      Alert.alert('Kurye', 'TESLİMAT BEKLENİYOR. Aktif sipariş tamamlanmadan çevrimdışı olamazsın.');
      return;
    }
    setDkdCourierOnlineBusyValue(true);
    try {
      const { data: dkd_online_data_value, error: dkd_online_error_value } = await dkd_set_courier_online_status({
        dkd_online: dkd_next_online_value,
        dkd_country: dkd_online_country_value,
        dkd_city: dkd_online_city_value,
        dkd_region: dkd_online_region_value,
        dkd_live_lat: currentLocation?.lat,
        dkd_live_lng: currentLocation?.lng,
      });
      if (dkd_online_error_value) throw dkd_online_error_value;
      const dkd_assigned_job_id_value = dkd_online_data_value?.dkd_assigned_job_id || dkd_online_data_value?.assigned_job_id || null;
      setDkdCourierOnlineFlagValue(dkd_next_online_value === true);
      setDkdAutoAssignedJobIdValue(dkd_assigned_job_id_value);
      setProfile?.((dkd_previous_profile_value) => (
        dkd_previous_profile_value
          ? {
              ...dkd_previous_profile_value,
              dkd_courier_online: dkd_next_online_value === true,
              dkd_courier_online_country: dkd_online_country_value,
              dkd_courier_online_city: dkd_online_city_value,
              dkd_courier_online_region: dkd_online_region_value,
              dkd_courier_auto_assigned_job_id: dkd_assigned_job_id_value,
            }
          : dkd_previous_profile_value
      ));
      await loadJobs({ dkd_force_refresh: true });
      if (!dkd_next_online_value) {
        setDkdAutoAssignedJobIdValue(null);
      }
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Çevrimiçi mod güncellenemedi.');
    } finally {
      setDkdCourierOnlineBusyValue(false);
    }
  }, [courierApproved, currentLocation?.lat, currentLocation?.lng, dkd_has_active_delivery_value, dkd_online_city_value, dkd_online_country_value, dkd_online_region_value, loadJobs, setProfile]);

  const dkd_apply_courier_online_state_value = useCallback((dkd_next_online_value) => {
    if (dkd_next_online_value === true && !dkd_courier_online_flag_value) {
      Alert.alert(
        'Kurye çevrimiçi modu',
        'Sipariş havuzundan sana uygun olan görevleri seçebilirsin yada sistem sana en yakın olan Siparişleri otomatik atasın',
        [
          { text: 'Çevrimdışı KAL', style: 'cancel' },
          { text: 'Çevrimiçi OL', onPress: () => dkd_commit_courier_online_state_value(true) },
        ]
      );
      return;
    }
    dkd_commit_courier_online_state_value(dkd_next_online_value);
  }, [dkd_commit_courier_online_state_value, dkd_courier_online_flag_value]);

  useEffect(() => {
    if (!visible || !courierApproved || !dkd_courier_online_flag_value || dkd_has_active_delivery_value) return undefined;
    let dkd_cancelled_value = false;

    async function dkd_refresh_online_assignment_value() {
      try {
        const { data: dkd_online_data_value, error: dkd_online_error_value } = await dkd_set_courier_online_status({
          dkd_online: true,
          dkd_country: dkd_online_country_value,
          dkd_city: dkd_online_city_value,
          dkd_region: dkd_online_region_value,
          dkd_live_lat: currentLocation?.lat,
          dkd_live_lng: currentLocation?.lng,
        });
        if (dkd_online_error_value) throw dkd_online_error_value;
        if (dkd_cancelled_value) return;
        const dkd_assigned_job_id_value = dkd_online_data_value?.dkd_assigned_job_id || dkd_online_data_value?.assigned_job_id || null;
        setDkdAutoAssignedJobIdValue(dkd_assigned_job_id_value);
        setProfile?.((dkd_previous_profile_value) => (dkd_previous_profile_value ? {
          ...dkd_previous_profile_value,
          dkd_courier_online: true,
          dkd_courier_auto_assigned_job_id: dkd_assigned_job_id_value,
        } : dkd_previous_profile_value));
        await loadJobs({ dkd_force_refresh: true });
      } catch (dkd_error_value) {
        console.warn('dkd courier visible online refresh skipped', dkd_error_value?.message || dkd_error_value);
      }
    }

    dkd_refresh_online_assignment_value();
    const dkd_interval_value = setInterval(dkd_refresh_online_assignment_value, 8500);
    return () => {
      dkd_cancelled_value = true;
      clearInterval(dkd_interval_value);
    };
  }, [courierApproved, currentLocation?.lat, currentLocation?.lng, dkd_courier_online_flag_value, dkd_has_active_delivery_value, dkd_online_city_value, dkd_online_country_value, dkd_online_region_value, loadJobs, setProfile, visible]);

  useEffect(() => {
    if (!visible || !tasks.length) return;
    let dkd_cancelled_value = false;

    async function dkd_fill_written_address_coordinates_value() {
      const dkd_entry_values = [];
      tasks.forEach((dkd_task_value) => {
        const dkd_phase_value = jobPhase(dkd_task_value);
        const dkd_is_business_task_value = !dkd_is_cargo_task(dkd_task_value) && !dkd_is_urgent_courier_task_value(dkd_task_value);
        const dkd_pickup_address_value = pickupAddressForTask(dkd_task_value);
        const dkd_dropoff_address_value = dropoffAddressForTask(dkd_task_value);
        const dkd_pickup_key_value = geocodeKeyForTask(dkd_task_value, dkd_phase_value === 'to_customer' || dkd_phase_value === 'completed' ? 'to_business' : dkd_phase_value);
        const dkd_dropoff_key_value = geocodeKeyForTask(dkd_task_value, 'to_customer');

        if (dkd_is_business_task_value) {
          if (dkd_pickup_address_value && !geocodeCache[dkd_pickup_key_value]) {
            dkd_entry_values.push({ dkd_key_value: dkd_pickup_key_value, dkd_address_value: dkd_pickup_address_value });
          }
          if (dkd_dropoff_address_value && !geocodeCache[dkd_dropoff_key_value]) {
            dkd_entry_values.push({ dkd_key_value: dkd_dropoff_key_value, dkd_address_value: dkd_dropoff_address_value });
          }
          return;
        }

        const dkd_active_address_value = dkd_phase_value === 'to_customer' || dkd_phase_value === 'completed' ? dkd_dropoff_address_value : dkd_pickup_address_value;
        const dkd_active_lat_value = dkd_phase_value === 'to_customer' || dkd_phase_value === 'completed' ? dkd_task_value?.dropoff_lat : dkd_task_value?.pickup_lat;
        const dkd_active_lng_value = dkd_phase_value === 'to_customer' || dkd_phase_value === 'completed' ? dkd_task_value?.dropoff_lng : dkd_task_value?.pickup_lng;
        const dkd_active_key_value = geocodeKeyForTask(dkd_task_value, dkd_phase_value);
        if (!dkd_active_address_value || !needsGeocode(dkd_active_lat_value, dkd_active_lng_value) || geocodeCache[dkd_active_key_value]) return;
        dkd_entry_values.push({ dkd_key_value: dkd_active_key_value, dkd_address_value: dkd_active_address_value });
      });

      for (const dkd_entry_value of dkd_entry_values) {
        try {
          const dkd_query_value = dkd_entry_value.dkd_address_value.toLowerCase().includes('ankara') ? dkd_entry_value.dkd_address_value : `${dkd_entry_value.dkd_address_value}, ${GEOCODE_HINT}`;
          const dkd_mapbox_result_value = await dkd_fetch_mapbox_geocoding_place_value(dkd_query_value, {
            dkd_use_ankara_context_value: true,
            dkd_use_ankara_bbox_value: true,
            dkd_use_ankara_proximity_value: true,
            dkd_types_value: 'poi,address,street,place,locality,neighborhood,district',
            dkd_limit_value: 10,
          });
          if (dkd_cancelled_value) return;
          if (dkd_mapbox_result_value?.dkd_point_value) {
            setGeocodeCache((dkd_previous_value) => ({
              ...dkd_previous_value,
              [dkd_entry_value.dkd_key_value]: {
                lat: Number(dkd_mapbox_result_value.dkd_point_value.dkd_lat_value),
                lng: Number(dkd_mapbox_result_value.dkd_point_value.dkd_lng_value),
              },
            }));
            continue;
          }
          const dkd_row_values = await Location.geocodeAsync(dkd_query_value);
          if (dkd_cancelled_value) return;
          if (Array.isArray(dkd_row_values) && dkd_row_values.length) {
            setGeocodeCache((dkd_previous_value) => ({
              ...dkd_previous_value,
              [dkd_entry_value.dkd_key_value]: { lat: Number(dkd_row_values[0].latitude), lng: Number(dkd_row_values[0].longitude) },
            }));
          }
        } catch {}
      }
    }

    dkd_fill_written_address_coordinates_value();
    return () => { dkd_cancelled_value = true; };
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
      } catch {}
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
    const accepted = tasks.filter((task) => ['dkd_assigned_offer', 'to_business', 'to_customer'].includes(jobPhase(task))).length;
    const completed = tasks.filter((task) => jobPhase(task) === 'completed').length;
    return { open, accepted, completed };
  }, [tasks]);

  const dkd_queue_source_stats_value = useMemo(() => {
    const dkd_build_source_summary_value = (dkd_task_rows_value) => ({
      open: dkd_task_rows_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'open').length,
      accepted: dkd_task_rows_value.filter((dkd_task_value) => ['dkd_assigned_offer', 'to_business', 'to_customer'].includes(jobPhase(dkd_task_value))).length,
      new: dkd_task_rows_value.filter((dkd_task_value) => !['completed', 'cancelled'].includes(jobPhase(dkd_task_value))).length,
      completed: dkd_task_rows_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'completed').length,
      cancelled: dkd_task_rows_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'cancelled').length,
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
      const dkd_has_active_value = tasks.some((dkd_task_value) => ['dkd_assigned_offer', 'to_business', 'to_customer'].includes(jobPhase(dkd_task_value)));
      const dkd_has_open_value = tasks.some((dkd_task_value) => jobPhase(dkd_task_value) === 'open');
      if (dkd_has_active_value || dkd_has_open_value) return 'new';
      return 'new';
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

  const dkd_source_filtered_tasks_value = useMemo(() => {
    if (dkd_queue_source_filter_value === 'cargo') return tasks.filter((dkd_task_value) => dkd_is_cargo_task(dkd_task_value));
    return tasks.filter((dkd_task_value) => dkd_is_business_task(dkd_task_value));
  }, [tasks, dkd_queue_source_filter_value]);

  const dkd_active_source_stats_value = useMemo(() => {
    const dkd_empty_stats_value = { open: 0, accepted: 0, new: 0, completed: 0, cancelled: 0, total: 0 };
    return dkd_queue_source_filter_value === 'cargo'
      ? (dkd_queue_source_stats_value?.cargo || dkd_empty_stats_value)
      : (dkd_queue_source_stats_value?.business || dkd_empty_stats_value);
  }, [dkd_queue_source_filter_value, dkd_queue_source_stats_value]);

  const dkd_logistics_order_stats_value = useMemo(() => {
    const dkd_active_count_value = dkd_logistics_jobs_value.filter((dkd_job_value) => dkd_is_logistics_job_active_value(dkd_job_value)).length;
    const dkd_offer_count_value = dkd_logistics_offers_value.length;
    return {
      total: dkd_logistics_jobs_value.length,
      active: dkd_active_count_value,
      offers: dkd_offer_count_value,
    };
  }, [dkd_logistics_jobs_value, dkd_logistics_offers_value]);

  const dkd_order_pool_channel_cards_value = useMemo(() => ([
    {
      dkd_key_value: 'business',
      dkd_title_value: 'İşletme Siparişleri',
      dkd_subtitle_value: 'Mağaza, market ve işletme teslimatları.',
      dkd_meta_value: `${dkd_queue_source_stats_value?.business?.new || 0} yeni`,
      dkd_icon_value: 'storefront-outline',
      dkd_colors_value: ['#71E8FF', '#7190FF', '#B66DFF'],
    },
    {
      dkd_key_value: 'cargo',
      dkd_title_value: 'Kargo Siparişleri',
      dkd_subtitle_value: 'Gönderici-alıcı kargo operasyonları.',
      dkd_meta_value: `${dkd_queue_source_stats_value?.cargo?.new || 0} yeni`,
      dkd_icon_value: 'cube-send',
      dkd_colors_value: ['#79FFE2', '#35D7A7', '#10906D'],
    },
    {
      dkd_key_value: 'urgent',
      dkd_title_value: 'Acil Kurye Siparişleri',
      dkd_subtitle_value: 'Hızlı teslimat teklifleri ve canlı hat.',
      dkd_meta_value: 'Acil hat',
      dkd_icon_value: 'bike-fast',
      dkd_colors_value: ['#FFD85F', '#FF5E95', '#8CF2FF'],
    },
    {
      dkd_key_value: 'logistics',
      dkd_title_value: 'Nakliye Siparişleri',
      dkd_subtitle_value: 'Taşıma işleri, bütçe ve teklif akışı.',
      dkd_meta_value: `${dkd_logistics_order_stats_value.active || 0} açık`,
      dkd_icon_value: 'truck-delivery-outline',
      dkd_colors_value: ['#69E7FF', '#52F2A1', '#FFD166'],
    },
  ]), [dkd_logistics_order_stats_value.active, dkd_queue_source_stats_value?.business?.new, dkd_queue_source_stats_value?.cargo?.new]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'new') return dkd_source_filtered_tasks_value.filter((dkd_task_value) => !['completed', 'cancelled'].includes(jobPhase(dkd_task_value)));
    if (statusFilter === 'completed') return dkd_source_filtered_tasks_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'completed');
    if (statusFilter === 'cancelled') return dkd_source_filtered_tasks_value.filter((dkd_task_value) => jobPhase(dkd_task_value) === 'cancelled');
    return dkd_source_filtered_tasks_value;
  }, [dkd_source_filtered_tasks_value, statusFilter]);

  const dkd_visible_tasks_value = useMemo(() => filteredTasks.slice(0, dkd_visible_task_limit_value), [dkd_visible_task_limit_value, filteredTasks]);
  const dkd_has_more_tasks_value = filteredTasks.length > dkd_visible_tasks_value.length;

  useEffect(() => {
    setDkdVisibleTaskLimitValue(2);
  }, [dkd_queue_source_filter_value, statusFilter]);

  useEffect(() => {
    if (!dkd_cargo_panel_task_value?.id) return;
    const dkd_fresh_task_value = tasks.find((dkd_task_row_value) => String(dkd_task_row_value?.id || '') === String(dkd_cargo_panel_task_value?.id || ''));
    if (dkd_fresh_task_value) setDkdCargoPanelTaskValue(dkd_fresh_task_value);
  }, [tasks, dkd_cargo_panel_task_value?.id]);

  useEffect(() => {
    if (!dkd_business_mapbox_route_task_value?.id) return;
    const dkd_fresh_task_value = tasks.find((dkd_task_row_value) => String(dkd_task_row_value?.id || '') === String(dkd_business_mapbox_route_task_value?.id || ''));
    if (dkd_fresh_task_value) setDkdBusinessMapboxRouteTaskValue(dkd_fresh_task_value);
  }, [tasks, dkd_business_mapbox_route_task_value?.id]);

  const handleAccept = useCallback(async (taskId) => {
    setSavingId(String(taskId));
    try {
      const { data, error } = await acceptCourierJob(taskId, currentLocation);
      if (error) throw error;
      const dkd_now_value = new Date().toISOString();
      setDkdAutoAssignedJobIdValue(null);
      setProfile?.((dkd_previous_profile_value) => (
        dkd_previous_profile_value
          ? { ...dkd_previous_profile_value, dkd_courier_auto_assigned_job_id: null }
          : dkd_previous_profile_value
      ));
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
      setStatusFilter('new');
      setTimeout(() => { loadJobs({ dkd_force_refresh: true }); }, 900);
      Alert.alert('Kurye', 'Görev kabul edildi. Yeni Sipariş filtresi güncellendi; aktif görevin kartında görünecek.');
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Görev kabul edilemedi.');
    } finally {
      setSavingId(null);
    }
  }, [currentLocation, loadJobs, profile?.user_id, setProfile]);

  const dkd_handle_reject_offer_value = useCallback((dkd_task_value) => {
    if (!dkd_task_value?.id) return;
    Alert.alert('Siparişi reddet', 'Bu otomatik atama havuza geri bırakılacak ve başka kuryeye atanabilecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          const dkd_job_id_value = dkd_task_value?.id;
          setSavingId(String(dkd_job_id_value || ''));
          try {
            const { error: dkd_reject_error_value } = await dkd_reject_courier_job(dkd_job_id_value);
            if (dkd_reject_error_value) throw dkd_reject_error_value;
            setDkdAutoAssignedJobIdValue(null);
            setTasks((dkd_previous_rows_value) => (Array.isArray(dkd_previous_rows_value) ? dkd_previous_rows_value : []).filter((dkd_row_value) => String(dkd_row_value?.id || '') !== String(dkd_job_id_value || '')));
            setProfile?.((dkd_previous_profile_value) => (dkd_previous_profile_value ? { ...dkd_previous_profile_value, dkd_courier_auto_assigned_job_id: null } : dkd_previous_profile_value));
            setTimeout(() => { loadJobs({ dkd_force_refresh: true }); }, 650);
            Alert.alert('Kurye', 'Sipariş reddedildi. Başka kurye için yeniden havuza bırakıldı.');
          } catch (dkd_error_value) {
            Alert.alert('Kurye', dkd_error_value?.message || 'Sipariş reddedilemedi.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  }, [loadJobs, setProfile]);

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
          } catch {
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
      setTimeout(() => { loadJobs({ dkd_force_refresh: true }); }, 900);
      Alert.alert('Kurye', `Teslimat tamamlandı. +${Number(task?.reward_score || 0)} skor • +${feeTl.toFixed(0)} TL cüzdana işlendi. En yakın sipariş araması tekrar başladı.`);
    } catch (dkd_error_value) {
      Alert.alert('Kurye', dkd_error_value?.message || 'Teslimat kaydedilemedi.');
    } finally {
      setSavingId(null);
    }
  }, [currentLocation, geocodeCache, loadJobs, profile, setProfile]);

  const dkd_admin_delete_courier_job_value = useCallback((dkd_task_value) => {
    if (!isAdmin || !dkd_task_value?.id) return;
    Alert.alert('Siparişi SİL', 'Bu sipariş admin tarafından silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'SİL',
        style: 'destructive',
        onPress: async () => {
          const dkd_job_id_value = dkd_task_value?.id;
          setSavingId(String(dkd_job_id_value || ''));
          try {
            const { error: dkd_error_value } = await deleteAdminCourierJob(dkd_job_id_value);
            if (dkd_error_value) throw dkd_error_value;
            setTasks((dkd_previous_rows_value) => (Array.isArray(dkd_previous_rows_value) ? dkd_previous_rows_value : []).filter((dkd_row_value) => String(dkd_row_value?.id || '') !== String(dkd_job_id_value || '')));
            Alert.alert('Admin', 'Sipariş silindi.');
          } catch (dkd_error_value) {
            Alert.alert('Admin', dkd_error_value?.message || 'Sipariş silinemedi.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  }, [isAdmin]);

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

  const dkd_open_business_mapbox_route_value = useCallback((dkd_task_value) => {
    if (!dkd_task_value || dkd_is_cargo_task(dkd_task_value)) return;
    setDkdBusinessMapboxRouteTaskValue(dkd_task_value);
  }, []);

  const dkd_close_business_mapbox_route_value = useCallback(() => {
    setDkdBusinessMapboxRouteTaskValue(null);
  }, []);

  const dkd_refresh_business_mapbox_route_value = useCallback(async () => {
    setDkdBusinessMapboxRouteRefreshingValue(true);
    try {
      await loadJobs();
    } finally {
      setDkdBusinessMapboxRouteRefreshingValue(false);
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
              dkd_country: String(data?.country || applicationDraft.country || 'Türkiye'),
              dkd_city: String(data?.city || applicationDraft.city || 'Ankara'),
              dkd_region: String(data?.zone || applicationDraft.zone || ''),
              courier_city: String(data?.city || applicationDraft.city || 'Ankara'),
              courier_zone: String(data?.zone || applicationDraft.zone || ''),
              courier_vehicle_type: String(data?.vehicle_type || applicationDraft.vehicleType || 'moto'),
              courier_profile_meta: {
                ...(prev?.courier_profile_meta || {}),
                dkd_country: String(data?.country || applicationDraft.country || 'Türkiye'),
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
      dkd_courier_approved_value={courierApproved || isAdmin}
      dkd_is_admin_value={isAdmin}
      dkd_default_tab_value={dkd_urgent_panel_mode_value === 'queue_only' ? 'courier' : 'create'}
      dkd_queue_only_value={dkd_urgent_panel_mode_value === 'queue_only'}
      dkd_on_wallet_after_payment_value={dkd_sync_wallet_after_cargo_payment_value}
    />
  );

  const dkd_profile_card_node_value = (
    <View style={styles.dkdCourierProfileStatusPressable}>
      <LinearGradient
        colors={['rgba(100,226,255,0.27)', 'rgba(118,125,255,0.23)', 'rgba(176,102,255,0.20)', 'rgba(8,18,34,0.98)']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={styles.dkdCourierProfileStatusCard}
      >
        <View style={styles.dkdCourierProfileStatusTopRow}>
          <LinearGradient
            colors={['#62E6FF', '#7C84FF', '#B66DFF']}
            start={dkd_make_native_axis_point(0, 0)}
            end={dkd_make_native_axis_point(1, 1)}
            style={styles.dkdCourierProfileStatusIconShell}
          >
            <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.dkdCourierProfileStatusCopy}>
            <Text style={styles.dkdCourierProfileStatusTitle}>Kurye Profili</Text>
            <Text style={styles.dkdCourierProfileStatusSubtitle}>Teslimat performansını buradan takip et.</Text>
          </View>
          <Pressable hitSlop={10} onPress={() => setProfileVisible(true)} style={styles.dkdCourierProfileDetailBadgePressable}>
            <Animated.View style={[styles.dkdCourierProfileDetailBadgeMotion, { transform: [{ scale: dkd_order_mode_icon_halo_scale_value }] }]}>
              <LinearGradient
                colors={['#FFD85F', '#7CF8FF', '#B66DFF', '#52F2A1']}
                start={dkd_make_native_axis_point(0, 0)}
                end={dkd_make_native_axis_point(1, 1)}
                style={styles.dkdCourierProfileStatusChip}
              >
                <MaterialCommunityIcons name="chart-box-outline" size={16} color="#06111A" />
                <Text style={styles.dkdCourierProfileStatusChipText}>Detay</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.dkdCourierProfileXpPanel}>
          <View style={styles.heroXpTopRow}>
            <Text style={styles.heroXpLabel}>Kurye XP • {courierRegionLabel(profile)}</Text>
            <Text style={styles.heroXpLevel}>Seviye {courierProgress.level}</Text>
          </View>
          <View style={styles.heroXpTrack}>
            <LinearGradient colors={['#61D8FF', '#7E8BFF', '#C07BFF', '#61F2AE']} start={dkd_make_native_axis_point(0, 0.5)} end={dkd_make_native_axis_point(1, 0.5)} style={[styles.heroXpFill, { width: String(Math.max(8, courierProgress.progressPct)) + '%' }]} />
          </View>
          <Text style={styles.heroXpMeta}>{courierProgress.progressXp}/{courierProgress.levelGoal} XP • %{courierProgress.progressPct}</Text>
          <Text style={styles.heroXpRewardLine}>Sonraki seviye: +{nextCourierReward.token} Token • +{nextCourierReward.shards} Shard • +{nextCourierReward.xp} XP</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const dkd_render_order_pool_business_cargo_value = () => (
    <>
      <View style={styles.dkdOrderPoolFilterPanel}>
        <LinearGradient
          colors={dkd_queue_source_filter_value === 'cargo' ? ['rgba(121,255,226,0.22)', 'rgba(16,144,109,0.12)'] : ['rgba(140,242,255,0.22)', 'rgba(113,144,255,0.12)']}
          start={dkd_make_native_axis_point(0, 0)}
          end={dkd_make_native_axis_point(1, 1)}
          style={styles.dkdOrderPoolFilterHeader}
        >
          <View style={styles.dkdOrderPoolFilterHeaderIcon}>
            <MaterialCommunityIcons name={dkd_queue_source_filter_value === 'cargo' ? 'cube-send' : 'storefront-outline'} size={22} color="#06111A" />
          </View>
          <View style={styles.dkdOrderPoolFilterHeaderCopy}>
            <Text style={styles.dkdOrderPoolFilterKicker}>OPERASYON FİLTRESİ</Text>
            <Text style={styles.queueTitle}>{dkd_queue_source_filter_value === 'cargo' ? 'Kargo Siparişleri' : 'İşletme Siparişleri'}</Text>
            <Text style={styles.dkdOrderPoolFilterSubtext}>Yeni, biten ve iptal görevleri bu bölümde ayrılır.</Text>
          </View>
          <View style={styles.dkdOrderPoolFilterTotalBadge}>
            <Text style={styles.dkdOrderPoolFilterTotalNumber}>{filteredTasks.length}</Text>
            <Text style={styles.dkdOrderPoolFilterTotalText}>görev</Text>
          </View>
        </LinearGradient>
        <View style={styles.queueFilterRow}>
          <Pressable onPress={() => setStatusFilter('new')} style={[styles.queueFilterChip, styles.dkdQueueFilterChipNew, statusFilter === 'new' && styles.dkdQueueFilterChipNewActive]}>
            {statusFilter === 'new' ? <LinearGradient colors={['#8CF2FF', '#7BFFD9', '#FFE59A']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={styles.dkdQueueFilterChipFill} /> : null}
            <MaterialCommunityIcons name="bell-plus-outline" size={15} color={statusFilter === 'new' ? '#06111A' : 'rgba(231,241,255,0.76)'} />
            <Text style={[styles.queueFilterChipText, statusFilter === 'new' && styles.queueFilterChipTextActive]}>Yeni Sipariş {dkd_active_source_stats_value.new}</Text>
          </Pressable>
          <Pressable onPress={() => setStatusFilter('completed')} style={[styles.queueFilterChip, styles.dkdQueueFilterChipCompleted, statusFilter === 'completed' && styles.dkdQueueFilterChipCompletedActive]}>
            {statusFilter === 'completed' ? <LinearGradient colors={['#8CF2FF', '#7BFFD9', '#FFE59A']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={styles.dkdQueueFilterChipFill} /> : null}
            <MaterialCommunityIcons name="check-decagram-outline" size={15} color={statusFilter === 'completed' ? '#06111A' : 'rgba(231,241,255,0.76)'} />
            <Text style={[styles.queueFilterChipText, statusFilter === 'completed' && styles.queueFilterChipTextActive]}>Biten {dkd_active_source_stats_value.completed}</Text>
          </Pressable>
          <Pressable onPress={() => setStatusFilter('cancelled')} style={[styles.queueFilterChip, styles.dkdQueueFilterChipCancelled, statusFilter === 'cancelled' && styles.dkdQueueFilterChipCancelledActive]}>
            {statusFilter === 'cancelled' ? <LinearGradient colors={['#8CF2FF', '#7BFFD9', '#FFE59A']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={styles.dkdQueueFilterChipFill} /> : null}
            <MaterialCommunityIcons name="close-octagon-outline" size={15} color={statusFilter === 'cancelled' ? '#06111A' : 'rgba(231,241,255,0.76)'} />
            <Text style={[styles.queueFilterChipText, statusFilter === 'cancelled' && styles.queueFilterChipTextActive]}>İptal {dkd_active_source_stats_value.cancelled}</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}><ActivityIndicator color="#fff" /></View>
      ) : filteredTasks.length ? (
        <>
          {dkd_visible_tasks_value.map((dkd_task_value) => (
            <JobCard
              key={String(dkd_task_value?.id)}
              task={dkd_task_value}
              savingId={savingId}
              currentLocation={currentLocation}
              geocodeCache={geocodeCache}
              onAccept={handleAccept}
              onReject={dkd_handle_reject_offer_value}
              onPickedUp={dkd_open_pickup_modal_value}
              onComplete={handleComplete}
              onOpenRoute={openRoute}
              onOpenCustomerPhone={dkd_open_customer_phone_value}
              onOpenCargoPanel={dkd_open_cargo_panel_value}
              dkd_on_open_business_mapbox_route_value={dkd_open_business_mapbox_route_value}
              dkd_is_admin_value={isAdmin}
              dkd_on_admin_delete_value={dkd_admin_delete_courier_job_value}
            />
          ))}
          {dkd_has_more_tasks_value ? (
            <Pressable onPress={() => setDkdVisibleTaskLimitValue((dkd_previous_value) => dkd_previous_value + 2)} style={styles.dkdShowMoreJobsButton}>
              <LinearGradient
                colors={dkd_queue_source_filter_value === 'cargo'
                  ? ['rgba(121,255,226,0.98)', 'rgba(42,210,166,0.94)', 'rgba(17,91,72,0.98)']
                  : ['rgba(140,242,255,0.98)', 'rgba(112,143,255,0.94)', 'rgba(94,62,255,0.98)']}
                start={dkd_make_native_axis_point(0, 0)}
                end={dkd_make_native_axis_point(1, 1)}
                style={styles.dkdShowMoreJobsGradient}
              >
                <View style={styles.dkdShowMoreJobsIconShell}>
                  <MaterialCommunityIcons name="playlist-plus" size={18} color="#06111A" />
                </View>
                <View style={styles.dkdShowMoreJobsCopy}>
                  <Text style={styles.dkdShowMoreJobsText}>Daha fazla sipariş göster</Text>
                  <Text style={styles.dkdShowMoreJobsSubtext}>2 sipariş daha açılır • {filteredTasks.length - dkd_visible_tasks_value.length} kaldı</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down-circle" size={22} color="#06111A" />
              </LinearGradient>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name={dkd_queue_source_filter_value === 'cargo' ? 'cube-send' : 'storefront-outline'} size={28} color={dkd_queue_source_filter_value === 'cargo' ? dkd_colors.green : dkd_colors.cyanSoft} />
          <Text style={styles.emptyTitle}>{statusFilter === 'new' ? (dkd_queue_source_filter_value === 'cargo' ? 'Şu an yeni kargo siparişi yok' : 'Şu an yeni işletme siparişi yok') : 'Bu filtrede görev görünmüyor'}</Text>
          <Text style={styles.emptyText}>{statusFilter === 'new' ? (dkd_queue_source_filter_value === 'cargo' ? 'Kargo merkezinden açılan yeni gönderiler burada görünecek.' : 'İşletme marketinden gelen yeni teslimatlar burada görünecek.') : 'Başka bir filtre seçerek diğer operasyon kartlarını görebilirsin.'}</Text>
        </View>
      )}
    </>
  );

  const dkd_render_order_pool_logistics_value = () => (
    <View style={styles.dkdOrderPoolLogisticsPanel}>
      <View style={styles.dkdOrderPoolLogisticsHead}>
        <View>
          <Text style={styles.queueTitle}>Nakliye Siparişleri</Text>
          <Text style={styles.dkdOrderPoolFilterSubtext}>Taşıma işleri, bütçe aralığı, yük türü ve teklif sayısı burada görünür.</Text>
        </View>
        <Pressable onPress={dkd_load_logistics_order_pool_value} style={styles.dkdOrderPoolMiniRefresh}>
          <MaterialCommunityIcons name="refresh" size={16} color="#06111A" />
          <Text style={styles.dkdOrderPoolMiniRefreshText}>Yenile</Text>
        </Pressable>
      </View>

      <View style={styles.dkdOrderPoolLogisticsStatsRow}>
        <View style={styles.dkdOrderPoolLogisticsStatPill}><Text style={styles.dkdOrderPoolLogisticsStatText}>Açık {dkd_logistics_order_stats_value.active}</Text></View>
        <View style={styles.dkdOrderPoolLogisticsStatPill}><Text style={styles.dkdOrderPoolLogisticsStatText}>Teklif {dkd_logistics_order_stats_value.offers}</Text></View>
        <View style={styles.dkdOrderPoolLogisticsStatPill}><Text style={styles.dkdOrderPoolLogisticsStatText}>Toplam {dkd_logistics_order_stats_value.total}</Text></View>
      </View>

      {dkd_logistics_loading_value ? (
        <View style={styles.loaderWrap}><ActivityIndicator color="#fff" /></View>
      ) : dkd_logistics_jobs_value.length ? (
        dkd_logistics_jobs_value.slice(0, 12).map((dkd_job_value) => {
          const dkd_job_id_value = String(dkd_job_value?.id || dkd_job_value?.dkd_id || '');
          const dkd_job_offer_count_value = dkd_logistics_offers_value.filter((dkd_offer_value) => String(dkd_offer_value?.dkd_job_id || '') === dkd_job_id_value).length;
          return (
            <Pressable key={dkd_job_id_value || `${dkd_job_value?.dkd_created_at || 'dkd_logistics_job'}`} onPress={() => dkd_open_logistics_center_value('jobs')} style={styles.dkdOrderPoolLogisticsJobPressable}>
              <LinearGradient
                colors={dkd_is_logistics_job_active_value(dkd_job_value) ? ['rgba(105,231,255,0.20)', 'rgba(82,242,161,0.14)', 'rgba(10,28,48,0.98)'] : ['rgba(255,255,255,0.08)', 'rgba(20,30,46,0.94)']}
                start={dkd_make_native_axis_point(0, 0)}
                end={dkd_make_native_axis_point(1, 1)}
                style={styles.dkdOrderPoolLogisticsJobCard}
              >
                <View style={styles.dkdOrderPoolLogisticsJobTop}>
                  <View style={styles.dkdOrderPoolLogisticsJobIcon}>
                    <MaterialCommunityIcons name="truck-delivery-outline" size={22} color="#06111A" />
                  </View>
                  <View style={styles.dkdOrderPoolLogisticsJobCopy}>
                    <Text style={styles.dkdOrderPoolLogisticsJobTitle}>{dkd_job_value?.dkd_cargo_type || 'Nakliye işi'}</Text>
                    <Text style={styles.dkdOrderPoolLogisticsJobSub}>{dkd_job_value?.dkd_pickup_address || 'Alış adresi'} → {dkd_job_value?.dkd_dropoff_address || 'Teslimat adresi'}</Text>
                  </View>
                  <View style={styles.dkdOrderPoolLogisticsJobBadge}>
                    <Text style={styles.dkdOrderPoolLogisticsJobBadgeText}>{dkd_logistics_job_status_label_value(dkd_job_value?.dkd_status || dkd_job_value?.status)}</Text>
                  </View>
                </View>
                <View style={styles.dkdOrderPoolLogisticsJobMetaRow}>
                  <View style={styles.dkdOrderPoolLogisticsJobMeta}><MaterialCommunityIcons name="cash-multiple" size={14} color="#8CF2FF" /><Text style={styles.dkdOrderPoolLogisticsJobMetaText}>{dkd_logistics_budget_text_value(dkd_job_value)}</Text></View>
                  <View style={styles.dkdOrderPoolLogisticsJobMeta}><MaterialCommunityIcons name="account-hard-hat-outline" size={14} color="#8CF2FF" /><Text style={styles.dkdOrderPoolLogisticsJobMetaText}>{Number(dkd_job_value?.dkd_helper_count || 0)} eleman</Text></View>
                  <View style={styles.dkdOrderPoolLogisticsJobMeta}><MaterialCommunityIcons name="message-processing-outline" size={14} color="#8CF2FF" /><Text style={styles.dkdOrderPoolLogisticsJobMetaText}>{dkd_job_offer_count_value} teklif</Text></View>
                </View>
                <Text style={styles.dkdOrderPoolLogisticsJobNote}>{dkd_job_value?.dkd_scheduled_at || 'Zaman planı bekleniyor'} • {dkd_job_value?.dkd_vehicle_need || 'Araç ihtiyacı seçilmedi'}</Text>
              </LinearGradient>
            </Pressable>
          );
        })
      ) : (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={30} color="#8CF2FF" />
          <Text style={styles.emptyTitle}>Şu an nakliye siparişi yok</Text>
          <Text style={styles.emptyText}>Nakliye/Lojistik merkezinden oluşturulan taşıma işleri burada listelenecek.</Text>
        </View>
      )}
    </View>
  );

  const dkd_render_order_pool_page_value = () => (
    <Modal visible={visible && dkd_order_pool_page_visible_value} animationType="slide" transparent={false} onRequestClose={dkd_close_order_pool_page_value}>
      <StatusBar barStyle="light-content" />
      <SafeScreen style={styles.screen}>
        <LinearGradient colors={['#030B16', '#071525', '#090B18']} style={styles.screen}>
          <ScrollView contentContainerStyle={styles.dkdOrderPoolPageContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <LinearGradient
              colors={['rgba(12,76,118,0.99)', 'rgba(20,41,100,0.99)', 'rgba(95,38,111,0.98)', 'rgba(5,12,24,0.99)']}
              start={dkd_make_native_axis_point(0, 0)}
              end={dkd_make_native_axis_point(1, 1)}
              style={styles.dkdOrderPoolHero}
            >
              <View pointerEvents="none" style={styles.dkdOrderPoolHeroAuraOne} />
              <View pointerEvents="none" style={styles.dkdOrderPoolHeroAuraTwo} />
              <View style={styles.dkdOrderPoolHeroTopRow}>
                <Pressable onPress={dkd_close_order_pool_page_value} style={styles.dkdOrderPoolBackButton}>
                  <MaterialCommunityIcons name="arrow-left-bold" size={20} color="#06111A" />
                </Pressable>
                <View style={styles.dkdOrderPoolHeroCopy}>
                  <View style={styles.dkdOrderPoolEyebrowRow}>
                    <MaterialCommunityIcons name="radar" size={13} color="#8CF2FF" />
                    <Text style={styles.dkdOrderPoolEyebrow}>CANLI OPERASYON MERKEZİ</Text>
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.dkdOrderPoolTitle}>Sipariş Havuzu</Text>
                </View>
                <LinearGradient
                  colors={['#8CF2FF', '#7BFFD9', '#FFE59A']}
                  start={dkd_make_native_axis_point(0, 0)}
                  end={dkd_make_native_axis_point(1, 1)}
                  style={styles.dkd_order_pool_hero_icon_badge}
                >
                  <MaterialCommunityIcons name="clipboard-list-outline" size={29} color="#06111A" />
                </LinearGradient>
              </View>
              <View style={styles.dkdOrderPoolHeroActionRow}>
                <View style={styles.dkdOrderPoolHeroActivePill}>
                  <MaterialCommunityIcons name="cursor-default-click-outline" size={14} color="#06111A" />
                  <Text style={styles.dkdOrderPoolHeroActivePillText}>Aktif: {dkd_order_pool_channel_cards_value.find((dkd_channel_item_value) => dkd_channel_item_value.dkd_key_value === dkd_order_pool_source_value)?.dkd_title_value || 'İşletme Siparişleri'}</Text>
                </View>
              </View>
              <View style={styles.dkdOrderPoolHeroStatsRow}>
                <View style={styles.dkdOrderPoolHeroStat}>
                  <MaterialCommunityIcons name="storefront-outline" size={17} color="#8CF2FF" />
                  <View style={styles.dkdOrderPoolHeroStatCopy}><Text style={styles.dkdOrderPoolHeroStatNumber}>{dkd_queue_source_stats_value?.business?.new || 0}</Text><Text style={styles.dkdOrderPoolHeroStatText}>İşletme yeni</Text></View>
                </View>
                <View style={styles.dkdOrderPoolHeroStat}>
                  <MaterialCommunityIcons name="cube-send" size={17} color="#7BFFD9" />
                  <View style={styles.dkdOrderPoolHeroStatCopy}><Text style={styles.dkdOrderPoolHeroStatNumber}>{dkd_queue_source_stats_value?.cargo?.new || 0}</Text><Text style={styles.dkdOrderPoolHeroStatText}>Kargo yeni</Text></View>
                </View>
                <View style={styles.dkdOrderPoolHeroStat}>
                  <MaterialCommunityIcons name="bike-fast" size={17} color="#FFD85F" />
                  <View style={styles.dkdOrderPoolHeroStatCopy}><Text style={styles.dkdOrderPoolHeroStatNumber}>Acil</Text><Text style={styles.dkdOrderPoolHeroStatText}>Kurye hattı</Text></View>
                </View>
                <View style={styles.dkdOrderPoolHeroStat}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={17} color="#52F2A1" />
                  <View style={styles.dkdOrderPoolHeroStatCopy}><Text style={styles.dkdOrderPoolHeroStatNumber}>{dkd_logistics_order_stats_value.active || 0}</Text><Text style={styles.dkdOrderPoolHeroStatText}>Nakliye açık</Text></View>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.dkdOrderPoolChannelGrid}>
              {dkd_order_pool_channel_cards_value.map((dkd_channel_value) => {
                const dkd_channel_active_value = dkd_order_pool_source_value === dkd_channel_value.dkd_key_value;
                const dkd_channel_text_color_value = dkd_channel_active_value ? '#06111A' : '#EAFBFF';
                return (
                  <Pressable key={dkd_channel_value.dkd_key_value} onPress={() => dkd_open_order_pool_page_value(dkd_channel_value.dkd_key_value)} style={styles.dkdOrderPoolChannelPressable}>
                    <LinearGradient
                      colors={dkd_channel_active_value ? [...dkd_channel_value.dkd_colors_value, '#F6FEFF'] : ['rgba(20,44,72,0.98)', 'rgba(12,24,48,0.98)', 'rgba(7,13,28,0.99)']}
                      start={dkd_make_native_axis_point(0, 0)}
                      end={dkd_make_native_axis_point(1, 1)}
                      style={[styles.dkdOrderPoolChannelCard, dkd_channel_active_value && styles.dkdOrderPoolChannelCardActive]}
                    >
                      <View pointerEvents="none" style={[styles.dkdOrderPoolChannelGlow, dkd_channel_active_value && styles.dkdOrderPoolChannelGlowActive]} />
                      <View style={styles.dkdOrderPoolChannelTopLine}>
                        <View style={[styles.dkdOrderPoolChannelIcon, dkd_channel_active_value && styles.dkdOrderPoolChannelIconActive]}>
                          <MaterialCommunityIcons name={dkd_channel_value.dkd_icon_value} size={23} color={dkd_channel_text_color_value} />
                        </View>
                        <View style={[styles.dkdOrderPoolChannelStatusPill, dkd_channel_active_value && styles.dkdOrderPoolChannelStatusPillActive]}>
                          <MaterialCommunityIcons name={dkd_channel_active_value ? 'check-circle-outline' : 'cursor-default-click-outline'} size={12} color={dkd_channel_active_value ? '#06111A' : '#CFF8FF'} />
                          <Text style={[styles.dkdOrderPoolChannelStatusText, dkd_channel_active_value && styles.dkdOrderPoolChannelStatusTextActive]}>{dkd_channel_active_value ? 'AKTİF' : 'AÇ'}</Text>
                        </View>
                      </View>
                      <Text style={[styles.dkdOrderPoolChannelTitle, dkd_channel_active_value && styles.dkdOrderPoolChannelTitleActive]}>{dkd_channel_value.dkd_title_value}</Text>
                      <Text style={[styles.dkdOrderPoolChannelSub, dkd_channel_active_value && styles.dkdOrderPoolChannelSubActive]}>{dkd_channel_value.dkd_subtitle_value}</Text>
                      <View style={styles.dkdOrderPoolChannelBottomRow}>
                        <View style={[styles.dkdOrderPoolChannelMeta, dkd_channel_active_value && styles.dkdOrderPoolChannelMetaActive]}>
                          <Text style={[styles.dkdOrderPoolChannelMetaText, dkd_channel_active_value && styles.dkdOrderPoolChannelMetaTextActive]}>{dkd_channel_value.dkd_meta_value}</Text>
                        </View>
                        <View style={[styles.dkdOrderPoolChannelOpenPill, dkd_channel_active_value && styles.dkdOrderPoolChannelOpenPillActive]}>
                          <Text style={[styles.dkdOrderPoolChannelOpenText, dkd_channel_active_value && styles.dkdOrderPoolChannelOpenTextActive]}>Panel</Text>
                          <MaterialCommunityIcons name="chevron-right" size={15} color={dkd_channel_active_value ? '#06111A' : '#8CF2FF'} />
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>

            {dkd_order_pool_source_value === 'urgent' ? (
              <DkdUrgentCourierPanel
                dkd_visible_value={visible && dkd_order_pool_page_visible_value && dkd_order_pool_source_value === 'urgent'}
                dkd_profile_value={profile}
                dkd_courier_approved_value={courierApproved || isAdmin}
                dkd_is_admin_value={isAdmin}
                dkd_default_tab_value="courier"
                dkd_queue_only_value
                dkd_on_wallet_after_payment_value={dkd_sync_wallet_after_cargo_payment_value}
              />
            ) : dkd_order_pool_source_value === 'logistics' ? (
              dkd_render_order_pool_logistics_value()
            ) : (
              dkd_render_order_pool_business_cargo_value()
            )}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );

  return (
    <Modal visible={visible} animationType="none" transparent={false} hardwareAccelerated statusBarTranslucent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeScreen style={styles.screen}>
        <LinearGradient colors={['#05111D', '#081629', '#050912']} style={styles.screen}>
          <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {courierApproved ? (
            !dkd_deferred_modal_content_ready_value ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                <ActivityIndicator size="large" color="#67E8F9" />
                <Text style={{ marginTop: 14, color: 'rgba(231,241,255,0.78)', fontSize: 15, fontWeight: '700' }}>Kurye merkezi açılıyor...</Text>
              </View>
            ) : (
              <ScrollView ref={dkd_center_scroll_view_ref_value} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled removeClippedSubviews={false}>
              <SkylineHeroCard
                title="Kurye-Kargo/Destek Merkezi"
                titleStyle={styles.dkd_center_hero_title}
                icon="truck-fast-outline"
                tone="green"
                onRefresh={loadJobs}
                onClose={onClose}
              >
              </SkylineHeroCard>

              <DkdCourierOnlineControl
                dkd_online_value={dkd_courier_online_flag_value}
                dkd_busy_value={dkd_courier_online_busy_value}
                dkd_on_toggle_value={dkd_apply_courier_online_state_value}
                dkd_assigned_job_id_value={dkd_auto_assigned_job_id_value}
                dkd_has_active_delivery_value={dkd_has_active_delivery_value}
                dkd_profile_panel_node_value={dkd_profile_card_node_value}
                dkd_force_details_open_value={dkd_initial_panel_value === 'online_search'}
              />

              <View style={styles.dkdCenterQuickGrid}>
                <Pressable onPress={() => { setDkdCargoPanelModeValue('create'); setDkdCenterTabValue('cargo_panel'); dkd_scroll_center_panel_once_value(); }} style={styles.dkdCenterQuickCardPressable}>
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

                <Pressable onPress={() => dkd_open_logistics_center_value('create')} style={styles.dkdCenterQuickCardPressable}>
                  <LinearGradient
                    colors={['rgba(96,172,255,0.22)', 'rgba(82,242,161,0.18)', 'rgba(12,30,54,0.96)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={styles.dkdCenterQuickCard}
                  >
                    <View style={styles.dkdCenterQuickCardTopRow}>
                      <LinearGradient
                        colors={['#69E7FF', '#52F2A1', '#FFD166']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdCenterQuickIconShell}
                      >
                        <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#083224" />
                      </LinearGradient>
                      <View style={styles.dkdCenterQuickStatusChip}>
                        <Text style={styles.dkdCenterQuickStatusText}>Taşıma</Text>
                      </View>
                    </View>
                    <View style={styles.dkdCenterQuickTextStack}>
                      <Text style={styles.dkdCenterQuickEyebrow}>NAKLİYE MODU</Text>
                      <Text style={styles.dkdCenterQuickTitle}>Nakliye/Lojistik</Text>
                      <Text style={styles.dkdCenterQuickSubtitle}>Taşıma işi oluştur, teklifleri ve pazarlığı yönet.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.dkd_modern_center_tab_row}>
                <Pressable onPress={() => dkd_open_order_pool_page_value('business')} style={styles.dkd_modern_center_tab_pressable}>
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
                        <View style={styles.dkdOrderPoolModernBadgeRow}>
                          <LinearGradient
                            colors={['rgba(117,255,214,0.98)', 'rgba(84,169,255,0.94)', 'rgba(124,111,255,0.92)']}
                            start={dkd_make_native_axis_point(0, 0)}
                            end={dkd_make_native_axis_point(1, 1)}
                            style={styles.dkdOrderPoolModernBadge}
                          >
                            <MaterialCommunityIcons name="playlist-check" size={13} color="#06111A" />
                            <Text style={styles.dkdOrderPoolModernBadgeText}>Akış Kontrolü</Text>
                          </LinearGradient>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>

                <Pressable onPress={() => { setDkdUrgentPanelModeValue('default'); setDkdCenterTabValue('urgent'); dkd_scroll_center_panel_once_value(); }} style={styles.dkd_modern_center_tab_pressable}>
                  <Animated.View
                    style={[
                      styles.dkdOrderModeCardMotionLayer,
                      dkd_center_tab_value === 'urgent' && {
                        transform: [
                          { translateY: dkd_order_mode_translate_y_value },
                          { scale: dkd_order_mode_scale_value },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={dkd_center_tab_value === 'urgent'
                        ? ['rgba(255,221,94,0.46)', 'rgba(255,82,132,0.42)', 'rgba(111,239,255,0.28)', 'rgba(54,16,64,0.98)']
                        : ['rgba(68,38,78,0.98)', 'rgba(45,18,52,0.96)', 'rgba(9,16,30,0.96)']}
                      start={dkd_make_native_axis_point(0, 0)}
                      end={dkd_make_native_axis_point(1, 1)}
                      style={[styles.dkd_modern_center_tab_card, styles.dkdUrgentDeliveryTabCard, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_card_urgent_active]}
                    >
                      <Animated.View pointerEvents="none" style={[styles.dkdUrgentDeliveryPulseOrb, { opacity: dkd_center_tab_value === 'urgent' ? dkd_order_mode_icon_halo_opacity_value : 0 }]} />
                      <Animated.View pointerEvents="none" style={[styles.dkdOrderModeCardAura, styles.dkdUrgentCardAura, { opacity: dkd_center_tab_value === 'urgent' ? dkd_order_mode_glow_opacity_value : 0 }]} />
                      <Animated.View pointerEvents="none" style={[styles.dkdOrderModeCardOutline, styles.dkdUrgentCardOutline, { opacity: dkd_center_tab_value === 'urgent' ? dkd_order_mode_outline_opacity_value : 0 }]} />
                      <Animated.View pointerEvents="none" style={[styles.dkdOrderModeCardScanWrap, styles.dkdUrgentScanWrap, { opacity: dkd_center_tab_value === 'urgent' ? dkd_order_mode_scan_opacity_value : 0, transform: [{ translateX: dkd_order_mode_scan_translate_x_value }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,241,130,0.44)', 'rgba(255,82,132,0.72)', 'rgba(108,242,255,0.58)', 'rgba(255,255,255,0)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={styles.dkdOrderModeCardScanBand} />
                      </Animated.View>
                      <View style={styles.dkd_modern_center_tab_card_top_row}>
                        <View style={styles.dkdOrderModeCardIconWrap}>
                          <Animated.View pointerEvents="none" style={[styles.dkdOrderModeCardIconHalo, styles.dkdUrgentIconHalo, { opacity: dkd_center_tab_value === 'urgent' ? dkd_order_mode_icon_halo_opacity_value : 0, transform: [{ scale: dkd_order_mode_icon_halo_scale_value }] }]} />
                          <LinearGradient
                            colors={dkd_center_tab_value === 'urgent' ? ['#FFD85F', '#FF5E95', '#8CF2FF'] : ['rgba(255,216,95,0.24)', 'rgba(255,94,149,0.18)', 'rgba(140,242,255,0.12)']}
                            start={dkd_make_native_axis_point(0, 0)}
                            end={dkd_make_native_axis_point(1, 1)}
                            style={styles.dkd_modern_center_tab_icon_shell}
                          >
                            <MaterialCommunityIcons name="bike-fast" size={21} color="#07131C" />
                          </LinearGradient>
                        </View>
                        <View style={[styles.dkd_modern_center_tab_status_chip, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_status_chip_urgent_active]}>
                          <Text style={[styles.dkd_modern_center_tab_status_text, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_status_text_active]}>Acil Hat</Text>
                        </View>
                      </View>
                      <View style={styles.dkd_modern_center_tab_text_stack}>
                        <Text style={styles.dkd_modern_center_tab_eyebrow}>ACİL TESLİMAT</Text>
                        <Text style={[styles.dkd_modern_center_tab_title, dkd_center_tab_value === 'urgent' && styles.dkd_modern_center_tab_title_active]}>Acil Kurye</Text>
                        <Text style={styles.dkd_modern_center_tab_subtitle}>Market, Fırın, Eczane gibi bütün ihtiyaçlarınız kapınıza gelsin.</Text>
                        <View style={styles.dkdUrgentMiniSignalRow}>
                          <View style={styles.dkdUrgentMiniSignalPill}><MaterialCommunityIcons name="radar" size={12} color="#08111D" /><Text style={styles.dkdUrgentMiniSignalText}>Canlı takip</Text></View>
                          <View style={styles.dkdUrgentMiniSignalPill}><MaterialCommunityIcons name="bike-fast" size={12} color="#08111D" /><Text style={styles.dkdUrgentMiniSignalText}>Hızlı</Text></View>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>
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
                      <Text style={styles.dkdQueueSourceText}>Mağazalar üzerinden gelen bütün teslimatları buradan yönet.</Text>
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

                <Pressable
                  onPress={() => { setDkdUrgentPanelModeValue('queue_only'); setDkdCenterTabValue('urgent'); }}
                  style={styles.dkdUrgentQueueWideCardPressable}
                >
                  <LinearGradient
                    colors={['rgba(10,18,35,0.98)', 'rgba(37,22,69,0.96)', 'rgba(11,21,42,0.98)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={styles.dkdUrgentQueueWideCard}
                  >
                    <View style={styles.dkdUrgentQueueWideIconShell}>
                      <MaterialCommunityIcons name="bike-fast" size={22} color="#08111D" />
                    </View>
                    <View style={styles.dkdUrgentQueueWideCopy}>
                      <Text style={styles.dkdUrgentQueueWideTitle}>Acil Kurye Siparişleri</Text>
                      <Text style={styles.dkdUrgentQueueWideText}>Açık teklifleri ve sipariş akışını tek dokunuşla sade bir listede görüntüle.</Text>
                    </View>
                    <View style={styles.dkdUrgentQueueWideActionPill}>
                      <Text style={styles.dkdUrgentQueueWideActionText}>Listele</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#08111D" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.queuePanelCompact}>
                <View style={styles.queuePanelCompactHead}>
                  <Text style={styles.queueTitle}>{dkd_queue_source_filter_value === 'cargo' ? 'Kargo Operasyon Filtresi' : 'İşletme Operasyon Filtresi'}</Text>
                  <Text style={styles.queueCompactMeta}>{filteredTasks.length} görev</Text>
                </View>
                <View style={styles.queueFilterRow}>
                  <Pressable onPress={() => setStatusFilter('new')} style={[styles.queueFilterChip, styles.dkdQueueFilterChipNew, statusFilter === 'new' && styles.dkdQueueFilterChipNewActive]}>
                    {statusFilter === 'new' ? (
                      <LinearGradient
                        colors={['#8CF2FF', '#7BFFD9', '#FFE59A']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdQueueFilterChipFill}
                      />
                    ) : null}
                    <MaterialCommunityIcons name="bell-plus-outline" size={15} color={statusFilter === 'new' ? '#06111A' : 'rgba(231,241,255,0.76)'} />
                    <Text style={[styles.queueFilterChipText, statusFilter === 'new' && styles.queueFilterChipTextActive]}>Yeni Sipariş {dkd_active_source_stats_value.new}</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatusFilter('completed')} style={[styles.queueFilterChip, styles.dkdQueueFilterChipCompleted, statusFilter === 'completed' && styles.dkdQueueFilterChipCompletedActive]}>
                    {statusFilter === 'completed' ? (
                      <LinearGradient
                        colors={['#8CF2FF', '#7BFFD9', '#FFE59A']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdQueueFilterChipFill}
                      />
                    ) : null}
                    <MaterialCommunityIcons name="check-decagram-outline" size={15} color={statusFilter === 'completed' ? '#06111A' : 'rgba(231,241,255,0.76)'} />
                    <Text style={[styles.queueFilterChipText, statusFilter === 'completed' && styles.queueFilterChipTextActive]}>Biten {dkd_active_source_stats_value.completed}</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatusFilter('cancelled')} style={[styles.queueFilterChip, styles.dkdQueueFilterChipCancelled, statusFilter === 'cancelled' && styles.dkdQueueFilterChipCancelledActive]}>
                    {statusFilter === 'cancelled' ? (
                      <LinearGradient
                        colors={['#8CF2FF', '#7BFFD9', '#FFE59A']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdQueueFilterChipFill}
                      />
                    ) : null}
                    <MaterialCommunityIcons name="close-octagon-outline" size={15} color={statusFilter === 'cancelled' ? '#06111A' : 'rgba(231,241,255,0.76)'} />
                    <Text style={[styles.queueFilterChipText, statusFilter === 'cancelled' && styles.queueFilterChipTextActive]}>İptal {dkd_active_source_stats_value.cancelled}</Text>
                  </Pressable>
                </View>
              </View>

              {loading ? (
                <View style={styles.loaderWrap}><ActivityIndicator color="#fff" /></View>
              ) : filteredTasks.length ? (
                <>
                  {dkd_visible_tasks_value.map((dkd_task_value) => (
                    <JobCard
                      key={String(dkd_task_value?.id)}
                      task={dkd_task_value}
                      savingId={savingId}
                      currentLocation={currentLocation}
                      geocodeCache={geocodeCache}
                      onAccept={handleAccept}
                      onReject={dkd_handle_reject_offer_value}
                      onPickedUp={dkd_open_pickup_modal_value}
                      onComplete={handleComplete}
                      onOpenRoute={openRoute}
                      onOpenCustomerPhone={dkd_open_customer_phone_value}
                      onOpenCargoPanel={dkd_open_cargo_panel_value}
                      dkd_is_admin_value={isAdmin}
                      dkd_on_admin_delete_value={dkd_admin_delete_courier_job_value}
                    />
                  ))}
                  {dkd_has_more_tasks_value ? (
                    <Pressable onPress={() => setDkdVisibleTaskLimitValue((dkd_previous_value) => dkd_previous_value + 2)} style={styles.dkdShowMoreJobsButton}>
                      <LinearGradient
                        colors={dkd_queue_source_filter_value === 'cargo'
                          ? ['rgba(121,255,226,0.98)', 'rgba(42,210,166,0.94)', 'rgba(17,91,72,0.98)']
                          : ['rgba(140,242,255,0.98)', 'rgba(112,143,255,0.94)', 'rgba(94,62,255,0.98)']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdShowMoreJobsGradient}
                      >
                        <View style={styles.dkdShowMoreJobsIconShell}>
                          <MaterialCommunityIcons name="playlist-plus" size={18} color="#06111A" />
                        </View>
                        <View style={styles.dkdShowMoreJobsCopy}>
                          <Text style={styles.dkdShowMoreJobsText}>Daha fazla sipariş göster</Text>
                          <Text style={styles.dkdShowMoreJobsSubtext}>2 sipariş daha açılır • {filteredTasks.length - dkd_visible_tasks_value.length} kaldı</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-down-circle" size={22} color="#06111A" />
                      </LinearGradient>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <View style={styles.emptyWrap}>
                  <MaterialCommunityIcons name={dkd_queue_source_filter_value === 'cargo' ? 'cube-send' : 'storefront-outline'} size={28} color={dkd_queue_source_filter_value === 'cargo' ? dkd_colors.green : dkd_colors.cyanSoft} />
                  <Text style={styles.emptyTitle}>{statusFilter === 'new' ? (dkd_queue_source_filter_value === 'cargo' ? 'Şu an yeni kargo siparişi yok' : 'Şu an yeni işletme siparişi yok') : 'Bu filtrede görev görünmüyor'}</Text>
                  <Text style={styles.emptyText}>{statusFilter === 'new' ? (dkd_queue_source_filter_value === 'cargo' ? 'Kargo merkezinden açılan yeni gönderiler burada görünecek.' : 'İşletme marketinden gelen yeni teslimatlar burada görünecek.') : 'Başka bir filtre seçerek diğer operasyon kartlarını görebilirsin.'}</Text>
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
            <ScrollView ref={dkd_center_scroll_view_ref_value} contentContainerStyle={styles.applyShell} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled removeClippedSubviews={false}>
              <SkylineHeroCard
                title="Kurye-Kargo/Destek Merkezi"
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
                <Pressable onPress={() => { setDkdCargoPanelModeValue('create'); setDkdCenterTabValue('cargo_panel'); dkd_scroll_center_panel_once_value(); }} style={styles.dkdUnlockedCenterCardPressable}>
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

                <Pressable onPress={() => { setDkdUrgentPanelModeValue('default'); setDkdCenterTabValue('urgent'); dkd_scroll_center_panel_once_value(); }} style={styles.dkdUnlockedCenterCardPressable}>
                  <LinearGradient
                    colors={dkd_center_tab_value === 'urgent'
                      ? ['rgba(255,221,94,0.44)', 'rgba(255,82,132,0.38)', 'rgba(108,242,255,0.24)', 'rgba(52,22,64,0.98)']
                      : ['rgba(255,221,94,0.22)', 'rgba(255,82,132,0.18)', 'rgba(46,20,58,0.97)']}
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
                        <MaterialCommunityIcons name="bike-fast" size={20} color="#07131C" />
                      </LinearGradient>
                      <View style={[styles.dkdUnlockedCenterStatusChip, dkd_center_tab_value === 'urgent' && styles.dkdUnlockedCenterStatusChipUrgent]}>
                        <Text style={[styles.dkdUnlockedCenterStatusText, dkd_center_tab_value === 'urgent' && styles.dkdUnlockedCenterStatusTextActive]}>Acil Hat</Text>
                      </View>
                    </View>
                    <View style={styles.dkdUnlockedCenterTextStack}>
                      <Text style={styles.dkdUnlockedCenterEyebrow}>ACİL TESLİMAT</Text>
                      <Text style={styles.dkdUnlockedCenterTitle}>Acil Kurye</Text>
                      <Text style={styles.dkdUnlockedCenterSubtitle}>Market, Fırın, Eczane gibi bütün ihtiyaçlarınız kapınıza gelsin.</Text>
                      <View style={styles.dkdUrgentMiniSignalRow}>
                        <View style={styles.dkdUrgentMiniSignalPill}><MaterialCommunityIcons name="radar" size={12} color="#08111D" /><Text style={styles.dkdUrgentMiniSignalText}>Canlı takip</Text></View>
                        <View style={styles.dkdUrgentMiniSignalPill}><MaterialCommunityIcons name="bike-fast" size={12} color="#08111D" /><Text style={styles.dkdUrgentMiniSignalText}>Acil</Text></View>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => dkd_open_inline_logistics_center_value('create')} style={styles.dkdUnlockedCenterCardPressable}>
                  <LinearGradient
                    colors={['rgba(96,172,255,0.24)', 'rgba(82,242,161,0.20)', 'rgba(12,30,54,0.98)']}
                    start={dkd_make_native_axis_point(0, 0)}
                    end={dkd_make_native_axis_point(1, 1)}
                    style={styles.dkdUnlockedCenterCard}
                  >
                    <View style={styles.dkdUnlockedCenterCardTopRow}>
                      <LinearGradient
                        colors={['#69E7FF', '#52F2A1', '#FFD166']}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={styles.dkdUnlockedCenterIconShell}
                      >
                        <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#083224" />
                      </LinearGradient>
                      <View style={styles.dkdUnlockedCenterStatusChip}>
                        <Text style={styles.dkdUnlockedCenterStatusText}>Herkese Açık</Text>
                      </View>
                    </View>
                    <View style={styles.dkdUnlockedCenterTextStack}>
                      <Text style={styles.dkdUnlockedCenterEyebrow}>NAKLİYE MODU</Text>
                      <Text style={styles.dkdUnlockedCenterTitle}>Nakliye Oluştur</Text>
                      <Text style={styles.dkdUnlockedCenterSubtitle}>Normal kullanıcı olarak taşıma işi aç, teklifleri ve pazarlığı takip et.</Text>
                    </View>
                  </LinearGradient>
                </Pressable>


              </View>

              {dkd_center_tab_value === 'logistics_create' ? (
                <View style={styles.dkd_inline_logistics_center_wrap}>
                  <DkdLogisticsModal
                    dkd_visible_value={visible && dkd_center_tab_value === 'logistics_create'}
                    dkd_on_close_value={dkd_close_inline_logistics_center_value}
                    dkd_profile_value={profile}
                    dkd_initial_panel_value={dkd_inline_logistics_panel_value}
                    dkd_inline_value
                    dkd_hide_unlicensed_entry_cards_value={!courierApproved && !isAdmin}
                  />
                </View>
              ) : dkd_center_tab_value === 'cargo_panel' ? (
                dkd_render_cargo_panel_value()
              ) : dkd_center_tab_value === 'urgent' ? (
                dkd_render_urgent_panel_value()
              ) : (
              <>
              <View style={styles.applyCard}>
                <Text style={styles.applyTitle}>Detaylı kurye başvuru formu</Text>
                <Text style={styles.applyText}>
                  Ülke, şehir ve bölge seçimi zorunlu. Onay sonrası sipariş havuzun seçtiğin hizmet alanına göre filtrelenecek.
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

                <FieldLabel required>Ülke</FieldLabel>
                <View style={styles.zoneChipWrap}>
                  {dkd_courier_country_options_value.map((dkd_country_option_value) => (
                    <Pressable key={dkd_country_option_value} onPress={() => dkd_set_application_country_value(dkd_country_option_value)} style={[styles.zoneChip, applicationDraft.country === dkd_country_option_value && styles.zoneChipActive]}>
                      <Text style={[styles.zoneChipText, applicationDraft.country === dkd_country_option_value && styles.zoneChipTextActive]}>{dkd_country_option_value}</Text>
                    </Pressable>
                  ))}
                </View>

                <FieldLabel required>Şehir</FieldLabel>
                <View style={styles.zoneChipWrap}>
                  {dkd_application_city_options_value.map((dkd_city_option_value) => (
                    <Pressable key={dkd_city_option_value} onPress={() => dkd_set_application_city_value(dkd_city_option_value)} style={[styles.zoneChip, applicationDraft.city === dkd_city_option_value && styles.zoneChipActive]}>
                      <Text style={[styles.zoneChipText, applicationDraft.city === dkd_city_option_value && styles.zoneChipTextActive]}>{dkd_city_option_value === 'AbuDhabi' ? 'Abu Dhabi' : dkd_city_option_value}</Text>
                    </Pressable>
                  ))}
                </View>

                <FieldLabel required>Bölge</FieldLabel>
                <View style={styles.zoneChipWrap}>
                  {dkd_application_zone_options_value.map((dkd_zone_option_value) => (
                    <Pressable key={dkd_zone_option_value} onPress={() => setDraftField('zone', dkd_zone_option_value)} style={[styles.zoneChip, applicationDraft.zone === dkd_zone_option_value && styles.zoneChipActive]}>
                      <Text style={[styles.zoneChipText, applicationDraft.zone === dkd_zone_option_value && styles.zoneChipTextActive]}>{dkd_zone_option_value}</Text>
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
            setProfile={setProfile}
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

          <DkdCargoLiveMapModal
            dkd_visible_value={!!dkd_business_mapbox_route_task_value}
            dkd_is_courier_panel_value
            dkd_task_value={dkd_business_mapbox_route_task_value}
            dkd_current_location_value={currentLocation}
            dkd_vehicle_type_value={profile?.courier_vehicle_type || profile?.vehicle_type || profile?.courier_vehicle || null}
            dkd_refreshing_value={dkd_business_mapbox_route_refreshing_value}
            dkd_on_close_value={dkd_close_business_mapbox_route_value}
            dkd_on_refresh_value={dkd_refresh_business_mapbox_route_value}
          />

          {dkd_render_order_pool_page_value()}

          <DkdLogisticsModal
            dkd_visible_value={visible && dkd_logistics_page_visible_value}
            dkd_on_close_value={() => dkd_set_logistics_page_visible_value(false)}
            dkd_profile_value={profile}
            dkd_initial_panel_value={dkd_logistics_initial_panel_local_value}
          />
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dkdCourierOnlineV4ButtonArrow: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.82)' },
  dkdCourierOnlineV4ButtonSub: { color: 'rgba(255,255,255,0.84)', fontSize: 12, fontWeight: '850', marginTop: 2 },
  dkdCourierOnlineV4ButtonTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '950', letterSpacing: 0.7 },
  dkdCourierOnlineV4ButtonCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV4ButtonIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: 'rgba(6,17,26,0.23)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.23)' },
  dkdCourierOnlineV4Button: { minHeight: 76, borderRadius: 25, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  dkdCourierOnlineV4ButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.91 },
  dkdCourierOnlineV4ButtonLocked: { opacity: 0.94 },
  dkdCourierOnlineV4ButtonPressable: { marginTop: 14, borderRadius: 25 },
  dkdCourierOnlineV4DetailsToggle: { marginTop: 10, borderRadius: 18, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.18)' },
  dkdCourierOnlineV4DetailsToggleIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7EEBFF' },
  dkdCourierOnlineV4DetailsToggleCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV4DetailsToggleTitle: { color: '#8CF2FF', fontSize: 15.5, fontWeight: '950', letterSpacing: 0.45 },
  dkdCourierOnlineV4DetailsToggleSub: { color: 'rgba(231,241,255,0.72)', fontSize: 11.5, fontWeight: '800', marginTop: 2, lineHeight: 16 },
  dkdCourierOnlineV4SearchPanelDelivery: { backgroundColor: 'rgba(8,20,46,0.78)', borderColor: 'rgba(255,209,102,0.34)' },
  dkdCourierOnlineV4AssignedText: { color: '#06111A', fontSize: 10, fontWeight: '950' },
  dkdCourierOnlineV4AssignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: '#52F2A1' },
  dkdCourierOnlineV4SearchSub: { color: 'rgba(232,245,255,0.72)', fontSize: 11.5, fontWeight: '800', marginTop: 3, lineHeight: 16 },
  dkdCourierOnlineV4SearchTitle: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '950' },
  dkdCourierOnlineV4SearchCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV4SearchCorePassive: { backgroundColor: '#FFD166' },
  dkdCourierOnlineV4SearchCoreActive: { backgroundColor: '#7EEBFF' },
  dkdCourierOnlineV4SearchCoreDelivery: { backgroundColor: '#FFD166' },
  dkdCourierOnlineV4SearchCore: { width: 31, height: 31, borderRadius: 15.5, alignItems: 'center', justifyContent: 'center' },
  dkdCourierOnlineV4SearchRing: { position: 'absolute', width: 39, height: 39, borderRadius: 19.5, borderWidth: 1.7, borderColor: 'rgba(126,235,255,0.82)', borderStyle: 'dashed' },
  dkdCourierOnlineV4SearchRingOuter: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 1.3, borderColor: 'rgba(82,242,161,0.52)' },
  dkdCourierOnlineV4SearchIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dkdCourierOnlineV4SearchPanel: { marginTop: 13, minHeight: 74, borderRadius: 25, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(2,9,20,0.44)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.18)' },
  dkdCourierOnlineV4RegionText: { flex: 1, minWidth: 0, color: '#EAF8FF', fontSize: 12.8, fontWeight: '900', lineHeight: 17 },
  dkdCourierOnlineV4RegionPill: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.16)' },
  dkdCourierOnlineV4SignalTextPassive: { color: '#FFD3DE' },
  dkdCourierOnlineV4SignalTextActive: { color: '#A7FFD2' },
  dkdCourierOnlineV4SignalText: { fontSize: 10.5, fontWeight: '950', letterSpacing: 0.6 },
  dkdCourierOnlineV4SignalDotPassive: { backgroundColor: '#FF4D7D' },
  dkdCourierOnlineV4SignalDotActive: { backgroundColor: '#52F2A1' },
  dkdCourierOnlineV4SignalDot: { width: 9, height: 9, borderRadius: 4.5 },
  dkdCourierOnlineV4SignalPillPassive: { backgroundColor: 'rgba(255,77,125,0.12)', borderColor: 'rgba(255,77,125,0.30)' },
  dkdCourierOnlineV4SignalPillActive: { backgroundColor: 'rgba(82,242,161,0.14)', borderColor: 'rgba(82,242,161,0.34)' },
  dkdCourierOnlineV4SignalPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  dkdCourierOnlineV4StatusSub: { color: 'rgba(232,245,255,0.74)', fontSize: 12.5, fontWeight: '850', marginTop: 3 },
  dkdCourierOnlineV4StatusSubDelivery: { color: 'rgba(255,244,215,0.92)' },
  dkdCourierOnlineV4StatusTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '950', marginTop: 2, letterSpacing: 0.3 },
  dkdCourierOnlineV4StatusTitleDelivery: { color: '#FFE6A3', fontSize: 22.5, textShadowColor: 'rgba(255,209,102,0.35)', textShadowRadius: 12 },
  dkdCourierOnlineV4Eyebrow: { color: 'rgba(218,246,255,0.70)', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.9 },
  dkdCourierOnlineV4StatusCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV4StatusIconBadge: { position: 'absolute', right: -4, bottom: -4, width: 23, height: 23, borderRadius: 11.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', borderWidth: 2, borderColor: 'rgba(255,255,255,0.92)' },
  dkdCourierOnlineV4StatusIconBadgeDelivery: { backgroundColor: '#14C97F' },
  dkdCourierOnlineV4StatusIconHalo: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.70)', backgroundColor: 'rgba(255,255,255,0.14)' },
  dkdCourierOnlineV4StatusIcon: { width: 60, height: 60, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  dkdCourierOnlineV4TopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dkdCourierOnlineV4BgOrbitTwo: { position: 'absolute', bottom: -74, left: -40, width: 178, height: 178, borderRadius: 89, backgroundColor: 'rgba(124,58,237,0.17)' },
  dkdCourierOnlineV4BgOrbitOne: { position: 'absolute', top: -62, right: -35, width: 168, height: 168, borderRadius: 84, backgroundColor: 'rgba(82,242,161,0.16)' },
  dkdCourierOnlineCardV4: { marginTop: 14, borderRadius: 32, padding: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(126,235,255,0.25)', shadowColor: '#31D7FF', shadowOpacity: 0.30, shadowRadius: 26, shadowOffset: { width: 0, height: 15 }, elevation: 18 },
  dkdCourierOnlineProfileSlot: { marginTop: 13 },
  dkdCourierOnlineCardDeliveryMode: { borderColor: 'rgba(255,209,102,0.50)', shadowColor: '#FFD166', shadowOpacity: 0.36 },
  screen: { flex: 1, backgroundColor: '#05111D' },
  scrollContent: { paddingBottom: 36 },
  dkdOrderPoolPageContent: { padding: 16, paddingBottom: 34 },
  dkdOrderPoolHero: { borderRadius: 36, padding: 19, borderWidth: 1.6, borderColor: 'rgba(140,242,255,0.52)', overflow: 'hidden', shadowColor: '#31D7FF', shadowOpacity: 0.38, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
  dkdOrderPoolHeroAuraOne: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: -62, top: -72, backgroundColor: 'rgba(140,242,255,0.24)' },
  dkdOrderPoolHeroAuraTwo: { position: 'absolute', width: 190, height: 190, borderRadius: 95, left: -70, bottom: -90, backgroundColor: 'rgba(255,216,95,0.17)' },
  dkdOrderPoolHeroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  dkdOrderPoolBackButton: { width: 45, height: 45, borderRadius: 17, backgroundColor: '#8CF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.48)', shadowColor: '#8CF2FF', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
  dkd_order_pool_hero_icon_badge: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.58)', shadowColor: '#8CF2FF', shadowOpacity: 0.34, shadowRadius: 17, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  dkdOrderPoolHeroCopy: { flex: 1, minWidth: 0 },
  dkdOrderPoolEyebrowRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(6,17,26,0.52)', borderWidth: 1, borderColor: 'rgba(140,242,255,0.22)' },
  dkdOrderPoolEyebrow: { color: 'rgba(218,249,255,0.90)', fontSize: 10.5, fontWeight: '950', letterSpacing: 1 },
  dkdOrderPoolTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '950', marginTop: 7, lineHeight: 33, letterSpacing: 0.2 },
  dkdOrderPoolSubtitle: { color: 'rgba(232,244,255,0.82)', fontSize: 12.8, fontWeight: '800', lineHeight: 18.5, marginTop: 7 },
  dkdOrderPoolHeroActionRow: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dkdOrderPoolHeroActivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#8CF2FF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.54)' },
  dkdOrderPoolHeroActivePillText: { color: '#06111A', fontSize: 11.5, fontWeight: '950' },
  dkdOrderPoolHeroGuidePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  dkdOrderPoolHeroGuidePillText: { color: '#F5FBFF', fontSize: 11.5, fontWeight: '900' },
  dkdOrderPoolHeroStatsRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  dkdOrderPoolHeroStat: { flexGrow: 1, minWidth: 132, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  dkdOrderPoolHeroStatCopy: { flex: 1, minWidth: 0 },
  dkdOrderPoolHeroStatNumber: { color: '#FFFFFF', fontSize: 15, fontWeight: '950', lineHeight: 18 },
  dkdOrderPoolHeroStatText: { color: 'rgba(244,251,255,0.76)', fontSize: 10.5, fontWeight: '900', marginTop: 1 },
  dkdOrderPoolChannelGrid: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dkdOrderPoolChannelPressable: { width: '48%', minWidth: 148, flexGrow: 1, borderRadius: 26 },
  dkdOrderPoolChannelCard: { minHeight: 178, borderRadius: 26, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  dkdOrderPoolChannelCardActive: { borderColor: 'rgba(255,255,255,0.56)', shadowColor: '#8CF2FF', shadowOpacity: 0.34, shadowRadius: 17, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  dkdOrderPoolChannelGlow: { position: 'absolute', right: -42, top: -44, width: 116, height: 116, borderRadius: 58, backgroundColor: 'rgba(140,242,255,0.13)' },
  dkdOrderPoolChannelGlowActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  dkdOrderPoolChannelTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dkdOrderPoolChannelIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  dkdOrderPoolChannelIconActive: { backgroundColor: 'rgba(255,255,255,0.62)', borderColor: 'rgba(6,17,26,0.10)' },
  dkdOrderPoolChannelStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  dkdOrderPoolChannelStatusPillActive: { backgroundColor: 'rgba(255,255,255,0.66)', borderColor: 'rgba(6,17,26,0.10)' },
  dkdOrderPoolChannelStatusText: { color: '#CFF8FF', fontSize: 9.5, fontWeight: '950' },
  dkdOrderPoolChannelStatusTextActive: { color: '#06111A' },
  dkdOrderPoolChannelTitle: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '950', marginTop: 12, lineHeight: 20.5 },
  dkdOrderPoolChannelTitleActive: { color: '#06111A' },
  dkdOrderPoolChannelSub: { color: 'rgba(232,244,255,0.77)', fontSize: 11.5, fontWeight: '800', lineHeight: 16.5, marginTop: 6 },
  dkdOrderPoolChannelSubActive: { color: 'rgba(6,17,26,0.78)' },
  dkdOrderPoolChannelBottomRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  dkdOrderPoolChannelMeta: { flexShrink: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  dkdOrderPoolChannelMetaActive: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: 'rgba(6,17,26,0.08)' },
  dkdOrderPoolChannelMetaText: { color: '#EAFBFF', fontSize: 10.5, fontWeight: '950' },
  dkdOrderPoolChannelMetaTextActive: { color: '#06111A' },
  dkdOrderPoolChannelOpenPill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: 'rgba(140,242,255,0.12)', borderWidth: 1, borderColor: 'rgba(140,242,255,0.20)' },
  dkdOrderPoolChannelOpenPillActive: { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: 'rgba(6,17,26,0.08)' },
  dkdOrderPoolChannelOpenText: { color: '#CFF8FF', fontSize: 10, fontWeight: '950' },
  dkdOrderPoolChannelOpenTextActive: { color: '#06111A' },
  dkdOrderPoolFilterPanel: { marginTop: 15, borderRadius: 27, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', backgroundColor: 'rgba(255,255,255,0.055)' },
  dkdOrderPoolFilterHeader: { borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  dkdOrderPoolFilterHeaderIcon: { width: 45, height: 45, borderRadius: 16, backgroundColor: '#8CF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.50)' },
  dkdOrderPoolFilterHeaderCopy: { flex: 1, minWidth: 0 },
  dkdOrderPoolFilterKicker: { color: 'rgba(214,246,255,0.70)', fontSize: 10, fontWeight: '950', letterSpacing: 0.8 },
  dkdOrderPoolFilterTotalBadge: { minWidth: 56, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  dkdOrderPoolFilterTotalNumber: { color: '#FFFFFF', fontSize: 17, fontWeight: '950', lineHeight: 19 },
  dkdOrderPoolFilterTotalText: { color: 'rgba(232,244,255,0.72)', fontSize: 10, fontWeight: '900', marginTop: 2 },
  dkdOrderPoolFilterSubtext: { marginTop: 5, color: 'rgba(223,236,247,0.74)', fontSize: 11.5, lineHeight: 16, fontWeight: '800' },
  dkdOrderPoolLogisticsPanel: { marginTop: 14, borderRadius: 25, padding: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dkdOrderPoolLogisticsHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  dkdOrderPoolMiniRefresh: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#8CF2FF', flexDirection: 'row', alignItems: 'center', gap: 5 },
  dkdOrderPoolMiniRefreshText: { color: '#06111A', fontSize: 11, fontWeight: '950' },
  dkdOrderPoolLogisticsStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  dkdOrderPoolLogisticsStatPill: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: 'rgba(105,231,255,0.12)', borderWidth: 1, borderColor: 'rgba(105,231,255,0.18)' },
  dkdOrderPoolLogisticsStatText: { color: '#EAFBFF', fontSize: 11, fontWeight: '900' },
  dkdOrderPoolLogisticsJobPressable: { marginTop: 12, borderRadius: 23 },
  dkdOrderPoolLogisticsJobCard: { borderRadius: 23, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dkdOrderPoolLogisticsJobTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  dkdOrderPoolLogisticsJobIcon: { width: 45, height: 45, borderRadius: 16, backgroundColor: '#8CF2FF', alignItems: 'center', justifyContent: 'center' },
  dkdOrderPoolLogisticsJobCopy: { flex: 1, minWidth: 0 },
  dkdOrderPoolLogisticsJobTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '950' },
  dkdOrderPoolLogisticsJobSub: { color: 'rgba(230,244,255,0.76)', fontSize: 11.5, fontWeight: '800', lineHeight: 16, marginTop: 4 },
  dkdOrderPoolLogisticsJobBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(82,242,161,0.18)', borderWidth: 1, borderColor: 'rgba(82,242,161,0.26)' },
  dkdOrderPoolLogisticsJobBadgeText: { color: '#BFFFE3', fontSize: 10.5, fontWeight: '950' },
  dkdOrderPoolLogisticsJobMetaRow: { marginTop: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dkdOrderPoolLogisticsJobMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.07)' },
  dkdOrderPoolLogisticsJobMetaText: { color: '#EAFBFF', fontSize: 11, fontWeight: '900' },
  dkdOrderPoolLogisticsJobNote: { marginTop: 10, color: 'rgba(232,244,255,0.68)', fontSize: 11.5, fontWeight: '800', lineHeight: 16 },
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
  dkdMiniMapActionChipCompact: {
    minHeight: 44,
    minWidth: 172,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 7,
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
    minHeight: 46,
    minWidth: 184,
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
  dkdMiniMapActionIconWrapCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  dkdMiniMapActionChipTextCompact: {
    fontSize: 13.5,
    lineHeight: 15,
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
  dkdCourierProfileStatusPressable: {
    borderRadius: 26,
  },
  dkdCourierProfileStatusCard: {
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    backgroundColor: 'rgba(8,18,34,0.92)',
  },
  dkdCourierProfileStatusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dkdCourierProfileStatusIconShell: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dkdCourierProfileStatusCopy: {
    flex: 1,
    minWidth: 0,
  },
  dkdCourierProfileStatusEyebrow: {
    color: 'rgba(202,242,255,0.75)',
    fontSize: 10,
    fontWeight: '950',
    letterSpacing: 0.9,
  },
  dkdCourierProfileStatusTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '950',
    marginTop: 2,
  },
  dkdCourierProfileStatusSubtitle: {
    color: 'rgba(231,241,255,0.70)',
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 3,
    lineHeight: 15,
  },
  dkdCourierProfileDetailBadgePressable: {
    borderRadius: 999,
  },
  dkdCourierProfileDetailBadgeMotion: {
    borderRadius: 999,
    shadowColor: '#7EEBFF',
    shadowOpacity: 0.34,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  dkdCourierProfileStatusChip: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#63F1B1',
  },
  dkdCourierProfileStatusChipText: {
    color: '#06111A',
    fontSize: 14.5,
    fontWeight: '950',
    letterSpacing: 0.2,
  },
  dkdCourierProfileXpPanel: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
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
  dkd_inline_logistics_center_wrap: {
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(140,242,255,0.18)',
  },
  dkdUnlockedCenterCardGrid: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: 12,
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dkdUnlockedCenterCardPressable: {
    width: '100%',
    minWidth: '100%',
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
    overflow: 'hidden',
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
    borderColor: 'rgba(255,230,120,0.52)',
    shadowColor: '#FF5E95',
    shadowOpacity: 0.42,
    elevation: 12,
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
  dkdOrderPoolModernBadgeRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dkdOrderPoolModernBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#61F4FF',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  dkdOrderPoolModernBadgeText: {
    color: '#06111A',
    fontWeight: '900',
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  dkd_modern_center_tab_card_urgent_active: {
    borderColor: 'rgba(255,230,120,0.52)',
    shadowColor: '#FF5E95',
    shadowOpacity: 0.46,
    elevation: 12,
  },
  dkdUrgentDeliveryTabCard: {
    minHeight: 134,
    shadowColor: '#FF5E95',
  },
  dkdUrgentDeliveryPulseOrb: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 999,
    right: -50,
    top: -42,
    backgroundColor: 'rgba(255,241,130,0.30)',
    zIndex: 1,
  },
  dkdUrgentScanWrap: {
    width: 148,
  },
  dkdUrgentMiniSignalRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  dkdUrgentMiniSignalPill: {
    minHeight: 23,
    borderRadius: 999,
    paddingHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,241,130,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  dkdUrgentMiniSignalText: {
    color: '#08111D',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  dkd_modern_center_tab_status_chip_urgent_active: {
    backgroundColor: 'rgba(255,216,95,0.18)',
    borderColor: 'rgba(255,216,95,0.34)',
  },
  dkdUrgentCardAura: {
    backgroundColor: 'rgba(255,92,149,0.16)',
  },
  dkdUrgentCardOutline: {
    borderColor: 'rgba(255,216,95,0.34)',
  },
  dkdUrgentIconHalo: {
    backgroundColor: 'rgba(255,92,149,0.28)',
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
  dkdUrgentQueueWideCardPressable: {
    marginTop: 14,
    borderRadius: 24,
    overflow: 'hidden',
  },
  dkdUrgentQueueWideCard: {
    minHeight: 98,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(150,170,255,0.18)',
    shadowColor: '#7F7BFF',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  dkdUrgentQueueWideIconShell: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFD75C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  dkdUrgentQueueWideCopy: {
    flex: 1,
    gap: 4,
  },
  dkdUrgentQueueWideTitle: {
    color: '#F8FBFF',
    fontSize: 18,
    fontWeight: '950',
  },
  dkdUrgentQueueWideText: {
    color: 'rgba(238,244,255,0.76)',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  dkdUrgentQueueWideActionPill: {
    minWidth: 74,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,214,95,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  dkdUrgentQueueWideActionText: {
    color: '#08111D',
    fontSize: 12,
    fontWeight: '950',
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
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    gap: 10,
    marginTop: 12,
  },
  queueFilterChip: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(231,241,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    maxWidth: '100%',
  },
  queueFilterChipActive: {
    borderColor: 'rgba(255,255,255,0.36)',
    shadowColor: '#8CF2FF',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  dkdQueueFilterChipFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  dkdQueueFilterChipNew: {
    borderColor: 'rgba(231,241,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  dkdQueueFilterChipNewActive: {
    borderColor: 'rgba(255,255,255,0.36)',
    shadowColor: '#8CF2FF',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  dkdQueueFilterChipCompleted: {
    borderColor: 'rgba(231,241,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  dkdQueueFilterChipCompletedActive: {
    borderColor: 'rgba(255,255,255,0.36)',
    shadowColor: '#8CF2FF',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  dkdQueueFilterChipCancelled: {
    borderColor: 'rgba(231,241,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  dkdQueueFilterChipCancelledActive: {
    borderColor: 'rgba(255,255,255,0.36)',
    shadowColor: '#8CF2FF',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  queueFilterChipText: {
    color: 'rgba(231,241,255,0.72)',
    fontWeight: '900',
    fontSize: 12,
    flexShrink: 1,
  },
  queueFilterChipTextActive: { color: '#06111A' },
  loaderWrap: { paddingVertical: 24 },
  dkdShowMoreJobsButton: {
    marginTop: 14,
    marginHorizontal: 16,
    minHeight: 58,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#67E8F9',
    shadowOpacity: 0.30,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dkdShowMoreJobsGradient: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: 10,
  },
  dkdShowMoreJobsIconShell: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(6,17,26,0.10)',
  },
  dkdShowMoreJobsCopy: {
    flex: 1,
    gap: 2,
  },
  dkdShowMoreJobsText: {
    color: '#06111A',
    fontSize: 14,
    fontWeight: '900',
  },
  dkdShowMoreJobsSubtext: {
    color: 'rgba(6,17,26,0.72)',
    fontSize: 11,
    fontWeight: '800',
  },
  dkdCourierOnlineCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(118,226,255,0.18)',
    backgroundColor: 'rgba(8,18,31,0.86)',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  dkdCourierOnlineGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -70,
    top: -80,
    backgroundColor: 'rgba(82,242,161,0.13)',
  },
  dkdCourierOnlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dkdCourierOnlineCompactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dkdCourierOnlineLiveHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dkdCourierOnlineLiveHintText: {
    color: 'rgba(232,245,255,0.86)',
    fontSize: 11,
    fontWeight: '900',
  },
  dkdCourierOnlineTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dkdCourierOnlineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkdCourierOnlineIconWrapActive: {
    backgroundColor: '#52F2A1',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dkdCourierOnlineCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineTitle: { color: dkd_colors.text, fontSize: 17, fontWeight: '900' },
  dkdCourierOnlineSub: { color: 'rgba(218,236,255,0.68)', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 4 },
  dkdCourierOnlineToggle: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
  },
  dkdCourierOnlineToggleActive: {
    borderColor: 'rgba(82,242,161,0.40)',
    backgroundColor: '#52F2A1',
  },
  dkdCourierOnlineToggleText: { color: '#F7FBFF', fontSize: 11, fontWeight: '900' },
  dkdCourierOnlineToggleTextActive: { color: '#06111A' },
  dkdCourierOnlineStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,214,102,0.32)',
    backgroundColor: 'rgba(255,214,102,0.10)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dkdCourierOnlineStatusBadgeActive: {
    borderColor: 'rgba(82,242,161,0.52)',
    backgroundColor: '#52F2A1',
  },
  dkdCourierOnlineStatusBadgeText: {
    color: '#FFD666',
    fontSize: 10,
    fontWeight: '950',
    letterSpacing: 0.7,
  },
  dkdCourierOnlineStatusBadgeTextActive: { color: '#06111A' },
  dkdCourierOnlineActionButton: {
    marginTop: 13,
    minHeight: 72,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#31D7FF',
    shadowOpacity: 0.34,
    shadowRadius: 19,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  dkdCourierOnlineActionButtonStart: {
    shadowColor: '#52F2A1',
  },
  dkdCourierOnlineActionButtonStop: {
    shadowColor: '#FF8A3D',
  },
  dkdCourierOnlineActionShine: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    right: -34,
    top: -54,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  dkdCourierOnlineActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,17,26,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  dkdCourierOnlineActionIconWrapStop: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderColor: 'rgba(6,17,26,0.16)',
  },
  dkdCourierOnlineActionCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineActionLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '950',
    letterSpacing: 0.7,
  },
  dkdCourierOnlineActionLabelStop: { color: '#06111A' },
  dkdCourierOnlineActionSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '850',
    lineHeight: 15,
    marginTop: 2,
  },
  dkdCourierOnlineActionSubStop: { color: 'rgba(6,17,26,0.72)' },
  dkdCourierOnlineActionPulseBadge: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  dkdCourierOnlineActionPulseBadgeStop: {
    backgroundColor: 'rgba(6,17,26,0.12)',
    borderColor: 'rgba(6,17,26,0.18)',
  },
  dkdCourierOnlinePickerLabel: {
    color: 'rgba(218,236,255,0.58)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  dkdCourierOnlineChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dkdCourierOnlineChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dkdCourierOnlineChipActive: {
    borderColor: 'rgba(82,242,161,0.44)',
    backgroundColor: 'rgba(82,242,161,0.18)',
  },
  dkdCourierOnlineChipLocked: { opacity: 0.72 },
  dkdCourierOnlineChipText: { color: 'rgba(232,245,255,0.76)', fontSize: 12, fontWeight: '900' },
  dkdCourierOnlineChipTextActive: { color: '#FFFFFF' },
  dkdCourierOnlineAssignedBanner: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#52F2A1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkdCourierOnlineAssignedText: {
    flex: 1,
    color: '#06111A',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
  },
  dkdCourierOnlineRegionPill: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(126,235,255,0.18)',
    backgroundColor: 'rgba(126,235,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkdCourierOnlineRegionPillText: {
    flex: 1,
    color: 'rgba(232,245,255,0.88)',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  dkdCourierOrderSearchCard: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(97,216,255,0.24)',
    backgroundColor: 'rgba(7,14,27,0.62)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  dkdCourierOrderSearchRadarWrap: {
    width: 52,
    height: 52,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkdCourierOrderSearchRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(97,216,255,0.74)',
    borderLeftColor: 'rgba(82,242,161,0.12)',
    borderBottomColor: 'rgba(255,214,102,0.58)',
    backgroundColor: 'rgba(97,216,255,0.08)',
  },
  dkdCourierOrderSearchRadarCore: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61D8FF',
    shadowColor: '#61D8FF',
    shadowOpacity: 0.34,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  dkdCourierOrderSearchCopy: { flex: 1, minWidth: 0 },
  dkdCourierOrderSearchTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dkdCourierOrderSearchSub: {
    color: 'rgba(218,236,255,0.66)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    marginTop: 3,
  },
  dkdCourierOrderSearchDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dkdCourierOrderSearchDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#61D8FF',
  },
  dkdCourierOrderSearchDotSecond: { backgroundColor: '#52F2A1' },
  dkdCourierOrderSearchDotThird: { backgroundColor: '#FFD666' },
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
    flex: 1.18,
    minHeight: 62,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: { color: dkd_colors.text, fontSize: 17, fontWeight: '950', letterSpacing: 0.25 },
  primaryAction: {
    flex: 1.4,
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { color: '#F7FBFF', fontSize: 16, fontWeight: '900' },
  dkdAdminDeleteAction: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,92,120,0.34)',
    backgroundColor: 'rgba(255,73,105,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
  },
  dkdAdminDeleteActionText: {
    color: '#FFDCE2',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  dkdRejectOfferAction: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,92,120,0.34)',
    backgroundColor: 'rgba(255,73,105,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
  },
  dkdRejectOfferActionText: {
    color: '#FFDCE2',
    fontSize: 13,
    fontWeight: '900',
  },
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
  dkdCourierOnlineCardV3: {
    marginTop: 14,
    borderRadius: 30,
    padding: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(126,235,255,0.20)',
    shadowColor: '#31D7FF',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  dkdCourierOnlineV3GlowMain: {
    position: 'absolute',
    top: -58,
    right: -42,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(82,242,161,0.14)',
  },
  dkdCourierOnlineV3GlowSide: {
    position: 'absolute',
    bottom: -70,
    left: -36,
    width: 155,
    height: 155,
    borderRadius: 77.5,
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  dkdCourierOnlineV3TopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dkdCourierOnlineV3StatusIcon: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dkdCourierOnlineV3StatusCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV3Eyebrow: { color: 'rgba(218,246,255,0.68)', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.8 },
  dkdCourierOnlineV3StatusTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '950', marginTop: 2 },
  dkdCourierOnlineV3StatusSub: { color: 'rgba(232,245,255,0.72)', fontSize: 12, fontWeight: '800', marginTop: 3 },
  dkdCourierOnlineV3LiveDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: 'rgba(255,255,255,0.24)' },
  dkdCourierOnlineV3LiveDotActive: { backgroundColor: '#52F2A1' },
  dkdCourierOnlineV3LiveDotPassive: { backgroundColor: '#FF4D7D' },
  dkdCourierOnlineV3InfoGrid: { marginTop: 14, gap: 9 },
  dkdCourierOnlineV3InfoPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.16)' },
  dkdCourierOnlineV3InfoText: { flex: 1, minWidth: 0, color: '#EAF8FF', fontSize: 12.5, fontWeight: '900', lineHeight: 17 },
  dkdCourierOnlineV3AssignedPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: '#52F2A1' },
  dkdCourierOnlineV3AssignedText: { color: '#06111A', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.5 },
  dkdCourierOnlineV3AssignedGhostPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(126,235,255,0.09)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.15)' },
  dkdCourierOnlineV3AssignedGhostText: { color: '#BFEFFF', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.4 },
  dkdCourierOnlineV3ButtonPressable: { marginTop: 14, borderRadius: 24 },
  dkdCourierOnlineV3ButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  dkdCourierOnlineV3Button: { minHeight: 70, borderRadius: 24, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11, overflow: 'hidden' },
  dkdCourierOnlineV3ButtonIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: 'rgba(6,17,26,0.24)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  dkdCourierOnlineV3ButtonCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV3ButtonTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '950', letterSpacing: 0.5 },
  dkdCourierOnlineV3ButtonSub: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontWeight: '850', marginTop: 3, lineHeight: 16 },
  dkdCourierOnlineV3ArrowBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.84)', alignItems: 'center', justifyContent: 'center' },
  dkdCourierOnlineCardV2: {
    padding: 14,
    borderRadius: 26,
    borderColor: 'rgba(126,235,255,0.22)',
    backgroundColor: 'rgba(5,14,27,0.92)',
  },
  dkdCourierOnlineGlowTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    left: -56,
    bottom: -70,
    backgroundColor: 'rgba(124,58,237,0.13)',
  },
  dkdCourierOnlineV2TopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dkdCourierOnlineV2StatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.26)',
  },
  dkdCourierOnlineV2StatusChipActive: {
    backgroundColor: '#52F2A1',
    borderColor: 'rgba(255,255,255,0.26)',
  },
  dkdCourierOnlineV2StatusText: {
    color: '#FFD166',
    fontSize: 10.5,
    fontWeight: '950',
    letterSpacing: 0.45,
  },
  dkdCourierOnlineV2StatusTextActive: { color: '#06111A' },
  dkdCourierOnlineV2AssignedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFD166',
  },
  dkdCourierOnlineV2AssignedText: {
    color: '#06111A',
    fontSize: 10,
    fontWeight: '950',
  },
  dkdCourierOnlineV2RegionPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 19,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.065)',
    borderWidth: 1,
    borderColor: 'rgba(126,235,255,0.16)',
  },
  dkdCourierOnlineV2RegionIcon: {
    width: 30,
    height: 30,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(126,235,255,0.10)',
  },
  dkdCourierOnlineV2RegionText: {
    flex: 1,
    color: 'rgba(236,248,255,0.88)',
    fontSize: 12.5,
    fontWeight: '850',
    lineHeight: 17,
  },
  dkdCourierOnlineV2ButtonPressable: {
    marginTop: 13,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#31D7FF',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  dkdCourierOnlineV2Button: {
    minHeight: 70,
    borderRadius: 24,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  dkdCourierOnlineV2ButtonIcon: {
    width: 45,
    height: 45,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  dkdCourierOnlineV2ButtonIconStop: {
    backgroundColor: 'rgba(6,17,26,0.12)',
    borderColor: 'rgba(6,17,26,0.16)',
  },
  dkdCourierOnlineV2ButtonCopy: { flex: 1, minWidth: 0 },
  dkdCourierOnlineV2ButtonTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '950',
    letterSpacing: 0.65,
  },
  dkdCourierOnlineV2ButtonTitleStop: { color: '#06111A' },
  dkdCourierOnlineV2ButtonSub: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 11.5,
    fontWeight: '900',
    marginTop: 2,
  },
  dkdCourierOnlineV2ButtonSubStop: { color: 'rgba(6,17,26,0.74)' },
  dkdCourierOnlineV2ArrowBadge: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dkdCourierOnlineV2ArrowBadgeStop: {
    backgroundColor: 'rgba(6,17,26,0.12)',
  },

});
