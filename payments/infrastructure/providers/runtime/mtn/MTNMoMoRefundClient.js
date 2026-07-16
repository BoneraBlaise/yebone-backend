const MTNMoMoConfig = require("./MTNMoMoConfig");

/**
 * MTN MoMo Refund client — architecture stub only (Phase 2B).
 * MTN MoMo sandbox does not expose a refund API in this foundation layer.
 */
class MTNMoMoRefundClient {
  constructor({ providerCode = MTNMoMoConfig.providerCode } = {}) {
    this.providerCode = providerCode;
  }

  async refund() {
    const error = new Error(
      "MTN MoMo refund is not implemented — architecture stub only (Phase 2B)"
    );
    error.code = "MTN_MOMO_REFUND_NOT_IMPLEMENTED";
    error.providerCode = this.providerCode;
    throw error;
  }
}

module.exports = MTNMoMoRefundClient;
