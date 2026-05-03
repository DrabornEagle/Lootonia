import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  deleteAdminBossDef,
  deleteAdminCardDef,
  deleteAdminCourierJob,
  deleteAdminMarketPack,
  deleteAdminMarketRewardType,
  fetchAdminBossDefs,
  fetchAdminCardDefs,
  fetchAdminCourierJobs,
  fetchAdminMarketCommandSnapshot,
  fetchAdminMarketRewardTypes,
  fetchAdminProfiles,
  saveAdminMarketUi,
  sendAdminBroadcast,
  fetchAdminNotificationTemplates,
  saveAdminNotificationTemplate,
  upsertAdminMarketRewardType,
  updateAdminProfile,
  uploadAdminBossArt,
  uploadAdminCardArt,
  upsertAdminBossDef,
  upsertAdminCardDef,
  upsertAdminCourierJob,
  upsertAdminMarketPack,
} from '../services/adminService';
import { deleteDrop as deleteDropRecord, fetchAllDropsForAdmin, insertDrop, updateDrop } from '../services/dropService';
import { humanizeAdminError } from '../utils/text';

const ADMIN_LOOT_CACHE_TTL_MS = 45 * 1000;
const ADMIN_DROPS_CACHE_TTL_MS = 45 * 1000;
const ADMIN_USERS_CACHE_TTL_MS = 45 * 1000;
const ADMIN_COURIER_JOBS_CACHE_TTL_MS = 45 * 1000;

function normalizeName(value) {
  return String(value || '').trim();
}

