# 🌾 SGP - Sistem Informasi Pertanian & GIS Spasial Terpadu
### Pemerintah Kecamatan Lembeyan - Kabupaten Magetan
> **Dikembangkan oleh:** Supriyanto Abadi Jaya  
> **Teknologi Utama:** Next.js 15 (App Router), React 19, Tailwind CSS, Prisma ORM, SQLite, Leaflet GIS, PWA Offline-First.

---

## 📌 Ringkasan Sistem
**SGP (Sistem Pertanian Terpadu)** adalah platform web modern untuk manajemen sektor pertanian di wilayah Kecamatan Lembeyan, Kabupaten Magetan. Aplikasi ini mengintegrasikan pemetaan spasial lahan pertanian, alokasi kuota pupuk bersubsidi (e-RDKK), verifikasi penebusan di kios/poktan, dan pencetakan dokumen resmi kedinasan.

---

## ✨ Fitur-Fitur Utama

1. **Pemetaan Lahan GIS Spasial Lapangan (`/peta` & `/field-maps`)**
   - Digitasi poligon petak sawah dan tegalan berbasis citra satelit resolusi tinggi (Google Satellite Hybrid, Esri Imagery, OpenStreetMap).
   - Perhitungan otomatis luas baku spasial (Hektare & $m^2$) serta keliling pematang sawah.
   - Deteksi tumpang tindih spasial (*Spatial Overlap Collision Prevention*).
   - Mode PWA Mobile (*Walk-Tracking GPS*) dengan perekaman patok otomatis setiap pergerakan (2m, 3m, 5m).
   - Kamera dokumentasi ber-watermark koordinat GPS, nama petani, dan stempel digital BPP Lembeyan.
   - Dukungan antrean survei offline (*Offline-First*) saat tidak ada sinyal internet di sawah.
   - Ekspor poligon spasial ke format standar GeoJSON untuk QGIS / ArcGIS.

2. **Manajemen e-RDKK & Alokasi Pupuk Bersubsidi (`/alokasi-poktan`)**
   - Penataan jatah kuota resmi pupuk subsidi: Urea, NPK Phonska, dan Organik Petroganik.
   - Kalkulator bagi rata proporsional berdasarkan luasan lahan riil petani.
   - Sinkronisasi dinamis 3 musim tanam:
     - **MT 1 (Walikan)**: Padi
     - **MT 2 (Kemarau)**: Jagung, Palawija dll.
     - **MT 3 (Rendeng)**: Padi

3. **Penyaluran Pupuk & Cetak Nota Digital (`/penyaluran`)**
   - Transaksi serah terima pupuk bersubsidi di meja kios dengan verifikasi foto fisik KTP & wajah penerima.
   - Validasi harga eceran tertinggi (HET) baku pemerintah.
   - Cetak lembar bukti penebusan resmi:
     - **Format A4 Kuarto Resmi** lengkap dengan QR Code validasi keaslian.
     - **Slip Struk POS Kasir (Thermal 80mm)** untuk pencetakan instan di kios.

4. **Buku Kas Poktan & Kasir Digital (`/kasir-poktan` & `/buku-kas-poktan`)**
   - Point-of-Sale (POS) kasir penebusan anggota kelompok tani.
   - Manajemen kas poktan, pencatatan biaya operasional angkut/bongkar, dan rekapitulasi laba-rugi.

5. **Responsif Multi-Device (Desktop, Tablet, Smartphone)**
   - UI adaptif otomatis untuk segala ukuran layar HP (termasuk iPhone Notch/Dynamic Island & Android).
   - Tampilan *Mobile Card View* khusus smartphone tanpa perlu scroll horizontal.
   - Cegah auto-zoom pada formulir input perangkat mobile.

6. **Keamanan & Kontrol Hak Akses Berbasis Peran (RBAC)**
   - Pembagian hak akses terisolasi untuk 5 peran:
     - 🏛️ **ADMIN_DINAS**: Superadmin Kecamatan (Akses penuh seluruh modul)
     - 🌾 **PPL**: Penyuluh Pertanian Lapangan BPP Lembeyan
     - 👥 **POKTAN**: Pengurus Kelompok Tani
     - 🏪 **KIOS**: Pengecer Pupuk Resmi (KPL)
     - 🧑‍🌾 **PETANI**: Portal mandiri pengecekan kuota petani

---

## 👥 Akun Demo & Hak Akses

| Peran | Username | Password Default | Wilayah Kerja |
|---|---|---|---|
| **Admin Dinas** | `admin` | `123456` | Pemerintah Kecamatan Lembeyan |
| **PPL Pertanian** | `ppl_iissugiarti` | `123456` | BPP Kecamatan Lembeyan |
| **Ketua Poktan** | `poktan_suparman` | `123456` | Poktan Wilayah Desa Kediren |
| **Kios Pupuk (KPL)** | `kios_subur` | `123456` | Kios UD. Tani Subur Barokah |

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### 1. Klon Repositori
```bash
git clone https://github.com/abadijayacopier/SGP.git
cd SGP
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Siapkan Database SQLite & Seeding Data Awal
```bash
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Jalankan Server Development
```bash
npm run dev
```
Aplikasi dapat diakses melalui browser di: `http://localhost:3000` (atau IP lokal jaringan Wi-Fi untuk pengujian via smartphone).

> **Tip Pengujian Sensor GPS di HP Android:**  
> Jalankan perintah `npm run dev:https` untuk mengaktifkan koneksi HTTPS lokal agar Chrome Android mengizinkan sensor Geolocation GPS.

---

## 🌐 Panduan Deploy ke VPS Linux (Ubuntu / Debian)

Untuk menjalankan aplikasi di server VPS produksi:

### 1. Persiapan VPS
Pastikan Node.js (v18 atau v20+), Git, dan PM2 telah terpasang:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm install -g pm2
```

### 2. Klon Repositori di VPS
```bash
cd /var/www
git clone https://github.com/abadijayacopier/SGP.git pertanian
cd pertanian
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run build
```

### 3. Jalankan Aplikasi dengan PM2 (Background Daemon)
```bash
pm2 start npm --name "pertanian-app" -- start
pm2 save
pm2 startup
```

### 4. Pembaruan Otomatis (Auto-Update) di VPS
Setiap kali ada penambahan fitur dari GitHub, cukup jalankan skrip satu perintah berikut di terminal VPS:
```bash
bash update.sh
```
Skrip `update.sh` akan secara otomatis menarik commit terbaru, memperbarui dependensi, menyinkronkan Prisma, mengompilasi build, dan me-reload PM2 tanpa *downtime*.

---

## 📄 Lisensi
Hak Cipta &copy; 2026 **Pemerintah Kecamatan Lembeyan & Supriyanto Abadi Jaya**. Seluruh hak cipta dilindungi undang-undang.
