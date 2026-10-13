const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();
const SIVILIZE_SHARED_KEY = process.env.SIVILIZE_INTEGRATION_KEY || 'sivilize-ecosystem-2026-secret';

/**
 * Flexible Authenticator:
 * Accepts either:
 * 1. Bearer JWT (from SiKasir frontend app)
 * 2. Header `x-sivilize-key` matching SIVILIZE_SHARED_KEY (from Sivilize Dine Lite)
 */
async function resolveAuthOrIntegration(req, res, next) {
  const integrationKey = req.headers['x-sivilize-key'];
  if (integrationKey && integrationKey === SIVILIZE_SHARED_KEY) {
    req.isIntegration = true;
    return next();
  }

  const h = req.headers.authorization;
  const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
      req.user = payload;
      return next();
    } catch (err) {
      // Invalid token, fall through to 401
    }
  }

  return res.status(401).json({ error: 'Akses ditolak. Token autentikasi atau API Key integrasi diperlukan.' });
}

/**
 * Helper to resolve target tenant_id.
 * If user is logged in, use their tenant_id.
 * If call comes from Dine Lite integration, resolve by tenant_slug or find an FnB tenant or default tenant.
 */
async function resolveTenantId(req) {
  if (req.user && req.user.tenant_id) {
    return req.user.tenant_id;
  }

  const slug = req.body?.tenant_slug || req.query?.tenant_slug;
  if (slug) {
    const [rows] = await pool.execute('SELECT id FROM tenants WHERE slug = ? LIMIT 1', [slug]);
    if (rows.length > 0) return rows[0].id;
  }

  // Look for any tenant with FnB or cafe keyword
  const [fnbRows] = await pool.execute(
    "SELECT id FROM tenants WHERE name LIKE '%Cafe%' OR name LIKE '%Kopi%' OR name LIKE '%Makanan%' ORDER BY id DESC LIMIT 1"
  );
  if (fnbRows.length > 0) return fnbRows[0].id;

  // Fallback to first tenant
  const [anyRows] = await pool.execute('SELECT id FROM tenants ORDER BY id ASC LIMIT 1');
  return anyRows.length > 0 ? anyRows[0].id : 1;
}

// -------------------------------------------------------------
// 1. GET /api/dine-in/tables
// Returns active orders grouped by table for the POS "Cek Meja"
// -------------------------------------------------------------
router.get('/tables', resolveAuthOrIntegration, async (req, res) => {
  try {
    const tid = await resolveTenantId(req);
    const [rows] = await pool.execute(
      `SELECT id, order_code, table_number, customer_name, order_note, total_amount, status, items_json, created_at
       FROM dine_in_orders
       WHERE tenant_id = ? AND status IN ('pending', 'accepted', 'cooking', 'ready')
       ORDER BY created_at DESC`,
      [tid]
    );

    const formatted = rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json;
      } catch (e) {
        parsedItems = [];
      }
      return {
        id: r.id,
        order_code: r.order_code,
        table_number: r.table_number,
        customer_name: r.customer_name || 'Pelanggan Meja ' + r.table_number,
        order_note: r.order_note,
        total_amount: Number(r.total_amount),
        status: r.status,
        created_at: r.created_at,
        items: parsedItems,
      };
    });

    res.json({
      success: true,
      tenant_id: tid,
      count: formatted.length,
      orders: formatted,
    });
  } catch (err) {
    console.error('[dine-in] Gagal mengambil data meja:', err);
    res.status(500).json({ error: 'Gagal mengambil data meja' });
  }
});

