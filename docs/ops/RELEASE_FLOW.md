# Lootonia Release Flow

## Expo local dev
```bash
npx expo start -c
```

## Android internal APK
```bash
npx eas-cli build --profile development --platform android
```

## Preview APK
```bash
npx eas-cli build --profile preview --platform android
```

## Production AAB
```bash
npx eas-cli build --profile production --platform android
```

## Mevcut EAS profilleri
- `development` → dev client, internal, apk
- `preview` → internal, apk
- `production` → app bundle
