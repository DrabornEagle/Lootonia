# Manual Hotfix Ledger

Bu dosya, dashboard üzerinden elle uygulanmış veya repo dışında üretilmiş DB düzeltmelerini tek yerde toplar.
Amaç: canlı DB ile repo migration geçmişi arasındaki farkı görünür hale getirmek.

## Chest / Boss hattında görülen canlı hotfix başlıkları

- 24.1: `dkd_drop_codes` tablo/kolon eksiklerinin giderilmesi
- 24.2: chest hardening kuralları (location / too_far / qr_secret_required / boss clamp)
- 24.4: manual code compatibility ve unique-code hizalama
- 24.4c: open-by-code alignment
- 24.4g: chest logs view/table compatibility
- 24.4i: boss RPC parity / EXECUTE izni kontrolü
- 24.4l: `dkd__distance_meters` helper ve boss distance signature uyumu
- 24.4m: boss schema-compatible rebuild

## Not

Bu ledger canlı DB'de uygulanmış değişikliklerin **kanonik migration** haline getirilmesi için ara listedir.
Repo içindeki yeni migration dosyası, bu maddelerin tamamını tek sıraya koymalıdır.
## Phase 24.5e (20260314_061744)
- Chest/Boss canlı parity draft'ı final migration dosyasına dönüştürüldü.
- Final kaynak:   -         \

