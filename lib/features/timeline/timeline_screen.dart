import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../models/timeline_event.dart';
import '../../services/timeline_repository.dart';

class TimelineScreen extends ConsumerStatefulWidget {
  const TimelineScreen({super.key});

  @override
  ConsumerState<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends ConsumerState<TimelineScreen> {
  TimelineEventType? _filter;

  @override
  Widget build(BuildContext context) {
    final events = ref.watch(timelineRepositoryProvider);
    final filtered = _filter == null
        ? events
        : events.where((e) => e.type == _filter).toList();

    final grouped = <String, List<TimelineEvent>>{};
    for (final e in filtered) {
      final key = _groupLabel(e.date);
      grouped.putIfAbsent(key, () => []).add(e);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Timeline')),
      body: SafeArea(
        child: Column(
          children: [
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _FilterChip(
                    label: 'Tutti',
                    active: _filter == null,
                    onTap: () => setState(() => _filter = null),
                  ),
                  for (final t in TimelineEventType.values)
                    _FilterChip(
                      label: t.labelIt,
                      active: _filter == t,
                      onTap: () => setState(() => _filter = t),
                    ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                children: [
                  for (final entry in grouped.entries) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(entry.key,
                          style: const TextStyle(
                              color: AppColors.muted,
                              fontWeight: FontWeight.w600)),
                    ),
                    ...entry.value.map((e) => _EventCard(event: e)),
                  ],
                  if (filtered.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(
                        child: Text('Nessun evento',
                            style: TextStyle(color: AppColors.muted)),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _groupLabel(DateTime d) {
    final today = DateTime.now();
    final isToday =
        d.year == today.year && d.month == today.month && d.day == today.day;
    final yesterday = today.subtract(const Duration(days: 1));
    final isYesterday = d.year == yesterday.year &&
        d.month == yesterday.month &&
        d.day == yesterday.day;
    if (isToday) return 'Oggi';
    if (isYesterday) return 'Ieri';
    return DateFormat('d MMMM', 'it').format(d);
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: active ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            border: Border.all(color: AppColors.border),
          ),
          child: Text(label,
              style: TextStyle(
                  color: active ? Colors.white : AppColors.ink,
                  fontWeight: FontWeight.w500)),
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final TimelineEvent event;
  const _EventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Text(event.type.emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.title,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                if (event.description != null)
                  Text(event.description!,
                      style: const TextStyle(
                          color: AppColors.muted, fontSize: 12)),
              ],
            ),
          ),
          Text(DateFormat('HH:mm').format(event.date),
              style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        ],
      ),
    );
  }
}
