import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/logo.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (!mounted) return;
      context.go('/welcome');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            UHmanaLogo(size: 96),
            SizedBox(height: 24),
            Text(
              'La tua salute. La loro salute.\nSempre insieme.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
