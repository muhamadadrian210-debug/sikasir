const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const router = express.Router();

/** Cek apakah admin sudah ada */
router.get('/status', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'"
    );
    const hasAdmin = rows[0].cnt > 0;
    res.json({ hasAdmin });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal cek status' });
  }
});

/** Buat admin pertama — hanya bisa kalau belum ada admin */
router.post('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'"
    );
    if (rows[0].cnt > 0) {
      return res.status(403).json({ error: 'Admin sudah ada. Setup tidak bisa diulang.' });
    }

    const { username, password } = req.body || {};
    const u = String(username || '').trim();
    const p = String(password || '');

    if (!u || u.length < 3 || u.length > 64) {
      return res.status(400).json({ error: 'Username 3–64 karakter' });
    }
    if (!/^[\p{L}\p{N} ._-]+$/u.test(u)) {
      return res.status(400).json({ error: 'Username hanya huruf, angka, spasi, titik, underscore, atau strip' });
    }
    if (p.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' });
    }

    const hash = await bcrypt.hash(p, 10);
    await pool.execute(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [u, hash, 'admin']
    );

    res.status(201).json({ ok: true, message: 'Admin berhasil dibuat. Silakan login.' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat admin' });
  }
});

module.exports = router;
