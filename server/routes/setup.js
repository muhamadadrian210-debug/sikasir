const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * Cek apakah setup sudah dilakukan.
 * Returns { hasAdmin: true } jika sudah ada minimal satu tenant.
 */
router.get('/status', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM tenants');
    const hasAdmin = rows[0].cnt > 0;
    res.json({ hasAdmin });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal cek status' });
  }
});

/**
 * Daftar semua tenant (untuk dropdown pilih toko di form register).
 */
router.get('/tenants', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, slug FROM tenants ORDER BY name');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat daftar toko' });
  }
});

/**
 * Buat tenant + admin pertama.
 * Body: { store_name, username, password }
 * Hanya bisa dijalankan jika belum ada tenant sama sekali.
 */
router.post('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM tenants');
    if (rows[0].cnt > 0) {
      return res.status(403).json({ error: 'Setup sudah dilakukan. Tidak bisa diulang.' });
    }

    const { store_name, username, password } = req.body || {};

    // Validasi store_name
    const sn = String(store_name || '').trim();
    if (!sn || sn.length < 2 || sn.length > 255) {
      return res.status(400).json({ error: 'Nama toko 2–255 karakter' });
    }

    // Validasi username
    const u = String(username || '').trim();
    if (!u || u.length < 3 || u.length > 64) {
      return res.status(400).json({ error: 'Username 3–64 karakter' });
    }
    if (!/^[\p{L}\p{N} ._-]+$/u.test(u)) {
      return res.status(400).json({
        error: 'Username hanya huruf, angka, spasi, titik, underscore, atau strip',
      });
    }

    // Validasi password
    const p = String(password || '');
    if (p.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' });
    }

    // Buat slug dari store_name
    const slug = sn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 128) || 'store';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Buat tenant
      const [tenantIns] = await conn.execute(
        'INSERT INTO tenants (name, slug) VALUES (?, ?)',
        [sn, slug]
      );
      const tenantId = tenantIns.insertId;

      // Buat admin
      const hash = await bcrypt.hash(p, 10);
      const [userIns] = await conn.execute(
        'INSERT INTO users (tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
        [tenantId, u, hash, 'admin']
      );

      await conn.commit();

      // Tambahkan kategori default
      const defaultCategories = ['Umum', 'Minuman', 'Makanan', 'Snack', 'Rokok', 'Kebersihan', 'Lainnya'];
      for (const cat of defaultCategories) {
        await conn.execute(
          'INSERT IGNORE INTO categories (tenant_id, name) VALUES (?, ?)',
          [tenantId, cat]
        );
      }

      res.status(201).json({
        ok: true,
        message: 'Setup berhasil. Silakan login.',
        tenant: { id: tenantId, name: sn, slug },
        user: { id: userIns.insertId, username: u, role: 'admin' },
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username atau nama toko sudah dipakai' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal setup' });
  }
});

module.exports = router;