// -------------------------------------------------------------
// 2. POST /api/dine-in/orders
// Called by Sivilize Dine Lite when customer orders at table:
// - Decrements stock in SiKasir products table atomically
// - Records order into dine_in_orders table
// - Returns updated stocks so Dine Lite knows availability
// -------------------------------------------------------------
router.post('/orders', resolveAuthOrIntegration, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const tid = await resolveTenantId(req);
    const { table_number, order_code, customer_name, order_note, total_amount, items } = req.body || {};

    if (!table_number) {
      return res.status(400).json({ error: 'Nomor meja wajib diisi' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Daftar menu pesanan tidak boleh kosong' });
    }

    const code = order_code || 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const total = Number(total_amount) || items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty || it.quantity) || 1), 0);

    await conn.beginTransaction();

    // Concurrency Lock Guard: Gunakan SELECT ... FOR UPDATE untuk mengunci baris produk
    // Jika 2 pelanggan memesan produk yang sama persis di milidetik yang sama saat stok sisa 1,
    // MySQL akan mengantrekan request kedua. Ketika request pertama commit (stok jadi 0),
    // request kedua membaca stok = 0 dan langsung di-reject 409 OUT_OF_STOCK tanpa overselling!
    for (const item of items) {
      const itemName = String(item.name || item.menu_name || '').trim();
      const qty = parseInt(item.qty || item.quantity || 1, 10);
      const barcode = item.barcode || '';

      if (itemName) {
        // Kunci baris produk secara eksklusif (Pessimistic Lock)
        const [rows] = await conn.execute(
          `SELECT id, name, stock, sale_price 
           FROM products 
           WHERE tenant_id = ? AND (name LIKE ? OR barcode = ?) 
           LIMIT 1 
           FOR UPDATE`,
          [tid, `%${itemName}%`, barcode]
        );

        if (rows.length > 0) {
          const prod = rows[0];
          // Validasi ketat sisa stok
          if (prod.stock < qty) {
            await conn.rollback();
            console.warn(`[dine-in conflict] Stok tidak cukup: "${prod.name}" sisa ${prod.stock}, diminta ${qty}`);
            return res.status(409).json({
              success: false,
              code: 'OUT_OF_STOCK',
              error: `Stok "${prod.name}" baru saja habis / tidak mencukupi (sisa ${prod.stock} pcs, diminta ${qty} pcs)`,
              item_name: prod.name,
              available_stock: prod.stock,
              requested_qty: qty,
            });
          }

          // Stok aman & terkunci eksklusif: potong stok
          await conn.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?',
            [qty, prod.id, tid]
          );
        }
      }
    }

    // Insert order into dine_in_orders
    const [ins] = await conn.execute(
      `INSERT INTO dine_in_orders (tenant_id, order_code, table_number, customer_name, order_note, total_amount, status, items_json)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [tid, code, String(table_number), customer_name || null, order_note || null, total, JSON.stringify(items)]
    );

    // Fetch updated stock for all items
    const [updatedStocks] = await conn.execute(
      'SELECT id, name, stock, sale_price FROM products WHERE tenant_id = ?',
      [tid]
    );

    await conn.commit();

    console.log(`[dine-in] Pesanan baru diterima: Meja ${table_number} (${code}) — Total: Rp ${total.toLocaleString('id-ID')}`);

    res.status(201).json({
      success: true,
      message: 'Pesanan meja berhasil dicatat dan stok SiKasir telah dikurangi otomatis',
      order_id: ins.insertId,
      order_code: code,
      table_number,
      total_amount: total,
      stocks: updatedStocks,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[dine-in] Gagal menyimpan pesanan:', err);
    res.status(500).json({ error: 'Gagal memproses pesanan meja di SiKasir: ' + err.message });
  } finally {
    conn.release();
  }
});

// -------------------------------------------------------------
// 3. POST /api/dine-in/settle
// Called by SiKasir cashier when payment is finished for Table X:
// - Marks order as 'paid' in dine_in_orders
// - Clears the active table status
// -------------------------------------------------------------
router.post('/settle', resolveAuthOrIntegration, async (req, res) => {
  try {
    const tid = await resolveTenantId(req);
    const { order_id, order_code, table_number } = req.body || {};

    let query = "UPDATE dine_in_orders SET status = 'paid' WHERE tenant_id = ? AND status != 'paid'";
    const params = [tid];

    if (order_id) {
      query += ' AND id = ?';
      params.push(order_id);
    } else if (order_code) {
      query += ' AND order_code = ?';
      params.push(order_code);
    } else if (table_number) {
      query += ' AND table_number = ?';
      params.push(String(table_number));
    } else {
      return res.status(400).json({ error: 'order_id, order_code, atau table_number wajib diberikan' });
    }

    const [result] = await pool.execute(query, params);

    // Optional webhook back to Dine Lite if URL is configured
    const dineLiteUrl = process.env.DINE_LITE_URL || 'http://localhost:3001';
    try {
      fetch(`${dineLiteUrl}/api/integration/sikasir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sivilize-key': SIVILIZE_SHARED_KEY,
        },
        body: JSON.stringify({
          action: 'mark_paid',
          order_code,
          table_number,
        }),
      }).catch(() => {});
    } catch (e) {
      // Fire-and-forget
    }

    res.json({
      success: true,
      message: `Meja ${table_number || ''} berhasil ditandai Lunas & Selesai`,
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('[dine-in] Gagal settle order:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan pesanan meja' });
  }
});

