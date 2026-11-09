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
        plan_tier,
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

    // Hitung otomatis paket layanan & fitur sesuai durasi yang dibayar
    let planTier = t.plan_tier;
    if (!planTier || planTier === 'BASIC') {
      const code = String(t.license_code || '').toUpperCase();
      if (code.includes('365D') || code.includes('1Y') || code.includes('ENTERPRISE')) {
        planTier = 'ENTERPRISE';
      } else if (code.includes('180D') || code.includes('6M') || code.includes('PRO')) {
        planTier = 'PRO';
      } else {
        planTier = 'BASIC';
      }
    }

    const tierConfig = {
      BASIC: {
        code: 'BASIC',
        name: 'Paket 1 Bulan (Operasional Standar)',
        price: 300000,
        features: {
          pos: true,
          dinein: true,
          kds: true,
          products: true,
          stock: true,
          incoming: true,
          expenses: true,
          reports: true,
          history: true,
          ai_assistant: false,
          void_transaction: false,
          kasbon: false,
          users_manage: false,
          mutasi_cabang: false,
          cybersecurity: false,
          export_excel: false,
        }
      },
      PRO: {
        code: 'PRO',
        name: 'Paket 6 Bulan (Pro Business)',
        price: 600000,
        features: {
          pos: true,
          dinein: true,
          kds: true,
          products: true,
          stock: true,
          incoming: true,
          expenses: true,
          reports: true,
          history: true,
          ai_assistant: true,
          void_transaction: true,
          kasbon: true,
          users_manage: true,
          mutasi_cabang: false,
          cybersecurity: false,
          export_excel: false,
        }
      },
      ENTERPRISE: {
        code: 'ENTERPRISE',
        name: 'Paket 1 Tahun (Enterprise Unlimited)',
        price: 1200000,
        features: {
          pos: true,
          dinein: true,
          kds: true,
          products: true,
          stock: true,
          incoming: true,
          expenses: true,
          reports: true,
          history: true,
          ai_assistant: true,
          void_transaction: true,
          kasbon: true,
          users_manage: true,
          mutasi_cabang: true,
          cybersecurity: true,
          export_excel: true,
        }
      }
    };

    const currentTier = tierConfig[planTier] || tierConfig.BASIC;

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
      is_frozen: t.status === 'frozen',
      license_code: t.license_code || 'SIV-TRIAL-30D',
      plan_tier: planTier,
      plan_name: currentTier.name,
      features: currentTier.features,
      status: t.status === 'frozen' ? 'frozen' : (isExpired ? 'expired' : t.status),
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

    // Tentukan paket layanan secara otomatis sesuai durasi hari
    let planTier = 'BASIC';
    if (durationDays >= 365) planTier = 'ENTERPRISE';
    else if (durationDays >= 180) planTier = 'PRO';

    // Perpanjang masa aktif toko & set plan_tier otomatis
    await pool.execute(`
      UPDATE tenants 
      SET 
        subscription_until = CASE 
          WHEN subscription_until IS NULL OR subscription_until < NOW() 
            THEN DATE_ADD(NOW(), INTERVAL ? DAY)
          ELSE DATE_ADD(subscription_until, INTERVAL ? DAY)
        END,
        license_code = ?,
        plan_tier = ?,
        status = 'active'
      WHERE id = ?
    `, [durationDays, durationDays, rawCode, planTier, tenantId]);

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

    let planTier = 'BASIC';
    if (durationDays >= 365) planTier = 'ENTERPRISE';
    else if (durationDays >= 180) planTier = 'PRO';

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
          plan_tier = ?,
          status = 'active'
        WHERE id = ?
      `, [durationDays, durationDays, rawCode, planTier, tenantId]);
    } else {
      const [newT] = await pool.execute(`
        INSERT INTO tenants (name, slug, subscription_start, subscription_until, license_code, plan_tier, status) 
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, 'active')
      `, [fullStoreName, slug, durationDays, rawCode, planTier]);
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

/**
 * GET /api/license/proof-status
 * Mengecek status bukti transfer yang pernah diunggah oleh toko ini
 */
router.get('/proof-status', authMiddleware, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        status, 
        package_duration_days, 
        transfer_amount, 
        ai_status,
        rejection_reason, 
        created_at, 
        approved_at
      FROM payment_proofs
      WHERE tenant_id = ?
      ORDER BY id DESC
      LIMIT 1
    `, [tenantId]);

    res.json({
      success: true,
      proof: rows.length > 0 ? rows[0] : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memeriksa status bukti: ' + err.message });
  }
});

/**
 * POST /api/license/upload-proof
 * Mengunggah bukti transfer (WebP terkompresi + metadata asli)
 */
