import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';

import '../../core/constants/disclaimers.dart';
import '../../core/theme/app_theme.dart';
import '../../models/chat_message.dart';
import '../../services/openrouter_service.dart';

class ImageAnalysisScreen extends ConsumerStatefulWidget {
  const ImageAnalysisScreen({super.key});

  @override
  ConsumerState<ImageAnalysisScreen> createState() =>
      _ImageAnalysisScreenState();
}

class _ImageAnalysisScreenState extends ConsumerState<ImageAnalysisScreen> {
  XFile? _file;
  String? _result;
  bool _loading = false;

  Future<void> _pick(ImageSource source) async {
    final f = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (f == null) return;
    setState(() {
      _file = f;
      _result = null;
    });
  }

  Future<void> _analyze() async {
    if (_file == null) return;
    setState(() => _loading = true);
    try {
      final reply = await ref.read(openRouterServiceProvider).chat(
        history: [
          ChatMessage(
            id: const Uuid().v4(),
            role: ChatRole.user,
            text:
                'Analizza questa immagine. Descrivi cosa osservi, elenca possibili cause come ipotesi e suggerimenti generali. Non fornire diagnosi.',
            attachments: [
              ChatAttachment(url: _file!.path, mimeType: 'image/jpeg'),
            ],
            createdAt: DateTime.now(),
          ),
        ],
      );
      setState(() => _result = reply);
    } catch (e) {
      setState(() => _result = 'Errore: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Analisi immagine')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_file != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadii.lg),
                child: Image.file(File(_file!.path),
                    height: 280, width: double.infinity, fit: BoxFit.cover),
              )
            else
              Container(
                height: 200,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadii.lg),
                  border: Border.all(
                      color: AppColors.border,
                      style: BorderStyle.solid,
                      width: 1.5),
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.image_outlined,
                        size: 48, color: AppColors.muted),
                    SizedBox(height: 8),
                    Text('Carica o scatta una foto',
                        style: TextStyle(color: AppColors.muted)),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pick(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Fotocamera'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pick(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_outlined),
                    label: const Text('Galleria'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _file == null || _loading ? null : _analyze,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('Analizza'),
            ),
            const SizedBox(height: 16),
            if (_result != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadii.lg),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(_result!),
              ),
            const SizedBox(height: 12),
            const Text(Disclaimers.aiShort,
                style: TextStyle(fontSize: 11, color: AppColors.muted),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
