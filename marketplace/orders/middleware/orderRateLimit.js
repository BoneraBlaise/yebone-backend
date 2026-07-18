/**
 * Configurable rate limiting for order mutation endpoints.
 */
function createOrderRateLimiter({
  windowMs = Number(process.env.ORDER_RATE_LIMIT_WINDOW_MS || 60_000),
  max = Number(process.env.ORDER_RATE_LIMIT_MAX || 30),
  keyPrefix = "orders",
} = {}) {
  const hits = new Map();

  return function orderRateLimiter(req, res, next) {
    const actor =
      req.user?._id ||
      req.seller?._id ||
      req.ip ||
      req.headers["x-forwarded-for"] ||
      "anonymous";
    const routeKey = `${keyPrefix}:${req.method}:${req.path}:${actor}`;
    const now = Date.now();
    const entry = hits.get(routeKey);

    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(routeKey, { windowStart: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many order requests. Please try again shortly.",
      });
    }

    return next();
  };
}

const createOrderMutationLimiter = createOrderRateLimiter({
  keyPrefix: "orders-mutation",
  max: Number(process.env.ORDER_MUTATION_RATE_LIMIT_MAX || 20),
});

const createOrderCreateLimiter = createOrderRateLimiter({
  keyPrefix: "orders-create",
  max: Number(process.env.ORDER_CREATE_RATE_LIMIT_MAX || 10),
});

module.exports = {
  createOrderRateLimiter,
  createOrderMutationLimiter,
  createOrderCreateLimiter,
};
