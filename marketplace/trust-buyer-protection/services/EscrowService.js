const EscrowStateMachine = require("./EscrowStateMachine");

class EscrowService {
  constructor({ repository, ordersBridge, paymentBridge, policyService, audit }) {
    this.repository = repository;
    this.ordersBridge = ordersBridge;
    this.paymentBridge = paymentBridge;
    this.policyService = policyService;
    this.audit = audit;
  }

  async _recordTransition(escrow, toStatus, meta = {}) {
    const entry = {
      from: escrow.status,
      to: toStatus,
      actor: meta.actor || "system",
      at: new Date().toISOString(),
      note: meta.note || null,
    };
    return [...(escrow.transitions || []), entry];
  }

  async initiateEscrow(orderId, meta = {}) {
    const order = await this.ordersBridge.getOrder(orderId);
    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const existing = await this.repository.getEscrowByOrder(orderId);
    if (existing) return existing;

    const record = await this.repository.createEscrow(orderId, {
      buyerId: order.userId || order.buyerId || meta.buyerId,
      sellerId: order.shopId || order.sellerId || order.cart?.[0]?.shopId,
      amount: Number(order.totalPrice || 0),
      currency: order.currency || "RWF",
      status: "PENDING",
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: record.escrowId,
        action: "escrow.initiated",
        actor: meta.actor || "system",
        orderId: String(orderId),
        newValue: record,
      });
    }

    return record;
  }

  async transitionEscrow(escrowId, toStatus, meta = {}) {
    const escrow = await this.repository.getEscrow(escrowId);
    if (!escrow) {
      const error = new Error("Escrow not found");
      error.statusCode = 404;
      throw error;
    }

    EscrowStateMachine.assertTransition(escrow.status, toStatus);

    if (toStatus === "FUNDS_HELD") {
      await this.paymentBridge.holdFunds({
        orderId: escrow.orderId,
        amount: escrow.amount,
        currency: escrow.currency,
        buyerId: escrow.buyerId,
        vendorId: escrow.sellerId,
      });
    }

    if (toStatus === "RELEASED") {
      const policies = this.policyService.getPolicies();
      const delayMs = Number(policies.escrowReleaseDelayHours || 0) * 3_600_000;
      if (delayMs > 0 && !meta.adminOverride) {
        const error = new Error("Escrow release delay not elapsed");
        error.statusCode = 403;
        error.reason = "RELEASE_DELAY";
        throw error;
      }
      await this.paymentBridge.releaseFunds({
        orderId: escrow.orderId,
        escrowId: escrow.escrowId,
        amount: escrow.amount,
        currency: escrow.currency,
        vendorId: escrow.sellerId,
        actor: meta.actor || "system",
      });
    }

    if (toStatus === "REFUNDED") {
      await this.paymentBridge.refundEscrow({
        orderId: escrow.orderId,
        escrowId: escrow.escrowId,
        amount: escrow.amount,
        currency: escrow.currency,
        reason: meta.reason || "escrow_refund",
        actor: meta.actor || "system",
      });
    }

    const transitions = await this._recordTransition(escrow, toStatus, meta);
    const updated = await this.repository.updateEscrow(escrowId, {
      status: toStatus,
      transitions,
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: escrowId,
        action: `escrow.${toStatus.toLowerCase()}`,
        actor: meta.actor || "system",
        orderId: escrow.orderId,
        newValue: updated,
      });
    }

    return updated;
  }

  async getEscrowByOrder(orderId) {
    return this.repository.getEscrowByOrder(orderId);
  }

  async listEscrows(filters = {}) {
    return this.repository.listEscrows(filters);
  }
}

module.exports = EscrowService;
