const ApiResponse = require("../ApiResponse");

class SettlementResponseMapper {
  static map(result, action = "settle") {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      orderId: payload?.settlement?.orderId || payload?.commission?.orderSubtotal ? "provided" : null,
      escrowState: payload?.settlement?.escrowState || null,
      commissionTotal: payload?.commission?.commissionTotal ?? payload?.settlement?.commission?.commissionTotal ?? null,
      vendorAmount: payload?.commission?.vendorAmount ?? payload?.settlement?.commission?.vendorAmount ?? null,
    });
  }
}

module.exports = SettlementResponseMapper;
