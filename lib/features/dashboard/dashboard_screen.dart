import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../models/profile_kind.dart';
import '../../services/profile_repository.dart';
import '../../services/timeline_repository.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kind = ref.watch(activeProfileKindProvider);
    final profile = ref.watch(activeProfileProvider);
    final events = ref.watch(timelineRepositoryProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ciao, ${profile?.name.split(' ').first ?? ''} 👋',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Prenditi cura della tua salute\ne di chi ami.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.notifications_outlined),
                  onPressed: () => context.push('/reminders'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _KindToggle(
              kind: kind,
              onChanged: (k) =>
                  ref.read(activeProfileKindProvider.notifier).state = k,
            ),
            const SizedBox(height: 20),
            _OverviewCard(),
            const SizedBox(height: 20),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                _FeatureTile(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Chat AI',
                  subtitle: 'Fai una domanda',
                  color: AppColors.primary,
                  onTap: () => context.go('/chat'),
                ),
                _FeatureTile(
                  icon: Icons.folder_open_outlined,
                  title: 'I miei dati',
                  subtitle: 'Cartella clinica',
                  color: AppColors.secondary,
                  onTap: () => context.push('/medical-record'),
                ),
                _FeatureTile(
                  icon: Icons.timeline_rounded,
                  title: 'Timeline',
                  subtitle: 'Storico eventi',
                  color: AppColors.accent,
                  onTap: () => context.go('/timeline'),
                ),
                _FeatureTile(
                  icon: Icons.medication_outlined,
                  title: 'Promemoria',
                  subtitle: 'Farmaci e visite',
                  color: AppColors.warning,
                  onTap: () => context.push('/reminders'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _EmergencyCta(onTap: () => context.push('/emergency')),
            const SizedBox(height: 24),
            Text('Prossimi promemoria',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._upcomingReminders(events).map((e) => _ReminderRow(
                  title: e.$1,
                  time: e.$2,
                )),
          ],
        ),
      ),
    );
  }

  List<(String, String)> _upcomingReminders(events) {
    final f = DateFormat('d MMM, HH:mm', 'it');
    return [
      ('Ibuprofene', 'Oggi, 14:00'),
      ('Visita di controllo', f.format(DateTime.now().add(const Duration(days: 7)))),
    ];
  }
}

class _KindToggle extends StatelessWidget {
  final ProfileKind kind;
  final ValueChanged<ProfileKind> onChanged;
  const _KindToggle({required this.kind, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget btn(ProfileKind k, String label) {
      final active = kind == k;
      return Expanded(
        child: InkWell(
          onTap: () => onChanged(k),
          borderRadius: BorderRadius.circular(AppRadii.pill),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: active ? AppColors.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadii.pill),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : AppColors.ink,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          btn(ProfileKind.human, 'Umano'),
          btn(ProfileKind.pet, 'Animale'),
        ],
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.secondary],
        ),
        borderRadius: BorderRadius.circular(AppRadii.lg),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.favorite, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Text('Panoramica salute',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ],
          ),
          SizedBox(height: 12),
          Text('Tutto sembra in ordine',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
          SizedBox(height: 4),
          Text('Ultimo aggiornamento: oggi, 08:30',
              style: TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _FeatureTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadii.lg),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(subtitle,
                    style: const TextStyle(
                        color: AppColors.muted, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmergencyCta extends StatelessWidget {
  final VoidCallback onTap;
  const _EmergencyCta({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(AppRadii.lg),
          border: Border.all(color: const Color(0xFFFCA5A5)),
        ),
        child: Row(
          children: [
            const Icon(Icons.emergency_outlined, color: AppColors.danger),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('È urgente?',
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.danger)),
                  Text('Avvia una valutazione rapida AI',
                      style: TextStyle(color: AppColors.muted, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.danger),
          ],
        ),
      ),
    );
  }
}

class _ReminderRow extends StatelessWidget {
  final String title;
  final String time;
  const _ReminderRow({required this.title, required this.time});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.access_time, size: 18, color: AppColors.muted),
          const SizedBox(width: 10),
          Expanded(
              child: Text(title,
                  style: const TextStyle(fontWeight: FontWeight.w500))),
          Text(time, style: const TextStyle(color: AppColors.muted)),
        ],
      ),
    );
  }
}
