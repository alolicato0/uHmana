enum TimelineEventType {
  symptom,
  medication,
  visit,
  exam,
  vaccine,
  note,
  photo;

  String get labelIt => switch (this) {
        TimelineEventType.symptom => 'Sintomo',
        TimelineEventType.medication => 'Farmaco / Terapia',
        TimelineEventType.visit => 'Visita',
        TimelineEventType.exam => 'Esame / Referto',
        TimelineEventType.vaccine => 'Vaccinazione',
        TimelineEventType.note => 'Nota',
        TimelineEventType.photo => 'Foto',
      };

  String get emoji => switch (this) {
        TimelineEventType.symptom => '🤒',
        TimelineEventType.medication => '💊',
        TimelineEventType.visit => '🩺',
        TimelineEventType.exam => '📄',
        TimelineEventType.vaccine => '💉',
        TimelineEventType.note => '📝',
        TimelineEventType.photo => '📷',
      };
}

class TimelineEvent {
  final String id;
  final String profileId;
  final TimelineEventType type;
  final String title;
  final String? description;
  final DateTime date;
  final List<String> mediaUrls;
  final Map<String, dynamic>? extra;

  const TimelineEvent({
    required this.id,
    required this.profileId,
    required this.type,
    required this.title,
    required this.date,
    this.description,
    this.mediaUrls = const [],
    this.extra,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'profileId': profileId,
        'type': type.name,
        'title': title,
        'description': description,
        'date': date.toIso8601String(),
        'mediaUrls': mediaUrls,
        'extra': extra,
      };

  factory TimelineEvent.fromJson(Map<String, dynamic> j) => TimelineEvent(
        id: j['id'] as String,
        profileId: j['profileId'] as String,
        type: TimelineEventType.values
            .firstWhere((t) => t.name == j['type']),
        title: j['title'] as String,
        description: j['description'] as String?,
        date: DateTime.parse(j['date'] as String),
        mediaUrls: List<String>.from(j['mediaUrls'] ?? const []),
        extra: j['extra'] as Map<String, dynamic>?,
      );
}
