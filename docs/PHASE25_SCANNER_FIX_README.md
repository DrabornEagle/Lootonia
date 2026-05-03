# Phase 25 – Scanner Modal Function Fix

Bu patch iki ana problemi düzeltir:

1. QR modunda kamera alanı ekranın altında kalıyordu. Kamera paneli şimdi kalan alanın çoğunu kaplar.
2. `Kodu Üret` dedikten sonra onay butonu görünmüyordu. Manual modda alt kısma sabit bir `Kodu Kullan ve Aç` / `Üretilen Kodu Onayla ve Aç` butonu eklendi.

## Değişen dosya
- `src/features/chest/ScannerModal.js`

## Beklenen sonuç
- QR modunda kamera hemen görünür ve tarama alanı ortadadır.
- Manual moda geçince üretilen kod görünür.
- Alt bölümde sandığı açmayı onaylayan buton her zaman görünür.
