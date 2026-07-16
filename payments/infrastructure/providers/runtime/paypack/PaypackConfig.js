/**
 * Paypack sandbox configuration — metadata only, no secrets.
 */
const PaypackConfig = Object.freeze({
  providerCode: "PAYPACK",
  scopes: Object.freeze({
    default: "default",
    checkout: "checkout",
  }),
  sandbox: Object.freeze({
    baseUrl: "https://payments.paypack.rw/api",
    checkoutBaseUrl: "https://checkout.paypack.rw/api",
    authPath: "/auth/agents/authorize",
    cashinPath: "/transactions/cashin",
    cashoutPath: "/transactions/cashout",
    findPath: "/transactions/find",
    eventsPath: "/events/transactions",
    checkoutInitiatePath: "/checkouts/initiate",
    webhookSignatureHeader: "X-Paypack-Signature",
    idempotencyHeader: "Idempotency-Key",
  }),
});

module.exports = PaypackConfig;
