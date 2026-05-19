import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class EmergencyScreen extends StatelessWidget {
  const EmergencyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFEF2F2),
      appBar: AppBar(backgroundColor: const Color(0xFFFEF2F2)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('È urgente?',
                  style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: AppColors.danger)),
              const SizedBox(height: 8),
              const Text(
                'Rispondi a poche domande per capire\nse è il caso di preoccuparsi.',
                style: TextStyle(color: AppColors.muted),
              ),
              const Spacer(),
              Center(
                child: GestureDetector(
                  onTap: () {
                    context.pop();
                    context.go('/chat');
                  },
                  child: Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.danger,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.danger.withValues(alpha: 0.4),
                          blurRadius: 32,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('SOS',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 40,
                                  fontWeight: FontWeight.w800)),
                          Text('Inizia valutazione',
                              style: TextStyle(color: Colors.white70)),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadii.lg),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Oppure descrivi il problema',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextField(
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText:
                            'Ad esempio: forte dolore al petto, difficoltà respiratorie, sanguinamento...',
                        hintStyle: const TextStyle(fontSize: 12),
                        fillColor: AppColors.bg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () {
                        context.pop();
                        context.go('/chat');
                      },
                      child: const Text('Scrivi ora'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      color: AppColors.danger, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Questa funzione non sostituisce il parere di un medico. In caso reale chiama il 112.',
                      style: TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
