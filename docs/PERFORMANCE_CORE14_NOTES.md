# Lootonia – Performance Core 14

Bu paket harita açılışındaki drop veri türetimini iki kademeye böler.

## Amaç
- İlk frame'i daha hızlı vermek
- Harita görünür olduğunda marker ve temel drop listesi hemen gelsin
- Akıllı sıralama / dock preview hesaplarını interaction sonrasına bırakmak

## Yapılanlar
- `useDropDerived` içinde ağır sıralama `InteractionManager.runAfterInteractions` sonrasına taşındı
- İlk render için görünür drop girdileri orijinal sırada anında kullanılıyor
- Deferred sıralama tamamlanınca `dockPreview` ve sıralı görünüm güncelleniyor
- Dock paneli bu sırada kısa bir "Radar hazırlanıyor" durumu gösterebiliyor

## Dokunulan dosyalar
- `src/hooks/useDropState.js`
- `src/core/GameFlow.js`
- `src/core/propBuilders.js`
- `src/features/map/MapHomeScreen.js`
- `src/features/map/DropDockPanel.js`

## Beklenen fayda
- Harita ilk açılış hissi daha yumuşak olur
- Drop verisi çokken ilk frame daha hızlı gelir
- Dock preview ve akıllı sıralama ana etkileşimi bloke etmez

## Risk düzeyi
Düşük. Oyun kuralları, auth, Supabase, chest/boss akışı değişmez.
