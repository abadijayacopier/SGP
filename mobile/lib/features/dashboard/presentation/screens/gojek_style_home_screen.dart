import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../gis_mapping/presentation/screens/field_map_screen.dart';
import '../../../pupuk/presentation/screens/kartu_tani_screen.dart';

/// Halaman Beranda Modern dengan Desain Super-App ala Gojek
/// Disesuaikan untuk Kebutuhan Pertanian BPP Kecamatan Lembeyan
class GojekStyleHomeScreen extends StatefulWidget {
  const GojekStyleHomeScreen({super.key});

  @override
  State<GojekStyleHomeScreen> createState() => _GojekStyleHomeScreenState();
}

class _GojekStyleHomeScreenState extends State<GojekStyleHomeScreen> {
  int _currentNavIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. TOP BAR & SEARCH BAR ALA GOJEK
              _buildTopSearchBar(),

              const SizedBox(height: 14),

              // 2. KARTU KUOTA PUPUK SUBSIDI (ALA GOPAY WALLET CARD)
              _buildGopayStyleQuotaCard(),

              const SizedBox(height: 20),

              // 3. GRID 8 MENU LAYANAN UTAMA (ALA GORIDE / GOFOOD / GOSEND)
              _buildGojekServiceGrid(),

              const SizedBox(height: 24),

              // 4. KARTU AKSES CEPAT PEMETAAN SAWAH (HERO BANNER)
              _buildGisHeroBanner(),

              const SizedBox(height: 20),

