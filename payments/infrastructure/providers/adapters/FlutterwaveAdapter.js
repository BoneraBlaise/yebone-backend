const BaseProviderAdapter = require("../BaseProviderAdapter");

class FlutterwaveAdapter extends BaseProviderAdapter {
  constructor(deps) {
    super({ ...deps, providerCode: "FLUTTERWAVE" });
  }
}

module.exports = FlutterwaveAdapter;
