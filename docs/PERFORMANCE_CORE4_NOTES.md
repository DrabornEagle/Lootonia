# Lootonia Performance Core 4

Bu patch "bozmadan iyilestirme" mantigiyla hazirlandi.

## Amac
- GameFlow icindeki alt-menu ve bildirim yonlendirme mantigini ayri bir hook'a tasimak
- AppShell -> ModalHost prop akisini daha stabil hale getirmek
- ModalHost acikken gereksiz yeniden render sayisini dusurmek
- Bir sonraki daha buyuk refactor oncesi riskli bolgeleri kucuk ve geri alinabilir bir adimla toparlamak

## Dokunulan dosyalar
- `src/core/GameFlow.js`
- `src/hooks/useGameFlowNavigation.js` (yeni)

## Yapilanlar
1. `handleBottomNavChange`, `handleNotificationNavigate`, `openDropList`, `openActionMenu` mantigi `useGameFlowNavigation` hook'una tasindi.
2. `modalProps` artik `useMemo` ile uretiliyor.
3. `onboardingProps` artik `useMemo` ile uretiliyor.
4. `hasVisibleModal` hesaplamasi `useMemo` ile stabil hale getirildi.
5. ModalHost'a gitmeyen gereksiz prop alanlari temizlendi.

## Bilerek dokunulmayan yerler
- Supabase servisleri
- auth/session akisi
- chest/boss odul mantigi
- market satin alma mantigi
- task / leaderboard hesap mantigi

## Beklenen etki
- Ozellikle modal acikken ust katmandan gelen gereksiz prop churn azalir
- Bildirim yonlendirme ve alt-menu gecisleri tek noktada toparlandigi icin ileride refactor riski duser
- GameFlow daha okunur ve daha kolay parcalanabilir hale gelir

## Test onerisi
- Uygulamayi ac
- Action menu -> profile/history/admin
- Bottom nav -> map/collection/market/tasks/leader gecisleri
- Bildirimden gelen route varsa acip ilgili ekrana gidiyor mu bak
- Chest / boss / market / collection akislari eski gibi calisiyor mu kontrol et
