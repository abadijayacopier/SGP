import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/database/app_database.dart';
import 'core/services/server_config_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inisialisasi Konfigurasi Server & Database SQLite Lokal
  await ServerConfigService.instance.init();
  await AppDatabase.instance.database;

  runApp(
    const ProviderScope(
      child: PertanianApp(),
    ),
  );
}
