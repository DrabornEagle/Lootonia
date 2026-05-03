# Lootonia – Performance Core 5

Bu paket "özellik bozmadan admin tarafını hafifletme" adımıdır.

## Amaç
- Admin modal ağacını ana `ModalHost` içinden ayırmak
- Büyük admin listelerinde `ScrollView` yerine sanallaştırılmış `FlatList` kullanmak
- Uzun kullanıcı / görev / drop listelerinde Android kaydırma ve açılış yükünü azaltmak

## Dokunulan dosyalar
- `src/core/ModalHost.js`
- `src/core/AdminModalStack.js` (yeni)
- `src/features/admin/AdminUsersModal.js`
- `src/features/admin/AdminCourierJobsModal.js`
- `src/features/admin/AdminDropsModal.js`

## Yapılan değişiklikler
1. `ModalHost` içindeki admin modal render blokları ayrı `AdminModalStack` bileşenine taşındı.
2. `AdminUsersModal` kullanıcı listesi `FlatList` oldu.
3. `AdminCourierJobsModal` görev listesi `FlatList` oldu.
4. `AdminDropsModal` drop listesi `FlatList` oldu.
5. Form yapıları ve mevcut admin işlevleri korunmaya çalışıldı; veri modeli veya Supabase çağrıları değiştirilmedi.

## Beklenen etkiler
- Admin kullanıcı listesi daha akıcı olur
- Admin kurye görevleri ekranı daha stabil kayar
- Drop yönetimi uzun listelerde daha az kasar
- `ModalHost` daha okunur ve daha küçük bir sorumluluk alanına iner

## Test et
- Admin Menü açılıyor mu
- Kullanıcı ara / düzenle / kaydet
- Kurye görevi ekle / düzenle / sil
- Drop ekle / düzenle / sil
- Broadcast ve Loot ekranları hala açılıyor mu

## Not
Bu paket güvenli bölgede tutuldu: oyun ekonomisi, auth, chest, boss ve market mantığına dokunulmadı.
