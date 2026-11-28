import 'package:latlong2/latlong.dart';

class LahanModel {
  final String id;
  final String kodeLahan;
  final String namaLahan;
  final String petaniId;
  final String petaniNama;
  final String? poktanNama;
  final String komoditas;
  final List<LatLng> coordinates;
  final double luasHa;
  final double luasM2;
  final String? nomorPipil;
  final String statusKepemilikan;
  final String statusIrigasi;
  final String? batasUtara;
  final String? batasSelatan;
  final String? batasTimur;
  final String? batasBarat;
  final String? fotoLahan;
  final String syncStatus;

  const LahanModel({
    required this.id,
    required this.kodeLahan,
    required this.namaLahan,
    required this.petaniId,
    required this.petaniNama,
    this.poktanNama,
    required this.komoditas,
    required this.coordinates,
    required this.luasHa,
    required this.luasM2,
    this.nomorPipil,
    this.statusKepemilikan = 'Milik Sendiri',
    this.statusIrigasi = 'Irigasi Teknis',
    this.batasUtara,
    this.batasSelatan,
    this.batasTimur,
    this.batasBarat,
    this.fotoLahan,
    this.syncStatus = 'SUCCESS',
  });

  Map<String, dynamic> toJson() {
    return {
      'namaLahan': namaLahan,
      'petaniId': petaniId,
      'petaniNama': petaniNama,
      'komoditas': komoditas,
      'kabupaten': 'Magetan',
      'coordinates': coordinates.map((c) => [c.latitude, c.longitude]).toList(),
      'statusKepemilikan': statusKepemilikan,
      'statusIrigasi': statusIrigasi,
      'nomorPipil': nomorPipil,
      'batasUtara': batasUtara,
      'batasSelatan': batasSelatan,
      'batasTimur': batasTimur,
      'batasBarat': batasBarat,
      'fotoLahan': fotoLahan,
      'forceOverride': true,
    };
  }

  factory LahanModel.fromJson(Map<String, dynamic> json) {
    List<LatLng> coords = [];
    if (json['coordinates'] != null) {
      if (json['coordinates'] is List) {
        for (var c in json['coordinates']) {
          if (c is List && c.length >= 2) {
            coords.add(LatLng(c[0].toDouble(), c[1].toDouble()));
          }
        }
      }
    }

    return LahanModel(
      id: json['id'] ?? '',
      kodeLahan: json['kodeLahan'] ?? '',
      namaLahan: json['namaLahan'] ?? '',
      petaniId: json['petaniId'] ?? '',
      petaniNama: json['petani']?['nama'] ?? json['petaniNama'] ?? '',
      poktanNama: json['petani']?['poktan']?['nama'] ?? json['poktanNama'],
      komoditas: json['komoditas'] ?? 'Padi',
      coordinates: coords,
      luasHa: (json['luasHa'] ?? 0.0).toDouble(),
      luasM2: (json['luasM2'] ?? 0.0).toDouble(),
      nomorPipil: json['nomorPipil'],
      statusKepemilikan: json['statusKepemilikan'] ?? 'Milik Sendiri',
      statusIrigasi: json['statusIrigasi'] ?? 'Irigasi Teknis',
      batasUtara: json['batasUtara'],
      batasSelatan: json['batasSelatan'],
      batasTimur: json['batasTimur'],
      batasBarat: json['batasBarat'],
      fotoLahan: json['fotoLahan'],
      syncStatus: 'SUCCESS',
    );
  }
}
