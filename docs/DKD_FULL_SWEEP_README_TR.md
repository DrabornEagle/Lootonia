# DKD Full Sweep Paketi

Bu paket, repo ve Supabase SQL kaynaklarında kalan eski kısa alias / kısa local / kısa parametre kalıntılarını `dkd_` ve `dkd.` standardına yaklaştırmak için hazırlandı.

## Bu pakette yapılanlar
- Kaynak repo kopyası üretildi.
- Kritik JS/TS callback parametreleri ve catch değişkenleri `dkd_` isimlerine çekildi.
- SQL dosyalarında kısa tablo alias kullanımları `dkd_alias_*` standardına çekildi.
- Başarılı çalışan v13 runtime repair SQL dosyası repo içine eklendi.
- Yeni audit scripti eklendi.

## Dürüst not
- Bu sweep üçüncü parti bağımlılıkları, `package-lock.json`, binary asset dosyalarını ve görselleri değiştirmez.
- String içerikleri ve kullanıcıya görünen metinler bilinçli olarak yeniden adlandırılmadı.
- Odak: çalıştırılabilir kaynak kod ve SQL tanımlarıdır.
