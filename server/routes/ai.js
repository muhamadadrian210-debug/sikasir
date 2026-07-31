const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemInstruction = `
Kamu adalah SiKasir AI Assistant — Asisten Cerdas Manajemen Stok & Laporan Keuangan Supermarket/Minimarket.
Tugas utama kamu meliputi:
1. Mengelola dan meng-update stok barang (tambah restock atau kurangi stok).
2. Menginput produk/barang baru langsung ke database toko jika barang belum terdaftar.
3. Merekap laporan keuangan toko (Total Omset/Pendapatan, Total Modal/HPP, Untung Bersih/Laba, Jumlah Transaksi, dan Barang Terlaris) untuk periode: Hari Ini (today), Minggu Ini (this_week), Bulan Ini (this_month), Kuartal Ini (this_quarter), dan Tahun Ini (this_year).

Aturan Wajib:
- Tanggapi dalam Bahasa Indonesia yang ramah, jelas, profesional, dan rapi.
- Format seluruh nominal uang dengan format Rupiah yang rapi (contoh: Rp 250.000).
- Jika pengguna menanyakan seputar keuangan/penjualan/omset/keuntungan/rekap/laporan, GUNAKAN fungsi 'get_financial_report' dengan periode yang relevan.
- Jika pengguna ingin menambah stok barang yang sudah ada, GUNAKAN fungsi 'update_stock'.
- Jika pengguna ingin menambah barang baru yang belum ada, GUNAKAN fungsi 'add_new_product'.
`;

