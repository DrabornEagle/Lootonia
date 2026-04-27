#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="_release_hygiene_archive/$STAMP"
mkdir -p "$DEST"

moved=0
for pattern in .backup_* _repo_hygiene_archive repo-artifacts repo_artifacts; do
  for item in $pattern; do
    [ -e "$item" ] || continue
    [ "$item" = "_release_hygiene_archive" ] && continue
    mv "$item" "$DEST/" 2>/dev/null || true
    moved=1
  done
done

if [ "$moved" -eq 1 ]; then
  echo "[ok] hygiene artifacts moved to $DEST"
else
  echo "[ok] tasinacak ek hygiene/artifact klasoru yok"
fi