function normalizeSeries(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeSerialCode(value, fallbackSeries = '') {
  const clean = String(value || '').trim().toUpperCase();
  if (clean) return clean;
  const seriesStem = String(fallbackSeries || 'GEN').replace(/[^A-Z0-9]+/g, '').slice(0, 3) || 'GEN';
  return `LTN-${seriesStem}-${String(Date.now()).slice(-4)}`;
}

function normalizeTheme(value) {
  return String(value || '').trim();
}

function normalizeRarity(value) {
  return String(value || 'common').trim().toLowerCase();
}

function isLocalAssetUri(value) {
  const uri = String(value || '');
  return uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('/');
}

function normalizeCardId(value) {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  return raw;
}

function sameCardId(dkd_left_value, dkd_right_value) {
  const left = normalizeCardId(dkd_left_value);
  const right = normalizeCardId(dkd_right_value);
  return !!left && !!right && left === right;
}

export function useAdminData({ refreshDrops, sessionAccessToken }) {
  const [adminLoading, setAdminLoading] = useState(false);
  const [lootEntries, setLootEntries] = useState([]);
  const [cardDefs, setCardDefs] = useState([]);
  const [cardSearch, setCardSearch] = useState('');
  const [adminDropsLoading, setAdminDropsLoading] = useState(false);
  const [adminDrops, setAdminDrops] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminCourierJobsLoading, setAdminCourierJobsLoading] = useState(false);
  const [adminCourierJobs, setAdminCourierJobs] = useState([]);
  const [adminBroadcastLoading, setAdminBroadcastLoading] = useState(false);
  const [adminNotificationTemplateLoading, setAdminNotificationTemplateLoading] = useState(false);
  const [adminNotificationTemplates, setAdminNotificationTemplates] = useState([]);
  const [adminBossLoading, setAdminBossLoading] = useState(false);
  const [adminBossDefs, setAdminBossDefs] = useState([]);
  const [adminMarketLoading, setAdminMarketLoading] = useState(false);
  const [adminMarketUi, setAdminMarketUi] = useState(null);
  const [adminMarketDefs, setAdminMarketDefs] = useState([]);
  const [adminMarketRewardTypes, setAdminMarketRewardTypes] = useState([]);

  const adminLootCacheRef = useRef({ entries: [], cardDefs: [], loadedAt: 0 });
  const adminDropsCacheRef = useRef({ rows: [], loadedAt: 0 });
  const adminUsersCacheRef = useRef({ query: '', rows: [], loadedAt: 0 });
  const adminCourierJobsCacheRef = useRef({ rows: [], loadedAt: 0 });
  const adminBossCacheRef = useRef({ rows: [], loadedAt: 0 });
  const adminMarketCacheRef = useRef({ ui: null, rows: [], rewardTypes: [], loadedAt: 0 });
  const adminNotificationTemplateCacheRef = useRef({ rows: [], loadedAt: 0 });

  const loadAdminData = useCallback(async (force = false) => {
    const cached = adminLootCacheRef.current;
    const isFresh = Array.isArray(cached.cardDefs) && (Date.now() - cached.loadedAt) < ADMIN_LOOT_CACHE_TTL_MS;
    if (!force && isFresh) {
      setLootEntries([]);
      setCardDefs(cached.cardDefs);
      return { entries: [], cardDefs: cached.cardDefs };
    }

    setAdminLoading(true);
    try {
      const { data: cd, error: cdErr } = await fetchAdminCardDefs(800);
      if (cdErr) throw cdErr;
      const defs = Array.isArray(cd) ? cd : [];
      setLootEntries([]);
      setCardDefs(defs);
      adminLootCacheRef.current = { entries: [], cardDefs: defs, loadedAt: Date.now() };
      return { entries: [], cardDefs: defs };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_card_defs'));
      return { entries: [], cardDefs: [] };
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const adminAddLoot = useCallback(async (payload) => {
    try {
      const id = payload?.id ? Number(payload.id) : null;
      const name = normalizeName(payload?.name);
      const series = normalizeSeries(payload?.series);
      const rarity = normalizeRarity(payload?.rarity);
      const theme = normalizeTheme(payload?.theme);
      const serial_code = normalizeSerialCode(payload?.serial_code, payload?.series);
      const is_active = payload?.is_active !== false;
      const artInput = String(payload?.art_image_url || '').trim();

      if (name.length < 2) {
        Alert.alert('Admin', 'Kart adı en az 2 karakter olmalı.');
        return { ok: false };
      }
      if (series.length < 2) {
        Alert.alert('Admin', 'Seri adı en az 2 karakter olmalı.');
        return { ok: false };
      }
      if (theme.length < 2) {
        Alert.alert('Admin', 'Tema adı en az 2 karakter olmalı.');
        return { ok: false };
      }
      if (serial_code.length < 4) {
        Alert.alert('Admin', 'Kart seri kodu en az 4 karakter olmalı.');
        return { ok: false };
      }

      const duplicate = (Array.isArray(cardDefs) ? cardDefs : []).find((item) => (
        String(item?.name || '').trim().toLowerCase() === name.toLowerCase()
        && String(item?.series || '').trim().toUpperCase() === series
        && !sameCardId(item?.id, id)
      ));
      if (duplicate) {
        Alert.alert('Admin', 'Aynı kart adı ve seri adı ile başka kayıt var.');
        return { ok: false };
      }

      let finalImageUrl = !isLocalAssetUri(artInput) ? artInput : '';

      if (isLocalAssetUri(artInput)) {
        const upload = await uploadAdminCardArt({ imageUri: artInput, name, series, serialCode: serial_code });
        if (upload.error) throw upload.error;
        finalImageUrl = String(upload?.data?.publicUrl || '').trim();
      }

      const saveResult = await upsertAdminCardDef({
        id,
        name,
        series,
        serial_code,
        rarity,
        theme,
        is_active,
        art_image_url: finalImageUrl || null,
      });

      if (saveResult.error) throw saveResult.error;
      const savedRow = Array.isArray(saveResult.data) ? saveResult.data[0] : saveResult.data;
      const cardId = normalizeCardId(savedRow?.id || id);

      if (!cardId) {
        throw new Error('card_save_failed');
      }

      Alert.alert('Admin', id ? 'Kart güncellendi.' : `${name} kartı oluşturuldu.`);
      adminLootCacheRef.current.loadedAt = 0;
      await loadAdminData(true);
      return { ok: true, data: { id: cardId, art_image_url: finalImageUrl, serial_code } };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_card_defs'));
      return { ok: false, error: dkd_error_value };
    }
  }, [cardDefs, loadAdminData]);

  const adminDeleteLoot = useCallback(async (payload) => {
    try {
      const cardId = normalizeCardId(payload?.id);
      if (!cardId) return { ok: false };

      if (payload?.action === 'delete_card') {
        const { data, error } = await deleteAdminCardDef(cardId);
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        Alert.alert('Admin', 'Kart sistemden tamamen silindi. Loot havuzu, oyuncu envanterleri ve market kayıtları da temizlendi.');
        adminLootCacheRef.current.loadedAt = 0;
        await loadAdminData(true);
        return { ok: true, data: row };
      }

      const current = (Array.isArray(cardDefs) ? cardDefs : []).find((item) => sameCardId(item?.id, cardId));
      const name = normalizeName(payload?.name || current?.name || 'Kart');
      const series = normalizeSeries(payload?.series || current?.series || 'GENERAL');
      const serial_code = normalizeSerialCode(payload?.serial_code || current?.serial_code || '', series);
      const rarity = normalizeRarity(payload?.rarity || current?.rarity || 'common');
      const theme = normalizeTheme(payload?.theme || current?.theme || 'City Core');
      const art_image_url = String(payload?.art_image_url || current?.art_image_url || '').trim() || null;
      const nextActive = payload?.is_active === true;

      const { error } = await upsertAdminCardDef({
        id: cardId,
        name,
        series,
        serial_code,
        rarity,
        theme,
        is_active: nextActive,
        art_image_url,
      });
      if (error) throw error;

      Alert.alert('Admin', nextActive ? 'Kart aktif yapıldı.' : 'Kart pasife alındı.');
      adminLootCacheRef.current.loadedAt = 0;
      await loadAdminData(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_card_defs'));
      return { ok: false, error: dkd_error_value };
    }
  }, [cardDefs, loadAdminData]);

  const loadAdminDrops = useCallback(async (force = false) => {
    const cached = adminDropsCacheRef.current;
    const isFresh = Array.isArray(cached.rows) && (Date.now() - cached.loadedAt) < ADMIN_DROPS_CACHE_TTL_MS;
    if (!force && isFresh) {
      setAdminDrops(cached.rows);
      return cached.rows;
    }

    setAdminDropsLoading(true);
    try {
      const { data, error } = await fetchAllDropsForAdmin();
      if (error) throw error;
      const rows = data || [];
      setAdminDrops(rows);
      adminDropsCacheRef.current = { rows, loadedAt: Date.now() };
      return rows;
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_drops'));
      return [];
    } finally {
      setAdminDropsLoading(false);
    }
  }, []);

  const adminUpsertDrop = useCallback(async (dkd_drop_payload) => {
    setAdminDropsLoading(true);
    try {
      const dkd_safe_drop_payload = dkd_drop_payload && typeof dkd_drop_payload === 'object' ? dkd_drop_payload : {};
      const payload = {
        name: dkd_safe_drop_payload.name,
        type: dkd_safe_drop_payload.type,
        is_active: dkd_safe_drop_payload.is_active,
        lat: dkd_safe_drop_payload.lat,
        lng: dkd_safe_drop_payload.lng,
        radius_m: dkd_safe_drop_payload.radius_m,
        cooldown_seconds: dkd_safe_drop_payload.cooldown_seconds,
        qr_secret: dkd_safe_drop_payload.qr_secret,
      };
      let row = null;
      if (dkd_safe_drop_payload.id) {
        const { data, error } = await updateDrop(dkd_safe_drop_payload.id, payload);
        if (error) throw error;
        row = data || null;
        Alert.alert('Admin', 'Drop güncellendi.');
      } else {
        const { data, error } = await insertDrop(payload);
        if (error) throw error;
        row = data || null;
        Alert.alert('Admin', `Drop eklendi (#${String(data?.id || '').slice(0, 8)})`);
      }
      adminDropsCacheRef.current.loadedAt = 0;
      await Promise.all([refreshDrops?.(), loadAdminDrops(true)]);
      return { ok: true, row };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_drops'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminDropsLoading(false);
    }
  }, [refreshDrops, loadAdminDrops]);

  const adminDeleteDrop = useCallback((dropId) => {
    Alert.alert('Drop Sil', 'Bu drop kalıcı olarak silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setAdminDropsLoading(true);
          try {
            const { error } = await deleteDropRecord(dropId);
            if (error) throw error;
            Alert.alert('Admin', 'Drop silindi.');
            adminDropsCacheRef.current.loadedAt = 0;
            await Promise.all([refreshDrops?.(), loadAdminDrops(true)]);
          } catch (dkd_error_value) {
            Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_drops'));
          } finally {
            setAdminDropsLoading(false);
          }
        },
      },
    ]);
  }, [refreshDrops, loadAdminDrops]);

  const loadAdminUsers = useCallback(async (query = adminUserSearch, force = false) => {
    const normalizedQuery = String(query || '').trim();
    const cached = adminUsersCacheRef.current;
    const isFresh = cached.query === normalizedQuery && Array.isArray(cached.rows) && (Date.now() - cached.loadedAt) < ADMIN_USERS_CACHE_TTL_MS;
    if (!force && isFresh) {
      setAdminUsers(cached.rows);
      return cached.rows;
    }

    setAdminUsersLoading(true);
    try {
      const { data, error } = await fetchAdminProfiles(normalizedQuery, 80);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setAdminUsers(rows);
      adminUsersCacheRef.current = { query: normalizedQuery, rows, loadedAt: Date.now() };
      return rows;
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_profiles'));
      return [];
    } finally {
      setAdminUsersLoading(false);
    }
  }, [adminUserSearch]);

  const adminSaveUser = useCallback(async (patch) => {
    setAdminUsersLoading(true);
    try {
      const { error } = await updateAdminProfile(patch);
      if (error) throw error;
      Alert.alert('Admin', 'Kullanıcı güncellendi.');
      adminUsersCacheRef.current.loadedAt = 0;
      await loadAdminUsers(adminUserSearch, true);
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_profiles'));
    } finally {
      setAdminUsersLoading(false);
    }
  }, [loadAdminUsers, adminUserSearch]);

  const loadAdminCourierJobs = useCallback(async (force = false) => {
    const cached = adminCourierJobsCacheRef.current;
    const isFresh = Array.isArray(cached.rows) && (Date.now() - cached.loadedAt) < ADMIN_COURIER_JOBS_CACHE_TTL_MS;
    if (!force && isFresh) {
      setAdminCourierJobs(cached.rows);
      return cached.rows;
    }

    setAdminCourierJobsLoading(true);
    try {
      const { data, error } = await fetchAdminCourierJobs();
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setAdminCourierJobs(rows);
      adminCourierJobsCacheRef.current = { rows, loadedAt: Date.now() };
      return rows;
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_courier_jobs'));
      return [];
    } finally {
      setAdminCourierJobsLoading(false);
    }
  }, []);

  const adminUpsertCourierJob = useCallback(async (patch) => {
    setAdminCourierJobsLoading(true);
    try {
      const { error } = await upsertAdminCourierJob(patch);
      if (error) throw error;
      Alert.alert('Admin', patch?.id ? 'Kurye görevi güncellendi.' : 'Kurye görevi eklendi.');
      adminCourierJobsCacheRef.current.loadedAt = 0;
      await loadAdminCourierJobs(true);
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_courier_jobs'));
    } finally {
      setAdminCourierJobsLoading(false);
    }
  }, [loadAdminCourierJobs]);

  const adminSendBroadcast = useCallback(async ({ title, body, sender_name = 'DrabornEagle', audience = 'everyone', target_screen = 'map' }) => {
    setAdminBroadcastLoading(true);
    try {
      const cleanTitle = String(title || '').trim();
      const cleanBody = String(body || '').trim();
      const cleanAudience = String(audience || 'everyone').trim() || 'everyone';
      const cleanTargetScreen = String(target_screen || 'map').trim() || 'map';
      if (cleanTitle.length < 3) return { ok: false, error: Alert.alert('Admin', 'Bildirim başlığı en az 3 karakter olmalı.') };
      if (cleanBody.length < 3) return { ok: false, error: Alert.alert('Admin', 'Bildirim metni en az 3 karakter olmalı.') };
      const { data } = await sendAdminBroadcast({ accessToken: sessionAccessToken, title: cleanTitle, body: cleanBody, sender_name, audience: cleanAudience, target_screen: cleanTargetScreen });
      Alert.alert('Admin', `Yayın gönderildi. Segment: ${cleanAudience} • Ekran: ${cleanTargetScreen} • Hedef: ${Number(data?.targetCount || 0)} cihaz`);
      return { ok: true, data };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'push_broadcast'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminBroadcastLoading(false);
    }
  }, [sessionAccessToken]);


  const loadAdminNotificationTemplates = useCallback(async (force = false) => {
    const cached = adminNotificationTemplateCacheRef.current;
    const isFresh = Array.isArray(cached.rows) && (Date.now() - cached.loadedAt) < ADMIN_LOOT_CACHE_TTL_MS;
    if (!force && isFresh) {
      setAdminNotificationTemplates(cached.rows);
      return cached.rows;
    }

    setAdminNotificationTemplateLoading(true);
    try {
      const { data, error } = await fetchAdminNotificationTemplates();
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setAdminNotificationTemplates(rows);
      adminNotificationTemplateCacheRef.current = { rows, loadedAt: Date.now() };
      return rows;
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_notification_templates'));
      return [];
    } finally {
      setAdminNotificationTemplateLoading(false);
    }
  }, []);

  const adminSaveNotificationTemplateAction = useCallback(async (dkd_patch_value) => {
    setAdminNotificationTemplateLoading(true);
    try {
      const { error } = await saveAdminNotificationTemplate(dkd_patch_value || {});
      if (error) throw error;
      Alert.alert('Admin', 'Otomatik bildirim şablonu güncellendi.');
      adminNotificationTemplateCacheRef.current.loadedAt = 0;
      await loadAdminNotificationTemplates(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_notification_templates'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminNotificationTemplateLoading(false);
    }
  }, [loadAdminNotificationTemplates]);



  const loadAdminBossDefs = useCallback(async (force = false) => {
    const cached = adminBossCacheRef.current;
    const isFresh = Array.isArray(cached.rows) && (Date.now() - cached.loadedAt) < ADMIN_DROPS_CACHE_TTL_MS;
    if (!force && isFresh) {
      setAdminBossDefs(cached.rows);
      return cached.rows;
    }

    setAdminBossLoading(true);
    try {
      const { data, error } = await fetchAdminBossDefs();
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      setAdminBossDefs(rows);
      adminBossCacheRef.current = { rows, loadedAt: Date.now() };
      return rows;
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_boss_defs'));
      return [];
    } finally {
      setAdminBossLoading(false);
    }
  }, []);

  const adminSaveBoss = useCallback(async (payload) => {
    setAdminBossLoading(true);
    try {
      const boss_key = String(payload?.boss_key || payload?.title || 'boss').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let art_image_url = String(payload?.art_image_url || '').trim();
      if (isLocalAssetUri(art_image_url)) {
        const upload = await uploadAdminBossArt({ imageUri: art_image_url, bossKey: boss_key, title: payload?.title });
        if (upload.error) throw upload.error;
        art_image_url = String(upload?.data?.publicUrl || '').trim();
      }
      const { data, error } = await upsertAdminBossDef({
        ...payload,
        boss_key,
        art_image_url: art_image_url || null,
      });
      if (error) throw error;
      Alert.alert('Admin', payload?.id ? 'Boss güncellendi.' : 'Boss kaydedildi.');
      adminBossCacheRef.current.loadedAt = 0;
      await loadAdminBossDefs(true);
      return { ok: true, data };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_boss_defs'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminBossLoading(false);
    }
  }, [loadAdminBossDefs]);


  const loadAdminMarketCommand = useCallback(async (force = false) => {
    const cached = adminMarketCacheRef.current;
    const isFresh = Array.isArray(cached.rows) && (Date.now() - cached.loadedAt) < ADMIN_LOOT_CACHE_TTL_MS;
    if (!force && isFresh) {
      setAdminMarketUi(cached.ui || null);
      setAdminMarketDefs(cached.rows || []);
      setAdminMarketRewardTypes(cached.rewardTypes || []);
      return { ui: cached.ui || null, packs: cached.rows || [], rewardTypes: cached.rewardTypes || [] };
    }

    setAdminMarketLoading(true);
    try {
      const [{ data, error }, rewardTypeRes] = await Promise.all([
        fetchAdminMarketCommandSnapshot(),
        fetchAdminMarketRewardTypes(),
      ]);
      if (error) throw error;
      if (rewardTypeRes?.error) throw rewardTypeRes.error;
      const ui = data?.ui || null;
      const packs = Array.isArray(data?.packs) ? data.packs : [];
      const rewardTypes = Array.isArray(rewardTypeRes?.data) ? rewardTypeRes.data : [];
      setAdminMarketUi(ui);
      setAdminMarketDefs(packs);
      setAdminMarketRewardTypes(rewardTypes);
      adminMarketCacheRef.current = { ui, rows: packs, rewardTypes, loadedAt: Date.now() };
      return { ui, packs, rewardTypes };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_market_shop_defs'));
      return { ui: null, packs: [], rewardTypes: [] };
    } finally {
      setAdminMarketLoading(false);
    }
  }, []);

  const adminSaveMarketUi = useCallback(async (payload) => {
    setAdminMarketLoading(true);
    try {
      const { error } = await saveAdminMarketUi(payload || {});
      if (error) throw error;
      Alert.alert('Admin', 'Market üst alanı güncellendi.');
      adminMarketCacheRef.current.loadedAt = 0;
      await loadAdminMarketCommand(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_market_ui_config'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminMarketLoading(false);
    }
  }, [loadAdminMarketCommand]);

  const adminSaveMarketPack = useCallback(async (payload) => {
    setAdminMarketLoading(true);
    try {
      const { error } = await upsertAdminMarketPack(payload || {});
      if (error) throw error;
      Alert.alert('Admin', payload?.id ? 'Market paketi güncellendi.' : 'Market paketi eklendi.');
      adminMarketCacheRef.current.loadedAt = 0;
      await loadAdminMarketCommand(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_market_shop_defs'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminMarketLoading(false);
    }
  }, [loadAdminMarketCommand]);



  const adminSaveMarketRewardType = useCallback(async (payload) => {
    setAdminMarketLoading(true);
    try {
      const { error } = await upsertAdminMarketRewardType(payload || {});
      if (error) throw error;
      Alert.alert('Admin', payload?.id ? 'Ödül türü güncellendi.' : 'Ödül türü eklendi.');
      adminMarketCacheRef.current.loadedAt = 0;
      await loadAdminMarketCommand(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_market_reward_types'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminMarketLoading(false);
    }
  }, [loadAdminMarketCommand]);

  const adminDeleteMarketRewardType = useCallback(async (rewardTypeId) => {
    setAdminMarketLoading(true);
    try {
      const { error } = await deleteAdminMarketRewardType(rewardTypeId);
      if (error) throw error;
      Alert.alert('Admin', 'Ödül türü silindi.');
      adminMarketCacheRef.current.loadedAt = 0;
      await loadAdminMarketCommand(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_market_reward_types'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminMarketLoading(false);
    }
  }, [loadAdminMarketCommand]);

  const adminDeleteMarketPack = useCallback(async (packId) => {
    setAdminMarketLoading(true);
    try {
      const { error } = await deleteAdminMarketPack(packId);
      if (error) throw error;
      Alert.alert('Admin', 'Market paketi silindi.');
      adminMarketCacheRef.current.loadedAt = 0;
      await loadAdminMarketCommand(true);
      return { ok: true };
    } catch (dkd_error_value) {
      Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_market_shop_defs'));
      return { ok: false, error: dkd_error_value };
    } finally {
      setAdminMarketLoading(false);
    }
  }, [loadAdminMarketCommand]);

  const adminDeleteBoss = useCallback((dropId) => {
    Alert.alert('Boss Sil', 'Bu boss kaydı kalıcı olarak silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setAdminBossLoading(true);
          try {
            const { error } = await deleteAdminBossDef(dropId);
            if (error) throw error;
            Alert.alert('Admin', 'Boss silindi.');
            adminBossCacheRef.current.loadedAt = 0;
            await loadAdminBossDefs(true);
          } catch (dkd_error_value) {
            Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_boss_defs'));
          } finally {
            setAdminBossLoading(false);
          }
        },
      },
    ]);
  }, [loadAdminBossDefs]);

  const adminDeleteCourierJobAction = useCallback((jobId) => {
    Alert.alert('Kurye Görevi Sil', 'Bu kurye görevi silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'SİL',
        style: 'destructive',
        onPress: async () => {
          setAdminCourierJobsLoading(true);
          try {
            const { error } = await deleteAdminCourierJob(jobId);
            if (error) throw error;
            Alert.alert('Admin', 'Kurye görevi silindi.');
            adminCourierJobsCacheRef.current.loadedAt = 0;
            await loadAdminCourierJobs(true);
          } catch (dkd_error_value) {
            Alert.alert('Admin', humanizeAdminError(dkd_error_value, 'dkd_courier_jobs'));
          } finally {
            setAdminCourierJobsLoading(false);
          }
        },
      },
    ]);
  }, [loadAdminCourierJobs]);

  return {
    adminLoading, lootEntries, cardDefs, cardSearch, setCardSearch,
    adminDropsLoading, adminDrops, loadAdminData, adminAddLoot, adminDeleteLoot, loadAdminDrops, adminUpsertDrop, adminDeleteDrop,
    adminUsersLoading, adminUsers, adminUserSearch, setAdminUserSearch, loadAdminUsers, adminSaveUser,
    adminCourierJobsLoading, adminCourierJobs, loadAdminCourierJobs, adminUpsertCourierJob, adminDeleteCourierJob: adminDeleteCourierJobAction,
    adminBroadcastLoading, adminSendBroadcast,
    adminNotificationTemplateLoading, adminNotificationTemplates, loadAdminNotificationTemplates, adminSaveNotificationTemplate: adminSaveNotificationTemplateAction,
    adminBossLoading, adminBossDefs, loadAdminBossDefs, adminSaveBoss, adminDeleteBoss,
    adminMarketLoading, adminMarketUi, adminMarketDefs, adminMarketRewardTypes, loadAdminMarketCommand, adminSaveMarketUi, adminSaveMarketPack, adminDeleteMarketPack, adminSaveMarketRewardType, adminDeleteMarketRewardType,
  };
}
