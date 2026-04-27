# Production-Safe Pack 1

Bu paket yeni oyun özelliği eklemez.
Amaç, repo içindeki tarihsel placeholder migration izleri ile canlıda gerçekten kullanılan RPC gövdelerini birbirinden ayırmaktır.

## Neden gerekli?
Final QA taramasında `todo_*` stringleri görünüyordu. Bunların önemli bir kısmı eski migration geçmişi içindedir.
Bu tek başına uygulamanın bozuk olduğu anlamına gelmez. Asıl kritik soru şudur:

> Canlıda kullanılan RPC gövdeleri hâlâ `todo_*` placeholder mı dönüyor?

Bu paket tam olarak bunu ayırır.

## Eklenenler
- `scripts/db-canonical-placeholder-audit.sh`
  - Repo içindeki kanonik release dosyalarını kontrol eder.
  - Tarihsel placeholder dosyalarını bilgi amaçlı ayrı raporlar.
- `supabase/sql/phase45_release_preflight.sql`
  - Canlı DB üzerinde RPC gövdelerini `pg_get_functiondef(...)` ile kontrol eder.
  - Her fonksiyon için `ok`, `missing` veya `placeholder_detected` döner.

## Kanonik release tabanı
Bu proje ağacında release için referans alınması gereken dosyalar:
- `020_chest_hardening.sql`
- `021_chest_boss_live_parity.sql`
- `022_market_live_parity.sql`
- `023_market_rpc_hardening.sql`
- `025_task_leaderboard_hardening_draft.sql`
- `phase45_release_preflight.sql`

## Kullanım
Repo tarafı denetimi:

```bash
bash scripts/db-canonical-placeholder-audit.sh ~/projects/lootonia
```

Canlı DB denetimi:
- `supabase/sql/phase45_release_preflight.sql` dosyasını SQL editor veya psql üzerinden çalıştır.
- Sonuçta `placeholder_detected` dönen fonksiyon kalmamalı.

## Sonraki karar
- Eğer tüm kanonik fonksiyonlar `ok` ise: release hardening tamamlanır.
- Eğer `placeholder_detected` varsa: ilgili fonksiyonun final migration gövdesi canlıya parity ile taşınır.
