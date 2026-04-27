# Lootonia Migration Plan

Bu klasor, Supabase tarafinda uygulanacak guncel migration zincirini ve amacini ozetler.

## Dosya Sirasi

001_real_init.sql
- cekirdek profiller, drop tablolari, temel trigger ve ilk RPC tabani

002_cards_loot_chests_market_base.sql
- kart, loot, chest history ve market temel tablolari

003_rpc_chests_and_market.sql
- sandik acma ve market RPC katmani

004_rpc_shards_and_crafting.sql
- shard, craft ve upgrade ekonomisi

005_rpc_tasks_and_leaderboard.sql
- gorev ve leaderboard RPC temeli

006_rpc_admin_and_courier.sql
- admin ve kurye RPC temeli

007_seed_minimal.sql
- minimum kart, loot, drop ve test seed verileri

008_profile_helpers.sql
- profil yardimci patchleri

009_drop_chest_core.sql
- drop/chest cekirdek hotfixleri

010_admin_loot_system.sql
- admin loot yonetimi

011_market_system.sql
- market duzeltmeleri ve guvenlik yamalari

012_shard_system.sql
- shard sistemi genisletmeleri

013_secure_chest_manual_code.sql
- guvenli sandik ve manuel kod sistemi

014_task_claim_system.sql
- gorev claim uyumluluk yamalari

015_leaderboard_system.sql
- haftalik lig ve odul duzeltmeleri

016_history_compat.sql
- history uyumluluk katmani

017_admin_broadcast_foundation.sql
- admin broadcast temeli

018_push_broadcast_foundation.sql
- push token ve yayin altyapisi

019_push_deeplink_segment_hotfix.sql
- deep-link / segment push hotfixleri

## Not
Bu proje placeholder migration asamasini gecmistir. Kanonik zincir yukaridaki 19 dosyadir.
