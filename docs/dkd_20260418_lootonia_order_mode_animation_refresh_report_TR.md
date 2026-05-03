# Lootonia Kurye Sipariş Modu Kartı Animasyon Yenileme

Tarih: 2026-04-18
Aktif kaynak: `projects/Lootonia`

## Yapılan düzenleme
- Kurye ekranındaki `Sipariş Modu / Sipariş Havuzu` kartının animasyonu yenilendi.
- Önceki parlak orb + sert shine kombinasyonu kaldırıldı.
- Daha modern ve daha anlaşılır bir animasyon akışı eklendi:
  - yumuşak nefes alan kart hareketi
  - hafif dış aura parlaması
  - iç çerçeve vurgu çizgisi
  - kart üstünden geçen tarama bandı
  - ikon çevresinde küçük halo pulse

## Düzenlenen dosya
- `src/features/courier/CourierBoardModal.js`

## Teknik not
- Görev kartı animasyonu değiştirilmedi.
- Sadece sipariş modu kartının aktif courier görünümündeki animasyon katmanları güncellendi.
- SQL değişikliği yok.
