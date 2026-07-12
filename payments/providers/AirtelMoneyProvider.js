const BasePlaceholderProvider = require("./BasePlaceholderProvider");
const { ProviderCode } = require("../enums");

class AirtelMoneyProvider extends BasePlaceholderProvider {
  constructor() {
    super("AirtelMoneyProvider", ProviderCode.AIRTEL_MONEY);
  }
}

module.exports = AirtelMoneyProvider;
