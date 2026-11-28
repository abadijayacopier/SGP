import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/database/app_database.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inisialisasi Database SQLite Lokal untuk Kerja Offline di Sawah
  await AppDatabase.instance.database;

  runApp(
    const ProviderScope(
      child: PertanianApp(),
    ),
  );
}
