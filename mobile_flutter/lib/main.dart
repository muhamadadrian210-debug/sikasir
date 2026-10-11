import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/services/api_service.dart';
import 'core/theme/app_theme.dart';
import 'providers/pos_provider.dart';
import 'screens/auth_screen.dart';
import 'screens/pos_screen.dart';
import 'screens/products_screen.dart';
import 'screens/incoming_goods_screen.dart';
import 'screens/shift_screen.dart';
import 'screens/history_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/expenses_screen.dart';
import 'screens/users_screen.dart';
import 'screens/ai_copilot_screen.dart';
import 'screens/kasbon_screen.dart';
import 'screens/multi_outlet_screen.dart';
import 'screens/kds_screen.dart';
import 'screens/audit_logs_screen.dart';
import 'screens/cybersecurity_screen.dart';
import 'core/widgets/customer_display_modal.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => PosProvider()),
      ],
      child: const SiKasirApp(),
    ),
  );
}

class SiKasirApp extends StatefulWidget {
  const SiKasirApp({super.key});

  @override
  State<SiKasirApp> createState() => _SiKasirAppState();
}

class _SiKasirAppState extends State<SiKasirApp> {
  bool _isAuthenticated = false;
  bool _isCheckingAuth = true;

  @override
  void initState() {
    super.initState();
    _checkInitialAuth();
  }

  Future<void> _checkInitialAuth() async {
    final token = await ApiService().getToken();
    setState(() {
      _isAuthenticated = token != null && token.isNotEmpty;
      _isCheckingAuth = false;
    });
  }

  void _onLoginSuccess() {
    setState(() => _isAuthenticated = true);
  }

