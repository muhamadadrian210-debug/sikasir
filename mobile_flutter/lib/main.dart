import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'core/services/api_service.dart';
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
import 'screens/audit_logs_screen.dart';
import 'screens/cybersecurity_screen.dart';

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
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF090D16),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Color(0xFF3B82F6),
          surface: Color(0xFF111827),
        ),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(
          ThemeData.dark().textTheme,
        ),
      ),
      home: _isCheckingAuth
          ? const Scaffold(
              backgroundColor: Color(0xFF090D16),
              body: Center(child: CircularProgressIndicator(color: Color(0xFF10B981))),
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
  int _currentIndex = 0;

  final List<Map<String, dynamic>> _menuItems = const [
    {'title': 'Kasir POS', 'icon': Icons.point_of_sale, 'screen': PosScreen()},
    {'title': 'Manajemen Produk & Stok', 'icon': Icons.inventory_2, 'screen': ProductsScreen()},
    {'title': 'Log Barang Masuk (Restock)', 'icon': Icons.move_to_inbox, 'screen': IncomingGoodsScreen()},
    {'title': 'Shift Kasir & Cash Drawer', 'icon': Icons.badge, 'screen': ShiftScreen()},
    {'title': 'Riwayat Transaksi', 'icon': Icons.receipt_long, 'screen': HistoryScreen()},
    {'title': 'Laporan & Untung', 'icon': Icons.bar_chart, 'screen': ReportsScreen()},
    {'title': 'Bayar Nota & Kas Keluar', 'icon': Icons.payments_outlined, 'screen': ExpensesScreen()},
    {'title': 'Manajemen Kasir & Staf', 'icon': Icons.people_alt_outlined, 'screen': UsersScreen()},
    {'title': 'Log Audit Admin', 'icon': Icons.security_update_good, 'screen': AuditLogsScreen()},
    {'title': 'Keamanan Toko & Cyber Defense', 'icon': Icons.shield_outlined, 'screen': CybersecurityScreen()},
  ];

  @override
  Widget build(BuildContext context) {
    final currentItem = _menuItems[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 1,
        title: Row(
          children: [
            Text(
              currentItem['title'] as String,
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF111827),
        child: Column(
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0F172A), Color(0xFF090D16)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF10B981), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF10B981).withValues(alpha: 0.2),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.point_of_sale_rounded, color: Color(0xFF10B981), size: 20),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SiKasir',
                            style: GoogleFonts.plusJakartaSans(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const Text(
                            'Enterprise POS v3.4.0 Pro',
                            style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: EdgeInsets.zero,
                itemCount: _menuItems.length,
                itemBuilder: (ctx, idx) {
                  final it = _menuItems[idx];
                  final isSelected = _currentIndex == idx;
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF10B981).withValues(alpha: 0.15) : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: isSelected ? Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)) : null,
                    ),
                    child: ListTile(
                      dense: true,
                      leading: Icon(it['icon'] as IconData, color: isSelected ? const Color(0xFF10B981) : const Color(0xFF94A3B8), size: 20),
                      title: Text(
                        it['title'] as String,
                        style: TextStyle(
                          color: isSelected ? Colors.white : const Color(0xFFCBD5E1),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                      onTap: () {
                        setState(() => _currentIndex = idx);
                        Navigator.pop(context);
                      },
                    ),
                  );
                },
              ),
            ),
            const Divider(color: Color(0xFF1E293B)),
            ListTile(
              dense: true,
              leading: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 20),
              title: const Text('Keluar Akun', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 13)),
              onTap: () {
                Navigator.pop(context);
                widget.onLogout();
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
      body: currentItem['screen'] as Widget,
    );
  }
}
