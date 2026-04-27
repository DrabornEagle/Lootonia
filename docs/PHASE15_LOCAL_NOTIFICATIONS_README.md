# Phase 15 — Local notifications wiring

Bu paket, Phase 14'te eklenen notification foundation'ı gerçek akışa bağlar.

## Eklenenler
- `src/services/notificationService.js`
  - Expo Notifications için güvenli kurulum
  - Android kanal kurulumu (`lootonia-core`)
  - izin isteme
  - onboarding sonrası welcome notification
  - rota hatırlatma notification helper
- `src/core/GameFlow.js`
  - oturum açılınca notification foundation hazırlanır
  - onboarding kapanınca 12 saniye sonra local bildirim planlanır

## Gerekli paketler
Termux:

```bash
cd ~/projects/lootonia
npx expo install expo-notifications expo-device expo-constants
```

## Test
1. Uygulamayı aç
2. İlk açılış onboarding'i kapat
3. Bildirim iznini ver
4. 12 saniye içinde local bildirim düşmeli

## Not
Bu adım local bildirim içindir.
Push token / uzak push için daha sonra development build veya EAS tarafı bağlanacak.
