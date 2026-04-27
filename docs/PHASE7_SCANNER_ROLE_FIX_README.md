# Phase 7 — Scanner / Admin UX Fix

## Problem
`Kodu Üret` butonu oyuncu hesabında da görünüyordu.
Backend ise bu akışı admin/test yetkisiyle sınırladığı için kullanıcı `admin_required` hatası görüyordu.

## Fix
- `ScannerModal` içine `isAdmin` prop eklendi.
- `ModalHost` artık `isAdmin` bilgisini `ScannerModal`'a geçiriyor.
- Oyuncu hesabında `Kodu Üret` butonu gizleniyor.
- Her kullanıcı için `Kodu Gir` butonu eklendi.
- Backend yine `admin_required` dönerse kullanıcı dostu açıklama gösteriliyor.

## Files
- `src/core/ModalHost.js`
- `src/features/chest/ScannerModal.js`

## Optional admin test query
Kendi hesabını admin yapmak istersen, Supabase SQL Editor'da kullanıcı UUID'nin yerine kendi `auth.users.id` değerini yazarak çalıştır:

```sql
update public.dkd_profiles
set is_admin = true
where user_id = 'YOUR-USER-UUID';
```

Ardından uygulamadan çıkıp tekrar giriş yap.
