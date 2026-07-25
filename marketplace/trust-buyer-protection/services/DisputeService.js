const DisputeStateMachine = require("./DisputeStateMachine");

class DisputeService {
  constructor({ repository, ordersBridge, buyerProtectionService, paymentBridge, audit }) {
    this.repository = repository;
    this.ordersBridge = ordersBridge;
    this.buyerProtectionService = buyerProtectionService;
    this.paymentBridge = paymentBridge;
    this.audit = audit;
  }

  async openDispute(buyerId, payload = {}, meta = {}) {
    const orderId = String(payload.orderId);
    await this.ordersBridge.assertOrderOwnership(orderId, { buyerId });

    const existing = await this.repository.getDisputeByOrder(orderId);
    if (existing && !["CLOSED", "REJECTED", "REFUNDED"].includes(existing.status)) {
      const error = new Error("Active dispute already exists for this order");
      error.statusCode = 409;
      throw error;
    }

    const order = await this.ordersBridge.getOrder(orderId);
    const timelineEntry = {
      status: "OPEN",
      note: "Dispute opened",
      actor: buyerId,
      at: new Date().toISOString(),
    };

    const dispute = await this.repository.createDispute({
      orderId,
      buyerId: String(buyerId),
      sellerId: String(order.shopId || order.sellerId || payload.sellerId),
      reason: payload.reason || "other",
      description: payload.description || "",
      attachments: payload.attachments || [],
      status: "OPEN",
      timeline: [timelineEntry],
      auditTrail: [
        { action: "dispute.opened", actor: buyerId, at: new Date().toISOString() },
      ],
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: dispute.disputeId,
        action: "dispute.opened",
        actor: buyerId,
        orderId,
        newValue: dispute,
      });
    }

    return dispute;
  }

  async transitionDispute(disputeId, toStatus, meta = {}) {
    const dispute = await this.repository.getDispute(disputeId);
    if (!dispute) {
      const error = new Error("Dispute not found");
      error.statusCode = 404;
      throw error;
    }

    DisputeStateMachine.assertTransition(dispute.status, toStatus);

    const timelineEntry = {
      status: toStatus,
      note: meta.note || `Transition to ${toStatus}`,
      actor: meta.actor || "system",
      at: new Date().toISOString(),
    };

    const auditEntry = {
      action: `dispute.${toStatus.toLowerCase()}`,
      actor: meta.actor || "system",
      at: new Date().toISOString(),
      note: meta.note || null,
    };

    const patch = {
      status: toStatus,
      timeline: [...(dispute.timeline || []), timelineEntry],
      auditTrail: [...(dispute.auditTrail || []), auditEntry],
    };

    if (meta.assignedAdmin) patch.assignedAdmin = String(meta.assignedAdmin);
    if (meta.resolution) patch.resolution = meta.resolution;

    const updated = await this.repository.updateDispute(disputeId, patch);

    if (toStatus === "REFUNDED" && meta.processRefund !== false) {
      const order = await this.ordersBridge.getOrder(dispute.orderId);
      await this.paymentBridge.refundEscrow({
        orderId: dispute.orderId,
        escrowId: meta.escrowId,
        amount: Number(order?.totalPrice || meta.amount || 0),
        currency: order?.currency || "RWF",
        reason: dispute.reason,
        actor: meta.actor || "admin",
      });
    }

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: disputeId,
        action: `dispute.${toStatus.toLowerCase()}`,
        actor: meta.actor || "system",
        orderId: dispute.orderId,
        newValue: updated,
      });
    }

    return updated;
  }

  async getDispute(disputeId, { requesterId, role } = {}) {
    const dispute = await this.repository.getDispute(disputeId);
    if (!dispute) {
      const error = new Error("Dispute not found");
      error.statusCode = 404;
      throw error;
    }
    if (role !== "admin" && requesterId) {
      const id = String(requesterId);
      if (dispute.buyerId !== id && dispute.sellerId !== id) {
        const error = new Error("Access denied");
        error.statusCode = 403;
        throw error;
      }
    }
    return dispute;
  }

  async listDisputes(filters = {}) {
    return this.repository.listDisputes(filters);
  }

  async assignAdmin(disputeId, adminId, meta = {}) {
    return this.transitionDispute(disputeId, "UNDER_REVIEW", {
      ...meta,
      actor: adminId,
      assignedAdmin: adminId,
      note: "Assigned for review",
    });
  }
}

module.exports = DisputeService;
