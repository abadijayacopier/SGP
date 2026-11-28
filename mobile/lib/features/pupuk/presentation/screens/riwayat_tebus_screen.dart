import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import 'kartu_tani_screen.dart';

class RiwayatTebusScreen extends StatefulWidget {
  const RiwayatTebusScreen({super.key});

  @override
  State<RiwayatTebusScreen> createState() => _RiwayatTebusScreenState();
}

class _RiwayatTebusScreenState extends State<RiwayatTebusScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<Map<String, dynamic>> _riwayatList = [];
  final Map<String, dynamic> _summaryQuota = {
    'totalUrea': 14500,
    'sisaUrea': 9200,
    'totalNpk': 11800,
    'sisaNpk': 7400,
    'totalOrganik': 4500,
    'sisaOrganik': 3100,
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/pupuk/penyaluran');
      if (res.statusCode == 200) {
        final dynamic raw = res.data;
        List<dynamic> items = [];
        if (raw is List) {
          items = raw;
        } else if (raw is Map && raw['data'] is List) {
          items = raw['data'];
        }

        if (items.isNotEmpty) {
          _riwayatList = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (_) {
      // Fallback data simulasi penyaluran jika offline
      _riwayatList = [
        {
          'tanggalPenyaluran': '2026-11-20',
          'namaPetani': 'Kusmanto',
          'nik': '3520011204780001',
          'pupuk': 'Urea & NPK',
          'volumeUrea': 150,
          'volumeNpk': 100,
          'kios': 'Kios Tani Makmur Lembeyan',
          'status': 'SELESAI',
        },
        {
          'tanggalPenyaluran': '2026-11-18',
          'namaPetani': 'Sugeng Hariyadi',
          'nik': '3520010508820002',
          'pupuk': 'Urea',
          'volumeUrea': 200,
          'volumeNpk': 0,
          'kios': 'Kios Berkah Subur',
          'status': 'SELESAI',
        },
        {
          'tanggalPenyaluran': '2026-11-15',
          'namaPetani': 'Bambang Sudarsono',
          'nik': '3520012209750003',
          'pupuk': 'NPK Phonska',
          'volumeUrea': 0,
          'volumeNpk': 150,
          'kios': 'Kios Tani Makmur Lembeyan',
          'status': 'SELESAI',
        },
      ];
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Pupuk Bersubsidi & e-RDKK'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accentYellow,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Sisa Kuota e-RDKK', icon: Icon(Icons.analytics_outlined)),
            Tab(text: 'Riwayat Tebus', icon: Icon(Icons.receipt_long_outlined)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildQuotaTab(),
                _buildHistoryTab(),
              ],
            ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        color: Colors.white,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
          label: const Text('Scan & Tebus Pupuk Sekarang', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const KartuTaniScreen()),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }

  Widget _buildQuotaTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Kartu Utama
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF065F46), Color(0xFF047857)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(color: Color(0x2A064E3B), blurRadius: 10, offset: Offset(0, 4)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Kecamatan Lembeyan, Magetan',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.accentYellow.withAlpha(50),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Musim Tanam 2026/2027',
                      style: TextStyle(color: AppColors.accentYellow, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Alokasi Pupuk Bersubsidi',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildQuotaBadge('Urea', '${_summaryQuota['sisaUrea']} kg', 'dari ${_summaryQuota['totalUrea']} kg'),
                  _buildQuotaBadge('NPK Phonska', '${_summaryQuota['sisaNpk']} kg', 'dari ${_summaryQuota['totalNpk']} kg'),
                  _buildQuotaBadge('Organik', '${_summaryQuota['sisaOrganik']} kg', 'dari ${_summaryQuota['totalOrganik']} kg'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Ketentuan Penebusan Pupuk:',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
        ),
        const SizedBox(height: 10),
        _buildInfoCard('Kartu Tani / KTP Asli', 'Penebusan wajib menyertakan verifikasi fisik Kartu Tani atau NIK KTP yang sudah terdaftar di sistem e-RDKK.', Icons.badge_outlined),
        _buildInfoCard('Maksimal Alokasi 2 Hektare', 'Berdasarkan Permentan, batas maksimal kuota pupuk bersubsidi adalah 2.0 Ha per petani.', Icons.rule_outlined),
        _buildInfoCard('Verifikasi Titik Kios', 'Hanya dapat ditebus di kios resmi yang telah ditunjuk sesuai wilayah poktan petani.', Icons.storefront_outlined),
      ],
    );
  }

  Widget _buildQuotaBadge(String title, String sisa, String total) {
    return Column(
      children: [
        Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        const SizedBox(height: 4),
        Text(sisa, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
        Text(total, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ],
    );
  }

  Widget _buildHistoryTab() {
    if (_riwayatList.isEmpty) {
      return const Center(child: Text('Belum ada riwayat penebusan'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _riwayatList.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final r = _riwayatList[index];
        final nama = r['namaPetani'] ?? r['petani']?['nama'] ?? 'Petani';
        final tgl = r['tanggalPenyaluran']?.toString().split('T').first ?? '-';
        final urea = r['volumeUrea'] ?? 0;
        final npk = r['volumeNpk'] ?? 0;

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(color: Color(0x0A000000), blurRadius: 6, offset: Offset(0, 2)),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.receipt, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      nama,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tgl: $tgl • ${r['kios'] ?? 'Kios BPP'}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${urea > 0 ? '$urea kg Urea ' : ''}${npk > 0 ? '$npk kg NPK' : ''}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryDark,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('BERHASIL', style: TextStyle(color: Colors.green, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoCard(String title, String desc, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
