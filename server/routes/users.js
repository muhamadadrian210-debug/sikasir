const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { auditAdmin } = require('../lib/audit');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, role, created_at FROM users ORDER BY role, username'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal memuat pengguna' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    const u = String(username || '').trim();
    const r = role === 'admin' ? 'admin' : 'kasir';
    if (!u || !password) return res.status(400).json({ error: 'Username dan password wajib' });
    const hash = await bcrypt.hash(String(password), 10);
    const [ins] = await pool.execute(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [u, hash, r]
    );
    await auditAdmin(req, 'user.create', { id: ins.insertId, username: u, role: r });
    res.status(201).json({ id: ins.insertId, username: u, role: r });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal menambah pengguna' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { username, password, role } = req.body || {};
    const u = String(username || '').trim();
    const r = role === 'admin' ? 'admin' : 'kasir';
    if (!u) return res.status(400).json({ error: 'Username wajib' });

    if (password && String(password).length > 0) {
      const hash = await bcrypt.hash(String(password), 10);
      const [rows] = await pool.execute(
        'UPDATE users SET username=?, password_hash=?, role=? WHERE id=?',
        [u, hash, r, id]
      );
      if (!rows.affectedRows) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    } else {
      const [rows] = await pool.execute('UPDATE users SET username=?, role=? WHERE id=?', [
        u,
        r,
        id,
      ]);
      if (!rows.affectedRows) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }
    await auditAdmin(req, 'user.update', { id });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    console.error(e);
    res.status(500).json({ error: 'Gagal memperbarui pengguna' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    }
    const [r] = await pool.execute('DELETE FROM users WHERE id=?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    await auditAdmin(req, 'user.delete', { id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal menghapus pengguna' });
  }
});

module.exports = router;
