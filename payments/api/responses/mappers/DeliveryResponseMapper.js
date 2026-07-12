const ApiResponse = require("../ApiResponse");

class DeliveryResponseMapper {
  static map(result, action) {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      deliveryFee:
        payload?.workflowResult?.breakdown?.deliveryFee ??
        payload?.pricing?.deliveryFee ??
        null,
    });
  }
}

module.exports = DeliveryResponseMapper;
