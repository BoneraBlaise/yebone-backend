const MTNMoMoConfig = require("./mtn/MTNMoMoConfig");
const PaypackConfig = require("./paypack/PaypackConfig");

/**
 * Sandbox endpoint registry per provider — metadata only.
 */
const ProviderSandboxConfig = Object.freeze({
  MTN_MOMO: Object.freeze({
    ...MTNMoMoConfig.sandbox,
    providerCode: "MTN_MOMO",
  }),
  PAYPACK: Object.freeze({
    ...PaypackConfig.sandbox,
    providerCode: "PAYPACK",
  }),
});

module.exports = ProviderSandboxConfig;
