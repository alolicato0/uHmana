import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});

  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen> {
  String _tab = 'Farmaci';
  final _items = <_Rem>[
    _Rem('Ibuprofene 400mg', 'Oggi, 14:00', true),
    _Rem('Omeprazolo 20mg', 'Ogni giorno, 08:00', true),
    _Rem('Vitamina D', 'Ogni giorno, 21:00', false),
    _Rem('Promemoria visita', '12 Maggio, 10:30', true),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Promemoria')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () {},
        icon: const Icon(Icons.add),
        label: const Text('Nuovo promemoria'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
                child: Row(
                  children: [
                    for (final t in ['Farmaci', 'Visite', 'Altro'])
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _tab = t),
                          borderRadius:
                              BorderRadius.circular(AppRadii.pill),
                          child: Container(
                            padding:
                                const EdgeInsets.symmetric(vertical: 10),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: _tab == t
                                  ? AppColors.primary
                                  : Colors.transparent,
                              borderRadius:
                                  BorderRadius.circular(AppRadii.pill),
                            ),
                            child: Text(t,
                                style: TextStyle(
                                    color: _tab == t
                                        ? Colors.white
                                        : AppColors.ink,
                                    fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _items.length,
                itemBuilder: (ctx, i) {
                  final r = _items[i];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: SwitchListTile(
                      value: r.enabled,
                      onChanged: (v) => setState(() => _items[i].enabled = v),
                      activeColor: AppColors.primary,
                      title: Text(r.title,
                          style:
                              const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(r.when,
                          style: const TextStyle(
                              color: AppColors.muted, fontSize: 12)),
                      secondary: const Icon(Icons.medication_outlined,
                          color: AppColors.primary),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Rem {
  final String title;
  final String when;
  bool enabled;
  _Rem(this.title, this.when, this.enabled);
}
