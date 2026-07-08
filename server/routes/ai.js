const express = require('express');
const { pool } = require('../config/db');
const { authMiddleware, requireTenant } = require('../middleware/auth');
const { tenantId } = require('../middleware/tenant');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();
router.use(authMiddleware);
router.use(requireTenant);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System instruction to strictly limit AI behavior
const systemInstruction = `
Kamu adalah SiKasir AI Assistant. Tugas utamamu HANYA SATU: Mengupdate stok barang (menambah atau mengurangi) berdasarkan laporan dari staf.
Patuhi aturan ini dengan mutlak:
1. Jika pengguna meminta bantuan stok, gunakan fungsi update_stock.
2. Jika pengguna menanyakan hal lain (misal: lelucon, cuaca, cara masak, dll) atau memberikan perintah merusak (hapus database), kamu WAJIB menolak dengan sopan dan berkata: "Maaf, saya hanya ditugaskan untuk membantu pencatatan stok dan penjualan barang."
3. Saat mencari barang, cocokan nama barang dari deskripsi pengguna dengan daftar barang yang tersedia.
`;

router.post('/chat', async (req, res) => {
  try {
    const tid = tenantId(req);
    const { prompt } = req.body;
    
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key Gemini belum diset di server.' });
    }

    // 1. Fetch available products to give context to Gemini
    const [products] = await pool.execute(
      'SELECT id, barcode, name, stock FROM products WHERE tenant_id = ?',
      [tid]
    );

    const context = `
Berikut adalah daftar barang yang ada di toko saat ini (ID, Barcode, Nama, Stok):
${products.map(p => `- ID: ${p.id} | Barcode: ${p.barcode} | Nama: ${p.name} | Stok: ${p.stock}`).join('\n')}

Perintah pengguna: "${prompt}"
`;

    // 2. Define the tool
    const tools = [{
      functionDeclarations: [{
        name: 'update_stock',
        description: 'Menambah atau mengurangi stok barang.',
        parameters: {
          type: 'OBJECT',
          properties: {
            product_id: { type: 'INTEGER', description: 'ID produk (harus angka)' },
            delta: { type: 'INTEGER', description: 'Jumlah perubahan. Gunakan angka positif untuk barang masuk, negatif untuk barang keluar/terjual.' },
            reason: { type: 'STRING', description: 'Alasan perubahan stok (misal: "Barang laku", "Restock 1 ball")' }
          },
          required: ['product_id', 'delta', 'reason']
        }
      }]
    }];

    // 3. Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
        temperature: 0.1
      }
    });

    // 4. Check if Gemini decided to call a function
    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'update_stock') {
        const { product_id, delta, reason } = call.args;
        
        // Execute the DB update
        const [r] = await pool.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ? AND stock + ? >= 0',
          [delta, product_id, tid, delta]
        );
        
        if (!r.affectedRows) {
          return res.json({ 
            reply: 'Maaf, update stok gagal. Pastikan stok tidak menjadi minus atau barang tidak ditemukan.' 
          });
        }

        // Log the change
        try {
          await pool.execute(
            'INSERT INTO audit_logs (tenant_id, user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
            [tid, req.user?.id || 0, 'ai.update_stock', 'product', product_id, JSON.stringify({ delta, reason })]
          );
        } catch (auditErr) {
          console.error('Gagal mencatat audit log AI:', auditErr);
        }

        // Give Gemini the function result to formulate a final reply
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: context }] },
            { role: 'model', parts: [{ functionCall: call }] },
            { role: 'user', parts: [{ functionResponse: { name: 'update_stock', response: { success: true, new_delta: delta } } }] }
          ],
          config: { systemInstruction: systemInstruction }
        });

        return res.json({ reply: finalResponse.text });
      }
    }

    // If no function called, just return the text reply
    return res.json({ reply: response.text });
    
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada AI Assistant' });
  }
});

module.exports = router;
