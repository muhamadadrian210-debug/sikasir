import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'core/services/api_service.dart';
import 'providers/pos_provider.dart';
import 'screens/auth_screen.dart';
import 'screens/pos_screen.dart';
import 'screens/products_screen.dart';
import 'screens/shift_screen.dart';
import 'screens/history_screen.dart';
import 'screens/reports_screen.dart';

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

  final List<Widget> _screens = const [
    PosScreen(),
    ProductsScreen(),
    ShiftScreen(),
    HistoryScreen(),
    ReportsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: Drawer(
        backgroundColor: const Color(0xFF111827),
        child: ListView(
          padding: EdgeInsets.zero,
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
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF10B981)),
                        ),
                        child: const Icon(Icons.point_of_sale, color: Color(0xFF10B981), size: 24),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SiKasir POS',
                            style: GoogleFonts.plusJakartaSans(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Text(
                            'Enterprise v3.0.0',
                            style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.point_of_sale, color: Color(0xFF10B981)),
              title: const Text('Kasir POS', style: TextStyle(color: Colors.white)),
              selected: _currentIndex == 0,
              onTap: () {
                setState(() => _currentIndex = 0);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.inventory_2, color: Color(0xFF3B82F6)),
              title: const Text('Produk & Stok', style: TextStyle(color: Colors.white)),
              selected: _currentIndex == 1,
              onTap: () {
                setState(() => _currentIndex = 1);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.badge, color: Color(0xFFF59E0B)),
              title: const Text('Shift Kasir', style: TextStyle(color: Colors.white)),
              selected: _currentIndex == 2,
              onTap: () {
                setState(() => _currentIndex = 2);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long, color: Color(0xFF8B5CF6)),
              title: const Text('Riwayat Transaksi', style: TextStyle(color: Colors.white)),
              selected: _currentIndex == 3,
              onTap: () {
                setState(() => _currentIndex = 3);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.bar_chart, color: Color(0xFFEC4899)),
              title: const Text('Laporan & Margin', style: TextStyle(color: Colors.white)),
              selected: _currentIndex == 4,
              onTap: () {
                setState(() => _currentIndex = 4);
                Navigator.pop(context);
              },
            ),
            const Divider(color: Color(0xFF1E293B)),
            ListTile(
              leading: const Icon(Icons.logout, color: Color(0xFFEF4444)),
              title: const Text('Keluar Akun', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold)),
              onTap: () {
                Navigator.pop(context);
                widget.onLogout();
              },
            ),
          ],
        ),
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF111827),
        indicatorColor: const Color(0xFF10B981).withValues(alpha: 0.2),
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.point_of_sale, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.point_of_sale, color: Color(0xFF10B981)),
            label: 'POS',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.inventory_2, color: Color(0xFF10B981)),
            label: 'Produk',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.badge, color: Color(0xFF10B981)),
            label: 'Shift',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.receipt_long, color: Color(0xFF10B981)),
            label: 'Riwayat',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.bar_chart, color: Color(0xFF10B981)),
            label: 'Laporan',
          ),
        ],
      ),
    );
  }
}