// -------------------------------------------------------------
// 4. POST /api/dine-in/sync-menu
// Called by Sivilize Dine Lite when an admin creates or edits a menu item:
// - Automatically upserts the product into SiKasir products table
// -------------------------------------------------------------
router.post('/sync-menu', resolveAuthOrIntegration, async (req, res) => {
  try {
    const tid = await resolveTenantId(req);
    const { name, price, category_name = 'Makanan & Minuman', slug } = req.body || {};

    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Nama menu wajib diisi' });
    }

    const salePrice = Number(price) || 0;
    const purchasePrice = Math.round(salePrice * 0.6); // Default 40% margin estimate

    // 1. Ensure category exists
    let categoryId = null;
    const [catRows] = await pool.execute(
      'SELECT id FROM categories WHERE tenant_id = ? AND name = ? LIMIT 1',
      [tid, category_name]
    );
    if (catRows.length > 0) {
      categoryId = catRows[0].id;
    } else {
      const [newCat] = await pool.execute(
        'INSERT INTO categories (tenant_id, name) VALUES (?, ?)',
        [tid, category_name]
      );
      categoryId = newCat.insertId;
    }

    // 2. Check if product exists by name
    const [prodRows] = await pool.execute(
      'SELECT id, barcode, stock FROM products WHERE tenant_id = ? AND name = ? LIMIT 1',
      [tid, cleanName]
    );

    if (prodRows.length > 0) {
      // Update existing
      const existing = prodRows[0];
      await pool.execute(
        `UPDATE products 
         SET sale_price = ?, category_id = ?, updated_at = NOW() 
         WHERE id = ? AND tenant_id = ?`,
        [salePrice, categoryId, existing.id, tid]
      );
      return res.json({
        success: true,
        action: 'updated',
        product_id: existing.id,
        name: cleanName,
        stock: existing.stock,
      });
    }

    // Insert new product
    const barcode = 'MNU-' + (slug || Math.random().toString(36).substring(2, 8)).toUpperCase();
    const defaultStock = 50; // Starter stock

    const [insProd] = await pool.execute(
      `INSERT INTO products (tenant_id, barcode, name, purchase_price, sale_price, stock, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tid, barcode, cleanName, purchasePrice, salePrice, defaultStock, categoryId]
    );

    console.log(`[dine-in] Menu baru dicangkokkan ke SiKasir: "${cleanName}" (Barcode: ${barcode}, Rp ${salePrice})`);

    res.status(201).json({
      success: true,
      action: 'created',
      product_id: insProd.insertId,
      barcode,
      name: cleanName,
      stock: defaultStock,
    });
  } catch (err) {
    console.error('[dine-in] Gagal sync menu ke SiKasir:', err);
    res.status(500).json({ error: 'Gagal mensinkronkan menu ke SiKasir: ' + err.message });
  }
});

// -------------------------------------------------------------
// 5. GET /api/dine-in/stocks
// Returns all product stock levels from SiKasir to Dine Lite:
// Allows Dine Lite to mark items as "Habis" or "Sisa X porsi"
// -------------------------------------------------------------
router.get('/stocks', resolveAuthOrIntegration, async (req, res) => {
  try {
    const tid = await resolveTenantId(req);
    const [rows] = await pool.execute(
      'SELECT id, name, barcode, stock, sale_price FROM products WHERE tenant_id = ? ORDER BY name ASC',
      [tid]
    );

    const mapped = rows.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      stock: p.stock,
      price: Number(p.sale_price),
      is_out_of_stock: p.stock <= 0,
      is_low_stock: p.stock > 0 && p.stock <= 5,
    }));

    res.json({
      success: true,
      tenant_id: tid,
      total_products: mapped.length,
      stocks: mapped,
    });
  } catch (err) {
    console.error('[dine-in] Gagal mengambil stok:', err);
    res.status(500).json({ error: 'Gagal mengambil data stok' });
  }
});

module.exports = router;
