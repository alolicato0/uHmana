enum ChatRole { user, assistant, system }

class ChatAttachment {
  final String url;           // file://... oppure https://...
  final String mimeType;      // image/jpeg, image/png, application/pdf, ...
  ChatAttachment({required this.url, required this.mimeType});

  bool get isImage => mimeType.startsWith('image/');
}

class ChatMessage {
  final String id;
  final ChatRole role;
  final String text;
  final List<ChatAttachment> attachments;
  final DateTime createdAt;
  final bool pending;

  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    this.attachments = const [],
    required this.createdAt,
    this.pending = false,
  });

  ChatMessage copyWith({String? text, bool? pending}) => ChatMessage(
        id: id,
        role: role,
        text: text ?? this.text,
        attachments: attachments,
        createdAt: createdAt,
        pending: pending ?? this.pending,
      );
}
