import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../providers/pos_provider.dart';
import '../theme/app_theme.dart';

class ModifierSelectorModal extends StatefulWidget {
  final Product product;
  final Function(List<ProductModifier> selectedModifiers, String? notes) onConfirm;

  const ModifierSelectorModal({
    super.key,
    required this.product,
    required this.onConfirm,
  });

  static Future<void> show(
    BuildContext context, {
    required Product product,
    required Function(List<ProductModifier> selectedModifiers, String? notes) onConfirm,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ModifierSelectorModal(
        product: product,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  State<ModifierSelectorModal> createState() => _ModifierSelectorModalState();
}

class _ModifierSelectorModalState extends State<ModifierSelectorModal> {
  final Set<ProductModifier> _selectedMods = {};
  final TextEditingController _notesCtrl = TextEditingController();
  final NumberFormat _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  double get _currentUnitPrice {
    final extra = _selectedMods.fold<double>(0.0, (sum, m) => sum + m.extraPrice);
    return widget.product.salePrice + extra;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        top: 20,
        left: 20,
        right: 20,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Product Header
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.restaurant_menu_rounded, color: AppColors.primaryDark, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.product.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Harga Dasar: ${_currency.format(widget.product.salePrice)}',
                      style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 28, color: AppColors.borderLight),

          // Modifiers section
          const Text(
            'PILIH VARIAN & TAMBAHAN (OPSIONAL)',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.textSecondary,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: widget.product.availableModifiers.map((mod) {
              final isSelected = _selectedMods.contains(mod);
              return FilterChip(
                label: Text(
                  mod.name + (mod.extraPrice > 0 ? ' (+${_currency.format(mod.extraPrice)})' : ''),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? AppColors.primaryDark : AppColors.textPrimary,
                  ),
                ),
                selected: isSelected,
                selectedColor: AppColors.primaryLight,
                backgroundColor: AppColors.surfaceVariant,
                checkmarkColor: AppColors.primaryDark,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(
                    color: isSelected ? AppColors.primary : AppColors.border,
                  ),
                ),
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedMods.add(mod);
                    } else {
                      _selectedMods.remove(mod);
                    }
                  });
                },
              );
            }).toList(),
          ),

          const SizedBox(height: 16),

          // Special Notes
          TextField(
            controller: _notesCtrl,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              labelText: 'Catatan Khusus (misal: jangan pedas / bungkus terpisah)',
              prefixIcon: const Icon(Icons.note_alt_outlined, size: 18, color: AppColors.textSecondary),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),

          const SizedBox(height: 20),

          // Total & Confirm Button
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Harga Satuan:', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    Text(
                      _currency.format(_currentUnitPrice),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                label: const Text('Masukkan Keranjang', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                onPressed: () {
                  Navigator.pop(context);
                  widget.onConfirm(
                    _selectedMods.toList(),
                    _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
