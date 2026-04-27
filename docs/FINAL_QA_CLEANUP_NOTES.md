# Lootonia Final QA + Cleanup Pack

Bu paket yeni oyun özelliği eklemez. Amaç iki şeydir:

1. Projeyi **tek komutla doğrulamak**
2. Kök klasörde birikmiş **backup / archive / geçici klasörleri güvenli şekilde arşive taşımak**

## Ne değişti

- `package.json` içine iki yeni script eklendi:
  - `npm run qa:final`
  - `npm run cleanup:safe`
- `scripts/final-qa-verify.sh`
- `scripts/safe-cleanup-archive.sh`

## Neden faydalı

- Patch uygulandı mı, çekirdek dosyalar duruyor mu hızlı kontrol edilir.
- Migration ve stable smoke tek akışta çalışır.
- Kök klasörde birikmiş `.backup_*`, `repo-artifacts`, `repo_artifacts`, `.tmp` gibi klasörler silinmeden taşınır.
- Çalışma klasörü daha temiz kalır.

## Kullanım

### Doğrulama

```bash
npm run qa:final
```

### Güvenli temizlik

```bash
npm run cleanup:safe
```

## Not

`cleanup:safe` hiçbir şeyi kalıcı olarak silmez; sadece `_repo_hygiene_archive/cleanup_TIMESTAMP/` içine taşır.