              // 5. BANNER INFO MUSIM TANAM & JADWAL PEMUPUKAN (ALA PROMO CAROUSEL)
              _buildMusimTanamInfoSection(),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),

      // 6. BOTTOM NAVIGATION BAR ALA GOJEK
      bottomNavigationBar: _buildGojekBottomNav(),
    );
  }

  // Widget 1: Top Bar & Search Bar
  Widget _buildTopSearchBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar Pengguna
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: AppColors.primarySurface,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text(
                    'SP',
                    style: TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Greeting & Lokasi Poktan
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Halo, Supriyanto! 👋',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                    Text(
                      'Poktan Sri Mulyo • Desa Kediren',
                      style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              // Tombol Notifikasi & Bantuan
              IconButton(
                icon: const Icon(Icons.notifications_none, color: AppColors.textMain),
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Floating Search Bar Input
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.search, color: AppColors.textMuted, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Cari NIK, nama petani, atau blok sawah...',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.qr_code_scanner, color: AppColors.primary, size: 16),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Widget 2: Kartu Kuota Pupuk Subsidi ala GoPay Card
  Widget _buildGopayStyleQuotaCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF064E3B), // Deep Forest Green khas Gojek/Pertanian
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2A064E3B),
              blurRadius: 14,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          children: [
            // Baris Atas: Sisa Kuota e-RDKK
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white24,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'e-RDKK 2026',
                                style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Musim Tanam MT 1',
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Sisa Kuota Pupuk Bersubsidi',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          '67 Kg Urea • 50 Kg NPK • 102 Kg Organik',
                          style: TextStyle(
                            color: Color(0xFFA7F3D0),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.eco, color: Colors.white, size: 24),
                  ),
                ],
              ),
            ),

            // Baris Bawah: Quick Action Buttons ala GoPay (Tebus, Riwayat, Kartu)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: const BoxDecoration(
                color: Color(0xFF047857), // Sedikit lebih terang
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildGopayActionButton(
                    icon: Icons.qr_code,
                    label: 'Scan Kartu',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const KartuTaniScreen()),
                      );
                    },
                  ),
                  _buildGopayActionButton(
                    icon: Icons.receipt_long,
                    label: 'Riwayat Tebus',
                    onTap: () {},
                  ),
                  _buildGopayActionButton(
                    icon: Icons.map,
                    label: 'Petak Sawah',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const FieldMapScreen()),
                      );
                    },
                  ),
                  _buildGopayActionButton(
                    icon: Icons.calendar_month,
                    label: 'Jadwal Tanam',
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGopayActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  // Widget 3: Grid 8 Layanan Utama ala Gojek Super-App (GoRide, GoFood, dll.)
  Widget _buildGojekServiceGrid() {
    final services = [
      {'title': 'Peta Sawah', 'icon': Icons.map_outlined, 'color': AppColors.primary, 'screen': const FieldMapScreen()},
      {'title': 'Kartu Tani', 'icon': Icons.badge_outlined, 'color': const Color(0xFF047857), 'screen': const KartuTaniScreen()},
      {'title': 'Tebus Pupuk', 'icon': Icons.storefront_outlined, 'color': AppColors.accentAmber, 'screen': const KartuTaniScreen()},
      {'title': 'Jadwal Tanam', 'icon': Icons.event_note_outlined, 'color': AppColors.accentBlue, 'screen': null},
      {'title': 'Daftar Petani', 'icon': Icons.groups_outlined, 'color': const Color(0xFF0D9488), 'screen': null},
      {'title': 'Poktan Desa', 'icon': Icons.domain_outlined, 'color': const Color(0xFF0284C7), 'screen': null},
      {'title': 'Surat Ukur', 'icon': Icons.description_outlined, 'color': const Color(0xFF475569), 'screen': null},
      {'title': 'Bantuan BPP', 'icon': Icons.support_agent_outlined, 'color': const Color(0xFFEA580C), 'screen': null},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [
            BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 3)),
          ],
        ),
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: services.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 16,
            crossAxisSpacing: 4,
            childAspectRatio: 0.85,
          ),
          itemBuilder: (context, index) {
            final item = services[index];
            final color = item['color'] as Color;
            final icon = item['icon'] as IconData;
            final title = item['title'] as String;
            final screen = item['screen'] as Widget?;

            return InkWell(
              onTap: () {
                if (screen != null) {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Menu $title siap digunakan.'),
                      backgroundColor: AppColors.primary,
                      duration: const Duration(seconds: 1),
                    ),
                  );
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: color, size: 24),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMain,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  // Widget 4: Hero Banner Pemetaan Sawah Lapangan
  Widget _buildGisHeroBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: InkWell(
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const FieldMapScreen()));
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF047857), Color(0xFF10B981)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(color: Color(0x28047857), blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Pemetaan Petak Sawah (GIS)',
                      style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Ukur batas fisik sawah satelit Esri, rekam patok GPS, & simpan otomatis saat offline.',
                      style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Text(
                      'Mulai',
                      style: TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    Icon(Icons.arrow_forward_ios, color: AppColors.primaryDark, size: 12),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Widget 5: Banner Informasi Jadwal Pemupukan (Gojek Promo Carousel Style)
  Widget _buildMusimTanamInfoSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informasi Pertanian Kecamatan Lembeyan',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.accentAmber.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.wb_sunny_outlined, color: AppColors.accentAmber, size: 24),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Jadwal Rekomendasi Pemupukan Fase 1',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textMain),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Usia tanaman 7-14 HST: Aplikasi Urea 35 Kg + NPK 25 Kg. Pastikan debit air irigasi mencukupi.',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.3),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Widget 6: Bottom Navigation Bar Ramping ala Gojek
  Widget _buildGojekBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: const [
          BoxShadow(color: Color(0x0D000000), blurRadius: 10, offset: Offset(0, -3)),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _currentNavIndex,
        onTap: (index) {
          setState(() => _currentNavIndex = index);
          if (index == 1) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const FieldMapScreen()));
          } else if (index == 2) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const KartuTaniScreen()));
          }
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Beranda'),
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: 'Peta GIS'),
          BottomNavigationBarItem(icon: Icon(Icons.badge_outlined), label: 'Kartu Tani'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Transaksi'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Akun'),
        ],
      ),
    );
  }
}
