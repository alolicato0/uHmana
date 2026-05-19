enum ProfileKind {
  human,
  pet;

  String get labelIt => switch (this) {
        ProfileKind.human => 'Umano',
        ProfileKind.pet => 'Animale',
      };

  String get emoji => switch (this) {
        ProfileKind.human => '👤',
        ProfileKind.pet => '🐾',
      };
}
