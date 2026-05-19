import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/disclaimers.dart';
import '../../core/theme/app_theme.dart';
import '../../models/chat_message.dart';
import '../../services/chat_controller.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<ChatAttachment> _pending = [];

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut);
      }
    });
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final f = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (f == null) return;
    setState(() => _pending.add(
        ChatAttachment(url: f.path, mimeType: 'image/jpeg')));
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final f = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (f == null) return;
    setState(() => _pending.add(
        ChatAttachment(url: f.path, mimeType: 'image/jpeg')));
  }

  Future<void> _send() async {
    final text = _textCtrl.text;
    if (text.trim().isEmpty && _pending.isEmpty) return;
    final atts = List<ChatAttachment>.from(_pending);
    _textCtrl.clear();
    setState(_pending.clear);
    await ref.read(chatControllerProvider.notifier)
        .send(text, attachments: atts);
    _scrollToEnd();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatControllerProvider);
    _scrollToEnd();

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          children: [
            Text('Chat AI'),
            Text('Assistente di salute',
                style: TextStyle(fontSize: 12, color: AppColors.muted)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(chatControllerProvider.notifier).clear(),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFFFEF9C3),
              child: const Text(
                Disclaimers.aiShort,
                style: TextStyle(fontSize: 11, color: Color(0xFF854D0E)),
                textAlign: TextAlign.center,
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.all(16),
                itemCount: state.messages.length + (state.sending ? 1 : 0),
                itemBuilder: (ctx, i) {
                  if (i == state.messages.length) {
                    return const _TypingBubble();
                  }
                  return _MessageBubble(message: state.messages[i]);
                },
              ),
            ),
            if (state.error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                color: const Color(0xFFFEE2E2),
                child: Text(state.error!,
                    style: const TextStyle(color: AppColors.danger, fontSize: 12)),
              ),
            if (_pending.isNotEmpty)
              SizedBox(
                height: 72,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: _pending
                      .asMap()
                      .entries
                      .map((e) => _AttachmentChip(
                            attachment: e.value,
                            onRemove: () =>
                                setState(() => _pending.removeAt(e.key)),
                          ))
                      .toList(),
                ),
              ),
            _Composer(
              controller: _textCtrl,
              onSend: _send,
              onAttachImage: _pickImage,
              onTakePhoto: _takePhoto,
              sending: state.sending,
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == ChatRole.user;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.8),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(AppRadii.lg).copyWith(
            bottomRight: isUser ? const Radius.circular(4) : null,
            bottomLeft: !isUser ? const Radius.circular(4) : null,
          ),
          border: isUser ? null : Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ...message.attachments.where((a) => a.isImage).map((a) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: _AttachmentImage(url: a.url, width: 200),
                  ),
                )),
            isUser
                ? Text(
                    message.text,
                    style: const TextStyle(color: Colors.white),
                  )
                : MarkdownBody(
                    data: message.text,
                    styleSheet: MarkdownStyleSheet(
                      p: const TextStyle(color: AppColors.ink, height: 1.4),
                      strong: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadii.lg),
          border: Border.all(color: AppColors.border),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Dot(), SizedBox(width: 4),
            _Dot(delayMs: 200), SizedBox(width: 4),
            _Dot(delayMs: 400),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatefulWidget {
  final int delayMs;
  const _Dot({this.delayMs = 0});
  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    Future.delayed(Duration(milliseconds: widget.delayMs), () {
      if (mounted) _c.repeat(reverse: true);
    });
  }
  @override
  void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _c,
      child: Container(
        width: 7, height: 7,
        decoration: const BoxDecoration(
          color: AppColors.muted, shape: BoxShape.circle),
      ),
    );
  }
}

class _AttachmentChip extends StatelessWidget {
  final ChatAttachment attachment;
  final VoidCallback onRemove;
  const _AttachmentChip({required this.attachment, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: _AttachmentImage(url: attachment.url, width: 56, height: 56),
          ),
          Positioned(
            top: -8, right: -8,
            child: IconButton(
              icon: const Icon(Icons.close, size: 16, color: Colors.white),
              style: IconButton.styleFrom(
                backgroundColor: Colors.black54,
                minimumSize: const Size(22, 22),
              ),
              onPressed: onRemove,
            ),
          ),
        ],
      ),
    );
  }
}

class _AttachmentImage extends StatelessWidget {
  final String url;
  final double? width;
  final double? height;
  const _AttachmentImage({required this.url, this.width, this.height});

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: width, height: height ?? 120, color: Colors.black12,
      child: const Icon(Icons.image),
    );
    if (url.startsWith('http')) {
      return Image.network(url,
          width: width, height: height, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => fallback);
    }
    final path = url.startsWith('file://') ? Uri.parse(url).toFilePath() : url;
    return Image.file(File(path),
        width: width, height: height, fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback);
  }
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSend;
  final VoidCallback onAttachImage;
  final VoidCallback onTakePhoto;
  final bool sending;

  const _Composer({
    required this.controller,
    required this.onSend,
    required this.onAttachImage,
    required this.onTakePhoto,
    required this.sending,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          IconButton(
              onPressed: onTakePhoto,
              icon: const Icon(Icons.camera_alt_outlined,
                  color: AppColors.muted)),
          IconButton(
              onPressed: onAttachImage,
              icon: const Icon(Icons.image_outlined,
                  color: AppColors.muted)),
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Scrivi un messaggio...',
                isDense: true,
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: sending ? null : onSend,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}
