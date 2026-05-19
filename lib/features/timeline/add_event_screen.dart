import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../core/theme/app_theme.dart';
import '../../models/timeline_event.dart';
import '../../services/timeline_repository.dart';

class AddEventScreen extends ConsumerWidget {
  const AddEventScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Aggiungi evento')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('Che tipo di evento vuoi aggiungere?',
                  style: TextStyle(color: AppColors.muted)),
            ),
            for (final t in TimelineEventType.values)
              _TypeRow(
                type: t,
                onTap: () => _addQuick(context, ref, t),
              ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => context.pop(),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text('Annulla'),
            ),
          ],
        ),
      ),
    );
  }

  void _addQuick(BuildContext context, WidgetRef ref, TimelineEventType type) {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 16, right: 16, top: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Nuovo ${type.labelIt}',
                style: Theme.of(ctx).textTheme.titleLarge),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Descrizione breve'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                if (ctrl.text.trim().isEmpty) return;
                ref.read(timelineRepositoryProvider.notifier).add(
                      TimelineEvent(
                        id: const Uuid().v4(),
                        profileId: 'self',
                        type: type,
                        title: ctrl.text.trim(),
                        date: DateTime.now(),
                      ),
                    );
                Navigator.of(ctx).pop();
                context.pop();
              },
              child: const Text('Aggiungi'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _TypeRow extends StatelessWidget {
  final TimelineEventType type;
  final VoidCallback onTap;
  const _TypeRow({required this.type, required this.onTap});

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
        leading: Text(type.emoji, style: const TextStyle(fontSize: 24)),
        title: Text(type.labelIt,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
        onTap: onTap,
      ),
    );
  }
}
