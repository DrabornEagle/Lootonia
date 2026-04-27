# Lootonia Radar Çekirdeği Boss/Sandık Tıklama Düzeltmesi

## Yapılan düzeltme
- Orta radar çekirdeğinde boss ikonu görünüyorsa tıklama artık en yakın görünür boss girişini açacak şekilde güçlendirildi.
- En yakın boss seçiminde mesafeye göre sıralama korunuyor.
- Bekleme süresinde olmayan boss varsa öncelikle o açılıyor.
- Tüm görünür boss girişleri bekleme durumundaysa yine en yakın boss seçilip açılmaya çalışılıyor.
- Sandık ikonu akışı değiştirilmedi; radar çekirdeği sandık modundaysa sandık listesi açılmaya devam ediyor.

## Değişen dosya
- `src/core/GameFlow.js`

## Not
- SQL değişikliği yok.
- Bu düzeltme, radar çekirdeği boss ikonundayken sadece uyarı göstermek yerine doğrudan en yakın boss akışını açmayı hedefler.
