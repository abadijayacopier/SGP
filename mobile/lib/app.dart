import 'package:flutter/material.dart';
import 'core/constants/app_colors.dart';
import 'features/dashboard/presentation/screens/gojek_style_home_screen.dart';

class PertanianApp extends StatelessWidget {
  const PertanianApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GIS Pertanian Lembeyan',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          surface: AppColors.surface,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: false,
        ),
      ),
      home: const GojekStyleHomeScreen(),
    );
  }
}
