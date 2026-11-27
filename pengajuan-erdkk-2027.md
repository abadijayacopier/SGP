# Formulir Pengajuan e-RDKK Petani Tahun 2027

## Goal
Membangun halaman formulir pengajuan e-RDKK tahun anggaran 2027 publik berbasis verifikasi NIK (tanpa kewajiban login rumit), mendukung kalkulasi otomatis 3 musim tanam (MT 1, MT 2, MT 3), proteksi blokir duplikasi pengajuan NIK ganda di tahun 2027, serta penerbitan tanda terima pendaftaran ber-QR code.

## Tasks
- [x] Task 1: Tambahkan field tahun 2027, rincian komoditas & luas tanam 3 musim (MT1, MT2, MT3), dan estimasi kuota pupuk pada model `PengajuanLahan` di `prisma/schema.prisma` lalu jalankan `npx prisma db push` → Verify: Database SQLite tersinkronisasi dan field baru tersedia di Prisma Client.
- [x] Task 2: Perbarui API `src/app/api/pengajuan/route.ts` dan buat endpoint cek NIK `src/app/api/pengajuan/cek-nik/route.ts` untuk auto-fill data petani master dan validasi pencegahan duplikasi NIK pada tahun 2027 → Verify: Cek NIK mengembalikan profil petani jika ada, dan submit dengan NIK sama di tahun 2027 mengembalikan status 409 (Duplikasi Diblokir).
- [x] Task 3: Bangun antarmuka formulir publik modern dan mobile-friendly di `src/app/pengajuan-erdkk-2027/page.tsx` & `PengajuanErdkk2027Client.tsx` lengkap dengan live calculator 3 musim tanam, upload berkas fleksibel, dan pemilihan Poktan → Verify: Halaman dapat diakses tanpa login di browser, auto-fill berfungsi saat NIK diinput, dan kalkulator kuota terhitung otomatis.
- [x] Task 4: Buat komponen Tanda Terima Pendaftaran e-RDKK 2027 dengan QR Code verifikasi status pengajuan, tombol cetak bukti pendaftaran, dan tautan navigasi dari navbar/halaman pengajuan eksisting → Verify: Setelah submit sukses, dialog tanda terima muncul lengkap dengan nomor registrasi `REG-ERDKK-2027-XXX`.
- [x] Task 5: Validasi build produksi (`npm run build`) dan pastikan seluruh route statis/dinamis bebas dari error TypeScript dan masalah hidrasi → Verify: `npm run build` sukses dengan exit code 0.

## Done When
- [x] Petani dapat mengakses formulir di `/pengajuan-erdkk-2027` tanpa perlu login akun.
- [x] Memasukkan NIK yang sudah ada otomatis memuat identitas dan poktan dari master data.
- [x] Memasukkan NIK yang sudah mengajukan di tahun 2027 akan diblokir dengan pesan status pengajuan sebelumnya.
- [x] Petani baru dapat memilih Desa dan Poktan tujuan secara mandiri.
- [x] Rencana tanam 3 musim (MT1, MT2, MT3) terhitung kuota estimasi pupuknya secara otomatis.
- [x] Bukti pendaftaran ber-QR Code dapat dicetak/disimpan oleh petani.

## Notes
- Palet desain: Hijau Pertanian (#0B5D3B / #15803d) dan aksen emas (#D4AF37 / amber), bebas warna ungu/violet sesuai aturan UI.
- Kalkulasi pupuk baku: Urea (Padi: 250kg/ha, Palawija: 200kg/ha), NPK (Padi: 150kg/ha, Palawija: 100kg/ha), Organik (500kg/ha).
