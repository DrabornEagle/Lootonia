# Lootonia Admin Syntax + UI Hotfix

## Düzeltilenler
- `src/services/adminService.js` içinde iki kez tanımlanan `deleteAdminMarketPack` export çakışması kaldırıldı.
- `src/features/admin/AdminCourierJobsModal.js` içinde dar ekran eşik değeri yükseltildi.
- Kurye üst özet başlığı ve mikro açıklama daha minimal hale getirildi.
- Stat kart etiketleri dar ekranda daha rahat sığsın diye sıkılaştırıldı.

## Kök neden
Önceki hotfix içinde yanlış isimle eklenen ikinci bir `deleteAdminMarketPack(input = {})` bloğu, gerçek `deleteAdminMarketPack(id)` export’u ile çakıştı. Metro bu yüzden derlemeyi durdurdu.
