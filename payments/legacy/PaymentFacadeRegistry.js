/**
 * Shared access point for MarketplacePaymentFacade across legacy v2 controllers.
 * Controllers must use this registry — never instantiate PaymentModule directly.
 */
let paymentModuleInstance = null;
let facadeInstance = null;

function getPaymentModule() {
  if (!paymentModuleInstance) {
    const PaymentModule = require("../PaymentModule");
    paymentModuleInstance = new PaymentModule();
  }
  return paymentModuleInstance;
}

function getMarketplacePaymentFacade() {
  if (!facadeInstance) {
    facadeInstance = getPaymentModule().getMarketplacePaymentFacade();
  }
  return facadeInstance;
}

function resetForTests() {
  paymentModuleInstance = null;
  facadeInstance = null;
}

module.exports = {
  getPaymentModule,
  getMarketplacePaymentFacade,
  resetForTests,
};
