with open('public/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove closeScanModal from onPosScan
content = content.replace('async function onPosScan(code) {\n  closeScanModal();\n  try {', 'async function onPosScan(code) {\n  try {')

# 2. Update openScanModal success behavior
old_success = '''            <div style="
              background:linear-gradient(135deg,#eff6ff,#dbeafe);
              border:1px solid #93c5fd;border-radius:10px;
              padding:0.75rem 1rem;margin-top:0.5rem;
              display:flex;align-items:center;justify-content:space-between;gap:0.5rem;
            ">
              <div>
                <div style="font-weight:700;color:#1e3a5f;font-size:1rem;">✅ ${escapeHtml(p.name)}</div>
                <div style="font-size:0.85rem;color:#475569;margin-top:2px;">
                  Harga: <strong>${money(p.sale_price)}</strong> · Stok: ${p.stock}
                </div>
              </div>
              <div style="font-size:1.5rem;">🛒</div>
            </div>`;
          // Auto-close setelah 600ms supaya user sempat lihat
          setTimeout(() => {
            stopScanner();
            backdrop.classList.remove('open');
            scanCallback?.(code);
            scanCallback = null;
          }, 600);'''

new_success = '''            <div style="
              background:linear-gradient(135deg,#eff6ff,#dbeafe);
              border:1px solid #93c5fd;border-radius:10px;
              padding:0.75rem 1rem;margin-top:0.5rem;
              display:flex;align-items:center;justify-content:space-between;gap:0.5rem;
              animation: popIn 0.3s ease-out;
            ">
              <div>
                <div style="font-weight:700;color:#1e3a5f;font-size:1rem;">✅ ${escapeHtml(p.name)}</div>
                <div style="font-size:0.85rem;color:#475569;margin-top:2px;">
                  Harga: <strong>${money(p.sale_price)}</strong> · Stok: ${p.stock}
                </div>
              </div>
              <div style="font-size:1.5rem;">🛒</div>
            </div>`;
          // Langsung callback tanpa tutup kamera!
          scanCallback?.(code);'''

content = content.replace(old_success, new_success)

# 3. Update error behavior
old_error = '''          previewEl.innerHTML = `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:0.75rem 1rem;margin-top:0.5rem;color:#b91c1c;font-size:0.9rem;">
              ⚠️ Barcode <strong>${escapeHtml(code)}</strong> belum terdaftar
            </div>`;
          setTimeout(() => {
            stopScanner();
            backdrop.classList.remove('open');
            scanCallback?.(code);
            scanCallback = null;
          }, 800);'''

new_error = '''          previewEl.innerHTML = `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:0.75rem 1rem;margin-top:0.5rem;color:#b91c1c;font-size:0.9rem;animation: popIn 0.3s ease-out;">
              ⚠️ Barcode <strong>${escapeHtml(code)}</strong> belum terdaftar
            </div>`;'''

content = content.replace(old_error, new_error)

# 4. Remove fallback stopScanner block
old_fallback = '''      } else {
        stopScanner();
        backdrop.classList.remove('open');
        scanCallback?.(code);
        scanCallback = null;
      }
    } catch {
      stopScanner();
      backdrop.classList.remove('open');
      scanCallback?.(code);
      scanCallback = null;
    }'''

new_fallback = '''      } else {
        scanCallback?.(code);
      }
    } catch {
      scanCallback?.(code);
    }'''

content = content.replace(old_fallback, new_fallback)


with open('public/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
