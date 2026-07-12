const { getMarketplacePaymentFacade } = require("../PaymentFacadeRegistry");

/**
 * Safely delegates to MarketplacePaymentFacade without breaking legacy v2 contracts
 * when provider workflows are not yet implemented.
 */
async function delegateToFacade(method, input) {
  const facade = getMarketplacePaymentFacade();
  if (!facade[method] || typeof facade[method] !== "function") {
    return { coordinated: false, skipped: true, reason: "unknown_facade_method" };
  }

  try {
    const result = await facade[method](input);
    return { coordinated: true, result };
  } catch (error) {
    return {
      coordinated: false,
      error: error.message,
      errorName: error.name,
    };
  }
}

module.exports = { delegateToFacade };
