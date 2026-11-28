import 'dart:math' as math;
import 'package:latlong2/latlong.dart';

class GisAreaResult {
  final double luasM2;
  final double luasHa;

  const GisAreaResult({required this.luasM2, required this.luasHa});
}

/// Kalkulator Geometris Spasial Khusus Pemetaan Sawah (Shoelace Geodesic Formula)
class GisCalculator {
  static const double earthRadiusMeters = 6378137.0;

  /// Hitung luas poligon dari titik koordinat GPS LatLng
  static GisAreaResult calculatePolygonArea(List<LatLng> points) {
    if (points.length < 3) {
      return const GisAreaResult(luasM2: 0.0, luasHa: 0.0);
    }

    double total = 0.0;
    final int n = points.length;

    for (int i = 0; i < n; i++) {
      final p1 = points[i];
      final p2 = points[(i + 1) % n];

      final double lat1Rad = p1.latitude * math.pi / 180.0;
      final double lat2Rad = p2.latitude * math.pi / 180.0;
      final double lngDiffRad = (p2.longitude - p1.longitude) * math.pi / 180.0;

      total += lngDiffRad * (2.0 + math.sin(lat1Rad) + math.sin(lat2Rad));
    }

    total = total * earthRadiusMeters * earthRadiusMeters / 4.0;
    final double areaM2 = total.abs();
    final double areaHa = areaM2 / 10000.0;

    return GisAreaResult(
      luasM2: double.parse(areaM2.toStringAsFixed(2)),
      luasHa: double.parse(areaHa.toStringAsFixed(2)),
    );
  }

  /// Hitung total keliling poligon dalam satuan meter
  static double calculatePerimeter(List<LatLng> points) {
    if (points.length < 2) return 0.0;
    const distance = Distance();
    double totalMeters = 0.0;

    for (int i = 0; i < points.length; i++) {
      final p1 = points[i];
      final p2 = points[(i + 1) % points.length];
      totalMeters += distance.as(LengthUnit.Meter, p1, p2);
    }

    return double.parse(totalMeters.toStringAsFixed(1));
  }

  /// Hitung jarak antara 2 koordinat
  static double calculateDistanceMeters(LatLng p1, LatLng p2) {
    const distance = Distance();
    return distance.as(LengthUnit.Meter, p1, p2);
  }

  /// Validasi batas kuota pupuk subsidi Permentan RI (Maks 2.00 Ha per petani)
  static bool isMelebihiBatasSubsidi(double luasHa) {
    return luasHa > 2.0;
  }
}
