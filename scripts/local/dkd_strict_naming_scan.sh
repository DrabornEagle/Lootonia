#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
DKD_PROJECT_DIR="${1:-$HOME/projects/Lootonia}"
cd "$DKD_PROJECT_DIR"
DKD_STAMP="$(date +%Y%m%d_%H%M%S)"
DKD_REPORT_DIR="$DKD_PROJECT_DIR/.reports/dkd_strict_naming_${DKD_STAMP}"
mkdir -p "$DKD_REPORT_DIR"

{
  echo '=== DKD strict naming scan ==='
  echo "Project: $DKD_PROJECT_DIR"
  echo "Stamp: $DKD_STAMP"
  echo
  echo '--- forbidden underscore prefixes ---'
  rg -n --glob '!package-lock.json' --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.webp' --glob '!*.zip' '\b(?:v_|r_|p_|t_|h_)[A-Za-z0-9_]+' src supabase scripts App.js || true
  echo
  echo '--- forbidden dotted single-letter object roots ---'
  rg -n --glob '!package-lock.json' --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.webp' --glob '!*.zip' '\b(?:v|r|p|t|e|n|i|x|a|b|h|f)\.[A-Za-z_][A-Za-z0-9_]*' src supabase scripts App.js || true
  echo
  echo '--- simple single-letter callback params ---'
  rg -n --glob '!package-lock.json' --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.webp' --glob '!*.zip' '(\(|,\s*)([a-zA-Z])\s*(,|\)|=>)' src || true
} > "$DKD_REPORT_DIR/summary.txt"

echo "[ok] rapor -> $DKD_REPORT_DIR/summary.txt"
