import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../database/app_database.dart';
import '../network/api_client.dart';

class SyncResult {
  final bool success;
  final int uploadedSurveys;
  final int downloadedPetani;
  final String? errorMessage;

  SyncResult({
    required this.success,
    this.uploadedSurveys = 0,
    this.downloadedPetani = 0,
    this.errorMessage,
  });
}

class SyncService {
  static final SyncService instance = SyncService._();
  SyncService._();

  final _db = AppDatabase.instance;
  final _api = ApiClient.instance;

  Future<int> getPendingSurveyCount() async {
    final db = await _db.database;
    final res = await db.rawQuery(
      "SELECT COUNT(*) as count FROM offline_surveys WHERE sync_status = 'PENDING'",
    );
    return (res.first['count'] as int?) ?? 0;
  }

  Future<int> getCachedPetaniCount() async {
    final db = await _db.database;
    final res = await db.rawQuery('SELECT COUNT(*) as count FROM cached_petani');
    return (res.first['count'] as int?) ?? 0;
  }

  Future<SyncResult> syncAll() async {
    int uploaded = 0;
    int downloaded = 0;

    try {
      final db = await _db.database;

      // 1. Upload pending surveys to /api/lahan
      final pendingList = await db.query(
        'offline_surveys',
        where: "sync_status = 'PENDING'",
      );

      for (final row in pendingList) {
        try {
          final coordsList = jsonDecode(row['coordinates_json'] as String);
          final payload = {
            'namaLahan': row['nama_lahan'],
            'petaniId': row['petani_id'],
            'komoditas': row['komoditas'],
            'coordinates': coordsList,
            'luasHa': row['luas_ha'],
            'luasM2': row['luas_m2'],
            'statusKepemilikan': row['status_kepemilikan'] ?? 'Milik Sendiri',
            'statusIrigasi': row['status_irigasi'] ?? 'Irigasi Teknis',
            'nomorPipil': row['nomor_pipil'],
            'batasUtara': row['batas_utara'],
            'batasSelatan': row['batas_selatan'],
            'batasTimur': row['batas_timur'],
            'batasBarat': row['batas_barat'],
            'clientSubmissionId': row['client_submission_id'],
          };

          final response = await _api.post('/lahan', data: payload);
          if (response.statusCode == 200 || response.statusCode == 201) {
            await db.update(
              'offline_surveys',
              {'sync_status': 'SYNCED', 'sync_error': null},
              where: 'id = ?',
              whereArgs: [row['id']],
            );
            uploaded++;
          }
        } catch (e) {
          debugPrint('Error uploading survey ${row['id']}: $e');
        }
      }

      // 2. Download latest Petani from /api/petani into cached_petani
      final petaniRes = await _api.get('/petani');
      if (petaniRes.statusCode == 200) {
        final dynamic raw = petaniRes.data;
        List<dynamic> items = [];
        if (raw is List) {
          items = raw;
        } else if (raw is Map && raw['data'] is List) {
          items = raw['data'];
        }

        final batch = db.batch();
        batch.delete('cached_petani');

        for (final p in items) {
          final poktan = p['poktan'] as Map<String, dynamic>?;
          batch.insert('cached_petani', {
            'id': p['id']?.toString() ?? '',
            'nik': p['nik']?.toString() ?? '',
            'nama': p['nama']?.toString() ?? '',
            'desa': p['desa']?.toString() ?? '',
            'poktan_id': p['poktanId']?.toString() ?? '',
            'poktan_nama': poktan?['nama']?.toString() ?? 'Poktan Mandiri',
            'luas_lahan': (p['totalLuasLahan'] as num?)?.toDouble() ?? 0.0,
          });
          downloaded++;
        }
        await batch.commit(noResult: true);
      }

      return SyncResult(
        success: true,
        uploadedSurveys: uploaded,
        downloadedPetani: downloaded,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        uploadedSurveys: uploaded,
        downloadedPetani: downloaded,
        errorMessage: e.toString(),
      );
    }
  }
}
