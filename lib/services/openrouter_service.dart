import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/disclaimers.dart';
import '../models/chat_message.dart';

final openRouterServiceProvider = Provider<OpenRouterService>((ref) {
  return OpenRouterService();
});

/// Client minimale per OpenRouter.
/// - Modello primario "free" da .env
/// - Fallback automatico su 429/5xx verso il modello fallback
/// - Supporta input multimodale (testo + immagini come data URL base64)
class OpenRouterService {
  OpenRouterService() {
    final base = dotenv.maybeGet('OPENROUTER_BASE_URL') ??
        'https://openrouter.ai/api/v1';
    _dio = Dio(BaseOptions(
      baseUrl: base,
      headers: {
        'Authorization': 'Bearer ${dotenv.maybeGet('OPENROUTER_API_KEY') ?? ''}',
        'HTTP-Referer': dotenv.maybeGet('APP_REFERER') ?? 'https://uhmana.app',
        'X-Title': dotenv.maybeGet('APP_TITLE') ?? 'uHmana',
        'Content-Type': 'application/json',
      },
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 60),
    ));
  }

  late final Dio _dio;

  String get _primary =>
      dotenv.maybeGet('OPENROUTER_MODEL_PRIMARY') ??
      'google/gemini-2.0-flash-exp:free';
  String get _fallback =>
      dotenv.maybeGet('OPENROUTER_MODEL_FALLBACK') ??
      'meta-llama/llama-3.3-70b-instruct:free';
  String get _vision =>
      dotenv.maybeGet('OPENROUTER_MODEL_VISION') ??
      'google/gemini-2.0-flash-exp:free';

  Future<String> chat({
    required List<ChatMessage> history,
    String? extraContext,
  }) async {
    final hasImages = history.any((m) => m.attachments.any((a) => a.isImage));
    final model = hasImages ? _vision : _primary;
    try {
      return await _send(model: model, history: history, extraContext: extraContext);
    } on DioException catch (e) {
      final status = e.response?.statusCode ?? 0;
      if (status == 429 || status >= 500) {
        return _send(
            model: _fallback, history: history, extraContext: extraContext);
      }
      rethrow;
    }
  }

  Future<String> _send({
    required String model,
    required List<ChatMessage> history,
    String? extraContext,
  }) async {
    final messages = <Map<String, dynamic>>[
      {
        'role': 'system',
        'content': Disclaimers.aiSystemPrompt +
            (extraContext != null ? '\n\nCONTESTO UTENTE:\n$extraContext' : ''),
      },
    ];

    for (final m in history) {
      if (m.attachments.isEmpty) {
        messages.add({'role': m.role.name, 'content': m.text});
        continue;
      }
      // multimodale
      final parts = <Map<String, dynamic>>[];
      if (m.text.isNotEmpty) {
        parts.add({'type': 'text', 'text': m.text});
      }
      for (final a in m.attachments.where((a) => a.isImage)) {
        final dataUrl = await _toDataUrl(a);
        parts.add({
          'type': 'image_url',
          'image_url': {'url': dataUrl},
        });
      }
      messages.add({'role': m.role.name, 'content': parts});
    }

    final resp = await _dio.post('/chat/completions', data: {
      'model': model,
      'messages': messages,
      'temperature': 0.4,
    });

    final data = resp.data as Map<String, dynamic>;
    final choices = data['choices'] as List;
    final content = choices.first['message']['content'];
    if (content is String) return content;
    if (content is List) {
      return content
          .whereType<Map>()
          .map((p) => p['text'] ?? '')
          .join('\n')
          .toString();
    }
    return '';
  }

  Future<String> _toDataUrl(ChatAttachment a) async {
    if (a.url.startsWith('http')) return a.url;
    final path = a.url.startsWith('file://')
        ? Uri.parse(a.url).toFilePath()
        : a.url;
    final bytes = await File(path).readAsBytes();
    return 'data:${a.mimeType};base64,${base64Encode(bytes)}';
  }
}
