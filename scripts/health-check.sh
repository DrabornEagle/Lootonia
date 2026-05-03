#!/usr/bin/env bash
set -e

echo "== Lootonia Health Check =="

[ -f package.json ] && echo "[OK] package.json" || echo "[ERR] package.json yok"
[ -f app.json ] && echo "[OK] app.json" || echo "[ERR] app.json yok"
[ -f .env ] && echo "[OK] .env" || echo "[WARN] .env yok (.env.example kopyalanmali)"
[ -f .env.example ] && echo "[OK] .env.example" || echo "[WARN] .env.example yok"
[ -f src/lib/supabase.js ] && echo "[OK] src/lib/supabase.js" || echo "[ERR] supabase.js yok"
[ -d supabase/migrations ] && echo "[OK] supabase/migrations" || echo "[ERR] supabase/migrations yok"
[ -d src/features ] && echo "[OK] src/features" || echo "[ERR] src/features yok"
[ -f scripts/reset-project.js ] && echo "[OK] scripts/reset-project.js" || echo "[WARN] reset-project.js yok"

if [ -f node_modules/expo/bin/cli ]; then
  echo "[OK] local expo cli"
elif [ -x node_modules/.bin/expo ]; then
  echo "[OK] local expo binary"
else
  echo "[WARN] local expo cli yok (npm install gerekli)"
fi

echo "== package checks =="
grep -n '"expo"' package.json >/dev/null 2>&1 && echo "[OK] expo dependency" || echo "[ERR] expo dependency yok"
grep -n '"expo-location"' package.json >/dev/null 2>&1 && echo "[OK] expo-location" || echo "[WARN] expo-location yok"
grep -n '"expo-camera"' package.json >/dev/null 2>&1 && echo "[OK] expo-camera" || echo "[WARN] expo-camera yok"
grep -n '"@supabase/supabase-js"' package.json >/dev/null 2>&1 && echo "[OK] supabase-js" || echo "[ERR] supabase-js yok"
grep -n '"expo-notifications"' package.json >/dev/null 2>&1 && echo "[OK] expo-notifications" || echo "[WARN] expo-notifications yok"

echo "== app.json checks =="
grep -n "expo-router" app.json >/dev/null 2>&1 && echo "[WARN] app.json icinde expo-router kaldi" || echo "[OK] app.json temiz"
grep -n '"scheme": "lootonia"' app.json >/dev/null 2>&1 && echo "[OK] scheme lootonia" || echo "[WARN] scheme lootonia bulunamadi"

echo "== cleanup checks =="
find . -path './archive' -prune -o -type f \( -name '*.bak' -o -name '*.bak_*' \) -print >./audit/phase23/lootonia_bak_list.txt || true
BAK_COUNT=$(wc -l < ./audit/phase23/lootonia_bak_list.txt | tr -d ' ')
echo "[INFO] aktif backup dosya sayisi: ${BAK_COUNT}"
[ "${BAK_COUNT}" = "0" ] && echo "[OK] aktif repo temiz" || echo "[WARN] scripts/archive-backups.sh calistirilmali"

echo "== migration checks =="
bash scripts/check-all-migrations.sh
