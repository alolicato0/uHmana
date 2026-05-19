import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/profile_kind.dart';
import '../../services/profile_repository.dart';

class MedicalRecordScreen extends ConsumerWidget {
  const MedicalRecordScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kind = ref.watch(activeProfileKindProvider);
    final profile = ref.watch(activeProfileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('I miei dati')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(AppRadii.pill),
              ),
              child: Row(
                children: [
                  _SegBtn(
                    label: 'Umano',
                    active: kind == ProfileKind.human,
                    onTap: () => ref
                        .read(activeProfileKindProvider.notifier)
                        .state = ProfileKind.human,
                  ),
                  _SegBtn(
                    label: 'Animale',
                    active: kind == ProfileKind.pet,
                    onTap: () => ref
                        .read(activeProfileKindProvider.notifier)
                        .state = ProfileKind.pet,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _RecordRow(
              icon: Icons.person_outline,
              title: 'Informazioni personali',
              subtitle: 'Modifica i tuoi dati',
            ),
            _RecordRow(
              icon: Icons.health_and_safety_outlined,
              title: 'Patologie',
              subtitle: '${profile?.conditions.length ?? 0} condizioni registrate',
            ),
            _RecordRow(
              icon: Icons.medication_outlined,
              title: 'Terapie in corso',
              subtitle: '${profile?.currentTherapies.length ?? 0} farmaci',
            ),
            _RecordRow(
              icon: Icons.warning_amber_outlined,
              title: 'Allergie',
              subtitle: '${profile?.allergies.length ?? 0} allergie registrate',
            ),
            _RecordRow(
              icon: Icons.description_outlined,
              title: 'Esami e referti',
              subtitle: '0 documenti',
            ),
            if (kind == ProfileKind.human)
              _RecordRow(
                icon: Icons.vaccines_outlined,
                title: 'Vaccinazioni',
                subtitle: 'Ultima: --',
              ),
            if (kind == ProfileKind.pet) ...[
              _RecordRow(
                icon: Icons.bug_report_outlined,
                title: 'Antiparassitari',
                subtitle: 'Ultimo: --',
              ),
              _RecordRow(
                icon: Icons.monitor_weight_outlined,
                title: 'Peso',
                subtitle: profile?.weightKg != null
                    ? '${profile!.weightKg} kg'
                    : '--',
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SegBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _SegBtn(
      {required this.label, required this.active, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(AppRadii.pill),
          ),
          child: Text(label,
              style: TextStyle(
                  color: active ? Colors.white : AppColors.ink,
                  fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class _RecordRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _RecordRow({
    required this.icon,
    required this.title,
    required this.subtitle,
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
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.12),
          child: Icon(icon, color: AppColors.primary),
        ),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle,
            style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
        onTap: () {},
      ),
    );
  }
}
