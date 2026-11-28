import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';

class ServerConfigService {
  static const String _keyServerUrl = 'custom_server_base_url';
  static ServerConfigService? _instance;
  static ServerConfigService get instance => _instance ??= ServerConfigService._();

  ServerConfigService._();

  String _currentBaseUrl = ApiEndpoints.baseUrl;
  String get baseUrl => _currentBaseUrl;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_keyServerUrl);
    if (saved != null && saved.trim().isNotEmpty) {
      _currentBaseUrl = saved.trim();
    }
  }

  Future<void> setBaseUrl(String newUrl) async {
    String cleanUrl = newUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = '$cleanUrl/api';
    }
    _currentBaseUrl = cleanUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyServerUrl, _currentBaseUrl);
  }

  Future<bool> testConnection(String urlToTest) async {
    String testUrl = urlToTest.trim();
    if (testUrl.endsWith('/')) {
      testUrl = testUrl.substring(0, testUrl.length - 1);
    }
    if (!testUrl.endsWith('/api')) {
      testUrl = '$testUrl/api';
    }

    final testDio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      ),
    );

    try {
      // Coba akses endpoint health atau petani limit=1
      final res = await testDio.get('$testUrl/health');
      return res.statusCode == 200;
    } catch (_) {
      try {
        final res2 = await testDio.get('$testUrl/petani');
        return res2.statusCode == 200 || res2.statusCode == 304;
      } catch (_) {
        return false;
      }
    }
  }
}
