class BuyerProtectionService {
  constructor({ repository, configStore, ordersBridge, policyService, audit }) {
    this.repository = repository;
    this.configStore = configStore;
    this.ordersBridge = ordersBridge;
    this.policyService = policyService;
    this.audit = audit;
  }

  async checkEligibility(orderId, meta = {}) {
    const order = await this.ordersBridge.getOrder(orderId);
    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const policies = this.policyService.getPolicies();
    const category = order.category || order.cart?.[0]?.category || "general";
    const eligible = this.policyService.isCategoryEligible(category);
    const durationMs = Number(policies.protectionDurationDays || 30) * 86_400_000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const result = {
      orderId: String(orderId),
      eligible,
      category,
      protectionDurationDays: policies.protectionDurationDays,
      maximumClaimPeriodDays: policies.maximumClaimPeriodDays,
      expiresAt: eligible ? expiresAt : null,
      verificationRequired: policies.refundRules?.requireVerification === true,
    };

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: String(orderId),
        action: "protection.eligibility_checked",
        actor: meta.actor || "system",
        newValue: result,
      });
    }

    return result;
  }

  async activateProtection(orderId, meta = {}) {
    const eligibility = await this.checkEligibility(orderId, meta);
    if (!eligibility.eligible) {
      const error = new Error("Order not eligible for buyer protection");
      error.statusCode = 403;
      error.reason = "NOT_ELIGIBLE";
      throw error;
    }

    const existing = await this.repository.getProtectionByOrder(orderId);
    if (existing && existing.status === "active") return existing;

    const order = await this.ordersBridge.getOrder(orderId);
    const record = await this.repository.createProtection(orderId, {
      buyerId: order.userId || order.buyerId || meta.buyerId,
      sellerId: order.shopId || order.sellerId || order.cart?.[0]?.shopId,
      status: "active",
      eligible: true,
      policySnapshot: this.policyService.getPolicies(),
      expiresAt: eligibility.expiresAt,
    });

    await this.repository.appendProtectionHistory(record.protectionId, {
      action: "activated",
      actor: meta.actor || "system",
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: record.protectionId,
        action: "protection.activated",
        actor: meta.actor || "system",
        orderId: String(orderId),
        newValue: record,
      });
    }

    return record;
  }

  async getProtectionStatus(orderId) {
    const record = await this.repository.getProtectionByOrder(orderId);
    if (!record) {
      return { orderId: String(orderId), protected: false, status: null };
    }

    if (record.expiresAt && new Date(record.expiresAt) < new Date() && record.status === "active") {
      const expired = await this.repository.updateProtection(record.protectionId, { status: "expired" });
      await this.repository.appendProtectionHistory(record.protectionId, {
        action: "expired",
        actor: "system",
      });
      return { ...expired, protected: false, expired: true };
    }

    return {
      ...record,
      protected: record.status === "active",
    };
  }

  async getProtectionHistory(protectionId) {
    return this.repository.getProtectionHistory(protectionId);
  }

  async listProtections(filters = {}) {
    return this.repository.listProtections(filters);
  }
}

module.exports = BuyerProtectionService;
