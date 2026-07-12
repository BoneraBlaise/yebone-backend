const PaymentRoutes = require("./PaymentRoutes");
const CheckoutRoutes = require("./CheckoutRoutes");
const WalletRoutes = require("./WalletRoutes");
const EscrowRoutes = require("./EscrowRoutes");
const RefundRoutes = require("./RefundRoutes");
const SettlementRoutes = require("./SettlementRoutes");
const VendorSubscriptionRoutes = require("./VendorSubscriptionRoutes");
const VendorPayoutRoutes = require("./VendorPayoutRoutes");
const DeliveryPaymentRoutes = require("./DeliveryPaymentRoutes");
const HealthRoutes = require("./HealthRoutes");

function createV1RouteAdapters(controllers) {
  const adapters = [
    new CheckoutRoutes({ controller: controllers.checkout }),
    new PaymentRoutes({ controller: controllers.payment }),
    new WalletRoutes({ controller: controllers.wallet }),
    new EscrowRoutes({ controller: controllers.escrow }),
    new RefundRoutes({ controller: controllers.refund }),
    new SettlementRoutes({ controller: controllers.settlement }),
    new VendorSubscriptionRoutes({ controller: controllers.subscription }),
    new VendorPayoutRoutes({ controller: controllers.payout }),
    new DeliveryPaymentRoutes({ controller: controllers.delivery }),
    new HealthRoutes({ controller: controllers.health }),
  ];

  return adapters;
}

function getAllRouteDefinitions(adapters) {
  return adapters.flatMap((adapter) =>
    adapter.getDefinitions().map((route) => ({
      ...route,
      fullPath: `${adapter.prefix}${route.path === "/" ? "" : route.path}`,
      namespace: adapter.prefix,
    }))
  );
}

module.exports = {
  PaymentRoutes,
  CheckoutRoutes,
  WalletRoutes,
  EscrowRoutes,
  RefundRoutes,
  SettlementRoutes,
  VendorSubscriptionRoutes,
  VendorPayoutRoutes,
  DeliveryPaymentRoutes,
  HealthRoutes,
  createV1RouteAdapters,
  getAllRouteDefinitions,
};
