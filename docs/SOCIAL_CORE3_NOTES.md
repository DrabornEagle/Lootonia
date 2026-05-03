# Social Core 3

Bu paket, oyuncu kartını gerçek bir paylaşım ve karşılaştırma aracına dönüştürür.

## Eklenenler
- Menüye **Oyuncu Kartı** girişi
- Profil ekranına **Kartım** kısayolu
- Profil kimliği (`YL-XXXXXX`) üreten paylaşılabilir oyuncu kartı
- Paylaşılan kart metnini içe alıp karşılaştıran **Dost Karşılaştır** modalı
- Seviye, token, koleksiyon gücü, benzersiz kart ve kurye teslimat kıyası
- Yapıştırılan paylaşım metninden istatistik ayıklama (`YL-CARD:v1:` satırı)

## Teknik notlar
- Yeni DB migration gerekmez
- Karşılaştırma temeli tamamen yerel çalışır
- Oyuncu kartı paylaşımı `Share.share()` ile yapılır
- Koleksiyon özeti için mevcut kart verisi kullanılır; kart açılırken koleksiyon arka planda tazelenir

## Kontrol listesi
- Menüde **Oyuncu Kartı** görünüyor mu
- Profilde **Kartım** butonu çıkıyor mu
- Oyuncu kartında **Profil Kimliği** görünüyor mu
- **Kartı Paylaş** sistem paylaşım ekranını açıyor mu
- Paylaşılan metni **Dost Karşılaştır** ekranına yapıştırınca çözümleme yapıyor mu
- Karşılaştırma satırlarında **Sen önde / Dost önde / Berabere** durumu doğru geliyor mu
