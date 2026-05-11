/**
 * Tenant helper middleware.
 *
 * Usage:
 *   const { tenantId } = require('../middleware/tenant');
 *   // inside a route handler:
 *   const tid = tenantId(req);  // returns req.user.tenant_id
 */

/**
 * Returns the tenant_id from the authenticated request.
 * Assumes authMiddleware has already run.
 * @param {import('express').Request} req
 * @returns {number}
 */
function tenantId(req) {
  return req.user?.tenant_id;
}

module.exports = { tenantId };
