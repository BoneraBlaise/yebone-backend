const API_VERSION = "v1";

module.exports = {
  version: API_VERSION,
  basePath: "/api/v1/payments",
  namespaces: {
    checkout: "/checkout",
    orders: "/orders",
    refunds: "/refunds",
    wallets: "/wallets",
    escrow: "/escrow",
    settlements: "/settlements",
    subscriptions: "/subscriptions",
    payouts: "/payouts",
    delivery: "/delivery",
    health: "/health",
  },
};
