# Penyempurnaan Cetak & Verifikasi KTA (Kartu Tanda Anggota Poktan)

## Goal
Mengintegrasikan modul KTA (Kartu Tanda Anggota) dan Kartu Tani CR-80 dengan database master Petani (foto, nomor KTA, jabatan), menyediakan penyimpanan permanen dari Editor KTA, serta menerapkan QR Code URL verifikasi publik yang langsung dapat discan oleh smartphone.

## Tasks
- [x] Task 1: Tambahkan field `nomorKta`, `jabatan`, dan `fotoUrl` pada model `Petani` di `prisma/schema.prisma` dan jalankan `npx prisma db push` → Verify: `prisma/schema.prisma` memiliki 3 field baru dan database SQLite tersinkronisasi tanpa error.
- [x] Task 2: Buat/perbarui API endpoint `PATCH /api/petani` untuk menyimpan pembaruan `nomorKta`, `jabatan`, `fotoUrl`, dan data profil petani → Verify: Uji request update data petani menghasilkan respon 200 OK dan data tersimpan di DB.
- [x] Task 3: Tambahkan fitur Pemilih Petani (Search/Dropdown), input NIK, dan tombol "Simpan ke Database" pada `EditorKartuTaniClient.tsx` → Verify: Perubahan foto, nomor KTA, dan jabatan dapat disimpan permanen ke database dan memunculkan notifikasi sukses.
- [x] Task 4: Perbarui format payload QR Code di `KartuAnggotaPoktanPreview.tsx`, `CetakMassalClient.tsx`, dan halaman cetak agar menghasilkan URL web publik `/verifikasi?q=KARTUTANI:<nik>` → Verify: Scan QR Code menghasilkan tautan URL utuh yang dapat diklik.
- [x] Task 5: Sempurnakan halaman publik `/verifikasi` dan API `/api/verifikasi` untuk menampilkan foto resmi, nomor KTA, jabatan poktan, dan status validasi aktif BPP Lembeyan → Verify: Buka `/verifikasi?q=KARTUTANI:<nik>` dan pastikan foto, KTA, serta rincian kelompok tani tampil lengkap.
- [x] Task 6: Validasi build aplikasi (`npm run build`) dan pastikan tidak ada regresi TypeScript atau styling print CR-80 → Verify: `npm run build` sukses 0 exit code.

## Done When
- [x] Petani memiliki nomor KTA, jabatan, dan pasfoto tersimpan di database.
- [x] Pengurus poktan/admin dapat mengedit dan menyimpan KTA langsung dari `/editor-kartu-tani`.
- [x] QR Code pada kartu fisik dapat langsung dipindai kamera smartphone ke halaman verifikasi resmi berfoto dan berkuota pupuk.
- [x] Cetak single (CR-80) dan cetak massal (10 kartu per lembar A4) sinkron dengan database master.

## Notes
- Rasio foto standar KTA adalah 3:4.
- Ukuran standar fisik ID Card CR-80 adalah 85.6mm x 54mm.
- Format cetak massal A4 10 kartu menggunakan grid 2 x 5 dengan die-cut trim bleed guides.
