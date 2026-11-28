import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/server_config_service.dart';
import '../../../../core/services/sync_service.dart';
import '../../../../core/database/app_database.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  int _pendingSurveys = 0;
  int _cachedPetani = 0;
  bool _isSyncing = false;
  String _currentServerUrl = '';
  List<Map<String, dynamic>> _pendingList = [];

  @override
  void initState() {
    super.initState();
    _currentServerUrl = ServerConfigService.instance.baseUrl;
    _refreshCounts();
  }

  Future<void> _refreshCounts() async {
    final pending = await SyncService.instance.getPendingSurveyCount();
    final cached = await SyncService.instance.getCachedPetaniCount();
    final db = await AppDatabase.instance.database;
    final list = await db.query('offline_surveys', where: "sync_status = 'PENDING'");

    if (mounted) {
      setState(() {
        _pendingSurveys = pending;
        _cachedPetani = cached;
        _pendingList = list;
        _currentServerUrl = ServerConfigService.instance.baseUrl;
      });
    }
  }

  Future<void> _startSync() async {
    setState(() => _isSyncing = true);

    final result = await SyncService.instance.syncAll();
    await _refreshCounts();

    if (mounted) {
      setState(() => _isSyncing = false);
      if (result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sinkronisasi Sukses! ${result.uploadedSurveys} survei terkirim, ${result.downloadedPetani} data petani terupdate.',
            ),
            backgroundColor: AppColors.primary,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal sinkronisasi: ${result.errorMessage ?? 'Cek koneksi server'}'),
            backgroundColor: AppColors.accentRed,
          ),
        );
      }
    }
  }

  void _showServerSettingsDialog() {
    final controller = TextEditingController(text: _currentServerUrl);
    bool testing = false;
    bool? testResult;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Pengaturan Server URL'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Masukkan alamat server Next.js SGP (IP LAN laptop atau domain web online):',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                decoration: InputDecoration(
                  hintText: 'http://192.168.1.xxx:3000/api',
                  filled: true,
                  fillColor: const Color(0xFFF1F5F9),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 10),
              // Preset Cepat
              Wrap(
                spacing: 6,
                children: [
                  ActionChip(
                    label: const Text('Emulator', style: TextStyle(fontSize: 10)),
                    onPressed: () {
                      setDialogState(() => controller.text = 'http://10.0.2.2:3000/api');
                    },
                  ),
                  ActionChip(
                    label: const Text('Localhost', style: TextStyle(fontSize: 10)),
                    onPressed: () {
                      setDialogState(() => controller.text = 'http://127.0.0.1:3000/api');
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton.icon(
                    icon: testing
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.wifi_find, size: 16),
                    label: const Text('Tes Koneksi', style: TextStyle(fontSize: 12)),
                    onPressed: testing
                        ? null
                        : () async {
                            setDialogState(() {
                              testing = true;
                              testResult = null;
                            });
                            final ok = await ServerConfigService.instance.testConnection(controller.text);
                            setDialogState(() {
                              testing = false;
                              testResult = ok;
                            });
                          },
                  ),
                  const SizedBox(width: 8),
                  if (testResult != null)
                    Expanded(
                      child: Text(
                        testResult! ? '✓ Terhubung' : '✗ Gagal terhubung',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: testResult! ? Colors.green : Colors.red,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: () async {
                await ServerConfigService.instance.setBaseUrl(controller.text);
                if (mounted) {
                  setState(() => _currentServerUrl = ServerConfigService.instance.baseUrl);
                }
                Navigator.pop(ctx);
                _refreshCounts();
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Simpan', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Sinkronisasi Data Lapangan'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Pengaturan Server',
            onPressed: _showServerSettingsDialog,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Banner Server Status
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(
                    color: AppColors.primarySurface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.dns, color: AppColors.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Alamat Server Backend', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      const SizedBox(height: 2),
                      Text(
                        _currentServerUrl,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: _showServerSettingsDialog,
                  child: const Text('Ganti', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Status Cards Grid
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Survei Belum Sync',
                  '$_pendingSurveys',
                  Icons.cloud_upload_outlined,
                  _pendingSurveys > 0 ? AppColors.accentAmber : Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Cache Petani di HP',
                  '$_cachedPetani',
                  Icons.people_alt_outlined,
                  AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Tombol Sinkronisasi Utama
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              icon: _isSyncing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.sync, color: Colors.white),
              label: Text(
                _isSyncing ? 'Sedang Mensinkronkan...' : 'Sinkronkan Data Sekarang',
                style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
              onPressed: _isSyncing ? null : _startSync,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Section Antrean Offline
          const Text(
            'Antrean Survei Lapangan yang Belum Terkirim:',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMain),
          ),
          const SizedBox(height: 10),
          if (_pendingList.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.green, size: 40),
                  SizedBox(height: 8),
                  Text('Semua data lapangan sudah tersinkronkan!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  SizedBox(height: 4),
                  Text('Tidak ada antrean tertunda di memori HP.', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                ],
              ),
            )
          else
            for (final item in _pendingList)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.pending_actions, color: AppColors.accentAmber),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['nama_lahan'] ?? 'Petak Lahan', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text(
                            'Petani: ${item['petani_nama']} • Luas: ${item['luas_ha']} Ha',
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    const Chip(
                      label: Text('PENDING', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold)),
                      backgroundColor: AppColors.accentAmber,
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String title, String val, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x0A000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(val, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}
