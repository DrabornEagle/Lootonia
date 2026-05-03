# Lootonia

Lootonia, Expo + Supabase tabanlı mobil oyun projesidir. Ana odak alanları harita oynanışı, kurye-kargo akışı, sosyal sistemler, market sistemi ve admin operasyonlarıdır.

## Aktif kaynak kuralı
Sadece şu kaynak kökleri aktif kabul edilmelidir:
- `src/`
- `supabase/`
- `.github/`
- `assets/`
- `docs/`

`Lootonia/src/` gibi ikinci bir kaynak ağacı tutulmamalıdır.
`supabase/functions/` dışına kökte ikinci bir Edge Function klasörü bırakılmamalıdır.

## Çekirdek modüller
- Auth ve profil
- Harita ve drop sistemi
- QR ve manuel kod ile chest açma
- Boss akışı
- Görevler ve leaderboard
- Koleksiyon, shard, craft, boss ticket
- Market
- Sosyal ve direkt mesaj sistemi
- Kurye ve kargo sistemi
- Admin panelleri
- Push ve deep-link altyapısı

## Termux hızlı başlangıç
```bash
termux-setup-storage
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git unzip ripgrep
mkdir -p ~/projects
cd ~/projects
unzip -o /sdcard/Download/Lootonia_FULL_DrabornEagle.zip -d .
cd ~/projects/Lootonia
cp .env.example .env
npm install --legacy-peer-deps
npx expo install --fix
npx expo start -c
```

## Zorunlu ortam değişkenleri
`.env` içinde şunlar zorunludur:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Temel komutlar
```bash
npm run start
npm run android
npm run web
npm run lint
npm run lint:src
npm run quality:local
npm run push:dev
npm run push:prod
```

## Ana belgeler
- `docs/ops/TERMUX_QUICKSTART.md`
- `docs/ops/OPERATIONS_RUNBOOK.md`
- `docs/ops/RELEASE_FLOW.md`
- `docs/MIGRATION_APPLY_ORDER.md`
- `docs/project/DKD_REPO_CLEANUP_2026-04-21_TR.md`

## Repo hijyen kuralları
- Aktif çalışma yolu olarak yalnızca `projects/Lootonia` kullanılmalıdır.
- Tek güncel kaynak tabanı korunmalıdır.
- Kök dizinde patch paketi, backup klasörü, deploy logu, geçici TXT ve ZIP artıkları tutulmamalıdır.
- SQL dosyaları `supabase/` altında tutulmalıdır.
- Tarihsel notlar `docs/` altında tutulmalıdır.
- Yeni proje sahipli identifier'larda uygun oldukça `dkd_` standardı kullanılmalıdır.
