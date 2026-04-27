#!/data/data/com.termux/files/usr/bin/bash
set -e

DKD_PROJECT_ROOT="$HOME/projects/Lootonia"
cd "$DKD_PROJECT_ROOT"

rm -rf \
  dkd_backup_20260408 \
  dkd_backup_20260408_syntax \
  dkd_backup_20260408_cargo_ui \
  dkd_backup_20260409_delivery \
  dkd_backup_20260410_031129 \
  dkd_safe_backup_20260408 \
  dkd_lootonia_patch_v6 \
  .dkd_backups \
  .reports

echo "DKD repo cleanup tamamlandı: eski backup/patch/report klasörleri silindi."
