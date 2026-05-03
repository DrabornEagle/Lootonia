Phase 22 - Onboarding buton düzeltmesi

Bu patch şunları yapar:
- "Hazırım, başlat" ve "Şimdilik geç" butonlarını daha güvenli Pressable yapıya taşır.
- Modal kapanışını parent callback'e bağlı kalmadan yerelde başlatır.
- Onboarding tamamlandı kaydını local storage'a yazar.
- Parent callback hata verse bile modalın takılı kalmasını engeller.

Uygulama:
1) zip'i projeye aç
2) src/features/onboarding/OnboardingModal.js dosyasını yenisiyle değiştir
3) expo cache temizleyip yeniden başlat
