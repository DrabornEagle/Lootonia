# DKD Repo Cleanup - 2026-04-21

Bu belge, `projects/Lootonia` deposu için yapılan repo temizlik düzenini açıklar.

## Temizlik hedefleri
- Tek aktif kaynak ağacına dönmek
- Kök dizindeki geçici patch / log / zip / txt artıklarını temizlemek
- Yanlış yerde duran SQL ve rapor dosyalarını doğru klasörlere taşımak
- README belgelerini güncel repo standardına uyarlamak

## Uygulanan ana düzenlemeler

### 1) Tek aktif kaynak kuralı
Aşağıdaki ikinci kaynak ağacı kaldırıldı:
- `Lootonia/src/`

Aktif kaynak ağacı yalnızca şudur:
- `src/`

### 2) Kök dizin artıklarının temizlenmesi
Aşağıdaki geçici veya operasyonel artıklar kaldırıldı:
- `README_TR.txt`
- `TERMUX_COMMANDS.txt`
- `TERMUX_APPLY_DKD_20260417_RUNTIME_REPAIR.txt`
- `TERMUX_APPLY_DKD_20260417_ADMIN_SYNTAX_AND_UI_HOTFIX.txt`
- `TERMUX_APPLY_DKD_20260417_ALLY_CHAT_PREMIUM_REDESIGN.txt`
- `lootonia_courier_job_push_fix_pack.zip`
- `dkd_send_courier_deploy.log`
- `send-courier-order-alert/`

### 3) Arşivlenerek taşınan dosyalar
Kök dizinde kalmaması gereken ama tamamen silinmesi de istenmeyen bazı rapor ve SQL dosyaları düzenli arşiv alanına taşındı:

#### Docs arşivi
- `docs/archive/root_history/`

#### SQL arşivi
- `supabase/sql/archive/`

### 4) README güncellemesi
Aşağıdaki dosyalar güncellendi:
- `README.md`
- `README_TR.md`

Yeni README yapısı şunları netleştirir:
- aktif klasör yolu `projects/Lootonia`
- aktif kaynak kökleri
- Termux hızlı başlangıç
- repo hijyen kuralları

## Bundan sonra korunacak kurallar
- `src/` dışında ikinci bir uygulama kaynak ağacı açılmayacak.
- `supabase/functions/` dışında duplicate function klasörü bırakılmayacak.
- Kök dizine geçici patch zip, deploy log, termux geçici txt dosyaları atılmayacak.
- Tarihsel notlar `docs/` altında, SQL geçmişi `supabase/sql/` altında tutulacak.

## Not
Bu cleanup işlemi çalışma mantığını değiştirmekten çok repo hijyenini düzeltmek içindir. Runtime ve feature davranışını değiştiren ana kod düzenlemeleri ayrıca planlanmalıdır.
