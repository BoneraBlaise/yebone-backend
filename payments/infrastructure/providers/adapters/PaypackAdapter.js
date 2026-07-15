const BaseProviderAdapter = require("../BaseProviderAdapter");

class PaypackAdapter extends BaseProviderAdapter {
  constructor(deps) {
    super({ ...deps, providerCode: "PAYPACK" });
  }
}

module.exports = PaypackAdapter;
