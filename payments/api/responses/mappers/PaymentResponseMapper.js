const ApiResponse = require("../ApiResponse");

class PaymentResponseMapper {
  static map(result, action = "create") {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      referenceId: payload?.ledgerEntry?.referenceId || payload?.workflowResult?.orderId || null,
      status: payload?.workflowResult?.status || "pending",
    });
  }
}

module.exports = PaymentResponseMapper;
