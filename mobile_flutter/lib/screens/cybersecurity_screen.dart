import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class CybersecurityScreen extends StatefulWidget {
  const CybersecurityScreen({super.key});

  @override
  State<CybersecurityScreen> createState() => _CybersecurityScreenState();
}

class _CybersecurityScreenState extends State<CybersecurityScreen> {
  Map<String, dynamic>? _cyberStatus;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchStatus();
  }

  Future<void> _fetchStatus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService().get('/cybersecurity/status');
      if (res.statusCode == 200 && mounted) {
        setState(() {
          _cyberStatus = res.data is Map<String, dynamic>
              ? res.data as Map<String, dynamic>
              : (res.data != null ? Map<String, dynamic>.from(res.data) : null);
          _errorMessage = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = ApiService.getErrorMessage(e);
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;

    final rawLayers = _cyberStatus?['layers'] as List?;
    final List<Map<String, dynamic>> layers = (rawLayers != null && rawLayers.isNotEmpty)
        ? rawLayers.map((l) => {
              'title': 'L${l['level'] ?? ''}: ${l['name'] ?? ''}',
              'desc': l['description'] ?? 'Proteksi keamanan cloud aktif',
              'icon': _getIconForLayer(l['level']),
            }).toList()
        : [
            {'title': 'L1: Proteksi Rate Limiter', 'desc': 'Membatasi akses berlebih dari IP berbahaya', 'icon': Icons.speed},
            {'title': 'L2: Brute Force Login Shield', 'desc': 'Otomatis memproteksi akun dari tebakan password berulang', 'icon': Icons.lock_clock},
            {'title': 'L3: CSRF State-Token Guard', 'desc': 'Melindungi form dari manipulasi token palsu', 'icon': Icons.vpn_key},
            {'title': 'L4: Sanitasi Query Transaksi', 'desc': 'Membersihkan input transaksi dari karakter mencurigakan', 'icon': Icons.cleaning_services},
            {'title': 'L5: Tenant Isolation Cloud', 'desc': 'Memastikan data antar toko terisolasi secara aman', 'icon': Icons.domain_verification},
          ];

    final stats = _cyberStatus?['stats'] as Map<String, dynamic>?;
    final totalViolations = stats?['totalViolations'] ?? 0;
    final ipStats = (stats?['ipStats'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _fetchStatus,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Error / Maintenance Banner if occurred
                    if (_errorMessage != null) ...[
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFCA5A5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, color: Color(0xFFDC2626), size: 22),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  color: Color(0xFF991B1B),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: _fetchStatus,
                              icon: const Icon(Icons.refresh, size: 16, color: Color(0xFFDC2626)),
                              label: const Text('Coba Lagi', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold, fontSize: 12)),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Master Shield Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.primary),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.shield_outlined, color: AppColors.primaryDark, size: 36),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'Sistem Keamanan Toko Aktif',
                                        style: GoogleFonts.plusJakartaSans(
                                          color: AppColors.textPrimary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryLight,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text(
                                        'ONLINE',
                                        style: TextStyle(
                                          color: AppColors.primaryDark,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Data transaksi terenkripsi, proteksi multi-cabang, anti-brute force, dan cloud firewall aktif melindungi data toko Anda.',
                                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Defense Layers Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Lapisan Proteksi Keamanan Toko',
                          style: GoogleFonts.plusJakartaSans(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh, size: 20, color: AppColors.textSecondary),
                          tooltip: 'Segarkan Status',
                          onPressed: _fetchStatus,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Responsive Grid or Column
                    if (isLandscape)
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 3.2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 10,
                        ),
                        itemCount: layers.length,
                        itemBuilder: (context, idx) {
                          final l = layers[idx];
                          return _buildLayerTile(l['title'] as String, l['desc'] as String, l['icon'] as IconData);
                        },
                      )
                    else
                      ...layers.map((l) => _buildLayerTile(l['title'] as String, l['desc'] as String, l['icon'] as IconData)),

                    const SizedBox(height: 20),

                    // IP Filter & Log Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Aktivitas Pelanggaran & Filter',
                          style: GoogleFonts.plusJakartaSans(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$totalViolations Terdeteksi',
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (ipStats.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: AppTheme.cardDecoration(),
                        child: const Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Server aman. Tidak ada aktivitas mencurigakan.',
                                style: TextStyle(
                                  color: AppColors.primaryDark,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  IconData _getIconForLayer(dynamic level) {
    final lvl = AppTheme.parseInt(level);
    switch (lvl) {
      case 1:
        return Icons.location_on_outlined;
      case 2:
        return Icons.fingerprint;
      case 3:
        return Icons.speed;
      case 4:
        return Icons.rule_folder_outlined;
      case 5:
        return Icons.cleaning_services_outlined;
      case 6:
        return Icons.security;
      case 7:
        return Icons.vpn_key_outlined;
      case 8:
        return Icons.lock_person_outlined;
      case 9:
        return Icons.admin_panel_settings_outlined;
      case 10:
        return Icons.block_flipped;
      case 11:
        return Icons.verified_user_outlined;
      default:
        return Icons.shield_outlined;
    }
  }

  Widget _buildLayerTile(String title, String desc, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: AppTheme.cardDecoration(),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppColors.primaryDark, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  desc,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11.5,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 18),
        ],
      ),
    );
  }
}
