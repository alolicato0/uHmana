import 'profile_kind.dart';

class HealthProfile {
  final String id;
  final String name;
  final ProfileKind kind;
  final DateTime? birthDate;
  final String? bloodGroup;     // umani
  final String? species;        // animali (cane/gatto/...)
  final String? breed;          // animali
  final double? weightKg;
  final List<String> allergies;
  final List<String> conditions;
  final List<String> currentTherapies;
  final String? avatarUrl;

  const HealthProfile({
    required this.id,
    required this.name,
    required this.kind,
    this.birthDate,
    this.bloodGroup,
    this.species,
    this.breed,
    this.weightKg,
    this.allergies = const [],
    this.conditions = const [],
    this.currentTherapies = const [],
    this.avatarUrl,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'kind': kind.name,
        'birthDate': birthDate?.toIso8601String(),
        'bloodGroup': bloodGroup,
        'species': species,
        'breed': breed,
        'weightKg': weightKg,
        'allergies': allergies,
        'conditions': conditions,
        'currentTherapies': currentTherapies,
        'avatarUrl': avatarUrl,
      };

  factory HealthProfile.fromJson(Map<String, dynamic> j) => HealthProfile(
        id: j['id'] as String,
        name: j['name'] as String,
        kind: ProfileKind.values.firstWhere((k) => k.name == j['kind']),
        birthDate: j['birthDate'] != null
            ? DateTime.parse(j['birthDate'] as String)
            : null,
        bloodGroup: j['bloodGroup'] as String?,
        species: j['species'] as String?,
        breed: j['breed'] as String?,
        weightKg: (j['weightKg'] as num?)?.toDouble(),
        allergies: List<String>.from(j['allergies'] ?? const []),
        conditions: List<String>.from(j['conditions'] ?? const []),
        currentTherapies: List<String>.from(j['currentTherapies'] ?? const []),
        avatarUrl: j['avatarUrl'] as String?,
      );
}
