# DKD 2026-04-11 — Lootonia kurye takip modernizasyon raporu

## İncelenen yapı
- Proje tipi: Expo + React Native + Supabase
- Toplam dosya: 375
- `src/` dosya sayısı: 150
- `src/features/courier/` dosya sayısı: 5
- `src/services/` dosya sayısı: 32
- `supabase/migrations/` dosya sayısı: 56
- `supabase/sql/` dosya sayısı: 18

## Mevcut durum özeti
Projede kurye/kargo akışı ana olarak şu dosyalar üzerinden ilerliyor:
- `src/features/courier/dkd_cargo_live_map_modal.js`
- `src/features/courier/dkd_cargo_sender_panel.js`
- `src/services/dkd_cargo_service.js`
- `src/features/courier/CourierBoardModal.js`

## Bu pakette yapılanlar
### 1) Kurye canlı takip ekranı yenilendi
- Alt panel sıfıra yakın yeniden düzenlendi.
- Daha modern, kart bazlı ve daha okunur bir bilgi alanı kuruldu.
- Üst başlık küçültüldü ve 2 satıra taşabilecek şekilde güvenli hale getirildi.
- Sağ yandaki ikinci harita ikonu kaldırıldı.
- Harita ilk açılışta genel rotaya değil, kurye konumuna yakın odaklanacak şekilde değiştirildi.
- `ETA` metni `Varış` olarak değiştirildi.
- `Aktif rota` metni `Toplam Rota` olarak değiştirildi.
- `Teslim` metni `Teslim Edilecek` olarak güncellendi.
- `Moto` metni `Motosiklet` olarak güncellendi.
- Kurye ile teslim noktası arasındaki kalan km bilgisi ayrı metrik kartına eklendi.
- Gündüz/gece döngüsüne göre harita stili otomatik değişir hale getirildi.
- Kurye marker yapısı büyütülüp yeniden hizalandı; yarım/kırpılmış görünme riski azaltıldı.

### 2) Gönderilerim yenileme sıklığı yumuşatıldı
- Normal gönderi listesi otomatik yenileme: `45 sn -> 90 sn`
- Canlı takip açıkken yenileme: `12 sn -> 18 sn`

### 3) Gönderi kartındaki araç etiketi iyileştirildi
- Ham `MOTO` yerine kullanıcı dostu `Motosiklet` etiketi gösterilecek.

## Teknik not
Bu paket yalnızca UI/UX ve istemci davranışı değiştirir.
Supabase tarafında yeni migration, tablo, RPC veya policy ihtiyacı yoktur.
Bu yüzden pakete operasyon standardı bozulmasın diye no-op bir SQL dosyası eklendi.

## Repo analiz sonucu
### Güçlü taraflar
- Kurye/kargo özelliği ayrı feature dosyalarına bölünmüş.
- Supabase tarafında cargo için dkd_ isimli SQL geçmişi mevcut.
- Yerel değişken ve yeni cargo tarafı büyük ölçüde `dkd_` standardına yakın.

### Riskli taraflar
- Repo genelinde hâlâ çok sayıda legacy dosya adı mevcut. `src/core`, `src/hooks`, `src/services` içinde yaygın biçimde `dkd_` dışı isimler var.
- Proje dokümanında da belirtildiği gibi `GameFlow.js`, `ModalHost.js`, `useDropState.js`, `useLocationTracker.js`, `notificationService.js` çekirdek risk alanları.
- Mevcut `scripts/local/dkd_strict_naming_scan.sh` çıktısına göre yasaklı `v_ / r_ / p_ / t_ / h_` prefix ihlali görünmüyor; fakat dosya adı standardı repo çapında henüz tamamlanmış değil.

## Önerilen sonraki teknik adım
Kurye/kargo tarafında bir sonraki mantıklı adım:
1. `CourierBoardModal.js` ve `CourierProfileModal.js` içindeki araç ve statü etiketlerini de tamamen yeni kurye takip diliyle hizalamak.
2. Ardından ana harita (`MapHomeScreen.js`) için aynı gündüz/gece stil altyapısını taşımak.
3. Sonrasında repo çapında kontrollü `dkd_` dosya adı migrasyon planı çıkarmak.
