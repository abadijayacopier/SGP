import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class GpsPositionInfo {
  final LatLng position;
  final double accuracyMeters;
  final double speed;
  final double heading;

  const GpsPositionInfo({
    required this.position,
    required this.accuracyMeters,
    required this.speed,
    required this.heading,
  });
}

/// Service Pelacak GPS Satelit Smartphone Presisi Tinggi
class GpsService {
  static final GpsService _instance = GpsService._internal();
  factory GpsService() => _instance;
  GpsService._internal();

  StreamSubscription<Position>? _positionSubscription;

  /// Periksa dan minta izin GPS Android
  Future<bool> checkAndRequestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Ambil lokasi instan saat ini
  Future<GpsPositionInfo?> getCurrentLocation() async {
    final hasPerm = await checkAndRequestPermission();
    if (!hasPerm) return null;

    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.bestForNavigation,
        timeLimit: const Duration(seconds: 10),
      );

      return GpsPositionInfo(
        position: LatLng(pos.latitude, pos.longitude),
        accuracyMeters: pos.accuracy,
        speed: pos.speed,
        heading: pos.heading,
      );
    } catch (_) {
      return null;
    }
  }

  /// Stream posisi bergerak (Continuous GPS High-Accuracy Watcher)
  Stream<GpsPositionInfo> startLocationStream({int distanceFilter = 1}) {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 1, // trigger setiap gerak 1 meter
    );

    return Geolocator.getPositionStream(locationSettings: locationSettings).map(
      (pos) => GpsPositionInfo(
        position: LatLng(pos.latitude, pos.longitude),
        accuracyMeters: pos.accuracy,
        speed: pos.speed,
        heading: pos.heading,
      ),
    );
  }

  void stopLocationStream() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
  }
}
