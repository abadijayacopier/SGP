import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/sync_service.dart';
import '../../../gis_mapping/presentation/screens/field_map_screen.dart';
import '../../../pupuk/presentation/screens/kartu_tani_screen.dart';
import '../../../pupuk/presentation/screens/riwayat_tebus_screen.dart';
import '../../../petani/presentation/screens/petani_list_screen.dart';
import '../../../jadwal_tanam/presentation/screens/jadwal_tanam_screen.dart';
import '../../../sync/presentation/screens/sync_screen.dart';

/// Halaman Beranda Modern dengan Desain Super-App ala Gojek
/// Disesuaikan untuk Kebutuhan Pertanian BPP Kecamatan Lembeyan
class GojekStyleHomeScreen extends StatefulWidget {
  const GojekStyleHomeScreen({super.key});

  @override
  State<GojekStyleHomeScreen> createState() => _GojekStyleHomeScreenState();
}

class _GojekStyleHomeScreenState extends State<GojekStyleHomeScreen> {
  int _currentNavIndex = 0;
  int _pendingSurveys = 0;

  @override
  void initState() {
    super.initState();
    _loadPendingSurveys();
  }

  Future<void> _loadPendingSurveys() async {
    final count = await SyncService.instance.getPendingSurveyCount();
    if (mounted) {
      setState(() => _pendingSurveys = count);
    }
  }

