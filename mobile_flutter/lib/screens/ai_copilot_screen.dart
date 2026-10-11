import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class AiCopilotScreen extends StatefulWidget {
  const AiCopilotScreen({super.key});

  @override
  State<AiCopilotScreen> createState() => _AiCopilotScreenState();
}

class _AiCopilotScreenState extends State<AiCopilotScreen> {
  final TextEditingController _promptController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [
    {
      'isAi': true,
      'text': '👋 Halo! Saya SiKasir AI Business Copilot.\n\nSaya siap membantu mengelola bisnis Anda:\n• 📊 Rekap Keuangan & Laba ("Berapa omset dan laba bulan ini?")\n• 📦 Audit Stok Menipis ("Barang apa yang stoknya menipis?")\n• ✨ Pendaftaran Produk Cepat ("Tambah produk Sabun Nuvo jual 4000 modal 2500 stok 20")\n• 💡 Saran Strategi Penjualan Toko\n\nApa yang ingin Anda konsultasikan hari ini?',
      'time': DateTime.now(),
    }
  ];

  bool _isLoading = false;

  final List<String> _quickPrompts = [
    '📊 Omset & Untung Hari Ini',
    '📈 Rekap Keuangan Bulan Ini',
    '⚠️ Cek Stok Menipis',
    '🏆 5 Produk Paling Laris',
    '💡 Saran Naikkan Omset Toko',
  ];

  @override
  void dispose() {
    _promptController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? customText]) async {
    final text = (customText ?? _promptController.text).trim();
    if (text.isEmpty || _isLoading) return;

    if (customText == null) _promptController.clear();

    setState(() {
      _messages.add({
        'isAi': false,
        'text': text,
        'time': DateTime.now(),
      });
      _isLoading = true;
    });

    _scrollToBottom();

    try {
      final res = await ApiService().post('/ai/copilot', data: {'message': text});
      if (res.statusCode == 200 && res.data != null) {
        final reply = res.data['reply'] ?? res.data['response'] ?? 'Tidak ada jawaban dari AI';
        setState(() {
          _messages.add({
            'isAi': true,
            'text': reply.toString(),
            'time': DateTime.now(),
          });
        });
      } else {
        throw Exception(res.data?['error'] ?? 'Gagal menghubungi server AI');
      }
    } catch (e) {
      setState(() {
        _messages.add({
          'isAi': true,
          'text': '⚠️ Maaf, terjadi kendala saat memproses permintaan: $e\nSilakan coba tanyakan kembali.',
          'time': DateTime.now(),
        });
      });
    } finally {
      setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Quick Prompts Chips
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            color: AppColors.surface,
            child: SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _quickPrompts.length,
                separatorBuilder: (_, i) => const SizedBox(width: 8),
                itemBuilder: (ctx, idx) {
                  final q = _quickPrompts[idx];
                  return InkWell(
                    onTap: _isLoading ? null : () => _sendMessage(q),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        q,
                        style: const TextStyle(
                          color: AppColors.primaryDark,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (ctx, idx) {
                final m = _messages[idx];
                final isAi = m['isAi'] as bool;
                final text = m['text'] as String;

                return Align(
                  alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isAi ? AppColors.surface : AppColors.primary,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: isAi ? const Radius.circular(4) : const Radius.circular(16),
                        bottomRight: isAi ? const Radius.circular(16) : const Radius.circular(4),
                      ),
                      border: isAi ? Border.all(color: AppColors.border) : null,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (isAi)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.auto_awesome, color: AppColors.primary, size: 14),
                              const SizedBox(width: 6),
                              Text(
                                'SiKasir Copilot',
                                style: GoogleFonts.plusJakartaSans(
                                  color: AppColors.primaryDark,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        if (isAi) const SizedBox(height: 6),
                        SelectableText(
                          text,
                          style: TextStyle(
                            color: isAi ? AppColors.textPrimary : Colors.white,
                            fontSize: 13.5,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Loading Indicator
          if (_isLoading)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              alignment: Alignment.centerLeft,
              child: const Row(
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  ),
                  SizedBox(width: 10),
                  Text('AI sedang menganalisis data bisnis Anda...', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ],
              ),
            ),

          // Bottom Input Field
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: const Border(top: BorderSide(color: AppColors.border)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: TextField(
                        controller: _promptController,
                        style: const TextStyle(fontSize: 13.5, color: AppColors.textPrimary),
                        decoration: const InputDecoration(
                          hintText: 'Tanyakan laba, stok, atau minta tambah produk...',
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      onPressed: _isLoading ? null : () => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
