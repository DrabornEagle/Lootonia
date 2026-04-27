# Phase 43 — Staging DB Apply + Verify

Bu fazın amacı, Phase 41 ve Phase 42'de üretilen draft migration'ları **önce staging'de**, kontrollü sırayla doğrulamak.

## Neden gerekli?
- `014_task_claim_system.sql` ve `015_leaderboard_system.sql` placeholder RPC'lerle gerçek mantığı ezmiş durumda.
- Market tarafında da tekrar listeleme / duplicate / güvenli satın alma tarafı sertleştirme bekliyor.
- Bunları doğrudan prod'a basmak riskli.

## Çalıştırma sırası
1. `supabase/sql/phase43_staging_preflight_bundle.sql`
2. `supabase/sql/phase41_market_chest_preflight.sql`
3. `supabase/migrations/024_market_chest_hardening_draft.sql`
4. tekrar `supabase/sql/phase41_market_chest_preflight.sql`
5. `supabase/sql/phase42_task_leaderboard_preflight.sql`
6. `supabase/migrations/025_task_leaderboard_hardening_draft.sql`
7. tekrar `supabase/sql/phase42_task_leaderboard_preflight.sql`
8. leaderboard smoke check

## Başarı kriterleri
- Market preflight artık `todo_*` veya duplicate risklerini göstermemeli.
- `dkd_task_claim`, `dkd_weekly_task_claim`, `dkd_get_weekly_leaderboard2`, `dkd_admin_close_week`, `dkd_claim_weekly_top_reward` placeholder yerine gerçek mantık dönmeli.
- Leaderboard SQL Editor'da takılmadan cevap dönmeli.
- Mobil uygulamada Liderlik ekranı açılmalı ve sürekli loading'e düşmemeli.

## Not
Bu faz **mobil runtime'ı değiştirmez**. Sadece staging DB apply sırasını ve doğrulama akışını netleştirir.
