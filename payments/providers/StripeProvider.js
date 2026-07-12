const BasePlaceholderProvider = require("./BasePlaceholderProvider");
const { ProviderCode } = require("../enums");

class StripeProvider extends BasePlaceholderProvider {
  constructor() {
    super("StripeProvider", ProviderCode.STRIPE);
  }
}

module.exports = StripeProvider;
