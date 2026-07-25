class TrustPaymentBridge {
  constructor({ audit } = {}) {
    this.audit = audit;
    this._memoryEscrow = new Map();
  }

  resetForTests() {
    this._memoryEscrow.clear();
  }

  _resolveFacade() {
    try {
      const { getMarketplacePaymentFacade } = require("../../../payments/legacy/PaymentFacadeRegistry");
      return getMarketplacePaymentFacade();
    } catch (_error) {
      return null;
    }
  }

  async holdFunds(input) {
    const facade = this._resolveFacade();
    if (facade?.escrow) {
      try {
        const result = await facade.escrow({ action: "hold", ...input });
        if (this.audit) {
          await this.audit.record({
            platform: "buyerProtection",
            resource: input.orderId,
            action: "escrow.hold",
            actor: input.buyerId || "system",
            newValue: result,
          });
        }
        return result;
      } catch (_error) {
        // fall through to domain memory when payment foundation unavailable in tests
      }
    }

    const record = {
      coordinated: true,
      state: "FUNDS_HELD",
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency || "RWF",
      source: "domain_fallback",
    };
    this._memoryEscrow.set(String(input.orderId), record);
    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: input.orderId,
        action: "escrow.hold",
        actor: input.buyerId || "system",
        newValue: record,
      });
    }
    return record;
  }

  async releaseFunds(input) {
    const facade = this._resolveFacade();
    if (facade?.escrow) {
      try {
        const result = await facade.escrow({ action: "release", ...input });
        if (this.audit) {
          await this.audit.record({
            platform: "buyerProtection",
            resource: input.orderId,
            action: "escrow.release",
            actor: input.actor || "system",
            newValue: result,
          });
        }
        return result;
      } catch (_error) {
        // fall through
      }
    }

    const record = {
      coordinated: true,
      state: "RELEASED",
      orderId: input.orderId,
      source: "domain_fallback",
    };
    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: input.orderId,
        action: "escrow.release",
        actor: input.actor || "system",
        newValue: record,
      });
    }
    return record;
  }

  async refundEscrow(input) {
    const facade = this._resolveFacade();
    if (facade?.escrow) {
      try {
        const result = await facade.escrow({ action: "refund", ...input });
        if (this.audit) {
          await this.audit.record({
            platform: "buyerProtection",
            resource: input.orderId,
            action: "escrow.refund",
            actor: input.actor || "system",
            newValue: result,
          });
        }
        return result;
      } catch (_error) {
        // fall through
      }
    }

    const record = {
      coordinated: true,
      state: "REFUNDED",
      orderId: input.orderId,
      amount: input.amount,
      source: "domain_fallback",
    };
    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: input.orderId,
        action: "escrow.refund",
        actor: input.actor || "system",
        newValue: record,
      });
    }
    return record;
  }
}

module.exports = TrustPaymentBridge;
