# Lootonia radar + market rarity update raporu

## Yapılan değişiklikler

### 1) Orta radar çekirdeği davranışı güçlendirildi
- Dosya: `src/features/map/MapHomeScreen.js`
- Radar çekirdeği artık `dockPreview.type` ve gösterilen ikon üzerinden boss hedefini daha net algılar.
- Boss ikonu gösteriliyorsa `onOpenNearestBoss()` çağrılır.
- Sandık / normal hedef görünüyorsa `onOpenDropList()` çağrılır.

### 2) Market Merkezi bölüm başlıkları güncellendi
- Dosya: `src/features/market/MarketModal.js`
- `Mağaza` -> `Takviye Ürünleri`
- `İşletme` -> `İşletme Ürünleri`
- `Kart Satış` -> `Kart Satışı`

### 3) İşletme panelindeki üst açıklama kaldırıldı
- Dosya: `src/features/market/MarketModal.js`
- `İşletmelerin token ürünleri` başlığı kaldırıldı.
- Hemen altındaki açıklama paragrafı kaldırıldı.

### 4) Kart satış alanı nadirliğe göre kategori yapısına geçirildi
- Dosya: `src/features/market/MarketModal.js`
- Satılabilir kartlar artık yatay tek sıra yerine nadirliğe göre renkli kategoriler halinde listelenir.
- Kategori sırası:
  - Mitik
  - Efsanevi
  - Epik
  - Nadir
  - Yaygın
- Açık pazar ilanları da nadirlik önceliğine göre sıralanır.

## Değişen dosyalar
- `src/features/map/MapHomeScreen.js`
- `src/features/market/MarketModal.js`
