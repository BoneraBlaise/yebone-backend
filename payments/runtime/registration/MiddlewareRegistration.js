/**
 * Registers payment API middleware in required order.
 */
class MiddlewareRegistration {
  static buildStack(apiMiddleware, config) {
    return [
      apiMiddleware.CorrelationIdMiddleware.attach({ headerName: config.correlationHeader }),
      apiMiddleware.RequestContextMiddleware.attach(),
    ];
  }

  static registerGlobal(app, apiMiddleware, config, logger) {
    const stack = MiddlewareRegistration.buildStack(apiMiddleware, config);
    app.locals.paymentMiddlewareStack = stack;
    logger?.info("Payment middleware stack prepared", { count: stack.length });
    return stack;
  }
}

module.exports = MiddlewareRegistration;
