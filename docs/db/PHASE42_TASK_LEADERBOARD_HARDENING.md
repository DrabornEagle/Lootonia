# Phase 42 — Task + Leaderboard Hardening

Bu faz **uygulama koduna dokunmaz**. Amaç, `014_task_claim_system.sql` ve `015_leaderboard_system.sql` içindeki placeholder RPC'leri çalışan ve frontend ile uyumlu hale getiren bir **draft migration** hazırlamaktır.

## Neden gerekli?

Şu an projede şu durum var:

- `005_rpc_tasks_and_leaderboard.sql` içinde çalışan görev ve leaderboard mantığı var.
- Ama daha sonra gelen `014_task_claim_system.sql` ve `015_leaderboard_system.sql` bu fonksiyonları tekrar `todo_*` placeholder sürümlerle eziyor.
- Frontend ise hâlâ şu RPC'leri gerçek çalışır mantıkla bekliyor:
  - `dkd_task_claim`
  - `dkd_weekly_task_claim`
  - `dkd_get_weekly_leaderboard2`
  - `dkd_admin_close_week`
  - `dkd_claim_weekly_top_reward`

## Bu paketin ürettiği dosyalar

- `supabase/migrations/025_task_leaderboard_hardening_draft.sql`
- `supabase/sql/phase42_task_leaderboard_preflight.sql`

## Önemli not

Bu migration **draft** durumundadır. Canlıya körlemesine uygulanmamalı.

Önerilen sıra:

1. `phase42_task_leaderboard_preflight.sql` çalıştır.
2. Placeholder fonksiyonların gerçekten aktif olduğunu doğrula.
3. Önce staging / test DB'de `025_task_leaderboard_hardening_draft.sql` uygula.
4. Mobil uygulamada görev claim, leaderboard, admin week close ve reward claim akışlarını test et.
5. Sonra prod'a taşı.

## Frontend ödül matrisi ile beklenen eşleşme

### Günlük
- `chest_1` → 15 token / 0 energy
- `chest_3` → 35 token / 0 energy
- `boss_1` → 40 token / 10 energy
- `bonus` → 25 token / 0 energy

### Haftalık
- `w_chest_10` → 120 token / 10 energy
- `w_boss_3` → 200 token / 20 energy
- `w_unique_5` → 150 token / 0 energy
- `w_bonus` → 250 token / 30 energy

## Bu fazın kazancı

- görev claim RPC'leri tekrar gerçek çalışır hale gelir
- leaderboard fonksiyonları placeholder olmaktan çıkar
- hafta kapatma ve top10 ödül mantığı DB seviyesinde netleşir
- frontend / backend ödül tutarsızlığı riski azalır
