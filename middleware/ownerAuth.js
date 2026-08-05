/**
 * @deprecated Use middleware/vendorAuth.authenticateVendor instead.
 * Re-exports unified vendor auth for backward-compatible imports.
 */
const { authenticateVendor, assertVendorResolved } = require("./vendorAuth");

module.exports = {
  authenticateVendor,
  authenticateUserOrSeller: authenticateVendor,
  authenticateSeller: authenticateVendor,
  assertVendorResolved,
};
