/**
 * Canonical provider adapter operations mapped to registry capabilities.
 */
const ProviderOperation = Object.freeze({
  CHARGE: "charge",
  VERIFY: "verify",
  REFUND: "refund",
  PAYOUT: "payout",
  WEBHOOK: "webhook",
});

const KNOWN_OPERATIONS = new Set(Object.values(ProviderOperation));

function normalizeOperation(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return KNOWN_OPERATIONS.has(key) ? key : null;
}

module.exports = {
  ProviderOperation,
  KNOWN_OPERATIONS,
  normalizeOperation,
};
