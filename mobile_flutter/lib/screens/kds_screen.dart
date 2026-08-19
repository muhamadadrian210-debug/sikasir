import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class KdsScreen extends StatefulWidget {
  const KdsScreen({super.key});

  @override
  State<KdsScreen> createState() => _KdsScreenState();
}

class _KdsScreenState extends State<KdsScreen> {
  final List<Map<String, dynamic>> _kitchenOrders = [
    {
      'order_id': 'ORD-101',
      'table_no': 'Meja 04',
      'time': DateTime.now().subtract(const Duration(minutes: 6)),
      'status': 'COOKING', // COOKING, READY, SERVED
      'items': [
        {'name': 'Kopi Susu Gula Aren', 'qty': 2, 'notes': 'Less Sugar & Less Ice'},
        {'name': 'Croissant Butter', 'qty': 1, 'notes': 'Dipanaskan garing'},
        {'name': 'Kentang Goreng Keju', 'qty': 1, 'notes': 'Saus pisah'},
      ],
    },
    {
      'order_id': 'ORD-102',
      'table_no': 'Meja 09',
      'time': DateTime.now().subtract(const Duration(minutes: 2)),
      'status': 'COOKING',
      'items': [
        {'name': 'Nasi Goreng Spesial', 'qty': 1, 'notes': 'Pedas level 3'},
        {'name': 'Es Teh Manis', 'qty': 1, 'notes': 'Manis sedang'},
      ],
    },
    {
      'order_id': 'ORD-103',
      'table_no': 'Takeaway (Bungkus)',
      'time': DateTime.now().subtract(const Duration(minutes: 12)),
      'status': 'READY',
      'items': [
        {'name': 'Matcha Latte Ice', 'qty': 2, 'notes': 'Oatmilk'},
      ],
    },
  ];

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
              decoration: BoxDecoration(color: const Color(0xFFEF4444).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.restaurant, color: Color(0xFFEF4444), size: 18),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Kitchen Display System (KDS)', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                const Text('Layar Monitor Pesanan Dapur & Bar Real-Time', style: TextStyle(color: Color(0xFFEF4444), fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
      body: _kitchenOrders.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 56),
                  SizedBox(height: 12),
                  Text('Semua pesanan dapur sudah selesai disajikan!', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _kitchenOrders.length,
              itemBuilder: (ctx, idx) {
                final ord = _kitchenOrders[idx];
                final isCooking = ord['status'] == 'COOKING';
                final timeDiff = DateTime.now().difference(ord['time'] as DateTime).inMinutes;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111827),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isCooking ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    children: [
                      // Header Card KDS
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isCooking ? const Color(0xFF7F1D1D).withValues(alpha: 0.25) : const Color(0xFF064E3B).withValues(alpha: 0.25),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Text(
                                  ord['table_no'],
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '(${ord['order_id']})',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isCooking ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.timer_outlined, color: isCooking ? Colors.white : const Color(0xFF090D16), size: 13),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$timeDiff Menit Lalu',
                                    style: TextStyle(
                                      color: isCooking ? Colors.white : const Color(0xFF090D16),
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Items List
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          children: (ord['items'] as List).map<Widget>((item) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF1E293B),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${item['qty']}x',
                                      style: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name'],
                                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13.5),
                                        ),
                                        if ((item['notes'] ?? '').toString().isNotEmpty)
                                          Text(
                                            'Catatan: ${item['notes']}',
                                            style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11.5, fontStyle: FontStyle.italic),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),

                      // Bottom Action Button
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                        child: SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isCooking ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
                              foregroundColor: isCooking ? Colors.black : Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () {
                              setState(() {
                                if (isCooking) {
                                  ord['status'] = 'READY';
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('✅ ${ord['table_no']} Siap Disajikan! Pelayan telah dinotifikasi.')));
                                } else {
                                  _kitchenOrders.removeAt(idx);
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('✨ Pesanan ${ord['table_no']} selesai disajikan.')));
                                }
                              });
                            },
                            child: Text(
                              isCooking ? '🔔 TANDAI SIAP SAJI' : '✓ SELESAIKAN PESANAN',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
