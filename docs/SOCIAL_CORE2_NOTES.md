# Social Core 2

Bu paket Social Core 1 fikrini tek başına kurulabilir hale getirir ve oyuncu kartını daha premium bir seviyeye taşır.

## Eklenenler
- Menüye **Oyuncu Kartı** girişi
- Profil ekranına **Kartım** kısayolu
- Tam ekran premium **Oyuncu Kartı** modalı
- Sistem paylaşım penceresi ile kart metni paylaşımı
- Koleksiyon için **nadirlik özeti**
- Oyuncuya göre dinamik **stil etiketi**
- Görev claim özetini kart içinde gösterme

## Dokunulan dosyalar
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/core/propBuilders.js`
- `src/features/navigation/ActionMenuModal.js`
- `src/features/profile/ProfileModal.js`
- `src/features/social/SocialPlayerCardModal.js`
- `src/services/socialProfileService.js`

## Kurulum
```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_social_core2_pack.zip -d .
cd ~/projects/lootonia/lootonia_social_core2_pack
bash scripts/apply_lootonia_social_core2.sh ~/projects/lootonia
cd ~/projects/lootonia
npx expo start -c
```

## Kontrol
- Menüde **Oyuncu Kartı** var mı
- Profilde **Kartım** kısayolu çalışıyor mu
- Kart açılınca avatar, nick, level, rank, token, XP geliyor mu
- Koleksiyon nadirlik özeti listeleniyor mu
- **Kartı Paylaş** butonu paylaşım penceresini açıyor mu
