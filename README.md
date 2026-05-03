# Lootonia

Lootonia is an Expo + Supabase mobile game project focused on map gameplay, courier flows, social systems, market systems, and admin operations.

## Active source rule
Only these source roots are active and should be edited:
- `src/`
- `supabase/`
- `.github/`
- `assets/`
- `docs/`

Do **not** create or keep duplicate source trees such as `Lootonia/src/`.
Do **not** keep root-level duplicate Edge Function folders outside `supabase/functions/`.

## Core modules
- Auth and profile
- Map and drop system
- QR and manual chest opening
- Boss flow
- Tasks and leaderboard
- Collection, shard, craft, boss ticket
- Market
- Social and direct messages
- Courier and cargo system
- Admin panels
- Push and deep-link foundation

## Termux quick start
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

## Required environment variables
Only these are required in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Main commands
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

## Main documents
- `docs/ops/TERMUX_QUICKSTART.md`
- `docs/ops/OPERATIONS_RUNBOOK.md`
- `docs/ops/RELEASE_FLOW.md`
- `docs/MIGRATION_APPLY_ORDER.md`
- `docs/project/DKD_REPO_CLEANUP_2026-04-21_TR.md`

## Repo hygiene rules
- Keep `projects/Lootonia` as the active working path.
- Keep only one current source base.
- Remove duplicate packs, patch folders, backup folders, deploy logs, and temporary root artifacts.
- Store SQL files under `supabase/`.
- Store historical notes under `docs/`.
- Use `dkd_` naming for new project-owned identifiers where feasible.
