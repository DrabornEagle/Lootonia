# DKD 2026-04-11 Lootonia Kurye UI Premium Patch Raporu

## Kapsam
Bu paket yalnızca kurye/kargo arayüz tarafını günceller. Supabase tablo, view, function veya migration değişikliği içermez.

## Düzenlenen dosyalar
- src/features/courier/dkd_cargo_live_map_modal.js
- src/features/courier/dkd_cargo_sender_panel.js
- src/features/courier/CourierBoardModal.js

## Yapılan ana değişiklikler
1. Kurye takip haritasında araç rozeti kaldırıldı.
   - Haritada artık yalnızca siyah yön oku görünür.
   - Marker anchor daha dengeli hale getirildi.
   - Yarım/kesik görünme riski azaltıldı.

2. Kurye takip metinleri güncellendi.
   - `TESLİM` rozeti `TESLİM EDİLECEK` olarak değiştirildi.
   - Kurye havuzu kartında teslim hedefi metinleri daha net hale getirildi.

3. Gönderilerim ekranından ücret metinleri temizlendi.
   - `Kurye Ücreti` kaldırıldı.
   - Üst metrik alanı artık `Tahsilat / Ödeme / Takip` düzeninde.
   - Ödeme özetinde de `ücret` kelimesi yerine daha nötr metinler kullanıldı.

4. Kurye havuzu sipariş kartı premium hale getirildi.
   - Başlık alanı ikonlu ve daha okunur bir üst blok haline getirildi.
   - Adres, paket ve not alanları bilgi paneline taşındı.
   - İstatistik kutularına ikon eklendi.
   - `Ücret` metriği `Kazanç` olarak güncellendi.
   - Aksiyon butonları ikonlu ve daha premium görünüme getirildi.

## Proje analizi özeti
- Kurye/kargo akışı üç ana dosyada toplanmış durumda: canlı harita, gönderici paneli ve kurye havuzu kartı.
- İstenen değişikliklerin tamamı frontend bileşen seviyesinde çözüldü.
- Bu turda Supabase bağımlı veri şeması değişmediği için SQL çalıştırma gerekmiyor.
- Touched alanlarda görsel yoğunluk yüksekti; bu yüzden bu patch daha net bilgi hiyerarşisi ve daha sade görev kartı yapısı kuruyor.

## DKD isim standardı denetimi
- Bu patch içinde eklediğim yeni yardımcı alanlar ve stiller `dkd_` ile yazıldı.
- Ancak `CourierBoardModal.js` içinde önceki sürümlerden kalan çok sayıda legacy isim hâlâ mevcut.
- Hızlı taramada bu dosyada dkd_ dışı çok sayıda eski identifier kaldığı görüldü; bu patch onları toplu refactor etmez, yalnızca istenen UI düzeltmesini uygular.
- Sonraki tur için öneri: sadece kurye modülü özelinde tam `dkd_` naming sweep.

## Test önerisi
1. Kurye havuzu > aktif kargo kartını aç.
2. Haritada yalnızca yön oku kaldığını doğrula.
3. Takip ekranı üst rozette `TESLİM EDİLECEK` yazdığını doğrula.
4. Gönderilerim ekranında `Kurye Ücreti` ve `Ücret` metinlerinin kalktığını doğrula.
5. Paket alındı > teslim akışında butonlar ve kart düzenini kontrol et.
