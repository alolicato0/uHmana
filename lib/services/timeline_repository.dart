import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/timeline_event.dart';

class TimelineRepository extends StateNotifier<List<TimelineEvent>> {
  TimelineRepository() : super(_seed());

  static const _uuid = Uuid();

  static List<TimelineEvent> _seed() {
    final now = DateTime.now();
    return [
      TimelineEvent(
        id: _uuid.v4(),
        profileId: 'self',
        type: TimelineEventType.symptom,
        title: 'Eruzione cutanea',
        description: 'Comparsa sulla gamba destra, prurito lieve.',
        date: now.subtract(const Duration(hours: 4)),
      ),
      TimelineEvent(
        id: _uuid.v4(),
        profileId: 'self',
        type: TimelineEventType.medication,
        title: 'Ibuprofene 400mg',
        description: 'Assunto al bisogno.',
        date: now.subtract(const Duration(days: 1)),
      ),
      TimelineEvent(
        id: _uuid.v4(),
        profileId: 'self',
        type: TimelineEventType.symptom,
        title: 'Mal di testa',
        date: now.subtract(const Duration(days: 3)),
      ),
      TimelineEvent(
        id: _uuid.v4(),
        profileId: 'self',
        type: TimelineEventType.visit,
        title: 'Visita di controllo',
        description: 'Dott. Rossi',
        date: now.subtract(const Duration(days: 19)),
      ),
    ];
  }

  void add(TimelineEvent e) =>
      state = [e, ...state]..sort((a, b) => b.date.compareTo(a.date));

  void remove(String id) =>
      state = state.where((e) => e.id != id).toList(growable: false);

  /// Riassunto testuale degli ultimi N eventi per dare contesto all'AI.
  String contextSummary({int max = 10}) {
    final items = state.take(max);
    if (items.isEmpty) return 'Nessun evento clinico registrato.';
    final buffer = StringBuffer('Ultimi eventi salute dell\'utente:\n');
    for (final e in items) {
      buffer.writeln(
          '- ${e.date.toIso8601String().substring(0, 10)} · ${e.type.labelIt}: ${e.title}'
          '${e.description == null ? '' : ' — ${e.description}'}');
    }
    return buffer.toString();
  }
}

final timelineRepositoryProvider =
    StateNotifierProvider<TimelineRepository, List<TimelineEvent>>(
        (ref) => TimelineRepository());
