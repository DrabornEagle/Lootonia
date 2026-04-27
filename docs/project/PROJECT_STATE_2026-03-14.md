# Lootonia Project State — 2026-03-14

## Genel durum
Proje Expo + Supabase tabanlı çalışır çekirdeğe sahip.

## Çekirdek modüller
- Auth / profil
- Harita / drop / chest
- Boss
- Görevler / leaderboard
- Koleksiyon / market
- Admin
- Kurye
- Push foundation

## Teknik gözlem
- Runtime çekirdeği çalışıyor.
- Geçmişte `GameFlow.js` refactor denemesi kırılmaya sebep oldu.
- Güvenli yaklaşım: çekirdek runtime'a dokunmadan önce repo hijyeni, docs ve operasyon standardı tamamlanmalı.

## Tamamlanan güvenli işler
- Repo arşiv/patch klasörleri temizleme hazırlığı
- Kullanılmayan kaynak adaylarını karantina planı
- Docs/ops standardizasyonu

## Dokunma listesi
Aşağıdaki dosyalara küçük ve kontrollü değişiklik dışında toplu refactor uygulanmamalı:
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/hooks/useDropState.js`
- `src/hooks/useLocationTracker.js`
- `src/services/notificationService.js`

## Sonraki mantıklı teknik adım
Runtime çekirdeğini kırmadan:
1. lint / unused import cleanup
2. docs ve env standardı
3. audit destekli küçük performans iyileştirmeleri
4. en son çekirdek refactor
