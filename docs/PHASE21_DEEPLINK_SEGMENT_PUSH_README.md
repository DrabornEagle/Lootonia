# Lootonia Phase 21 — Deep Link + Segmentli Push

Bu paket şunları ekler:

- Segmentli admin yayını: herkes / yeni kullanıcı / kurye / admin
- Push payload içine `route`, `targetScreen`, `deepLink` ekleme
- Expo Go Android'de gereksiz `expo-notifications` runtime çağrısını azaltma
- GameFlow için küçük deep-link helper dosyası

## Segment mantığı

- `everyone`: tüm aktif push token'lar
- `new`: `dkd_profiles.level <= 2`
- `courier`: `dkd_profiles.courier_status in ('approved', 'active')`
- `admin`: `auth.users.raw_app_meta_data` veya `raw_user_meta_data` içinde `role=admin` ya da `is_admin=true`

## Hedef ekranlar

- map
- tasks
- leader
- market
- collection
- courier
- admin
- scanner

## Termux

```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_phase21_deeplink_segment_push.zip -d .
```

## SQL

`supabase/migrations/019_push_deeplink_segment_hotfix.sql` dosyasını Supabase SQL Editor'da çalıştır.

## Edge Function

Yeniden deploy et:

```bash
cd ~/projects/lootonia
npx supabase functions deploy send-broadcast --project-ref YOUR_PROJECT_REF --use-api
```

## GameFlow'a eklenecek kısa parça

`src/core/GameFlow.js` içine import ekle:

```js
import { attachNotificationRouteListener, primeNotificationsRuntime, registerDeviceForRemotePush } from '../services/notificationService';
import { resolveNotificationRoute, applyNotificationRoute } from '../services/notificationRouteHandler';
```

`handleBottomNavChange` tanımından sonra ekle:

```js
const openTargetScreen = useCallback((screen, payload = {}) => {
  return applyNotificationRoute(resolveNotificationRoute({ targetScreen: screen, ...payload }), {
    isAdmin,
    openTab: (tab) => handleBottomNavChange(tab),
    openCourier: () => setCourierBoardOpen(true),
    openAdmin: () => setAdminMenuOpen(true),
    openScanner: () => setScannerOpen(true),
    setDropId: (id) => setActiveDropId(String(id)),
  });
}, [isAdmin, handleBottomNavChange]);
```

Mevcut push effect'inin yerine şunu koy:

```js
useEffect(() => {
  if (!session?.user?.id) return undefined;
  let cancelled = false;
  let detach = () => {};

  (async () => {
    const runtime = await primeNotificationsRuntime();
    if (!cancelled && runtime?.ok) {
      detach = await attachNotificationRouteListener((payload) => {
        if (cancelled || !payload) return;
        setTimeout(() => openTargetScreen(payload?.targetScreen || payload?.route, payload), 80);
      });
    }

    const result = await registerDeviceForRemotePush();
    if (cancelled) return;
    if (!result?.ok && result?.reason && result.reason !== 'expo_go_android_remote_push_unavailable' && result.reason !== 'permission_denied' && result.reason !== 'expo_go_android_notification_runtime_unavailable') {
      console.log('[Lootonia][push]', result.reason);
    }
  })();

  return () => {
    cancelled = true;
    try { detach?.(); } catch (_) {}
  };
}, [session?.user?.id, session?.access_token, openTargetScreen]);
```
