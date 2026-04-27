# Lootonia Termux Quickstart

## 1) Kurulum
```bash
termux-setup-storage
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git unzip ripgrep
mkdir -p ~/projects
cd ~/projects
unzip -o /sdcard/Download/lootonia_FULL_READABLE.zip -d .
cd ~/projects/lootonia
cp .env.example .env
nano .env
npm install --legacy-peer-deps
npx expo install --fix
npx expo start -c
```

## 2) Gerekli `.env`
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 3) Faydalı komutlar
```bash
npm run start
npm run android
npm run web
npm run lint
bash scripts/health-check.sh
node scripts/rpc-audit.js
node scripts/migration-doctor.js
```

## 4) Expo Go yerine development build
```bash
npx expo install expo-dev-client expo-notifications expo-device expo-constants
npx eas-cli login
npx eas-cli build --profile development --platform android
```
