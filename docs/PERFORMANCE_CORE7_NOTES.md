# Lootonia — Performance Core 7

Bu paket ana harita ekranındaki gereksiz yeniden render yükünü azaltmak için hazırlandı.

## Dokunulan dosyalar
- `src/core/GameFlow.js`
- `src/features/map/MapHomeScreen.js`
- `src/features/map/HeaderOverlay.js`
- `src/features/map/PremiumMapMarker.js`

## Yapılan değişiklikler
- `tokenText` artık `GameFlow` içinde memoize ediliyor.
- `MapHomeScreen` içindeki gereksiz prop geçişleri temizlendi.
- Harita marker katmanı ayrı memoize edildi.
- Marker öğeleri `MapDropMarker` katmanına ayrıldı.
- `HeaderOverlay` özel prop karşılaştırması ile daha stabil hale getirildi.
- `BottomNav` için sadece kilit açma hesabında gereken minimal profil modeli geçirildi.
- `PremiumMapMarker` görseli gereksiz yere tekrar hesaplanmıyor.

## Amaç
- Harita ekranı açıkken token, enerji, görev ve başka state güncellemelerinde tüm haritanın daha az zorlanması
- Özellikle Android cihazlarda ana ekran akıcılığını iyileştirmek
- Oyun mantığına dokunmadan UI render yükünü azaltmak

## Dokunulmayan alanlar
- Auth
- Supabase RPC akışları
- Chest / Boss / Market mantığı
- Görev claim hesapları

## Kurulum
```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_performance_core7_patch_pack.zip -d .
bash scripts/apply_lootonia_performance_core7.sh ~/projects/lootonia
npx expo start -c
```

## Kontrol listesi
- Harita açılışı daha akıcı mı
- Marker'a basınca sandık akışı çalışıyor mu
- Menü ve konum butonu çalışıyor mu
- Token artışı olduğunda HUD animasyonu çalışıyor mu
- Alt menü geçişleri bozulmadı mı
