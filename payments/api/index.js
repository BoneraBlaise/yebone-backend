const controllers = require("./controllers");
const routes = require("./routes");
const dto = require("./dto");
const validators = require("./validators");
const middleware = require("./middleware");
const responses = require("./responses");
const errors = require("./errors");
const versioning = require("./versioning");
const health = require("./health");

/**
 * API integration layer factory.
 * Business controllers receive ONLY MarketplacePaymentFacade.
 */
function createPaymentApi(paymentModule) {
  const facade = paymentModule.getMarketplacePaymentFacade();
  const paymentModuleHealth = new health.PaymentModuleHealth(paymentModule);

  const apiControllers = {
    payment: new controllers.PaymentController(facade),
    checkout: new controllers.CheckoutController(facade),
    wallet: new controllers.WalletController(facade),
    escrow: new controllers.EscrowController(facade),
    refund: new controllers.RefundController(facade),
    settlement: new controllers.SettlementController(facade),
    subscription: new controllers.VendorSubscriptionController(facade),
    payout: new controllers.VendorPayoutController(facade),
    delivery: new controllers.DeliveryPaymentController(facade),
    health: new health.HealthController({ paymentModuleHealth }),
  };

  const routeAdapters = routes.v1.createV1RouteAdapters(apiControllers);
  const routeDefinitions = routes.v1.getAllRouteDefinitions(routeAdapters);

  return {
    facade,
    controllers: apiControllers,
    routeAdapters,
    routeDefinitions,
    middleware,
    versioning,
    health: paymentModuleHealth,
  };
}

module.exports = {
  createPaymentApi,
  controllers,
  routes,
  dto,
  validators,
  middleware,
  responses,
  errors,
  versioning,
  health,
};
