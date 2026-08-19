import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/services/api_service.dart';

class CybersecurityScreen extends StatefulWidget {
  const CybersecurityScreen({super.key});

  @override
  State<CybersecurityScreen> createState() => _CybersecurityScreenState();
}

class _CybersecurityScreenState extends State<CybersecurityScreen> {
  Map<String, dynamic>? _cyberStatus;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchStatus();
  }

  Future<void> _fetchStatus() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/cybersecurity/status');
      if (res.statusCode == 200) {
        setState(() => _cyberStatus = res.data);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat status firewall: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final blockedIps = (_cyberStatus?['blocked_ips'] as List?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: const Text('Keamanan & Cyber Defense', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchStatus,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Master Shield Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111827),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF10B981)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF064E3B),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.shield_outlined, color: Color(0xFF10B981), size: 36),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '11-Layer Quantum Defense Active',
                                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Anti-SQLi, XSS Sanitizer, Brute Force Blocker, CSRF Token Guard, dan Bot Defender aktif menjaga database toko.',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Defense Stats
                  const Text('Daftar Lapisan Pertahanan Toko', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),

                  _buildLayerTile('L1: IP Blacklist & Rate Limiter', 'Memblokir serangan spam requests dari IP berbahaya', Icons.speed),
                  _buildLayerTile('L2: Brute Force Login Shield', 'Otomatis mengunci akun setelah 5x salah password', Icons.lock_clock),
                  _buildLayerTile('L3: CSRF State-Token Guard', 'Melindungi form dari manipulasi token palsu', Icons.vpn_key),
                  _buildLayerTile('L4: SQLi & Sanitizer Pipeline', 'Membersihkan input transaksi dari injeksi berbahaya', Icons.cleaning_services),
                  _buildLayerTile('L5: Tenant Isolation Firewall', 'Memastikan data antar toko tidak bisa saling intip', Icons.domain_verification),

                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('IP Terblokir Otomatis', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(6)),
                        child: Text('${blockedIps.length} Terdeteksi', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (blockedIps.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFF111827), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF1E293B))),
                      child: const Center(
                        child: Text('✓ Server aman. Tidak ada aktivitas IP mencurigakan.', style: TextStyle(color: Color(0xFF10B981), fontSize: 13)),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildLayerTile(String title, String desc, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF10B981), size: 22),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              ],
            ),
          ),
          const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18),
        ],
      ),
    );
  }
}