router.post('/chat', async (req, res) => {
  try {
    const tid = tenantId(req);
    const { prompt } = req.body;
    
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key Gemini belum diset di server.' });
    }

    // Fetch existing products for context
    const [products] = await pool.execute(
      'SELECT id, barcode, name, purchase_price, sale_price, stock FROM products WHERE tenant_id = ?',
      [tid]
    );

    const context = `
Daftar produk di toko saat ini (ID, Barcode, Nama, Harga Beli, Harga Jual, Stok):
${products.map(p => `- ID: ${p.id} | Barcode: ${p.barcode} | Nama: ${p.name} | Beli: Rp${p.purchase_price} | Jual: Rp${p.sale_price} | Stok: ${p.stock}`).join('\n')}

Perintah/Pertanyaan Pengguna: "${prompt}"
`;

    // Tool Declarations
    const tools = [{
      functionDeclarations: [
        {
          name: 'update_stock',
          description: 'Menambah atau mengurangi stok barang yang sudah terdaftar di toko.',
          parameters: {
            type: 'OBJECT',
            properties: {
              product_id: { type: 'INTEGER', description: 'ID produk dari daftar barang' },
              delta: { type: 'INTEGER', description: 'Jumlah perubahan. Angka positif untuk restock/tambah, negatif untuk keluar/terjual.' },
              reason: { type: 'STRING', description: 'Alasan perubahan stok (misal: "Restock stok baru", "Penyesuaian barang laku")' }
            },
            required: ['product_id', 'delta', 'reason']
          }
        },
        {
          name: 'add_new_product',
          description: 'Menambahkan barang/produk baru yang belum ada di daftar toko.',
          parameters: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Nama produk baru' },
              barcode: { type: 'STRING', description: 'Kode barcode/SKU (jika ada, jika tidak ada generate otomatis)' },
              purchase_price: { type: 'NUMBER', description: 'Harga beli/modal' },
              sale_price: { type: 'NUMBER', description: 'Harga jual ke konsumen' },
              stock: { type: 'INTEGER', description: 'Jumlah stok awal' }
            },
            required: ['name', 'sale_price', 'stock']
          }
        },
        {
          name: 'get_financial_report',
          description: 'Merekap laporan keuangan toko (Omset, Modal/HPP, Keuntungan Bersih, Jumlah Transaksi, & Barang Terlaris) berdasarkan periode waktu.',
          parameters: {
            type: 'OBJECT',
            properties: {
              period: { 
                type: 'STRING', 
                description: 'Periode waktu laporan: "today" (hari ini), "this_week" (minggu ini), "this_month" (bulan ini), "this_quarter" (kuartal/triwulan ini), "this_year" (tahun ini), atau "all_time" (keseluruhan).' 
              }
            },
            required: ['period']
          }
        }
      ]
    }];

    // Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
        temperature: 0.1
      }
    });

    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      
      // 1. UPDATE STOCK FUNCTION
      if (call.name === 'update_stock') {
        const { product_id, delta, reason } = call.args;
        
        const [r] = await pool.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ? AND stock + ? >= 0',
          [delta, product_id, tid, delta]
        );
        
        if (!r.affectedRows) {
          return res.json({ 
            reply: 'Maaf, update stok gagal. Pastikan stok tidak menjadi minus atau ID barang tidak ditemukan.' 
          });
        }

        try {
          await pool.execute(
            'INSERT INTO audit_logs (tenant_id, user_id, action, resource_meta) VALUES (?, ?, ?, ?)',
            [tid, req.user?.id || 0, 'ai.update_stock', JSON.stringify({ product_id, delta, reason })]
          );
        } catch (e) {
          console.error('Audit log error:', e);
        }

        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: context }] },
            { role: 'model', parts: [{ functionCall: call }] },
            { role: 'user', parts: [{ functionResponse: { name: 'update_stock', response: { success: true, product_id, new_delta: delta } } }] }
          ],
          config: { systemInstruction: systemInstruction }
        });

        return res.json({ 
          reply: finalResponse.text,
          actionPerformed: 'update_stock',
          product_id
        });
      }

      // 2. ADD NEW PRODUCT FUNCTION
      if (call.name === 'add_new_product') {
        let { name, barcode, purchase_price, sale_price, stock } = call.args;
        if (!barcode) {
          barcode = '899' + Math.floor(100000000 + Math.random() * 900000000);
        }
        purchase_price = Number(purchase_price || 0);
        sale_price = Number(sale_price || 0);
        stock = Number(stock || 0);

        const [ins] = await pool.execute(
          'INSERT INTO products (tenant_id, barcode, name, purchase_price, sale_price, stock) VALUES (?, ?, ?, ?, ?, ?)',
          [tid, barcode, name, purchase_price, sale_price, stock]
        );

        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: context }] },
            { role: 'model', parts: [{ functionCall: call }] },
            { role: 'user', parts: [{ functionResponse: { name: 'add_new_product', response: { success: true, product_id: ins.insertId, name, barcode, sale_price, stock } } }] }
          ],
          config: { systemInstruction: systemInstruction }
        });

        return res.json({
          reply: finalResponse.text,
          actionPerformed: 'add_new_product',
          product: { id: ins.insertId, barcode, name, purchase_price, sale_price, stock }
        });
      }

      // 3. GET FINANCIAL REPORT FUNCTION
      if (call.name === 'get_financial_report') {
        const { period } = call.args;
        
        let dateCondition = '1=1';
        let periodLabel = 'Keseluruhan';

        if (period === 'today') {
          dateCondition = 'DATE(t.created_at) = CURDATE()';
          periodLabel = 'Hari Ini (' + new Date().toLocaleDateString('id-ID') + ')';
        } else if (period === 'this_week') {
          dateCondition = 'YEARWEEK(t.created_at, 1) = YEARWEEK(CURDATE(), 1)';
          periodLabel = 'Minggu Ini';
        } else if (period === 'this_month') {
          dateCondition = 'YEAR(t.created_at) = YEAR(CURDATE()) AND MONTH(t.created_at) = MONTH(CURDATE())';
          periodLabel = 'Bulan Ini';
        } else if (period === 'this_quarter') {
          dateCondition = 'YEAR(t.created_at) = YEAR(CURDATE()) AND QUARTER(t.created_at) = QUARTER(CURDATE())';
          periodLabel = 'Kuartal Ini (Q' + Math.ceil((new Date().getMonth() + 1) / 3) + ' ' + new Date().getFullYear() + ')';
        } else if (period === 'this_year') {
          dateCondition = 'YEAR(t.created_at) = YEAR(CURDATE())';
          periodLabel = 'Tahun Ini (' + new Date().getFullYear() + ')';
        }

        // Summary query
        const [txRows] = await pool.execute(`
          SELECT 
            COUNT(t.id) as total_tx,
            COALESCE(SUM(t.total), 0) as total_omset,
            COALESCE(SUM(ti_cogs.cogs), 0) as total_cogs
          FROM transactions t
          LEFT JOIN (
            SELECT 
              ti.transaction_id,
              SUM(ti.qty * COALESCE(p.purchase_price, 0)) as cogs
            FROM transaction_items ti
            LEFT JOIN products p ON ti.product_id = p.id
            GROUP BY ti.transaction_id
          ) ti_cogs ON t.id = ti_cogs.transaction_id
          WHERE t.tenant_id = ? AND ${dateCondition}
        `, [tid]);

        const summary = txRows[0] || { total_tx: 0, total_omset: 0, total_cogs: 0 };
        const totalProfit = Number(summary.total_omset) - Number(summary.total_cogs);

        // Top 5 items query
        const [topProducts] = await pool.execute(`
          SELECT 
            p.name,
            SUM(ti.qty) as total_qty,
            SUM(ti.subtotal) as total_revenue
          FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          JOIN products p ON ti.product_id = p.id
          WHERE t.tenant_id = ? AND ${dateCondition}
          GROUP BY p.id, p.name
          ORDER BY total_qty DESC
          LIMIT 5
        `, [tid]);

        const reportData = {
          periode: periodLabel,
          jumlah_transaksi: summary.total_tx,
          total_omset: Number(summary.total_omset),
          total_modal: Number(summary.total_cogs),
          keuntungan_bersih: totalProfit,
          produk_terlaris: topProducts.map(tp => `${tp.name} (${tp.total_qty} pcs - Rp${Number(tp.total_revenue).toLocaleString('id-ID')})`)
        };

        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: context }] },
            { role: 'model', parts: [{ functionCall: call }] },
            { role: 'user', parts: [{ functionResponse: { name: 'get_financial_report', response: reportData } }] }
          ],
          config: { systemInstruction: systemInstruction }
        });

        return res.json({
          reply: finalResponse.text,
          actionPerformed: 'get_financial_report',
          data: reportData
        });
      }
    }

    return res.json({ reply: response.text });
    
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada AI Assistant: ' + err.message });
  }
});

router.post('/parse-product', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key Gemini belum diset.' });
    }

    const instruction = `
Kamu adalah asisten kasir cerdas. Tugasmu adalah mengekstrak informasi produk dari input pengguna ke dalam format JSON.
Format JSON yang harus kamu kembalikan persis seperti ini (tanpa markdown atau karakter tambahan di luar JSON):
{
  "name": "string (nama produk, kapitalisasi yang rapi)",
  "barcode": "string (jika disebutkan angka barcode/sku, jika tidak ada biarkan kosong '')",
  "purchase_price": "number (harga modal/beli, wajib angka tanpa titik/koma. Jika tidak ada, isi 0)",
  "sale_price": "number (harga jual, wajib angka tanpa titik/koma. Jika tidak ada, isi 0)",
  "stock": "number (jumlah barang, jika tidak disebutkan isi 0)"
}
Jika pengguna mengetik angka seperti "20k" atau "20 ribu", terjemahkan menjadi 20000.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: instruction,
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text.trim());
    return res.json(result);

  } catch (err) {
    console.error('AI Parse Product Error:', err);
    res.status(500).json({ error: 'Gagal mengekstrak data dari AI' });
  }
});

module.exports = router;
