import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/chat_message.dart';
import 'openrouter_service.dart';
import 'timeline_repository.dart';

class ChatState {
  final List<ChatMessage> messages;
  final bool sending;
  final String? error;

  const ChatState({
    this.messages = const [],
    this.sending = false,
    this.error,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? sending,
    String? error,
  }) =>
      ChatState(
        messages: messages ?? this.messages,
        sending: sending ?? this.sending,
        error: error,
      );
}

class ChatController extends StateNotifier<ChatState> {
  ChatController(this._ref)
      : super(ChatState(messages: [
          ChatMessage(
            id: const Uuid().v4(),
            role: ChatRole.assistant,
            text:
                'Ciao 👋 Sono l\'assistente di salute di uHmana. Come posso aiutarti oggi?\n\nPuoi scrivermi, inviarmi foto, video o referti.',
            createdAt: DateTime.now(),
          ),
        ]));

  final Ref _ref;
  static const _uuid = Uuid();

  Future<void> send(String text, {List<ChatAttachment> attachments = const []}) async {
    if (text.trim().isEmpty && attachments.isEmpty) return;

    final userMsg = ChatMessage(
      id: _uuid.v4(),
      role: ChatRole.user,
      text: text.trim(),
      attachments: attachments,
      createdAt: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMsg],
      sending: true,
      error: null,
    );

    try {
      final context = _ref.read(timelineRepositoryProvider.notifier).contextSummary();
      final reply = await _ref.read(openRouterServiceProvider).chat(
            history: state.messages,
            extraContext: context,
          );

      final botMsg = ChatMessage(
        id: _uuid.v4(),
        role: ChatRole.assistant,
        text: reply,
        createdAt: DateTime.now(),
      );

      state = state.copyWith(
        messages: [...state.messages, botMsg],
        sending: false,
      );
    } catch (e) {
      state = state.copyWith(
        sending: false,
        error: 'Errore connessione AI: $e',
      );
    }
  }

  void clear() {
    state = const ChatState();
  }
}

final chatControllerProvider =
    StateNotifierProvider<ChatController, ChatState>(
        (ref) => ChatController(ref));
