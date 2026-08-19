import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/services/api_service.dart';

class AuthScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const AuthScreen({super.key, required this.onLoginSuccess});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Login Form Controllers
  final _loginCompanyIdCtrl = TextEditingController();
  final _loginUserCtrl = TextEditingController();
  final _loginPassCtrl = TextEditingController();
  bool _loginShowPass = false;

  // Register Form Controllers
  final _regStoreNameCtrl = TextEditingController();
  String? _selectedStoreType;
  final _regCompanyIdCtrl = TextEditingController();
  final _regUserCtrl = TextEditingController();
  final _regPassCtrl = TextEditingController();
  final _regPassConfirmCtrl = TextEditingController();
  bool _regShowPass = false;
  bool _regShowPassConfirm = false;

  bool _isLoading = false;
  String? _errorMessage;

  final Map<String, List<String>> _storeTypesGrouped = {
    'Retail & Toko Kelontong': [
      '🛒 Minimarket',
      '🏪 Toko Kelontong',
      '🌾 Warung Sembako',
      '👗 Toko Pakaian / Fashion',
      '📱 Toko Elektronik / HP',
      '🍳 Peralatan Rumah Tangga',
      '✏️ Toko Alat Tulis / ATK',
      '💄 Kosmetik & Kecantikan',
      '🐾 Pet Shop',
    ],
    'Kuliner (F&B)': [
      '☕ Cafe / Kedai Kopi',
      '🍽️ Restoran',
      '🍲 Warung Makan / Tegal',
      '🍞 Toko Kue / Bakery',
    ],
    'Kesehatan & Jasa': [
      '💊 Apotek / Toko Obat',
      '🩺 Klinik Kesehatan',
      '✂️ Barbershop / Pangkas Rambut',
      '💅 Salon Kecantikan',
      '🧺 Laundry Kiloan / Satuan',
      '🔧 Bengkel Motor / Mobil',
    ],
    'Material & Agen': [
      '🧱 Toko Bangunan / Material',
      '💧 Agen Gas & Galon',
      '📦 Lainnya',
    ],
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginCompanyIdCtrl.dispose();
    _loginUserCtrl.dispose();
    _loginPassCtrl.dispose();
    _regStoreNameCtrl.dispose();
    _regCompanyIdCtrl.dispose();
    _regUserCtrl.dispose();
    _regPassCtrl.dispose();
    _regPassConfirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final u = _loginUserCtrl.text.trim();
    final p = _loginPassCtrl.text;
    final cid = _loginCompanyIdCtrl.text.trim();

    if (u.isEmpty || p.isEmpty) {
      setState(() => _errorMessage = 'Username dan password wajib diisi');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService().post('/auth/login', data: {
        'username': u,
        'password': p,
        if (cid.isNotEmpty) 'company_id': cid,
      });

      if (res.statusCode == 200 && res.data['token'] != null) {
        await ApiService().setToken(res.data['token']);
        widget.onLoginSuccess();
      } else {
        setState(() => _errorMessage = res.data['error'] ?? 'Gagal masuk akun');
      }
    } catch (e) {
      setState(() => _errorMessage = 'Koneksi error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRegisterStore() async {
    final sn = _regStoreNameCtrl.text.trim();
    final u = _regUserCtrl.text.trim();
    final p = _regPassCtrl.text;
    final pConf = _regPassConfirmCtrl.text;
    final cid = _regCompanyIdCtrl.text.trim();

    if (sn.isEmpty || u.isEmpty || p.isEmpty) {
      setState(() => _errorMessage = 'Semua field bertanda wajib harus diisi');
      return;
    }
    if (_selectedStoreType == null || _selectedStoreType!.isEmpty) {
      setState(() => _errorMessage = 'Pilih jenis toko / bisnis Anda');
      return;
    }
    if (p.length < 8) {
      setState(() => _errorMessage = 'Password minimal 8 karakter');
      return;
    }
    if (p != pConf) {
      setState(() => _errorMessage = 'Konfirmasi password tidak cocok');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService().post('/auth/register-tenant', data: {
        'store_name': sn,
        'store_type': _selectedStoreType,
        'username': u,
        'password': p,
        if (cid.isNotEmpty) 'company_id': cid,
      });

      if (res.statusCode == 201 && res.data['token'] != null) {
        await ApiService().setToken(res.data['token']);
        widget.onLoginSuccess();
      } else {
        setState(() => _errorMessage = res.data['error'] ?? 'Gagal mendaftar toko');
      }
    } catch (e) {
      setState(() => _errorMessage = 'Koneksi error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _showServerSettingsDialog() async {
    final currentUrl = await ApiService().getBaseUrl();
    final urlCtrl = TextEditingController(text: currentUrl);

    if (!mounted) return;

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E293B)),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.dns_rounded, color: Color(0xFF10B981), size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              'Pengaturan Server Backend',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ubah alamat API Server backend SiKasir jika berjalan di host / port lain (misal: localhost PC / WiFi IP):',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: _inputDecoration('http://10.0.2.2:3000/api'),
            ),
            const SizedBox(height: 12),
            const Text(
              'Preset Cepat:',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  label: const Text('Emulator (10.0.2.2:3000)', style: TextStyle(fontSize: 11, color: Colors.white)),
                  backgroundColor: const Color(0xFF1E293B),
                  onPressed: () => urlCtrl.text = 'http://10.0.2.2:3000/api',
                ),
                ActionChip(
                  label: const Text('Localhost (127.0.0.1:3000)', style: TextStyle(fontSize: 11, color: Colors.white)),
                  backgroundColor: const Color(0xFF1E293B),
                  onPressed: () => urlCtrl.text = 'http://127.0.0.1:3000/api',
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              final newUrl = urlCtrl.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiService().setBaseUrl(newUrl);
                if (mounted) {
                  setState(() => _errorMessage = null);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Server URL berhasil diubah ke: $newUrl'),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                }
              }
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Simpan & Terapkan', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF1E293B)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.5),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo & Brand Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF10B981), width: 1.5),
                        ),
                        child: const Icon(Icons.point_of_sale, color: Color(0xFF10B981), size: 28),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'SiKasir',
                                style: GoogleFonts.plusJakartaSans(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFF10B981)),
                                ),
                                child: const Text(
                                  'v3.2.0',
                                  style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const Text(
                            'Smart POS & Retail Cloud Enterprise',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Server connection settings action button
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: _showServerSettingsDialog,
                      icon: const Icon(Icons.settings_outlined, size: 14, color: Color(0xFF64748B)),
                      label: const Text(
                        'Ubah Server URL',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Top Tab Switcher
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF090D16),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: const Color(0xFF10B981),
                      unselectedLabelColor: const Color(0xFF94A3B8),
                      labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      tabs: const [
                        Tab(text: '🔑 Masuk Akun'),
                        Tab(text: '🏪 Daftar Toko'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7F1D1D).withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFEF4444)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Tab View Bodies
                  AnimatedBuilder(
                    animation: _tabController,
                    builder: (ctx, _) {
                      return _tabController.index == 0 ? _buildLoginForm() : _buildRegisterForm();
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFieldLabel('Company ID (Opsional Multi-Cabang)'),
        TextField(
          controller: _loginCompanyIdCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration('Kosongkan jika toko tunggal'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Username'),
        TextField(
          controller: _loginUserCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration('Username akun Anda'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Password'),
        TextField(
          controller: _loginPassCtrl,
          obscureText: !_loginShowPass,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration(
            'Password akun',
            suffix: TextButton(
              onPressed: () => setState(() => _loginShowPass = !_loginShowPass),
              child: Text(_loginShowPass ? 'Sembunyi' : 'Lihat', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ),
        const SizedBox(height: 20),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: _isLoading ? null : _handleLogin,
            child: _isLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('MASUK KE DASHBOARD', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
          ),
        ),
      ],
    );
  }

  Widget _buildRegisterForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Buat toko baru dan otomatis menjadi Admin Utama.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Nama Toko / Kios'),
        TextField(
          controller: _regStoreNameCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration('Contoh: Minimarket Berkah'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Jenis Toko / Bisnis'),
        DropdownButtonFormField<String>(
          initialValue: _selectedStoreType,
          dropdownColor: const Color(0xFF111827),
          isExpanded: true,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration('— Pilih jenis bisnis —'),
          items: _buildStoreTypeItems(),
          onChanged: (val) => setState(() => _selectedStoreType = val),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Company ID (Opsional)'),
        TextField(
          controller: _regCompanyIdCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration('Hanya untuk holding / multi-cabang'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Username Admin'),
        TextField(
          controller: _regUserCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration('Contoh: admin'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Password'),
        TextField(
          controller: _regPassCtrl,
          obscureText: !_regShowPass,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration(
            'Minimal 8 karakter',
            suffix: TextButton(
              onPressed: () => setState(() => _regShowPass = !_regShowPass),
              child: Text(_regShowPass ? 'Sembunyi' : 'Lihat', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Konfirmasi Password'),
        TextField(
          controller: _regPassConfirmCtrl,
          obscureText: !_regShowPassConfirm,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: _inputDecoration(
            'Ulangi password',
            suffix: TextButton(
              onPressed: () => setState(() => _regShowPassConfirm = !_regShowPassConfirm),
              child: Text(_regShowPassConfirm ? 'Sembunyi' : 'Lihat', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ),
        const SizedBox(height: 20),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: _isLoading ? null : _handleRegisterStore,
            child: _isLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('DAFTAR & MASUK TOKO', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
          ),
        ),
      ],
    );
  }

  List<DropdownMenuItem<String>> _buildStoreTypeItems() {
    final List<DropdownMenuItem<String>> items = [];
    _storeTypesGrouped.forEach((category, types) {
      for (final t in types) {
        items.add(
          DropdownMenuItem<String>(
            value: t.replaceAll(RegExp(r'^[^\w\s]+ '), ''), // strip emoji for clean DB storage
            child: Text(t, style: const TextStyle(fontSize: 13, color: Colors.white)),
          ),
        );
      }
    });
    return items;
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFFCBD5E1),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
      filled: true,
      fillColor: const Color(0xFF090D16),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF1E293B)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF1E293B)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
      ),
      suffixIcon: suffix,
    );
  }
}
