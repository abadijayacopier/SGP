import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class JadwalTanamScreen extends StatelessWidget {
  const JadwalTanamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final musimList = [
      {
        'musim': 'MT 1 (Walikan)',
        'periode': 'Oktober - Januari',
        'komoditas': 'Padi Sawah (Inpari 32 / Ciherang)',
        'dosis': 'Urea: 200-250 kg/Ha, NPK: 300-350 kg/Ha',
        'status': 'SEDANG BERJALAN',
        'warna': const Color(0xFF047857),
        'icon': Icons.water_drop_outlined,
      },
      {
        'musim': 'MT 2 (Kemarau / Gadu)',
        'periode': 'Februari - Mei',
        'komoditas': 'Jagung Hibrida / Kedelai / Palawija',
        'dosis': 'Urea: 300 kg/Ha, NPK: 200 kg/Ha',
        'status': 'MENDATANG',
        'warna': AppColors.accentAmber,
        'icon': Icons.wb_sunny_outlined,
      },
      {
        'musim': 'MT 3 (Rendeng)',
        'periode': 'Juni - September',
        'komoditas': 'Padi Sawah / Palawija Rotasi',
        'dosis': 'Urea: 200 kg/Ha, NPK: 300 kg/Ha',
        'status': 'RENCANA',
        'warna': AppColors.accentBlue,
        'icon': Icons.calendar_month_outlined,
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Jadwal Tanam BPP Lembeyan'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Banner Wilayah
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF065F46), Color(0xFF047857)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Kalender Pola Tanam Wilayah Lembeyan',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(
                  'Rekomendasi teknis Balai Penyuluhan Pertanian (BPP) Kecamatan Lembeyan Kabupaten Magetan.',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          for (final m in musimList)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x06000000), blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: (m['warna'] as Color).withAlpha(30),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(m['icon'] as IconData, color: m['warna'] as Color, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m['musim'] as String,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            Text(
                              m['periode'] as String,
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (m['warna'] as Color).withAlpha(25),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          m['status'] as String,
                          style: TextStyle(color: m['warna'] as Color, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    children: [
                      const Text('Komoditas Utama: ', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Expanded(
                        child: Text(
                          m['komoditas'] as String,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Text('Dosis Pupuk: ', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Expanded(
                        child: Text(
                          m['dosis'] as String,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
