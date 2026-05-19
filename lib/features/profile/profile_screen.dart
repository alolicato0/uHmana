import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../services/profile_repository.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(activeProfileProvider);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                ),
                borderRadius: BorderRadius.circular(AppRadii.lg),
              ),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 40,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.person, size: 40, color: AppColors.primary),
                  ),
                  const SizedBox(height: 12),
                  Text(profile?.name ?? '',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w700)),
                  const Text('martina.rossi@email.com',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star, color: Colors.amber, size: 14),
                        SizedBox(width: 4),
                        Text('Premium',
                            style: TextStyle(
                                color: Colors.white, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _ProfileRow(
              icon: Icons.pets_outlined,
              title: 'I miei animali',
              subtitle: '2 animali registrati',
              onTap: () {},
            ),
            _ProfileRow(
              icon: Icons.folder_open_outlined,
              title: 'Archivio documenti',
              subtitle: 'I tuoi documenti salvati',
              onTap: () => context.push('/reports'),
            ),
            _ProfileRow(
              icon: Icons.download_outlined,
              title: 'Esporta i miei dati',
              subtitle: 'Scarica i tuoi dati',
              onTap: () {},
            ),
            _ProfileRow(
              icon: Icons.star_border_rounded,
              title: 'Abbonamento',
              subtitle: 'uHmana Premium',
              onTap: () {},
            ),
            _ProfileRow(
              icon: Icons.settings_outlined,
              title: 'Impostazioni account',
              subtitle: 'Sicurezza e privacy',
              onTap: () => context.push('/settings'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _ProfileRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle,
            style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
        onTap: onTap,
      ),
    );
  }
}
