import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../gis_mapping/presentation/screens/field_map_screen.dart';
import '../../../pupuk/presentation/screens/kartu_tani_screen.dart';

/// Halaman Pemilihan Peran (PPL / Kasir Kios / Petani Mandiri)
class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Logo & Identitas Aplikasi
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primaryBorder, width: 2),
                ),
                child: const Icon(Icons.eco, size: 40, color: AppColors.primary),
              ),
              const SizedBox(height: 16),
              const Text(
                'SISTEM INFORMASI PERTANIAN',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                  color: AppColors.primaryDark,
                ),
                textAlign: TextAlign.center,
              ),
              const Text(
                'Balai Penyuluhan Pertanian (BPP) Kec. Lembeyan',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Pilih Peran Pengguna:',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textMain,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // OPSI 1: Penyuluh Lapangan (PPL) - Pemetaan GIS Lapangan
              _buildRoleCard(
                context,
                title: 'Penyuluh Pertanian (PPL)',
                subtitle: 'Pemetaan petak sawah satelit Esri, rekam patok GPS jalan kaki & offline di sawah.',
                icon: Icons.map,
                color: AppColors.primary,
                badge: 'Fitur GIS Lengkap',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const FieldMapScreen()),
                  );
                },
              ),

              const SizedBox(height: 12),

              // OPSI 2: Kasir Kios Resmi Poktan - Penebusan Pupuk
              _buildRoleCard(
                context,
                title: 'Kasir Kios / Poktan',
                subtitle: 'Scan QR Kartu Tani digital, verifikasi sisa kuota subsidi & cetak struk nota.',
                icon: Icons.point_of_sale,
                color: AppColors.accentAmber,
                badge: 'Penebusan Pupuk',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const KartuTaniScreen()),
                  );
                },
              ),

              const SizedBox(height: 12),

              // OPSI 3: Petani Mandiri - Cek Kuota & Kartu Tani
              _buildRoleCard(
                context,
                title: 'Petani Pemilik / Penggarap',
                subtitle: 'Cek jatah kuota pupuk e-RDKK, jadwal kalender tanam, & sertifikat petak sawah.',
                icon: Icons.person_pin,
                color: AppColors.accentBlue,
                badge: 'Layanan Mandiri',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const KartuTaniScreen()),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String badge,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
            boxShadow: const [
              BoxShadow(color: Colors.black05, blurRadius: 6, offset: Offset(0, 3)),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textMain,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badge,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: color,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.3),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
