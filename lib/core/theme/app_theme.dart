import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const primary = Color(0xFF0DB09E);     // teal
  static const primaryDark = Color(0xFF0A8C7D);
  static const secondary = Color(0xFF22C55E);   // emerald
  static const accent = Color(0xFF5B7CFA);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFEF4444);
  static const ink = Color(0xFF1F2937);
  static const muted = Color(0xFF6B7280);
  static const bg = Color(0xFFF5F7FA);
  static const card = Colors.white;
  static const border = Color(0xFFE5E7EB);
}

class AppRadii {
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const pill = 999.0;
}

class AppTheme {
  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);
    final textTheme = GoogleFonts.interTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.poppins(fontWeight: FontWeight.w700),
      displayMedium: GoogleFonts.poppins(fontWeight: FontWeight.w700),
      headlineLarge: GoogleFonts.poppins(fontWeight: FontWeight.w600),
      headlineMedium: GoogleFonts.poppins(fontWeight: FontWeight.w600),
      titleLarge: GoogleFonts.poppins(fontWeight: FontWeight.w600),
      titleMedium: GoogleFonts.poppins(fontWeight: FontWeight.w600),
    );

    return base.copyWith(
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.card,
        error: AppColors.danger,
      ),
      scaffoldBackgroundColor: AppColors.bg,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.bg,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.poppins(
          color: AppColors.ink,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: const IconThemeData(color: AppColors.ink),
      ),
      cardTheme: CardTheme(
        color: AppColors.card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData get dark {
    return light.copyWith(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0F1419),
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
      ),
    );
  }
}
