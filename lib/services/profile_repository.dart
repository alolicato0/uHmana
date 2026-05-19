import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/health_profile.dart';
import '../models/profile_kind.dart';

/// Repository in-memory per i profili sanitari.
/// In MVP successivo verrà sostituito con Firestore.
class ProfileRepository extends StateNotifier<List<HealthProfile>> {
  ProfileRepository() : super(_seed());

  static const _uuid = Uuid();

  static List<HealthProfile> _seed() => [
        HealthProfile(
          id: _uuid.v4(),
          name: 'Martina Rossi',
          kind: ProfileKind.human,
          bloodGroup: 'A+',
          allergies: const ['Penicillina'],
          conditions: const ['Asma lieve'],
          currentTherapies: const ['Ibuprofene 400mg al bisogno'],
        ),
        HealthProfile(
          id: _uuid.v4(),
          name: 'Luna',
          kind: ProfileKind.pet,
          species: 'Cane',
          breed: 'Golden Retriever',
          weightKg: 28.5,
        ),
      ];

  void upsert(HealthProfile p) {
    final i = state.indexWhere((e) => e.id == p.id);
    state = [
      ...state.sublist(0, i == -1 ? state.length : i),
      p,
      if (i != -1) ...state.sublist(i + 1),
    ];
  }

  void remove(String id) =>
      state = state.where((p) => p.id != id).toList(growable: false);
}

final profileRepositoryProvider =
    StateNotifierProvider<ProfileRepository, List<HealthProfile>>(
        (ref) => ProfileRepository());

/// Profilo attivo (umano vs animale o singolo individuo).
final activeProfileKindProvider = StateProvider<ProfileKind>(
  (ref) => ProfileKind.human,
);

final activeProfileProvider = Provider<HealthProfile?>((ref) {
  final kind = ref.watch(activeProfileKindProvider);
  final profiles = ref.watch(profileRepositoryProvider);
  return profiles.firstWhere(
    (p) => p.kind == kind,
    orElse: () => profiles.isEmpty
        ? throw StateError('no profiles')
        : profiles.first,
  );
});
