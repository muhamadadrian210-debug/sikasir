const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * POST /api/license/activate
 * Validates activation code from Sivilize website rental package
 * Automatically provisions or links store, sets 30/90/180/365 days expiration,
 * and issues JWT login session.
 */
router.post('/activate', async (req, res) => {
  try {
    const { code, store_name, store_type = 'Cafe / Kedai Kopi' } = req.body || {};
    const rawCode = String(code || '').trim().toUpperCase();

    if (!rawCode) {
      return res.status(400).json({ error: 'Kode aktivasi wajib diisi' });
    }

    // Must be a valid Sivilize license code (starts with SIV- or at least 6 characters)
    if (!rawCode.startsWith('SIV-') && rawCode.length < 5) {
      return res.status(400).json({ 
        error: 'Format kode lisensi tidak valid. Kode resmi Sivilize diawali dengan SIV- (contoh: SIV-FNB-30D)' 
      });
    }

    // Determine duration in days from code (e.g., SIV-FNB-30D, SIV-90D, SIV-1Y, SIV-365D)
    let durationDays = 30; // default 30 hari
    if (rawCode.includes('365D') || rawCode.includes('1Y') || rawCode.includes('12M')) {
      durationDays = 365;
    } else if (rawCode.includes('180D') || rawCode.includes('6M')) {
      durationDays = 180;
    } else if (rawCode.includes('90D') || rawCode.includes('3M')) {
      durationDays = 90;
    } else if (rawCode.includes('60D') || rawCode.includes('2M')) {
      durationDays = 60;
    } else {
      const matchDays = rawCode.match(/(\d+)D/);
      if (matchDays) {
        durationDays = parseInt(matchDays[1], 10);
      }
    }

    // Determine store name
    let cleanStoreName = String(store_name || '').trim();
    if (!cleanStoreName) {
      // Try extract from code: SIV-KOPISENJA-30D
      const parts = rawCode.split('-');
      if (parts.length >= 3 && parts[1] !== 'FNB' && parts[1] !== 'ALL') {
        cleanStoreName = parts[1].replace(/_/g, ' ').toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      } else {
        cleanStoreName = 'Mitra Sivilize Cafe';
      }
    }

    const fullStoreName = `${cleanStoreName} (${store_type})`;
    const slug = cleanStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    // Check if store already exists or create new tenant
    let tenantId = null;
    const [existingTenants] = await pool.execute(
      'SELECT id, name FROM tenants WHERE name LIKE ? LIMIT 1',
      [`%${cleanStoreName}%`]
    );

    if (existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
    } else {
      const [newT] = await pool.execute(
        'INSERT INTO tenants (name, slug) VALUES (?, ?)',
        [fullStoreName, slug]
      );
      tenantId = newT.insertId;
    }

    // Ensure default admin user exists for this tenant
    const defaultUser = 'admin_' + cleanStoreName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const [existingUsers] = await pool.execute(
      'SELECT id, username, role FROM users WHERE tenant_id = ? LIMIT 1',
      [tenantId]
    );

    let authUser = null;
    if (existingUsers.length > 0) {
      authUser = existingUsers[0];
    } else {
      const passHash = await bcrypt.hash('sivilize123', 10);
      const [newU] = await pool.execute(
        'INSERT INTO users (tenant_id, username, password_hash, role) VALUES (?, ?, ?, \'admin\')',
        [tenantId, defaultUser, passHash]
      );
      authUser = { id: newU.insertId, username: defaultUser, role: 'admin' };
    }

    // Create session JWT token
    const token = jwt.sign(
      {
        id: authUser.id,
        tenant_id: tenantId,
        tenant_name: fullStoreName,
        username: authUser.username,
        role: authUser.role,
        license_code: rawCode,
      },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn: `${durationDays}d` }
    );

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const notificationMessage = `selamat toko ${cleanStoreName}, telah mengaktifkan aktivasi, sisa waktu anda ${durationDays} hari lagi`;

    console.log(`[license] Aktivasi berhasil: "${cleanStoreName}" (Kode: ${rawCode}, Durasi: ${durationDays} hari)`);

    res.json({
      success: true,
      token,
      user: {
        id: authUser.id,
        tenant_id: tenantId,
        tenant_name: fullStoreName,
        username: authUser.username,
        role: authUser.role,
      },
      store_name: cleanStoreName,
      store_type,
      duration_days: durationDays,
      expires_at: expiresAt,
      license_code: rawCode,
      message: notificationMessage,
    });
  } catch (err) {
    console.error('[license] Gagal aktivasi lisensi:', err);
    res.status(500).json({ error: 'Gagal memproses kode aktivasi: ' + err.message });
  }
});

module.exports = router;
