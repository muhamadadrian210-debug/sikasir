import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/pos_provider.dart';
import 'screens/pos_screen.dart';
import 'screens/shift_screen.dart';

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

class SiKasirApp extends StatelessWidget {
  const SiKasirApp({super.key});

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
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    PosScreen(),
    ShiftScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
            label: 'Kasir POS',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge, color: Color(0xFF94A3B8)),
            selectedIcon: Icon(Icons.badge, color: Color(0xFF10B981)),
            label: 'Shift Kasir',
          ),
        ],
      ),
    );
  }
}
