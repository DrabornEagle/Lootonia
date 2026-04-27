#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
PROJECT_DIR="${1:-$HOME/projects/lootonia}"
cd "$PROJECT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ZIP="$HOME/lootonia_pre_hygiene_${STAMP}.zip"
REPORT_DIR="$PROJECT_DIR/.reports/repo_hygiene_${STAMP}"
mkdir -p "$REPORT_DIR"
if command -v zip >/dev/null 2>&1; then
  zip -qr "$BACKUP_ZIP" . -x "node_modules/*" ".git/*"
fi
for d in audit _imports files; do
  [ -d "$d" ] && rm -rf "$d"
done
find src -type f \( -name '*.bak' -o -name '*.bak_*' \) -delete 2>/dev/null || true
find . -type f -name '*.before' -delete 2>/dev/null || true
find . -maxdepth 1 -type f \( -name '*.log' -o -name 'lootonia_*.sh' -o -name 'lootonia_*.diff' -o -name 'lootonia_*.sql' \) -delete 2>/dev/null || true
{
  echo 'Repo hygiene tamamlandi.'
  echo "Backup: $BACKUP_ZIP"
  echo 'Kalan ana klasorler:'
  find . -maxdepth 1 -type d | sort
  echo
  echo 'Supabase migration envanteri:'
  find supabase/migrations -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort
} > "$REPORT_DIR/summary.txt"
echo "[ok] temizlendi -> $PROJECT_DIR"
echo "[ok] rapor -> $REPORT_DIR/summary.txt"
[ -f "$BACKUP_ZIP" ] && echo "[ok] yedek -> $BACKUP_ZIP"
