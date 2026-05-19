import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final docs = [
      ('Esame del sangue.pdf', Icons.description_outlined),
      ('Radiografia torace.png', Icons.medical_services_outlined),
      ('Referto veterinario Luna.pdf', Icons.pets_outlined),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Referti e documenti')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () {},
        icon: const Icon(Icons.upload_file),
        label: const Text('Carica'),
      ),
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          itemBuilder: (ctx, i) {
            final (name, icon) = docs[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadii.md),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                leading: Icon(icon, color: AppColors.primary),
                title: Text(name),
                trailing: const Icon(Icons.more_vert),
                onTap: () {},
              ),
            );
          },
        ),
      ),
    );
  }
}
