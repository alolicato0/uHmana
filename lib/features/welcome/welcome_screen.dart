import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/profile_kind.dart';
import '../../services/profile_repository.dart';

class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              Text(
                'Benvenuto in',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              RichText(
                text: TextSpan(
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: AppColors.ink,
                        fontSize: 40,
                      ),
                  children: const [
                    TextSpan(text: 'u'),
                    TextSpan(
                        text: 'H',
                        style: TextStyle(color: AppColors.primary)),
                    TextSpan(text: 'mana'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Il tuo assistente di salute\nper te e per i tuoi animali.',
                style: TextStyle(color: AppColors.muted, fontSize: 16),
              ),
              const SizedBox(height: 32),
              _ChoiceCard(
                title: 'Sono qui per me',
                subtitle: 'Area Umano',
                emoji: '👤',
                color: const Color(0xFFE0F2F1),
                onTap: () {
                  ref.read(activeProfileKindProvider.notifier).state =
                      ProfileKind.human;
                  context.go('/login');
                },
              ),
              const SizedBox(height: 16),
              _ChoiceCard(
                title: 'Sono qui per il\nmio animale',
                subtitle: 'Area Animale',
                emoji: '🐾',
                color: const Color(0xFFFDF2E9),
                onTap: () {
                  ref.read(activeProfileKindProvider.notifier).state =
                      ProfileKind.pet;
                  context.go('/login');
                },
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () => context.go('/login'),
                child: const Text('Inizia'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChoiceCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String emoji;
  final Color color;
  final VoidCallback onTap;

  const _ChoiceCard({
    required this.title,
    required this.subtitle,
    required this.emoji,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(AppRadii.lg),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: const TextStyle(color: AppColors.muted)),
                ],
              ),
            ),
            Text(emoji, style: const TextStyle(fontSize: 48)),
          ],
        ),
      ),
    );
  }
}
