import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/utils/gis_calculator.dart';

class SurveyState {
  final List<LatLng> points;
  final bool isWalkTracking;
  final bool isTapMode;
  final double liveLuasM2;
  final double liveLuasHa;
  final double livePerimeterMeters;
  final bool isSaving;
  final String? errorMessage;

  const SurveyState({
    this.points = const [],
    this.isWalkTracking = false,
    this.isTapMode = true,
    this.liveLuasM2 = 0.0,
    this.liveLuasHa = 0.0,
    this.livePerimeterMeters = 0.0,
    this.isSaving = false,
    this.errorMessage,
  });

  SurveyState copyWith({
    List<LatLng>? points,
    bool? isWalkTracking,
    bool? isTapMode,
    double? liveLuasM2,
    double? liveLuasHa,
    double? livePerimeterMeters,
    bool? isSaving,
    String? errorMessage,
  }) {
    return SurveyState(
      points: points ?? this.points,
      isWalkTracking: isWalkTracking ?? this.isWalkTracking,
      isTapMode: isTapMode ?? this.isTapMode,
      liveLuasM2: liveLuasM2 ?? this.liveLuasM2,
      liveLuasHa: liveLuasHa ?? this.liveLuasHa,
      livePerimeterMeters: livePerimeterMeters ?? this.livePerimeterMeters,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: errorMessage,
    );
  }
}

class SurveyNotifier extends StateNotifier<SurveyState> {
  SurveyNotifier() : super(const SurveyState());

  void addPoint(LatLng point) {
    final updatedPoints = [...state.points, point];
    _recalculate(updatedPoints);
  }

  void undoLastPoint() {
    if (state.points.isEmpty) return;
    final updatedPoints = List<LatLng>.from(state.points)..removeLast();
    _recalculate(updatedPoints);
  }

  void resetSurvey() {
    state = const SurveyState();
  }

  void toggleWalkTracking() {
    state = state.copyWith(
      isWalkTracking: !state.isWalkTracking,
      isTapMode: false,
    );
  }

  void toggleTapMode() {
    state = state.copyWith(
      isTapMode: !state.isTapMode,
      isWalkTracking: false,
    );
  }

  void setSaving(bool saving) {
    state = state.copyWith(isSaving: saving);
  }

  void _recalculate(List<LatLng> newPoints) {
    final area = GisCalculator.calculatePolygonArea(newPoints);
    final perimeter = GisCalculator.calculatePerimeter(newPoints);

    state = state.copyWith(
      points: newPoints,
      liveLuasM2: area.luasM2,
      liveLuasHa: area.luasHa,
      livePerimeterMeters: perimeter,
    );
  }
}

final surveyProvider = StateNotifierProvider<SurveyNotifier, SurveyState>((ref) {
  return SurveyNotifier();
});
