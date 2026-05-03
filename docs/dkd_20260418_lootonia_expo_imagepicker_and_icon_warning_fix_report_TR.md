# Lootonia Expo ImagePicker + Icon Warning Hotfix

Tarih: 2026-04-18

## Düzeltilen sorunlar

1. `expo-image-picker` için `ImagePicker.MediaTypeOptions.Images` kullanımı kaldırıldı.
2. Geçersiz `MaterialCommunityIcons` adı olan `camera-check-outline` değiştirildi.

## Güncellenen dosyalar

- `src/features/business/MerchantHubModal.js`
- `src/features/business/AdminBusinessModal.js`
- `src/features/admin/AdminBossModal.js`
- `src/features/admin/AdminLootModal.js`
- `src/features/courier/dkd_cargo_sender_panel.js`
- `src/features/profile/ProfileModal.js`
- `src/features/courier/CourierBoardModal.js`

## Yapılan değişiklikler

- Bütün resim seçme ve kamera çağrılarında:
  - `ImagePicker.MediaTypeOptions.Images`
  - yerine
  - `['images']`

- `CourierBoardModal.js` içinde teslim alma kanıt kartındaki ikon:
  - `camera-check-outline`
  - yerine
  - `image-check-outline`

## Beklenen sonuç

- Metro terminalindeki `MediaTypeOptions deprecated` uyarısı kaybolur.
- `camera-check-outline is not a valid icon name` uyarısı kaybolur.
