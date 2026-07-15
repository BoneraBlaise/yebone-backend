const BaseProviderAdapter = require("../BaseProviderAdapter");

class AirtelMoneyAdapter extends BaseProviderAdapter {
  constructor(deps) {
    super({ ...deps, providerCode: "AIRTEL_MONEY" });
  }
}

module.exports = AirtelMoneyAdapter;