router.post('/upload-proof', authMiddleware, requireTenant, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      image_data,
      package_duration_days = 30,
      raw_metadata = {},
      transfer_amount = 0,
      sender_name = '',
      sender_bank = '',
    } = req.body || {};

    if (!image_data) {
      return res.status(400).json({ error: 'Gambar bukti transfer wajib disertakan.' });
    }

    const [tRows] = await pool.execute('SELECT name FROM tenants WHERE id = ? LIMIT 1', [tenantId]);
    const storeName = tRows.length > 0 ? tRows[0].name : 'Toko Mitra';

    // 1. Kunci Kriptografi SHA-256 & Jejak Forensik Server yang Mustahil Dihapus
    const crypto = require('crypto');
    const imageSha256 = crypto.createHash('sha256').update(String(image_data)).digest('hex');
    const clientRealIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const serverTimestamp = new Date().toISOString();

    // 2. Deteksi Percobaan Penghapusan / Pelucutan Metadata
    const isMetadataStripped = !raw_metadata || 
      !raw_metadata.original_filename || 
      !raw_metadata.device_last_modified ||
      Number(raw_metadata.original_size_bytes || 0) < 3000;

    const enrichedMetadata = {
      ...(typeof raw_metadata === 'object' ? raw_metadata : {}),
      server_received_at: serverTimestamp,
      client_ip: clientRealIp,
      uploader_username: req.user.username,
      tenant_id: tenantId,
      sha256_checksum: imageSha256,
      metadata_tamper_flag: isMetadataStripped ? 'STRIPPED_OR_ANONYMIZED' : 'ORIGINAL_VERIFIED',
      forensic_fingerprint: {
        http_headers: {
          host: req.headers['host'],
          user_agent: req.headers['user-agent'],
          sec_ch_ua: req.headers['sec-ch-ua'] || 'none',
          accept_language: req.headers['accept-language'],
        },
        connection_ip: clientRealIp,
        recorded_at_epoch: Date.now(),
      },
      immutable_seal: true,
    };

    let aiStatus = isMetadataStripped ? 'SUSPICIOUS' : 'MANUAL_REVIEW';
    let aiVerification = {
      note: isMetadataStripped 
        ? 'Peringatan: Metadata file asli tidak terdeteksi atau telah dilucuti sebelum upload.' 
        : 'Menunggu review visual CEO',
      metadata_stripped: isMetadataStripped,
    };

    // Vision AI Quick Inspection jika key tersedia
    try {
      const { GoogleGenAI } = require('@google/genai');
      const apiKey = process.env.GEMINI_API_KEY || (process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',')[0].trim() : null);
      if (apiKey && image_data.includes('base64,')) {
        const base64Data = image_data.split('base64,')[1];
        const mimeMatch = image_data.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Analisis struk bukti transfer bank ini secara forensik dan teliti.
Rekening tujuan yang benar: Bank BRI, No Rek: 7485 0101 2399 501 / 748501012399501, Atas Nama: Muhamad Adrian.
Periksa secara mendalam:
1. Apakah angka nominal, tanggal, atau nama merupakan editan Photoshop, Canva, atau hasil generate AI (font tidak sejajar, pixel blur di sekitar teks, perbedaan ketebalan font)?
2. Apakah rekening tujuan cocok persis dengan BRI 7485 0101 2399 501 a.n Muhamad Adrian?

Jawab HANYA dalam JSON valid tanpa tanda markdown:
{
  "target_account_detected": "string",
  "target_account_matched": true/false,
  "target_name_detected": "string",
  "target_name_matched": true/false,
  "transfer_time_detected": "string",
  "transfer_amount_detected": 0,
  "tampering_detected": true/false,
  "tampering_reasons": "string alasan jika mencurigakan",
  "verdict": "MATCHED" | "SUSPICIOUS" | "UNCLEAR"
}`;

        const aiRes = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        });

        const rawText = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(rawText);
        aiVerification = {
          ...parsed,
          metadata_stripped: isMetadataStripped,
        };

        if (parsed.tampering_detected || parsed.verdict === 'SUSPICIOUS' || isMetadataStripped) {
          aiStatus = 'SUSPICIOUS';
        } else if (parsed.verdict === 'MATCHED' && parsed.target_account_matched && parsed.target_name_matched) {
          aiStatus = 'AI_MATCHED';
        }
      }
    } catch (aiErr) {
      console.warn('[AI Vision Proof Check] Skipped / manual fallback:', aiErr.message);
    }

    let finalAmount = Number(transfer_amount) || 0;
    const daysNum = parseInt(package_duration_days, 10) || 30;
    if (finalAmount <= 0) {
      if (daysNum >= 365) finalAmount = 1200000;
      else if (daysNum >= 180) finalAmount = 600000;
      else finalAmount = 300000;
    }

    const [insertResult] = await pool.execute(`
      INSERT INTO payment_proofs (
        tenant_id,
        store_name,
        sender_name,
        sender_bank,
        target_account,
        target_name,
        target_bank,
        transfer_amount,
        raw_metadata,
        ai_verification,
        ai_status,
        status,
        image_url,
        package_duration_days
      ) VALUES (?, ?, ?, ?, '748501012399501', 'Muhamad Adrian', 'BRI', ?, ?, ?, ?, 'PENDING', ?, ?)
    `, [
      tenantId,
      storeName,
      sender_name || 'Pelanggan',
      sender_bank || 'Bank',
      finalAmount,
      JSON.stringify(enrichedMetadata),
      JSON.stringify(aiVerification),
      aiStatus,
      image_data,
      daysNum
    ]);

    res.json({
      success: true,
      proof_id: insertResult.insertId,
      ai_status: aiStatus,
      message: 'Bukti transfer berhasil dikirim. Menunggu persetujuan CEO di dashboard.',
    });
  } catch (err) {
    console.error('[license] Upload proof error:', err);
    res.status(500).json({ error: 'Gagal mengunggah bukti transfer: ' + err.message });
  }
});

module.exports = router;
