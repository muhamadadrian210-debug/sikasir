const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { clientIp } = require('../lib/ipLists');
const { isLoginLocked, recordLoginFailure, clearLoginState } = require('../lib/loginBrute');

const router = express.Router();

/**
 * Pendaftaran kasir baru secara publik.
 * Memerlukan tenant_id (dari login sebelumnya tersimpan di localStorage)
 * ATAU bisa dinonaktifkan dengan PUBLIC_REGISTER=false.
 * Role selalu 'kasir' untuk pendaftaran publik.
 */
router.post('/register', async (req, res) => {
  try {
    if (process.env.PUBLIC_REGISTER === 'false') {
      return res.status(403).json({ error: 'Pendaftaran publik dinonaktifkan' });
    }

    const { username, password, tenant_id } = req.body || {};
    const u = String(username || '').trim();
    const p = String(password || '');
    const tid = parseInt(tenant_id, 10);

    if (!u || !p) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }
    if (u.length < 3 || u.length > 64) {
      return res.status(400).json({ error: 'Username 3–64 karakter' });
    }
    if (!/^[\p{L}\p{N} ._-]+$/u.test(u)) {
      return res.status(400).json({
        error: 'Username hanya huruf, angka, spasi, titik, underscore, atau strip',
      });
    }
    if (p.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' });
    }
    if (!tid || Number.isNaN(tid)) {
      return res.status(400).json({ error: 'Tenant tidak valid. Pastikan sudah ada toko yang terdaftar.' });
    }

    // Pastikan tenant ada
    const [tenantRows] = await pool.execute('SELECT id FROM tenants WHERE id = ?', [tid]);
    if (!tenantRows.length) {
      return res.status(400).json({ error: 'Toko tidak ditemukan.' });
    }

    const hash = await bcrypt.hash(p, 10);
    const [ins] = await pool.execute(
      'INSERT INTO users (tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [tid, u, hash, 'kasir']
    );

    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const token = jwt.sign(
      { id: ins.insertId, username: u, role: 'kasir', tenant_id: tid },
      secret,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { id: ins.insertId, username: u, role: 'kasir', tenant_id: tid },
    });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah dipakai di toko ini' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal mendaftar' });
  }
});

/**
 * Pendaftaran toko (tenant) baru beserta adminnya secara publik.
 */
router.post('/register-tenant', async (req, res) => {
  try {
    const { store_name, username, password } = req.body || {};
    const sn = String(store_name || '').trim();
    const u = String(username || '').trim();
    const p = String(password || '');

    if (!sn || !u || !p) {
      return res.status(400).json({ error: 'Nama toko, username, dan password wajib diisi' });
    }
    if (sn.length < 2 || sn.length > 255) {
      return res.status(400).json({ error: 'Nama toko 2–255 karakter' });
    }
    if (u.length < 3 || u.length > 64) {
      return res.status(400).json({ error: 'Username 3–64 karakter' });
    }
    if (!/^[\p{L}\p{N} ._-]+$/u.test(u)) {
      return res.status(400).json({
        error: 'Username hanya huruf, angka, spasi, titik, underscore, atau strip',
      });
    }
    if (p.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' });
    }

    // Buat slug unik
    let slug = sn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'store';

    const [dup] = await pool.execute('SELECT id FROM tenants WHERE slug = ? LIMIT 1', [slug]);
    if (dup.length > 0) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

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

      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
      const token = jwt.sign(
        { id: userIns.insertId, username: u, role: 'admin', tenant_id: tenantId },
        secret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: userIns.insertId, username: u, role: 'admin', tenant_id: tenantId, tenant_name: sn },
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(e.code)) {
      console.error('[register-tenant] Database tidak tersambung:', e.message);
      return res.status(503).json({ error: 'Database belum tersambung. Coba lagi sebentar atau periksa koneksi server.' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal mendaftar toko' });
  }
});

/**
 * Login — mencari user secara global berdasarkan username,
 * lalu menyertakan tenant_id dalam JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const ip = clientIp(req);
    if (isLoginLocked(ip)) {
      return res.status(429).json({
        error: 'Terlalu banyak percobaan gagal. Coba lagi setelah 1 jam.',
      });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const [rows] = await pool.execute(
      `SELECT u.id, u.tenant_id, u.username, u.password_hash, u.role, t.name AS tenant_name 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.username = ? LIMIT 1`,
      [String(username).trim()]
    );

    let user = null;
    let ok = false;
    if (rows.length) {
      user = rows[0];
      ok = await bcrypt.compare(password, user.password_hash);
    }

    if (!user) {
      const fail = await recordLoginFailure(ip);
      if (fail.locked) {
        return res.status(429).json({
          error: 'Terlalu banyak percobaan gagal. Coba lagi setelah 1 jam.',
        });
      }
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    if (!ok) {
      const r = await recordLoginFailure(ip);
      if (r.locked) {
        return res.status(429).json({
          error: 'Terlalu banyak percobaan gagal. Coba lagi setelah 1 jam.',
        });
      }
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    clearLoginState(ip);

    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
      secret,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id, tenant_name: user.tenant_name },
    });
  } catch (e) {
    if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(e.code)) {
      console.error('[login] Database tidak tersambung:', e.message);
      return res.status(503).json({ error: 'Database belum tersambung. Coba lagi sebentar atau periksa koneksi server.' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.tenant_id, u.username, u.role, u.created_at, t.name AS tenant_name 
       FROM users u 
       JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );
    const userRecord = rows[0] || null;

    if (!userRecord) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    res.json(userRecord);
  } catch (e) {
    if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(e.code)) {
      console.error('[me] Database tidak tersambung:', e.message);
      return res.status(503).json({ error: 'Database belum tersambung. Coba lagi sebentar atau periksa koneksi server.' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat profil' });
  }
});

module.exports = router;
