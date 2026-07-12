const ApiResponse = require("../ApiResponse");

class CheckoutResponseMapper {
  static map(result) {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      orderId: payload?.orderId || null,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      hasPayment: Boolean(payload?.payment),
      hasSettlement: Boolean(payload?.settlement),
      hasEscrow: Boolean(payload?.escrow),
      hasDelivery: Boolean(payload?.delivery),
    });
  }
}

module.exports = CheckoutResponseMapper;
