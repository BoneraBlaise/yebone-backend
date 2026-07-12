const BasePlaceholderProvider = require("./BasePlaceholderProvider");
const { ProviderCode } = require("../enums");

class PaypackProvider extends BasePlaceholderProvider {
  constructor() {
    super("PaypackProvider", ProviderCode.PAYPACK);
  }
}

module.exports = PaypackProvider;
