# Lootonia Radar Core Boss Wire Fix

## Yapılan düzeltme
- `src/core/GameFlow.js` içinde `buildHomeProps(...)` çağrısına `openBossFromTasks` prop'u yeniden bağlandı.
- Böylece ana sayfadaki orta radar çekirdeği boss modundayken `onOpenNearestBoss` artık boş kalmıyor.
- Radar çekirdeği boss ikonundayken tıklama, en yakın boss açma akışını gerçekten tetikliyor.

## Sorunun nedeni
- `MapHomeScreen` içindeki radar çekirdeği `onOpenNearestBoss` prop'unu çağırıyordu.
- Ama `GameFlow` tarafında `buildHomeProps` içine `openBossFromTasks` geçirilmediği için bu prop `undefined` kalıyordu.
- Sonuç olarak boss ikonu görünse bile tıklama hiçbir boss akışı açmıyordu.

## Değişen dosya
- `src/core/GameFlow.js`
