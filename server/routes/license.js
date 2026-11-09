const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authMiddleware, requireTenant } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/license/status
 * Ambil status masa aktif lisensi toko saat ini (untuk halaman Lisensi Key di web & apk)
 */
router.get('/status', authMiddleware, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        name, 
        subscription_start, 
        subscription_until, 
        license_code, 
        status,
        DATEDIFF(subscription_until, NOW()) AS days_remaining
      FROM tenants 
      WHERE id = ? 
      LIMIT 1
    `, [tenantId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Data toko tidak ditemukan' });
    }

    const t = rows[0];
    const days = t.days_remaining !== null ? Number(t.days_remaining) : null;
    const isExpired = days !== null && days < 0;
    const isNearExpiry = days !== null && days >= 0 && days <= 7;

    const supportPhone = '081338219957';
    const waText = `Halo Admin SiKasir, saya ingin memperpanjang lisensi toko "${t.name}". Mohon informasi tagihan & kode lisensi terbaru.`;
    const waUrl = `https://wa.me/6281338219957?text=${encodeURIComponent(waText)}`;

    res.json({
      success: true,
      tenant_id: t.id,
      store_name: t.name,
      subscription_start: t.subscription_start,
      subscription_until: t.subscription_until,
      days_remaining: days,
      is_expired: isExpired,
      is_near_expiry: isNearExpiry,
      license_code: t.license_code || 'SIV-TRIAL-30D',
      status: isExpired ? 'expired' : t.status,
      support_phone: supportPhone,
      support_whatsapp_url: waUrl,
    });
  } catch (err) {
    console.error('[license] Gagal membaca status lisensi:', err);
    res.status(500).json({ error: 'Gagal membaca status lisensi: ' + err.message });
  }
});

/**
 * POST /api/license/redeem
 * Input kode lisensi baru dari dalam aplikasi (web, PWA, APK)
 */
router.post('/redeem', authMiddleware, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { code } = req.body || {};
    const rawCode = String(code || '').trim().toUpperCase();

    if (!rawCode) {
      return res.status(400).json({ error: 'Kode lisensi wajib diisi' });
    }

    if (!rawCode.startsWith('SIV-')) {
      return res.status(400).json({
        error: 'Format lisensi salah. Kode resmi diawali dengan "SIV-" (contoh: SIV-30D-XXXXX-XXXXX)',
      });
    }

    // Cek apakah kode ada di database license_codes
    const [existingCodes] = await pool.execute(
      'SELECT id, code, duration_days, used_at, used_by_tenant_id FROM license_codes WHERE code = ? LIMIT 1',
      [rawCode]
    );

    let durationDays = 30;
    let licenseDbId = null;

    if (existingCodes.length > 0) {
      const c = existingCodes[0];
      if (c.used_at) {
        return res.status(400).json({
          error: `Kode lisensi ini sudah pernah digunakan pada ${new Date(c.used_at).toLocaleDateString('id-ID')}`,
        });
      }
      durationDays = c.duration_days;
      licenseDbId = c.id;
    } else {
      // Jika kode dibuat manual berbasis durasi: e.g. SIV-365D-..., SIV-90D-...
      if (rawCode.includes('365D') || rawCode.includes('1Y')) {
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
    }

    // Perpanjang masa aktif toko
    await pool.execute(`
      UPDATE tenants 
      SET 
        subscription_until = CASE 
          WHEN subscription_until IS NULL OR subscription_until < NOW() 
            THEN DATE_ADD(NOW(), INTERVAL ? DAY)
          ELSE DATE_ADD(subscription_until, INTERVAL ? DAY)
        END,
        license_code = ?,
        status = 'active'
      WHERE id = ?
    `, [durationDays, durationDays, rawCode, tenantId]);

    // Tandai kode sudah digunakan jika tercatat di license_codes
    if (licenseDbId) {
      await pool.execute(
        'UPDATE license_codes SET used_at = NOW(), used_by_tenant_id = ? WHERE id = ?',
        [tenantId, licenseDbId]
      );
    } else {
      // Catat penggunaan kode baru
      try {
        await pool.execute(
          'INSERT INTO license_codes (code, duration_days, used_at, used_by_tenant_id, notes) VALUES (?, ?, NOW(), ?, ?)',
          [rawCode, durationDays, tenantId, 'Redeem manual oleh tenant']
        );
      } catch {}
    }

    // Ambil data terbaru
    const [updatedRows] = await pool.execute(`
      SELECT 
        id, 
        name, 
        subscription_start, 
        subscription_until, 
        license_code, 
        status,
        DATEDIFF(subscription_until, NOW()) AS days_remaining
      FROM tenants 
      WHERE id = ?
    `, [tenantId]);

    const updated = updatedRows[0];
    const newDays = updated.days_remaining !== null ? Number(updated.days_remaining) : durationDays;

    console.log(`[license] Redeem sukses: Toko ID ${tenantId} (${updated.name}) +${durationDays} hari, sisa ${newDays} hari`);

    res.json({
      success: true,
      message: `Lisensi berhasil diaktifkan! Masa aktif toko bertambah ${durationDays} hari (Sisa ${newDays} hari).`,
      duration_days: durationDays,
      days_remaining: newDays,
      subscription_until: updated.subscription_until,
      license_code: rawCode,
    });
  } catch (err) {
    console.error('[license] Gagal redeem kode:', err);
    res.status(500).json({ error: 'Gagal mengaktifkan kode lisensi: ' + err.message });
  }
});

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

    if (!rawCode.startsWith('SIV-') && rawCode.length < 5) {
      return res.status(400).json({ 
        error: 'Format kode lisensi tidak valid. Kode resmi Sivilize diawali dengan SIV- (contoh: SIV-30D-XXXXX)' 
      });
    }

    let durationDays = 30;
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

    let cleanStoreName = String(store_name || '').trim();
    if (!cleanStoreName) {
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

    let tenantId = null;
    const [existingTenants] = await pool.execute(
      'SELECT id, name FROM tenants WHERE name LIKE ? LIMIT 1',
      [`%${cleanStoreName}%`]
    );

    if (existingTenants.length > 0) {
      tenantId = existingTenants[0].id;
      await pool.execute(`
        UPDATE tenants 
        SET 
          subscription_until = CASE 
            WHEN subscription_until IS NULL OR subscription_until < NOW() 
              THEN DATE_ADD(NOW(), INTERVAL ? DAY)
            ELSE DATE_ADD(subscription_until, INTERVAL ? DAY)
          END,
          license_code = ?,
          status = 'active'
        WHERE id = ?
      `, [durationDays, durationDays, rawCode, tenantId]);
    } else {
      const [newT] = await pool.execute(`
        INSERT INTO tenants (name, slug, subscription_start, subscription_until, license_code, status) 
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?, 'active')
      `, [fullStoreName, slug, durationDays, rawCode]);
      tenantId = newT.insertId;
    }

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
