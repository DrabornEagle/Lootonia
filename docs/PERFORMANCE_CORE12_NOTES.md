# Lootonia – Performance Core 12

Bu paket, harita çevresindeki hızlı etkileşimlerde modal açılışını aynı ortak idle scheduler üstünden sıraya alır.

## Amaç
- Haritadaki ilk dokunuş anında modal mount yükünü biraz geciktirip ana hissi daha akıcı tutmak
- Action menü ve sandık listesi açılışında çift tıklama / art arda tetiklenme yükünü azaltmak
- Oyun mantığına dokunmadan harita çevresi UI akışını sakinleştirmek

## Dokunulan dosyalar
- `src/hooks/useIdleScheduler.js` ← yeni
- `src/core/GameFlow.js`
- `src/core/ModalHost.js`
- `src/core/propBuilders.js`
- `src/features/map/MapHomeScreen.js`
- `src/features/map/DropDockPanel.js`

## Ne değişti
- `useIdleScheduler` ile ortak bir interaction-sonrası açılış kuyruğu eklendi
- `ActionMenu` ve `DropList` açılışı doğrudan state set etmek yerine scheduler üzerinden ilerliyor
- Bekleyen açılış tekrar tetiklenirse eski plan iptal edilip yenisi kullanılıyor
- Haritadaki menü ve alt dock butonları bekleme anında kısa süreli disabled oluyor
- Modal kapanışında varsa bekleyen açılış planı da iptal ediliyor

## Dokunulmayan yerler
- Auth
- Supabase servisleri ve RPC mantığı
- Chest / Boss ödül formülü
- Market kuralları
- Görev claim mantığı

## Beklenen etki
- Harita üstündeki ilk dokunuş daha yumuşak hissedilir
- Menüye veya sandık listesine hızlı art arda basınca gereksiz açılış yükü azalır
- Modal mount maliyeti dokunuş anına binmediği için Android tarafında küçük takılmalar azalır

## Kurulum
```bash
cd ~/projects/lootonia
unzip -o /sdcard/Download/lootonia_performance_core12_patch_pack.zip -d .
bash scripts/apply_lootonia_performance_core12.sh ~/projects/lootonia
npx expo start -c
```

## Kontrol listesi
- Haritadayken sağ üst menü daha akıcı açılıyor mu
- Alt dock içinden sandık listesi daha yumuşak açılıyor mu
- Art arda hızlı tıklamada çift açılma ya da takılma oluyor mu
- Drop listeden yön tarifi ve aç akışı normal çalışıyor mu
