#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "== Lootonia Git Index Recover =="

if [ ! -d .git ]; then
  echo "[ERR] .git klasörü bulunamadı."
  exit 1
fi

if [ ! -f .git/index ]; then
  echo "[ERR] .git/index bulunamadı."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "[ERR] git kurulu değil. Termux içinde: pkg install git"
  exit 1
fi

RESTORED=0
while IFS= read -r path; do
  [ -z "$path" ] && continue
  dir="$(dirname "$path")"
  [ "$dir" = "." ] || mkdir -p "$dir"
  git show ":$path" > "$path"
  RESTORED=$((RESTORED + 1))
done < <(git ls-files)

echo "[OK] $RESTORED dosya index'ten geri yüklendi."
