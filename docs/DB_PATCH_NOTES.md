# Lootonia DB Patch Notes

Bu dosya, uygulamada ihtiyaç duyulan DB sürüm değişikliklerini takip etmek için kullanılır.

## Kurallar
- Her şema değişikliği `supabase/migrations/` içine SQL dosyası olarak eklenir.
- Dosya adı sırası:
  - 001_init.sql
  - 002_user_profile.sql
  - 003_rewards.sql
- Kod tarafında bir DB patch ihtiyacı oluşursa önce migration yazılır, sonra uygulama buna göre güncellenir.

## Mevcut Durum
- Faz 1 başlangıç dosyası oluşturuldu.
