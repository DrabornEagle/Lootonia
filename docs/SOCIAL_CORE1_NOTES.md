# Social Core 1

Bu paket Lootonia'a oyuncuya gösterilebilir ve paylaşılabilir bir **Oyuncu Kartı** ekler.

## Eklenenler
- Menüye **Oyuncu Kartı** girişi
- Profil ekranından **Kartım** kısayolu
- Tam ekran **Oyuncu Kartı** modalı
- React Native `Share` ile metin paylaşımı
- Seviye, rank, token, XP, kurye ve teslimat özeti
- Dinamik oyuncu tarz etiketi (örn. Drop Avcısı, Pazar Ustası)

## Dokunulan dosyalar
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/core/propBuilders.js`
- `src/core/modalhost/renderNavigationModals.js`
- `src/features/navigation/ActionMenuModal.js`
- `src/features/profile/ProfileModal.js`
- `src/services/socialProfileService.js`
- `src/features/social/SocialPlayerCardModal.js`

## Kurulum
```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_social_core1_pack.zip -d .
cd ~/projects/lootonia/lootonia_social_core1_pack
bash scripts/apply_lootonia_social_core1.sh ~/projects/lootonia
cd ~/projects/lootonia
npx expo start -c
```

## Kontrol listesi
- Menüde **Oyuncu Kartı** butonu görünüyor mu
- Profil ekranında **Kartım** butonu var mı
- Oyuncu kartı açılınca avatar/nickname/level/rank/token/xp görünüyor mu
- **Paylaş** butonu işletim sistemi paylaşım penceresini açıyor mu
- Profil ve geçmiş akışları bozulmadan çalışıyor mu
