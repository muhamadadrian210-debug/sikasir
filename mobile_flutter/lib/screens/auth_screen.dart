import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

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

      if (res.statusCode == 200 && res.data != null && res.data['token'] != null) {
        await ApiService().setToken(res.data['token']);
        final prefs = await SharedPreferences.getInstance();
        if (res.data['user'] != null) {
          final tenantName = res.data['user']['tenant_name'] ?? '';
          await prefs.setString('tenant_name', tenantName);
        }
        widget.onLoginSuccess();
      } else {
        setState(() => _errorMessage = res.data?['error'] ?? 'Gagal masuk akun');
      }
    } on DioException catch (dioErr) {
      final serverMsg = dioErr.response?.data is Map ? dioErr.response?.data['error'] : null;
      setState(() => _errorMessage = serverMsg ?? 'Gagal menghubungi server (${dioErr.response?.statusCode ?? 'Koneksi Terputus'}). Silakan coba lagi.');
    } catch (e) {
      setState(() => _errorMessage = 'Gagal masuk: $e');
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

      if (res.statusCode == 201 && res.data != null && res.data['token'] != null) {
        await ApiService().setToken(res.data['token']);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('store_type', _selectedStoreType ?? '🛒 Minimarket');
        if (res.data['user'] != null) {
          final tenantName = res.data['user']['tenant_name'] ?? sn;
          await prefs.setString('tenant_name', tenantName);
        }
        widget.onLoginSuccess();
      } else {
        setState(() => _errorMessage = res.data?['error'] ?? 'Gagal mendaftar toko');
      }
    } on DioException catch (dioErr) {
      final serverMsg = dioErr.response?.data is Map ? dioErr.response?.data['error'] : null;
      setState(() => _errorMessage = serverMsg ?? 'Gagal mendaftar toko (${dioErr.response?.statusCode ?? 'Koneksi Terputus'}). Silakan coba lagi.');
    } catch (e) {
      setState(() => _errorMessage = 'Gagal mendaftar: $e');
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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.dns_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 10),
            Text(
              'Pengaturan Server Backend',
              style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ubah alamat API Server backend SiKasir jika berjalan di host / port lain:',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlCtrl,
              style: const TextStyle(fontSize: 13),
              decoration: const InputDecoration(hintText: 'https://sikasir-alpha.vercel.app/api'),
            ),
            const SizedBox(height: 12),
            const Text(
              'Preset Cepat:',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  label: const Text('☁️ Cloud Resmi (Vercel)', style: TextStyle(fontSize: 11, color: AppColors.primaryDark, fontWeight: FontWeight.bold)),
                  backgroundColor: AppColors.primaryLight,
                  onPressed: () => urlCtrl.text = 'https://sikasir-alpha.vercel.app/api',
                ),
                ActionChip(
                  label: const Text('💻 Localhost PC', style: TextStyle(fontSize: 11, color: AppColors.textPrimary)),
                  backgroundColor: AppColors.surfaceVariant,
                  onPressed: () => urlCtrl.text = 'http://127.0.0.1:3000/api',
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              final newUrl = urlCtrl.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiService().setBaseUrl(newUrl);
                if (mounted) {
                  setState(() => _errorMessage = null);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Server URL berhasil diubah ke: $newUrl'),
                      backgroundColor: AppColors.primary,
                    ),
                  );
                }
              }
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Simpan & Terapkan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: AppTheme.cardDecoration(
                shadows: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Brand Header (Majoo Clean POS Style)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.point_of_sale_rounded, color: Colors.white, size: 26),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'SiKasir',
                                style: GoogleFonts.plusJakartaSans(
                                  color: AppColors.textPrimary,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryLight,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'Pro POS',
                                  style: TextStyle(color: AppColors.primaryDark, fontSize: 10.5, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const Text(
                            'Sistem Kasir Pintar & Cloud Retail',
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 11.5, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Server connection settings button
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: _showServerSettingsDialog,
                      icon: const Icon(Icons.settings_outlined, size: 14, color: AppColors.textSecondary),
                      label: const Text(
                        'Ubah Server URL',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Top Tab Switcher
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: AppColors.primaryDark,
                      unselectedLabelColor: AppColors.textSecondary,
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
                        color: AppColors.dangerLight,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppColors.danger, fontSize: 12),
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
          style: const TextStyle(fontSize: 13),
          decoration: const InputDecoration(hintText: 'Kosongkan jika toko tunggal'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Username'),
        TextField(
          controller: _loginUserCtrl,
          style: const TextStyle(fontSize: 13),
          decoration: const InputDecoration(hintText: 'Username akun kasir Anda'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Password'),
        TextField(
          controller: _loginPassCtrl,
          obscureText: !_loginShowPass,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Password akun',
            suffixIcon: IconButton(
              icon: Icon(_loginShowPass ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 18),
              onPressed: () => setState(() => _loginShowPass = !_loginShowPass),
            ),
          ),
        ),
        const SizedBox(height: 20),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: _isLoading ? null : _handleLogin,
            child: _isLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('MASUK KE KASIR', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14)),
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
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Nama Toko / Kios'),
        TextField(
          controller: _regStoreNameCtrl,
          style: const TextStyle(fontSize: 13),
          decoration: const InputDecoration(hintText: 'Contoh: Minimarket Berkah'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Jenis Toko / Bisnis'),
        DropdownButtonFormField<String>(
          initialValue: _selectedStoreType,
          dropdownColor: AppColors.surface,
          isExpanded: true,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
          decoration: const InputDecoration(hintText: '— Pilih jenis bisnis —'),
          items: _buildStoreTypeItems(),
          onChanged: (val) => setState(() => _selectedStoreType = val),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Company ID (Opsional)'),
        TextField(
          controller: _regCompanyIdCtrl,
          style: const TextStyle(fontSize: 13),
          decoration: const InputDecoration(hintText: 'Hanya untuk holding / multi-cabang'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Username Admin'),
        TextField(
          controller: _regUserCtrl,
          style: const TextStyle(fontSize: 13),
          decoration: const InputDecoration(hintText: 'Contoh: admin'),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Password'),
        TextField(
          controller: _regPassCtrl,
          obscureText: !_regShowPass,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Minimal 8 karakter',
            suffixIcon: IconButton(
              icon: Icon(_regShowPass ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 18),
              onPressed: () => setState(() => _regShowPass = !_regShowPass),
            ),
          ),
        ),
        const SizedBox(height: 14),

        _buildFieldLabel('Konfirmasi Password'),
        TextField(
          controller: _regPassConfirmCtrl,
          obscureText: !_regShowPassConfirm,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Ulangi password',
            suffixIcon: IconButton(
              icon: Icon(_regShowPassConfirm ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 18),
              onPressed: () => setState(() => _regShowPassConfirm = !_regShowPassConfirm),
            ),
          ),
        ),
        const SizedBox(height: 20),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
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
            value: t.replaceAll(RegExp(r'^[^\w\s]+ '), ''),
            child: Text(t, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
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
          color: AppColors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
