# Phase 19 — Chest Reset Patch

Bu patch, mevcut genel sci-fi modal görünümünü bırakıp referanstaki ikinci ekrana daha yakın bir kompozisyona geçer.

## Değişen dosya
- `src/features/chest/ChestModal.js`

## Ne değişir
- Üstte tek parça `CHEST OPEN!` başlık kasası gelir
- Ortada dikey kart + pedestal kompozisyonu kurulur
- Altta token / shard / energy ödül footer'ı gelir
- `Collect` CTA'sı altta tek ana aksiyon olur
- Opening sahnesi daha çok “sandık açılış vitrini” gibi görünür

## Not
Bu patch, eski generic premium chest görünümünü düzeltmek için hazırlanmıştır. Hedef, piksel kopyası değil; referanstaki kompozisyon mantığını yakalamaktır.
