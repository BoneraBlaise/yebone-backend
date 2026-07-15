const BaseProviderAdapter = require("../BaseProviderAdapter");

class MTNMoMoAdapter extends BaseProviderAdapter {
  constructor(deps) {
    super({ ...deps, providerCode: "MTN_MOMO" });
  }
}

module.exports = MTNMoMoAdapter;
