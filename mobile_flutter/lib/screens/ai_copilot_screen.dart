import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/services/api_service.dart';

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
      final res = await ApiService().post('/ai/chat', data: {'prompt': text});
      if (res.statusCode == 200 && res.data != null) {
        final reply = res.data['reply'] ?? 'Respon diterima.';
        setState(() {
          _messages.add({
            'isAi': true,
            'text': reply,
            'time': DateTime.now(),
            'action': res.data['actionPerformed'],
            'data': res.data['data'],
          });
        });
      } else {
        setState(() {
          _messages.add({
            'isAi': true,
            'text': '⚠️ ${res.data?['error'] ?? 'Gagal memproses jawaban dari AI.'}',
            'time': DateTime.now(),
          });
        });
      }
    } catch (e) {
      setState(() {
        _messages.add({
          'isAi': true,
          'text': '❌ Terjadi kendala saat menghubungi AI Copilot: $e',
          'time': DateTime.now(),
        });
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF38BDF8)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SiKasir AI Copilot',
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Text(
                  'Smart Retail Financial & Business AI',
                  style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Prompts Chips
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            color: const Color(0xFF0F172A),
            child: SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _quickPrompts.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, idx) {
                  final q = _quickPrompts[idx];
                  return ActionChip(
                    backgroundColor: const Color(0xFF1E293B),
                    side: const BorderSide(color: Color(0xFF334155)),
                    label: Text(q, style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 12, fontWeight: FontWeight.w600)),
                    onPressed: _isLoading ? null : () => _sendMessage(q),
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
                      color: isAi ? const Color(0xFF111827) : const Color(0xFF10B981),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: isAi ? const Radius.circular(4) : const Radius.circular(16),
                        bottomRight: isAi ? const Radius.circular(16) : const Radius.circular(4),
                      ),
                      border: isAi ? Border.all(color: const Color(0xFF1E293B)) : null,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 6,
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
                              const Icon(Icons.auto_awesome, color: Color(0xFF38BDF8), size: 14),
                              const SizedBox(width: 6),
                              Text(
                                'AI Assistant',
                                style: GoogleFonts.plusJakartaSans(
                                  color: const Color(0xFF38BDF8),
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
                            color: isAi ? const Color(0xFFF1F5F9) : Colors.white,
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
              child: Row(
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF10B981)),
                  ),
                  const SizedBox(width: 10),
                  Text('AI sedang menganalisis data bisnis Anda...', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                ],
              ),
            ),

          // Bottom Input Field
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0xFF111827),
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _promptController,
                      style: const TextStyle(color: Colors.white, fontSize: 13.5),
                      decoration: InputDecoration(
                        hintText: 'Tanyakan rekap laba, stok, atau minta tambah produk...',
                        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12.5),
                        filled: true,
                        fillColor: const Color(0xFF090D16),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: Color(0xFF10B981)),
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF10B981), Color(0xFF059669)],
                      ),
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
