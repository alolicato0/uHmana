import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Notifiche', 'Gestisci le notifiche', Icons.notifications_outlined),
      ('Privacy', 'Impostazioni privacy', Icons.lock_outline),
      ('Lingua', 'Italiano', Icons.language),
      ('Unità di misura', 'Metriche', Icons.straighten),
      ('Tema', 'Chiaro', Icons.dark_mode_outlined),
      ('Assistenza', 'Contattaci', Icons.help_outline),
      ('Informazioni', 'Versione 1.0.0', Icons.info_outline),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Impostazioni')),
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          itemBuilder: (ctx, i) {
            final (title, subtitle, icon) = items[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadii.md),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                leading: Icon(icon, color: AppColors.primary),
                title: Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(subtitle,
                    style: const TextStyle(
                        color: AppColors.muted, fontSize: 12)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
            );
          },
        ),
      ),
    );
  }
}
