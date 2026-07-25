const DISPUTE_STATES = Object.freeze([
  "OPEN",
  "UNDER_REVIEW",
  "SELLER_RESPONSE",
  "BUYER_RESPONSE",
  "RESOLVED",
  "REFUNDED",
  "REJECTED",
  "CLOSED",
]);

const ESCROW_STATES = Object.freeze([
  "PENDING",
  "FUNDS_HELD",
  "DELIVERY_CONFIRMED",
  "READY_FOR_RELEASE",
  "RELEASED",
  "REFUND_PENDING",
  "REFUNDED",
]);

const VERIFICATION_STATUSES = Object.freeze([
  "Pending",
  "Submitted",
  "Under Review",
  "Verified",
  "Rejected",
  "Expired",
]);

const VERIFICATION_TYPES = Object.freeze([
  "Identity",
  "Phone",
  "Email",
  "Business",
  "Address",
  "National ID",
]);

const SUBJECT_TYPES = Object.freeze(["customer", "vendor", "agency"]);

const FRAUD_RISK_LEVELS = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const PROTECTION_STATUSES = Object.freeze([
  "eligible",
  "active",
  "claimed",
  "expired",
  "revoked",
]);

const DEFAULT_POLICIES = Object.freeze({
  protectionDurationDays: 30,
  maximumClaimPeriodDays: 14,
  eligibleCategories: ["electronics", "fashion", "home", "general"],
  refundRules: {
    fullRefundWithinDays: 7,
    partialRefundAllowed: true,
    requireVerification: false,
  },
  verificationRequirements: {
    customerMinimum: ["Email"],
    vendorMinimum: ["Identity", "Business"],
    agencyMinimum: ["Business", "Address"],
  },
  escrowReleaseDelayHours: 48,
});

const DEFAULT_TRUST_WEIGHTS = Object.freeze({
  successfulOrders: 25,
  cancelledOrders: -10,
  refundRate: -20,
  disputeRate: -25,
  verificationLevel: 15,
  accountAge: 10,
  averageRating: 15,
  policyViolations: -30,
});

const TrustBuyerProtectionSettingsDefaults = Object.freeze({
  enabled: true,
  buyerProtection: { enabled: true },
  disputes: { enabled: true },
  escrow: { enabled: true },
  verification: { enabled: true },
  trustScore: { enabled: true },
  fraud: { enabled: true },
  policies: { enabled: true },
  analytics: { enabled: true },
  policiesConfig: { ...DEFAULT_POLICIES },
  trustWeights: { ...DEFAULT_TRUST_WEIGHTS },
});

module.exports = {
  DISPUTE_STATES,
  ESCROW_STATES,
  VERIFICATION_STATUSES,
  VERIFICATION_TYPES,
  SUBJECT_TYPES,
  FRAUD_RISK_LEVELS,
  PROTECTION_STATUSES,
  DEFAULT_POLICIES,
  DEFAULT_TRUST_WEIGHTS,
  TrustBuyerProtectionSettingsDefaults,
};
