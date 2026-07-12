const BasePlaceholderProvider = require("./BasePlaceholderProvider");
const { ProviderCode } = require("../enums");

class MTNMoMoProvider extends BasePlaceholderProvider {
  constructor() {
    super("MTNMoMoProvider", ProviderCode.MTN_MOMO);
  }
}

module.exports = MTNMoMoProvider;
