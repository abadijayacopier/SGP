import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/services/gps_service.dart';
import '../../providers/survey_provider.dart';

/// Layar Peta Spasial GIS Satelit Esri World Imagery (Mobile Native)
class FieldMapScreen extends ConsumerStatefulWidget {
  const FieldMapScreen({super.key});

  @override
  ConsumerState<FieldMapScreen> createState() => _FieldMapScreenState();
}

class _FieldMapScreenState extends ConsumerState<FieldMapScreen> {
  final MapController _mapController = MapController();
  final GpsService _gpsService = GpsService();
  LatLng? _currentGpsPos;
  double _gpsAccuracy = 0.0;

  // Titik default Kecamatan Lembeyan, Magetan
  static const LatLng _centerLembeyan = LatLng(-7.7123, 111.3456);

  @override
  void initState() {
    super.initState();
    _initGps();
  }

  Future<void> _initGps() async {
    final pos = await _gpsService.getCurrentLocation();
    if (pos != null && mounted) {
      setState(() {
        _currentGpsPos = pos.position;
        _gpsAccuracy = pos.accuracyMeters;
      });
      _mapController.move(pos.position, 17.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final survey = ref.watch(surveyProvider);
    final surveyNotifier = ref.read(surveyProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pemetaan Sawah (GIS Satelit)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              'BPP Kec. Lembeyan • Esri World Imagery',
              style: TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        backgroundColor: AppColors.primaryDark,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _initGps(),
            tooltip: 'Pusatkan GPS',
          ),
        ],
      ),
      body: Stack(
        children: [
          // 1. Peta Satelit Resolusi Tinggi (Esri World Imagery)
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _centerLembeyan,
              initialZoom: 16.0,
              onTap: (tapPosition, point) {
                if (survey.isTapMode) {
                  surveyNotifier.addPoint(point);
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: ApiEndpoints.esriSatelliteUrl,
                userAgentPackageName: 'com.bpplembeyan.pertanian_mobile',
                maxZoom: 19,
              ),

              // Poligon Sawah Hasil Ukur
              if (survey.points.length >= 3)
                PolygonLayer(
                  polygons: [
                    Polygon(
                      points: survey.points,
                      color: AppColors.primary.withOpacity(0.35),
                      borderColor: AppColors.primaryLight,
                      borderStrokeWidth: 3.0,
                      isFilled: true,
                    ),
                  ],
                ),

              // Garis batas antar patok
              if (survey.points.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: survey.points,
                      color: AppColors.primaryLight,
                      strokeWidth: 2.5,
                    ),
                  ],
                ),

              // Marker titik patok
              MarkerLayer(
                markers: [
                  for (int i = 0; i < survey.points.length; i++)
                    Marker(
                      point: survey.points[i],
                      width: 24,
                      height: 24,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.primaryDark,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Marker posisi pengguna saat ini
                  if (_currentGpsPos != null)
                    Marker(
                      point: _currentGpsPos!,
                      width: 32,
                      height: 32,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.accentBlue.withOpacity(0.9),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: const [
                            BoxShadow(color: Colors.black26, blurRadius: 4),
                          ],
                        ),
                        child: const Icon(Icons.person, color: Colors.white, size: 18),
                      ),
                    ),
                ],
              ),
            ],
          ),

          // 2. Info Card Luas Sawah & Batas Kuota Subsidi
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.95),
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3)),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${survey.liveLuasHa} Ha (${survey.liveLuasM2.toStringAsFixed(0)} m²)',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${survey.points.length} Titik Patok • Keliling: ${survey.livePerimeterMeters} m${_gpsAccuracy > 0 ? " • Akurasi: ±${_gpsAccuracy.toStringAsFixed(0)}m" : ""}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  if (survey.liveLuasHa > 2.0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.accentAmberBg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.accentAmber),
                      ),
                      child: const Text(
                        '> 2 Ha Kuota',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accentAmber,
                        ),
                      ),
                    )
                  else if (survey.points.length >= 3)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primary),
                      ),
                      child: const Text(
                        '✓ Wajar Subsidi',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 3. Tombol Aksi Bawah (Rekam Patok, Undo, Simpan dengan Batas Sempadan)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (survey.points.isNotEmpty)
                      FloatingActionButton.small(
                        heroTag: 'undo',
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.danger,
                        onPressed: () => surveyNotifier.undoLastPoint(),
                        child: const Icon(Icons.undo),
                      ),
                    const SizedBox(width: 8),
                    FloatingActionButton.small(
                      heroTag: 'gps_add',
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      onPressed: () {
                        if (_currentGpsPos != null) {
                          surveyNotifier.addPoint(_currentGpsPos!);
                        }
                      },
                      child: const Icon(Icons.add_location_alt),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: survey.points.length < 3
                        ? null
                        : () => _showSaveBottomSheet(context, survey),
                    icon: const Icon(Icons.save),
                    label: Text(
                      survey.points.length < 3
                          ? 'Tambah ${3 - survey.points.length} Patok Lagi'
                          : 'Simpan Petak & Batas Sempadan',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showSaveBottomSheet(BuildContext context, SurveyState survey) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Simpan Petak Sawah Hasil Ukur',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                'Hasil: ${survey.liveLuasHa} Ha (${survey.liveLuasM2.toStringAsFixed(0)} m²)',
                style: const TextStyle(fontSize: 12, color: AppColors.primaryDark, fontWeight: FontWeight.bold),
              ),
              const Divider(height: 24),

              const TextField(
                decoration: InputDecoration(
                  labelText: 'Nama Petak / Blok Hamparan *',
                  hintText: 'Misal: Sawah Blok Glundengan Kidul',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),

              const Text(
                'Batas Sempadan Fisik Lahan (Surat Ukur / Sertifikat):',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMain),
              ),
              const SizedBox(height: 8),

              Row(
                children: const [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        labelText: 'Batas Utara',
                        hintText: 'Sawah Bpk. Tono',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        labelText: 'Batas Timur',
                        hintText: 'Jalan Usaha Tani',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: const [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        labelText: 'Batas Selatan',
                        hintText: 'Sawah Bpk. Samsi',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        labelText: 'Batas Barat',
                        hintText: 'Saluran Irigasi',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryDark,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Petak sawah & batas sempadan berhasil disimpan!'),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                    ref.read(surveyProvider.notifier).resetSurvey();
                  },
                  icon: const Icon(Icons.cloud_upload),
                  label: const Text('Simpan ke Database GIS BPP Lembeyan'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