  void _showBppHelpDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.support_agent, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Pusat Bantuan BPP', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Balai Penyuluhan Pertanian (BPP) Kecamatan Lembeyan',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            SizedBox(height: 6),
            Text('Kabupaten Magetan, Jawa Timur', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            Divider(height: 20),
            Text('• Layanan Verifikasi e-RDKK & Kartu Tani', style: TextStyle(fontSize: 12)),
            Text('• Pendampingan PPL Lapangan Pemetaan Lahan', style: TextStyle(fontSize: 12)),
            Text('• Konsultasi Dosis Pemupukan Berimbang', style: TextStyle(fontSize: 12)),
            SizedBox(height: 12),
            Text('Jam Operasional: Senin - Jumat (07.30 - 15.30 WIB)', style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

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

              // Banner Notifikasi Pending Sync (jika ada survei sawah offline)
              if (_pendingSurveys > 0)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                  child: InkWell(
                    onTap: () async {
                      await Navigator.push(context, MaterialPageRoute(builder: (_) => const SyncScreen()));
                      _loadPendingSurveys();
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.sync_problem, color: Colors.amber, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Ada $_pendingSurveys survei sawah offline yang belum terkirim ke server.',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                            ),
                          ),
                          const Text('Kirim', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        ],
                      ),
                    ),
                  ),
                ),

              const SizedBox(height: 14),

              // 2. KARTU KUOTA PUPUK SUBSIDI (ALA GOPAY WALLET CARD)
              _buildGopayStyleQuotaCard(),

              const SizedBox(height: 20),

              // 3. GRID 8 MENU LAYANAN UTAMA
              _buildGojekServiceGrid(),

              const SizedBox(height: 24),

              // 4. KARTU AKSES CEPAT PEMETAAN SAWAH (HERO BANNER)
              _buildGisHeroBanner(),

              const SizedBox(height: 20),

              // 5. BANNER INFO MUSIM TANAM & JADWAL PEMUPUKAN
              _buildMusimTanamInfoSection(),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),

      // 6. BOTTOM NAVIGATION BAR
      bottomNavigationBar: _buildGojekBottomNav(),
    );
  }

  // Widget 1: Top Bar & Search Bar Input
  Widget _buildTopSearchBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        children: [
          Row(
            children: [
              // Logo Tunas Pertanian Lembeyan
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.eco, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              // Greeting & Lokasi Poktan
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SGP Lembeyan Mobile 🌾',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain,
                      ),
                    ),
                    Text(
                      'Kecamatan Lembeyan • Magetan',
                      style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              // Tombol Sinkronisasi Server
              IconButton(
                icon: Badge(
                  isLabelVisible: _pendingSurveys > 0,
                  label: Text('$_pendingSurveys'),
                  child: const Icon(Icons.sync, color: AppColors.primary),
                ),
                tooltip: 'Sinkronisasi Data',
                onPressed: () async {
                  await Navigator.push(context, MaterialPageRoute(builder: (_) => const SyncScreen()));
                  _loadPendingSurveys();
                },
              ),
              // Tombol Bantuan
              IconButton(
                icon: const Icon(Icons.help_outline, color: AppColors.textMain),
                tooltip: 'Bantuan BPP',
                onPressed: _showBppHelpDialog,
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Floating Search Bar Input
          InkWell(
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PetaniListScreen()));
            },
            borderRadius: BorderRadius.circular(24),
            child: Container(
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
                  InkWell(
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const KartuTaniScreen()));
                    },
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: const BoxDecoration(
                        color: AppColors.primarySurface,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.qr_code_scanner, color: AppColors.primary, size: 16),
                    ),
                  ),
                ],
              ),
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
          color: const Color(0xFF064E3B), // Deep Forest Green
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
                            const Text(
                              'e-RDKK Pupuk Subsidi',
                              style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.accentYellow.withAlpha(50),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'MT 2026',
                                style: TextStyle(color: AppColors.accentYellow, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Urea: 350 kg • NPK: 250 kg',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Sisa Kuota Siap Tebus di Kios Resmi',
                          style: TextStyle(color: Colors.white60, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const RiwayatTebusScreen()));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentYellow,
                      foregroundColor: const Color(0xFF064E3B),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      elevation: 0,
                    ),
                    child: const Text('Detail Kuota', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),

            // Baris Bawah: 4 Tombol Aksi Cepat
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF047857),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildGopayActionButton(
                    icon: Icons.qr_code,
                    label: 'Scan Kartu',
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const KartuTaniScreen()));
                    },
                  ),
                  _buildGopayActionButton(
                    icon: Icons.receipt_long,
                    label: 'Riwayat Tebus',
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const RiwayatTebusScreen()));
                    },
                  ),
                  _buildGopayActionButton(
                    icon: Icons.map,
                    label: 'Petak Sawah',
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const FieldMapScreen()));
                    },
                  ),
                  _buildGopayActionButton(
                    icon: Icons.calendar_month,
                    label: 'Jadwal Tanam',
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const JadwalTanamScreen()));
                    },
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

  // Widget 3: Grid 8 Layanan Utama
  Widget _buildGojekServiceGrid() {
    final services = [
      {'title': 'Peta Sawah', 'icon': Icons.map_outlined, 'color': AppColors.primary, 'screen': const FieldMapScreen()},
      {'title': 'Kartu Tani', 'icon': Icons.badge_outlined, 'color': const Color(0xFF047857), 'screen': const KartuTaniScreen()},
      {'title': 'Tebus Pupuk', 'icon': Icons.storefront_outlined, 'color': AppColors.accentAmber, 'screen': const RiwayatTebusScreen()},
      {'title': 'Jadwal Tanam', 'icon': Icons.event_note_outlined, 'color': AppColors.accentBlue, 'screen': const JadwalTanamScreen()},
      {'title': 'Daftar Petani', 'icon': Icons.groups_outlined, 'color': const Color(0xFF0D9488), 'screen': const PetaniListScreen()},
      {'title': 'Poktan Desa', 'icon': Icons.domain_outlined, 'color': const Color(0xFF0284C7), 'screen': const PetaniListScreen()},
      {'title': 'Sinkron Data', 'icon': Icons.sync_outlined, 'color': const Color(0xFF475569), 'screen': const SyncScreen()},
      {'title': 'Bantuan BPP', 'icon': Icons.support_agent_outlined, 'color': const Color(0xFFEA580C), 'action': 'help'},
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
            final action = item['action'] as String?;

            return InkWell(
              onTap: () {
                if (action == 'help') {
                  _showBppHelpDialog();
                } else if (screen != null) {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => screen)).then((_) => _loadPendingSurveys());
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
                      color: color.withAlpha(30),
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
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  // Widget 4: Hero Banner GIS Pemetaan
  Widget _buildGisHeroBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: InkWell(
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const FieldMapScreen())).then((_) => _loadPendingSurveys());
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF047857), Color(0xFF065F46)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(color: Color(0x2A047857), blurRadius: 12, offset: Offset(0, 5)),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        '🛰️ SATELIT ESRI REAL-TIME',
                        style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Mulai Ukur Petak Sawah',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Perekaman titik patok akurasi GPS satelit dan simpan offline tanpa sinyal.',
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.navigation, color: AppColors.primary, size: 28),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Widget 5: Musim Tanam Info
  Widget _buildMusimTanamInfoSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Kalender Tanam & Rekomendasi BPP',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accentAmberBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.wb_sunny, color: AppColors.accentAmber, size: 24),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pola Tanam MT 1 Walikan',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textMain),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Oktober - Januari: Padi Sawah Inpari 32 dengan rekomendasi pemupukan berimbang.',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.textMuted),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Widget 6: Bottom Navigation Bar
  Widget _buildGojekBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Color(0x0D000000), blurRadius: 10, offset: Offset(0, -3)),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _currentNavIndex,
        onTap: (index) async {
          setState(() => _currentNavIndex = index);
          if (index == 1) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const FieldMapScreen()));
          } else if (index == 2) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const KartuTaniScreen()));
          } else if (index == 3) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const RiwayatTebusScreen()));
          } else if (index == 4) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const SyncScreen()));
          }
          _loadPendingSurveys();
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
          BottomNavigationBarItem(icon: Icon(Icons.cloud_sync_outlined), label: 'Sinkron'),
        ],
      ),
    );
  }
}
