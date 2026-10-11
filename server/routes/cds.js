const express = require('express');
const router = express.Router();

// In-memory active cart state per tenant for zero-latency Customer Display
const activeCdsStates = new Map();

/**
 * Kasir POS updates live cart to Customer Display
 */
router.post('/update', (req, res) => {
  try {
    const {
      tenant_id = 'default',
      store_name = 'SiKasir Store',
      items = [],
      subtotal = 0,
      discount = 0,
      tax = 0,
      total = 0,
      table_number = '',
      is_paying = false,
      payment_method = 'CASH',
      qris_payload = '',
      verification_code = '',
    } = req.body || {};

    activeCdsStates.set(tenant_id, {
      store_name,
      items,
      subtotal,
      discount,
      tax,
      total,
      table_number,
      is_paying,
      payment_method,
      qris_payload,
      verification_code,
      updated_at: Date.now(),
    });

    res.json({ success: true, message: 'CDS state updated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update CDS' });
  }
});

/**
 * Customer Display web client polls current live cart state
 */
router.get('/state', (req, res) => {
  const tenant_id = req.query.tenant_id || 'default';
  const state = activeCdsStates.get(tenant_id) || {
    store_name: 'SiKasir Store',
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    table_number: '',
    is_paying: false,
    payment_method: 'CASH',
    qris_payload: '',
    verification_code: '',
    updated_at: Date.now(),
  };

  // If idle for more than 5 minutes with no items, reset is_paying
  if (Date.now() - state.updated_at > 300000 && (!state.items || state.items.length === 0)) {
    state.is_paying = false;
  }

  res.json(state);
});

/**
 * Clear customer display when transaction finishes
 */
router.post('/clear', (req, res) => {
  const { tenant_id = 'default', store_name = 'SiKasir Store' } = req.body || {};
  activeCdsStates.set(tenant_id, {
    store_name,
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    table_number: '',
    is_paying: false,
    payment_method: 'CASH',
    qris_payload: '',
    verification_code: '',
    updated_at: Date.now(),
  });
  res.json({ success: true, message: 'CDS cleared' });
});

module.exports = router;
