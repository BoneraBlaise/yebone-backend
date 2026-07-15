const BaseProviderAdapter = require("../BaseProviderAdapter");

class StripeAdapter extends BaseProviderAdapter {
  constructor(deps) {
    super({ ...deps, providerCode: "STRIPE" });
  }
}

module.exports = StripeAdapter;
