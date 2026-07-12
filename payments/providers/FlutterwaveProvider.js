const BasePlaceholderProvider = require("./BasePlaceholderProvider");
const { ProviderCode } = require("../enums");

class FlutterwaveProvider extends BasePlaceholderProvider {
  constructor() {
    super("FlutterwaveProvider", ProviderCode.FLUTTERWAVE);
  }
}

module.exports = FlutterwaveProvider;
