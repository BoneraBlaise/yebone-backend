/**
 * Paypack sandbox configuration — metadata only, no secrets.
 */
const PaypackConfig = Object.freeze({
  providerCode: "PAYPACK",
  sandbox: Object.freeze({
    baseUrl: "https://payments.paypack.rw/api",
    authPath: "/auth/agents/authorize",
    checkoutPath: "/transactions/cashin",
    webhookSignatureHeader: "X-Paypack-Signature",
  }),
});

module.exports = PaypackConfig;
