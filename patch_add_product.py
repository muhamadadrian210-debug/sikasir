with open('public/js/app.js', 'a', encoding='utf-8') as f:
    f.write('''
/* -------- Add Product 3 Options -------- */
function openAddProductOptions() {
  const modalId = 'modal-add-product-options';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px; text-align:center; padding:2rem;">
        <h3 style="margin-top:0; color:var(--primary);">Pendaftaran Produk Baru</h3>
        <p style="color:var(--text-light); margin-bottom:1.5rem;">Pilih metode pendaftaran yang paling mudah untuk Anda.</p>
        
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <button type="button" class="btn btn-primary" id="btn-opt-scan" style="padding:1rem; font-size:1.1rem; justify-content:center;">
            📷 Scan Barcode
          </button>
          
          <button type="button" class="btn btn-secondary" id="btn-opt-ai" style="padding:1rem; font-size:1.1rem; justify-content:center; background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #93c5fd; color:#1e40af;">
            ✨ AI Assistant
          </button>
          
          <button type="button" class="btn btn-secondary" id="btn-opt-manual" style="padding:1rem; font-size:1.1rem; justify-content:center;">
            ⌨️ Input Manual
          </button>
        </div>
        
        <button type="button" class="btn btn-danger" id="btn-opt-cancel" style="margin-top:1.5rem; width:100%;">Batal</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.classList.remove('open');
    modal.querySelector('#btn-opt-cancel').onclick = closeModal;

    const openEmptyForm = (p = { barcode: '', name: '', purchase_price: 0, sale_price: 0, stock: 0 }) => {
      closeModal();
      const el = document.getElementById('view-products');
      const wrap = document.createElement('div');
      wrap.innerHTML = productForm(p, false);
      el.querySelector('#prod-table-wrap').prepend(wrap);
      bindProductForm(wrap, null);
    };

    modal.querySelector('#btn-opt-manual').onclick = () => openEmptyForm();

    modal.querySelector('#btn-opt-scan').onclick = () => {
      closeModal();
      openScanModal((code) => {
        openEmptyForm({ barcode: code, name: '', purchase_price: 0, sale_price: 0, stock: 0 });
        closeScanModal();
      });
    };

    modal.querySelector('#btn-opt-ai').onclick = () => {
      closeModal();
      openAiProductModal();
    };
  }
  
  modal.classList.add('open');
}

function openAiProductModal() {
  const modalId = 'modal-add-product-ai';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:500px; padding:2rem;">
        <h3 style="margin-top:0; color:#1e40af;">✨ AI Assistant Registrasi</h3>
        <p style="color:var(--text-light); margin-bottom:1rem;">
          Ketikkan detail barang dengan gaya bahasa bebas. Contoh: <br/>
          <em>"Kopi kapal api sachet isi 10, modal 12rb, jual 1500, stok ada 50"</em>
        </p>
        
        <textarea id="ai-product-prompt" rows="4" style="width:100%; padding:0.75rem; border:1px solid var(--border); border-radius:8px; resize:none; margin-bottom:1rem; font-family:inherit;" placeholder="Ketik detail produk..."></textarea>
        
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="btn-ai-prod-cancel">Batal</button>
          <button type="button" class="btn btn-primary" id="btn-ai-prod-process">Proses dengan AI</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.classList.remove('open');
    modal.querySelector('#btn-ai-prod-cancel').onclick = closeModal;

    modal.querySelector('#btn-ai-prod-process').onclick = async () => {
      const promptText = modal.querySelector('#ai-product-prompt').value.trim();
      if (!promptText) return showAlert('Ketikkan sesuatu terlebih dahulu.', 'warn');
      
      const btn = modal.querySelector('#btn-ai-prod-process');
      const originalText = btn.textContent;
      btn.textContent = 'Memproses... ⏳';
      btn.disabled = true;

      try {
        const data = await api('/ai/parse-product', {
          method: 'POST',
          body: { prompt: promptText }
        });
        
        closeModal();
        modal.querySelector('#ai-product-prompt').value = '';
        
        const el = document.getElementById('view-products');
        const wrap = document.createElement('div');
        wrap.innerHTML = productForm({ 
          barcode: data.barcode || '', 
          name: data.name || '', 
          purchase_price: data.purchase_price || 0, 
          sale_price: data.sale_price || 0, 
          stock: data.stock || 0 
        }, false);
        el.querySelector('#prod-table-wrap').prepend(wrap);
        bindProductForm(wrap, null);
        
        showAlert('AI berhasil mengekstrak data! Silakan periksa kembali sebelum menyimpan.', 'success');
      } catch (err) {
        showAlert(err.message || 'Gagal memproses AI', 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    };
  }
  
  modal.classList.add('open');
}
''')
