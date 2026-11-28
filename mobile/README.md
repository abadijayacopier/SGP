# Aplikasi Android Native (Flutter) — GIS Pertanian BPP Lembeyan

Aplikasi mobile Android native yang dibangun menggunakan **Flutter** untuk mendukung operasional lapangan Balai Penyuluhan Pertanian (BPP) Kecamatan Lembeyan, Kabupaten Magetan.

Aplikasi ini mencakup 3 peran pengguna:
1. **Penyuluh Lapangan (PPL):** Pemetaan spasial petak sawah satelit (Esri World Imagery), rekam patok GPS presisi tinggi, input batas sempadan tanah, dan penyimpanan antrean offline di sawah.
2. **Kasir Kios / Poktan:** Pemindai QR Kartu Tani digital, verifikasi sisa kuota pupuk bersubsidi, dan pencatatan penebusan pupuk e-RDKK.
3. **Petani Mandiri:** Cek alokasi kuota pupuk (Urea, NPK, Organik), barcode kartu digital, dan data lahan terdaftar.

---

## 📁 Struktur Direktori

```text
mobile/
├── android/app/src/main/AndroidManifest.xml  # Izin GPS Satelit, Kamera, Internet
├── assets/                                  # Ikon & grafis resmi
├── lib/
│   ├── main.dart                            # Entrypoint & inisialisasi SQLite
│   ├── app.dart                             # MaterialApp & Tema Emerald BPP
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart           # Konfigurasi URL Backend Next.js
│   │   │   └── app_colors.dart              # Skema warna resmi (Anti-purple)
│   │   ├── database/
│   │   │   └── app_database.dart            # SQLite lokal untuk survei offline
│   │   ├── network/
│   │   │   └── api_client.dart              # Klien HTTP Dio + error handling
│   │   ├── services/
│   │   │   └── gps_service.dart             # Pelacak satelit GPS presisi tinggi
│   │   └── utils/
│   │       └── gis_calculator.dart          # Rumus Shoelace, keliling, & limit 2 Ha
│   └── features/
│       ├── auth/                            # Pemilihan peran (PPL, Kios, Petani)
│       ├── gis_mapping/                     # Peta Satelit Esri, poligon, & batas tanah
│       └── pupuk/                           # Kartu Tani & Kuota Pupuk Subsidi e-RDKK
└── pubspec.yaml                             # Dependensi pustaka Flutter
```

---

## 🚀 Panduan Menjalankan & Build APK

### 1. Prasyarat
* Pasang **Flutter SDK** (versi 3.19 ke atas) dari [flutter.dev](https://flutter.dev).
* Pasang **Android Studio** atau VS Code dengan ekstensi *Flutter & Dart*.

### 2. Konfigurasi Alamat Backend Next.js
Buka file `lib/core/constants/api_endpoints.dart`:
* **Jika menggunakan Android Emulator:**
  ```dart
  static const String baseUrl = 'http://10.0.2.2:3000/api';
  ```
* **Jika menggunakan Smartphone Fisik (WiFi yang sama dengan Laptop):**
  Ganti dengan IP lokal laptop Anda (cek via `ipconfig` di Windows):
  ```dart
  static const String baseUrl = 'http://192.168.1.100:3000/api';
  ```
* **Jika Backend sudah online di Server/Domain:**
  ```dart
  static const String baseUrl = 'https://domain-pertanian-anda.com/api';
  ```

### 3. Mengunduh Paket & Menjalankan Debug
Buka terminal di folder `mobile/`:
```bash
cd mobile
flutter pub get
flutter run
```

### 4. Menghasilkan File APK Android Resmi
Untuk membuat file installer `.apk` yang siap dibagikan ke smartphone penyuluh atau kios:
```bash
cd mobile
flutter build apk --release
```
File APK siap instal akan berada di:
`mobile/build/app/outputs/flutter-apk/app-release.apk`
