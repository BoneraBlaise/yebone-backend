/**
 * Delivery lifecycle state machine with validated transitions.
 */
class DeliveryStateMachine {
  static STATUS = Object.freeze({
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    ASSIGNED: "ASSIGNED",
    PICKED_UP: "PICKED_UP",
    IN_TRANSIT: "IN_TRANSIT",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
  });

  static TERMINAL = Object.freeze(["DELIVERED", "FAILED", "CANCELLED"]);

  static ALLOWED = Object.freeze({
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["PICKED_UP", "CANCELLED", "FAILED"],
    PICKED_UP: ["IN_TRANSIT", "FAILED", "CANCELLED"],
    IN_TRANSIT: ["DELIVERED", "FAILED"],
    DELIVERED: [],
    FAILED: [],
    CANCELLED: [],
  });

  normalize(status = "") {
    if (typeof status !== "string") return null;
    const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
    return DeliveryStateMachine.STATUS[normalized] || null;
  }

  assertTransition(currentStatus, nextStatus) {
    const current = this.normalize(currentStatus);
    const next = this.normalize(nextStatus);

    if (!current || !next) {
      return {
        valid: false,
        reason: "UNKNOWN_STATUS",
        message: `Invalid delivery status: ${currentStatus} -> ${nextStatus}`,
      };
    }

    if (current === next) {
      return { valid: true, status: next };
    }

    const allowed = DeliveryStateMachine.ALLOWED[current] || [];
    if (!allowed.includes(next)) {
      return {
        valid: false,
        reason: "INVALID_TRANSITION",
        message: `Invalid delivery status transition: ${current} -> ${next}`,
      };
    }

    return { valid: true, status: next };
  }

  getAllowedTransitions(currentStatus) {
    const current = this.normalize(currentStatus);
    if (!current) return [];
    return [...(DeliveryStateMachine.ALLOWED[current] || [])];
  }

  isTerminal(status) {
    const normalized = this.normalize(status);
    return DeliveryStateMachine.TERMINAL.includes(normalized);
  }

  canAssignCourier(status) {
    const normalized = this.normalize(status);
    return normalized === "CONFIRMED" || normalized === "ASSIGNED";
  }
}

module.exports = DeliveryStateMachine;
