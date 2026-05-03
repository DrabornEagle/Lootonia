# Lootonia LiveOps Core 2

Bu paket **LiveOps Core 1 üstüne** kurulmak üzere hazırlandı.

Eklenenler:
- Banner rotasyonu için 3 yerel etkinlik profili
- Görevler ekranına eklenen etkinlik görevleri
- Etkinlik görev claim akışı (token/xp)
- Admin menüsüne LiveOps paneli
- Admin panelinden:
  - etkinliği aç/kapat
  - otomatik rotasyon aç/kapat
  - sonraki etkinliğe geç
  - günlük ödül modalını tekrar aç

Teknik notlar:
- DB migration gerekmez
- Etkinlik ve claim durumları kullanıcı bazlı AsyncStorage içinde tutulur
- Profil token/xp artışı mevcut Supabase profil güncellemesi üstünden yapılır
- Bu paket Expo test akışı için tasarlandı

Varsayım:
- LiveOps Core 1 kurulu olmalı

Kontrol listesi:
1. Oyuna girince banner açılıyor mu?
2. Görevler ekranında etkinlik görevleri görünüyor mu?
3. Tamamlanan etkinlik görevi claim edilebiliyor mu?
4. Admin menüsünde LiveOps Etkinlikleri butonu çalışıyor mu?
5. Etkinlik değiştirince banner başlığı değişiyor mu?
6. Etkinliği kapatınca görev kartları ve banner durumu doğru değişiyor mu?
