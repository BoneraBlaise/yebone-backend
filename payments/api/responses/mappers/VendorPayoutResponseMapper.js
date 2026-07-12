const ApiResponse = require("../ApiResponse");

class VendorPayoutResponseMapper {
  static map(result, action) {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      stage: payload?.stage?.currentStage || payload?.stages?.[payload.stages.length - 1]?.currentStage || null,
    });
  }
}

module.exports = VendorPayoutResponseMapper;
