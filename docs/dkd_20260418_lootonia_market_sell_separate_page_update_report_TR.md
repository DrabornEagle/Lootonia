# Lootonia Market Sell Separate Page Update

## Yapılanlar
- Market üst bölümünde `Takviye Ürünleri` başlığı `Takviye Ürünler` olarak güncellendi.
- Market üst bölümünde `İşletme Ürünleri` başlığı `İşletme Ürünler` olarak güncellendi.
- Kart satışı akışında nadirlik bazlı liste tek blok görünümden çıkarıldı.
- Kart satışı için ayrı sayfa mantığı eklendi:
  - ilk ekran: nadirlik kategori kartları
  - ikinci ekran: seçili nadirlik vitrini + kart seçimi + fiyat girme
- Nadirlik kategori kartları modern gradient kart görünümünde düzenlendi.

## Değişen dosya
- `src/features/market/MarketModal.js`

## Not
- SQL değişikliği yok.
- dkd_ isim standardı yeni state, helper ve dosya isimlerinde korundu.
