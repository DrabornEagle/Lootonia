-- DKD 2026-04-12
-- Bu paket kurye paneli canlı ETA / rota / km iyileştirmesi için frontend odaklıdır.
-- Veritabanında zorunlu şema değişikliği yoktur.
-- İstersen bu dosyayı güvenle çalıştırabilirsin; sadece bilgi amaçlı notice üretir.

do $$
begin
  raise notice 'DKD 2026-04-12 kurye paneli paketi: frontend-only patch, SQL schema degisikligi yok.';
end $$;