  void _onLogout() async {
    await ApiService().clearToken();
    setState(() => _isAuthenticated = false);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SiKasir POS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: _isCheckingAuth
          ? const Scaffold(
              backgroundColor: AppColors.background,
              body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            )
          : _isAuthenticated
              ? MainNavigationScreen(onLogout: _onLogout)
              : AuthScreen(onLoginSuccess: _onLoginSuccess),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const MainNavigationScreen({super.key, required this.onLogout});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  // 0: Kasir POS, 1: Riwayat, 2: Produk, 3: Laporan, 4: Menu Lainnya Hub
  int _selectedBottomTab = 0;

  // Layar detail yang sedang dibuka dari Menu Lainnya (jika bukan null)
  Widget? _openedDetailScreen;
  String? _openedDetailTitle;

  String _storeType = '🛒 Minimarket';
  String _tenantName = 'SiKasir Store';

  @override
  void initState() {
    super.initState();
    _loadStoreContext();
  }

  Future<void> _loadStoreContext() async {
    final prefs = await SharedPreferences.getInstance();
    final st = prefs.getString('store_type') ?? '';
    final tn = prefs.getString('tenant_name') ?? '';
    setState(() {
      if (st.isNotEmpty) _storeType = st;
      if (tn.isNotEmpty) _tenantName = tn;
    });
  }

  bool get _isFnBBusiness {
    final lower = '$_storeType $_tenantName'.toLowerCase();
    return lower.contains('cafe') ||
        lower.contains('kopi') ||
        lower.contains('restoran') ||
        lower.contains('warung makan') ||
        lower.contains('tegal') ||
        lower.contains('bakery') ||
        lower.contains('kue') ||
        lower.contains('kuliner') ||
        lower.contains('resto') ||
        lower.contains('f&b');
  }

  void _openFeature(String title, Widget screen) {
    setState(() {
      _openedDetailTitle = title;
      _openedDetailScreen = screen;
    });
  }

  void _closeFeature() {
    setState(() {
      _openedDetailTitle = null;
      _openedDetailScreen = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Jika ada layar detail yang dibuka (misal Shift, Kasbon, KDS)
    if (_openedDetailScreen != null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.surface,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
            onPressed: _closeFeature,
          ),
          title: Text(
            _openedDetailTitle ?? '',
            style: GoogleFonts.plusJakartaSans(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
        body: _openedDetailScreen!,
      );
    }

    final titles = ['Kasir POS', 'Riwayat Transaksi', 'Manajemen Produk', 'Laporan Omset', 'Semua Menu'];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _tenantName,
                  style: GoogleFonts.plusJakartaSans(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _storeType,
                    style: const TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.bold,
                      fontSize: 10.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 1),
            Text(
              titles[_selectedBottomTab],
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tv_rounded, color: AppColors.primaryDark),
            onPressed: () => CustomerDisplayModal.show(context),
            tooltip: 'Layar Pelanggan (CDS)',
          ),
          IconButton(
            icon: const Icon(Icons.menu_rounded, color: AppColors.textPrimary),
            onPressed: () {
              Scaffold.of(context).openDrawer();
            },
            tooltip: 'Menu Lengkap',
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: _buildCurrentTabBody(),
      bottomNavigationBar: Container(
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
        child: BottomNavigationBar(
          currentIndex: _selectedBottomTab,
          onTap: (idx) {
            setState(() {
              _selectedBottomTab = idx;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.point_of_sale_rounded),
              label: 'Kasir',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_rounded),
              label: 'Riwayat',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.inventory_2_rounded),
              label: 'Produk',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.bar_chart_rounded),
              label: 'Laporan',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_rounded),
              label: 'Lainnya',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTabBody() {
    switch (_selectedBottomTab) {
      case 0:
        return const PosScreen();
      case 1:
        return const HistoryScreen();
      case 2:
        return const ProductsScreen();
      case 3:
        return const ReportsScreen();
      case 4:
      default:
        return _buildMoreMenuHub();
    }
  }

  // Hub Menu Lengkap (Majoo Style Grid)
  Widget _buildMoreMenuHub() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Kartu Profil Toko & Status Kasir
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppTheme.cardDecoration(),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _tenantName,
                      style: GoogleFonts.plusJakartaSans(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tipe Usaha: $_storeType · SiKasir Pro',
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Section 1: Operasional Kasir
        _buildSectionTitle('Operasional Kasir'),
        _buildMenuGrid([
          _HubItem(
            title: 'Shift Kasir & Laci',
            subtitle: 'Buka / Tutup kasir & selisih uang',
            icon: Icons.badge_outlined,
            iconColor: const Color(0xFF0EA5E9),
            bgColor: const Color(0xFFF0F9FF),
            onTap: () => _openFeature('Shift Kasir & Cash Drawer', const ShiftScreen()),
          ),
          _HubItem(
            title: 'Kasbon & Piutang',
            subtitle: 'Catat hutang & tagih via WhatsApp',
            icon: Icons.credit_card_rounded,
            iconColor: const Color(0xFF10B981),
            bgColor: const Color(0xFFECFDF5),
            onTap: () => _openFeature('Kasbon & Tagih WhatsApp', const KasbonScreen()),
          ),
          _HubItem(
            title: 'Layar Pelanggan (CDS)',
            subtitle: 'Layar kedua HP/tablet live display',
            icon: Icons.tv_rounded,
            iconColor: const Color(0xFF10B981),
            bgColor: const Color(0xFFECFDF5),
            onTap: () => CustomerDisplayModal.show(context),
          ),
        ]),
        const SizedBox(height: 18),

        // Section 2: Inventori & Stok
        _buildSectionTitle('Inventori & Stok Toko'),
        _buildMenuGrid([
          _HubItem(
            title: 'Barang Masuk',
            subtitle: 'Catat restock penerimaan supplier',
            icon: Icons.move_to_inbox_rounded,
            iconColor: const Color(0xFFF59E0B),
            bgColor: const Color(0xFFFEF3C7),
            onTap: () => _openFeature('Log Barang Masuk (Restock)', const IncomingGoodsScreen()),
          ),
          _HubItem(
            title: 'Multi-Outlet Cabang',
            subtitle: 'Mutasi antar cabang & konsolidasi',
            icon: Icons.store_mall_directory_rounded,
            iconColor: const Color(0xFF6366F1),
            bgColor: const Color(0xFFEEF2FF),
            onTap: () => _openFeature('Multi-Outlet & Mutasi Stok', const MultiOutletScreen()),
          ),
        ]),
        const SizedBox(height: 18),

        // Section 3: Keuangan & Resto
        _buildSectionTitle('Keuangan & Tambahan'),
        _buildMenuGrid([
          _HubItem(
            title: 'Kas Keluar / Biaya',
            subtitle: 'Bayar nota supplier & listrik toko',
            icon: Icons.payments_outlined,
            iconColor: const Color(0xFFEF4444),
            bgColor: const Color(0xFFFEE2E2),
            onTap: () => _openFeature('Bayar Nota & Kas Keluar', const ExpensesScreen()),
          ),
          if (_isFnBBusiness)
            _HubItem(
              title: 'Kitchen Display (KDS)',
              subtitle: 'Monitor pesanan meja koki dapur',
              icon: Icons.restaurant_rounded,
              iconColor: const Color(0xFFEA580C),
              bgColor: const Color(0xFFFFEDD5),
              onTap: () => _openFeature('Kitchen Display System (KDS)', const KdsScreen()),
            )
          else
            _HubItem(
              title: 'Kelola Staf & Kasir',
              subtitle: 'Hak akses & akun kasir',
              icon: Icons.people_alt_outlined,
              iconColor: const Color(0xFF0284C7),
              bgColor: const Color(0xFFE0F2FE),
              onTap: () => _openFeature('Manajemen Kasir & Staf', const UsersScreen()),
            ),
        ]),
        const SizedBox(height: 18),

        // Section 4: AI & Keamanan
        _buildSectionTitle('Asisten AI & Keamanan Toko'),
        _buildMenuGrid([
          _HubItem(
            title: 'SiKasir AI Copilot',
            subtitle: 'Analisis bisnis & asisten cerdas',
            icon: Icons.auto_awesome_rounded,
            iconColor: const Color(0xFF8B5CF6),
            bgColor: const Color(0xFFF3E8FF),
            onTap: () => _openFeature('SiKasir AI Copilot', const AiCopilotScreen()),
          ),
          _HubItem(
            title: 'Audit & Keamanan',
            subtitle: 'Log aktivitas kasir & proteksi',
            icon: Icons.shield_outlined,
            iconColor: const Color(0xFF059669),
            bgColor: const Color(0xFFD1FAE5),
            onTap: () => _openFeature('Log Audit Admin', const AuditLogsScreen()),
          ),
        ]),
        const SizedBox(height: 24),

        // Tombol Logout Akun
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.danger,
            side: const BorderSide(color: AppColors.danger),
            padding: const EdgeInsets.symmetric(vertical: 13),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          icon: const Icon(Icons.logout_rounded, size: 18),
          label: const Text('Keluar dari Akun Kasir', style: TextStyle(fontWeight: FontWeight.bold)),
          onPressed: widget.onLogout,
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 2),
      child: Text(
        title,
        style: GoogleFonts.plusJakartaSans(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w800,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildMenuGrid(List<_HubItem> items) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.45,
      children: items.map((it) {
        return InkWell(
          onTap: it.onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: AppTheme.cardDecoration(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: it.bgColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(it.icon, color: it.iconColor, size: 20),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      it.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      it.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10.5,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  // Modern Drawer (Majoo Style)
  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: AppColors.surface,
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.point_of_sale_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _tenantName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.plusJakartaSans(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _storeType,
                        style: const TextStyle(color: AppColors.primaryDark, fontSize: 11.5, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              children: [
                _buildDrawerItem(
                  icon: Icons.point_of_sale_rounded,
                  title: 'Kasir POS',
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _selectedBottomTab = 0);
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.receipt_long_rounded,
                  title: 'Riwayat Transaksi',
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _selectedBottomTab = 1);
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.inventory_2_rounded,
                  title: 'Katalog & Stok',
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _selectedBottomTab = 2);
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.bar_chart_rounded,
                  title: 'Laporan & Untung',
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _selectedBottomTab = 3);
                  },
                ),
                const Divider(height: 16),
                _buildDrawerItem(
                  icon: Icons.badge_outlined,
                  title: 'Shift Kasir & Cash Drawer',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Shift Kasir & Cash Drawer', const ShiftScreen());
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.credit_card_rounded,
                  title: 'Kasbon & WhatsApp',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Kasbon & Tagih WhatsApp', const KasbonScreen());
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.store_mall_directory_rounded,
                  title: 'Multi-Outlet Cabang',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Multi-Outlet & Mutasi Stok', const MultiOutletScreen());
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.move_to_inbox_rounded,
                  title: 'Barang Masuk (Restock)',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Log Barang Masuk (Restock)', const IncomingGoodsScreen());
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.payments_outlined,
                  title: 'Kas Keluar & Bayar Nota',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Bayar Nota & Kas Keluar', const ExpensesScreen());
                  },
                ),
                if (_isFnBBusiness)
                  _buildDrawerItem(
                    icon: Icons.restaurant_rounded,
                    title: 'Kitchen Display (KDS)',
                    onTap: () {
                      Navigator.pop(context);
                      _openFeature('Kitchen Display System (KDS)', const KdsScreen());
                    },
                  ),
                _buildDrawerItem(
                  icon: Icons.people_alt_outlined,
                  title: 'Manajemen Staf & Kasir',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Manajemen Kasir & Staf', const UsersScreen());
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.auto_awesome_rounded,
                  title: 'SiKasir AI Copilot',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('SiKasir AI Copilot', const AiCopilotScreen());
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.shield_outlined,
                  title: 'Keamanan & Cyber Defense',
                  onTap: () {
                    Navigator.pop(context);
                    _openFeature('Keamanan Toko & Cyber Defense', const CybersecurityScreen());
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 20),
            title: const Text('Keluar Akun', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 13)),
            onTap: () {
              Navigator.pop(context);
              widget.onLogout();
            },
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildDrawerItem({required IconData icon, required String title, required VoidCallback onTap}) {
    return ListTile(
      dense: true,
      leading: Icon(icon, color: AppColors.textSecondary, size: 20),
      title: Text(
        title,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onTap: onTap,
    );
  }
}

class _HubItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final VoidCallback onTap;

  _HubItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.onTap,
  });
}
