const express = require('express');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
const { pool } = require('../config/db');
const { authMiddleware, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemInstruction = `
Kamu: SiKasir AI Assistant — Asisten Kasir Cerdas & Hemat.
Tugas:
1. Ubah stok barang (Restock delta > 0, Laku/Terjual delta < 0).
2. Tambah produk baru.
3. Rekap keuangan (Omset, Untung, Transaksi).

ATURAN RESPON (SANGAT SINGKAT & HEBAT TOKEN):
- JANGAN GUNAKAN KALIMAT FORMAL MAUPUN BASA-BASI.
- Tampilkan jawaban maksimal 2-3 baris ringkas.
- Konversi Grosir: 1 Bal/Press=100pcs, 1 Slop=10pcs, 1 Dus Mi=40pcs, 1 Dus Minuman=24pcs, 1 Lusin=12pcs.
`;

router.post('/chat', async (req, res) => {
  try {
    const tid = tenantId(req);
    const { prompt } = req.body;
    
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key Gemini belum diset di server.' });
    }

    const lower = prompt.toLowerCase();
    let productContext = '';

    // Smart Token Saver: Only load product context if user asks about products/stock
    if (!lower.includes('omset') && !lower.includes('keuangan') && !lower.includes('tutor')) {
      const [products] = await pool.execute(
        'SELECT id, barcode, name, purchase_price, sale_price, stock FROM products WHERE tenant_id = ? LIMIT 30',
        [tid]
      );
      if (products.length > 0) {
        productContext = `Produk Toko:\n` + products.map(p => `#${p.id} ${p.name} (Stok:${p.stock},Jual:${p.sale_price},Beli:${p.purchase_price})`).join('\n');
      }
    }

    const context = `${productContext}\nPerintah: "${prompt}"`;

    // Tool Declarations
    const tools = [{
      functionDeclarations: [
        {
          name: 'update_stock',
          description: 'Ubah stok barang (delta positif=restock, negatif=laku/terjual).',
          parameters: {
            type: 'OBJECT',
            properties: {
              product_id: { type: 'INTEGER', description: 'ID produk' },
              delta: { type: 'INTEGER', description: 'Delta stok (+/- pcs)' },
              reason: { type: 'STRING', description: 'Alasan singkat' }
            },
            required: ['product_id', 'delta', 'reason']
          }
        },
        {
          name: 'add_new_product',
          description: 'Tambah produk baru yang belum ada di toko.',
          parameters: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Nama produk baru' },
              barcode: { type: 'STRING', description: 'Barcode SKU' },
              purchase_price: { type: 'NUMBER', description: 'Harga beli' },
              sale_price: { type: 'NUMBER', description: 'Harga jual' },
              stock: { type: 'INTEGER', description: 'Stok eceran' }
            },
            required: ['name', 'sale_price', 'stock']
          }
        },
        {
          name: 'get_financial_report',
          description: 'Rekap keuangan toko (Omset, Untung, Transaksi).',
          parameters: {
            type: 'OBJECT',
            properties: {
              period: { 
                type: 'STRING', 
                description: 'Periode: "today", "this_week", "this_month", "this_year", "all_time".' 
              }
            },
            required: ['period']
          }
        }
      ]
    }];

    // Call Gemini with Token Savers (maxOutputTokens: 256)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
        temperature: 0.1,
        maxOutputTokens: 256
      }
    });

    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      
      // 1. UPDATE STOCK FUNCTION
      if (call.name === 'update_stock') {
        let { product_id, delta, reason } = call.args;
        product_id = Number(product_id);
        delta = isNaN(Number(delta)) ? 1 : Number(delta);
        
        const [r] = await pool.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ? AND stock + ? >= 0',
          [delta, product_id, tid, delta]
        );
        
        if (!r.affectedRows) {
          return res.json({ 
            reply: '❌ Gagal update stok. Pastikan stok tidak minus atau barang terdaftar.' 
          });
        }

        // Get updated product details
        const [updatedProd] = await pool.execute(
          'SELECT name, stock FROM products WHERE id = ? AND tenant_id = ?',
          [product_id, tid]
        );
        const pInfo = updatedProd[0] || { name: 'Produk', stock: 0 };

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
            { role: 'user', parts: [{ functionResponse: { name: 'update_stock', response: { success: true, product_name: pInfo.name, new_stock: pInfo.stock, delta } } }] }
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
        purchase_price = isNaN(Number(purchase_price)) ? 0 : Number(purchase_price);
        sale_price = isNaN(Number(sale_price)) ? 0 : Number(sale_price);
        stock = isNaN(Number(stock)) ? 1 : Number(stock);

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

        // Also query expenses/bayar nota for this period
        let expenseDateCond = dateCondition.replace(/t\.created_at/g, 'e.expense_date');
        const [expenseRows] = await pool.execute(`
          SELECT COALESCE(SUM(e.amount), 0) as total_expenses
          FROM expenses e
          WHERE e.tenant_id = ? AND ${expenseDateCond}
        `, [tid]).catch(() => [[{ total_expenses: 0 }]]);

        const totalExpenses = Number(expenseRows[0]?.total_expenses || 0);

        const summary = txRows[0] || { total_tx: 0, total_omset: 0, total_cogs: 0 };
        const grossProfit = Number(summary.total_omset) - Number(summary.total_cogs);
        const netProfit = grossProfit - totalExpenses;
        const netCashOmset = Number(summary.total_omset) - totalExpenses;

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
          total_omset_kotor: Number(summary.total_omset),
          total_bayar_nota_pengeluaran: totalExpenses,
          omset_bersih_kas: netCashOmset,
          keuntungan_bersih_akhir: netProfit,
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
  "purchase_price": "number (harga modal/beli eceran, wajib angka tanpa titik/koma. Jika tidak ada, isi 0)",
  "sale_price": "number (harga jual eceran, wajib angka tanpa titik/koma. Jika tidak ada, isi 0)",
  "stock": "number (jumlah total stok eceran/pcs. Jika 1 bal rokok isi 100, jika 1 dus mi isi 40, jika 1 slop isi 10, jika 1 lusin isi 12)"
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

router.post('/analyze-product-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada gambar yang diunggah' });
    }

    const base64Data = req.file.buffer.toString('base64');
    const defaultBarcode = `BRG-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0,14)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: req.file.mimetype,
              },
            },
            {
              text: 'Analisis gambar produk retail/F&B ini. Kembalikan data dalam format JSON berisi "name" (nama barang, singkat dan jelas, contoh: "Kecap Bango 520ml" atau "Kopi Susu Aren"). Jika ada barcode fisik yang terbaca, kembalikan di field "barcode". Jika tidak terbaca, jangan berikan field barcode. Jangan tulis format markdown tambahan, hanya kirim raw JSON.',
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiText = response.text || '{}';
    let data = {};
    try {
      data = JSON.parse(aiText);
    } catch(e) {
      const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    res.json({
      name: data.name || 'Barang Tidak Dikenali',
      barcode: data.barcode || defaultBarcode
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: 'Gagal menganalisis gambar' });
  }
});

module.exports = router;
