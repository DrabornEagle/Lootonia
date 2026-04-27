# Lootonia – Performance Core 8

Bu paket, harita çevresindeki yardımcı UI katmanını daha hafif hale getirir.

## Amaç
- Harita açıkken alt dock ve menü tarafındaki gereksiz yeniden render yükünü azaltmak
- Drop listesi açıkken satır ve filtre yeniden çizimlerini düşürmek
- Davranışı değiştirmeden, aynı özellikleri daha akıcı hissettirmek

## Dokunulan dosyalar
- `src/core/propBuilders.js`
- `src/features/map/MapHomeScreen.js`
- `src/features/map/DropDockPanel.js`
- `src/features/map/DropListModal.js`
- `src/features/navigation/ActionMenuModal.js`

## Yapılan değişiklikler
1. `nextBossReturnText()` sonucu string olarak `homeProps` içine taşındı.
   - Böylece memo karşılaştırmaları fonksiyon çağrısına değil, hazır string değere bakıyor.
2. `DropDockPanel` içinde önizleme modeli `useMemo` ile türetildi.
   - Boş ve dolu hero görünümleri ayrı memo bileşenlerine ayrıldı.
3. `ActionMenuModal` içindeki butonlar sabit bir action listesiyle üretildi.
   - Modal ve butonlar `memo` ile sarıldı.
4. `DropListModal` içindeki filtre çipleri ve satırlar memo hale getirildi.
   - Başlıkta kullanılan lead meta metni ayrıca memoize edildi.

## Dokunulmayan alanlar
- Auth / session
- Supabase servisleri ve RPC mantığı
- Chest / Boss / Market formülleri
- Görev claim ve kurye iş akışları

## Beklenen etki
- Harita üzerindeyken menü aç/kapat daha hafif hissedilir
- Drop listesi filtre değişimlerinde gereksiz yeniden çizim azalır
- Alt dock paneli daha stabil güncellenir
