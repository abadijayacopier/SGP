import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../../core/constants/app_colors.dart';

/// Kartu Tani Digital & Cek Kuota Pupuk e-RDKK (Untuk Petani & Kasir Kios)
class KartuTaniScreen extends StatelessWidget {
  final String namaPetani;
  final String nik;
  final String namaPoktan;
  final String desa;
  final double jatahUrea;
  final double sisaUrea;
  final double jatahNpk;
  final double sisaNpk;
  final double jatahOrganik;
  final double sisaOrganik;

  const KartuTaniScreen({
    super.key,
    this.namaPetani = 'SUPRIYANTO',
    this.nik = '3520033010900002',
    this.namaPoktan = 'POKTAN SRI MULYO',
    this.desa = 'Kediren',
    this.jatahUrea = 67.0,
    this.sisaUrea = 67.0,
    this.jatahNpk = 50.0,
    this.sisaNpk = 50.0,
    this.jatahOrganik = 102.0,
    this.sisaOrganik = 102.0,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kartu Tani Digital & Kuota e-RDKK'),
        backgroundColor: AppColors.primaryDark,
        foregroundColor: Colors.white,
      ),
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // 1. KARTU TANI DIGITAL (Desain Fisik Resmi)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF047857), Color(0xFF059669)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x33064E3B),
                    blurRadius: 16,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'KARTU TANI DIGITAL',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            'BPP Kecamatan Lembeyan - Kab. Magetan',
                            style: TextStyle(color: Colors.white70, fontSize: 10),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'AKTIF 2026',
                          style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              namaPetani,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'NIK: $nik',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$namaPoktan • Desa $desa',
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: QrImageView(
                          data: 'PETANI:$nik:$namaPetani',
                          version: QrVersions.auto,
                          size: 72.0,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 2. STATUS SISA KUOTA PUPUK SUBSIDI (e-RDKK MT 1 / MT 2 / MT 3)
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Alokasi Kuota Pupuk Bersubsidi Tahun 2026',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                _buildQuotaCard('PUPUK UREA', sisaUrea, jatahUrea, AppColors.primary),
                const SizedBox(width: 8),
                _buildQuotaCard('NPK PHONSKA', sisaNpk, jatahNpk, AppColors.accentAmber),
                const SizedBox(width: 8),
                _buildQuotaCard('ORGANIK', sisaOrganik, jatahOrganik, AppColors.accentBlue),
              ],
            ),

            const SizedBox(height: 24),

            // 3. TOMBOL TEBUS PUPUK DI KIOS RESMI (Untuk Kasir Kios & PPL)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryDark,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Kamera scanner QR siap memindai Kartu Tani untuk verifikasi tebus pupuk.'),
                      backgroundColor: AppColors.primary,
                    ),
                  );
                },
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan QR Petani / Proses Penebusan Kios'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuotaCard(String label, double sisa, double total, Color color) {
    final percent = total > 0 ? (sisa / total).clamp(0.0, 1.0) : 0.0;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Colors.black05, blurRadius: 4, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
            ),
            const SizedBox(height: 6),
            Text(
              '${sisa.toStringAsFixed(0)} Kg',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textMain),
            ),
            const SizedBox(height: 2),
            Text(
              'Jatah: ${total.toStringAsFixed(0)} Kg',
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: percent,
              backgroundColor: color.withOpacity(0.15),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 4,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      ),
    );
  }
}
