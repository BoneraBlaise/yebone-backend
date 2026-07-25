const { DISPUTE_STATES } = require("../TrustBuyerProtectionSettingsDefaults");

const TRANSITIONS = Object.freeze({
  OPEN: ["UNDER_REVIEW", "CLOSED"],
  UNDER_REVIEW: ["SELLER_RESPONSE", "BUYER_RESPONSE", "RESOLVED", "REJECTED", "CLOSED"],
  SELLER_RESPONSE: ["UNDER_REVIEW", "BUYER_RESPONSE", "RESOLVED", "REJECTED"],
  BUYER_RESPONSE: ["UNDER_REVIEW", "SELLER_RESPONSE", "RESOLVED", "REJECTED"],
  RESOLVED: ["REFUNDED", "CLOSED"],
  REFUNDED: ["CLOSED"],
  REJECTED: ["CLOSED"],
  CLOSED: [],
});

class DisputeStateMachine {
  static canTransition(from, to) {
    const allowed = TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  static assertTransition(from, to) {
    if (!DISPUTE_STATES.includes(to)) {
      const error = new Error(`Invalid dispute state: ${to}`);
      error.statusCode = 400;
      throw error;
    }
    if (!DisputeStateMachine.canTransition(from, to)) {
      const error = new Error(`Invalid dispute transition: ${from} -> ${to}`);
      error.statusCode = 409;
      error.reason = "INVALID_TRANSITION";
      throw error;
    }
    return to;
  }
}

module.exports = DisputeStateMachine;
