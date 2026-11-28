import 'package:flutter/material.dart';

/// Skema Warna Resmi Pertanian BPP Lembeyan
/// Mengikuti aturan anti-purple (Emerald, Forest Green, Earthy Amber, Clean Slate)
class AppColors {
  // Primary Greens
  static const Color primary = Color(0xFF059669);       // Emerald 600
  static const Color primaryDark = Color(0xFF047857);   // Emerald 700
  static const Color primaryLight = Color(0xFF10B981);  // Emerald 500
  static const Color primarySurface = Color(0xFFECFDF5);// Emerald 50
  static const Color primaryBorder = Color(0xFFA7F3D0); // Emerald 200

  // Secondary Accents
  static const Color accentAmber = Color(0xFFD97706);    // Amber 600 (Padi Siap Panen / Peringatan)
  static const Color accentAmberBg = Color(0xFFFFFBEB);  // Amber 50
  static const Color accentYellow = Color(0xFFFBBF24);   // Amber / Yellow accent
  static const Color accentRed = Color(0xFFEF4444);      // Red accent
  static const Color accentBlue = Color(0xFF0284C7);     // Sky 600 (Irigasi Teknis)

  // Status Colors
  static const Color success = Color(0xFF16A34A);        // Green 600
  static const Color warning = Color(0xFFEAB308);        // Yellow 500
  static const Color danger = Color(0xFFE11D48);         // Rose 600
  static const Color dangerSurface = Color(0xFFFFF1F2);  // Rose 50

  // Neutral Colors (Slate)
  static const Color background = Color(0xFFF8FAFC);     // Slate 50
  static const Color surface = Color(0xFFFFFFFF);        // White
  static const Color textMain = Color(0xFF0F172A);       // Slate 900
  static const Color textMuted = Color(0xFF64748B);      // Slate 500
  static const Color border = Color(0xFFE2E8F0);         // Slate 200
  static const Color divider = Color(0xFFF1F5F9);        // Slate 100

  // Komoditas Colors
  static const Color komoditasPadi = Color(0xFF16A34A);
  static const Color komoditasJagung = Color(0xFFD97706);
  static const Color komoditasKedelai = Color(0xFFCA8A04);
  static const Color komoditasTebu = Color(0xFF0D9488);
}
