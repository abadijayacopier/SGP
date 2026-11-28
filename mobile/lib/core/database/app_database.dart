import 'dart:async';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Database SQLite Lokal untuk Penyimpanan Offline di Sawah
class AppDatabase {
  static final AppDatabase instance = AppDatabase._init();
  static Database? _database;

  AppDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('pertanian_lembeyan.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // Tabel 1: Antrean Survei Lapangan Offline (Petak Sawah & Batas Sempadan)
    await db.execute('''
      CREATE TABLE offline_surveys (
        id TEXT PRIMARY KEY,
        nama_lahan TEXT NOT NULL,
        petani_id TEXT NOT NULL,
        petani_nama TEXT NOT NULL,
        poktan_nama TEXT,
        komoditas TEXT NOT NULL,
        coordinates_json TEXT NOT NULL,
        luas_ha REAL NOT NULL,
        luas_m2 REAL NOT NULL,
        nomor_pipil TEXT,
        status_kepemilikan TEXT,
        status_irigasi TEXT,
        batas_utara TEXT,
        batas_selatan TEXT,
        batas_timur TEXT,
        batas_barat TEXT,
        client_submission_id TEXT,
        foto_lahan_path TEXT,
        sync_status TEXT DEFAULT 'PENDING',
        sync_error TEXT,
        recorded_at TEXT NOT NULL
      )
    ''');

    // Tabel 2: Cache Petani & Poktan agar bisa dipilih saat offline di sawah
    await db.execute('''
      CREATE TABLE cached_petani (
        id TEXT PRIMARY KEY,
        nik TEXT NOT NULL,
        nama TEXT NOT NULL,
        desa TEXT NOT NULL,
        poktan_id TEXT NOT NULL,
        poktan_nama TEXT NOT NULL,
        luas_lahan REAL DEFAULT 0.0
      )
    ''');
  }

  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
    }
  }
}
