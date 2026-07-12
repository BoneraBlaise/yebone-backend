const ApiResponse = require("../ApiResponse");

class EscrowResponseMapper {
  static map(result, action) {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      state: payload?.state || null,
    });
  }
}

module.exports = EscrowResponseMapper;
