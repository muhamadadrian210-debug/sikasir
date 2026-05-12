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
      'SELECT id, tenant_id, username, password_hash, role FROM users WHERE username = ? LIMIT 1',
      [String(username).trim()]
    );

    if (!rows.length) {
      const fail = await recordLoginFailure(ip);
      if (fail.locked) {
        return res.status(429).json({
          error: 'Terlalu banyak percobaan gagal. Coba lagi setelah 1 jam.',
        });
      }
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
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
      user: { id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, tenant_id, username, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat profil' });
  }
});

module.exports = router;
