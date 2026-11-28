import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/database/app_database.dart';
import '../../../gis_mapping/presentation/screens/field_map_screen.dart';
import '../../../pupuk/presentation/screens/kartu_tani_screen.dart';

class PetaniListScreen extends StatefulWidget {
  final String? initialSearch;
  const PetaniListScreen({super.key, this.initialSearch});

  @override
  State<PetaniListScreen> createState() => _PetaniListScreenState();
}

class _PetaniListScreenState extends State<PetaniListScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _petaniList = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedDesa = 'SEMUA';

  final List<String> _desaList = [
    'SEMUA',
    'Lembeyan Kulon',
    'Lembeyan Wetan',
    'Kediren',
    'Pupus',
    'Tapen',
    'Tunggur',
    'Kedungpanji',
    'Krowe',
    'Dukuh',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialSearch != null && widget.initialSearch!.isNotEmpty) {
      _searchController.text = widget.initialSearch!;
    }
    _fetchPetani();
  }

  Future<void> _fetchPetani() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final query = <String, dynamic>{};
      if (_searchController.text.trim().isNotEmpty) {
        query['search'] = _searchController.text.trim();
      }
      if (_selectedDesa != 'SEMUA') {
        query['desa'] = _selectedDesa;
      }

      final res = await ApiClient.instance.get('/petani', queryParameters: query);
      if (res.statusCode == 200) {
        final dynamic raw = res.data;
        List<dynamic> items = [];
        if (raw is List) {
          items = raw;
        } else if (raw is Map && raw['data'] is List) {
          items = raw['data'];
        }

        setState(() {
          _petaniList = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _isLoading = false;
        });
        return;
      }
    } catch (_) {
      // Fallback ke offline SQLite cache
      final db = await AppDatabase.instance.database;
      String where = '';
      List<dynamic> whereArgs = [];

      if (_searchController.text.trim().isNotEmpty) {
        where = 'nama LIKE ? OR nik LIKE ?';
        whereArgs = ['%${_searchController.text.trim()}%', '%${_searchController.text.trim()}%'];
      }
      if (_selectedDesa != 'SEMUA') {
        if (where.isNotEmpty) where += ' AND ';
        where += 'desa = ?';
        whereArgs.add(_selectedDesa);
      }

      final cached = await db.query(
        'cached_petani',
        where: where.isEmpty ? null : where,
        whereArgs: whereArgs.isEmpty ? null : whereArgs,
      );

      setState(() {
        _petaniList = cached.map((e) => {
          'id': e['id'],
          'nama': e['nama'],
          'nik': e['nik'],
          'desa': e['desa'],
          'totalLuasLahan': e['luas_lahan'],
          'poktan': {'nama': e['poktan_nama']},
          'isOfflineCache': true,
        }).toList();
        _isLoading = false;
        if (_petaniList.isEmpty) {
          _errorMessage = 'Gagal terhubung ke server dan belum ada data cache offline.';
        }
      });
    }
  }

  void _showPetaniDetail(Map<String, dynamic> p) {
    final poktan = p['poktan'] as Map<String, dynamic>?;
    final alokasi = p['alokasiPupuk'] as List<dynamic>? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primarySurface,
                  child: Text(
                    (p['nama'] as String? ?? 'P').substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['nama'] ?? '-',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textMain,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'NIK: ${p['nik'] ?? '-'}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                      ),
                      Text(
                        'Poktan: ${poktan?['nama'] ?? '-'} (${p['desa'] ?? '-'})',
                        style: const TextStyle(fontSize: 12, color: AppColors.primaryDark),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Ringkasan Lahan & Kuota Pupuk
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Informasi Pertanian & e-RDKK',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildInfoItem('Total Lahan', '${p['totalLuasLahan'] ?? 0} Ha', Icons.landscape_outlined),
                      _buildInfoItem('Status', p['statusVerifikasi'] ?? 'TERDAFTAR', Icons.verified_outlined),
                      _buildInfoItem('No. KTA', p['nomorKta'] ?? 'KTA-BPP', Icons.badge_outlined),
                    ],
                  ),
                  if (alokasi.isNotEmpty) ...[
                    const Divider(height: 20),
                    const Text(
                      'Alokasi Pupuk Bersubsidi:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMain),
                    ),
                    const SizedBox(height: 6),
                    for (final a in alokasi)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('• ${a['komoditas'] ?? 'Padi'}:', style: const TextStyle(fontSize: 12)),
                            Text(
                              'Urea: ${a['kuotaUrea'] ?? 0} kg | NPK: ${a['kuotaNpk'] ?? 0} kg',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Tombol Aksi
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.qr_code),
                    label: const Text('Kartu Tani'),
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const KartuTaniScreen()),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.map, color: Colors.white),
                    label: const Text('Peta Sawah', style: TextStyle(color: Colors.white)),
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const FieldMapScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Daftar Petani & Poktan'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Filter & Search Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Cari NIK atau Nama Petani...',
                    prefixIcon: const Icon(Icons.search, color: AppColors.primary),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _fetchPetani();
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onSubmitted: (_) => _fetchPetani(),
                ),
                const SizedBox(height: 10),
                // Filter Desa Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _desaList.map((desa) {
                      final isSelected = _selectedDesa == desa;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(desa),
                          selected: isSelected,
                          onSelected: (val) {
                            setState(() => _selectedDesa = desa);
                            _fetchPetani();
                          },
                          backgroundColor: const Color(0xFFF1F5F9),
                          selectedColor: AppColors.primarySurface,
                          labelStyle: TextStyle(
                            fontSize: 11,
                            color: isSelected ? AppColors.primary : AppColors.textMain,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // List Body
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _errorMessage != null && _petaniList.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.cloud_off, size: 48, color: AppColors.textMuted),
                              const SizedBox(height: 12),
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: AppColors.textMuted),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchPetani,
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: _fetchPetani,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _petaniList.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final p = _petaniList[index];
                            final poktan = p['poktan'] as Map<String, dynamic>?;
                            final isOffline = p['isOfflineCache'] == true;

                            return Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x0A000000),
                                    blurRadius: 6,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                leading: CircleAvatar(
                                  backgroundColor: AppColors.primarySurface,
                                  child: Text(
                                    (p['nama'] as String? ?? 'P').substring(0, 1).toUpperCase(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                                title: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        p['nama'] ?? '-',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (isOffline)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.shade50,
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: Colors.amber),
                                        ),
                                        child: const Text('Offline', style: TextStyle(fontSize: 9, color: Colors.amber)),
                                      ),
                                  ],
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 2),
                                    Text('NIK: ${p['nik'] ?? '-'}', style: const TextStyle(fontSize: 12)),
                                    Text(
                                      'Poktan: ${poktan?['nama'] ?? '-'} • ${p['desa'] ?? '-'}',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '${p['totalLuasLahan'] ?? 0} Ha',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primaryDark,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const Text('Luas Lahan', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                  ],
                                ),
                                onTap: () => _showPetaniDetail(p),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
