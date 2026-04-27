# LiveOps Core 5

Bu paket LiveOps görevlerini gerçek oyun aksiyonlarına daha sıkı bağlar.

Eklenenler:
- Market ilan verme -> event ilerlemesi
- Market satın alma -> event ilerlemesi
- Shard craft -> event ilerlemesi
- Shard upgrade -> event ilerlemesi
- Duplicate recycle -> event ilerlemesi
- Boss ticket craft -> event ilerlemesi
- Görevler ekranında event aksiyon sayacı
- Yeni preset çeşitleri: `Market Rush` ve `Forge District` genişletildi

Teknik yaklaşım:
- Yeni DB migration yok
- Kullanıcı bazlı LiveOps ilerlemesi AsyncStorage içinde tutuluyor
- Daily ve weekly action counter yapısı eklendi
- Eski günlük/haftalık chest-boss ilerlemesi korunuyor

Dokunulan dosyalar:
- `src/services/liveOpsService.js`
- `src/hooks/useLiveOpsState.js`
- `src/hooks/useCollectionActions.js`
- `src/hooks/useMarketData.js`
- `src/features/tasks/TasksModal.js`
- `src/core/GameFlow.js`

Beklenen fayda:
- Etkinlik görevleri artık sadece pasif görünmüyor, market/forge döngüsüyle gerçekten ilerliyor
- Oyuncu retention tarafında craft/market kullanımı teşvik ediliyor
- Admin presetleri daha anlamlı hale geliyor çünkü event türleri farklı aksiyonlara bağlanıyor
