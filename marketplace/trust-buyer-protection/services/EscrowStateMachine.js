const { ESCROW_STATES } = require("../TrustBuyerProtectionSettingsDefaults");

const TRANSITIONS = Object.freeze({
  PENDING: ["FUNDS_HELD"],
  FUNDS_HELD: ["DELIVERY_CONFIRMED", "REFUND_PENDING"],
  DELIVERY_CONFIRMED: ["READY_FOR_RELEASE", "REFUND_PENDING"],
  READY_FOR_RELEASE: ["RELEASED", "REFUND_PENDING"],
  RELEASED: [],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
});

class EscrowStateMachine {
  static canTransition(from, to) {
    const allowed = TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  static assertTransition(from, to) {
    if (!ESCROW_STATES.includes(to)) {
      const error = new Error(`Invalid escrow state: ${to}`);
      error.statusCode = 400;
      throw error;
    }
    if (!EscrowStateMachine.canTransition(from, to)) {
      const error = new Error(`Invalid escrow transition: ${from} -> ${to}`);
      error.statusCode = 409;
      error.reason = "INVALID_TRANSITION";
      throw error;
    }
    return to;
  }
}

module.exports = EscrowStateMachine;
