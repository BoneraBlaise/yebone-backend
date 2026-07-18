const mongoose = require("mongoose");

/**
 * Centralized order state machine with legacy API status compatibility.
 */
class OrderStateMachine {
  static CANONICAL = Object.freeze({
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PACKED: "packed",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
  });

  static LEGACY_TO_CANONICAL = Object.freeze({
    Processing: "pending",
    Confirmed: "confirmed",
    Packed: "packed",
    "Transferred to delivery partner": "packed",
    Shipping: "shipped",
    Received: "shipped",
    "On the way": "shipped",
    Shipped: "shipped",
    Delivered: "delivered",
    "Processing refund": "cancelled",
    "Refund Success": "refunded",
    Cancelled: "cancelled",
  });

  static CANONICAL_TO_LEGACY = Object.freeze({
    pending: "Processing",
    confirmed: "Confirmed",
    packed: "Transferred to delivery partner",
    shipped: "Shipping",
    delivered: "Delivered",
    cancelled: "Processing refund",
    refunded: "Refund Success",
  });

  static ALLOWED = Object.freeze({
    pending: ["confirmed", "cancelled", "packed"],
    confirmed: ["packed", "cancelled"],
    packed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: ["cancelled"],
    cancelled: ["refunded"],
    refunded: [],
  });

  toCanonical(status = "") {
    return OrderStateMachine.LEGACY_TO_CANONICAL[status] || null;
  }

  toLegacy(canonicalStatus) {
    return OrderStateMachine.CANONICAL_TO_LEGACY[canonicalStatus] || null;
  }

  assertTransition(currentStatus, nextStatus) {
    const current = this.toCanonical(currentStatus);
    const next = this.toCanonical(nextStatus);

    if (!current || !next) {
      return {
        valid: false,
        reason: "UNKNOWN_STATUS",
        message: `Invalid order status transition: ${currentStatus} -> ${nextStatus}`,
      };
    }

    if (current === next) {
      return { valid: true, canonical: next };
    }

    const allowed = OrderStateMachine.ALLOWED[current] || [];
    if (!allowed.includes(next)) {
      return {
        valid: false,
        reason: "INVALID_TRANSITION",
        message: `Invalid order status transition: ${currentStatus} -> ${nextStatus}`,
      };
    }

    return { valid: true, canonical: next };
  }

  getFulfillmentOptions(currentStatus) {
    const current = this.toCanonical(currentStatus);
    if (!current) return [];

    const allowed = OrderStateMachine.ALLOWED[current] || [];
    return allowed
      .filter((state) => state !== "cancelled" && state !== "refunded")
      .map((state) => this.toLegacy(state))
      .filter(Boolean);
  }

  getRefundOptions(currentStatus) {
    const current = this.toCanonical(currentStatus);
    if (current === "cancelled") {
      return [this.toLegacy("refunded")].filter(Boolean);
    }
    return [];
  }

  async runInTransaction(work) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = OrderStateMachine;
