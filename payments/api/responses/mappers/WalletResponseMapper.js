const ApiResponse = require("../ApiResponse");

class WalletResponseMapper {
  static map(result, action) {
    const payload = result?.result ?? result;
    return ApiResponse.success({
      action,
      coordinated: payload?.coordinated ?? true,
      replayed: result?.replayed ?? false,
      ownerId: payload?.ledgerEntry?.referenceId || null,
      snapshot: payload?.snapshot
        ? {
            availableBalance: payload.snapshot.availableBalance,
            withdrawableBalance: payload.snapshot.withdrawableBalance,
            reservedBalance: payload.snapshot.reservedBalance,
          }
        : null,
    });
  }
}

module.exports = WalletResponseMapper;
