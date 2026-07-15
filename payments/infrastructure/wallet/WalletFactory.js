const WalletConfig = require("./WalletConfig");
const WalletProjection = require("./WalletProjection");
const WalletLedgerBridge = require("./WalletLedgerBridge");
const WalletService = require("./WalletService");

function createWalletFoundation(options = {}) {
  const config = options.config || WalletConfig;
  const ledgerFoundation = options.ledgerFoundation;
  if (!ledgerFoundation) throw new Error("createWalletFoundation requires ledgerFoundation");

  const projection = options.projection || new WalletProjection({ config });
  const bridge = options.bridge || new WalletLedgerBridge({ projection, ledgerFoundation });
  const service = options.service || new WalletService({ bridge, config });

  return Object.freeze({ service, bridge, projection, ledgerFoundation, config });
}

module.exports = createWalletFoundation;
