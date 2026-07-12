const ApiResponse = require("../ApiResponse");

class SubscriptionResponseMapper {
  static map(result, action) {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
    });
  }
}

module.exports = SubscriptionResponseMapper;
