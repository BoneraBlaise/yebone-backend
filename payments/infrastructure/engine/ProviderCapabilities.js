/**
 * Provider capability definitions — metadata-only operation matrix.
 * Used by ProviderRegistry descriptors; no provider API calls.
 */
const ProviderCapability = Object.freeze({
  PAYMENTS: "PAYMENTS",
  REFUNDS: "REFUNDS",
  PAYOUTS: "PAYOUTS",
  WEBHOOKS: "WEBHOOKS",
  SUBSCRIPTIONS: "SUBSCRIPTIONS",
  ESCROW: "ESCROW",
  WALLET: "WALLET",
});

const KNOWN_CAPABILITIES = new Set(Object.values(ProviderCapability));

const CAPABILITY_ALIASES = Object.freeze({
  PAYMENT: ProviderCapability.PAYMENTS,
  PAYMENTS: ProviderCapability.PAYMENTS,
  REFUND: ProviderCapability.REFUNDS,
  REFUNDS: ProviderCapability.REFUNDS,
  PAYOUT: ProviderCapability.PAYOUTS,
  PAYOUTS: ProviderCapability.PAYOUTS,
  WEBHOOK: ProviderCapability.WEBHOOKS,
  WEBHOOKS: ProviderCapability.WEBHOOKS,
  SUBSCRIPTION: ProviderCapability.SUBSCRIPTIONS,
  SUBSCRIPTIONS: ProviderCapability.SUBSCRIPTIONS,
  ESCROW: ProviderCapability.ESCROW,
  WALLET: ProviderCapability.WALLET,
});

function normalizeCapability(value) {
  const key = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();
  return CAPABILITY_ALIASES[key] || null;
}

function normalizeCapabilityList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized = values
    .map((value) => normalizeCapability(value))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function supports(capabilities, operation) {
  const capability = normalizeCapability(operation);
  if (!capability) {
    return false;
  }
  return Array.isArray(capabilities) && capabilities.includes(capability);
}

function isKnownCapability(value) {
  const normalized = normalizeCapability(value);
  return normalized !== null && KNOWN_CAPABILITIES.has(normalized);
}

module.exports = {
  ProviderCapability,
  KNOWN_CAPABILITIES,
  normalizeCapability,
  normalizeCapabilityList,
  supports,
  isKnownCapability,
};
