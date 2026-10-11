import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/services/api_service.dart';
import '../core/theme/app_theme.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<dynamic> _users = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().get('/users');
      if (res.statusCode == 200) {
        setState(() {
          _users = res.data is List ? res.data : [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal memuat pengguna: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddUserModal() {
    final userCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    String role = 'kasir';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Tambah Staf Kasir Baru', style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: userCtrl,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(labelText: 'Username Staff *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: passCtrl,
                obscureText: true,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(labelText: 'Password Akun *'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: role,
                dropdownColor: AppColors.surface,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                decoration: const InputDecoration(labelText: 'Hak Akses (Role)'),
                items: const [
                  DropdownMenuItem(value: 'kasir', child: Text('Kasir POS (Operasional Kasir)')),
                  DropdownMenuItem(value: 'admin', child: Text('Admin Utama (Akses Lengkap)')),
                ],
                onChanged: (val) => setModalState(() => role = val ?? 'kasir'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () async {
                final u = userCtrl.text.trim();
                final p = passCtrl.text;
                if (u.isEmpty || p.isEmpty) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Username dan password wajib diisi!')));
                  return;
                }

                try {
                  await ApiService().post('/users', data: {
                    'username': u,
                    'password': p,
                    'role': role,
                  });
                  if (ctx.mounted) {
                    Navigator.of(ctx).pop();
                    _fetchUsers();
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Gagal buat staf: $e')));
                  }
                }
              },
              child: const Text('Buat Akun Staf'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: const Text('Tambah Staf', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: _showAddUserModal,
      ),
      body: Column(
        children: [
          // Header Info
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Daftar Akun Kasir & Admin (${_users.length})',
                  style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                  onPressed: _fetchUsers,
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _users.isEmpty
                    ? const Center(child: Text('Belum ada data staf kasir', style: TextStyle(color: AppColors.textSecondary)))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                        itemCount: _users.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final u = _users[idx];
                          final isAdmin = u['role'] == 'admin';
                          final date = u['created_at'] != null ? DateTime.tryParse(u['created_at'].toString()) : null;

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: AppTheme.cardDecoration(),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: isAdmin ? const Color(0xFFE0F2FE) : AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    isAdmin ? Icons.admin_panel_settings_rounded : Icons.person_rounded,
                                    color: isAdmin ? const Color(0xFF0284C7) : AppColors.primaryDark,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        u['username'] ?? '',
                                        style: GoogleFonts.plusJakartaSans(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Terdaftar: ${date != null ? DateFormat('dd MMM yyyy').format(date) : '-'}',
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isAdmin ? const Color(0xFFE0F2FE) : AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    (u['role'] ?? 'kasir').toString().toUpperCase(),
                                    style: TextStyle(
                                      color: isAdmin ? const Color(0xFF0284C7) : AppColors.primaryDark,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
