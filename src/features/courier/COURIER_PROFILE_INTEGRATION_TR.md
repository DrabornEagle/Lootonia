# Kurye Profili Entegrasyon Notları

## 1) Yeni servis dosyasını ekle
- `src/services/courierProfileService.js`

## 2) Yeni modal dosyasını ekle
- `src/features/courier/CourierProfileModal.js`

## 3) CourierBoardModal içine import ekle
```js
import CourierProfileModal from './CourierProfileModal';
```

## 4) State ekle
```js
const [profileVisible, setProfileVisible] = useState(false);
```

## 5) Header kısmına buton ekle
Kurye operasyon merkezinin üst başlık alanına şu butonu koy:
```js
<Pressable onPress={() => setProfileVisible(true)} style={styles.secondaryAction}>
  <Text style={styles.secondaryActionText}>Kurye Profili</Text>
</Pressable>
```

## 6) Modal kapanışına ekle
```js
<CourierProfileModal
  visible={profileVisible}
  onClose={() => setProfileVisible(false)}
  profile={profile}
/>
```

## 7) Tamamlama sonrası local profile güncelle
`onComplete` akışında RPC dönüşünde şu alanları da set et:
- `courier_wallet_tl`
- `courier_total_earned_tl`
- `courier_active_days`

Örnek:
```js
setProfile((prev) => ({
  ...prev,
  courier_score: Number(row?.courier_score || prev?.courier_score || 0),
  courier_completed_jobs: Number(row?.courier_completed_jobs || prev?.courier_completed_jobs || 0),
  courier_wallet_tl: Number(row?.courier_wallet_tl || prev?.courier_wallet_tl || 0),
  courier_total_earned_tl: Number(row?.courier_total_earned_tl || prev?.courier_total_earned_tl || 0),
  courier_active_days: Number(row?.courier_active_days || prev?.courier_active_days || 0),
}));
```

## 8) Profil yükleme select listesine eklenecek alanlar
`src/services/profileService.js` içindeki select listelerine şunları ekle:
- `courier_wallet_tl`
- `courier_total_earned_tl`
- `courier_withdrawn_tl`
- `courier_active_days`
- `courier_last_completed_at`
- `courier_fastest_eta_min`
- `courier_rating_avg`
- `courier_rating_count`
- `courier_vehicle_type`
- `courier_city`
- `courier_zone`
- `courier_badges`
- `courier_profile_meta`

Not: Bu alanlar yoksa fallback zincirini bozmamak için eski select versiyonlarını koru.
