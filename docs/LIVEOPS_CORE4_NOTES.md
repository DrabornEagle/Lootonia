# LiveOps Core 4

Bu paket LiveOps Core 3 üstüne kurulacak şekilde hazırlandı.

Eklenenler:
- Etkinlik görev satırlarında mini ilerleme barı
- Görevler ekranında son claim özeti
- Günlük ödül modalında son claim özeti
- Header altı LiveOps banner içinde son claim ve haftalık plan bugünü
- Admin LiveOps panelinde hazır haftalık preset planı seçimi
- Admin panelde haftalık plan görünümü
- Admin panelde son claim geçmişi görünümü

Teknik notlar:
- Yeni DB migration yok
- Durum yine AsyncStorage içinde tutuluyor
- Önceki streak / claim state'i korunur
- Haftalık plan seçimi sadece LiveOps gösterim ve test akışını düzenler

Kontrol listesi:
- Görevler ekranında etkinlik görevleri için ilerleme çubuğu görünüyor mu
- Event task claim sonrası son claim özeti güncelleniyor mu
- Günlük ödül modalında son claim özeti çıkıyor mu
- Admin > LiveOps Etkinlikleri içinde haftalık plan kartları çalışıyor mu
- Haftalık plan değişince banner içindeki bugünün preset satırı güncelleniyor mu
