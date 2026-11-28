class ApiEndpoints {
  // Ganti IP ini dengan IP LAN laptop/server saat running di smartphone fisik
  // Untuk Android Emulator gunakan: http://10.0.2.2:3000
  static const String baseUrl = 'http://10.0.2.2:3000/api';

  // GIS & Lahan
  static const String lahan = '$baseUrl/lahan';

  // Petani & Poktan
  static const String petani = '$baseUrl/petani';
  static const String poktan = '$baseUrl/poktan';

  // Pupuk Subsidi & e-RDKK
  static const String pupukAlokasi = '$baseUrl/pupuk/alokasi';
  static const String pupukPenyaluran = '$baseUrl/pupuk/penyaluran';
  static const String cekKuota = '$baseUrl/cek-kuota';

  // Kios & Kasir Penebusan
  static const String kasirPoktan = '$baseUrl/kasir-poktan';
  static const String distribusi = '$baseUrl/distribusi';

  // Tile Satelit Esri World Imagery (Resolusi Tinggi Gratis Tanpa API Key)
  static const String esriSatelliteUrl =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  static const String openStreetMapUrl =
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}
